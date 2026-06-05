import { useIndexStatus } from '@/ui/hooks/useIndexStatus';
import { useI18n } from '@/ui/hooks/useI18n';

interface IndexStatusProps {
  minimal?: boolean;
}

export default function IndexStatusView({ minimal }: IndexStatusProps) {
  const { t } = useI18n();
  const status = useIndexStatus();

  if (status.phase === 'idle' || status.phase === 'complete') {
    if (minimal && status.total > 0) {
      return (
        <div class="py-1 px-2 text-xs text-text-secondary border-b-0 min-h-0">
          <span>{t('index.bookmarksIndexed', { count: status.total })}</span>
        </div>
      );
    }
    if (!minimal) {
      return (
        <div class="flex items-center justify-between gap-2 py-2 px-4 text-sm text-text-secondary bg-bg-secondary border-b border-border-light shrink-0 min-h-[32px]">
          <span>
            {status.total > 0
              ? t('index.bookmarksIndexed', { count: status.total })
              : t('index.ready')}
          </span>
        </div>
      );
    }
    return null;
  }

  if (status.phase === 'error') {
    return (
      <div class={`flex items-center justify-between gap-2 py-2 px-4 text-sm bg-error-light border-b border-border-light shrink-0 min-h-[32px] text-error ${minimal ? 'py-1 px-2 text-xs border-b-0 min-h-0' : ''}`}>
        <span>{t('index.error', { error: status.error || t('index.errorPrefix') })}</span>
      </div>
    );
  }

  const pct =
    status.total > 0 ? Math.round((status.indexed / status.total) * 100) : 0;

  return (
    <div class={`flex items-center justify-between gap-2 py-2 px-4 text-sm text-text-secondary bg-bg-secondary border-b border-border-light shrink-0 min-h-[32px] ${minimal ? 'py-1 px-2 text-xs border-b-0 min-h-0' : ''}`}>
      <span>
        {status.phase === 'scanning'
          ? t('index.scanning')
          : t('index.indexing', { pct })}
      </span>
      {!minimal && (
        <div class="progress-bar">
          <div class="progress-fill" style={{ width: `${pct}%` }} />
        </div>
      )}
      {!minimal && (
        <span>
          {status.indexed}/{status.total}
        </span>
      )}
    </div>
  );
}
