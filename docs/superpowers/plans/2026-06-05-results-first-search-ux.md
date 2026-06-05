# Results-First Search UX — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 搜索体验从"看 AI 说大段话"变成"AI 一句话总结 + 书签卡片流式逐张弹出"。

**Architecture:** Prompt 改为 `[MATCH:N]` 格式 → stream callback 实时解析逐行推送卡片 → UI 卡片逐张追加 + 淡入动画。不引入新依赖。

**Tech Stack:** TypeScript, Preact, WXT, Tailwind CSS, Chrome Extension MV3

---

### Task 1: 新增 SEARCH_RESULT_APPEND 消息类型

**Files:**
- Modify: `src/shared/types.ts:108-133`

- [ ] **Step 1: 在 RuntimeMessage 联合类型中新增 SEARCH_RESULT_APPEND**

在 `SEARCH_DONE` 行之后插入新类型：

```ts
  | { type: 'SEARCH_DONE' }
  | { type: 'SEARCH_RESULT_APPEND'; result: SearchResult }
```

修改位置：`src/shared/types.ts` 第 112 行 `SEARCH_DONE` 之后。

- [ ] **Step 2: 验证 TypeScript 编译**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/shared/types.ts
git commit -m "feat: add SEARCH_RESULT_APPEND message type for incremental card streaming"
```

---

### Task 2: Prompt 改造 — LLM 输出 [MATCH:N] 格式

**Files:**
- Modify: `src/background/prompt-templates.ts:13-34`

- [ ] **Step 1: 修改 buildSystemPrompt 中的输出格式说明**

将第 25-27 行的格式说明：

```ts
5. Be concise. Format your response as:
   - A brief 1-2 sentence summary
   - Numbered list of results, each with: title, URL (in parentheses), and a one-line match explanation
```

替换为：

```ts
5. Be extremely concise. Format your response as:
   - A single-line summary (max 80 characters)
   - Then, on separate lines, mark each match: [MATCH:N] brief reason
   - Example: [MATCH:3] This article covers the topic you asked about
   - Do NOT output URLs, markdown lists, or extra prose. Only the summary line + [MATCH:N] lines.
```

- [ ] **Step 2: 验证 TypeScript 编译**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/background/prompt-templates.ts
git commit -m "feat: change LLM prompt to output [MATCH:N] format for result-first UX"
```

---

### Task 3: 搜索引擎 — 流式解析 [MATCH:N] 并增量推送卡片

**Files:**
- Modify: `src/background/search-engine.ts`

- [ ] **Step 1: 重写 stream callback，实现按行解析和增量推送**

将 `searchBookmarks` 函数中的 stream callback（第 65-72 行）替换为以下逻辑：

```ts
    // Stream LLM response with incremental [MATCH:N] parsing
    let streamedContent = '';
    let streamBuffer = '';
    const matchResults: SearchResult[] = [];
    const matchSeen = new Set<string>();

    // Build candidate lookup map (1-based index → BookmarkNode)
    const candidateMap = new Map<number, BookmarkNode>();
    candidates.forEach((c, i) => candidateMap.set(i + 1, c));

    const fullResponse = await chatCompletionStream(
      [
        { role: 'system', content: systemMsg },
        { role: 'user', content: userMsg },
      ],
      (chunk) => {
        streamBuffer += chunk;

        // Split on newlines; keep incomplete last line in buffer
        const lines = streamBuffer.split('\n');
        streamBuffer = lines.pop() || '';

        for (const line of lines) {
          const matchMatch = line.match(/^\[MATCH:(\d+)\]/);
          if (matchMatch) {
            const idx = parseInt(matchMatch[1], 10);
            const candidate = candidateMap.get(idx);
            if (candidate && !matchSeen.has(candidate.id)) {
              matchSeen.add(candidate.id);
              const result: SearchResult = {
                bookmarkId: candidate.id,
                title: candidate.title,
                url: candidate.url || '',
                path: candidate.path,
                dateAdded: candidate.dateAdded,
                matchReason: line.slice(matchMatch[0].length).trim(),
                score: scoreMap?.get(candidate.id),
              };
              matchResults.push(result);

              chrome.runtime.sendMessage({
                type: 'SEARCH_RESULT_APPEND',
                result,
              } as RuntimeMessage);
            }
          } else {
            // Non-MATCH line: stream as text
            streamedContent += line + '\n';
            chrome.runtime.sendMessage({
              type: 'SEARCH_STREAM',
              chunk: line + '\n',
            } as RuntimeMessage);
          }
        }
      },
    );

    // Process any remaining buffer content after stream ends
    if (streamBuffer.trim()) {
      const matchMatch = streamBuffer.match(/^\[MATCH:(\d+)\]/);
      if (matchMatch) {
        const idx = parseInt(matchMatch[1], 10);
        const candidate = candidateMap.get(idx);
        if (candidate && !matchSeen.has(candidate.id)) {
          matchSeen.add(candidate.id);
          const result: SearchResult = {
            bookmarkId: candidate.id,
            title: candidate.title,
            url: candidate.url || '',
            path: candidate.path,
            dateAdded: candidate.dateAdded,
            matchReason: streamBuffer.slice(matchMatch[0].length).trim(),
            score: scoreMap?.get(candidate.id),
          };
          matchResults.push(result);

          chrome.runtime.sendMessage({
            type: 'SEARCH_RESULT_APPEND',
            result,
          } as RuntimeMessage);
        }
      } else {
        streamedContent += streamBuffer;
        chrome.runtime.sendMessage({
          type: 'SEARCH_STREAM',
          chunk: streamBuffer,
        } as RuntimeMessage);
      }
    }
```

