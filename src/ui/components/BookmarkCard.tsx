import type { SearchResult } from '@/shared/types';
import { relativeTimeLocale } from '@/shared/i18n';
import { renderMarkdown } from '@/shared/utils';
import { useI18n } from '@/ui/hooks/useI18n';

interface BookmarkCardProps {
  result: SearchResult;
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function domainInitial(domain: string): string {
  return domain.charAt(0).toUpperCase();
}

export default function BookmarkCard({ result }: BookmarkCardProps) {
  const { t, locale } = useI18n();
  const domain = extractDomain(result.url);

  const handleClick = () => {
    if (result.url) {
      chrome.tabs.create({ url: result.url, active: true });
    }
  };

  return (
    <div class="bookmark-card bg-bg-primary border border-border rounded cursor-pointer" onClick={handleClick}>
      <div class="flex items-start gap-3 p-3 px-4">
        <div class="w-9 h-9 min-w-9 rounded-sm bg-accent-light text-accent text-lg font-bold flex items-center justify-center leading-none select-none">
          {domainInitial(domain)}
        </div>
        <div class="flex-1 min-w-0 flex flex-col gap-0.5">
          <div class="flex items-center gap-2 min-w-0">
            <h4 class="bookmark-title flex-1 min-w-0 text-base font-semibold text-text-primary leading-[1.4] truncate">
              {result.title || t('bookmark.untitled')}
            </h4>
            {result.score !== undefined && (
              <span class="text-xs font-semibold text-success bg-success-light py-px px-1.5 rounded-xs whitespace-nowrap shrink-0">
                {Math.round(result.score * 100)}%
              </span>
            )}
          </div>
          <span class="text-sm text-text-tertiary font-mono truncate leading-[1.3]">{domain}</span>
          <div class="flex items-center gap-2 mt-px flex-wrap">
            {result.path && (
              <span class="text-xs text-text-secondary bg-bg-tertiary py-px px-1.5 rounded-xs max-w-[180px] truncate">
                {result.path}
              </span>
            )}
            <span class="text-xs text-text-tertiary whitespace-nowrap">
              {t('bookmark.added', { time: relativeTimeLocale(locale, result.dateAdded) })}
            </span>
          </div>
        </div>
        <span class="bookmark-arrow text-text-tertiary text-base opacity-0 self-center shrink-0">↗</span>
      </div>
      {result.matchReason && (
        <div class="text-sm text-text-secondary p-2 px-4 border-t border-border-light bg-bg-secondary leading-[1.5] flex items-start gap-2">
          <span class="text-xs font-semibold text-accent bg-accent-light py-px px-1.5 rounded-xs whitespace-nowrap shrink-0 mt-px">
            {t('match.label')}
          </span>
          <span
            class="message-content"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(result.matchReason) }}
          />
        </div>
      )}
    </div>
  );
}
