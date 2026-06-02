import { useRef, useEffect } from 'preact/hooks';
import type { ChatMessage } from '@/shared/types';
import BookmarkCard from './BookmarkCard';
import { renderMarkdown } from '@/shared/utils';
import { useI18n } from '@/ui/hooks/useI18n';

interface ChatViewProps {
  messages: ChatMessage[];
  status: 'idle' | 'searching' | 'error';
  onClear: () => void;
}

export default function ChatView({ messages, status, onClear }: ChatViewProps) {
  const { t } = useI18n();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0 && status === 'idle') {
    return (
      <div class="chat-view">
        <div class="chat-empty">
          <h3>{t('chat.emptyTitle')}</h3>
          <p>
            {t('chat.emptyDesc').split('\n').map((line, i) => (
              <span key={i}>
                {line}
                {i === 0 && <br />}
              </span>
            ))}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div class="chat-view">
      {messages.length > 0 && (
        <div style={{ textAlign: 'right', marginBottom: '4px' }}>
          <button class="btn-text" onClick={onClear}>
            {t('chat.clear')}
          </button>
        </div>
      )}

      {messages.map((msg) => (
        <div key={msg.id} class={`message ${msg.role}`}>
          <div class="message-bubble">
            <div
              class="message-content"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
            />

            {msg.results && msg.results.length > 0 && (
              <div class="results-list">
                {msg.results.map((r) => (
                  <BookmarkCard key={r.bookmarkId} result={r} />
                ))}
              </div>
            )}
          </div>
          <div class="message-time">
            {new Date(msg.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        </div>
      ))}

      {status === 'searching' && (
        <div class="message assistant">
          <div class="message-bubble">
            <div class="typing-indicator">
              <span />
              <span />
              <span />
            </div>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
