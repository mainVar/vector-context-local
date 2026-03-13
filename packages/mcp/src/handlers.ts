import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { Context, COLLECTION_LIMIT_MESSAGE, logger } from "@vector-context/core";
import { SnapshotManager } from "./snapshot.js";
import { ensureAbsolutePath, truncateContent, trackCodebasePath } from "./utils.js";

export class ToolHandlers {
    private context: Context;
    private snapshotManager: SnapshotManager;
    private indexingStats: { indexedFiles: number; totalChunks: number } | null = null;
    private currentWorkspace: string;

    constructor(context: Context, snapshotManager: SnapshotManager) {
        this.context = context;
        this.snapshotManager = snapshotManager;
        this.currentWorkspace = process.cwd();
        logger.debug("WORKSPACE", `Current workspace: ${this.currentWorkspace}`);
    }

    /**
     * Sync indexed codebases from Zilliz Cloud collections
     * This method fetches all collections from the vector database,
     * gets the first document from each collection to extract codebasePath from metadata,
     * and updates the snapshot with discovered codebases.
     * 
     * Logic: Compare mcp-codebase-snapshot.json with zilliz cloud collections
     * - If local snapshot has extra directories (not in cloud), remove them
     * - If local snapshot is missing directories (exist in cloud), ignore them
     */
    private async syncIndexedCodebasesFromCloud(): Promise<void> {
        try {
            logger.info("SYNC-CLOUD", "🔄 Syncing indexed codebases from Zilliz Cloud...");

            const vectorDb = this.context.getVectorDatabase();
            const collections = await vectorDb.listCollections();
            const cloudCollectionNames = new Set(collections);

            logger.debug("SYNC-CLOUD", `📋 Found ${collections.length} collections in Zilliz Cloud`);

            const normalizeForComparison = (p: string) => path.normalize(p).toLowerCase();

            const localCodebases = this.snapshotManager.getIndexedCodebases();
            logger.debug("SYNC-CLOUD", `📊 Found ${localCodebases.length} local codebases in snapshot`);

            let hasChanges = false;

            for (const localCodebase of localCodebases) {
                const expectedCollectionName = this.context.getCollectionName(localCodebase);

                if (!cloudCollectionNames.has(expectedCollectionName)) {
                    logger.debug("SYNC-CLOUD", `➖ Collection ${expectedCollectionName} missing in cloud for ${localCodebase}. SKIPPING REMOVAL FOR DEBUGGING.`);
                    continue;
                }

                logger.debug("SYNC-CLOUD", `✅ Verified codebase ${localCodebase} (collection ${expectedCollectionName} exists)`);
            }

            if (hasChanges) {
                this.snapshotManager.saveCodebaseSnapshot();
                logger.debug("SYNC-CLOUD", "💾 Updated snapshot to match cloud state");
            } else {
                logger.debug("SYNC-CLOUD", "✅ Local snapshot matches cloud state");
            }

            logger.info("SYNC-CLOUD", "✅ Cloud sync completed successfully");
        } catch (error: any) {
            logger.error("SYNC-CLOUD", `❌ Error syncing codebases from cloud: ${error.message || error}`);
        }
    }

