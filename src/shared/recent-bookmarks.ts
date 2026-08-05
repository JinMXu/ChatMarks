import type { SearchResult } from '@/shared/types';
import { STORAGE_KEY_RECENT_OPENED } from '@/shared/constants';

export interface RecentEntry {
  bookmarkId: string;
  title: string;
  url: string;
  path: string;
  dateAdded: number;
  openedAt: number;
}

const MAX_RECENT = 20;

export async function getRecentOpens(): Promise<RecentEntry[]> {
  const stored = await chrome.storage.local.get(STORAGE_KEY_RECENT_OPENED);
  return (stored[STORAGE_KEY_RECENT_OPENED] || []) as RecentEntry[];
}

// Serialize read-modify-write cycles so rapid consecutive opens don't
// overwrite each other (each recordOpen reads the list written by the
// previous one)
let queue: Promise<unknown> = Promise.resolve();

export function recordOpen(result: SearchResult): Promise<void> {
  const task = queue.then(() => recordOpenInternal(result));
  // Keep the queue alive even if a write fails
  queue = task.catch(() => {});
  return task;
}

async function recordOpenInternal(result: SearchResult): Promise<void> {
  const list = await getRecentOpens();

  // Remove existing entry with same bookmarkId
  const filtered = list.filter((e) => e.bookmarkId !== result.bookmarkId);

  // Prepend new entry
  filtered.unshift({
    bookmarkId: result.bookmarkId,
    title: result.title,
    url: result.url,
    path: result.path,
    dateAdded: result.dateAdded,
    openedAt: Date.now(),
  });

  // Keep only the most recent MAX_RECENT
  const trimmed = filtered.slice(0, MAX_RECENT);

  await chrome.storage.local.set({ [STORAGE_KEY_RECENT_OPENED]: trimmed });
}
