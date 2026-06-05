import { useState, useEffect, useRef } from 'preact/hooks';
import type { OrganizeSuggestion } from '@/shared/types';
import { runOrganize, applyOrganization } from '@/shared/organize-engine';
import type { ProgressCallback } from '@/shared/organize-engine';
import { useI18n } from '@/ui/hooks/useI18n';

interface OrganizePanelProps {
  onClose: () => void;
}

type Phase = 'idle' | 'scanning' | 'sending' | 'waiting' | 'result' | 'error' | 'applied' | 'applying';

export default function OrganizePanel({ onClose }: OrganizePanelProps) {
  const { t, locale } = useI18n();
  const [phase, setPhase] = useState<Phase>('idle');
  const [progressText, setProgressText] = useState('');
  const [suggestions, setSuggestions] = useState<OrganizeSuggestion[]>([]);
  const [error, setError] = useState('');
  const [selectAll, setSelectAll] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const localeRef = useRef(locale);
  localeRef.current = locale;

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setElapsed(0);
    timerRef.current = setInterval(() => setElapsed((p) => p + 1), 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleStart = async () => {
    stopTimer();
    setError('');
    setSuggestions([]);
    startTimer();

    const loc = localeRef.current;
    const onProgress: ProgressCallback = (phase, message) => {
      setPhase(phase as Phase);
      setProgressText(message);
    };

    try {
      const result = await runOrganize(loc, onProgress);
      stopTimer();
      setPhase('result');
      setSuggestions(result.map((s) => ({ ...s, selected: true })));
      setSelectAll(true);
    } catch (err) {
      stopTimer();
      setPhase('error');
      setError(String(err));
    }
  };

  const toggleSelectAll = () => {
    const next = !selectAll;
    setSelectAll(next);
    setSuggestions((prev) => prev.map((s) => ({ ...s, selected: next })));
  };

  const toggleItem = (bookmarkId: string) => {
    setSuggestions((prev) => {
      const next = prev.map((s) =>
        s.bookmarkId === bookmarkId ? { ...s, selected: !s.selected } : s,
      );
      setSelectAll(next.every((s) => s.selected));
      return next;
    });
  };

  const handleApply = async () => {
    const selected = suggestions.filter((s) => s.selected);
    if (selected.length === 0) return;

    setPhase('applying');
    startTimer();

    try {
      await applyOrganization(selected);
      stopTimer();
      setPhase('applied');
    } catch (err) {
      stopTimer();
      setPhase('error');
      setError(String(err));
    }
  };

  const selectedCount = suggestions.filter((s) => s.selected).length;

  const grouped = new Map<string, OrganizeSuggestion[]>();
  for (const s of suggestions) {
    const list = grouped.get(s.suggestedFolder) || [];
    list.push(s);
    grouped.set(s.suggestedFolder, list);
  }

  const isWorking = phase === 'scanning' || phase === 'sending' || phase === 'waiting' || phase === 'applying';

  return (
    <div class="flex flex-col h-full overflow-hidden">
      <div class="flex items-center justify-between p-3 px-4 border-b border-border-light shrink-0 gap-2">
        <h3 class="text-base font-bold tracking-[-0.01em] whitespace-nowrap">{t('organize.title')}</h3>
        <div class="flex items-center gap-1">
          {phase === 'result' && (
            <>
              <button class="btn-text" onClick={toggleSelectAll}>
                {selectAll ? t('organize.deselectAll') : t('organize.selectAll')}
              </button>
              <button class="btn-primary py-1 px-3 text-sm rounded-sm" onClick={handleApply} disabled={selectedCount === 0}>
                {t('organize.apply', { n: selectedCount })}
              </button>
            </>
          )}
          <button class="btn-icon" onClick={onClose} title="Close">×</button>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto p-3">
        {phase === 'idle' && (
          <div class="flex flex-col items-center justify-center h-full gap-4 text-center">
            <p class="text-base text-text-tertiary leading-relaxed max-w-[240px]">{t('organize.empty')}</p>
            <button class="btn-primary" onClick={handleStart}>
              {t('organize.start')}
            </button>
          </div>
        )}

        {isWorking && (
          <div class="flex flex-col items-center justify-center h-full gap-4 p-6">
            <div class="w-full max-w-[260px]">
              <div class="w-full h-1 bg-border rounded-full overflow-hidden mb-3">
                <div class="organize-progress-fill" />
              </div>
              <div class="flex justify-between gap-1">
                <span class={`text-xs transition-colors duration-120 whitespace-nowrap ${phase === 'scanning' ? 'text-accent font-semibold' : phase !== 'idle' && phase !== 'scanning' ? 'text-success' : 'text-text-tertiary'}`}>
                  1. {locale === 'zh-CN' ? '读取' : 'Read'}
                </span>
                <span class={`text-xs transition-colors duration-120 whitespace-nowrap ${phase === 'sending' ? 'text-accent font-semibold' : phase === 'waiting' || phase === 'result' ? 'text-success' : 'text-text-tertiary'}`}>
                  2. {locale === 'zh-CN' ? '发送' : 'Send'}
                </span>
                <span class={`text-xs transition-colors duration-120 whitespace-nowrap ${phase === 'waiting' ? 'text-accent font-semibold' : phase === 'result' ? 'text-success' : 'text-text-tertiary'}`}>
                  3. {locale === 'zh-CN' ? 'AI 分析' : 'AI'}
                </span>
              </div>
            </div>
            <p class="text-base text-text-secondary text-center">{progressText}</p>
            <p class="text-xs text-text-tertiary">
              {locale === 'zh-CN' ? `已耗时 ${elapsed}s` : `Elapsed: ${elapsed}s`}
            </p>
          </div>
        )}

        {phase === 'error' && (
          <div class="flex flex-col items-center justify-center h-full gap-3 text-center">
            <p class="text-base text-error leading-[1.5] whitespace-pre-wrap break-all max-h-[200px] overflow-y-auto">{error}</p>
            <button class="btn-primary" onClick={handleStart}>
              {locale === 'zh-CN' ? '重试' : 'Retry'}
            </button>
          </div>
        )}

        {phase === 'applied' && (
          <div class="flex items-center justify-center h-full">
            <p class="text-base text-success font-medium">{t('organize.applied')}</p>
          </div>
        )}

        {phase === 'result' && (
          <div class="flex flex-col gap-3">
            {Array.from(grouped.entries()).map(([folder, items]) => (
              <div key={folder} class="border border-border-light rounded overflow-hidden">
                <div class="flex items-center justify-between p-2 px-3 bg-bg-tertiary text-base font-semibold">
                  <span class="overflow-hidden text-ellipsis whitespace-nowrap">📁 {folder}</span>
                  <span class="text-xs text-text-tertiary bg-bg-primary py-px px-1.5 rounded-full shrink-0">{items.length}</span>
                </div>
                {items.map((s) => (
                  <label
                    key={s.bookmarkId}
                    class={`flex items-start gap-2 p-2 px-3 border-t border-border-light cursor-pointer transition-colors duration-120 hover:bg-bg-hover ${s.selected ? '' : 'opacity-50'}`}
                  >
                    <input
                      type="checkbox"
                      checked={s.selected}
                      onChange={() => toggleItem(s.bookmarkId)}
                      class="mt-[3px] accent-accent shrink-0"
                    />
                    <div class="flex-1 min-w-0 flex flex-col gap-px">
                      <span class="text-base font-medium text-text-primary truncate">{s.title}</span>
                      <span class="text-xs text-text-tertiary">
                        {t('organize.current', { path: s.currentPath })}
                      </span>
                      <span class="text-sm text-accent font-medium truncate">
                        {t('organize.suggested', { folder: s.suggestedFolder })}
                      </span>
                      <span class="text-xs text-text-secondary mt-1 leading-[1.4]">{s.reason}</span>
                    </div>
                  </label>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
