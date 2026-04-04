# Vector Context (Local)

### Your entire codebase as Claude's context, optimized for local execution.

**Vector Context (Local)** is a privacy-focused fork of [Claude Context](https://github.com/zilliztech/claude-context) that adds robust support for local vector storage and embedding models. It is specifically optimized for Windows environments and strictly local workflows using Qdrant and LM Studio.

🧠 **Your Entire Codebase as Context**: Use semantic search to find all relevant code from millions of lines without uploading your data to third-party providers.

💰 **Privacy & Performance**: By using local Qdrant and LM Studio, your code never leaves your machine. This setup eliminates API costs and ensures high-performance retrieval even for large codebases.

---

## ✨ Local Enhancements

This version introduces several key improvements for local-first developer experience:

- 🏗️ **Local Qdrant Support**: Native integration with Qdrant for efficient local vector storage.
- 🧪 **LM Studio Integration**: Optimized embedding generation with batch throttling and auto-dimension detection.
- ⚡ **Deterministic ID Generation**: Uses content-based UUID v4 generation to ensure idempotent indexing and prevent duplicates.
- 🪟 **Windows Stability Fixes**: Normalized path handling (drive letter casing) and path escaping to ensure consistency across Windows environments.

---

## 🚀 Quick Start (Local Setup)

This guide walks you through setting up Vector Context from scratch using LM Studio for embeddings and Qdrant for vector storage — fully local, no API keys required.

### Step 1 — Start local infrastructure

**Qdrant** (vector database):
```bash
docker run -p 6333:6333 -p 6334:6334 \
    -v $(pwd)/qdrant_storage:/qdrant/storage:z \
    qdrant/qdrant
```

For a second instance (e.g. a different project or embedding dimension):
```bash
docker run -p 6335:6333 -p 6336:6334 `
    -v ${PWD}/qdrant_storage_v2:/qdrant/storage:z `
    qdrant/qdrant
```

**LM Studio** (local embeddings):
- Download and install [LM Studio](https://lmstudio.ai/).
- Load an embedding model (e.g., `nomic-embed-text`).
- Start the Local Inference Server (default port `1234`).

### Step 2 — Clone and build

Requires Node.js >= 20 and pnpm >= 10.

```bash
git clone --recurse-submodules https://github.com/mainVar/vector-context-local.git
cd vector-context-local
pnpm install
pnpm build
```

### Step 3 — Configure your MCP client

### MCP Server Configuration

Add the following to your MCP client configuration (e.g., Cursor, Claude Desktop, or Gemini):

```json
{
  "mcpServers": {
    "vector-context": {
      "command": "node",
      "args": [
        "/path/to/vector-context-local/packages/mcp/dist/index.js"
      ],
      "env": {
        "EMBEDDING_PROVIDER": "LMStudio",
        "EMBEDDING_MODEL": "text-embedding-nomic-embed-text-v1.5",
        "LMSTUDIO_BASE_URL": "http://localhost:1234/v1",
        "VECTOR_STORE_PROVIDER": "Qdrant",
        "QDRANT_ADDRESS": "http://localhost:6333"
      },
      "disabled": false
    }
  }
}
```

> Replace `/path/to/vector-context-local` with your actual clone path (e.g., `C:/Projects/vector-context-local` on Windows).

---

## 🖥️ CLI Tool (vctx)

The `@vector-context/cli` package provides a command-line interface for managing project indexing with an interactive TUI.

### Installation

After cloning and building the repo (see [Quick Start](#-quick-start-local-setup)), link the CLI globally:

```bash
# Build the CLI package
pnpm --filter @vector-context/cli build

# Make vctx available globally
cd packages/vector-context-cli
npm link
```

### Quick Start

```bash
# Initialize AI integration (creates skill file + AGENTS.md)
vctx init

# Interactive TUI mode
vctx

# Or use commands directly
vctx add ./my-project --preset node
vctx index ./my-project
vctx status
```

### Available Commands

| Command | Description |
|---------|-------------|
| `vctx init [path]` | Initialize AI integration (create SKILL.md + AGENTS.md) |
| `vctx` or `vctx interactive` | Launch interactive TUI |
| `vctx add <path>` | Add project to config |
| `vctx remove <path>` | Remove project |
| `vctx list` | List all projects |
| `vctx index [path]` | Index project(s) |
| `vctx status [path]` | Show indexing status |
| `vctx ignore <path> <add\|remove\|list> [pattern]` | Manage ignore patterns |
| `vctx preset <path> [name]` | Set or view preset |
| `vctx presets` | List available presets |

### Presets

| Preset | Description |
|--------|-------------|
| `unreal` | Unreal Engine 5 / C++ game development |
| `unity` | Unity game development |
| `node` | Node.js / TypeScript |
| `python` | Python projects |
| `rust` | Rust projects |
| `go` | Go projects |
| `java` | Java / JVM |
| `web` | Frontend (React, Vue, etc.) |
| `minimal` | Minimal ignore patterns |

### Examples

```bash
# Initialize AI integration in current project
vctx init

# Initialize only opencode skill file
vctx init --skill-only

# Force overwrite existing files
vctx init --force

# Add Unity project with custom ignore
vctx add ./my-game --preset unity --ignore "Assets/Plugins/**"

# Add Node.js project
vctx add ./api --preset node

# Index all enabled projects
vctx index

# Check status
vctx status ./my-game

# Manage ignore patterns
vctx ignore ./my-game add "*.test.ts"
vctx ignore ./my-game list --all
```

### TUI Interface

```
╔════════════════════════════════════════════════════════════╗
║  Vector Context CLI - Project Manager                       ║
╠════════════════════════════════════════════════════════════╣
║  Projects:                                        [a] Add   ║
║                                                             ║
║  ● my-game           indexed    234 files         [e] Edit ║
║  ○ api               indexing  45% ████░░         [r] Remove║
║  ○ web-app           waiting                      [i] Index ║
║                                                             ║
║  [p] Presets  [l] Refresh  [q] Quit                        ║
╚════════════════════════════════════════════════════════════╝
```

**TUI Keys:** `↑/↓` Navigate | `a` Add | `r` Remove | `i` Index | `e` Edit | `q` Quit

---

## 🤖 MCP Usage (Claude/Cursor)

1. **Open Claude Code**
   ```bash
   cd your-project-directory
   claude
   ```

2. **Index your codebase**:
   ```
   Index this codebase
   ```

3. **Check indexing status**:
   ```
   Check the indexing status
   ```

4. **Start searching**:
   ```
   Find functions that handle user authentication
   ```

---

## 🏗️ Architecture

### Packages

| Package | Description |
|---------|-------------|
| `@vector-context/core` | Core indexing engine with semantic search |
| `@vector-context/cli` | CLI tool with interactive TUI (`vctx`) |
| `@zilliz/claude-context-mcp` | MCP server for Claude/Cursor integration |
| `@zilliz/claude-context-chrome-extension` | Chrome extension for web indexing |
| `@zilliz/claude-context-vscode` | VS Code extension |

### Features

- 🔍 **Hybrid Code Search**: Combines BM25 and dense vector search for high-precision retrieval.
- ⚡ **Incremental Indexing**: Efficiently re-index only changed files using Merkle trees.
- 🧩 **Intelligent Code Chunking**: Analyzes code using Abstract Syntax Trees (AST) for meaningful boundaries.
- 🛠️ **Cross-Platform**: Fully optimized for Windows stability.
- 🖥️ **CLI & TUI**: Manage projects via command line or interactive interface.

### Supported Technologies

- **Embedding Providers**: [LM Studio](https://lmstudio.ai), [Ollama](https://ollama.ai), [OpenAI](https://openai.com)
- **Vector Databases**: [Qdrant](https://qdrant.tech), [Milvus](https://milvus.io)
- **Languages**: TypeScript, JavaScript, Python, Java, C++, C#, Go, Rust, PHP, Ruby, Swift, Kotlin, Scala, Markdown

---

## 💻 Development

### Setup

```bash
# Clone repository (with submodules)
git clone --recurse-submodules https://github.com/mainVar/vector-context-local.git
cd vector-context-local

# Install dependencies (pnpm recommended)
pnpm install

# Build all packages
pnpm build

# Run CLI
node packages/vector-context-cli/dist/index.js --help
```

### Build Specific Package

```bash
# Build CLI only
pnpm --filter @vector-context/cli build

# Build core only
pnpm --filter @vector-context/core build
```

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🔗 Credits
This project is based on the original [claude-context](https://github.com/zilliztech/claude-context) repository by Zilliz.