    public async handleIndexCodebase(args: any) {
        const { path: codebasePath, force, splitter, customExtensions, ignorePatterns } = args;
        const forceReindex = force || false;
        const splitterType = splitter || 'ast'; // Default to AST
        const customFileExtensions = customExtensions || [];
        const customIgnorePatterns = ignorePatterns || [];

        try {
            // Sync indexed codebases from cloud first
            await this.syncIndexedCodebasesFromCloud();

            // Validate splitter parameter
            if (splitterType !== 'ast' && splitterType !== 'langchain') {
                return {
                    content: [{
                        type: "text",
                        text: `Error: Invalid splitter type '${splitterType}'. Must be 'ast' or 'langchain'.`
                    }],
                    isError: true
                };
            }
            // Force absolute path resolution - warn if relative path provided
            const absolutePath = ensureAbsolutePath(codebasePath);

            // Validate path exists
            if (!fs.existsSync(absolutePath)) {
                return {
                    content: [{
                        type: "text",
                        text: `Error: Path '${absolutePath}' does not exist. Original input: '${codebasePath}'`
                    }],
                    isError: true
                };
            }

            // Check if it's a directory
            const stat = fs.statSync(absolutePath);
            if (!stat.isDirectory()) {
                return {
                    content: [{
                        type: "text",
                        text: `Error: Path '${absolutePath}' is not a directory`
                    }],
                    isError: true
                };
            }

            // Check if already indexing
            if (this.snapshotManager.getIndexingCodebases().includes(absolutePath)) {
                return {
                    content: [{
                        type: "text",
                        text: `Codebase '${absolutePath}' is already being indexed in the background. Please wait for completion.`
                    }],
                    isError: true
                };
            }

            if (this.snapshotManager.getIndexedCodebases().includes(absolutePath) !== await this.context.hasIndex(absolutePath)) {
                logger.warn("INDEX-VALIDATION", `❌ Snapshot and cloud index mismatch: ${absolutePath}`);
            }

            // Check if already indexed (unless force is true)
            if (!forceReindex && this.snapshotManager.getIndexedCodebases().includes(absolutePath)) {
                return {
                    content: [{
                        type: "text",
                        text: `Codebase '${absolutePath}' is already indexed. Use force=true to re-index.`
                    }],
                    isError: true
                };
            }

            if (forceReindex) {
                if (this.snapshotManager.getIndexedCodebases().includes(absolutePath)) {
                    logger.debug("FORCE-REINDEX", `🔄 Removing '${absolutePath}' from indexed list for re-indexing`);
                    this.snapshotManager.removeIndexedCodebase(absolutePath);
                }
                if (await this.context.hasIndex(absolutePath)) {
                    logger.debug("FORCE-REINDEX", `🔄 Clearing index for '${absolutePath}'`);
                    await this.context.clearIndex(absolutePath);
                }
            }

            try {
                logger.debug("INDEX-VALIDATION", "🔍 Validating collection creation capability");
                const canCreateCollection = await this.context.getVectorDatabase().checkCollectionLimit();

                if (!canCreateCollection) {
                    logger.error("INDEX-VALIDATION", `❌ Collection limit validation failed: ${absolutePath}`);
                    return {
                        content: [{
                            type: "text",
                            text: COLLECTION_LIMIT_MESSAGE
                        }],
                        isError: true
                    };
                }

                logger.debug("INDEX-VALIDATION", "✅  Collection creation validation completed");
            } catch (validationError: any) {
                logger.error("INDEX-VALIDATION", `❌ Collection creation validation failed: ${validationError}`);
                return {
                    content: [{
                        type: "text",
                        text: `Error validating collection creation: ${validationError.message || validationError}`
                    }],
                    isError: true
                };
            }

            if (customFileExtensions.length > 0) {
                logger.debug("CUSTOM-EXTENSIONS", `Adding ${customFileExtensions.length} custom extensions: ${customFileExtensions.join(', ')}`);
                this.context.addCustomExtensions(customFileExtensions);
            }

            if (customIgnorePatterns.length > 0) {
                logger.debug("IGNORE-PATTERNS", `Adding ${customIgnorePatterns.length} custom ignore patterns: ${customIgnorePatterns.join(', ')}`);
                this.context.addCustomIgnorePatterns(customIgnorePatterns);
            }

            const currentStatus = this.snapshotManager.getCodebaseStatus(absolutePath);
            if (currentStatus === 'indexfailed') {
                const failedInfo = this.snapshotManager.getCodebaseInfo(absolutePath) as any;
                logger.info("BACKGROUND-INDEX", `Retrying indexing for previously failed codebase. Previous error: ${failedInfo?.errorMessage || 'Unknown error'}`);
            }

            // Set to indexing status and save snapshot immediately
            this.snapshotManager.setCodebaseIndexing(absolutePath, 0);
            this.snapshotManager.saveCodebaseSnapshot();

            // Track the codebase path for syncing
            trackCodebasePath(absolutePath);

            // Start background indexing - now safe to proceed
            this.startBackgroundIndexing(absolutePath, forceReindex, splitterType);

            const pathInfo = codebasePath !== absolutePath
                ? `\nNote: Input path '${codebasePath}' was resolved to absolute path '${absolutePath}'`
                : '';

            const extensionInfo = customFileExtensions.length > 0
                ? `\nUsing ${customFileExtensions.length} custom extensions: ${customFileExtensions.join(', ')}`
                : '';

            const ignoreInfo = customIgnorePatterns.length > 0
                ? `\nUsing ${customIgnorePatterns.length} custom ignore patterns: ${customIgnorePatterns.join(', ')}`
                : '';

            return {
                content: [{
                    type: "text",
                    text: `Started background indexing for codebase '${absolutePath}' using ${splitterType.toUpperCase()} splitter.${pathInfo}${extensionInfo}${ignoreInfo}\n\nIndexing is running in the background. You can search the codebase while indexing is in progress, but results may be incomplete until indexing completes.`
                }]
            };

        } catch (error: any) {
            logger.error("INDEX", "Error in handleIndexCodebase:", error);
            return {
                content: [{
                    type: "text",
                    text: `Error starting indexing: ${error.message || error}`
                }],
                isError: true
            };
        }
    }

