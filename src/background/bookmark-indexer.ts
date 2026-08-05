import { flattenBookmarkTree, simpleHash } from '@/shared/utils';
import { putBookmarks, getBookmarkCount, clearAllBookmarks, setMeta, getMeta } from '@/shared/db';
import type { BookmarkNode, IndexStatus } from '@/shared/types';
import { INDEXING_BATCH_SIZE, INDEXING_BATCH_DELAY_MS } from '@/shared/constants';
import { embed } from './embedding-provider';
import { putEmbeddings, deleteEmbedding, getAllEmbeddingKeys } from '@/shared/db';
import { type EmbeddingEntry } from '@/shared/types';

let currentStatus: IndexStatus = {
  total: 0,
  indexed: 0,
  phase: 'idle',
};

export function getIndexStatus(): IndexStatus {
  return { ...currentStatus };
}

function updateStatus(partial: Partial<IndexStatus>) {
  currentStatus = { ...currentStatus, ...partial };
  chrome.runtime.sendMessage({ type: 'INDEX_STATUS', status: currentStatus }).catch(() => {});
}

// Module-level cache of the 'bookmark_hashes' meta entry. It is the single
// source of truth: startIndexing and the watcher-triggered
// indexBookmark/removeBookmarkFromIndex can run concurrently, and routing all
// reads/writes through this one object avoids lost updates from concurrent
// read-modify-write on the stored meta entry.
let hashCache: Record<string, string> | null = null;

async function getHashCache(): Promise<Record<string, string>> {
  if (hashCache === null) {
    const stored = (await getMeta('bookmark_hashes')) as Record<string, string> | undefined;
    hashCache = stored || {};
  }
  return hashCache;
}

async function persistHashCache(): Promise<void> {
  if (hashCache) {
    await setMeta('bookmark_hashes', hashCache);
  }
}

/**
 * Full indexing: scan all bookmarks, compute deltas, generate embeddings.
 */
export async function startIndexing(): Promise<void> {
  if (currentStatus.phase === 'scanning' || currentStatus.phase === 'embedding') {
    console.log('[ChatMarks] Indexing already in progress, skipping');
    return; // Already running
  }

  try {
    updateStatus({ phase: 'scanning' });

    const tree = await chrome.bookmarks.getTree();
    const bookmarks = flattenBookmarkTree(tree);

    console.log(`[ChatMarks] Indexing: ${bookmarks.length} total bookmarks found`);
    updateStatus({ total: bookmarks.length, indexed: 0 });

    // Get existing bookmarks for diff (read once from the module-level cache)
    const oldHashes = await getHashCache();
    const newHashes: Record<string, string> = {};

    const toEmbed: BookmarkNode[] = [];
    const toRemove: string[] = [];

    // Find new/changed bookmarks
    for (const b of bookmarks) {
      newHashes[b.id] = b.hash;
      if (!oldHashes[b.id] || oldHashes[b.id] !== b.hash) {
        b.indexed = false;
        toEmbed.push(b);
      } else {
        b.indexed = true;
      }
    }

    console.log(`[ChatMarks] Hash compare: ${toEmbed.length} new/changed, ${bookmarks.length - toEmbed.length} matching`);

    // Cross-check: bookmarks with matching hash but missing embedding need re-embedding
    const existingEmbeddingIds = await getAllEmbeddingKeys();
    const embeddedIds = new Set(existingEmbeddingIds);
    console.log(`[ChatMarks] Existing embeddings in DB: ${existingEmbeddingIds.length}`);
    const staleCount = toEmbed.length;
    for (let i = bookmarks.length - 1; i >= 0; i--) {
      const b = bookmarks[i];
      if (b.indexed && !embeddedIds.has(b.id)) {
        b.indexed = false;
        toEmbed.push(b);
      }
    }
    if (toEmbed.length > staleCount) {
      console.log(`[ChatMarks] Found ${toEmbed.length - staleCount} bookmarks with stale hashes but no embeddings, re-indexing them`);
    }

    console.log(`[ChatMarks] Final toEmbed: ${toEmbed.length}, oldHashes: ${Object.keys(oldHashes).length}, embeddings: ${existingEmbeddingIds.length}`);

    // Find removed bookmarks (in old but not in new)
    for (const id of Object.keys(oldHashes)) {
      if (!newHashes[id]) {
        toRemove.push(id);
      }
    }

    // Store bookmarks, but only save hashes for already-indexed ones.
    // Hashes for toEmbed will be saved after successful embedding.
    const allBookmarks = bookmarks.map((b) => ({
      ...b,
      indexed: b.indexed || (!oldHashes[b.id]),
    }));
    await putBookmarks(allBookmarks);

    // Save hashes only for bookmarks that don't need embedding
    const toEmbedIds = new Set(toEmbed.map((e) => e.id));
    const hashesToSave: Record<string, string> = {};
    for (const b of bookmarks) {
      if (!toEmbedIds.has(b.id)) {
        hashesToSave[b.id] = b.hash;
      }
    }
    // Replace the cache contents in place so it stays the single source of truth
    for (const id of Object.keys(oldHashes)) {
      delete oldHashes[id];
    }
    Object.assign(oldHashes, hashesToSave);
    await persistHashCache();

    // Remove embeddings for deleted bookmarks
    for (const id of toRemove) {
      await deleteEmbedding(id);
    }

    updateStatus({ total: toEmbed.length, indexed: 0 });

    if (toEmbed.length === 0) {
      updateStatus({ phase: 'complete' });
      return;
    }

    // Generate embeddings in batches
    updateStatus({ phase: 'embedding' });

    for (let i = 0; i < toEmbed.length; i += INDEXING_BATCH_SIZE) {
      const batch = toEmbed.slice(i, i + INDEXING_BATCH_SIZE);
      const texts = batch.map((b) => b.richText);

      try {
        const vectors = await embed(texts);
        const entries: EmbeddingEntry[] = batch.map((b, j) => ({
          bookmarkId: b.id,
          vector: vectors[j],
          indexedAt: Date.now(),
        }));

        await putEmbeddings(entries);

        // Persist hashes for this batch so they survive a mid-indexing crash.
        // oldHashes is the module-level cache loaded once above; mutate it
        // locally and write it back without re-reading from the DB.
        for (const b of batch) {
          oldHashes[b.id] = b.hash;
        }
        await persistHashCache();

        updateStatus({
          indexed: Math.min(i + INDEXING_BATCH_SIZE, toEmbed.length),
        });
      } catch (err) {
        console.error('Embedding batch failed:', err);
        updateStatus({ phase: 'error', error: String(err) });
        return;
      }

      // Small delay between batches to avoid rate limiting
      if (i + INDEXING_BATCH_SIZE < toEmbed.length) {
        await new Promise((r) => setTimeout(r, INDEXING_BATCH_DELAY_MS));
      }
    }

    updateStatus({ phase: 'complete', indexed: toEmbed.length });
  } catch (err) {
    console.error('Indexing failed:', err);
    updateStatus({ phase: 'error', error: String(err) });
  }
}

