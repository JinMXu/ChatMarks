import { useState, useEffect, useRef } from 'preact/hooks';
import type { DuplicateSet, DuplicateItem } from '@/shared/duplicates-engine';
import { runDuplicatesDetection, runDeleteDuplicates } from '@/shared/duplicates-engine';
import { useI18n } from '@/ui/hooks/useI18n';
import { formatDateLocale } from '@/shared/i18n';

interface DuplicatesPanelProps {
  onClose: () => void;
}

type Phase = 'idle' | 'scanning' | 'result' | 'deleting' | 'done' | 'error';

export default function DuplicatesPanel({ onClose }: DuplicatesPanelProps) {
  const { t, locale } = useI18n();
  const [phase, setPhase] = useState<Phase>('idle');
  const [progressText, setProgressText] = useState('');
  const [duplicateSets, setDuplicateSets] = useState<DuplicateSet[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deletedCount, setDeletedCount] = useState(0);
  const [error, setError] = useState('');
  const localeRef = useRef(locale);
  localeRef.current = locale;

  // Select all items in all groups by default when results arrive
  useEffect(() => {
    if (phase === 'result' && duplicateSets.length > 0) {
      const allIds = new Set<string>();
      for (const set of duplicateSets) {
        for (const item of set.items) {
          allIds.add(item.bookmarkId);
        }
      }
      // Deselect the first item in each group (keep at least one)
      for (const set of duplicateSets) {
        if (set.items.length > 0) {
          allIds.delete(set.items[0].bookmarkId);
        }
      }
      setSelectedIds(allIds);
    }
  }, [phase, duplicateSets]);

  const handleScan = async () => {
    setPhase('scanning');
    setError('');
    setDuplicateSets([]);
    setSelectedIds(new Set());
    setDeletedCount(0);

    const loc = localeRef.current;

    try {
      const result = await runDuplicatesDetection(loc, (msg) => {
        setProgressText(msg);
      });
      setPhase('result');
      setDuplicateSets(result);
    } catch (err) {
      setPhase('error');
      setError(String(err));
    }
  };

  const toggleItem = (bookmarkId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(bookmarkId)) {
        next.delete(bookmarkId);
      } else {
        next.add(bookmarkId);
      }

      // Check if any group would have all items selected — revert
      const wouldBeComplete = checkGroupAllSelected(next);
      if (wouldBeComplete) {
        return prev;
      }

      return next;
    });
  };

  const checkGroupAllSelected = (ids: Set<string>): boolean => {
    for (const set of duplicateSets) {
      if (set.items.every((item) => ids.has(item.bookmarkId))) {
        return true;
      }
    }
    return false;
  };

  const toggleGroupSelect = (groupIndex: number) => {
    const group = duplicateSets[groupIndex];
    const groupIds = new Set(group.items.map((i) => i.bookmarkId));
    const allInGroupSelected = group.items.every((i) => selectedIds.has(i.bookmarkId));

    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allInGroupSelected) {
        // Deselect all but keep first item
        for (const id of groupIds) {
          next.delete(id);
        }
        if (group.items.length > 0) {
          next.delete(group.items[0].bookmarkId);
        }
      } else {
        // Select all except the first item
        for (let i = 0; i < group.items.length; i++) {
          if (i === 0) {
            next.delete(group.items[i].bookmarkId);
          } else {
            next.add(group.items[i].bookmarkId);
          }
        }
      }
      return next;
    });
  };

  const handleDelete = async () => {
    if (selectedIds.size === 0) return;
    setPhase('deleting');
    setError('');

    try {
      const result = await runDeleteDuplicates([...selectedIds]);
      setDeletedCount(result.deleted);
      setPhase('done');

      if (result.errors.length > 0) {
        setError(result.errors.join('; '));
      }
    } catch (err) {
      setPhase('error');
      setError(String(err));
    }
  };

  const hasDupes = duplicateSets.length > 0;
  const isWorking = phase === 'scanning' || phase === 'deleting';

  return (
    <div class="duplicates-panel">
      <div class="duplicates-header">
        <h3>{t('duplicates.title')}</h3>
        <div class="duplicates-header-actions">
          {phase === 'result' && hasDupes && (
            <button
              class="btn-primary btn-sm"
              onClick={handleDelete}
              disabled={selectedIds.size === 0}
            >
              {t('duplicates.delete', { n: selectedIds.size })}
            </button>
          )}
          {phase === 'done' && (
            <button class="btn-primary btn-sm" onClick={handleScan}>
              {t('duplicates.rescan')}
            </button>
          )}
          <button class="btn-icon" onClick={onClose} title="Close">×</button>
        </div>
      </div>

      <div class="duplicates-body">
        {phase === 'idle' && (
          <div class="duplicates-idle">
            <p>{locale === 'zh-CN'
              ? '扫描所有书签，检测重复或高度相似的条目。精确匹配基于 URL 标准化，相似匹配基于书签内容向量。'
              : 'Scan all bookmarks for duplicate or highly similar entries. Exact matches use URL normalization, near-duplicates use content embeddings.'
            }</p>
            <button class="btn-primary" onClick={handleScan}>
              {t('duplicates.scan')}
            </button>
          </div>
        )}

        {isWorking && (
          <div class="duplicates-loading">
            <div class="organize-progress-bar">
              <div class="organize-progress-fill" />
            </div>
            <p class="duplicates-progress-text">{progressText}</p>
          </div>
        )}

        {phase === 'error' && (
          <div class="duplicates-error">
            <p>{error}</p>
            <button class="btn-primary" onClick={handleScan}>
              {t('duplicates.retry')}
            </button>
          </div>
        )}

        {phase === 'done' && (
          <div class="duplicates-done">
            <p>{t('duplicates.deleted', { n: deletedCount })}</p>
            {error && <p class="duplicates-error-sub">{error}</p>}
          </div>
        )}

        {phase === 'result' && (
          <div class="duplicates-results">
            {!hasDupes && (
              <div class="duplicates-empty">
                <p>{t('duplicates.noDupes')}</p>
                <button class="btn-primary" onClick={handleScan}>
                  {t('duplicates.rescan')}
                </button>
              </div>
            )}

            {hasDupes && (
              <p class="duplicates-summary">{t('duplicates.scanResult', { n: duplicateSets.length })}</p>
            )}

            {duplicateSets.map((set, groupIndex) => {
              const allInGroupSelected = set.items.every((i) => selectedIds.has(i.bookmarkId));
              return (
                <div key={groupIndex} class="duplicates-group">
                  <div class="duplicates-group-header">
                    <span class={`duplicates-method-badge ${set.detectionMethod}`}>
                      {set.detectionMethod === 'exact' ? t('duplicates.exact') : t('duplicates.near')}
                    </span>
                    {set.normalizedUrl && (
                      <span class="duplicates-url" title={set.normalizedUrl}>
                        {set.normalizedUrl}
                      </span>
                    )}
                    <span class="duplicates-count">{t('duplicates.dupes', { n: set.items.length })}</span>
                    <button class="btn-text duplicates-group-toggle" onClick={() => toggleGroupSelect(groupIndex)}>
                      {allInGroupSelected ? t('duplicates.deselectAllGroup') : t('duplicates.selectAllGroup')}
                    </button>
                  </div>

                  {selectedIds.size > 0 && set.items.every((i) => selectedIds.has(i.bookmarkId)) && (
                    <p class="duplicates-warning">{t('duplicates.atLeastOne')}</p>
                  )}

                  {set.items.map((item) => {
                    const isSelected = selectedIds.has(item.bookmarkId);
                    const isFirst = set.items[0] === item;
                    return (
                      <label
                        key={item.bookmarkId}
                        class={`duplicates-item ${isSelected ? 'selected-for-deletion' : ''} ${isFirst ? 'keep-item' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleItem(item.bookmarkId)}
                          disabled={isFirst && set.items.filter((i) => !selectedIds.has(i.bookmarkId)).length === 0}
                        />
                        <div class="duplicates-item-info">
                          <span class="duplicates-item-title">{item.title || t('bookmark.untitled')}</span>
                          <span class="duplicates-item-path">{item.path}</span>
                          <span class="duplicates-item-url">{item.url}</span>
                          <span class="duplicates-item-date">
                            {locale === 'zh-CN'
                              ? `${formatDateLocale(locale, item.dateAdded)}添加`
                              : `Added ${formatDateLocale(locale, item.dateAdded)}`
                            }
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
