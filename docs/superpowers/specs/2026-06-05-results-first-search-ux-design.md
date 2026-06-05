# Results-First Search UX

**Date**: 2026-06-05  
**Status**: draft  
**Goal**: 让搜索体验从"看 AI 说一大段话"变成"AI 一句话总结，书签卡片立刻弹出来"。

## 动机

当前搜索流程中，LLM 流式输出大量 Markdown 文字（1-2 句总结 + 编号列表 + URL + 匹配理由），用户需要等全文输出完毕才能看到结果卡片。对于找书签这种高频、快节奏操作，这段等待是主要痛点。

## 设计方案

### 1. Prompt 改造

**文件**: `src/background/prompt-templates.ts`

LLM 输出格式从「总结 + 编号列表 + URL + 解释」改为：

```
一行总结（80 字符内）
[MATCH:候选编号] 一行匹配理由（可选）
[MATCH:候选编号] 一行匹配理由（可选）
...
```

- 候选书签在发送给 LLM 时已编号 `[N]`，`[MATCH:N]` 直接引用
- 不依赖 URL 正则、不依赖 JSON，流式解析极简单
- 兜底：如果没解析到 `[MATCH:N]`，回退到现有 URL 正则提取

`buildSystemPrompt` 中格式说明改为：
```
- Output ONLY a one-line summary, then mark each match on a new line as:
  [MATCH:N] reason (optional)
- No markdown lists, no URLs, no extra prose. Keep it minimal.
```

### 2. 流式解析 + 增量推送

**文件**: `src/background/search-engine.ts`

Stream callback 中用 buffer 按行累积：
- 非 `[MATCH:` 开头的行 → 发送 `SEARCH_STREAM`（纯文本）
- `[MATCH:N]` 开头的行 → 解析编号，从 candidates map 取书签 → 立即发送新消息 `SEARCH_RESULT_APPEND`

新增消息类型 `SEARCH_RESULT_APPEND: { result: SearchResult }`，在 `src/shared/types.ts` 中补充。

`extractResults()` 函数增加 `[MATCH:N]` 解析路径，同时保留原有 URL 正则作为兜底。

### 3. 消息协议新增

**文件**: `src/shared/types.ts`

`RuntimeMessage` 联合类型新增：
```ts
| { type: 'SEARCH_RESULT_APPEND'; result: SearchResult }
```

### 4. UI 状态处理

**文件**: `src/ui/hooks/useChat.ts`

新增处理 `SEARCH_RESULT_APPEND`：找到最后一条 assistant 消息，push 单个 result 到其 `results` 数组。

`SEARCH_DONE` 时 behavior 不变（results 已在之前陆续到位）。

### 5. ChatView 布局调整

**文件**: `src/ui/components/ChatView.tsx`

AI 消息气泡内：
- 文字部分（`message-content`）：字号 `text-sm`，颜色 `text-text-secondary`，不再占用视觉重心
- 卡片区：去掉 `max-w-[360px]`，改为 `grid grid-cols-1 sm:grid-cols-2 gap-2 w-full`

### 6. BookmarkCard 精简

**文件**: `src/ui/components/BookmarkCard.tsx`

- 移除 `matchReason` 展示区域（匹配理由信息量低，当前提取逻辑也不稳定）
- 保留：域名首字母图标、标题、URL、路径、时间、相关度 badge、hover 箭头

### 7. 卡片出现动画

**文件**: `src/ui/styles/global.css`

新增 CSS animation：
```css
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}
.bookmark-card {
  animation: fadeInUp 200ms ease-out both;
}
```

## 搜索状态文案

- 搜索中（无结果时）：三点打字动画不变
- 搜索中（解析到文本但无结果时）：显示已流出的文本 + 三点动画
- 搜索结束无结果：显示 "没找到匹配的书签"

## 边界情况

| 情况 | 处理 |
|------|------|
| LLM 输出不含 `[MATCH:N]` | 回退到 URL 正则提取 |
| `[MATCH:999]` 超出范围 | 跳过，不崩溃 |
| 重复 `[MATCH:N]` | 去重，只取首次 |
| 流中断在 `[MATCH:` 中间 | buffer 累积等下一块 |
| 降级模式（无 embedding） | 同格式，candidates 范围更大 |
| 弹窗小窗（400px 宽） | 卡片自动回退单列布局 |

## 不涉及的部分

- Smart Organize 逻辑不变
- Duplicate Detection 不变
- Import/Export 不变
- Settings 不变
- Dashboard、Sidepanel、Popup 三个入口均统一使用 ChatView，自动生效
