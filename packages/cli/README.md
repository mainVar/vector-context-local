# @vector-context/cli

CLI інструмент для управління індексацією проектів з інтерактивним TUI інтерфейсом.

## Встановлення

```bash
npm install @vector-context/cli
```

Або в monorepo:
```bash
pnpm install
```

## Використання

### Інтерактивний режим (TUI)

```bash
vctx
# або
vctx interactive
# або
vctx i
```

### CLI команди

#### Додати проект

```bash
vctx add <path> [options]
```

Опції:
- `--preset <name>` - Пресет (unity, node, python, rust, go, java, web, minimal)
- `--name <name>` - Кастомна назва проекту
- `--ignore <pattern>` - Додати ignore pattern (можна використовувати кілька разів)
- `--extensions <ext>` - Додати розширення файлів
- `--disabled` - Додати як вимкнений

Приклади:
```bash
vctx add ./my-project
vctx add ./unity-game --preset unity
vctx add ./api --preset node --ignore "*.test.ts" --ignore "coverage/**"
```

#### Видалити проект

```bash
vctx remove <path>
```

#### Список проектів

```bash
vctx list [options]
```

Опції:
- `--enabled` - Показати тільки увімкнені
- `--disabled` - Показати тільки вимкнені

#### Індексація

```bash
vctx index [path] [options]
```

Опції:
- `--force` - Примусова переіндексація
- `--verbose` - Детальний вивід

Якщо шлях не вказано, індексуються всі увімкнені проекти.

#### Статус

```bash
vctx status [path]
```

#### Управління ignore patterns

```bash
vctx ignore <path> <action> [pattern]
```

Дії:
- `add <pattern>` - Додати pattern
- `remove <pattern>` - Видалити pattern
- `list` - Показати всі patterns

Опції:
- `--all` - Показати всі ефективні patterns

Приклади:
```bash
vctx ignore ./my-project add "Library/**"
vctx ignore ./my-project remove "Library/**"
vctx ignore ./my-project list --all
```

#### Управління пресетами

```bash
vctx preset <path> [name]
vctx presets
```

Приклади:
```bash
vctx preset ./my-project        # Показати поточний пресет
vctx preset ./my-project unity  # Змінити на unity
vctx presets                    # Список всіх пресетів
```

## Пресети

| Пресет | Опис |
|--------|------|
| `unity` | Unity game development |
| `node` | Node.js / JavaScript / TypeScript |
| `python` | Python проекти |
| `rust` | Rust проекти |
| `go` | Go проекти |
| `java` | Java / JVM проекти |
| `web` | Frontend (React, Vue, Svelte) |
| `minimal` | Мінімальний набір ignore patterns |

### Unity пресет

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

### Node.js пресет

```js
ignorePatterns: [
  'node_modules/**', 'dist/**', 'build/**', 'out/**',
  '.next/**', '.nuxt/**', 'coverage/**', '.nyc_output/**',
  '*.min.js', '*.min.css', '*.bundle.js', '*.chunk.js',
  '*.log', '.env', '.env.*', '*.local',
]
extensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '.md']
```

## Конфігурація

### Файл конфігурації

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

### Глобальний ignore файл

`~/.context/.contextignore`

```
# Глобальні ignore patterns
.DS_Store
Thumbs.db
*.log
```

### Ignore patterns пріоритет

1. Пресет patterns
2. `customIgnore` з конфігу проекту
3. Глобальний `~/.context/.contextignore`
4. `.gitignore` в проекті

## TUI Інтерфейс

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

### Клавіші TUI

| Клавіша | Дія |
|---------|-----|
| `↑` / `↓` | Навігація по списку |
| `a` | Додати проект |
| `r` | Видалити вибраний проект |
| `i` | Індексувати вибраний проект |
| `e` | Редагувати проект |
| `p` | Вибрати пресет для проекту |
| `l` | Оновити список |
| `q` / `Esc` | Вийти |

### Екран пресетів

| Клавіша | Дія |
|---------|-----|
| `↑` / `↓` | Навігація по списку пресетів |
| `Enter` | Застосувати вибраний пресет |
| `Esc` | Скасувати |

## Змінні середовища

CLI використовує ті ж змінні що і core пакет:

| Змінна | Опис | За замовчуванням |
|--------|------|------------------|
| `EMBEDDING_PROVIDER` | Провайдер ембедінгів | `LMStudio` |
| `EMBEDDING_MODEL` | Модель для ембедінгів | - |
| `VECTOR_STORE_PROVIDER` | Vector DB провайдер | `Qdrant` |
| `QDRANT_ADDRESS` | Адреса Qdrant | `http://localhost:6333` |
| `MILVUS_ADDRESS` | Адреса Milvus | - |
| `OPENAI_API_KEY` | OpenAI API ключ | - |
| `VOYAGEAI_API_KEY` | Voyage AI ключ | - |
| `GEMINI_API_KEY` | Gemini API ключ | - |
| `LMSTUDIO_BASE_URL` | LM Studio URL | `http://localhost:1234/v1` |
| `OLLAMA_HOST` | Ollama хост | `http://127.0.0.1:11434` |

## Розробка

```bash
# Збірка
pnpm build

# Режим розробки
pnpm dev

# Запуск
pnpm start
```

## Ліцензія

MIT