    private async startBackgroundIndexing(codebasePath: string, forceReindex: boolean, splitterType: string) {
        const absolutePath = codebasePath;
        let lastSaveTime = 0;

        try {
            logger.info("BACKGROUND-INDEX", `Starting background indexing for: ${absolutePath}`);

            if (forceReindex) {
                logger.debug("BACKGROUND-INDEX", "ℹ️  Force reindex mode - collection was already cleared during validation");
            }

            let contextForThisTask = this.context;
            if (splitterType !== 'ast') {
                logger.warn("BACKGROUND-INDEX", `Non-AST splitter '${splitterType}' requested; falling back to AST splitter`);
            }

            await this.context.getLoadedIgnorePatterns(absolutePath);

            const { FileSynchronizer } = await import("@vector-context/core");
            const ignorePatterns = this.context.getIgnorePatterns() || [];
            logger.debug("BACKGROUND-INDEX", `Using ignore patterns: ${ignorePatterns.join(', ')}`);
            const synchronizer = new FileSynchronizer(absolutePath, ignorePatterns);
            await synchronizer.initialize();

            await this.context.getPreparedCollection(absolutePath);
            const collectionName = this.context.getCollectionName(absolutePath);
            this.context.setSynchronizer(collectionName, synchronizer);
            if (contextForThisTask !== this.context) {
                contextForThisTask.setSynchronizer(collectionName, synchronizer);
            }

            logger.info("BACKGROUND-INDEX", `Starting indexing with ${splitterType} splitter for: ${absolutePath}`);

            const embeddingProvider = this.context.getEmbedding();
            logger.debug("BACKGROUND-INDEX", `🧠 Using embedding provider: ${embeddingProvider.getProvider()} with dimension: ${embeddingProvider.getDimension()}`);

            logger.info("BACKGROUND-INDEX", "🚀 Beginning codebase indexing process...");
            const stats = await contextForThisTask.indexCodebase(absolutePath, (progress) => {
                this.snapshotManager.setCodebaseIndexing(absolutePath, progress.percentage);

                const currentTime = Date.now();
                if (currentTime - lastSaveTime >= 2000) {
                    this.snapshotManager.saveCodebaseSnapshot();
                    lastSaveTime = currentTime;
                    logger.debug("BACKGROUND-INDEX", `💾 Saved progress snapshot at ${progress.percentage.toFixed(1)}%`);
                }

                logger.debug("BACKGROUND-INDEX", `Progress: ${progress.phase} - ${progress.percentage}% (${progress.current}/${progress.total})`);
            });
            logger.info("BACKGROUND-INDEX", `✅ Indexing completed successfully! Files: ${stats.indexedFiles}, Chunks: ${stats.totalChunks}`);

            this.snapshotManager.setCodebaseIndexed(absolutePath, stats);
            this.indexingStats = { indexedFiles: stats.indexedFiles, totalChunks: stats.totalChunks };

            this.snapshotManager.saveCodebaseSnapshot();

            let message = `Background indexing completed for '${absolutePath}' using ${splitterType.toUpperCase()} splitter.\nIndexed ${stats.indexedFiles} files, ${stats.totalChunks} chunks.`;
            if (stats.status === 'limit_reached') {
                message += `\n⚠️  Warning: Indexing stopped because the chunk limit (450,000) was reached. The index may be incomplete.`;
            }

            logger.info("BACKGROUND-INDEX", message);

        } catch (error: any) {
            logger.error("BACKGROUND-INDEX", `Error during indexing for ${absolutePath}:`, error);

            const lastProgress = this.snapshotManager.getIndexingProgress(absolutePath);

            const errorMessage = error.message || String(error);
            this.snapshotManager.setCodebaseIndexFailed(absolutePath, errorMessage, lastProgress);
            this.snapshotManager.saveCodebaseSnapshot();

            logger.error("BACKGROUND-INDEX", `Indexing failed for ${absolutePath}: ${errorMessage}`);
        }
    }

