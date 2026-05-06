#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    ListToolsRequestSchema,
    CallToolRequestSchema
} from "@modelcontextprotocol/sdk/types.js";
import { Context, MilvusVectorDatabase, QdrantVectorDB, logger } from "@vector-context/core";

import { createMcpConfig, logConfigurationSummary, showHelpMessage, ContextMcpConfig } from "./config.js";
import { createEmbeddingInstance, logEmbeddingProviderInfo } from "./embedding.js";
import { SnapshotManager } from "./snapshot.js";
import { SyncManager } from "./sync.js";
import { ToolHandlers, IndexCodebaseArgs, SearchCodeArgs, ClearIndexArgs, GetIndexingStatusArgs } from "./handlers.js";

const _originalConsoleLog = console.log;
const _originalConsoleWarn = console.warn;
const _originalConsoleError = console.error;

console.log = (...args: any[]) => {
    process.stderr.write('[LOG] ' + args.join(' ') + '\n');
};

console.warn = (...args: any[]) => {
    process.stderr.write('[WARN] ' + args.join(' ') + '\n');
};

console.error = (...args: any[]) => {
    process.stderr.write('[ERROR] ' + args.join(' ') + '\n');
};

class ContextMcpServer {
    private server: Server;
    private context: Context;
    private snapshotManager: SnapshotManager;
    private syncManager: SyncManager;
    private toolHandlers: ToolHandlers;

    constructor(config: ContextMcpConfig) {
        this.server = new Server(
            {
                name: config.name,
                version: config.version
            },
            {
                capabilities: {
                    tools: {}
                }
            }
        );

        logger.debug("EMBEDDING", `Initializing embedding provider: ${config.embeddingProvider}`);
        logger.debug("EMBEDDING", `Using model: ${config.embeddingModel}`);

        const embedding = createEmbeddingInstance(config);
        logEmbeddingProviderInfo(config, embedding);

        let vectorDatabase;
        if (config.vectorStoreProvider === 'Qdrant') {
            logger.debug("VECTORDB", `🔧 Initializing Qdrant vector database at ${config.qdrantAddress}`);
            vectorDatabase = new QdrantVectorDB(config.qdrantAddress);
        } else {
            logger.debug("VECTORDB", "🔧 Initializing Milvus vector database");
            vectorDatabase = new MilvusVectorDatabase({
                address: config.milvusAddress,
                ...(config.milvusToken && { token: config.milvusToken })
            });
        }

        this.context = new Context({
            embedding,
            vectorDatabase
        });

        this.snapshotManager = new SnapshotManager();
        this.syncManager = new SyncManager(this.context, this.snapshotManager);
        this.toolHandlers = new ToolHandlers(this.context, this.snapshotManager);

        this.snapshotManager.loadCodebaseSnapshot();

        this.setupTools();
    }

    async dispose(): Promise<void> {
        logger.info("MCP", "Disposing MCP server resources...");
        await this.context.dispose();
        logger.info("MCP", "MCP server resources disposed.");
    }

