import { flattenBookmarkTree } from '@/shared/utils';
import { chatCompletion, getSettings } from '@/background/llm-client';
import { buildOrganizePrompt } from '@/background/prompt-templates';
import type { Locale } from '@/shared/i18n';
import type { OrganizeSuggestion, OrganizeGroup } from '@/shared/types';

interface RawBookmark {
  id: string;
  title: string;
  url: string;
  path: string;
}

export type ProgressCallback = (phase: string, message: string) => void;

/**
 * Main entry point: read all bookmarks, ask LLM for suggestions.
 * Runs entirely from the calling page (not SW).
 */
export async function runOrganize(
  locale: Locale,
  onProgress: ProgressCallback,
): Promise<OrganizeSuggestion[]> {
  onProgress('scanning', locale === 'zh-CN' ? '正在读取书签...' : 'Reading bookmarks...');

  const tree = await chrome.bookmarks.getTree();
  const all = flattenBookmarkTree(tree).filter((b) => b.url);

  if (all.length === 0) {
    throw new Error(locale === 'zh-CN' ? '没有找到书签' : 'No bookmarks found');
  }

  const bookmarks: RawBookmark[] = all.map((b) => ({
    id: b.id,
    title: b.title || '(no title)',
    url: b.url || '',
    path: b.path || '',
  }));

  // Verify settings are configured
  const settings = await getSettings();
  if (!settings.apiKey) {
    throw new Error(
      locale === 'zh-CN'
        ? '请先在设置中配置 API Key'
        : 'Please configure API Key in settings first',
    );
  }

  onProgress(
    'sending',
    locale === 'zh-CN'
      ? `正在发送 ${bookmarks.length} 个书签给 AI...`
      : `Sending ${bookmarks.length} bookmarks to AI...`,
  );

  const messages = buildOrganizePrompt(bookmarks, locale);

  onProgress(
    'waiting',
    locale === 'zh-CN' ? 'AI 正在分析中，请稍候...' : 'AI is analyzing, please wait...',
  );

  const response = await chatCompletion(messages, { maxTokens: 131072, temperature: 0.2 });

  if (!response || response.trim().length === 0) {
    throw new Error('LLM returned empty response');
  }

  const groups = parseOrganizeResponse(response);
  if (!groups || groups.length === 0) {
    throw new Error(
      `LLM returned no valid suggestions.\nFirst 500 chars: ${response.slice(0, 500)}`,
    );
  }

  const suggestions = buildSuggestions(bookmarks, groups);

  if (suggestions.length === 0) {
    throw new Error(
      locale === 'zh-CN'
        ? 'AI 返回的分类中没有匹配到任何书签'
        : 'No bookmarks matched in AI response',
    );
  }

  return suggestions;
}

/** Chrome bookmark tree IDs */
const BOOKMARKS_BAR_ID = '1';

/**
 * Apply the selected suggestions: create folders under Bookmarks Bar,
 * move bookmarks, then clean up empty folders.
 */
export async function applyOrganization(suggestions: OrganizeSuggestion[]): Promise<void> {
  const selected = suggestions.filter((s) => s.selected);
  if (selected.length === 0) return;

  const folderCache = new Map<string, string>();

  for (const s of selected) {
    try {
      const folderId = await ensureFolder(s.suggestedFolder, folderCache);
      await chrome.bookmarks.move(s.bookmarkId, { parentId: folderId });
    } catch (err) {
      console.error(`Failed to move bookmark ${s.bookmarkId}:`, err);
    }
  }

  // Clean up all empty folders tree-wide
  await cleanupEmptyFolders();
}

/**
 * Scan entire bookmark tree and delete all empty (childless) folders.
 * Skips system folders (root, bookmarks bar, other bookmarks).
 */
async function cleanupEmptyFolders(): Promise<void> {
  const tree = await chrome.bookmarks.getTree();
  const emptyIds: string[] = [];
  findEmptyFolders(tree, emptyIds);

  // Delete in reverse order (deepest first) to handle nested empties
  for (const id of emptyIds.reverse()) {
    try {
      await chrome.bookmarks.remove(id);
    } catch {
      // ignore
    }
  }
}