    public async handleSearchCode(args: any) {
        const { path: codebasePath, query, limit = 10, extensionFilter } = args;
        const resultLimit = limit || 10;

        try {
            // Sync indexed codebases from cloud first
            await this.syncIndexedCodebasesFromCloud();

            // Force absolute path resolution - warn if relative path provided
            const absolutePath = ensureAbsolutePath(codebasePath);

            // Validate path exists
            if (!fs.existsSync(absolutePath)) {
                return {
                    content: [{
                        type: "text",
                        text: `Error: Path '${absolutePath}' does not exist. Original input: '${codebasePath}'`
                    }],
                    isError: true
                };
            }

            // Check if it's a directory
            const stat = fs.statSync(absolutePath);
            if (!stat.isDirectory()) {
                return {
                    content: [{
                        type: "text",
                        text: `Error: Path '${absolutePath}' is not a directory`
                    }],
                    isError: true
                };
            }

            trackCodebasePath(absolutePath);

            // Check if this codebase is indexed or being indexed
            const isIndexed = this.snapshotManager.getIndexedCodebases().includes(absolutePath);
            const isIndexing = this.snapshotManager.getIndexingCodebases().includes(absolutePath);

            if (!isIndexed && !isIndexing) {
                return {
                    content: [{
                        type: "text",
                        text: `Error: Codebase '${absolutePath}' is not indexed. Please index it first using the index_codebase tool. Debug: Snapshots: ${JSON.stringify(this.snapshotManager.getIndexedCodebases())}`
                    }],
                    isError: true
                };
            }

            // Show indexing status if codebase is being indexed
            let indexingStatusMessage = '';
            if (isIndexing) {
                indexingStatusMessage = `\n⚠️  **Indexing in Progress**: This codebase is currently being indexed in the background. Search results may be incomplete until indexing completes.`;
            }

            logger.debug("SEARCH", `Searching in codebase: ${absolutePath}`);
            logger.debug("SEARCH", `Query: "${query}"`);
            logger.debug("SEARCH", `Indexing status: ${isIndexing ? 'In Progress' : 'Completed'}`);

            const embeddingProvider = this.context.getEmbedding();
            logger.debug("SEARCH", `🧠 Using embedding provider: ${embeddingProvider.getProvider()} for search`);
            logger.debug("SEARCH", `🔍 Generating embeddings for query using ${embeddingProvider.getProvider()}...`);

            // Build filter expression from extensionFilter list
            let filterExpr: string | undefined = undefined;
            if (Array.isArray(extensionFilter) && extensionFilter.length > 0) {
                const cleaned = extensionFilter
                    .filter((v: any) => typeof v === 'string')
                    .map((v: string) => v.trim())
                    .filter((v: string) => v.length > 0);
                const invalid = cleaned.filter((e: string) => !(e.startsWith('.') && e.length > 1 && !/\s/.test(e)));
                if (invalid.length > 0) {
                    return {
                        content: [{ type: 'text', text: `Error: Invalid file extensions in extensionFilter: ${JSON.stringify(invalid)}. Use proper extensions like '.ts', '.py'.` }],
                        isError: true
                    };
                }
                const quoted = cleaned.map((e: string) => `'${e}'`).join(', ');
                filterExpr = `fileExtension in [${quoted}]`;
            }

            const searchResults = await this.context.semanticSearch(
                absolutePath,
                query,
                Math.min(resultLimit, 50),
                0.3,
                filterExpr
            );

            logger.info("SEARCH", `✅ Search completed! Found ${searchResults.length} results using ${embeddingProvider.getProvider()} embeddings`);

            if (searchResults.length === 0) {
                let noResultsMessage = `No results found for query: "${query}" in codebase '${absolutePath}'`;
                if (isIndexing) {
                    noResultsMessage += `\n\nNote: This codebase is still being indexed. Try searching again after indexing completes, or the query may not match any indexed content.`;
                }
                return {
                    content: [{
                        type: "text",
                        text: noResultsMessage
                    }]
                };
            }

            // Format results
            const formattedResults = searchResults.map((result: any, index: number) => {
                const location = `${result.relativePath}:${result.startLine}-${result.endLine}`;
                const context = truncateContent(result.content, 5000);
                const codebaseInfo = path.basename(absolutePath);

                return `${index + 1}. Code snippet (${result.language}) [${codebaseInfo}]\n` +
                    `   Location: ${location}\n` +
                    `   Rank: ${index + 1}\n` +
                    `   Context: \n\`\`\`${result.language}\n${context}\n\`\`\`\n`;
            }).join('\n');

            let resultMessage = `Found ${searchResults.length} results for query: "${query}" in codebase '${absolutePath}'${indexingStatusMessage}\n\n${formattedResults}`;

            if (isIndexing) {
                resultMessage += `\n\n💡 **Tip**: This codebase is still being indexed. More results may become available as indexing progresses.`;
            }

            return {
                content: [{
                    type: "text",
                    text: resultMessage
                }]
            };
        } catch (error) {
            // Check if this is the collection limit error
            // Handle both direct string throws and Error objects containing the message
            const errorMessage = typeof error === 'string' ? error : (error instanceof Error ? error.message : String(error));

            if (errorMessage === COLLECTION_LIMIT_MESSAGE || errorMessage.includes(COLLECTION_LIMIT_MESSAGE)) {
                // Return the collection limit message as a successful response
                // This ensures LLM treats it as final answer, not as retryable error
                return {
                    content: [{
                        type: "text",
                        text: COLLECTION_LIMIT_MESSAGE
                    }]
                };
            }

            return {
                content: [{
                    type: "text",
                    text: `Error searching code: ${errorMessage} Please check if the codebase has been indexed first.`
                }],
                isError: true
            };
        }
    }

