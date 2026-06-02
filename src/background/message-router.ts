import type { RuntimeMessage } from '@/shared/types';
import { searchBookmarks } from './search-engine';
import { getIndexStatus } from './bookmark-indexer';
import { startIndexing } from './bookmark-indexer';
import { getAllConversations, getConversation, deleteConversation } from '@/shared/db';
import type { Settings } from '@/shared/types';
import { DEFAULT_SETTINGS } from '@/shared/types';
import { STORAGE_KEY_SETTINGS } from '@/shared/constants';
import { getBookmarkCount } from '@/shared/db';

type SendResponse = (response: unknown) => void;

export async function messageRouter(
  message: RuntimeMessage,
  _sender: chrome.runtime.MessageSender,
  sendResponse: SendResponse,
): Promise<void> {
  switch (message.type) {
    case 'SEARCH': {
      handleSearch(message.query, message.conversationId);
      sendResponse({ success: true });
      return;
    }

    case 'GET_INDEX_STATUS': {
      sendResponse({ type: 'INDEX_STATUS', status: getIndexStatus() });
      return;
    }

    case 'START_INDEXING': {
      startIndexing().catch(console.error);
      sendResponse({ success: true });
      return;
    }

    case 'GET_CONVERSATIONS': {
      const conversations = await getAllConversations();
      sendResponse({ type: 'CONVERSATIONS', conversations });
      return;
    }

    case 'GET_CONVERSATION': {
      const conversation = await getConversation(message.conversationId);
      sendResponse({ type: 'CONVERSATION', conversation: conversation ?? null });
      return;
    }

    case 'DELETE_CONVERSATION': {
      await deleteConversation(message.conversationId);
      sendResponse({ success: true });
      return;
    }

    case 'GET_SETTINGS': {
      const stored = await chrome.storage.local.get(STORAGE_KEY_SETTINGS);
      const settings: Settings = stored[STORAGE_KEY_SETTINGS] ?? DEFAULT_SETTINGS;
      sendResponse({ type: 'SETTINGS', settings });
      return;
    }

    case 'SAVE_SETTINGS': {
      const stored = await chrome.storage.local.get(STORAGE_KEY_SETTINGS);
      const current: Settings = stored[STORAGE_KEY_SETTINGS] ?? DEFAULT_SETTINGS;
      const updated = { ...current, ...message.settings };
      await chrome.storage.local.set({ [STORAGE_KEY_SETTINGS]: updated });
      sendResponse({ success: true });
      return;
    }

    case 'GET_BOOKMARKS_COUNT': {
      const count = await getBookmarkCount();
      sendResponse({ type: 'BOOKMARKS_COUNT', count });
      return;
    }

    default:
      sendResponse({ error: 'Unknown message type' });
  }
}

async function handleSearch(
  query: string,
  conversationId?: string,
): Promise<void> {
  searchBookmarks(query, conversationId).catch((err) => {
    chrome.runtime.sendMessage({
      type: 'SEARCH_ERROR',
      error: String(err),
    });
  });
}
