# @vector-context/core

The core indexing engine for Vector Context (Local) - a powerful tool for semantic search and analysis of codebases using vector embeddings and AI, optimized for local execution and Windows stability.

> 📖 **New to the project?** Check out the [main project README](../../README.md) for an overview and local quick start guide.

## Installation

```bash
npm install @vector-context/core
```

## Quick Start (Local Setup)

This package supports strictly local workflows using **LM Studio** for embeddings and **Qdrant** for vector storage.

```typescript
import { Context, QdrantVectorDB, LMStudioEmbedding } from '@vector-context/core';

// 1. Initialize with LM Studio (local embeddings)
const lmStudioEmbedding = new LMStudioEmbedding({
  baseURL: 'http://localhost:1234/v1',
  model: 'nomic-embed-text' // or your preferred model
});

// 2. Initialize Qdrant (local vector store)
const qdrantVectorDB = new QdrantVectorDB('http://localhost:6333');

// 3. Create context instance
const context = new Context({
  embedding: lmStudioEmbedding,
  vectorDatabase: qdrantVectorDB
});

// 4. Index a codebase
const stats = await context.indexCodebase('./my-project', (progress) => {
  console.log(`${progress.phase} - ${progress.percentage}%`);
});

console.log(`Indexed ${stats.indexedFiles} files with ${stats.totalChunks} chunks`);

// 5. Search the codebase
const results = await context.semanticSearch(
  './my-project',
  'function that handles user authentication',
  5
);

results.forEach(result => {
  console.log(`${result.relativePath}:${result.startLine}-${result.endLine} (Score: ${result.score})`);
});
```

## Features

- **Multi-language Support**: Index TypeScript, JavaScript, Python, Java, C++, and many other languages.
- **Semantic Search**: Find code using natural language queries powered by AI embeddings.
- **Deterministic ID Generation**: Content-based UUID v4 generation ensures idempotent indexing (avoids duplicates).
- **Windows Optimized**: Built-in support for Windows path normalization (lowercased drive letters) and path escaping.
- **Incremental File Synchronization**: Efficient change detection using Merkle trees to only re-index modified files.
- **Smart Chunking**: Intelligent code splitting using Abstract Syntax Trees (AST).

## Supported Technologies

- **Embedding Providers**: [LM Studio](https://lmstudio.ai), [Ollama](https://ollama.ai), [OpenAI](https://openai.com), [VoyageAI](https://voyageai.com), [Gemini](https://gemini.google.com)
- **Vector Databases**: [Qdrant](https://qdrant.tech), [Milvus/Zilliz Cloud](https://milvus.io)
- **Code Splitters**: AST-based code splitting (default), LangChain character-based splitter.

## API Reference

### Context

#### Methods

- `indexCodebase(path, progressCallback?, forceReindex?)` - Index an entire codebase.
- `reindexByChange(path, progressCallback?)` - Incrementally re-index only changed files.
- `semanticSearch(path, query, topK?, threshold?, filterExpr?)` - Search indexed code semantically.
- `hasIndex(path)` - Check if codebase is already indexed.
- `clearIndex(path, progressCallback?)` - Remove index for a codebase.
- `updateIgnorePatterns(patterns)` - Update ignore patterns.
- `addCustomIgnorePatterns(patterns)` - Add custom ignore patterns.
- `addCustomExtensions(extensions)` - Add custom file extensions.
- `updateEmbedding(embedding)` - Switch embedding provider.
- `updateVectorDatabase(vectorDB)` - Switch vector database.
- `updateSplitter(splitter)` - Switch code splitter.

### Search Results

```typescript
interface SemanticSearchResult {
  content: string;      // Code content
  relativePath: string; // File path relative to codebase root
  startLine: number;    // Starting line number
  endLine: number;      // Ending line number
  language: string;     // Programming language
  score: number;        // Similarity score (0-1)
}
```

## File Synchronization Architecture

Vector Context implements an intelligent file synchronization system that efficiently tracks and processes only the files that have changed since the last indexing operation.

1. **File Hashing**: Each file is hashed using SHA-256 based on content.
2. **Merkle Trees**: All file hashes are organized into a Merkle tree structure for fast global change detection.
3. **Snapshot Management**: State is persisted to `~/.context/merkle/` for cross-session consistency.
4. **Change Classification**: Detects Added, Modified, and Removed files automatically.
5. **Incremental Updates**: Only processes changes, minimizing vector database operations.

## Contributing

This package is part of the Vector Context monorepo. Please see the [Main Contributing Guide](../../CONTRIBUTING.md) for general guidelines.

## License

MIT - See [LICENSE](../../LICENSE) for details.