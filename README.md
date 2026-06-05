# ChatMarks

<p align="center">
  <b>AI-powered bookmark search & organization for Chrome</b>
</p>

<p align="center">
  <a href="#features">Features</a> ·
  <a href="#installation">Installation</a> ·
  <a href="#usage">Usage</a> ·
  <a href="#architecture">Architecture</a> ·
  <a href="#development">Development</a>
</p>

> [中文文档](README.zh-CN.md)

ChatMarks is a Chrome extension that lets you **search your bookmarks using natural language**. Describe what you're looking for — "the Rust article I saved last month" or "that Figma tutorial about auto layout" — and ChatMarks finds it using AI.

Powered by LLM (OpenAI-compatible API) for semantic understanding, with vector search and score fusion for relevance ranking. **100% client-side — your bookmark data never leaves your browser**, except your query + top-K candidates sent to the LLM API you configure.

## Features

- **Natural Language Search** — find bookmarks by describing them, not by guessing titles or URLs
- **Results-First Streaming** — AI responds with a one-line summary; matched result cards stream in one by one with fade-in animations
- **Recently Opened** — bookmarks you've clicked from ChatMarks appear on the empty state for instant one-click access
- **Vector Score Ranking** — vector similarity scores preserved and fused with LLM ordering for better ranking, with relevance badges on results
- **Smart Organize** — let AI analyze all your bookmarks and suggest a clean folder structure, with one-click apply
- **Duplicate Detection** — find and remove duplicate bookmarks via exact URL matching and near-duplicate embedding similarity
- **Import/Export** — backup and migrate bookmarks with JSON or Chrome-compatible HTML format, with duplicate detection on import
- **Three UI Modes**:
  - **Popup** — quick search in a compact popup (Ctrl+Shift+K or toolbar icon)
  - **Side Panel** — persistent chat with conversation history
  - **Dashboard** — full-featured workspace with bookmark tree, chat, results, duplicates, organize, import/export, and settings
- **Dark Mode** — automatically follows system preference
- **i18n** — Chinese and English interface
- **Conversation History** — multi-turn search sessions
- **Auto-Indexing** — bookmarks are automatically indexed on install and kept in sync, with progress feedback in Settings
- **Separate Embedding API Config** — embedding model can use a different API key/base URL than the chat model, with automatic fallback
- **Dual Embedding Mode** — remote API (default) or local via Transformers.js (privacy-first)
- **Markdown Rendering** — AI responses with rich formatting

## Installation

### Pre-built (Recommended)

