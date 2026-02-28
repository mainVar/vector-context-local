import { QdrantClient } from '@qdrant/js-client-rest';

const client = new QdrantClient({
    url: 'http://localhost:6333'
});

async function testIndexing() {
    console.log('🧪 Testing Qdrant indexing fix...\n');

    const testCollectionName = 'code_chunks_c4a56986';

    try {
        // Check if collection exists
        const collections = await client.getCollections();
        const hasCollection = collections.collections.some(c => c.name === testCollectionName);

        if (!hasCollection) {
            console.log(`❌ Collection ${testCollectionName} does not exist`);
            console.log(`Please run indexing first`);
            return;
        }

        // Get collection info
        const info = await client.getCollection(testCollectionName);
        console.log(`✅ Collection: ${testCollectionName}`);
        console.log(`   Dimension: ${info.config?.params?.vectors?.size || 'unknown'}`);
        console.log(`   Points count: ${info.points_count}`);

        // Try to insert a test document with proper UUID
        const { v4: uuidv4 } = require('uuid');
        const testVector = new Array(768).fill(0).map(() => Math.random());

        console.log(`\n🔄 Attempting to insert test document...`);

        const result = await client.upsert(testCollectionName, {
            points: [{
                id: uuidv4(),
                vector: testVector,
                payload: {
                    content: 'test content for validation',
                    relativePath: 'test/validation.ts',
                    startLine: 1,
                    endLine: 10,
                    fileExtension: '.ts',
                    codebasePath: 'd:\\Projects\\vector-context-local'
                }
            }],
            wait: true
        });

        console.log(`✅ Successfully inserted test document!`);
        console.log(`   Result:`, result);

        // Verify insertion
        const updatedInfo = await client.getCollection(testCollectionName);
        console.log(`\n📊 Updated collection stats:`);
        console.log(`   Points count: ${updatedInfo.points_count}`);

        if (updatedInfo.points_count > 0) {
            console.log(`\n🎉 SUCCESS! Qdrant is now accepting documents correctly!`);
        } else {
            console.log(`\n⚠️  Warning: Point count is still 0 after insertion`);
        }

    } catch (error: any) {
        console.error(`\n❌ Test failed:`, error.message);
        if (error.data) {
            console.error(`   Error details:`, JSON.stringify(error.data, null, 2));
        }
    }
}

testIndexing();
