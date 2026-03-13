import { OpenAIEmbedding, VoyageAIEmbedding, GeminiEmbedding, OllamaEmbedding, LMStudioEmbedding, logger } from "@vector-context/core";
import { ContextMcpConfig } from "./config.js";

export function createEmbeddingInstance(config: ContextMcpConfig): OpenAIEmbedding | VoyageAIEmbedding | GeminiEmbedding | OllamaEmbedding | LMStudioEmbedding {
    logger.debug("EMBEDDING", `Creating ${config.embeddingProvider} embedding instance...`);

    switch (config.embeddingProvider) {
        case 'OpenAI':
            if (!config.openaiApiKey) {
                logger.error("EMBEDDING", "❌ OpenAI API key is required but not provided");
                throw new Error('OPENAI_API_KEY is required for OpenAI embedding provider');
            }
            logger.debug("EMBEDDING", `🔧 Configuring OpenAI with model: ${config.embeddingModel}`);
            const openaiEmbedding = new OpenAIEmbedding({
                apiKey: config.openaiApiKey,
                model: config.embeddingModel,
                ...(config.openaiBaseUrl && { baseURL: config.openaiBaseUrl })
            });
            logger.debug("EMBEDDING", "✅ OpenAI embedding instance created successfully");
            return openaiEmbedding;

        case 'VoyageAI':
            if (!config.voyageaiApiKey) {
                logger.error("EMBEDDING", "❌ VoyageAI API key is required but not provided");
                throw new Error('VOYAGEAI_API_KEY is required for VoyageAI embedding provider');
            }
            logger.debug("EMBEDDING", `🔧 Configuring VoyageAI with model: ${config.embeddingModel}`);
            const voyageEmbedding = new VoyageAIEmbedding({
                apiKey: config.voyageaiApiKey,
                model: config.embeddingModel
            });
            logger.debug("EMBEDDING", "✅ VoyageAI embedding instance created successfully");
            return voyageEmbedding;

        case 'Gemini':
            if (!config.geminiApiKey) {
                logger.error("EMBEDDING", "❌ Gemini API key is required but not provided");
                throw new Error('GEMINI_API_KEY is required for Gemini embedding provider');
            }
            logger.debug("EMBEDDING", `🔧 Configuring Gemini with model: ${config.embeddingModel}`);
            const geminiEmbedding = new GeminiEmbedding({
                apiKey: config.geminiApiKey,
                model: config.embeddingModel,
                ...(config.geminiBaseUrl && { baseURL: config.geminiBaseUrl })
            });
            logger.debug("EMBEDDING", "✅ Gemini embedding instance created successfully");
            return geminiEmbedding;

        case 'Ollama':
            const ollamaHost = config.ollamaHost || 'http://127.0.0.1:11434';
            logger.debug("EMBEDDING", `🔧 Configuring Ollama with model: ${config.embeddingModel}, host: ${ollamaHost}`);
            const ollamaEmbedding = new OllamaEmbedding({
                model: config.embeddingModel,
                host: config.ollamaHost
            });
            logger.debug("EMBEDDING", "✅ Ollama embedding instance created successfully");
            return ollamaEmbedding;

        case 'LMStudio':
            const lmStudioBaseUrl = config.lmStudioBaseUrl || 'http://localhost:1234/v1';
            logger.debug("EMBEDDING", `🔧 Configuring LM Studio with model: ${config.embeddingModel}, baseURL: ${lmStudioBaseUrl}`);
            const lmStudioEmbedding = new LMStudioEmbedding({
                apiKey: 'lm-studio',
                model: config.embeddingModel,
                baseURL: lmStudioBaseUrl
            });
            logger.debug("EMBEDDING", "✅ LM Studio embedding instance created successfully");
            return lmStudioEmbedding;

        default:
            logger.error("EMBEDDING", `❌ Unsupported embedding provider: ${(config as any).embeddingProvider}`);
            throw new Error(`Unsupported embedding provider: ${(config as any).embeddingProvider}`);
    }
}

export function logEmbeddingProviderInfo(config: ContextMcpConfig, embedding: OpenAIEmbedding | VoyageAIEmbedding | GeminiEmbedding | OllamaEmbedding | LMStudioEmbedding): void {
    logger.info("EMBEDDING", `✅ Successfully initialized ${config.embeddingProvider} embedding provider`);
    logger.debug("EMBEDDING", `Provider details - Model: ${config.embeddingModel}, Dimension: ${embedding.getDimension()}`);

    switch (config.embeddingProvider) {
        case 'OpenAI':
            logger.debug("EMBEDDING", `OpenAI configuration - API Key: ${config.openaiApiKey ? '✅ Provided' : '❌ Missing'}, Base URL: ${config.openaiBaseUrl || 'Default'}`);
            break;
        case 'VoyageAI':
            logger.debug("EMBEDDING", `VoyageAI configuration - API Key: ${config.voyageaiApiKey ? '✅ Provided' : '❌ Missing'}`);
            break;
        case 'Gemini':
            logger.debug("EMBEDDING", `Gemini configuration - API Key: ${config.geminiApiKey ? '✅ Provided' : '❌ Missing'}, Base URL: ${config.geminiBaseUrl || 'Default'}`);
            break;
        case 'Ollama':
            logger.debug("EMBEDDING", `Ollama configuration - Host: ${config.ollamaHost || 'http://127.0.0.1:11434'}, Model: ${config.embeddingModel}`);
            break;
        case 'LMStudio':
            logger.debug("EMBEDDING", `LM Studio configuration - Base URL: ${config.lmStudioBaseUrl || 'http://localhost:1234/v1'}, Model: ${config.embeddingModel}`);
            break;
    }
}