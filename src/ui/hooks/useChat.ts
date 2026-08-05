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

  // Always-up-to-date refs so effects never capture stale values
  const messagesRef = useRef<ChatMessage[]>([]);
  messagesRef.current = messages;
  const statusRef = useRef<Status>(status);
  statusRef.current = status;
  const conversationIdRef = useRef(conversationId);
  // The prop always wins when defined; when it's undefined (popup/dashboard,
  // or a fresh sidepanel conversation) we keep the id this hook generated or
  // restored for the current session, so background broadcasts can be matched
  conversationIdRef.current = conversationId ?? conversationIdRef.current;
  // Suppresses saving while a newly selected conversation is being loaded,
  // so old messages are never written under the new conversation id
  const skipSaveRef = useRef(false);
  const prevConversationIdRef = useRef(conversationId);

  // Save eagerly whenever messages change (not just on unmount)
  // This avoids the stale-closure problem entirely
  useEffect(() => {
    // Skip initial empty save to avoid overwriting restored session with []
    if (!initializedRef.current) return;
    // Skip while switching conversations (old messages must not be saved
    // under the new conversation id)
    if (skipSaveRef.current) return;
    // Skip while streaming: every chunk updates messages, which would hit
    // the chrome.storage write quota. The status flip on SEARCH_DONE
    // re-triggers this effect and saves the final state once.
    if (status === 'searching') return;
    if (messages.length === 0) return;

    chrome.storage.local.set({
      [STORAGE_KEY_LAST_SESSION]: {
        messages,
        conversationId: conversationIdRef.current,
        timestamp: Date.now(),
      },
    });
  }, [messages, status]);

  // Also save on unmount as a safety net (uses refs)
  useEffect(() => {
    return () => {
      const current = messagesRef.current;
      if (current.length > 0) {
        chrome.storage.local.set({
          [STORAGE_KEY_LAST_SESSION]: {
            messages: current,
            conversationId: conversationIdRef.current,
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
        // Adopt the session's conversation id (popup→sidepanel handoff), so
        // broadcasts for the in-flight search are recognized as ours
        if (!conversationIdRef.current && session.conversationId) {
          conversationIdRef.current = session.conversationId;
        }
      }
      // Mark initialized so the save effect won't skip real updates
      initializedRef.current = true;
    });
  }, []);

  // Load the selected conversation whenever the id changes
  useEffect(() => {
    if (prevConversationIdRef.current === conversationId) return;
    prevConversationIdRef.current = conversationId;
    // Drop any generated/restored id from the previous conversation
    conversationIdRef.current = conversationId;

    // Reset state for the newly selected conversation
    skipSaveRef.current = true;
    setMessages([]);
    setError(null);
    setStatus('idle');
    assistantMsgRef.current = '';

    if (!conversationId) {
      // New conversation: nothing to load
      skipSaveRef.current = false;
      return;
    }

    chrome.runtime.sendMessage(
      { type: 'GET_CONVERSATION', conversationId },
      (response) => {
        // Ignore failures and stale responses (user switched again meanwhile);
        // a stale request must not touch the flag owned by the current load
        if (chrome.runtime.lastError) {
          skipSaveRef.current = false;
          return;
        }
        if (conversationIdRef.current !== conversationId) return;
        skipSaveRef.current = false;
        if (response?.conversation?.messages) {
          setMessages(response.conversation.messages);
        }
      },
    );
  }, [conversationId]);

  // Listen for streaming responses
  useEffect(() => {
    const listener = (
      message: { type: string; chunk?: string; results?: SearchResult[]; result?: SearchResult; error?: string; conversationId?: string },
    ) => {
      // Broadcasts reach every open UI context; only handle search updates
      // tagged with this context's conversation id. Untagged (legacy)
      // broadcasts are processed as before.
      if (
        message.conversationId !== undefined &&
        message.conversationId !== conversationIdRef.current
      ) {
        return;
      }
      switch (message.type) {
        case 'SEARCH_STREAM':
          // Handoff case: this context adopted a session whose search is
          // already streaming — enter 'searching' so chunk updates skip
          // storage writes (see the save effect)
          if (statusRef.current === 'idle') {
            statusRef.current = 'searching';
            setStatus('searching');
          }
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
          if (statusRef.current === 'idle') {
            statusRef.current = 'searching';
            setStatus('searching');
          }
          if (message.results && message.results.length > 0) {
            setMessages((prev) => {
              const copy = [...prev];
              const last = copy[copy.length - 1];
              if (last?.role === 'assistant') {
                copy[copy.length - 1] = {
                  ...last,
                  results: message.results,
                };
              } else {
                // No streamed text preceded the results (e.g. the LLM only
                // emitted [MATCH:N] lines that found nothing, or results
                // came from URL extraction) — create the assistant message
                // so the results are not silently dropped.
                copy.push({
                  id: generateId(),
                  role: 'assistant',
                  content: '',
                  timestamp: Date.now(),
                  results: message.results,
                });
              }
              return copy;
            });
          }
          break;

        case 'SEARCH_DONE':
          setStatus('idle');
          assistantMsgRef.current = '';
          break;

        case 'SEARCH_RESULT_APPEND':
          if (message.result) {
            setMessages((prev) => {
              const copy = [...prev];
              const last = copy[copy.length - 1];
              if (last?.role === 'assistant') {
                copy[copy.length - 1] = {
                  ...last,
                  results: [...(last.results || []), message.result!],
                };
              } else {
                copy.push({
                  id: generateId(),
                  role: 'assistant',
                  content: '',
                  timestamp: Date.now(),
                  results: [message.result!],
                });
              }
              return copy;
            });
          }
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
      statusRef.current = 'searching';
      assistantMsgRef.current = '';

      // Ensure a stable conversation id for this session (same as starting a
      // new conversation) so the background can tag its broadcasts and other
      // UI contexts can ignore them
      if (!conversationIdRef.current) {
        conversationIdRef.current = generateId();
      }

      const userMsg: ChatMessage = {
        id: generateId(),
        role: 'user',
        content: text.trim(),
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMsg]);

      chrome.runtime
        .sendMessage({
          type: 'SEARCH',
          query: text.trim(),
          conversationId: conversationIdRef.current,
        })
        .catch(() => {
          // Background not ready / no receiver: don't stay stuck on 'searching'
          setStatus('error');
          setError('Failed to start the search. Please try again.');
        });
    },
    [status],
  );

  const clearChat = useCallback(() => {
    setMessages([]);
    assistantMsgRef.current = '';
    setError(null);
    setStatus('idle');
  }, []);

  const openSidePanel = useCallback(() => {
    // chrome.sidePanel requires Chrome 114+; when unavailable, keep the
    // popup open instead of handing off
    if (!chrome.sidePanel?.open) return;
    chrome.windows.getCurrent((win) => {
      if (win?.id) {
        chrome.sidePanel
          .open({ windowId: win.id })
          .then(() => window.close()) // global window: close the popup page itself
          .catch(() => {
            // Opening failed: stay in the popup, swallow the rejection
          });
      }
    });
  }, []);

  return { messages, status, error, sendMessage, clearChat, openSidePanel };
}
