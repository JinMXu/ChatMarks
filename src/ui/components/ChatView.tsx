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
      <div class="flex-1 overflow-y-auto p-4 flex flex-col gap-4 scroll-smooth overscroll-contain">
        <div class="chat-empty flex-1 flex flex-col items-center justify-center text-text-tertiary text-center p-6 gap-3">
          <h3 class="text-xl font-semibold text-text-secondary m-0">{t('chat.emptyTitle')}</h3>
          <p class="text-sm max-w-[280px] leading-relaxed">
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
    <div class="flex-1 overflow-y-auto p-4 flex flex-col gap-4 scroll-smooth overscroll-contain">
      {messages.length > 0 && (
        <div class="text-right mb-1">
          <button class="btn-text" onClick={onClear}>
            {t('chat.clear')}
          </button>
        </div>
      )}

      {messages.map((msg) => (
        <div key={msg.id} class={`message flex flex-col ${msg.role === 'user' ? 'self-end' : 'self-start'}`}>
          <div class={`message-bubble p-3 px-4 rounded-lg text-base ${msg.role === 'user' ? 'rounded-br-xs' : 'rounded-bl-xs'}`}>
            <div
              class="message-content"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
            />

            {msg.results && msg.results.length > 0 && (
              <div class="flex flex-col gap-2 mt-2 w-full max-w-[360px]">
                {msg.results.map((r) => (
                  <BookmarkCard key={r.bookmarkId} result={r} />
                ))}
              </div>
            )}
          </div>
          <div class={`text-xs text-text-tertiary mt-1 px-1 select-none ${msg.role === 'user' ? 'text-right' : ''}`}>
            {new Date(msg.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        </div>
      ))}

      {status === 'searching' && (
        <div class="message flex flex-col self-start">
          <div class="message-bubble p-3 px-4 rounded-lg rounded-bl-xs">
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
