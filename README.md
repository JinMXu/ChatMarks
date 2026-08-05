<p align="center">
  <img src="src/public/icons/icon-128.png" alt="ChatMarks Logo" width="96" />
</p>

<h1 align="center">ChatMarks</h1>

<p align="center">
  <b>AI-powered bookmark search & organization for Chrome</b><br/>
  Describe it. Find it. Organize it.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.2.0-blue" alt="Version" />
  <img src="https://img.shields.io/badge/license-MIT-green" alt="License" />
  <img src="https://img.shields.io/badge/chrome-MV3-orange" alt="Chrome MV3" />
  <img src="https://img.shields.io/badge/built%20with-WXT-purple" alt="WXT" />
  <img src="https://img.shields.io/badge/UI-Preact-673ab8" alt="Preact" />
</p>

<p align="center">
  <a href="#-features">Features</a> ·
  <a href="#-installation">Installation</a> ·
  <a href="#-usage">Usage</a> ·
  <a href="#-architecture">Architecture</a> ·
  <a href="#%EF%B8%8F-configuration">Configuration</a> ·
  <a href="#-development">Development</a>
</p>

<p align="center">
  <a href="README.zh-CN.md"><b>中文文档</b></a>
</p>

---

ChatMarks is a Chrome extension that lets you **search your bookmarks using natural language**. Describe what you're looking for — *"the Rust article I saved last month"* or *"that Figma tutorial about auto layout"* — and ChatMarks finds it using AI.

Powered by an LLM (any OpenAI-compatible API) for semantic understanding, with vector search and score fusion for relevance ranking.

> 🔒 **Privacy-first**: 100% client-side. Your bookmark data never leaves your browser — only your query and the top-K candidates are sent to the LLM API *you* configure.

## ✨ Features

- 🔍 **Natural Language Search** — find bookmarks by describing them, not by guessing titles or URLs
- ⚡ **Results-First Streaming** — AI responds with a one-line summary; matched result cards stream in one by one with fade-in animations
- 🕘 **Recently Opened** — bookmarks you've clicked from ChatMarks appear on the empty state for one-click access
- 🎯 **Vector Score Ranking** — vector similarity fused with LLM ordering, with relevance badges on every result
- 🗂️ **Smart Organize** — AI analyzes all your bookmarks and suggests a clean folder structure, with one-click apply
- 👯 **Duplicate Detection** — exact URL matching plus near-duplicate detection via embedding similarity
- 📦 **Import / Export** — backup and migrate with JSON or Chrome-compatible HTML, with dedupe on import
- 🪟 **Three UI Modes** — **Popup** for quick search (`Ctrl+Shift+K`), **Side Panel** for persistent chat with history, **Dashboard** for the full workspace
- 🌙 **Dark Mode** — automatically follows system preference
- 🌐 **i18n** — Chinese and English interface
- 💬 **Conversation History** — multi-turn search sessions
- 🔄 **Auto-Indexing** — bookmarks indexed on install and kept in sync in real time, with progress feedback
- 🔑 **Separate Embedding Config** — embedding model can use its own API key/endpoint, with automatic fallback to chat credentials
- 🧠 **Dual Embedding Mode** — remote API (default) or fully local via Transformers.js
- 🤖 **Reasoning-Model Friendly** — thinking mode is disabled automatically where supported (DeepSeek, etc.); non-SSE and proxy response formats are handled gracefully

## 📥 Installation

### Pre-built (Recommended)

