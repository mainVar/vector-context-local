import { QdrantClient } from '@qdrant/js-client-rest';
import { VectorDatabase, VectorDocument, SearchOptions, VectorSearchResult, HybridSearchResult, HybridSearchRequest, HybridSearchOptions } from './types';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

function parseMilvusFilterToQdrant(filterExpr: string): Record<string, any> | undefined {
    if (!filterExpr || filterExpr.trim().length === 0) return undefined;

    const inMatch = filterExpr.match(/^(\w+)\s+in\s+\[([^\]]+)\]$/);
    if (inMatch) {
        const field = inMatch[1];
        const valuesStr = inMatch[2];
        const values = valuesStr.split(',').map(v => v.trim().replace(/^'(.*)'$/, '$1'));
        return {
            should: values.map(val => ({
                key: field,
                match: { value: val }
            }))
        };
    }

    const eqMatch = filterExpr.match(/^(\w+)\s*==\s*"([^"]*)"$/);
    if (eqMatch) {
        return {
            should: [{
                key: eqMatch[1],
                match: { value: eqMatch[2] }
            }]
        };
    }

    logger.warn('Qdrant', `Could not parse filter expression: "${filterExpr}". Returning undefined.`);
    return undefined;
}

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

    async createCollection(collectionName: string, dimension: number, _description?: string): Promise<void> {
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

    async createHybridCollection(collectionName: string, dimension: number, _description?: string): Promise<void> {
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
                    sparse: {}
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
        logger.info('Qdrant', `Inserting ${documents.length} documents into ${collectionName}`);

        const validDocuments = documents.filter(doc => {
            if (!doc.vector || !Array.isArray(doc.vector) || doc.vector.length === 0) {
                logger.warn('Qdrant', `Skipping document with invalid vector:`, {
                    id: doc.id,
                    path: doc.relativePath,
                    vectorLength: doc.vector?.length
                });
                return false;
            }
            return true;
        });

        if (validDocuments.length === 0) {
            logger.warn('Qdrant', 'No valid documents to insert');
            return;
        }

        logger.info('Qdrant', `Valid documents: ${validDocuments.length}/${documents.length}`);

        try {
            const points = validDocuments.map(doc => {
                let id = doc.id;

                const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

                if (!id || !uuidPattern.test(id)) {
                    id = uuidv4();
                    if (doc.id) {
                        logger.warn('Qdrant', `Replaced invalid ID "${doc.id}" with UUID: ${id}`);
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
                wait: true
            });
            logger.info('Qdrant', `Successfully inserted ${points.length} points`);
            logger.debug('Qdrant', `Insert result: ${JSON.stringify(result)}`);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            logger.error('Qdrant', `Error inserting into ${collectionName}: ${message}`);

            if (error instanceof Error && 'data' in error) {
                logger.error('Qdrant', `Error details: ${JSON.stringify((error as any).data, null, 2)}`);
            }

            throw error;
        }
    }

    async insertHybrid(collectionName: string, documents: VectorDocument[]): Promise<void> {
        logger.info('Qdrant', `Inserting hybrid ${documents.length} documents into ${collectionName}`);
        return this.insert(collectionName, documents);
    }

    async search(collectionName: string, queryVector: number[], options?: SearchOptions): Promise<VectorSearchResult[]> {
        const limit = options?.topK || 10;
        const threshold = options?.threshold;

        const qdrantFilter = parseMilvusFilterToQdrant(options?.filterExpr || '');

        const searchParams: any = {
            vector: queryVector,
            limit: limit,
            with_payload: true,
        };
        if (qdrantFilter) {
            searchParams.filter = qdrantFilter;
        }

        const results = await this.client.search(collectionName, searchParams);

        return results
            .filter((hit: any) => {
                if (threshold !== undefined && threshold > 0) {
                    return hit.score >= threshold;
                }
                return true;
            })
            .map((hit: any) => ({
                document: {
                    id: hit.id as string,
                    vector: [],
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

    async hybridSearch(collectionName: string, searchRequests: HybridSearchRequest[], _options?: HybridSearchOptions): Promise<HybridSearchResult[]> {
        const denseReq = searchRequests.find(r => r.anns_field === 'vector' || r.anns_field === 'default');
        if (denseReq && Array.isArray(denseReq.data)) {
            const results = await this.search(collectionName, denseReq.data as number[], {
                topK: denseReq.limit,
                filterExpr: _options?.filterExpr,
            });
            return results;
        }

        throw new Error("Complex hybrid search not fully implemented for Qdrant adapter yet.");
    }

    async delete(collectionName: string, ids: string[]): Promise<void> {
        if (ids.length === 0) return;
        await this.client.delete(collectionName, {
            points: ids,
            wait: true
        });
    }

    async query(collectionName: string, filter: string, outputFields: string[], limit?: number): Promise<Record<string, any>[]> {
        const qdrantFilter = parseMilvusFilterToQdrant(filter);

        const scrollParams: any = {
            limit: limit || 1000,
            with_payload: true,
        };
        if (qdrantFilter) {
            scrollParams.filter = qdrantFilter;
        }

        let allPoints: any[] = [];
        let offset: string | undefined = undefined;

        do {
            const batchParams: any = { ...scrollParams };
            if (offset) {
                batchParams.offset = offset;
            }

            const results = await this.client.scroll(collectionName, batchParams);

            if (results.points && results.points.length > 0) {
                allPoints = allPoints.concat(results.points);
                offset = results.next_page_offset as string | undefined;
            } else {
                offset = undefined;
            }

            if (limit && allPoints.length >= limit) {
                allPoints = allPoints.slice(0, limit);
                break;
            }
        } while (offset);

        return allPoints.map((p: any) => ({
            id: p.id,
            ...(p.payload || {})
        }));
    }

    async checkCollectionLimit(): Promise<boolean> {
        return true;
    }

    async dispose(): Promise<void> {
        logger.debug('Qdrant', `Disposing QdrantVectorDB connection to ${this.address}`);
    }
}