function findEmptyFolders(
  nodes: chrome.bookmarks.BookmarkTreeNode[],
  result: string[],
): void {
  for (const node of nodes) {
    if (node.url) continue; // not a folder
    const children = node.children || [];
    // Recurse first (bottom-up)
    findEmptyFolders(children, result);
    // Then check if this folder is now empty
    if (children.length === 0) {
      // Skip system root folders
      if (node.id !== '0' && node.id !== '1' && node.id !== '2') {
        result.push(node.id);
      }
    }
  }
}

// ── Internal helpers ──────────────────────────────────────────

function parseOrganizeResponse(text: string): OrganizeGroup[] | null {
  let json = text.trim();

  // 1. Extract from markdown code fences
  const fenceMatch = json.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) json = fenceMatch[1].trim();

  // 2. Direct parse
  let parsed = tryParse(json);
  if (parsed) return extractFolders(parsed);

  // 3. Find outermost JSON object
  const objMatch = json.match(/\{(?:[^{}]|(?:\{[^{}]*\}))*\}/);
  if (objMatch) {
    parsed = tryParse(objMatch[0]);
    if (parsed) return extractFolders(parsed);
  }

  // 4. Find "folders" key and wrap
  const foldersMatch = json.match(/"folders"\s*:\s*\[([\s\S]*?)\](?=\s*[,\}])/);
  if (foldersMatch) {
    parsed = tryParse(`{"folders":[${foldersMatch[1]}]}`);
    if (parsed) return extractFolders(parsed);
  }

  return null;
}

function tryParse(str: string): any | null {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

function extractFolders(parsed: any): OrganizeGroup[] | null {
  if (parsed?.folders && Array.isArray(parsed.folders)) {
    const valid = parsed.folders.filter(
      (f: any) => f.folder && Array.isArray(f.bookmarkIds) && f.bookmarkIds.length > 0,
    );
    return valid.length > 0 ? valid : null;
  }
  return null;
}

function buildSuggestions(
  bookmarks: RawBookmark[],
  groups: OrganizeGroup[],
): OrganizeSuggestion[] {
  const suggestions: OrganizeSuggestion[] = [];

  for (const group of groups) {
    for (const idOrIndex of group.bookmarkIds) {
      const b = resolveBookmark(bookmarks, idOrIndex);
      if (b) {
        suggestions.push({
          bookmarkId: b.id,
          title: b.title,
          url: b.url,
          currentPath: b.path,
          suggestedFolder: group.folder,
          reason: group.reason,
          selected: true,
        });
      }
    }
  }

  return suggestions;
}

function resolveBookmark(
  bookmarks: RawBookmark[],
  ref: string | number,
): RawBookmark | undefined {
  // Try as 1-based index
  const index = typeof ref === 'number' ? ref - 1 : parseInt(String(ref), 10) - 1;
  if (!isNaN(index) && index >= 0 && index < bookmarks.length) {
    return bookmarks[index];
  }

  // Try as direct ID
  const idStr = String(ref);
  return bookmarks.find((b) => b.id === idStr);
}

async function ensureFolder(
  path: string,
  cache: Map<string, string>,
): Promise<string> {
  if (cache.has(path)) return cache.get(path)!;

  const parts = path.split('/').map((p) => p.trim()).filter(Boolean);
  let parentId: string | undefined = BOOKMARKS_BAR_ID;

  for (const part of parts) {
    const key = parentId ? `${parentId}/${part}` : part;
    if (cache.has(key)) {
      parentId = cache.get(key)!;
      continue;
    }

    const existing = await chrome.bookmarks.search({ title: part });
    const found = existing.find(
      (n) => !n.url && n.title === part && n.parentId === parentId,
    );

    if (found) {
      cache.set(key, found.id);
      parentId = found.id;
    } else {
      const created = await chrome.bookmarks.create({
        parentId,
        title: part,
      });
      cache.set(key, created.id);
      parentId = created.id;
    }
  }

  return parentId!;
}