/**
 * Walk up the bookmark tree to rebuild the node's folder path, using the same
 * join rule as flattenBookmarkTree so single-bookmark indexing produces the
 * same path/hash as a full indexing pass.
 */
async function getParentPath(node: chrome.bookmarks.BookmarkTreeNode): Promise<string> {
  const titles: string[] = [];
  let parentId = node.parentId;
  while (parentId) {
    try {
      const results = await chrome.bookmarks.get(parentId);
      const parent = results?.[0];
      if (!parent) break;
      titles.unshift(parent.title);
      parentId = parent.parentId;
    } catch {
      break; // Parent may have been removed concurrently
    }
  }

  // Same join rule as flattenBookmarkTree: skip empty leading segments
  let path = '';
  for (const title of titles) {
    path = path ? `${path} > ${title}` : title;
  }
  return path;
}

/**
 * Incremental update for a single bookmark.
 */
export async function indexBookmark(node: chrome.bookmarks.BookmarkTreeNode): Promise<void> {
  if (!node.url) return; // Skip folders

  const parentPath = await getParentPath(node);
  const bookmarks = flattenBookmarkTree([node], parentPath);
  if (bookmarks.length === 0) return;

  const b = bookmarks[0];
  await putBookmarks([b]);

  // Update hash
  const hashes = await getHashCache();
  hashes[b.id] = b.hash;
  await persistHashCache();

  // Generate embedding
  try {
    const vectors = await embed([b.richText]);
    await putEmbeddings([{
      bookmarkId: b.id,
      vector: vectors[0],
      indexedAt: Date.now(),
    }]);
  } catch (err) {
    console.error('Failed to embed bookmark:', err);
  }
}

/**
 * Delete bookmark from index.
 */
export async function removeBookmarkFromIndex(id: string): Promise<void> {
  const { deleteBookmark, deleteEmbedding } = await import('@/shared/db');
  await deleteBookmark(id);
  await deleteEmbedding(id);

  const hashes = await getHashCache();
  delete hashes[id];
  await persistHashCache();
}