    public async handleClearIndex(args: any) {
        const { path: codebasePath } = args;

        if (this.snapshotManager.getIndexedCodebases().length === 0 && this.snapshotManager.getIndexingCodebases().length === 0) {
            return {
                content: [{
                    type: "text",
                    text: "No codebases are currently indexed or being indexed."
                }]
            };
        }

        try {
            // Force absolute path resolution - warn if relative path provided
            const absolutePath = ensureAbsolutePath(codebasePath);

            // Validate path exists
            if (!fs.existsSync(absolutePath)) {
                return {
                    content: [{
                        type: "text",
                        text: `Error: Path '${absolutePath}' does not exist. Original input: '${codebasePath}'`
                    }],
                    isError: true
                };
            }

            // Check if it's a directory
            const stat = fs.statSync(absolutePath);
            if (!stat.isDirectory()) {
                return {
                    content: [{
                        type: "text",
                        text: `Error: Path '${absolutePath}' is not a directory`
                    }],
                    isError: true
                };
            }

            // Check if this codebase is indexed or being indexed
            const isIndexed = this.snapshotManager.getIndexedCodebases().includes(absolutePath);
            const isIndexing = this.snapshotManager.getIndexingCodebases().includes(absolutePath);

            if (!isIndexed && !isIndexing) {
                return {
                    content: [{
                        type: "text",
                        text: `Error: Codebase '${absolutePath}' is not indexed or being indexed.`
                    }],
                    isError: true
                };
            }

            logger.info("CLEAR", `Clearing codebase: ${absolutePath}`);

            try {
                await this.context.clearIndex(absolutePath);
                logger.info("CLEAR", `Successfully cleared index for: ${absolutePath}`);
            } catch (error: any) {
                const errorMsg = `Failed to clear ${absolutePath}: ${error.message}`;
                logger.error("CLEAR", errorMsg);
                return {
                    content: [{
                        type: "text",
                        text: errorMsg
                    }],
                    isError: true
                };
            }

            // Completely remove the cleared codebase from snapshot
            this.snapshotManager.removeCodebaseCompletely(absolutePath);

            // Reset indexing stats if this was the active codebase
            this.indexingStats = null;

            // Save snapshot after clearing index
            this.snapshotManager.saveCodebaseSnapshot();

            let resultText = `Successfully cleared codebase '${absolutePath}'`;

            const remainingIndexed = this.snapshotManager.getIndexedCodebases().length;
            const remainingIndexing = this.snapshotManager.getIndexingCodebases().length;

            if (remainingIndexed > 0 || remainingIndexing > 0) {
                resultText += `\n${remainingIndexed} other indexed codebase(s) and ${remainingIndexing} indexing codebase(s) remain`;
            }

            return {
                content: [{
                    type: "text",
                    text: resultText
                }]
            };
        } catch (error) {
            // Check if this is the collection limit error
            // Handle both direct string throws and Error objects containing the message
            const errorMessage = typeof error === 'string' ? error : (error instanceof Error ? error.message : String(error));

            if (errorMessage === COLLECTION_LIMIT_MESSAGE || errorMessage.includes(COLLECTION_LIMIT_MESSAGE)) {
                // Return the collection limit message as a successful response
                // This ensures LLM treats it as final answer, not as retryable error
                return {
                    content: [{
                        type: "text",
                        text: COLLECTION_LIMIT_MESSAGE
                    }]
                };
            }

            return {
                content: [{
                    type: "text",
                    text: `Error clearing index: ${errorMessage}`
                }],
                isError: true
            };
        }
    }