    private setupTools() {
        const index_description = `
Index a codebase directory to enable semantic search using a configurable code splitter.

⚠️ **IMPORTANT**:
- You MUST provide an absolute path to the target codebase.

✨ **Usage Guidance**:
- This tool is typically used when search fails due to an unindexed codebase.
- If indexing is attempted on an already indexed path, and a conflict is detected, you MUST prompt the user to confirm whether to proceed with a force index (i.e., re-indexing and overwriting the previous index).
`;


        const search_description = `
Search the indexed codebase using natural language queries within a specified absolute path.

⚠️ **IMPORTANT**:
- You MUST provide an absolute path.

🎯 **When to Use**:
This tool is versatile and can be used before completing various tasks to retrieve relevant context:
- **Code search**: Find specific functions, classes, or implementations
- **Context-aware assistance**: Gather relevant code context before making changes
- **Issue identification**: Locate problematic code sections or bugs
- **Code review**: Understand existing implementations and patterns
- **Refactoring**: Find all related code pieces that need to be updated
- **Feature development**: Understand existing architecture and similar implementations
- **Duplicate detection**: Identify redundant or duplicated code patterns across the codebase

✨ **Usage Guidance**:
- If the codebase is not indexed, this tool will return a clear error message indicating that indexing is required first.
- You can then use the index_codebase tool to index the codebase before searching again.
`;

        // Define available tools
        this.server.setRequestHandler(ListToolsRequestSchema, async () => {
            return {
                tools: [
                    {
                        name: "index_codebase",
                        description: index_description,
                        inputSchema: {
                            type: "object",
                            properties: {
                                path: {
                                    type: "string",
                                    description: `ABSOLUTE path to the codebase directory to index.`
                                },
                                force: {
                                    type: "boolean",
                                    description: "Force re-indexing even if already indexed",
                                    default: false
                                },
                                splitter: {
                                    type: "string",
                                    description: "Code splitter to use: 'ast' for syntax-aware splitting with automatic fallback, 'langchain' for character-based splitting",
                                    enum: ["ast", "langchain"],
                                    default: "ast"
                                },
                                customExtensions: {
                                    type: "array",
                                    items: {
                                        type: "string"
                                    },
                                    description: "Optional: Additional file extensions to include beyond defaults (e.g., ['.vue', '.svelte', '.astro']). Extensions should include the dot prefix or will be automatically added",
                                    default: []
                                },
                                ignorePatterns: {
                                    type: "array",
                                    items: {
                                        type: "string"
                                    },
                                    description: "Optional: Additional ignore patterns to exclude specific files/directories beyond defaults. Only include this parameter if the user explicitly requests custom ignore patterns (e.g., ['static/**', '*.tmp', 'private/**'])",
                                    default: []
                                }
                            },
                            required: ["path"]
                        }
                    },
                    {
                        name: "search_code",
                        description: search_description,
                        inputSchema: {
                            type: "object",
                            properties: {
                                path: {
                                    type: "string",
                                    description: `ABSOLUTE path to the codebase directory to search in.`
                                },
                                query: {
                                    type: "string",
                                    description: "Natural language query to search for in the codebase"
                                },
                                limit: {
                                    type: "number",
                                    description: "Maximum number of results to return",
                                    default: 10,
                                    maximum: 50
                                },
                                extensionFilter: {
                                    type: "array",
                                    items: {
                                        type: "string"
                                    },
                                    description: "Optional: List of file extensions to filter results. (e.g., ['.ts','.py']).",
                                    default: []
                                }
                            },
                            required: ["path", "query"]
                        }
                    },
                    {
                        name: "clear_index",
                        description: `Clear the search index. IMPORTANT: You MUST provide an absolute path.`,
                        inputSchema: {
                            type: "object",
                            properties: {
                                path: {
                                    type: "string",
                                    description: `ABSOLUTE path to the codebase directory to clear.`
                                }
                            },
                            required: ["path"]
                        }
                    },
                    {
                        name: "get_indexing_status",
                        description: `Get the current indexing status of a codebase. Shows progress percentage for actively indexing codebases and completion status for indexed codebases.`,
                        inputSchema: {
                            type: "object",
                            properties: {
                                path: {
                                    type: "string",
                                    description: `ABSOLUTE path to the codebase directory to check status for.`
                                }
                            },
                            required: ["path"]
                        }
                    },
                ]
            };
        });

        // Handle tool execution
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;

            switch (name) {
                case "index_codebase":
                    return await this.toolHandlers.handleIndexCodebase(args as unknown as IndexCodebaseArgs);
                case "search_code":
                    return await this.toolHandlers.handleSearchCode(args as unknown as SearchCodeArgs);
                case "clear_index":
                    return await this.toolHandlers.handleClearIndex(args as unknown as ClearIndexArgs);
                case "get_indexing_status":
                    return await this.toolHandlers.handleGetIndexingStatus(args as unknown as GetIndexingStatusArgs);

                default:
                    throw new Error(`Unknown tool: ${name}`);
            }
        });
    }

    async start() {
        logger.debug("SYNC-DEBUG", "MCP server start() method called");
        logger.info("MCP", "Starting Context MCP server...");

        const transport = new StdioServerTransport();
        logger.debug("SYNC-DEBUG", "StdioServerTransport created, attempting server connection...");

        await this.server.connect(transport);
        logger.info("MCP", "MCP server started and listening on stdio.");
        logger.debug("SYNC-DEBUG", "Server connection established successfully");

        logger.debug("SYNC-DEBUG", "Initializing background sync...");
        this.syncManager.startBackgroundSync();
        logger.debug("SYNC-DEBUG", "MCP server initialization complete");
    }
}

let mcpServer: ContextMcpServer | null = null;

process.on('SIGINT', async () => {
    logger.error("SHUTDOWN", "Received SIGINT, shutting down gracefully...");
    if (mcpServer) {
        await mcpServer.dispose();
    }
    process.exit(0);
});

process.on('SIGTERM', async () => {
    logger.error("SHUTDOWN", "Received SIGTERM, shutting down gracefully...");
    if (mcpServer) {
        await mcpServer.dispose();
    }
    process.exit(0);
});

async function main() {
    const args = process.argv.slice(2);

    if (args.includes('--help') || args.includes('-h')) {
        showHelpMessage();
        process.exit(0);
    }

    const config = createMcpConfig();
    logConfigurationSummary(config);

    mcpServer = new ContextMcpServer(config);
    await mcpServer.start();
}

main().catch((error) => {
    logger.error("FATAL", "Fatal error:", error);
    process.exit(1);
});