# @zilliz/claude-context-mcp

Model Context Protocol (MCP) server for Vector Context (Local). Optimized for local execution, privacy, and Windows stability.

> 📖 **New to the project?** Check out the [main project README](../../README.md) for an overview and local quick start guide.

## 🚀 Local MCP Setup

This server is designed to work with **LM Studio** and **Qdrant** for a completely local, private coding assistant experience.

### Local Environment Variables

To run the MCP server locally, you typically need to set the following environment variables:

```bash
# Core Local Setup
EMBEDDING_PROVIDER=LMStudio
EMBEDDING_MODEL=nomic-embed-text
LMSTUDIO_BASE_URL=http://localhost:1234/v1

VECTOR_STORE_PROVIDER=Qdrant
QDRANT_ADDRESS=http://localhost:6333

# Optional: Windows Stability
# (Automatic fixes for drive letter casing and path escaping are built-in)
```

### Configuration Examples

#### Claude Desktop
Add to your Claude Desktop configuration (`%APPDATA%\Claude\claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "vector-context": {
      "command": "npx",
      "args": ["-y", "@zilliz/claude-context-mcp@latest"],
      "env": {
        "EMBEDDING_PROVIDER": "LMStudio",
        "EMBEDDING_MODEL": "nomic-embed-text",
        "LMSTUDIO_BASE_URL": "http://localhost:1234/v1",
        "VECTOR_STORE_PROVIDER": "Qdrant",
        "QDRANT_ADDRESS": "http://localhost:6333"
      }
    }
  }
}
```

#### Cursor
Go to: `Settings` -> `Cursor Settings` -> `MCP` -> `Add new global MCP server`

```json
{
  "mcpServers": {
    "vector-context": {
      "command": "npx",
      "args": ["-y", "@zilliz/claude-context-mcp@latest"],
      "env": {
        "EMBEDDING_PROVIDER": "LMStudio",
        "EMBEDDING_MODEL": "nomic-embed-text",
        "LMSTUDIO_BASE_URL": "http://localhost:1234/v1",
        "VECTOR_STORE_PROVIDER": "Qdrant",
        "QDRANT_ADDRESS": "http://localhost:6333"
      }
    }
  }
}
```

## Features

- 🔌 **MCP Compliance**: Full compatibility with MCP-enabled AI assistants.
- 🔍 **Hybrid Search**: Natural language queries using dense vectors and BM25.
- 🔄 **Incremental Sync**: Uses Merkle trees to detect changes and only re-index modified files.
- 🪟 **Windows Optimized**: Stable path handling for Windows environments.
- ⚡ **Local First**: Native support for LM Studio and Qdrant.

## Available Tools

### 1. `index_codebase`
Index a codebase directory for hybrid search.

- `path` (required): Absolute path to the codebase directory.
- `force` (optional): Force re-indexing even if already indexed.
- `splitter` (optional): 'ast' (default) or 'langchain'.

### 2. `search_code`
Search the indexed codebase using natural language.

- `path` (required): Absolute path to the codebase.
- `query` (required): Search query.
- `limit` (optional): Max results (default 10).

### 3. `clear_index`
Clear the search index for a specific codebase.

### 4. `get_indexing_status`
Get progress/completion status for a codebase.

## Contributing
This package is part of the Vector Context monorepo. Please see the [Main Contributing Guide](../../CONTRIBUTING.md) for general guidelines.

## License
MIT - See [LICENSE](../../LICENSE) for details.
