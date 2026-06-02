import { indexBookmark, removeBookmarkFromIndex, startIndexing } from './bookmark-indexer';

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

  chrome.bookmarks.onRemoved.addListener((id) => {
    removeBookmarkFromIndex(id).catch(console.error);
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
