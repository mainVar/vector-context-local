
import { OpenAIEmbedding } from './openai-embedding';

/**
 * LM Studio embedding provider, which is compatible with OpenAI's API.
 * By default it connects to http://localhost:1234/v1
 */
export class LMStudioEmbedding extends OpenAIEmbedding {
    constructor(config: { apiKey?: string; model: string; baseURL?: string }) {
        super({
            apiKey: config.apiKey || 'lm-studio',
            model: config.model,
            baseURL: config.baseURL || 'http://localhost:1234/v1'
        });

        // Set safe defaults for local inference
        this.maxTokens = 2048;

        // Optimize for known local models
        if (config.model.includes('nomic') || config.model.includes('mxbai')) {
            // These models theoretically support 8192, but for local stability we limit to 2048 or user config
            // We use a safe default here.
            this.maxTokens = 2048;
        }
    }

    async detectDimension(testText: string = "test"): Promise<number> {
        const model = (this.config.model || '').toLowerCase();

        // Return known dimensions to avoid API calls that might crash local servers
        if (model.includes('nomic')) return 768; // nomic-embed-text
        if (model.includes('mxbai')) return 1024; // mxbai-embed-large
        if (model.includes('bge-m3')) return 1024;
        if (model.includes('all-minilm')) return 384;

        return super.detectDimension(testText);
    }

    // Override embedBatch to throttle requests for local LM Studio
    // LM Studio often crashes with large batches or too many parallel requests
    async embedBatch(texts: string[]): Promise<any[]> {
        // Optimized settings for local throughput
        // Processing in small batches avoids OOM but reduces HTTP overhead
        const BATCH_SIZE = 7;
        const results: any[] = [];
        const DELAY_MS = 50; // Minimal delay to keep queue moving but allow slight breathing room

        // Process sequentially to prevent concurrent GPU overload
        for (let i = 0; i < texts.length; i += BATCH_SIZE) {
            const chunk = texts.slice(i, i + BATCH_SIZE);
            try {
                // Call parent implementation
                const chunkResults = await super.embedBatch(chunk);
                results.push(...chunkResults);

                // Add a minimal delay
                if (i + BATCH_SIZE < texts.length) {
                    await new Promise(resolve => setTimeout(resolve, DELAY_MS));
                }
            } catch (error) {
                console.error(`[LMStudio] Error embedding chunk ${i}:`, error);
                throw error;
            }
        }
        return results;
    }
}