1. Go to [Releases](https://github.com/jim1010/ChatMarks/releases)
2. Download the latest `chatmarks-x.x.x-chrome.zip`
3. Unzip to a local folder
4. In Chrome, go to `chrome://extensions`
5. Enable **Developer mode** (top right)
6. Click **Load unpacked** and select the unzipped folder

### From Source

```bash
git clone https://github.com/jim1010/ChatMarks.git
cd ChatMarks
npm install
npm run build
```

Then load the `.output/chrome-mv3` folder as an unpacked extension in Chrome.

### Development

```bash
npm run dev          # Chrome dev mode with hot reload
npm run dev:firefox  # Firefox dev mode
npm run build        # Production build → .output/chrome-mv3/
npm run zip          # Build & zip for release → .output/chatmarks-x.x.x-chrome.zip
```

## Usage

### Setup

After installation, open the Dashboard (click the extension icon or press `Ctrl+Shift+K`), then:

1. Click **Settings** in the left sidebar
2. Fill in your API credentials:
   - **API Base URL** — your OpenAI-compatible endpoint (default: `https://api.openai.com/v1`)
   - **API Key** — your API key
   - **Chat Model** — the model for responses (e.g., `gpt-4o-mini`, `deepseek-v4-pro`)
3. (Optional) Configure separate **Embedding API** settings — leave empty to reuse the Chat API credentials above
   - **Embedding API Base URL** — separate endpoint for embeddings
   - **Embedding API Key** — separate key for embeddings
   - **Embedding Model** — the model for vector embeddings (e.g., `text-embedding-3-small`)
   - **Embedding Mode** — Remote API or Local (Transformers.js)
4. Click **Save**

The extension auto-indexes your bookmarks after setup. The index status is shown at the top.

### Search

Type a natural language query like:

> "find the Rust article I saved last month"

ChatMarks will:
1. Convert your query to a vector embedding
2. Find the top-K most similar bookmarks via cosine similarity
3. Send them with similarity scores to the LLM
4. Fuse LLM rankings with vector scores for optimal ordering
5. Display matched results with explanations and relevance badges

### Smart Organize

Open the Dashboard, click **Smart Organize** in the left sidebar:

1. Click **Analyze & Organize** — AI reads all your bookmarks
2. Review the suggested folder structure (grouped by topic)
3. Toggle individual suggestions on/off
4. Click **Apply** to create folders and move bookmarks
5. Empty folders are automatically cleaned up

New folders are created under your **Bookmarks Bar**.

### Deduplication

Open the Dashboard, click **Duplicates** in the left sidebar:

1. Click **Scan for Duplicates** — the engine scans all bookmarks
2. Exact duplicates are detected by URL normalization (lowercase, strip tracking params, strip hash)
3. Near-duplicates are detected via cosine similarity on existing embedding vectors (threshold 0.95)
4. Review grouped results — select which copies to delete (at least one per group is preserved)
5. Click **Delete Selected** to remove from Chrome and IndexedDB

### Import/Export

Open the Dashboard, click **Import/Export** in the left sidebar:

**Export:**
1. Choose JSON or HTML (Chrome-compatible Netscape format)
2. Click the format button — bookmarks are downloaded immediately

**Import:**
1. Click the **Import** tab
2. Select or drag a `.json` / `.html` file
3. Review the preview — see format, bookmark/folder counts, and collapsible tree
4. Click **Confirm Import** — bookmarks are imported into a new folder under Bookmarks Bar
5. Duplicates (same URL) are automatically skipped and reported

## Architecture

```
ChatMarks/
├── src/
│   ├── entrypoints/          # Chrome extension entry points
│   │   ├── background.ts     # Service worker (indexing, search routing)
│   │   ├── dashboard/        # Full workspace (bookmark tree + chat + panels)
│   │   ├── popup/            # Compact popup (400px)
│   │   ├── sidepanel/        # Persistent sidebar with conversations
│   │   ├── options/          # Standalone settings page
│   │   └── offscreen/        # Local embedding worker
│   ├── background/           # Core logic
│   │   ├── search-engine.ts  # Search pipeline (embed → vector search → LLM → re-rank)
│   │   ├── bookmark-indexer.ts  # Full & incremental indexing
│   │   ├── bookmark-watcher.ts  # Real-time bookmark change detection
│   │   ├── vector-store.ts   # In-browser vector similarity search
│   │   ├── llm-client.ts     # OpenAI-compatible API (streaming + non-streaming)
│   │   ├── embedding-provider.ts  # Remote / local embedding routing
│   │   ├── prompt-templates.ts    # Search & organize prompts
│   │   ├── conversation-manager.ts # Chat session persistence
│   │   └── message-router.ts      # SW message dispatcher
│   ├── ui/                   # Preact components & hooks
│   │   ├── components/       # ChatView, ChatInput, BookmarkCard, etc.
│   │   ├── hooks/            # useChat, useSettings, useConversations, useI18n
│   │   └── styles/           # Global CSS with CSS variables & dark mode
│   └── shared/               # Shared types, utils, i18n, db, organize-engine, duplicates-engine, export-engine, import-engine
├── wxt.config.ts             # WXT framework config
├── package.json
└── tsconfig.json
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [WXT](https://wxt.dev/) (MV3) |
| UI | [Preact](https://preactjs.com/) + CSS Variables |
| Storage | [IndexedDB](https://github.com/jakearchibald/idb) — bookmarks, embeddings, conversations |
| LLM | OpenAI-compatible API (streaming chat + embedding) |
| Vector Search | Pure JS cosine similarity |
| Local Embedding | [@xenova/transformers](https://github.com/xenova/transformers.js) (optional) |
| i18n | Custom lightweight solution (zh-CN / en) |

### Privacy

- **No data leaves your browser** except the search query and top-K candidate bookmarks sent to your configured LLM API
- Bookmark titles, URLs, and folder paths are sent to the LLM for semantic matching
- No analytics, no tracking, no third-party services
- Optional local embedding mode keeps everything on-device (requires Transformers.js)

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| API Base URL | `https://api.openai.com/v1` | OpenAI-compatible endpoint |
| API Key | — | Your API key |
| Chat Model | `gpt-4o-mini` | Model for search responses & organize |
| Embedding API Base URL | (empty = reuse Chat) | Separate endpoint for embedding API |
| Embedding API Key | (empty = reuse Chat) | Separate key for embedding API |
| Embedding Model | `text-embedding-3-small` | Model for vector embeddings |
| Embedding Mode | Remote | Remote API or Local (Transformers.js) |
| Vector Search Top-K | 20 | Candidates from vector search |
| Max Bookmarks (LLM) | 500 | Fallback limit for degraded mode |
| Language | System | UI language (Chinese / English) |

### Supported LLM Providers

Any OpenAI-compatible API works, including:

- **OpenAI** — `gpt-4o-mini`, `gpt-4o`, `text-embedding-3-small`
- **DeepSeek** — `deepseek-v4-flash`, `deepseek-v4-pro` (non-reasoning mode recommended for organize)
- **Ollama** (local) — set base URL to `http://localhost:11434/v1`
- **Other compatible providers** (Zhipu, Qwen, Moonshot, etc.)

> **Note:** For Smart Organize, use a **non-reasoning model** (e.g., `deepseek-v4-pro` with reasoning off, `gpt-4o-mini`). Reasoning models may consume all token budget on thinking and never output the JSON result.

## Contributing

Issues and PRs welcome. Key areas for contribution:

- Support for more LLM providers / API formats
- Improved search relevance ranking
- Test coverage

## License

MIT © 2026 ChatMarks
