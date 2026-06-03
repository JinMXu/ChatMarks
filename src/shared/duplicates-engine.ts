import { getAllBookmarks, deleteBookmark, deleteEmbedding, getMeta, setMeta, getAllEmbeddings } from './db';
import { cosineSimilarity } from './utils';
import type { BookmarkNode, EmbeddingEntry } from './types';

// --- Types ---

export interface DuplicateItem {
  bookmarkId: string;
  title: string;
  url: string;
  path: string;
  dateAdded: number;
}

export interface DuplicateSet {
  normalizedUrl: string;
  originalUrls: string[];
  items: DuplicateItem[];
  detectionMethod: 'exact' | 'near';
}

// --- URL Normalization ---

const TRACKING_PARAMS = new Set([
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'fbclid', 'gclid', 'ref', 'source', 'mc_cid', 'mc_eid',
  '_ga', '_gl', 'gclsrc', 'dclid', 'msclkid', 'twclid',
  'igshid', 'wd', 'eq',
]);

function normalizeUrl(rawUrl: string): string {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return rawUrl.toLowerCase().trim();
  }

  // Lowercase hostname + pathname
  url.hostname = url.hostname.toLowerCase();
  url.pathname = url.pathname.toLowerCase();

  // Strip trailing slash from pathname
  if (url.pathname.length > 1 && url.pathname.endsWith('/')) {
    url.pathname = url.pathname.slice(0, -1);
  }

  // Strip fragment
  url.hash = '';

  // Strip tracking params and sort remaining
  const params = new URLSearchParams(url.search);
  for (const key of [...params.keys()]) {
    if (TRACKING_PARAMS.has(key.toLowerCase())) {
      params.delete(key);
    }
  }
  params.sort();
  url.search = params.toString();

  return url.toString();
}

function bookmarkToDuplicateItem(b: BookmarkNode): DuplicateItem {
  return {
    bookmarkId: b.id,
    title: b.title,
    url: b.url || '',
    path: b.path,
    dateAdded: b.dateAdded,
  };
}

// --- Exact Duplicate Detection ---

function detectExactDuplicates(bookmarks: BookmarkNode[]): DuplicateSet[] {
  const map = new Map<string, DuplicateItem[]>();

  for (const b of bookmarks) {
    if (!b.url) continue;
    const normalized = normalizeUrl(b.url);
    const list = map.get(normalized) || [];
    list.push(bookmarkToDuplicateItem(b));
    map.set(normalized, list);
  }

  const result: DuplicateSet[] = [];
  for (const [normalizedUrl, items] of map) {
    if (items.length >= 2) {
      result.push({
        normalizedUrl,
        originalUrls: [...new Set(items.map((i) => i.url))],
        items,
        detectionMethod: 'exact',
      });
    }
  }

  return result;
}

// --- Near Duplicate Detection ---

function detectNearDuplicates(
  bookmarks: BookmarkNode[],
  embeddings: EmbeddingEntry[],
  threshold = 0.95,
): DuplicateSet[] {
  const embeddingMap = new Map<string, number[]>();
  for (const e of embeddings) {
    embeddingMap.set(e.bookmarkId, e.vector);
  }

  const candidates = bookmarks.filter((b) => b.url && embeddingMap.has(b.id));
  if (candidates.length < 2) return [];

  // Pairwise cosine similarity
  const edges: [string, string, number][] = [];
  for (let i = 0; i < candidates.length; i++) {
    const a = candidates[i];
    const va = embeddingMap.get(a.id)!;
    for (let j = i + 1; j < candidates.length; j++) {
      const b = candidates[j];
      const vb = embeddingMap.get(b.id)!;
      const sim = cosineSimilarity(va, vb);
      if (sim >= threshold) {
        edges.push([a.id, b.id, sim]);
      }
    }
  }

  if (edges.length === 0) return [];

  // Union-find clustering
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    const p = parent.get(x);
    if (p === undefined) {
      parent.set(x, x);
      return x;
    }
    if (p !== x) {
      parent.set(x, find(p));
    }
    return parent.get(x)!;
  };
  const union = (x: string, y: string) => {
    const rx = find(x);
    const ry = find(y);
    if (rx !== ry) parent.set(rx, ry);
  };

  for (const [a, b] of edges) {
    union(a, b);
  }

  // Group by root
  const groups = new Map<string, string[]>();
  for (const b of candidates) {
    const root = find(b.id);
    const list = groups.get(root) || [];
    list.push(b.id);
    groups.set(root, list);
  }

  const result: DuplicateSet[] = [];
  const bookmarkMap = new Map(bookmarks.map((b) => [b.id, b]));
  for (const ids of groups.values()) {
    if (ids.length < 2) continue;
    const items = ids
      .map((id) => {
        const b = bookmarkMap.get(id);
        return b ? bookmarkToDuplicateItem(b) : null;
      })
      .filter((i): i is DuplicateItem => i !== null);

    if (items.length >= 2) {
      result.push({
        normalizedUrl: '',
        originalUrls: [...new Set(items.map((i) => i.url))],
        items,
        detectionMethod: 'near',
      });
    }
  }

  return result;
}

// --- Main Detection Function ---

export async function runDuplicatesDetection(
  locale: 'en' | 'zh-CN',
  onProgress?: (message: string) => void,
): Promise<DuplicateSet[]> {
  onProgress?.(locale === 'zh-CN' ? '正在读取书签...' : 'Reading bookmarks...');

  const bookmarks = await getAllBookmarks();
  if (bookmarks.length === 0) return [];

  onProgress?.(locale === 'zh-CN' ? `正在分析 ${bookmarks.length} 个书签...` : `Analyzing ${bookmarks.length} bookmarks...`);

  const exactDupes = detectExactDuplicates(bookmarks);

  // Near-duplicate detection (only if embeddings exist)
  let nearDupes: DuplicateSet[] = [];
  if (bookmarks.some((b) => b.indexed)) {
    onProgress?.(locale === 'zh-CN' ? '正在检测相似书签...' : 'Detecting near-duplicates...');
    try {
      const embeddings = await getAllEmbeddings();
      nearDupes = detectNearDuplicates(bookmarks, embeddings);
    } catch {
      // Near-duplicate detection is best-effort
    }
  }

  // Sort exact dupes by item count descending
  exactDupes.sort((a, b) => b.items.length - a.items.length);

  return [...exactDupes, ...nearDupes];
}

// --- Batch Delete ---

export async function runDeleteDuplicates(
  bookmarkIds: string[],
): Promise<{ deleted: number; errors: string[] }> {
  const errors: string[] = [];

  for (const id of bookmarkIds) {
    try {
      // Remove from Chrome bookmarks
      await chrome.bookmarks.remove(id);
    } catch (e) {
      // Bookmark may have already been deleted or is a folder
      errors.push(`${id}: ${String(e)}`);
    }

    try {
      await deleteBookmark(id);
      await deleteEmbedding(id);
    } catch {
      // IndexedDB cleanup is best-effort
    }
  }

  // Clean up bookmark_hashes meta for deleted bookmarks
  try {
    const hashes = (await getMeta('bookmark_hashes')) as Record<string, string> | undefined;
    if (hashes) {
      for (const id of bookmarkIds) {
        delete hashes[id];
      }
      await setMeta('bookmark_hashes', hashes);
    }
  } catch {
    // Best-effort
  }

  return { deleted: bookmarkIds.length - errors.length, errors };
}
