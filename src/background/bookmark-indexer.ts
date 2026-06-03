import { flattenBookmarkTree, simpleHash } from '@/shared/utils';
import { putBookmarks, getBookmarkCount, clearAllBookmarks, setMeta, getMeta } from '@/shared/db';
import type { BookmarkNode, IndexStatus } from '@/shared/types';
import { INDEXING_BATCH_SIZE, INDEXING_BATCH_DELAY_MS } from '@/shared/constants';
import { embed } from './embedding-provider';
import { putEmbeddings, deleteEmbedding, getAllEmbeddings } from '@/shared/db';
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

    // Get existing bookmarks for diff
    const stored = await getMeta('bookmark_hashes') as Record<string, string> | undefined;
    const oldHashes: Record<string, string> = stored || {};
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
    const existingEmbeddings = await getAllEmbeddings();
    const embeddedIds = new Set(existingEmbeddings.map((e) => e.bookmarkId));
    console.log(`[ChatMarks] Existing embeddings in DB: ${existingEmbeddings.length}`);
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

    console.log(`[ChatMarks] Final toEmbed: ${toEmbed.length}, oldHashes: ${Object.keys(oldHashes).length}, embeddings: ${existingEmbeddings.length}`);

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
    const hashesToSave: Record<string, string> = {};
    for (const b of bookmarks) {
      if (!toEmbed.some((e) => e.id === b.id)) {
        hashesToSave[b.id] = b.hash;
      }
    }
    await setMeta('bookmark_hashes', hashesToSave);

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

        // Persist hashes for this batch so they survive a mid-indexing crash
        const currentHashes = (await getMeta('bookmark_hashes') as Record<string, string>) || {};
        for (const b of batch) {
          currentHashes[b.id] = b.hash;
        }
        await setMeta('bookmark_hashes', currentHashes);

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
 * Incremental update for a single bookmark.
 */
export async function indexBookmark(node: chrome.bookmarks.BookmarkTreeNode): Promise<void> {
  if (!node.url) return; // Skip folders

  const bookmarks = flattenBookmarkTree([node]);
  if (bookmarks.length === 0) return;

  const b = bookmarks[0];
  await putBookmarks([b]);

  // Update hash
  const hashes = (await getMeta('bookmark_hashes') as Record<string, string>) || {};
  hashes[b.id] = b.hash;
  await setMeta('bookmark_hashes', hashes);

  // Generate embedding
  try {
    const vectors = await embed([b.richText]);
    await putEmbeddings({
      bookmarkId: b.id,
      vector: vectors[0],
      indexedAt: Date.now(),
    });
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

  const hashes = (await getMeta('bookmark_hashes') as Record<string, string>) || {};
  delete hashes[id];
  await setMeta('bookmark_hashes', hashes);
}
