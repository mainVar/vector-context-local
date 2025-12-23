
import { Context } from './src/context';
import { QdrantVectorDB } from './src/vectordb/qdrant-vectordb';
import { LMStudioEmbedding } from './src/embedding/lmstudio-embedding';
import * as path from 'path';

async function runSearchDebug() {
    console.log("🔍 Starting Search Debug...");

    // 1. Setup Same Config
    const vectorDb = new QdrantVectorDB('http://localhost:6333');
    const embedding = new LMStudioEmbedding({
        baseURL: 'http://localhost:1234/v1',
        model: 'nomic-embed-text-v1.5'
    });

    const context = new Context({
        vectorDatabase: vectorDb,
        embedding: embedding
    });

    // 2. Define path that was indexed
    const targetPath = path.resolve(__dirname, 'src');

    // 3. Search Query
    const query = "How does Qdrant insert documents?";
    console.log(`❓ Query: "${query}"`);

    try {
        const results = await context.semanticSearch(targetPath, query, 3);

        console.log(`\n✅ Found ${results.length} results:`);
        results.forEach((res, i) => {
            console.log(`\n[${i + 1}] Score: ${res.score?.toFixed(4)} | File: ${res.relativePath}:${res.startLine}`);
            console.log(`    Snippet: ${res.content.substring(0, 100).replace(/\n/g, ' ')}...`);
        });

    } catch (err) {
        console.error("❌ Search Failed:", err);
    }
}

runSearchDebug();
