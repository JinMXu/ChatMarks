import { useRef, useEffect, useState } from 'preact/hooks';
import type { ChatMessage } from '@/shared/types';
import BookmarkCard from './BookmarkCard';
import { renderMarkdown } from '@/shared/utils';
import { useI18n } from '@/ui/hooks/useI18n';
import { getRecentOpens, type RecentEntry } from '@/shared/recent-bookmarks';
import { relativeTimeLocale } from '@/shared/i18n';

interface ChatViewProps {
  messages: ChatMessage[];
  status: 'idle' | 'searching' | 'error';
  onClear: () => void;
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export default function ChatView({ messages, status, onClear }: ChatViewProps) {
  const { t, locale } = useI18n();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [recentItems, setRecentItems] = useState<RecentEntry[]>([]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (messages.length === 0) {
      getRecentOpens().then(setRecentItems);
    }
  }, [messages.length]);

  const handleRecentClick = (entry: RecentEntry) => {
    if (entry.url) {
      chrome.tabs.create({ url: entry.url, active: true });
    }
  };

  if (messages.length === 0 && status === 'idle') {
    return (
      <div class="flex-1 overflow-y-auto p-4 flex flex-col gap-4 scroll-smooth overscroll-contain">
        {recentItems.length > 0 ? (
          <div class="flex flex-col gap-2">
            <h3 class="text-xs font-semibold text-text-tertiary uppercase tracking-wider px-1 mb-1">
              {t('recent.title')}
            </h3>
            {recentItems.slice(0, 10).map((entry) => (
              <div
                key={entry.bookmarkId + entry.openedAt}
                class="flex items-center gap-3 p-2 px-3 rounded-lg bg-bg-secondary border border-border-light cursor-pointer hover:bg-bg-hover hover:border-border transition-colors duration-120"
                onClick={() => handleRecentClick(entry)}
              >
                <div class="w-7 h-7 min-w-7 rounded-sm bg-accent-light text-accent text-sm font-bold flex items-center justify-center leading-none select-none">
                  {extractDomain(entry.url).charAt(0).toUpperCase()}
                </div>
                <div class="flex-1 min-w-0 flex flex-col gap-0.5">
                  <span class="text-sm font-medium text-text-primary truncate leading-[1.3]">
                    {entry.title}
                  </span>
                  <span class="text-xs text-text-tertiary truncate">
                    {extractDomain(entry.url)} · {relativeTimeLocale(locale, entry.openedAt)}
                  </span>
                </div>
                <span class="text-text-tertiary text-xs opacity-0 group-hover:opacity-100 shrink-0">↗</span>
              </div>
            ))}
          </div>
        ) : (
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
        )}
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
            {msg.content && msg.role === 'assistant' ? (
              <div class="message-content text-sm text-text-secondary mb-2">
                <span dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
              </div>
            ) : msg.content ? (
              <div class="message-content">
                <span dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
              </div>
            ) : null}

            {msg.results && msg.results.length > 0 && (
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
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
