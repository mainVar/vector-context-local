import { envManager, logger } from "@zilliz/claude-context-core";

export interface ContextMcpConfig {
    name: string;
    version: string;
    // Embedding provider configuration
    embeddingProvider: 'OpenAI' | 'VoyageAI' | 'Gemini' | 'Ollama' | 'LMStudio';
    embeddingModel: string;
    // Provider-specific API keys
    openaiApiKey?: string;
    openaiBaseUrl?: string;
    voyageaiApiKey?: string;
    geminiApiKey?: string;
    geminiBaseUrl?: string;
    // Ollama configuration
    ollamaModel?: string;
    ollamaHost?: string;
    // LM Studio configuration
    lmStudioBaseUrl?: string;
    // Vector database configuration
    vectorStoreProvider: 'Milvus' | 'Qdrant';
    milvusAddress?: string; // Optional, can be auto-resolved from token
    milvusToken?: string;
    qdrantAddress?: string;
}

// ... (omitted V1/V2 for brevity if cleaner, but using context is better) ...

// Helper function to get default model for each provider
export function getDefaultModelForProvider(provider: string): string {
    switch (provider) {
        case 'OpenAI':
            return 'text-embedding-3-small';
        case 'VoyageAI':
            return 'voyage-code-3';
        case 'Gemini':
            return 'gemini-embedding-001';
        case 'Ollama':
            return 'nomic-embed-text';
        case 'LMStudio':
            return 'text-embedding-nomic-embed-text-v1.5';
        default:
            return 'text-embedding-3-small';
    }
}

// ...

export function createMcpConfig(): ContextMcpConfig {
    logger.debug("DEBUG", "🔍 Environment Variables Debug:");
    logger.debug("DEBUG", `  EMBEDDING_PROVIDER: ${envManager.get('EMBEDDING_PROVIDER') || 'NOT SET'}`);
    logger.debug("DEBUG", `  EMBEDDING_MODEL: ${envManager.get('EMBEDDING_MODEL') || 'NOT SET'}`);
    logger.debug("DEBUG", `  VECTOR_STORE_PROVIDER: ${envManager.get('VECTOR_STORE_PROVIDER') || 'NOT SET'}`);

    const config: ContextMcpConfig = {
        name: envManager.get('MCP_SERVER_NAME') || "Context MCP Server",
        version: envManager.get('MCP_SERVER_VERSION') || "1.0.0",
        // Embedding provider configuration
        embeddingProvider: (envManager.get('EMBEDDING_PROVIDER') as any) || 'LMStudio',
        embeddingModel: envManager.get('EMBEDDING_MODEL') || getDefaultModelForProvider(envManager.get('EMBEDDING_PROVIDER') || 'LMStudio'),
        // Provider-specific API keys
        openaiApiKey: envManager.get('OPENAI_API_KEY'),
        openaiBaseUrl: envManager.get('OPENAI_BASE_URL'),
        voyageaiApiKey: envManager.get('VOYAGEAI_API_KEY'),
        geminiApiKey: envManager.get('GEMINI_API_KEY'),
        geminiBaseUrl: envManager.get('GEMINI_BASE_URL'),
        // Ollama configuration
        ollamaModel: envManager.get('OLLAMA_MODEL'),
        ollamaHost: envManager.get('OLLAMA_HOST'),
        // LM Studio configuration
        lmStudioBaseUrl: envManager.get('LMSTUDIO_BASE_URL') || 'http://localhost:1234/v1',
        // Vector database configuration
        vectorStoreProvider: (envManager.get('VECTOR_STORE_PROVIDER') as any) || 'Qdrant',
        milvusAddress: envManager.get('MILVUS_ADDRESS'),
        milvusToken: envManager.get('MILVUS_TOKEN'),
        qdrantAddress: envManager.get('QDRANT_ADDRESS') || 'http://localhost:6333'
    };

    return config;
}

