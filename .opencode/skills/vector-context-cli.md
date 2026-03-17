# Vector Context CLI (vctx) - Semantic Code Search Tool

A CLI tool for indexing codebases and performing semantic search using vector embeddings. Use this tool to search code by meaning, not just keywords.

## Prerequisites

Before using this tool, ensure:
- **Qdrant** vector database is running: `docker run -p 6333:6333 qdrant/qdrant`
- **LM Studio** is running with an embedding model loaded (default: `http://localhost:1234/v1`)

## CLI Location

```
packages/vector-context-cli/dist/index.js
```

Run with: `node packages/vector-context-cli/dist/index.js <command>`

Or alias: `vctx <command>`

## Commands Reference

### Project Management

| Command | Description | Example |
|---------|-------------|---------|
| `add <path>` | Add project to config | `vctx add ./my-project --preset node` |
| `remove <path>` | Remove project | `vctx remove ./my-project` |
| `list` | List all projects | `vctx list` |
| `preset <path> [name]` | Set/view preset | `vctx preset ./my-project unity` |
| `presets` | List available presets | `vctx presets` |

### Indexing

| Command | Description | Example |
|---------|-------------|---------|
| `index [path]` | Index project(s) | `vctx index ./my-project` |
| `index --force` | Force re-index | `vctx index ./my-project --force` |
| `status [path]` | Show indexing status | `vctx status` |

### Ignore Patterns

| Command | Description | Example |
|---------|-------------|---------|
| `ignore <path> add <pattern>` | Add ignore pattern | `vctx ignore ./my-project add "*.test.ts"` |
| `ignore <path> remove <pattern>` | Remove pattern | `vctx ignore ./my-project remove "*.test.ts"` |
| `ignore <path> list --all` | List all patterns | `vctx ignore ./my-project list --all` |

### Interactive Mode

| Command | Description |
|---------|-------------|
| `vctx` or `vctx i` | Launch interactive TUI |

## Available Presets

| Preset | Use Case |
|--------|----------|
| `unity` | Unity/C# game development |
| `node` | Node.js, TypeScript, JavaScript |
| `python` | Python projects |
| `rust` | Rust projects |
| `go` | Go projects |
| `java` | Java/Kotlin/JVM |
| `web` | Frontend (React, Vue, Svelte) |
| `minimal` | Minimal ignore patterns |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `EMBEDDING_PROVIDER` | `LMStudio` | Provider: LMStudio, Ollama, OpenAI |
| `EMBEDDING_MODEL` | - | Model name for embeddings |
| `LMSTUDIO_BASE_URL` | `http://localhost:1234/v1` | LM Studio server URL |
| `OLLAMA_HOST` | `http://127.0.0.1:11434` | Ollama host |
| `OPENAI_API_KEY` | - | OpenAI API key |
| `VECTOR_STORE_PROVIDER` | `Qdrant` | Vector DB provider |
| `QDRANT_ADDRESS` | `http://localhost:6333` | Qdrant server URL |

## Common Workflows

### 1. Add and Index a New Project

```bash
# Add project with appropriate preset
vctx add ./my-project --preset node

# Index the project
vctx index ./my-project

# Check status
vctx status ./my-project
```

### 2. Search Code (via MCP)

After indexing, use the MCP server to search:

```json
{
  "tool": "search_code",
  "arguments": {
    "path": "/absolute/path/to/my-project",
    "query": "function that handles user authentication",
    "limit": 10
  }
}
```

### 3. Add Custom Ignore Patterns

```bash
# Add patterns to exclude from indexing
vctx ignore ./my-project add "Library/**"
vctx ignore ./my-project add "*.generated.ts"
vctx ignore ./my-project add "coverage/**"

# Verify patterns
vctx ignore ./my-project list --all
```

### 4. Watch Mode for Auto-Reindexing

```bash
# Watch for file changes and auto-reindex
vctx watch ./my-project
```

## Configuration Files

- **Projects config**: `~/.context/projects.json`
- **Global ignore**: `~/.context/.contextignore`
- **Merkle snapshots**: `~/.context/merkle/`

## MCP Integration

The MCP server (`packages/mcp/dist/index.js`) provides these tools:

| Tool | Description |
|------|-------------|
| `index_codebase` | Index a codebase |
| `search_code` | Semantic search |
| `clear_index` | Clear index |
| `get_indexing_status` | Get status |

### MCP Config Example

```json
{
  "mcpServers": {
    "vector-context": {
      "command": "node",
      "args": ["D:/Projects/vector-context-local/packages/mcp/dist/index.js"],
      "env": {
        "EMBEDDING_PROVIDER": "LMStudio",
        "LMSTUDIO_BASE_URL": "http://localhost:1234/v1",
        "VECTOR_STORE_PROVIDER": "Qdrant",
        "QDRANT_ADDRESS": "http://localhost:6333"
      }
    }
  }
}
```

## Tips for AI Agents

1. **Always check prerequisites**: Ensure Qdrant and LM Studio are running before indexing
2. **Use appropriate presets**: Match the preset to the project type for optimal ignore patterns
3. **Check status before searching**: Use `vctx status` to verify indexing is complete
4. **Use absolute paths**: When in doubt, use absolute paths for reliability
5. **Force reindex if needed**: Use `--force` if search results seem stale

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Connection error" | Ensure LM Studio is running on port 1234 |
| "Qdrant connection failed" | Start Qdrant: `docker run -p 6333:6333 qdrant/qdrant` |
| "Project not found" | Add project first: `vctx add <path>` |
| "Not indexed" | Run indexing: `vctx index <path>` |
