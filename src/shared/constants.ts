/** Database name for IndexedDB */
export const DB_NAME = 'chatmarks-db';
export const DB_VERSION = 1;

/** Object store names */
export const STORE_BOOKMARKS = 'bookmarks';
export const STORE_EMBEDDINGS = 'embeddings';
export const STORE_CONVERSATIONS = 'conversations';
export const STORE_META = 'meta';

/** Embedding dimensions for text-embedding-3-small */
export const EMBEDDING_DIMS = 1536;

/** Chrome storage keys */
export const STORAGE_KEY_SETTINGS = 'chatmarks_settings';
export const STORAGE_KEY_LAST_SESSION = 'chatmarks_last_session';

/** Chrome runtime message namespace (optional prefix) */
export const MSG_PREFIX = 'chatmarks:';

/** Maximum bookmarks to send to LLM in degraded (no-index) mode */
export const MAX_BOOKMARKS_LLM_FALLBACK = 500;

/** Default top-K for vector search */
export const DEFAULT_TOP_K = 20;

/** Offscreen document path */
export const OFFSCREEN_DOCUMENT_PATH = '/offscreen.html';

/** Timing constants */
export const INDEXING_BATCH_SIZE = 10;
export const INDEXING_BATCH_DELAY_MS = 100;
