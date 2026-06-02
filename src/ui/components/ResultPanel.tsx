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
      <div class="result-panel">
        <div class="panel-header">
          <h3>{t('result.title')}</h3>
        </div>
        <div class="panel-empty">
          <p>{t('result.empty')}</p>
        </div>
      </div>
    );
  }

  return (
    <div class="result-panel">
      <div class="panel-header">
        <h3>{t('result.title')}</h3>
        <span class="panel-count">{t('result.found', { n: results.length })}</span>
      </div>
      <div class="panel-content">
        {results.map((result) => (
          <BookmarkCard key={result.bookmarkId} result={result} />
        ))}
      </div>
    </div>
  );
}
