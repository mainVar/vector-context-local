import { QdrantClient } from '@qdrant/js-client-rest';
import { VectorDatabase, VectorDocument, SearchOptions, VectorSearchResult, HybridSearchResult, HybridSearchRequest, HybridSearchOptions } from './types';
import { v4 as uuidv4 } from 'uuid';

export class QdrantVectorDB implements VectorDatabase {
    private client: QdrantClient;
    private address: string;
    private apiKey?: string;

    constructor(address: string = 'http://localhost:6333', apiKey?: string) {
        this.address = address;
        this.apiKey = apiKey;
        this.client = new QdrantClient({
            url: address,
            apiKey: apiKey,
        });
    }

    async createCollection(collectionName: string, dimension: number, description?: string): Promise<void> {
        const exists = await this.hasCollection(collectionName);
        if (!exists) {
            await this.client.createCollection(collectionName, {
                vectors: {
                    size: dimension,
                    distance: 'Cosine',
                },
            });
        }
    }

    async createHybridCollection(collectionName: string, dimension: number, description?: string): Promise<void> {
        // Qdrant supports hybrid search via multiple vector properties or just using payload for sparse?
        // Typically sparse vectors are supported in newer Qdrant versions.
        // For simplicity/compatibility, we'll setup dense vector "vector" and enable sparse if possible, 
        // or just rely on Qdrant's flexibility. 
        // NOTE: This implementation focuses on the dense vector part primarily unless we define a schema for sparse.
        // Let's create a standard collection for now, as Qdrant 1.7+ supports sparse vectors named.

        const exists = await this.hasCollection(collectionName);
        if (!exists) {
            await this.client.createCollection(collectionName, {
                vectors: {
                    default: {
                        size: dimension,
                        distance: 'Cosine',
                    }
                },
                sparse_vectors: {
                    sparse: {} // Enable sparse vectors named 'sparse'
                }
            });
        }
    }

    async dropCollection(collectionName: string): Promise<void> {
        await this.client.deleteCollection(collectionName);
    }

    async hasCollection(collectionName: string): Promise<boolean> {
        const result = await this.client.getCollections();
        return result.collections.some((c: any) => c.name === collectionName);
    }

    async listCollections(): Promise<string[]> {
        const result = await this.client.getCollections();
        return result.collections.map((c: any) => c.name);
    }

    async insert(collectionName: string, documents: VectorDocument[]): Promise<void> {
        console.log(`[Qdrant] Inserting ${documents.length} documents into ${collectionName}`);

        // Validate documents before insertion
        const validDocuments = documents.filter(doc => {
            // Check if vector exists and is not empty
            if (!doc.vector || !Array.isArray(doc.vector) || doc.vector.length === 0) {
                console.warn(`[Qdrant] Skipping document with invalid vector:`, {
                    id: doc.id,
                    path: doc.relativePath,
                    vectorLength: doc.vector?.length
                });
                return false;
            }
            return true;
        });

        if (validDocuments.length === 0) {
            console.warn(`[Qdrant] No valid documents to insert`);
            return;
        }

        console.log(`[Qdrant] Valid documents: ${validDocuments.length}/${documents.length}`);

        try {
            const points = validDocuments.map(doc => {
                // Ensure ID is a valid UUID - regenerate if not
                let id = doc.id;

                // UUID regex pattern
                const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

                if (!id || !uuidPattern.test(id)) {
                    id = uuidv4();
                    if (doc.id) {
                        console.warn(`[Qdrant] Replaced invalid ID "${doc.id}" with UUID: ${id}`);
                    }
                }

                return {
                    id: id,
                    vector: doc.vector,
                    payload: {
                        content: doc.content,
                        relativePath: doc.relativePath,
                        startLine: doc.startLine,
                        endLine: doc.endLine,
                        fileExtension: doc.fileExtension,
                        ...doc.metadata
                    }
                };
            });

            const result = await this.client.upsert(collectionName, {
                points,
                wait: true // Ensure data is written before returning
            });
            console.log(`[Qdrant] Successfully inserted ${points.length} points`);
            console.log(`[Qdrant] Insert result:`, result);
        } catch (error: any) {
            console.error(`[Qdrant] Error inserting into ${collectionName}:`, error.message);

            // Log detailed error information
            if (error.data) {
                console.error(`[Qdrant] Error details:`, JSON.stringify(error.data, null, 2));
            }

            throw error;
        }
    }

    async insertHybrid(collectionName: string, documents: VectorDocument[]): Promise<void> {
        console.log(`[Qdrant] Inserting hybrid ${documents.length} documents into ${collectionName}`);
        return this.insert(collectionName, documents);
    }

    async search(collectionName: string, queryVector: number[], options?: SearchOptions): Promise<VectorSearchResult[]> {
        const limit = options?.topK || 10;
        const filter = options?.filter;
        // Validating filter -> Qdrant filter

        const results = await this.client.search(collectionName, {
            vector: queryVector,
            limit: limit,
            filter: filter as any // Simplified casting, real implementation needs filter translation if formats differ
        });

        return results.map((hit: any) => ({
            document: {
                id: hit.id as string,
                vector: [], // Qdrant doesn't always return vector unless requested
                content: hit.payload?.content as string,
                relativePath: hit.payload?.relativePath as string,
                startLine: hit.payload?.startLine as number,
                endLine: hit.payload?.endLine as number,
                fileExtension: hit.payload?.fileExtension as string,
                metadata: hit.payload || {}
            },
            score: hit.score
        }));
    }

    async hybridSearch(collectionName: string, searchRequests: HybridSearchRequest[], options?: HybridSearchOptions): Promise<HybridSearchResult[]> {
        // Qdrant hasn't a direct "hybridSearch" method like Milvus in the same way, 
        // but supports query batching or prefetching.
        // Given the complexity of mapping exactly to Milvus style hybrid search without more context on inputs,
        // we will implement a basic fallback or single dense search if only one request.

        // If we simply have a dense vector, run standard search.
        const denseReq = searchRequests.find(r => r.anns_field === 'vector' || r.anns_field === 'default');
        if (denseReq && Array.isArray(denseReq.data)) {
            const results = await this.search(collectionName, denseReq.data as number[], { topK: denseReq.limit });
            return results;
        }

        throw new Error("Complex hybrid search not fully implemented for Qdrant adapter yet.");
    }

    async delete(collectionName: string, ids: string[]): Promise<void> {
        await this.client.delete(collectionName, {
            points: ids
        });
    }

    async query(collectionName: string, filter: string, outputFields: string[], limit?: number): Promise<Record<string, any>[]> {
        // Simple scroll as query fallback
        const results = await this.client.scroll(collectionName, {
            limit: limit || 100,
            with_payload: true,
            // Filter implementation would need parsing 'filter' string to Qdrant Filter object
        });
        return results.points.map((p: any) => p.payload || {});
    }

    async checkCollectionLimit(): Promise<boolean> {
        return true; // No artificial limit for local Qdrant
    }
}
