
import { Context } from './src/context';
import { QdrantVectorDB } from './src/vectordb/qdrant-vectordb';
import { LMStudioEmbedding } from './src/embedding/lmstudio-embedding';
import * as path from 'path';

async function runDebug() {
    console.log("🛠️  Starting Debug Indexing...");

    // 1. Setup Vector DB
    const vectorDb = new QdrantVectorDB('http://localhost:6333');
    console.log("✅ Vector DB Initialized");

    // 2. Setup Embedding
    const embedding = new LMStudioEmbedding({
        baseURL: 'http://localhost:1234/v1',
        model: 'nomic-embed-text-v1.5' // Assuming user has this or similar, standard fallback
    });
    console.log("✅ Embedding Initialized");

    // 3. Setup Context
    const context = new Context({
        vectorDatabase: vectorDb,
        embedding: embedding
    });

    // 4. Run Indexing
    // Targeting "src" directory within packages/core
    const targetPath = path.resolve(__dirname, 'src');
    console.log(`📂 Target Path: ${targetPath}`);

    try {
        const result = await context.indexCodebase(targetPath, (progress) => {
            console.log(`[Progress] ${progress.phase} - ${progress.percentage}%`);
        }, true); // forceReindex = true
        console.log("🎉 Indexing Logic Completed", result);
    } catch (err) {
        console.error("❌ Indexing Failed:", err);
    }
}

runDebug();
