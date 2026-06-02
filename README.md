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

ChatMarks is a Chrome extension that lets you **search your bookmarks using natural language**. Describe what you're looking for — "the Rust article I saved last month" or "that Figma tutorial about auto layout" — and ChatMarks finds it using AI.

Powered by LLM (OpenAI-compatible API) for semantic understanding, with vector search for relevance ranking. **100% client-side — your bookmark data never leaves your browser**, except your query + top-20 candidates sent to the LLM API you configure.

## Features

- **Natural Language Search** — find bookmarks by describing them, not by guessing titles or URLs
- **Streaming Responses** — see results appear in real-time as the AI responds
- **Smart Organize** — let AI analyze all your bookmarks and suggest a clean folder structure, with one-click apply
- **Three UI Modes**:
  - **Popup** — quick search in a compact popup (Ctrl+Shift+K or toolbar icon)
  - **Side Panel** — persistent chat with conversation history
  - **Dashboard** — full-featured workspace with bookmark tree, chat, results, organize, and settings
- **Dark Mode** — automatically follows system preference
- **i18n** — Chinese and English interface
- **Conversation History** — multi-turn search sessions
- **Auto-Indexing** — bookmarks are automatically indexed on install and kept in sync
- **Dual Embedding Mode** — remote API (default) or local via Transformers.js (privacy-first)
- **Markdown Rendering** — AI responses with rich formatting

## Installation

### From Source

```bash
git clone https://github.com/jim1010/ChatMarks.git
cd chatmarks
npm install
npm run build
```

Then in Chrome:
1. Go to `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select the `.output/chrome-mv3` folder

### Development

```bash
npm run dev          # Chrome dev mode with hot reload
npm run dev:firefox  # Firefox dev mode
```

## Usage

### Setup

After installation, open the Dashboard (click the extension icon or press `Ctrl+Shift+K`), then:

1. Click **Settings** in the left sidebar
2. Fill in your API credentials:
   - **API Base URL** — your OpenAI-compatible endpoint (default: `https://api.openai.com/v1`)
   - **API Key** — your API key
   - **Chat Model** — the model for responses (e.g., `gpt-4o-mini`, `deepseek-chat`)
   - **Embedding Model** — the model for vector embeddings (e.g., `text-embedding-3-small`)
3. Click **Save**

The extension auto-indexes your bookmarks after setup. The index status is shown at the top.

### Search

Type a natural language query like:

> "帮我找上个月保存的 Rust 异步编程文章"

ChatMarks will:
1. Convert your query to a vector embedding
2. Find the top-20 most similar bookmarks
3. Send them with your query to the LLM
4. Display matched results with explanations

### Smart Organize

Open the Dashboard, click **智能整理** (Smart Organize) in the left sidebar:

1. Click **分析并整理** — AI reads all your bookmarks
2. Review the suggested folder structure (grouped by topic)
3. Toggle individual suggestions on/off
4. Click **应用** to create folders and move bookmarks
5. Empty folders are automatically cleaned up

New folders are created under your **Bookmarks Bar**.

## Architecture

```
chatmarks/
├── src/
│   ├── entrypoints/          # Chrome extension entry points
│   │   ├── background.ts     # Service worker (indexing, search routing)
│   │   ├── dashboard/        # Full workspace (bookmark tree + chat + panels)
│   │   ├── popup/            # Compact popup (400px)
│   │   ├── sidepanel/        # Persistent sidebar with conversations
│   │   ├── options/          # Standalone settings page
│   │   └── offscreen/        # Local embedding worker
│   ├── background/           # Core logic
│   │   ├── search-engine.ts  # Search pipeline (embed → vector search → LLM)
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
│   └── shared/               # Shared types, utils, i18n, db, organize-engine
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

- **No data leaves your browser** except the search query and top-20 candidate bookmarks sent to your configured LLM API
- Bookmark titles, URLs, and folder paths are sent to the LLM for semantic matching
- No analytics, no tracking, no third-party services
- Optional local embedding mode keeps everything on-device (requires Transformers.js)

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| API Base URL | `https://api.openai.com/v1` | OpenAI-compatible endpoint |
| API Key | — | Your API key |
| Chat Model | `gpt-4o-mini` | Model for search responses & organize |
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
- Bookmark deduplication
- Import/export bookmark organization profiles
- Test coverage

## License

MIT © 2026 ChatMarks
