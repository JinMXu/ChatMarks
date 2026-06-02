import { useState, useEffect, useCallback } from 'preact/hooks';
import type { Conversation, ConversationId } from '@/shared/types';
import { generateId } from '@/shared/utils';

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<ConversationId | undefined>();

  const loadConversations = useCallback(async () => {
    chrome.runtime.sendMessage({ type: 'GET_CONVERSATIONS' }, (response) => {
      if (response?.conversations) {
        const sorted = response.conversations.sort(
          (a: Conversation, b: Conversation) => b.updatedAt - a.updatedAt,
        );
        setConversations(sorted);
      }
    });
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const selectConversation = useCallback((id: ConversationId) => {
    setActiveId(id);
  }, []);

  const createConversation = useCallback(() => {
    setActiveId(undefined);
  }, []);

  const deleteConversation = useCallback(
    async (id: ConversationId) => {
      await chrome.runtime.sendMessage({ type: 'DELETE_CONVERSATION', conversationId: id });
      if (activeId === id) {
        setActiveId(undefined);
      }
      await loadConversations();
    },
    [activeId, loadConversations],
  );

  return {
    conversations,
    activeId,
    selectConversation,
    createConversation,
    deleteConversation,
    refresh: loadConversations,
  };
}