    public async handleGetIndexingStatus(args: any) {
        const { path: codebasePath } = args;

        try {
            // Force absolute path resolution
            const absolutePath = ensureAbsolutePath(codebasePath);

            // Validate path exists
            if (!fs.existsSync(absolutePath)) {
                return {
                    content: [{
                        type: "text",
                        text: `Error: Path '${absolutePath}' does not exist. Original input: '${codebasePath}'`
                    }],
                    isError: true
                };
            }

            // Check if it's a directory
            const stat = fs.statSync(absolutePath);
            if (!stat.isDirectory()) {
                return {
                    content: [{
                        type: "text",
                        text: `Error: Path '${absolutePath}' is not a directory`
                    }],
                    isError: true
                };
            }

            // Check indexing status using new status system
            const status = this.snapshotManager.getCodebaseStatus(absolutePath);
            const info = this.snapshotManager.getCodebaseInfo(absolutePath);

            let statusMessage = '';

            switch (status) {
                case 'indexed':
                    if (info && 'indexedFiles' in info) {
                        const indexedInfo = info as any;
                        statusMessage = `✅ Codebase '${absolutePath}' is fully indexed and ready for search.`;
                        statusMessage += `\n📊 Statistics: ${indexedInfo.indexedFiles} files, ${indexedInfo.totalChunks} chunks`;
                        statusMessage += `\n📅 Status: ${indexedInfo.indexStatus}`;
                        statusMessage += `\n🕐 Last updated: ${new Date(indexedInfo.lastUpdated).toLocaleString()}`;
                    } else {
                        statusMessage = `✅ Codebase '${absolutePath}' is fully indexed and ready for search.`;
                    }
                    break;

                case 'indexing':
                    if (info && 'indexingPercentage' in info) {
                        const indexingInfo = info as any;
                        const progressPercentage = indexingInfo.indexingPercentage || 0;
                        statusMessage = `🔄 Codebase '${absolutePath}' is currently being indexed. Progress: ${progressPercentage.toFixed(1)}%`;

                        // Add more detailed status based on progress
                        if (progressPercentage < 10) {
                            statusMessage += ' (Preparing and scanning files...)';
                        } else if (progressPercentage < 100) {
                            statusMessage += ' (Processing files and generating embeddings...)';
                        }
                        statusMessage += `\n🕐 Last updated: ${new Date(indexingInfo.lastUpdated).toLocaleString()}`;
                    } else {
                        statusMessage = `🔄 Codebase '${absolutePath}' is currently being indexed.`;
                    }
                    break;

                case 'indexfailed':
                    if (info && 'errorMessage' in info) {
                        const failedInfo = info as any;
                        statusMessage = `❌ Codebase '${absolutePath}' indexing failed.`;
                        statusMessage += `\n🚨 Error: ${failedInfo.errorMessage}`;
                        if (failedInfo.lastAttemptedPercentage !== undefined) {
                            statusMessage += `\n📊 Failed at: ${failedInfo.lastAttemptedPercentage.toFixed(1)}% progress`;
                        }
                        statusMessage += `\n🕐 Failed at: ${new Date(failedInfo.lastUpdated).toLocaleString()}`;
                        statusMessage += `\n💡 You can retry indexing by running the index_codebase command again.`;
                    } else {
                        statusMessage = `❌ Codebase '${absolutePath}' indexing failed. You can retry indexing.`;
                    }
                    break;

                case 'not_found':
                default:
                    statusMessage = `❌ Codebase '${absolutePath}' is not indexed. Please use the index_codebase tool to index it first.`;
                    break;
            }

            const pathInfo = codebasePath !== absolutePath
                ? `\nNote: Input path '${codebasePath}' was resolved to absolute path '${absolutePath}'`
                : '';

            return {
                content: [{
                    type: "text",
                    text: statusMessage + pathInfo
                }]
            };

        } catch (error: any) {
            return {
                content: [{
                    type: "text",
                    text: `Error getting indexing status: ${error.message || error}`
                }],
                isError: true
            };
        }
    }
} 