- [ ] **Step 2: 替换结果提取和重排序逻辑**

将第 75-80 行的 `extractResults` + `reRankResults` 块替换为：优先使用流式解析的 `matchResults`，回退到原有 URL 正则提取：

```ts
    // Use incrementally collected results; fall back to URL extraction if empty
    let results = matchResults;
    if (results.length === 0) {
      results = extractResults(fullResponse, candidates);
    }

    // Re-rank: fuse vector scores with LLM ordering
    if (scoreMap && scoreMap.size > 0 && results.length > 0) {
      results = reRankResults(results, scoreMap);
    }
```

- [ ] **Step 3: 删除不再需要的局部变量声明**

`extractResults` 的声明位置保持在第 60 行附近不变。确保变量 `streamedContent` 被声明且在 `fullResponse` 后仍可访问（用于保存到 conversation）。

- [ ] **Step 4: 验证 TypeScript 编译**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add src/background/search-engine.ts
git commit -m "feat: stream-parse [MATCH:N] lines for incremental card delivery"
```

---

### Task 4: useChat — 处理 SEARCH_RESULT_APPEND 消息

**Files:**
- Modify: `src/ui/hooks/useChat.ts:73-132`

- [ ] **Step 1: 在 message listener 中新增 SEARCH_RESULT_APPEND case**

在 `SEARCH_DONE` case（第 118 行）之后插入：

```ts
        case 'SEARCH_RESULT_APPEND':
          if (message.result) {
            setMessages((prev) => {
              const copy = [...prev];
              const last = copy[copy.length - 1];
              if (last?.role === 'assistant') {
                copy[copy.length - 1] = {
                  ...last,
                  results: [...(last.results || []), message.result!],
                };
              } else {
                // Should not happen, but guard: create assistant message
                copy.push({
                  id: generateId(),
                  role: 'assistant',
                  content: '',
                  timestamp: Date.now(),
                  results: [message.result!],
                });
              }
              return copy;
            });
          }
          break;
```

- [ ] **Step 2: 验证 TypeScript 编译**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/ui/hooks/useChat.ts
git commit -m "feat: handle SEARCH_RESULT_APPEND for incremental card display"
```

---

### Task 5: ChatView — 布局调整为结果优先

**Files:**
- Modify: `src/ui/components/ChatView.tsx`

- [ ] **Step 1: 调整 AI 消息气泡中文字和卡片的样式**

将第 51-63 行的消息气泡渲染替换为：

```tsx
          <div class={`message-bubble p-3 px-4 rounded-lg text-base ${msg.role === 'user' ? 'rounded-br-xs' : 'rounded-bl-xs'}`}>
            {msg.content && msg.role === 'assistant' ? (
              <div class="message-content text-sm text-text-secondary mb-2">
                <span dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
              </div>
            ) : msg.content ? (
              <div class="message-content">
                <span dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
              </div>
            ) : null}

            {msg.results && msg.results.length > 0 && (
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
                {msg.results.map((r) => (
                  <BookmarkCard key={r.bookmarkId} result={r} />
                ))}
              </div>
            )}
          </div>
```

