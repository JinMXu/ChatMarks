import { indexBookmark, removeBookmarkFromIndex, startIndexing } from './bookmark-indexer';
import { flattenBookmarkTree } from '@/shared/utils';

let watcherStarted = false;

export function startBookmarkWatcher(): void {
  if (watcherStarted) return;
  watcherStarted = true;

  chrome.bookmarks.onCreated.addListener((_id, node) => {
    indexBookmark(node).catch(console.error);
  });

  chrome.bookmarks.onChanged.addListener((_id, changeInfo) => {
    // Re-fetch the node to get full data
    chrome.bookmarks.get(_id, (results) => {
      if (results?.[0]) {
        indexBookmark(results[0]).catch(console.error);
      }
    });
  });

  chrome.bookmarks.onRemoved.addListener((id, removeInfo) => {
    // Chrome fires onRemoved only for the root node; when a folder is removed,
    // its descendants are in removeInfo.node.children. Collect every removed
    // bookmark (nodes with a url) and drop them from the index.
    const removedIds = flattenBookmarkTree(removeInfo.node.children ?? []).map((n) => n.id);
    if (removeInfo.node.url) {
      removedIds.unshift(id);
    }
    Promise.all(removedIds.map((removedId) => removeBookmarkFromIndex(removedId))).catch(
      console.error,
    );
  });

  chrome.bookmarks.onMoved.addListener((_id, moveInfo) => {
    // Re-index with updated path
    chrome.bookmarks.get(_id, (results) => {
      if (results?.[0]) {
        indexBookmark(results[0]).catch(console.error);
      }
    });
  });

  // Trigger initial indexing on install/update
  chrome.runtime.onInstalled.addListener(async () => {
    try {
      await startIndexing();
    } catch (err) {
      console.error('Initial indexing failed:', err);
    }
  });
}
