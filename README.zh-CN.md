<p align="center">
  <img src="src/public/icons/icon-128.png" alt="ChatMarks Logo" width="96" />
</p>

<h1 align="center">ChatMarks</h1>

<p align="center">
  <b>基于 AI 的 Chrome 书签对话式检索与智能整理插件</b><br/>
  描述一下，就能找到；再帮你整理得井井有条。
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.2.0-blue" alt="Version" />
  <img src="https://img.shields.io/badge/license-MIT-green" alt="License" />
  <img src="https://img.shields.io/badge/chrome-MV3-orange" alt="Chrome MV3" />
  <img src="https://img.shields.io/badge/built%20with-WXT-purple" alt="WXT" />
  <img src="https://img.shields.io/badge/UI-Preact-673ab8" alt="Preact" />
</p>

<p align="center">
  <a href="#-功能特性">功能特性</a> ·
  <a href="#-安装">安装</a> ·
  <a href="#-使用指南">使用指南</a> ·
  <a href="#-架构">架构</a> ·
  <a href="#%EF%B8%8F-配置项">配置项</a> ·
  <a href="#-开发">开发</a>
</p>

<p align="center">
  <a href="README.md"><b>English Documentation</b></a>
</p>

---

ChatMarks 是一款 Chrome 浏览器扩展，让你**用自然语言搜索书签**。描述你想要找的内容——"上个月保存的 Rust 文章"或"那个讲 Figma 自动布局的教程"——ChatMarks 就能用 AI 帮你找到。

基于 LLM（兼容任意 OpenAI API）进行语义理解，结合向量搜索与分数融合做相关性排序。

> 🔒 **隐私优先**：100% 客户端运行，书签数据不离开浏览器——仅将你的查询和 Top-K 候选书签发送给**你自己配置**的 LLM API。

## ✨ 功能特性

- 🔍 **自然语言搜索** — 用描述找书签，不用猜标题或 URL
- ⚡ **结果优先流式输出** — AI 先给一句简短总结，匹配的书签卡片逐张弹出，带淡入动画
- 🕘 **最近打开** — 在 ChatMarks 中点击过的书签出现在首页，一键直达
- 🎯 **向量分数排序** — 向量相似度与 LLM 排序融合，结果卡片显示相关度徽章
- 🗂️ **智能整理** — AI 分析全部书签并建议清晰的文件夹结构，一键应用
- 👯 **重复检测** — 精确 URL 匹配 + 基于嵌入相似度的近重复检测
- 📦 **导入 / 导出** — JSON 或 Chrome 兼容 HTML 格式备份迁移，导入自动去重
- 🪟 **三种界面模式** — **Popup 弹窗**快速搜索（`Ctrl+Shift+K`）、**Side Panel 侧边栏**持久对话、**Dashboard 工作台**全功能工作区
- 🌙 **深色模式** — 自动跟随系统偏好
- 🌐 **中英文界面** — 跟随系统语言，可在设置中切换
- 💬 **对话历史** — 多轮搜索会话
- 🔄 **自动索引** — 安装后自动索引并实时增量同步，进度可视
- 🔑 **嵌入模型独立配置** — 可使用独立的 API Key 和端点，留空自动复用对话模型设置
- 🧠 **双嵌入模式** — 远程 API（默认）或本地 Transformers.js 完全离线运行
- 🤖 **推理模型友好** — 自动关闭思考模式（DeepSeek 等），兼容各类代理与非标准响应格式

## 📥 安装

### 预编译版本（推荐）