关键变更：
- AI 消息的文字部分：`text-sm text-text-secondary` + `mb-2` 将文字缩小并留间距
- 用户消息的文字部分：保持不变
- 卡片容器：去掉 `max-w-[360px]`，改为 `grid grid-cols-1 sm:grid-cols-2 gap-2 w-full`

- [ ] **Step 2: 验证 TypeScript 编译**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/ui/components/ChatView.tsx
git commit -m "feat: results-first layout — cards fill width, AI text minimized"
```

---

### Task 6: BookmarkCard — 移除 matchReason 区域

**Files:**
- Modify: `src/ui/components/BookmarkCard.tsx`

- [ ] **Step 1: 删除 matchReason 展示区域**

删除第 63-73 行的 matchReason 渲染块：

```tsx
      {result.matchReason && (
        <div class="text-sm text-text-secondary p-2 px-4 border-t border-border-light bg-bg-secondary leading-[1.5] flex items-start gap-2">
          <span class="text-xs font-semibold text-accent bg-accent-light py-px px-1.5 rounded-xs whitespace-nowrap shrink-0 mt-px">
            {t('match.label')}
          </span>
          <span
            class="message-content"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(result.matchReason) }}
          />
        </div>
      )}
```

- [ ] **Step 2: 清理不再使用的 import**

`renderMarkdown` 如果不再使用，从 import 中移除。检查：BookmarkCard 中 `renderMarkdown` 只在 matchReason 中使用，删除后应从第 3 行 import 中移除。

将第 3 行：
```ts
import { renderMarkdown } from '@/shared/utils';
```
删除。

- [ ] **Step 3: 验证 TypeScript 编译**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/ui/components/BookmarkCard.tsx
git commit -m "feat: remove matchReason footer from BookmarkCard for cleaner results"
```

---

### Task 7: 全局样式 — 卡片淡入动画

**Files:**
- Modify: `src/ui/styles/global.css`

- [ ] **Step 1: 新增 fadeInUp 关键帧动画**

在 `@layer utilities` 的 keyframes 区域（第 147-168 行），在 `@keyframes pageEnter` 之后添加：

```css
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
  }
```

- [ ] **Step 2: 在 .bookmark-card 组件样式上添加动画**

在 `.bookmark-card` 的 `@layer components` 块（第 171-176 行），在现有 transition 声明之后添加 animation：

将：
```css
  .bookmark-card {
    position: relative;
    overflow: hidden;
    transition: border-color var(--transition), box-shadow var(--transition), transform var(--transition-fast);
  }
```

改为：
```css
  .bookmark-card {
    position: relative;
    overflow: hidden;
    transition: border-color var(--transition), box-shadow var(--transition), transform var(--transition-fast);
    animation: fadeInUp 200ms ease-out both;
  }
```

- [ ] **Step 3: 验证构建**

Run: `npm run build`
Expected: Build succeeds, `.output/chrome-mv3/` 生成正常。

- [ ] **Step 4: Commit**

```bash
git add src/ui/styles/global.css
git commit -m "feat: add fadeInUp animation for incremental card appearance"
```

---

### Task 8: 功能验证构建

**Files:** None (verification only)

- [ ] **Step 1: 完整构建**

```bash
npm run build
```

Expected: Build succeeds with no errors. Output in `.output/chrome-mv3/`.

- [ ] **Step 2: 确认所有文件变更已提交**

```bash
git status
git log --oneline -8
```

Expected: 7 commits covering all tasks, clean working tree.

---

## 边界情况处理总结

| 情况 | 处理位置 | 机制 |
|------|---------|------|
| LLM 不输出 `[MATCH:N]` | search-engine.ts | `matchResults` 为空时回退 `extractResults()` |
| `[MATCH:999]` 超出范围 | search-engine.ts | `candidateMap.get(idx)` 返回 undefined，跳过 |
| 重复 `[MATCH:N]` | search-engine.ts | `matchSeen` Set 去重 |
| 流中断在 `[MATCH:` 中间 | search-engine.ts | `streamBuffer` 保留不完整行，等下一 chunk |
| 降级模式（无 embedding） | prompt-templates.ts | `buildDegradedSearchMessage` 也用相同格式 |
| 弹窗小窗（400px） | ChatView.tsx | `grid-cols-1` 默认单列 |
| 无搜索结果 | ChatView.tsx | 保持现有空状态逻辑不变 |
