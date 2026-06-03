# ChatMarks

<p align="center">
  <b>基于 AI 的 Chrome 书签对话式检索与智能整理插件</b>
</p>

<p align="center">
  <a href="#功能特性">功能特性</a> ·
  <a href="#安装">安装</a> ·
  <a href="#使用指南">使用指南</a> ·
  <a href="#架构">架构</a> ·
  <a href="#开发">开发</a>
</p>

> [English Documentation](README.md)

ChatMarks 是一款 Chrome 浏览器扩展，让你**用自然语言搜索书签**。描述你想要找的内容——"上个月保存的 Rust 文章"或"那个讲 Figma 自动布局的教程"——ChatMarks 就能用 AI 帮你找到。

基于 LLM（兼容 OpenAI API）进行语义理解，结合向量搜索与分数融合做相关性排序。**100% 客户端运行——你的书签数据不会离开浏览器**，仅将你的查询 + Top-K 候选书签发送给你配置的 LLM API。

## 功能特性

- **自然语言搜索** — 用描述找书签，不用猜标题或 URL
- **流式回复** — AI 回答实时显示，逐字输出
- **向量分数排序** — 保留向量相似度分数，与 LLM 排序融合，结果卡片显示相关度徽章
- **智能整理** — 让 AI 分析所有书签并建议清晰的文件结构，一键应用
- **重复检测** — 通过精确 URL 匹配和近重复嵌入相似度检测，发现并移除重复书签
- **导入/导出** — 通过 JSON 或 Chrome 兼容的 HTML 格式备份和迁移书签，导入时自动去重
- **三种界面模式**：
  - **Popup 弹窗** — 快速搜索（Ctrl+Shift+K 或工具栏图标）
  - **Side Panel 侧边栏** — 持久聊天 + 对话历史
  - **Dashboard 工作台** — 全功能工作区：书签树 | 对话 | 搜索结果 | 重复检测 | 智能整理 | 导入/导出 | 设置
- **深色模式** — 自动跟随系统偏好
- **中英文界面** — 跟随系统语言，可在设置中切换
- **对话历史** — 多轮搜索会话
- **自动索引** — 安装后自动索引全部书签，之后增量同步，设置页可查看实时进度
- **嵌入模型独立配置** — 嵌入模型可配置独立的 API Key 和端点，留空则自动复用对话模型设置
- **双嵌入模式** — 远程 API（默认）或本地 Transformers.js（隐私优先）
- **Markdown 渲染** — AI 回复支持富文本格式

## 安装

### 预编译版本（推荐）

