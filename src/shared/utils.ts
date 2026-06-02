import type { BookmarkNode } from './types';

/**
 * Traverse the Chrome bookmarks tree and flatten it into BookmarkNode objects.
 */
export function flattenBookmarkTree(
  tree: chrome.bookmarks.BookmarkTreeNode[],
  parentPath = '',
): BookmarkNode[] {
  const result: BookmarkNode[] = [];

  for (const node of tree) {
    const currentPath = parentPath ? `${parentPath} > ${node.title}` : node.title;

    if (node.url) {
      const dateGroupModified = node.dateGroupModified ?? node.dateAdded;
      const richText = `${node.title} | ${currentPath} | ${node.url}`;
      const hash = simpleHash(richText + String(node.dateAdded));

      result.push({
        id: node.id,
        title: node.title,
        url: node.url,
        dateAdded: node.dateAdded ?? Date.now(),
        dateLastUsed: node.dateLastUsed,
        dateGroupModified,
        path: currentPath,
        richText,
        hash,
        indexed: false,
      });
    }

    if (node.children) {
      result.push(...flattenBookmarkTree(node.children, currentPath));
    }
  }

  return result;
}

/**
 * Simple string hash (djb2) for change detection.
 */
export function simpleHash(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return hash.toString(36);
}

/**
 * Cosine similarity between two vectors.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Generate a unique ID for messages.
 */
export function generateId(): string {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Format a timestamp as relative time string (e.g., "3 days ago").
 */
export function relativeTime(ts: number): string {
  const now = Date.now();
  const diff = now - ts;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 30) return `${days}d ago`;
  if (months < 12) return `${months}mo ago`;
  return `${years}y ago`;
}

/**
 * Format a date for display.
 */
export function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Parse a relative date expression into a timestamp range.
 * Handles expressions like "上个月" (last month), "上周" (last week), etc.
 */
export function parseRelativeDateExpression(query: string): { start?: number; end?: number } | null {
  const now = Date.now();
  const patterns: Record<string, () => { start: number; end: number }> = {
    '上个月|last month|上月': () => {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 1);
      const start = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
      return { start, end };
    },
    '上周|last week|上个星期': () => {
      const d = new Date(now);
      const dayOfWeek = d.getDay();
      const diffToLastMonday = dayOfWeek === 0 ? 6 : dayOfWeek + 6;
      const lastMonday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - diffToLastMonday);
      const start = lastMonday.getTime();
      const end = start + 7 * 24 * 3600 * 1000 - 1;
      return { start, end };
    },
    '昨天|yesterday': () => {
      const d = new Date(now);
      const yesterday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1);
      const start = yesterday.getTime();
      const end = start + 24 * 3600 * 1000 - 1;
      return { start, end };
    },
    '今天|today': () => {
      const d = new Date(now);
      const todayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      return { start: todayStart, end: now };
    },
    '本周|this week|这个星期': () => {
      const d = new Date(now);
      const dayOfWeek = d.getDay();
      const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - diffToMonday);
      return { start: monday.getTime(), end: now };
    },
    '本月|this month|这个月': () => {
      const d = new Date(now);
      const start = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
      return { start, end: now };
    },
  };

  for (const [key, fn] of Object.entries(patterns)) {
    if (new RegExp(key, 'i').test(query)) {
      return fn();
    }
  }

  return null;
}

/**
 * Get current date string for LLM context.
 */
export function getDateContext(): string {
  return new Date().toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });
}

/**
 * Lightweight markdown-to-HTML renderer.
 * Handles: bold, italic, code, code blocks, lists, links, headers, line breaks.
 */
export function renderMarkdown(text: string): string {
  let html = text;

  // Code blocks (must be before inline code)
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    return `<pre><code>${escapeHtml(code.trim())}</code></pre>`;
  });

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Bold
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // Italic
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // Headers
  html = html.replace(/^### (.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^## (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^# (.+)$/gm, '<h2>$1</h2>');

  // Unordered lists
  html = html.replace(/^[\-\*] (.+)$/gm, '<li>$1</li>');
  // Ordered lists
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
  // Wrap consecutive <li> in <ul>
  html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

  // Plain URLs → clickable links
  html = html.replace(/(?<!["'>])(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');

  // Line breaks
  html = html.replace(/\n\n/g, '</p><p>');
  html = html.replace(/\n/g, '<br/>');

  // Wrap in paragraph if not already wrapped in block elements
  if (!/^<(p|pre|ul|ol|h[1-4]|li)/.test(html.trim())) {
    html = `<p>${html}</p>`;
  }

  return html;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
