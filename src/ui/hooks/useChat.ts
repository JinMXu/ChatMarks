import { useState, useEffect, useCallback, useRef } from 'preact/hooks';
import type { ChatMessage, SearchResult } from '@/shared/types';
import { generateId } from '@/shared/utils';
import { STORAGE_KEY_LAST_SESSION } from '@/shared/constants';

type Status = 'idle' | 'searching' | 'error';

interface UseChatReturn {
  messages: ChatMessage[];
  status: Status;
  error: string | null;
  sendMessage: (text: string) => Promise<void>;
  clearChat: () => void;
  openSidePanel: () => void;
}

export function useChat(conversationId?: string): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const assistantMsgRef = useRef<string>('');
  const initializedRef = useRef(false);

  // Always-up-to-date ref for the unmount save fallback
  const messagesRef = useRef<ChatMessage[]>([]);
  messagesRef.current = messages;

  // Save eagerly whenever messages change (not just on unmount)
  // This avoids the stale-closure problem entirely
  useEffect(() => {
    // Skip initial empty save to avoid overwriting restored session with []
    if (!initializedRef.current) return;
    if (messages.length === 0) return;

    chrome.storage.local.set({
      [STORAGE_KEY_LAST_SESSION]: {
        messages,
        conversationId,
        timestamp: Date.now(),
      },
    });
  }, [messages, conversationId]);

  // Also save on unmount as a safety net (uses ref)
  useEffect(() => {
    return () => {
      const current = messagesRef.current;
      if (current.length > 0) {
        chrome.storage.local.set({
          [STORAGE_KEY_LAST_SESSION]: {
            messages: current,
            conversationId,
            timestamp: Date.now(),
          },
        });
      }
    };
  }, []);

  // Restore session on mount
  useEffect(() => {
    chrome.storage.local.get(STORAGE_KEY_LAST_SESSION, (stored) => {
      const session = stored[STORAGE_KEY_LAST_SESSION];
      if (session?.messages && Date.now() - session.timestamp < 3600000) {
        setMessages(session.messages);
      }
      // Mark initialized so the save effect won't skip real updates
      initializedRef.current = true;
    });
  }, []);

  // Listen for streaming responses
  useEffect(() => {
    const listener = (
      message: { type: string; chunk?: string; results?: SearchResult[]; error?: string },
    ) => {
      switch (message.type) {
        case 'SEARCH_STREAM':
          if (message.chunk) {
            assistantMsgRef.current += message.chunk;
            setMessages((prev) => {
              const copy = [...prev];
              const last = copy[copy.length - 1];
              if (last?.role === 'assistant') {
                copy[copy.length - 1] = {
                  ...last,
                  content: assistantMsgRef.current,
                };
              } else {
                copy.push({
                  id: generateId(),
                  role: 'assistant',
                  content: assistantMsgRef.current,
                  timestamp: Date.now(),
                });
              }
              return copy;
            });
          }
          break;

        case 'SEARCH_RESULT':
          if (message.results) {
            setMessages((prev) => {
              const copy = [...prev];
              const last = copy[copy.length - 1];
              if (last?.role === 'assistant') {
                copy[copy.length - 1] = {
                  ...last,
                  results: message.results,
                };
              }
              return copy;
            });
          }
          break;

        case 'SEARCH_DONE':
          setStatus('idle');
          assistantMsgRef.current = '';
          break;

        case 'SEARCH_ERROR':
          setStatus('error');
          setError(message.error || 'Unknown error');
          break;
      }
    };

    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || status === 'searching') return;

      setError(null);
      setStatus('searching');
      assistantMsgRef.current = '';

      const userMsg: ChatMessage = {
        id: generateId(),
        role: 'user',
        content: text.trim(),
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMsg]);

      chrome.runtime.sendMessage({
        type: 'SEARCH',
        query: text.trim(),
        conversationId,
      });
    },
    [status, conversationId],
  );

  const clearChat = useCallback(() => {
    setMessages([]);
    assistantMsgRef.current = '';
    setError(null);
    setStatus('idle');
  }, []);

  const openSidePanel = useCallback(() => {
    chrome.windows.getCurrent((window) => {
      if (window?.id) {
        chrome.sidePanel.open({ windowId: window.id });
        window.close();
      }
    });
  }, []);

  return { messages, status, error, sendMessage, clearChat, openSidePanel };
}
