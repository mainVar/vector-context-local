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

### Prerequisites

1.  **Run Qdrant with Docker:**
    ```bash
    docker run -p 6333:6333 -p 6334:6334 \
        -v $(pwd)/qdrant_storage:/qdrant/storage:z \
        qdrant/qdrant
    ```

2.  **Run LM Studio:**
    - Download and install [LM Studio](https://lmstudio.ai/).
    - Load an embedding model (e.g., `nomic-embed-text`).
    - Start the Local Inference Server (default port 1234).

### Configure MCP for Claude Code

Add the server to your Claude configuration:

```bash
claude mcp add claude-context \
  -e EMBEDDING_PROVIDER=LMStudio \
  -e EMBEDDING_MODEL=nomic-embed-text \
  -e LMSTUDIO_BASE_URL=http://localhost:1234/v1 \
  -e VECTOR_STORE_PROVIDER=Qdrant \
  -e QDRANT_ADDRESS=http://localhost:6333 \
  -- npx @zilliz/claude-context-mcp@latest
```

---

## 🛠️ Usage

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

- 🔍 **Hybrid Code Search**: Combines BM25 and dense vector search for high-precision retrieval.
- ⚡ **Incremental Indexing**: Efficiently re-index only changed files using Merkle trees.
- 🧩 **Intelligent Code Chunking**: Analyzes code using Abstract Syntax Trees (AST) for meaningful boundaries.
- 🛠️ **Cross-Platform**: Fully optimized for Windows stability.

### Supported Technologies

- **Embedding Providers**: [LM Studio](https://lmstudio.ai), [Ollama](https://ollama.ai), [OpenAI](https://openai.com)
- **Vector Databases**: [Qdrant](https://qdrant.tech), [Milvus](https://milvus.io)
- **Languages**: TypeScript, JavaScript, Python, Java, C++, C#, Go, Rust, PHP, Ruby, Swift, Kotlin, Scala, Markdown

---

## 💻 Development

### Setup

```bash
# Clone repository
git clone https://github.com/zilliztech/claude-context.git
cd claude-context

# Install dependencies (pnpm recommended)
pnpm install

# Build all packages
pnpm build
```

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🔗 Credits
This project is based on the original [claude-context](https://github.com/zilliztech/claude-context) repository by Zilliz.
