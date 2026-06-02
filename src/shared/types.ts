/** Unique identifier for bookmarks (chrome bookmark id) */
export type BookmarkId = string;

/** Conversation identifier */
export type ConversationId = string;

/** A flattened bookmark with rich metadata */
export interface BookmarkNode {
  id: BookmarkId;
  title: string;
  url?: string;
  dateAdded: number;
  dateLastUsed?: number;
  dateGroupModified?: number;
  /** Full folder path, e.g. "Dev > Rust > Async" */
  path: string;
  /** Concatenated rich text for embedding: title + path + url */
  richText: string;
  /** Content hash for change detection */
  hash: string;
  /** Index status */
  indexed: boolean;
  /** Embedding vector (only stored in vector-store, not here) */
}

/** Embedding vector */
export type EmbeddingVector = number[];

/** Stored embedding entry */
export interface EmbeddingEntry {
  bookmarkId: BookmarkId;
  vector: EmbeddingVector;
  indexedAt: number;
}

/** A single message in a conversation */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  /** Search results attached to this message, if any */
  results?: SearchResult[];
}

/** A search result representing a matched bookmark */
export interface SearchResult {
  bookmarkId: BookmarkId;
  title: string;
  url: string;
  path: string;
  dateAdded: number;
  /** LLM-provided explanation of why this matches */
  matchReason: string;
}

/** A conversation session */
export interface Conversation {
  id: ConversationId;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

/** Index status for reporting to UI */
export interface IndexStatus {
  total: number;
  indexed: number;
  phase: 'idle' | 'scanning' | 'embedding' | 'complete' | 'error';
  error?: string;
}

/** Settings stored in chrome.storage.local */
export interface Settings {
  apiKey: string;
  apiBaseUrl: string;
  chatModel: string;
  embeddingModel: string;
  embeddingMode: 'remote' | 'local';
  /** Max bookmarks to send to LLM in degraded mode */
  maxBookmarksForLLM: number;
  /** Top-K candidates from vector search */
  vectorSearchTopK: number;
  /** UI language */
  language: string;
}

export const DEFAULT_SETTINGS: Settings = {
  apiKey: '',
  apiBaseUrl: 'https://api.openai.com/v1',
  chatModel: 'gpt-4o-mini',
  embeddingModel: 'text-embedding-3-small',
  embeddingMode: 'remote',
  maxBookmarksForLLM: 500,
  vectorSearchTopK: 20,
  language: '',
};

/** Messages sent between SW and UI */
export type RuntimeMessage =
  | { type: 'SEARCH'; query: string; conversationId?: string }
  | { type: 'SEARCH_STREAM'; chunk: string }
  | { type: 'SEARCH_RESULT'; results: SearchResult[] }
  | { type: 'SEARCH_ERROR'; error: string }
  | { type: 'SEARCH_DONE' }
  | { type: 'GET_INDEX_STATUS' }
  | { type: 'INDEX_STATUS'; status: IndexStatus }
  | { type: 'START_INDEXING' }
  | { type: 'GET_CONVERSATIONS' }
  | { type: 'CONVERSATIONS'; conversations: Conversation[] }
  | { type: 'GET_CONVERSATION'; conversationId: string }
  | { type: 'CONVERSATION'; conversation: Conversation }
  | { type: 'DELETE_CONVERSATION'; conversationId: string }
  | { type: 'GET_SETTINGS' }
  | { type: 'SETTINGS'; settings: Settings }
  | { type: 'SAVE_SETTINGS'; settings: Partial<Settings> }
  | { type: 'OPEN_SIDEPANEL' }
  | { type: 'GET_BOOKMARKS_COUNT' }
  | { type: 'BOOKMARKS_COUNT'; count: number }
  | { type: 'ORGANIZE_START'; locale?: string }
  | { type: 'ORGANIZE_PROGRESS'; phase: string; message: string }
  | { type: 'ORGANIZE_RESULT'; suggestions: OrganizeSuggestion[] }
  | { type: 'ORGANIZE_ERROR'; error: string }
  | { type: 'ORGANIZE_APPLY'; suggestions: OrganizeSuggestion[] }
  | { type: 'ORGANIZE_APPLIED'; success: boolean };

/** Suggestion from LLM for a single bookmark */
export interface OrganizeSuggestion {
  bookmarkId: string;
  title: string;
  url: string;
  currentPath: string;
  suggestedFolder: string;
  reason: string;
  selected?: boolean;
}

/** Raw LLM response for a group of bookmarks */
export interface OrganizeGroup {
  folder: string;
  bookmarkIds: (string | number)[];
  reason: string;
}
