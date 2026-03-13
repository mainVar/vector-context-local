import * as fs from "fs";
import { Context, FileSynchronizer, logger } from "@vector-context/core";
import { SnapshotManager } from "./snapshot.js";

export class SyncManager {
    private context: Context;
    private snapshotManager: SnapshotManager;
    private isSyncing: boolean = false;

    constructor(context: Context, snapshotManager: SnapshotManager) {
        this.context = context;
        this.snapshotManager = snapshotManager;
    }

    public async handleSyncIndex(): Promise<void> {
        const syncStartTime = Date.now();
        logger.debug("SYNC-DEBUG", `handleSyncIndex() called at ${new Date().toISOString()}`);

        const indexedCodebases = this.snapshotManager.getIndexedCodebases();

        if (indexedCodebases.length === 0) {
            logger.debug("SYNC-DEBUG", "No codebases indexed. Skipping sync.");
            return;
        }

        logger.debug("SYNC-DEBUG", `Found ${indexedCodebases.length} indexed codebases:`, indexedCodebases);

        if (this.isSyncing) {
            logger.debug("SYNC-DEBUG", "Index sync already in progress. Skipping.");
            return;
        }

        this.isSyncing = true;
        logger.debug("SYNC-DEBUG", `Starting index sync for all ${indexedCodebases.length} codebases...`);

        try {
            let totalStats = { added: 0, removed: 0, modified: 0 };

            for (let i = 0; i < indexedCodebases.length; i++) {
                const codebasePath = indexedCodebases[i];
                const codebaseStartTime = Date.now();

                logger.debug("SYNC-DEBUG", `[${i + 1}/${indexedCodebases.length}] Starting sync for codebase: '${codebasePath}'`);

                try {
                    const pathExists = fs.existsSync(codebasePath);
                    logger.debug("SYNC-DEBUG", `Codebase path exists: ${pathExists}`);

                    if (!pathExists) {
                        logger.warn("SYNC-DEBUG", `Codebase path '${codebasePath}' no longer exists. Skipping sync.`);
                        continue;
                    }
                } catch (pathError: any) {
                    logger.error("SYNC-DEBUG", `Error checking codebase path '${codebasePath}':`, pathError);
                    continue;
                }

                try {
                    logger.debug("SYNC-DEBUG", `Calling context.reindexByChange() for '${codebasePath}'`);
                    const stats = await this.context.reindexByChange(codebasePath);
                    const codebaseElapsed = Date.now() - codebaseStartTime;

                    logger.debug("SYNC-DEBUG", `Reindex stats for '${codebasePath}':`, stats);
                    logger.debug("SYNC-DEBUG", `Codebase sync completed in ${codebaseElapsed}ms`);

                    totalStats.added += stats.added;
                    totalStats.removed += stats.removed;
                    totalStats.modified += stats.modified;

                    if (stats.added > 0 || stats.removed > 0 || stats.modified > 0) {
                        logger.info("SYNC", `Sync complete for '${codebasePath}'. Added: ${stats.added}, Removed: ${stats.removed}, Modified: ${stats.modified} (${codebaseElapsed}ms)`);
                    } else {
                        logger.debug("SYNC", `No changes detected for '${codebasePath}' (${codebaseElapsed}ms)`);
                    }
                } catch (error: any) {
                    const codebaseElapsed = Date.now() - codebaseStartTime;
                    logger.error("SYNC-DEBUG", `Error syncing codebase '${codebasePath}' after ${codebaseElapsed}ms:`, error);
                    logger.error("SYNC-DEBUG", `Error stack:`, error.stack);

                    if (error.message.includes('Failed to query Milvus')) {
                        await FileSynchronizer.deleteSnapshot(codebasePath);
                    }

                    if (error.code) {
                        logger.error("SYNC-DEBUG", `Error code: ${error.code}`);
                    }
                    if (error.errno) {
                        logger.error("SYNC-DEBUG", `Error errno: ${error.errno}`);
                    }
                }
            }

            const totalElapsed = Date.now() - syncStartTime;
            logger.debug("SYNC-DEBUG", `Total sync stats across all codebases: Added: ${totalStats.added}, Removed: ${totalStats.removed}, Modified: ${totalStats.modified}`);
            logger.debug("SYNC-DEBUG", `Index sync completed for all codebases in ${totalElapsed}ms`);
            logger.info("SYNC", `Index sync completed for all codebases. Total changes - Added: ${totalStats.added}, Removed: ${totalStats.removed}, Modified: ${totalStats.modified}`);
        } catch (error: any) {
            const totalElapsed = Date.now() - syncStartTime;
            logger.error("SYNC-DEBUG", `Error during index sync after ${totalElapsed}ms:`, error);
            logger.error("SYNC-DEBUG", `Error stack:`, error.stack);
        } finally {
            this.isSyncing = false;
            const totalElapsed = Date.now() - syncStartTime;
            logger.debug("SYNC-DEBUG", `handleSyncIndex() finished at ${new Date().toISOString()}, total duration: ${totalElapsed}ms`);
        }
    }

    public startBackgroundSync(): void {
        logger.debug("SYNC-DEBUG", "startBackgroundSync() called");

        logger.debug("SYNC-DEBUG", "Scheduling initial sync in 5 seconds...");
        setTimeout(async () => {
            logger.debug("SYNC-DEBUG", "Executing initial sync after server startup");
            try {
                await this.handleSyncIndex();
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                if (errorMessage.includes('Failed to query collection')) {
                    logger.debug("SYNC-DEBUG", "Collection not yet established, this is expected for new cluster users. Will retry on next sync cycle.");
                } else {
                    logger.error("SYNC-DEBUG", "Initial sync failed with unexpected error:", error);
                    throw error;
                }
            }
        }, 5000);

        logger.debug("SYNC-DEBUG", "Setting up periodic sync every 5 minutes (300000ms)");
        const syncInterval = setInterval(() => {
            logger.debug("SYNC-DEBUG", "Executing scheduled periodic sync");
            this.handleSyncIndex();
        }, 5 * 60 * 1000);

        logger.debug("SYNC-DEBUG", `Background sync setup complete. Interval ID: ${syncInterval}`);
    }
}