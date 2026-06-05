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

  useEffect(() => {
    if (phase === 'result' && duplicateSets.length > 0) {
      const allIds = new Set<string>();
      for (const set of duplicateSets) {
        for (const item of set.items) {
          allIds.add(item.bookmarkId);
        }
      }
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
        for (const id of groupIds) {
          next.delete(id);
        }
        if (group.items.length > 0) {
          next.delete(group.items[0].bookmarkId);
        }
      } else {
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
    <div class="flex flex-col h-full overflow-hidden">
      <div class="flex items-center justify-between p-3 px-3 pt-3 pb-0 shrink-0">
        <h3 class="text-base font-semibold m-0">{t('duplicates.title')}</h3>
        <div class="flex items-center gap-2">
          {phase === 'result' && hasDupes && (
            <button
              class="btn-primary py-1 px-3 text-sm rounded-sm"
              onClick={handleDelete}
              disabled={selectedIds.size === 0}
            >
              {t('duplicates.delete', { n: selectedIds.size })}
            </button>
          )}
          {phase === 'done' && (
            <button class="btn-primary py-1 px-3 text-sm rounded-sm" onClick={handleScan}>
              {t('duplicates.rescan')}
            </button>
          )}
          <button class="btn-icon" onClick={onClose} title="Close">×</button>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto p-3">
        {phase === 'idle' && (
          <div class="flex flex-col items-center justify-center h-full gap-4 text-center">
            <p class="text-text-secondary text-sm leading-relaxed max-w-[280px]">
              {locale === 'zh-CN'
                ? '扫描所有书签，检测重复或高度相似的条目。精确匹配基于 URL 标准化，相似匹配基于书签内容向量。'
                : 'Scan all bookmarks for duplicate or highly similar entries. Exact matches use URL normalization, near-duplicates use content embeddings.'
              }
            </p>
            <button class="btn-primary" onClick={handleScan}>
              {t('duplicates.scan')}
            </button>
          </div>
        )}

        {isWorking && (
          <div class="flex flex-col items-center justify-center h-full gap-3">
            <div class="w-full h-1 bg-border rounded-full overflow-hidden">
              <div class="organize-progress-fill" />
            </div>
            <p class="text-sm text-text-secondary text-center">{progressText}</p>
          </div>
        )}

        {phase === 'error' && (
          <div class="flex flex-col items-center justify-center h-full gap-3">
            <p class="text-error text-sm text-center break-words">{error}</p>
            <button class="btn-primary" onClick={handleScan}>
              {t('duplicates.retry')}
            </button>
          </div>
        )}

        {phase === 'done' && (
          <div class="flex flex-col items-center justify-center h-full gap-2">
            <p class="text-base text-success font-medium">{t('duplicates.deleted', { n: deletedCount })}</p>
            {error && <p class="text-xs text-text-secondary font-normal">{error}</p>}
          </div>
        )}

        {phase === 'result' && (
          <div class="flex flex-col gap-3">
            {!hasDupes && (
              <div class="flex flex-col items-center justify-center gap-3 py-4">
                <p class="text-text-secondary text-sm">{t('duplicates.noDupes')}</p>
                <button class="btn-primary" onClick={handleScan}>
                  {t('duplicates.rescan')}
                </button>
              </div>
            )}

            {hasDupes && (
              <p class="text-sm text-text-secondary m-0 pb-1">{t('duplicates.scanResult', { n: duplicateSets.length })}</p>
            )}

            {duplicateSets.map((set, groupIndex) => {
              const allInGroupSelected = set.items.every((i) => selectedIds.has(i.bookmarkId));
              return (
                <div key={groupIndex} class="border border-border-light rounded overflow-hidden">
                  <div class="flex items-center gap-2 p-2 px-3 bg-bg-secondary border-b border-border-light flex-wrap">
                    <span class={`duplicates-method-badge text-xs font-semibold py-px px-1.5 rounded-xs uppercase shrink-0 ${set.detectionMethod}`}>
                      {set.detectionMethod === 'exact' ? t('duplicates.exact') : t('duplicates.near')}
                    </span>
                    {set.normalizedUrl && (
                      <span class="text-xs text-text-secondary truncate flex-1 min-w-0 font-mono" title={set.normalizedUrl}>
                        {set.normalizedUrl}
                      </span>
                    )}
                    <span class="text-xs text-text-secondary whitespace-nowrap shrink-0">{t('duplicates.dupes', { n: set.items.length })}</span>
                    <button class="btn-text text-xs shrink-0" onClick={() => toggleGroupSelect(groupIndex)}>
                      {allInGroupSelected ? t('duplicates.deselectAllGroup') : t('duplicates.selectAllGroup')}
                    </button>
                  </div>

                  {selectedIds.size > 0 && set.items.every((i) => selectedIds.has(i.bookmarkId)) && (
                    <p class="duplicates-warning text-xs m-0 py-1 px-3">{t('duplicates.atLeastOne')}</p>
                  )}

                  {set.items.map((item) => {
                    const isSelected = selectedIds.has(item.bookmarkId);
                    const isFirst = set.items[0] === item;
                    return (
                      <label
                        key={item.bookmarkId}
                        class={`duplicates-item flex items-start gap-2 p-2 px-3 cursor-pointer transition-colors duration-120 border-b border-border-light last:border-b-0 hover:bg-bg-hover ${
                          isSelected ? 'selected-for-deletion' : ''
                        } ${isFirst ? 'keep-item' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleItem(item.bookmarkId)}
                          disabled={isFirst && set.items.filter((i) => !selectedIds.has(i.bookmarkId)).length === 0}
                          class="mt-0.5 shrink-0 accent-accent"
                        />
                        <div class="flex flex-col gap-0.5 min-w-0 flex-1">
                          <span class="text-sm font-medium text-text-primary truncate">{item.title || t('bookmark.untitled')}</span>
                          <span class="text-xs text-text-secondary truncate">{item.path}</span>
                          <span class="text-xs text-accent truncate font-mono">{item.url}</span>
                          <span class="text-xs text-text-secondary">
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
