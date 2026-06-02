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
    <div class="organize-panel">
      <div class="organize-header">
        <h3>{t('organize.title')}</h3>
        <div class="organize-header-actions">
          {phase === 'result' && (
            <>
              <button class="btn-text" onClick={toggleSelectAll}>
                {selectAll ? t('organize.deselectAll') : t('organize.selectAll')}
              </button>
              <button class="btn-primary btn-sm" onClick={handleApply} disabled={selectedCount === 0}>
                {t('organize.apply', { n: selectedCount })}
              </button>
            </>
          )}
          <button class="btn-icon" onClick={onClose} title="Close">×</button>
        </div>
      </div>

      <div class="organize-body">
        {phase === 'idle' && (
          <div class="organize-idle">
            <p>{t('organize.empty')}</p>
            <button class="btn-primary" onClick={handleStart}>
              {t('organize.start')}
            </button>
          </div>
        )}

        {isWorking && (
          <div class="organize-loading">
            <div class="organize-progress-container">
              <div class="organize-progress-bar">
                <div class="organize-progress-fill" />
              </div>
              <div class="organize-progress-steps">
                <span class={`organize-step ${phase === 'scanning' ? 'active' : phase !== 'idle' && phase !== 'scanning' ? 'done' : ''}`}>
                  1. {locale === 'zh-CN' ? '读取' : 'Read'}
                </span>
                <span class={`organize-step ${phase === 'sending' ? 'active' : phase === 'waiting' || phase === 'result' ? 'done' : ''}`}>
                  2. {locale === 'zh-CN' ? '发送' : 'Send'}
                </span>
                <span class={`organize-step ${phase === 'waiting' ? 'active' : phase === 'result' ? 'done' : ''}`}>
                  3. {locale === 'zh-CN' ? 'AI 分析' : 'AI'}
                </span>
              </div>
            </div>
            <p class="organize-progress-text">{progressText}</p>
            <p class="organize-elapsed">
              {locale === 'zh-CN' ? `已耗时 ${elapsed}s` : `Elapsed: ${elapsed}s`}
            </p>
          </div>
        )}

        {phase === 'error' && (
          <div class="organize-error">
            <p>{error}</p>
            <button class="btn-primary" onClick={handleStart}>
              {locale === 'zh-CN' ? '重试' : 'Retry'}
            </button>
          </div>
        )}

        {phase === 'applied' && (
          <div class="organize-done">
            <p>{t('organize.applied')}</p>
          </div>
        )}

        {phase === 'result' && (
          <div class="organize-results">
            {Array.from(grouped.entries()).map(([folder, items]) => (
              <div key={folder} class="organize-group">
                <div class="organize-group-header">
                  <span class="organize-folder">📁 {folder}</span>
                  <span class="organize-count">{items.length}</span>
                </div>
                {items.map((s) => (
                  <label
                    key={s.bookmarkId}
                    class={`organize-item ${s.selected ? '' : 'deselected'}`}
                  >
                    <input
                      type="checkbox"
                      checked={s.selected}
                      onChange={() => toggleItem(s.bookmarkId)}
                    />
                    <div class="organize-item-info">
                      <span class="organize-item-title">{s.title}</span>
                      <span class="organize-item-path">
                        {t('organize.current', { path: s.currentPath })}
                      </span>
                      <span class="organize-item-suggest">
                        {t('organize.suggested', { folder: s.suggestedFolder })}
                      </span>
                      <span class="organize-item-reason">{s.reason}</span>
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