1. Go to [Releases](https://github.com/jim1010/ChatMarks/releases)
2. Download the latest `chatmarks-x.x.x-chrome.zip` and unzip it
3. Open `chrome://extensions` in Chrome
4. Enable **Developer mode** (top right)
5. Click **Load unpacked** and select the unzipped folder

### From Source

```bash
git clone https://github.com/jim1010/ChatMarks.git
cd ChatMarks
npm install
npm run build
```

Then load `.output/chrome-mv3` as an unpacked extension.

## 🚀 Usage

### Setup

Open the Dashboard (click the extension icon or press `Ctrl+Shift+K`):

1. Click **Settings** in the sidebar
2. Fill in your API credentials:
   - **API Base URL** — your OpenAI-compatible endpoint (default: `https://api.openai.com/v1`)
   - **API Key** — your API key
   - **Chat Model** — e.g. `gpt-4o-mini`, `deepseek-chat`
3. *(Optional)* Configure a separate **Embedding API** — leave empty to reuse the chat credentials
4. Click **Save**

Bookmarks are auto-indexed after setup; progress is shown at the top.

### Search

Type a query like *"find the Rust article I saved last month"* and ChatMarks will:

1. Embed your query into a vector
2. Find the top-K most similar bookmarks via cosine similarity
3. Send them with similarity scores to the LLM
4. Fuse LLM rankings with vector scores for optimal ordering
5. Stream back matched results with explanations and relevance badges

> 💡 **Tip:** use a non-reasoning chat model (e.g. `gpt-4o-mini`, `deepseek-chat`). ChatMarks sends requests with thinking disabled where the provider supports it, but a lightweight model is still faster and cheaper for search.

### Smart Organize

Dashboard → **Smart Organize**: click **Analyze & Organize**, review the suggested folder structure, toggle individual suggestions, then **Apply**. Empty folders are cleaned up automatically. New folders are created under your **Bookmarks Bar**.

### Deduplication

Dashboard → **Duplicates**: scan, review grouped results (exact URL duplicates + near-duplicates via embedding similarity at 0.95 threshold), select copies to delete — at least one per group is always preserved.

### Import / Export

Dashboard → **Import/Export**: one-click export to JSON or Netscape HTML; import with preview (format, counts, collapsible tree) and automatic URL dedupe.

## 🏗 Architecture

```
ChatMarks/
├── src/
│   ├── entrypoints/             # Chrome extension entry points
│   │   ├── background.ts        # Service worker (indexing, search routing)
│   │   ├── dashboard/           # Full workspace (tree + chat + panels)
│   │   ├── popup/               # Compact popup (400px)
│   │   ├── sidepanel/           # Persistent sidebar with conversations
│   │   ├── options/             # Standalone settings page
│   │   └── offscreen/           # Local embedding worker
│   ├── background/              # Core logic
│   │   ├── search-engine.ts     # Search pipeline (embed → vector → LLM → re-rank)
│   │   ├── bookmark-indexer.ts  # Full & incremental indexing
│   │   ├── bookmark-watcher.ts  # Real-time bookmark change detection
│   │   ├── vector-store.ts      # In-browser vector similarity search
│   │   ├── llm-client.ts        # OpenAI-compatible API (streaming + non-streaming)
│   │   ├── embedding-provider.ts# Remote / local embedding routing
│   │   ├── prompt-templates.ts  # Search & organize prompts
│   │   ├── conversation-manager.ts # Chat session persistence
│   │   └── message-router.ts    # SW message dispatcher
│   ├── ui/                      # Preact components & hooks
│   └── shared/                  # Types, utils, i18n, db, engines
├── wxt.config.ts                # WXT framework config
└── package.json
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [WXT](https://wxt.dev/) (MV3) |
| UI | [Preact](https://preactjs.com/) + CSS Variables |
| Storage | [IndexedDB](https://github.com/jakearchibald/idb) — bookmarks, embeddings, conversations |
| LLM | OpenAI-compatible API (streaming chat + embeddings) |
| Vector Search | Pure JS cosine similarity |
| Local Embedding | [@xenova/transformers](https://github.com/xenova/transformers.js) (optional) |
| i18n | Custom lightweight solution (zh-CN / en) |

### Privacy

- **No data leaves your browser** except the search query and top-K candidates sent to your configured LLM API
- Bookmark titles, URLs, and folder paths are sent to the LLM for semantic matching
- No analytics, no tracking, no third-party services
- Optional local embedding mode keeps everything on-device

## ⚙️ Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| API Base URL | `https://api.openai.com/v1` | OpenAI-compatible endpoint |
| API Key | — | Your API key |
| Chat Model | `gpt-4o-mini` | Model for search responses & organize |
| Embedding API Base URL | (empty = reuse Chat) | Separate endpoint for embeddings |
| Embedding API Key | (empty = reuse Chat) | Separate key for embeddings |
| Embedding Model | `text-embedding-3-small` | Model for vector embeddings |
| Embedding Mode | Remote | Remote API or Local (Transformers.js) |
| Vector Search Top-K | 20 | Candidates from vector search |
| Max Bookmarks (LLM) | 500 | Fallback limit for degraded mode |
| Language | System | UI language (中文 / English) |

### Supported LLM Providers

Any OpenAI-compatible API works:

- **OpenAI** — `gpt-4o-mini`, `gpt-4o`, `text-embedding-3-small`
- **DeepSeek** — `deepseek-chat`, `deepseek-reasoner` (thinking is disabled automatically)
- **Ollama** (local) — set base URL to `http://localhost:11434/v1`
- **Other compatible providers** — Zhipu, Qwen, Moonshot, etc.

## 🛠 Development

```bash
npm run dev          # Chrome dev mode with hot reload
npm run dev:firefox  # Firefox dev mode
npm run build        # Production build → .output/chrome-mv3/
npm run zip          # Build & zip for release → .output/chatmarks-x.x.x-chrome.zip
npx tsc --noEmit     # Type check
```

## 🤝 Contributing

Issues and PRs welcome. Key areas:

- Support for more LLM providers / API formats
- Improved search relevance ranking
- Test coverage

## 📄 License

MIT © 2026 ChatMarks
