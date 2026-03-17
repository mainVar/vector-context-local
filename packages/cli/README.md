# @vector-context/cli

CLI tool for managing project indexing with an interactive TUI interface.

## Installation

```bash
npm install @vector-context/cli
```

Or in monorepo:
```bash
pnpm install
```

## Usage

### Interactive Mode (TUI)

```bash
vctx
# or
vctx interactive
# or
vctx i
```

### CLI Commands

#### Add Project

```bash
vctx add <path> [options]
```

Options:
- `--preset <name>` - Preset (unity, node, python, rust, go, java, web, minimal)
- `--name <name>` - Custom project name
- `--ignore <pattern>` - Add ignore pattern (can be used multiple times)
- `--extensions <ext>` - Add file extensions
- `--disabled` - Add as disabled

Examples:
```bash
vctx add ./my-project
vctx add ./unity-game --preset unity
vctx add ./api --preset node --ignore "*.test.ts" --ignore "coverage/**"
```

#### Remove Project

```bash
vctx remove <path>
```

#### List Projects

```bash
vctx list [options]
```

Options:
- `--enabled` - Show only enabled
- `--disabled` - Show only disabled

#### Indexing

```bash
vctx index [path] [options]
```

Options:
- `--force` - Force re-indexing
- `--verbose` - Verbose output

If path is not specified, all enabled projects are indexed.

#### Status

```bash
vctx status [path]
```

#### Manage Ignore Patterns

```bash
vctx ignore <path> <action> [pattern]
```

Actions:
- `add <pattern>` - Add pattern
- `remove <pattern>` - Remove pattern
- `list` - Show all patterns

Options:
- `--all` - Show all effective patterns

Examples:
```bash
vctx ignore ./my-project add "Library/**"
vctx ignore ./my-project remove "Library/**"
vctx ignore ./my-project list --all
```

#### Manage Presets

```bash
vctx preset <path> [name]
vctx presets
```

Examples:
```bash
vctx preset ./my-project        # Show current preset
vctx preset ./my-project unity  # Change to unity
vctx presets                    # List all presets
```

## Presets

| Preset | Description |
|--------|-------------|
| `unity` | Unity game development |
| `node` | Node.js / JavaScript / TypeScript |
| `python` | Python projects |
| `rust` | Rust projects |
| `go` | Go projects |
| `java` | Java / JVM projects |
| `web` | Frontend (React, Vue, Svelte) |
| `minimal` | Minimal ignore patterns |

### Unity Preset

```js
ignorePatterns: [
  'Library/**', 'Temp/**', 'Build/**', 'Logs/**',
  'obj/**', '*.csproj', '*.unityproj', '*.sln',
  '.vs/**', 'Assets/Plugins/Editor/**',
  'ProjectSettings/**', 'UserSettings/**',
  '*.apk', '*.aab', '*.exe', '*.app',
]
extensions: ['.cs', '.shader', '.cginc', '.hlsl', '.glsl', '.compute', '.unity', '.prefab', '.asset', '.asmdef']
```

### Node.js Preset

```js
ignorePatterns: [
  'node_modules/**', 'dist/**', 'build/**', 'out/**',
  '.next/**', '.nuxt/**', 'coverage/**', '.nyc_output/**',
  '*.min.js', '*.min.css', '*.bundle.js', '*.chunk.js',
  '*.log', '.env', '.env.*', '*.local',
]
extensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '.md']
```

## Configuration

### Configuration File

`~/.context/projects.json`

```json
{
  "version": "1.0",
  "projects": {
    "D:\\Projects\\my-project": {
      "name": "my-project",
      "path": "D:\\Projects\\my-project",
      "addedAt": "2026-03-14T10:00:00Z",
      "preset": "node",
      "customIgnore": ["*.test.ts"],
      "customExtensions": [],
      "enabled": true,
      "lastIndexed": "2026-03-14T12:00:00Z"
    }
  }
}
```

### Global Ignore File

`~/.context/.contextignore`

```
# Global ignore patterns
.DS_Store
Thumbs.db
*.log
```

### Ignore Patterns Priority

1. Preset patterns
2. `customIgnore` from project config
3. Global `~/.context/.contextignore`
4. `.gitignore` in project

## TUI Interface

```
╔════════════════════════════════════════════════════════════╗
║  Vector Context CLI - Project Manager                       ║
╠════════════════════════════════════════════════════════════╣
║                                                             ║
║  Projects:                                        [a] Add   ║
║                                                             ║
║  ● my-unity-game          indexed    234 files    [e] Edit ║
║  ○ vector-context-local   indexing  45% ████░░    [r] Remove║
║  ○ another-project        waiting                 [i] Index ║
║                                                             ║
║  ─────────────────────────────────────────────────────────  ║
║  Selected: my-unity-game                                    ║
║  Preset: unity                                              ║
║  Custom ignores: 2 patterns                                 ║
║                                                             ║
╚════════════════════════════════════════════════════════════╝
```

### TUI Keys

| Key | Action |
|---------|-----|
| `↑` / `↓` | Navigate list |
| `a` | Add project |
| `r` | Remove selected project |
| `i` | Index selected project |
| `e` | Edit project |
| `p` | Select preset for project |
| `l` | Refresh list |
| `q` / `Esc` | Quit |

### Presets Screen

| Key | Action |
|---------|-----|
| `↑` / `↓` | Navigate presets list |
| `Enter` | Apply selected preset |
| `Esc` | Cancel |

## Environment Variables

CLI uses the same variables as the core package:

| Variable | Description | Default |
|--------|------|------------------|
| `EMBEDDING_PROVIDER` | Embedding provider | `LMStudio` |
| `EMBEDDING_MODEL` | Model for embeddings | - |
| `VECTOR_STORE_PROVIDER` | Vector DB provider | `Qdrant` |
| `QDRANT_ADDRESS` | Qdrant address | `http://localhost:6333` |
| `MILVUS_ADDRESS` | Milvus address | - |
| `OPENAI_API_KEY` | OpenAI API key | - |
| `VOYAGEAI_API_KEY` | Voyage AI key | - |
| `GEMINI_API_KEY` | Gemini API key | - |
| `LMSTUDIO_BASE_URL` | LM Studio URL | `http://localhost:1234/v1` |
| `OLLAMA_HOST` | Ollama host | `http://127.0.0.1:11434` |

## Development

```bash
# Build
pnpm build

# Development mode
pnpm dev

# Run
pnpm start
```

## License

MIT