export function logConfigurationSummary(config: ContextMcpConfig): void {
    logger.info("MCP", "🚀 Starting Context MCP Server");
    logger.info("MCP", "Configuration Summary:");
    logger.info("MCP", `  Server: ${config.name} v${config.version}`);
    logger.info("MCP", `  Embedding Provider: ${config.embeddingProvider}`);
    logger.info("MCP", `  Embedding Model: ${config.embeddingModel}`);
    logger.debug("MCP", `  Milvus Address: ${config.milvusAddress || (config.milvusToken ? '[Auto-resolve from token]' : '[Not configured]')}`);

    switch (config.embeddingProvider) {
        case 'OpenAI':
            logger.info("MCP", `  OpenAI API Key: ${config.openaiApiKey ? '✅ Configured' : '❌ Missing'}`);
            if (config.openaiBaseUrl) {
                logger.debug("MCP", `  OpenAI Base URL: ${config.openaiBaseUrl}`);
            }
            break;
        case 'VoyageAI':
            logger.info("MCP", `  VoyageAI API Key: ${config.voyageaiApiKey ? '✅ Configured' : '❌ Missing'}`);
            break;
        case 'Gemini':
            logger.info("MCP", `  Gemini API Key: ${config.geminiApiKey ? '✅ Configured' : '❌ Missing'}`);
            if (config.geminiBaseUrl) {
                logger.debug("MCP", `  Gemini Base URL: ${config.geminiBaseUrl}`);
            }
            break;
        case 'Ollama':
            logger.info("MCP", `  Ollama Host: ${config.ollamaHost || 'http://127.0.0.1:11434'}`);
            logger.info("MCP", `  Ollama Model: ${config.embeddingModel}`);
            break;
        case 'LMStudio':
            logger.info("MCP", `  LM Studio Base URL: ${config.lmStudioBaseUrl}`);
            break;
    }

    logger.info("MCP", `  Vector Store: ${config.vectorStoreProvider}`);
    if (config.vectorStoreProvider === 'Qdrant') {
        logger.debug("MCP", `  Qdrant Address: ${config.qdrantAddress}`);
    }

    logger.debug("MCP", "🔧 Initializing server components...");
}

export function showHelpMessage(): void {
    console.log(`
Context MCP Server

Usage: npx @zilliz/claude-context-mcp@latest [options]

Options:
  --help, -h                          Show this help message

Environment Variables:
  MCP_SERVER_NAME         Server name
  MCP_SERVER_VERSION      Server version
  
  Embedding Provider Configuration:
  EMBEDDING_PROVIDER      Embedding provider: OpenAI, VoyageAI, Gemini, Ollama, LMStudio (default: OpenAI)
  EMBEDDING_MODEL         Embedding model name (works for all providers)
  
  Provider-specific API Keys:
  OPENAI_API_KEY          OpenAI API key (required for OpenAI provider)
  OPENAI_BASE_URL         OpenAI API base URL (optional, for custom endpoints)
  VOYAGEAI_API_KEY        VoyageAI API key (required for VoyageAI provider)
  GEMINI_API_KEY          Google AI API key (required for Gemini provider)
  GEMINI_BASE_URL         Gemini API base URL (optional, for custom endpoints)
  
  Ollama Configuration:
  OLLAMA_HOST             Ollama server host (default: http://127.0.0.1:11434)
  OLLAMA_MODEL            Ollama model name (alternative to EMBEDDING_MODEL for Ollama)

  LM Studio Configuration:
  LMSTUDIO_BASE_URL       LM Studio server URL (default: http://localhost:1234/v1)
  
  Vector Database Configuration:
  VECTOR_STORE_PROVIDER   Vector store provider: Milvus, Qdrant (default: Milvus)
  MILVUS_ADDRESS          Milvus address (optional, can be auto-resolved from token)
  MILVUS_TOKEN            Milvus token (optional, used for authentication and address resolution)
  QDRANT_ADDRESS          Qdrant address (default: http://localhost:6333)

Examples:
  # Start MCP server with OpenAI (default) and explicit Milvus address
  OPENAI_API_KEY=sk-xxx MILVUS_ADDRESS=localhost:19530 npx @zilliz/claude-context-mcp@latest
  
  # Start MCP server with LM Studio and Qdrant
  EMBEDDING_PROVIDER=LMStudio VECTOR_STORE_PROVIDER=Qdrant npx @zilliz/claude-context-mcp@latest
        `);
}

// Snapshot types
export type CodebaseSnapshot = CodebaseSnapshotV1 | CodebaseSnapshotV2;

export interface CodebaseSnapshotV1 {
    indexedCodebases: string[];
    indexingCodebases: string[] | Record<string, number>; // Legacy string[] or new Record format
}

export interface CodebaseSnapshotV2 {
    formatVersion: 'v2';
    codebases: Record<string, CodebaseInfo>;
    lastUpdated: string;
}

export type CodebaseInfo = CodebaseInfoIndexing | CodebaseInfoIndexed | CodebaseInfoIndexFailed;

export interface CodebaseInfoBase {
    lastUpdated: string;
}

export interface CodebaseInfoIndexing extends CodebaseInfoBase {
    status: 'indexing';
    indexingPercentage: number;
}

export interface CodebaseInfoIndexed extends CodebaseInfoBase {
    status: 'indexed';
    indexedFiles: number;
    totalChunks: number;
    indexStatus: 'completed' | 'limit_reached';
}

export interface CodebaseInfoIndexFailed extends CodebaseInfoBase {
    status: 'indexfailed';
    errorMessage: string;
    lastAttemptedPercentage?: number;
} 