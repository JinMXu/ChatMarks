import { openDB, type IDBPDatabase } from 'idb';
import {
  DB_NAME,
  DB_VERSION,
  STORE_BOOKMARKS,
  STORE_EMBEDDINGS,
  STORE_CONVERSATIONS,
  STORE_META,
} from './constants';
import type { BookmarkNode, EmbeddingEntry, Conversation } from './types';

let dbInstance: IDBPDatabase | null = null;

export async function getDB(): Promise<IDBPDatabase> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_BOOKMARKS)) {
        db.createObjectStore(STORE_BOOKMARKS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_EMBEDDINGS)) {
        const embStore = db.createObjectStore(STORE_EMBEDDINGS, { keyPath: 'bookmarkId' });
        embStore.createIndex('by_indexedAt', 'indexedAt');
      }
      if (!db.objectStoreNames.contains(STORE_CONVERSATIONS)) {
        db.createObjectStore(STORE_CONVERSATIONS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: 'key' });
      }
    },
  });

  return dbInstance;
}

// --- Bookmark CRUD ---

export async function getAllBookmarks(): Promise<BookmarkNode[]> {
  const db = await getDB();
  return db.getAll(STORE_BOOKMARKS);
}

export async function getBookmark(id: string): Promise<BookmarkNode | undefined> {
  const db = await getDB();
  return db.get(STORE_BOOKMARKS, id);
}

export async function getBookmarksByIds(ids: string[]): Promise<BookmarkNode[]> {
  const db = await getDB();
  const tx = db.transaction(STORE_BOOKMARKS, 'readonly');
  const results = await Promise.all(ids.map(id => tx.store.get(id)));
  return results.filter((b): b is BookmarkNode => b !== undefined);
}

export async function putBookmarks(bookmarks: BookmarkNode[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(STORE_BOOKMARKS, 'readwrite');
  for (const b of bookmarks) {
    tx.store.put(b);
  }
  await tx.done;
}

export async function deleteBookmark(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORE_BOOKMARKS, id);
}

export async function clearAllBookmarks(): Promise<void> {
  const db = await getDB();
  await db.clear(STORE_BOOKMARKS);
}

export async function getBookmarkCount(): Promise<number> {
  const db = await getDB();
  return db.count(STORE_BOOKMARKS);
}

// --- Embedding CRUD ---

export async function putEmbedding(entry: EmbeddingEntry): Promise<void> {
  const db = await getDB();
  await db.put(STORE_EMBEDDINGS, entry);
}

export async function putEmbeddings(entries: EmbeddingEntry[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(STORE_EMBEDDINGS, 'readwrite');
  for (const e of entries) {
    tx.store.put(e);
  }
  await tx.done;
}

export async function getEmbedding(bookmarkId: string): Promise<EmbeddingEntry | undefined> {
  const db = await getDB();
  return db.get(STORE_EMBEDDINGS, bookmarkId);
}

export async function getAllEmbeddings(): Promise<EmbeddingEntry[]> {
  const db = await getDB();
  return db.getAll(STORE_EMBEDDINGS);
}

export async function getEmbeddingCount(): Promise<number> {
  const db = await getDB();
  return db.count(STORE_EMBEDDINGS);
}

export async function deleteEmbedding(bookmarkId: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORE_EMBEDDINGS, bookmarkId);
}

// --- Conversation CRUD ---

export async function putConversation(conv: Conversation): Promise<void> {
  const db = await getDB();
  await db.put(STORE_CONVERSATIONS, conv);
}

export async function getConversation(id: string): Promise<Conversation | undefined> {
  const db = await getDB();
  return db.get(STORE_CONVERSATIONS, id);
}

export async function getAllConversations(): Promise<Conversation[]> {
  const db = await getDB();
  return db.getAll(STORE_CONVERSATIONS);
}

export async function deleteConversation(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORE_CONVERSATIONS, id);
}

// --- Meta key-value store ---

export async function getMeta(key: string): Promise<unknown> {
  const db = await getDB();
  const entry = await db.get(STORE_META, key);
  return entry?.value;
}

export async function setMeta(key: string, value: unknown): Promise<void> {
  const db = await getDB();
  await db.put(STORE_META, { key, value });
}
