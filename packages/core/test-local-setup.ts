
import { QdrantClient } from '@qdrant/js-client-rest';
import { LMStudioEmbedding } from './src/embedding/lmstudio-embedding';

async function testIntegration() {
    console.log("🔄 Starting integration test...");

    // 1. Test Qdrant Connection
    console.log("\n📡 Testing Qdrant connection at http://localhost:6333...");
    try {
        const client = new QdrantClient({ url: 'http://localhost:6333' });
        const collections = await client.getCollections();
        console.log(`✅ Qdrant Connected! Found ${collections.collections.length} collections.`);
        console.log("   Collections:", collections.collections.map(c => c.name).join(", "));
    } catch (error) {
        console.error("❌ Qdrant Connection Failed:", error.message);
        console.error("   Make sure Qdrant is running via Docker: docker run -p 6333:6333 qdrant/qdrant");
    }

    // 2. Test LM Studio Connection
    console.log("\n🧠 Testing LM Studio connection at http://localhost:1234/v1...");
    try {
        const embedding = new LMStudioEmbedding({
            baseURL: 'http://localhost:1234/v1',
            model: 'nomic-embed-text' // Using a common default, change if needed
        });

        console.log("   Generating test embedding for 'Hello world'...");
        const result = await embedding.embed("Hello world");

        if (result && result.vector && result.vector.length > 0) {
            console.log(`✅ LM Studio Connected! Generated vector of dimension: ${result.dimension}`);
        } else {
            console.error("❌ LM Studio returned empty vector/error.");
        }
    } catch (error) {
        console.error("❌ LM Studio Connection Failed:", error.message);
        console.error("   Make sure LM Studio is running Server mode on port 1234.");
    }
}

testIntegration();
