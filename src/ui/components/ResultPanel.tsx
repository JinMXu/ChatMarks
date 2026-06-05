import type { SearchResult } from '@/shared/types';
import BookmarkCard from './BookmarkCard';
import { useI18n } from '@/ui/hooks/useI18n';

interface ResultPanelProps {
  results: SearchResult[];
}

export default function ResultPanel({ results }: ResultPanelProps) {
  const { t } = useI18n();

  if (results.length === 0) {
    return (
      <div class="flex flex-col h-full overflow-hidden">
        <div class="flex items-center justify-between p-3 px-4 border-b border-border-light shrink-0">
          <h3 class="text-base font-bold tracking-[-0.01em]">{t('result.title')}</h3>
        </div>
        <div class="flex-1 flex items-center justify-center p-6">
          <p class="text-base text-text-tertiary text-center leading-relaxed">{t('result.empty')}</p>
        </div>
      </div>
    );
  }

  return (
    <div class="flex flex-col h-full overflow-hidden">
      <div class="flex items-center justify-between p-3 px-4 border-b border-border-light shrink-0">
        <h3 class="text-base font-bold tracking-[-0.01em]">{t('result.title')}</h3>
        <span class="text-xs font-medium text-text-secondary bg-bg-tertiary py-1 px-2 rounded-full">
          {t('result.found', { n: results.length })}
        </span>
      </div>
      <div class="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
        {results.map((result) => (
          <BookmarkCard key={result.bookmarkId} result={result} />
        ))}
      </div>
    </div>
  );
}
