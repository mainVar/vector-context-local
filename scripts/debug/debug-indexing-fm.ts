
import { Context } from './src/context';
import { QdrantVectorDB } from './src/vectordb/qdrant-vectordb';
import { LMStudioEmbedding } from './src/embedding/lmstudio-embedding';
import * as path from 'path';

async function runDebug() {
    console.log("🛠️  Starting Debug Indexing for FM Project...");

    // 1. Setup Vector DB
    const vectorDb = new QdrantVectorDB('http://localhost:6333');
    console.log("✅ Vector DB Initialized");

    // 2. Setup Embedding (Assuming LM Studio is running on port 1234)
    const embedding = new LMStudioEmbedding({
        baseURL: 'http://localhost:1234/v1',
        model: 'text-embedding-nomic-embed-text-v1.5' // Ensure this matches what you have loaded in LM Studio
    });
    console.log("✅ Embedding Initialized");

    // 3. Setup Context
    const context = new Context({
        vectorDatabase: vectorDb,
        embedding: embedding
    });

    // 4. Run Indexing
    const targetPath = 'D:\\Projects\\vector-context-local\\packages\\core';
    console.log(`📂 Target Path: ${targetPath}`);

    try {
        // forceReindex = true ensures we clean up the previous collection for this path
        const result = await context.indexCodebase(targetPath, (progress) => {
            console.log(`[Progress] ${progress.phase} - ${progress.percentage}%`);
        }, true);
        console.log("🎉 Indexing Logic Completed", result);
    } catch (err) {
        console.error("❌ Indexing Failed:", err);
    }
}

runDebug();
