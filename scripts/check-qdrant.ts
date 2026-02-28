import { QdrantClient } from '@qdrant/js-client-rest';

const client = new QdrantClient({
    url: 'http://localhost:6333'
});

async function checkQdrant() {
    console.log('🔍 Checking Qdrant status...\n');

    try {
        // Get all collections
        const collections = await client.getCollections();
        console.log(`Found ${collections.collections.length} collections:\n`);

        for (const collection of collections.collections) {
            console.log(`=== Collection: ${collection.name} ===`);

            // Get detailed collection info
            const info = await client.getCollection(collection.name);
            console.log(`  Points count: ${info.points_count}`);

            // Check vector configuration
            if (info.config?.params?.vectors) {
                const vectorConfig = info.config.params.vectors;

                // Handle both simple and named vector configs
                if ('size' in vectorConfig) {
                    // Simple vector config
                    console.log(`  Vector dimension: ${vectorConfig.size}`);
                    console.log(`  Distance metric: ${vectorConfig.distance}`);
                } else if ('default' in vectorConfig) {
                    // Named vector config (hybrid)
                    console.log(`  Vector dimension (default): ${vectorConfig.default.size}`);
                    console.log(`  Distance metric: ${vectorConfig.default.distance}`);
                }
            }

            // Check sparse vectors if present
            if (info.config?.params?.sparse_vectors) {
                console.log(`  Sparse vectors: enabled`);
            }

            // Try to get a sample point if collection is not empty
            if (info.points_count > 0) {
                try {
                    const sample = await client.scroll(collection.name, {
                        limit: 1,
                        with_payload: true,
                        with_vector: true
                    });

                    if (sample.points.length > 0) {
                        const point = sample.points[0];
                        console.log(`  Sample point ID: ${point.id}`);

                        // Check vector
                        if (Array.isArray(point.vector)) {
                            console.log(`  Sample vector length: ${point.vector.length}`);
                        } else if (point.vector && typeof point.vector === 'object') {
                            // Named vectors
                            const vectorKeys = Object.keys(point.vector);
                            console.log(`  Vector names: ${vectorKeys.join(', ')}`);
                            for (const key of vectorKeys) {
                                const vec = (point.vector as any)[key];
                                if (Array.isArray(vec)) {
                                    console.log(`    ${key}: ${vec.length} dimensions`);
                                }
                            }
                        }

                        // Check payload
                        if (point.payload) {
                            console.log(`  Payload keys: ${Object.keys(point.payload).join(', ')}`);
                        }
                    }
                } catch (err) {
                    console.log(`  ⚠️  Could not retrieve sample point: ${err}`);
                }
            } else {
                console.log(`  (Empty collection)`);
            }

            console.log('');
        }

        // Test vector insertion with proper dimension
        console.log('\n🧪 Testing vector insertion...\n');

        const testCollectionName = 'test_insertion_768';

        // Delete if exists
        const hasTest = collections.collections.some(c => c.name === testCollectionName);
        if (hasTest) {
            await client.deleteCollection(testCollectionName);
            console.log(`Deleted existing test collection: ${testCollectionName}`);
        }

        // Create test collection with 768 dimensions (nomic-embed-text)
        await client.createCollection(testCollectionName, {
            vectors: {
                size: 768,
                distance: 'Cosine'
            }
        });
        console.log(`✅ Created test collection with 768 dimensions`);

        // Try to insert a test vector with valid UUID
        const testVector = new Array(768).fill(0).map(() => Math.random());
        const { v4: uuidv4 } = require('uuid');

        console.log(`\n🔄 Attempting to insert test document...`);

        try {
            const result = await client.upsert(testCollectionName, {
                points: [{
                    id: uuidv4(), // Use valid UUID
                    vector: testVector,
                    payload: {
                        content: 'test content',
                        relativePath: 'test/path.ts',
                        startLine: 1,
                        endLine: 10
                    }
                }],
                wait: true
            });

            console.log(`✅ Successfully inserted test vector`);
            console.log(`   Result: ${JSON.stringify(result)}`);

            // Verify insertion
            const verifyInfo = await client.getCollection(testCollectionName);
            console.log(`   Points in collection: ${verifyInfo.points_count}`);

        } catch (err: any) {
            console.error(`❌ Failed to insert test vector:`);
            console.error(`   Error: ${err.message}`);
            console.error(`   Full error:`, JSON.stringify(err, null, 2));

            if (err.response) {
                console.error(`   Response status: ${err.response.status}`);
                console.error(`   Response data:`, JSON.stringify(err.response.data, null, 2));
            }

            if (err.data) {
                console.error(`   Error data:`, JSON.stringify(err.data, null, 2));
            }

            // Try to get more details from the error object
            console.error(`   Error keys:`, Object.keys(err));
        }

        // Clean up test collection
        await client.deleteCollection(testCollectionName);
        console.log(`\n🧹 Cleaned up test collection`);

    } catch (error: any) {
        console.error('❌ Error:', error.message);
        if (error.response) {
            console.error('Response:', error.response.data);
        }
    }
}

checkQdrant();
