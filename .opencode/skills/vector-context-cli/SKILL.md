---
name: vector-context-cli
description: Semantic code search via vctx CLI. Index codebases and search by meaning using vector embeddings. No MCP server needed.
---

## What I do

- Index codebases for semantic search using vector embeddings
- Search code by meaning, not just keywords
- Manage project configurations and presets
- Watch for file changes and auto-reindex

## When to use me

Use this skill when you need to:

- Search code by meaning/semantics (not just keywords)
- Index a project for vector search
- Manage project configurations and presets
- Check indexing status

## Prerequisites

Before using vctx commands, check prerequisites by running:

```bash
vctx status
```

If not ready, ask the user to ensure:

- **Qdrant** vector database is running: `docker run -p 6333:6333 qdrant/qdrant`
- **LM Studio** is running with an embedding model loaded (default: `http://localhost:1234/v1`)

## Commands Reference

### Project Management

| Command | Description | Example |
|---------|-------------|---------|
| `vctx add <path>` | Add project to config | `vctx add ./my-project --preset node` |
| `vctx remove <path>` | Remove project | `vctx remove ./my-project` |
| `vctx list` | List all projects | `vctx list` |
| `vctx preset <path> [name]` | Set/view preset | `vctx preset ./my-project unity` |
| `vctx presets` | List available presets | `vctx presets` |

### Indexing

| Command | Description | Example |
|---------|-------------|---------|
| `vctx index [path]` | Index project(s) | `vctx index ./my-project` |
| `vctx index --force` | Force re-index | `vctx index ./my-project --force` |
| `vctx status [path]` | Show indexing status | `vctx status` |

### Ignore Patterns

| Command | Description | Example |
|---------|-------------|---------|
| `vctx ignore <path> add <pattern>` | Add ignore pattern | `vctx ignore ./my-project add "*.test.ts"` |
| `vctx ignore <path> remove <pattern>` | Remove pattern | `vctx ignore ./my-project remove "*.test.ts"` |
| `vctx ignore <path> list --all` | List all patterns | `vctx ignore ./my-project list --all` |

## Available Presets

| Preset | Use Case |
|--------|----------|
| `unreal` | Unreal Engine 5 / C++ game development |
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
vctx add ./my-project --preset node
vctx index ./my-project
vctx status ./my-project
```

### 2. Search Code

After indexing, search using the MCP server or CLI:

```bash
vctx search ./my-project "function that handles user authentication"
```

### 3. Add Custom Ignore Patterns

```bash
vctx ignore ./my-project add "Library/**"
vctx ignore ./my-project add "*.generated.ts"
vctx ignore ./my-project list --all
```

### 4. Watch Mode for Auto-Reindexing

```bash
vctx watch ./my-project
```

## Tips for AI Agents

1. **Always check prerequisites**: Ensure Qdrant and LM Studio are running before indexing
2. **Use appropriate presets**: Match the preset to the project type for optimal ignore patterns
3. **Check status before searching**: Use `vctx status` to verify indexing is complete
4. **Use absolute paths**: When in doubt, use absolute paths for reliability
5. **Force reindex if needed**: Use `--force` if search results seem stale

## Configuration Files

- **Projects config**: `~/.context/projects.json`
- **Global ignore**: `~/.context/.contextignore`
- **Merkle snapshots**: `~/.context/merkle/`

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Connection error" | Ensure LM Studio is running on port 1234 |
| "Qdrant connection failed" | Start Qdrant: `docker run -p 6333:6333 qdrant/qdrant` |
| "Project not found" | Add project first: `vctx add <path>` |
| "Not indexed" | Run indexing: `vctx index <path>` |
