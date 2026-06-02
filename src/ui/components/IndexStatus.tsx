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
        <div class="index-status compact">
          <span>{t('index.bookmarksIndexed', { count: status.total })}</span>
        </div>
      );
    }
    if (!minimal) {
      return (
        <div class="index-status">
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
      <div class={`index-status error ${minimal ? 'compact' : ''}`}>
        <span>{t('index.error', { error: status.error || t('index.errorPrefix') })}</span>
      </div>
    );
  }

  const pct =
    status.total > 0 ? Math.round((status.indexed / status.total) * 100) : 0;

  return (
    <div class={`index-status ${minimal ? 'compact' : ''}`}>
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