1. 前往 [Releases](https://github.com/jim1010/ChatMarks/releases)
2. 下载最新版 `chatmarks-x.x.x-chrome.zip` 并解压
3. Chrome 打开 `chrome://extensions`
4. 开启右上角**开发者模式**
5. 点击**加载已解压的扩展程序**，选择解压后的文件夹

### 从源码构建

```bash
git clone https://github.com/jim1010/ChatMarks.git
cd ChatMarks
npm install
npm run build
```

然后将 `.output/chrome-mv3` 文件夹作为已解压扩展加载到 Chrome。

## 🚀 使用指南

### 初始化配置

打开 Dashboard（点击扩展图标或按 `Ctrl+Shift+K`）：

1. 点击左侧 **设置**
2. 填写 API 配置：
   - **API 基础地址** — OpenAI 兼容端点（默认 `https://api.openai.com/v1`）
   - **API 密钥** — 你的 API Key
   - **对话模型** — 如 `gpt-4o-mini`、`deepseek-chat`
3. （可选）配置独立的 **嵌入模型 API** — 留空则复用对话模型设置
4. 点击 **保存**

配置完成后会自动索引书签，进度显示在顶部状态栏。

### 搜索

输入自然语言查询，例如"帮我找上个月保存的 Rust 异步编程文章"，ChatMarks 会：

1. 将查询转为向量嵌入
2. 通过余弦相似度找到 Top-K 候选书签
3. 将候选连同相似度分数发给 LLM
4. 融合 LLM 排序与向量分数得到最优排序
5. 流式返回匹配结果，附匹配原因和相关度徽章

> 💡 **提示：** 建议使用非推理模型（如 `gpt-4o-mini`、`deepseek-chat`）。ChatMarks 会在服务商支持时自动关闭思考模式，但轻量模型用于搜索仍然更快、更省。

### 智能整理

Dashboard → **智能整理**：点击**分析并整理**，查看 AI 建议的文件夹结构，勾选/取消单个建议后点击**应用**。空文件夹自动清理，新文件夹创建在**书签栏**下。

### 重复检测

Dashboard → **重复书签**：扫描后查看分组结果（精确 URL 重复 + 嵌入相似度 0.95 阈值的近重复），选择要删除的副本——每组至少保留一个。

### 导入 / 导出

Dashboard → **导入/导出**：一键导出 JSON 或 Netscape HTML；导入支持预览（格式、数量、可折叠树形结构）和 URL 自动去重。

## 🏗 架构

```
ChatMarks/
├── src/
│   ├── entrypoints/             # Chrome 扩展入口
│   │   ├── background.ts        # Service Worker（索引、搜索路由）
│   │   ├── dashboard/           # 全功能工作台（书签树 + 对话 + 面板）
│   │   ├── popup/               # 紧凑弹窗（400px）
│   │   ├── sidepanel/           # 持久侧边栏 + 对话历史
│   │   ├── options/             # 独立设置页
│   │   └── offscreen/           # 本地嵌入 worker
│   ├── background/              # 核心逻辑
│   │   ├── search-engine.ts     # 搜索流程（嵌入 → 向量 → LLM → 重排序）
│   │   ├── bookmark-indexer.ts  # 全量 & 增量索引
│   │   ├── bookmark-watcher.ts  # 实时书签变更检测
│   │   ├── vector-store.ts      # 浏览器内向量相似度搜索
│   │   ├── llm-client.ts        # OpenAI 兼容 API（流式 + 非流式）
│   │   ├── embedding-provider.ts# 远程 / 本地嵌入路由
│   │   ├── prompt-templates.ts  # 搜索 & 整理 Prompt
│   │   ├── conversation-manager.ts # 对话持久化
│   │   └── message-router.ts    # SW 消息分发
│   ├── ui/                      # Preact 组件 & hooks
│   └── shared/                  # 共享类型、工具、i18n、数据库、各引擎
├── wxt.config.ts                # WXT 框架配置
└── package.json
```

### 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | [WXT](https://wxt.dev/) (MV3) |
| UI | [Preact](https://preactjs.com/) + CSS Variables |
| 存储 | [IndexedDB](https://github.com/jakearchibald/idb) — 书签、嵌入、对话 |
| LLM | OpenAI 兼容 API（流式对话 + 嵌入） |
| 向量搜索 | 纯 JS 余弦相似度 |
| 本地嵌入 | [@xenova/transformers](https://github.com/xenova/transformers.js)（可选） |
| 国际化 | 自研轻量方案（zh-CN / en） |

### 隐私

- **书签数据不离开浏览器**，仅查询和 Top-K 候选书签发送给你配置的 LLM API
- 发送给 LLM 的数据包括书签标题、URL 和文件夹路径，用于语义匹配
- 无分析、无追踪、无第三方服务
- 可选的本地嵌入模式将所有数据保留在设备上

## ⚙️ 配置项

| 设置 | 默认值 | 说明 |
|------|--------|------|
| API 基础地址 | `https://api.openai.com/v1` | OpenAI 兼容的 API 端点 |
| API 密钥 | — | 你的 API Key |
| 对话模型 | `gpt-4o-mini` | 搜索回复 & 整理使用的模型 |
| 嵌入 API 基础地址 | (留空=复用对话) | 嵌入模型的独立端点 |
| 嵌入 API 密钥 | (留空=复用对话) | 嵌入模型的独立密钥 |
| 嵌入模型 | `text-embedding-3-small` | 向量嵌入使用的模型 |
| 嵌入模式 | 远程 API | 远程 API 或本地 (Transformers.js) |
| 向量搜索 Top-K | 20 | 向量搜索返回的候选数量 |
| LLM 最大书签数 | 500 | 降级模式下的书签数量上限 |
| 界面语言 | 跟随系统 | 中文 / English |

### 支持的 LLM 提供商

任何兼容 OpenAI API 的服务均可使用：

- **OpenAI** — `gpt-4o-mini`、`gpt-4o`、`text-embedding-3-small`
- **DeepSeek** — `deepseek-chat`、`deepseek-reasoner`（思考模式自动关闭）
- **Ollama**（本地）— 基础地址设为 `http://localhost:11434/v1`
- **其他兼容服务商** — 智谱、通义千问、Moonshot 等

## 🛠 开发

```bash
npm run dev          # Chrome 开发模式，支持热重载
npm run dev:firefox  # Firefox 开发模式
npm run build        # 生产构建 → .output/chrome-mv3/
npm run zip          # 构建并打包 → .output/chatmarks-x.x.x-chrome.zip
npx tsc --noEmit     # 类型检查
```

## 🤝 参与贡献

欢迎提 Issue 和 PR。主要方向：

- 支持更多 LLM 服务商 / API 格式
- 改进搜索相关性排序
- 测试覆盖

## 📄 开源协议

MIT © 2026 ChatMarks
