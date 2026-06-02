import { flattenBookmarkTree, simpleHash } from '@/shared/utils';
import { putBookmarks, getBookmarkCount, clearAllBookmarks, setMeta, getMeta } from '@/shared/db';
import type { BookmarkNode, IndexStatus } from '@/shared/types';
import { INDEXING_BATCH_SIZE, INDEXING_BATCH_DELAY_MS } from '@/shared/constants';
import { embed } from './embedding-provider';
import { putEmbeddings, deleteEmbedding } from '@/shared/db';
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
    return; // Already running
  }

  try {
    updateStatus({ phase: 'scanning' });

    const tree = await chrome.bookmarks.getTree();
    const bookmarks = flattenBookmarkTree(tree);

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

    // Find removed bookmarks (in old but not in new)
    for (const id of Object.keys(oldHashes)) {
      if (!newHashes[id]) {
        toRemove.push(id);
      }
    }

    // Store bookmarks
    const allBookmarks = bookmarks.map((b) => ({
      ...b,
      indexed: b.indexed || (!oldHashes[b.id]),
    }));

    await putBookmarks(allBookmarks);
    await setMeta('bookmark_hashes', newHashes);

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
