# Project Guidelines

<!-- vctx -->
## Vector Context CLI (vctx)

Semantic code search tool powered by vector embeddings. Use `vctx` CLI commands for indexing and searching codebases.

### Quick Reference

- `vctx add . --preset <name>` - Add current project
- `vctx index .` - Index the project
- `vctx status` - Check indexing status
- `vctx watch .` - Watch and auto-reindex on changes

### Available Presets

`node`, `python`, `unity`, `rust`, `go`, `java`, `web`, `minimal`

### Prerequisites

- **Qdrant**: `docker run -p 6333:6333 qdrant/qdrant`
- **LM Studio**: Running with embedding model loaded at `http://localhost:1234/v1`

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `EMBEDDING_PROVIDER` | `LMStudio` | Embedding provider |
| `EMBEDDING_MODEL` | - | Model name; selectable via `vctx` → `[s]` Settings |
| `INDEXING_SPEED` | `medium` | Load preset: `low` / `medium` / `max`; selectable via `vctx` → `[s]` Settings |
| `LMSTUDIO_BASE_URL` | `http://localhost:1234/v1` | LM Studio server URL |
| `VECTOR_STORE_PROVIDER` | `Qdrant` | Vector DB provider |
| `QDRANT_ADDRESS` | `http://localhost:6333` | Qdrant address |

### Workflow

1. Add project: `vctx add . --preset node`
2. Index: `vctx index .`
3. Check: `vctx status`
4. Search via MCP or CLI

For full documentation, load the `vector-context-cli` skill.
<!-- /vctx -->
