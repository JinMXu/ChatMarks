import type { SearchResult } from '@/shared/types';
import { relativeTimeLocale } from '@/shared/i18n';
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
    <div class="bookmark-card" onClick={handleClick}>
      <div class="bookmark-card-body">
        <div class="bookmark-favicon">{domainInitial(domain)}</div>
        <div class="bookmark-info">
          <h4 class="bookmark-title">{result.title || t('bookmark.untitled')}</h4>
          <span class="bookmark-domain">{domain}</span>
          <div class="bookmark-meta">
            {result.path && <span class="bookmark-path">{result.path}</span>}
            <span class="bookmark-date">
              {t('bookmark.added', { time: relativeTimeLocale(locale, result.dateAdded) })}
            </span>
          </div>
        </div>
        <span class="bookmark-arrow">↗</span>
      </div>
      {result.matchReason && (
        <div class="bookmark-match">
          <span class="bookmark-match-label">{t('match.label')}</span>
          {result.matchReason}
        </div>
      )}
    </div>
  );
}