1. 前往 [Releases](https://github.com/jim1010/ChatMarks/releases)
2. 下载最新版 `chatmarks-x.x.x-chrome.zip`
3. 解压到本地文件夹
4. Chrome 浏览器打开 `chrome://extensions`
5. 开启右上角**开发者模式**
6. 点击**加载已解压的扩展程序**，选择解压后的文件夹

### 从源码构建

```bash
git clone https://github.com/jim1010/ChatMarks.git
cd ChatMarks
npm install
npm run build
```

然后将 `.output/chrome-mv3` 文件夹作为解压的扩展程序加载到 Chrome。

### 开发模式

```bash
npm run dev          # Chrome 开发模式，支持热重载
npm run dev:firefox  # Firefox 开发模式
npm run build        # 生产构建 → .output/chrome-mv3/
npm run zip          # 构建并打包 → .output/chatmarks-x.x.x-chrome.zip
```

## 使用指南

### 初始化配置

安装后打开 Dashboard（点击扩展图标或按 `Ctrl+Shift+K`）：

1. 点击左侧 **设置**
2. 填写 API 配置：
   - **API 基础地址** — OpenAI 兼容的 API 端点（默认 `https://api.openai.com/v1`）
   - **API 密钥** — 你的 API Key
   - **对话模型** — 用于回复的模型（如 `gpt-4o-mini`、`deepseek-v4-pro`）
3. （可选）配置独立的 **嵌入模型 API** — 留空则复用上方的对话模型设置
   - **嵌入 API 基础地址** — 嵌入模型的独立端点
   - **嵌入 API 密钥** — 嵌入模型的独立密钥
   - **嵌入模型** — 用于向量嵌入的模型（如 `text-embedding-3-small`）
   - **嵌入模式** — 远程 API 或本地 (Transformers.js)
4. 点击 **保存**

扩展安装后会自动索引书签，索引进度显示在顶部状态栏。

### 搜索

用自然语言输入查询，例如：

> "帮我找上个月保存的 Rust 异步编程文章"

ChatMarks 会：
1. 将你的查询转为向量嵌入
2. 通过余弦相似度找到最相近的 Top-K 条候选书签
3. 将查询和候选书签连同相似度分数发给 LLM
4. 融合 LLM 排序与向量分数，得到最优排序
5. 展示匹配结果并附上匹配原因和相关度徽章

### 智能整理

打开 Dashboard，点击左侧 **智能整理**：

1. 点击 **分析并整理** — AI 读取全部书签
2. 查看 AI 建议的文件夹结构（按主题分组）
3. 勾选/取消单个建议
4. 点击 **应用** 创建文件夹并移动书签
5. 空文件夹自动清理

新文件夹会创建在**书签栏**下。

### 重复检测

打开 Dashboard，点击左侧 **重复书签**：

1. 点击 **扫描重复书签** — 引擎扫描所有书签
2. 精确重复通过 URL 标准化检测（小写化、去除追踪参数、去除 hash）
3. 近重复通过已有嵌入向量的余弦相似度检测（阈值 0.95）
4. 查看分组结果 — 选择要删除的副本（每组至少保留一个）
5. 点击 **删除选中** 从 Chrome 和 IndexedDB 中移除

### 导入/导出

打开 Dashboard，点击左侧 **导入/导出**：

**导出：**
1. 选择 JSON 或 HTML（Chrome 兼容的 Netscape 格式）
2. 点击格式按钮 — 书签立即下载

**导入：**
1. 点击 **导入** 标签
2. 选择或拖入 `.json` / `.html` 文件
3. 预览导入内容 — 查看格式、书签/文件夹数量、可折叠的树形结构
4. 点击 **确认导入** — 书签导入到书签栏下的新文件夹
5. 重复书签（相同 URL）自动跳过并汇总报告

## 架构

```
ChatMarks/
├── src/
│   ├── entrypoints/          # Chrome 扩展入口
│   │   ├── background.ts     # Service Worker（索引、搜索路由）
│   │   ├── dashboard/        # 全功能工作台（书签树 + 对话 + 面板）
│   │   ├── popup/            # 紧凑弹窗（400px）
│   │   ├── sidepanel/        # 持久侧边栏 + 对话历史
│   │   ├── options/          # 独立设置页
│   │   └── offscreen/        # 本地嵌入 worker
│   ├── background/           # 核心逻辑
│   │   ├── search-engine.ts  # 搜索流程（嵌入 → 向量搜索 → LLM → 重排序）
│   │   ├── bookmark-indexer.ts  # 全量 & 增量索引
│   │   ├── bookmark-watcher.ts  # 实时书签变更检测
│   │   ├── vector-store.ts   # 浏览器内向量相似度搜索
│   │   ├── llm-client.ts     # OpenAI 兼容 API（流式 + 非流式）
│   │   ├── embedding-provider.ts  # 远程 / 本地嵌入路由
│   │   ├── prompt-templates.ts    # 搜索 & 整理 Prompt
│   │   ├── conversation-manager.ts # 对话持久化
│   │   └── message-router.ts      # SW 消息分发
│   ├── ui/                   # Preact 组件 & hooks
│   │   ├── components/       # ChatView, ChatInput, BookmarkCard 等
│   │   ├── hooks/            # useChat, useSettings, useConversations, useI18n
│   │   └── styles/           # 全局 CSS，CSS 变量 + 深色模式
│   └── shared/               # 共享类型、工具函数、i18n、数据库、整理引擎、去重引擎、导入/导出引擎
├── wxt.config.ts             # WXT 框架配置
├── package.json
└── tsconfig.json
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
- 可选的本地嵌入模式将所有数据保留在设备上（需安装 Transformers.js）

## 配置项

| 设置 | 默认值 | 说明 |
|------|--------|------|
| API 基础地址 | `https://api.openai.com/v1` | OpenAI 兼容的 API 端点 |
| API 密钥 | — | 你的 API Key |
| 对话模型 | `gpt-4o-mini` | 搜索回复 & 整理使用的模型 |
| 嵌入 API 基础地址 | (留空=复用对话) | 嵌入模型的独立 API 端点 |
| 嵌入 API 密钥 | (留空=复用对话) | 嵌入模型的独立 API Key |
| 嵌入模型 | `text-embedding-3-small` | 向量嵌入使用的模型 |
| 嵌入模式 | 远程 API | 远程 API 或本地 (Transformers.js) |
| 向量搜索 Top-K | 20 | 向量搜索返回的候选数量 |
| LLM 最大书签数 | 500 | 降级模式下的书签数量上限 |
| 界面语言 | 跟随系统 | 中文 / English |

### 支持的 LLM 提供商

任何兼容 OpenAI API 的服务均可使用，包括：

- **OpenAI** — `gpt-4o-mini`、`gpt-4o`、`text-embedding-3-small`
- **DeepSeek** — `deepseek-v4-flash`、`deepseek-v4-pro`（整理功能建议使用非 reasoning 模式）
- **Ollama**（本地）— 基础地址设为 `http://localhost:11434/v1`
- **其他兼容服务商**（智谱、通义千问、Moonshot 等）

> **注意：** 智能整理功能请使用**非 reasoning 模型**（如关闭 reasoning 的 `deepseek-v4-pro`、`gpt-4o-mini`）。Reasoning 模型可能将所有 token 预算用于思考过程，不会输出最终 JSON 结果。

## 参与贡献

欢迎提 Issue 和 PR。主要贡献方向：

- 支持更多 LLM 服务商 / API 格式
- 改进搜索相关性排序
- 测试覆盖

## 开源协议

MIT © 2026 ChatMarks
