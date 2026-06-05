import { useI18n } from '@/ui/hooks/useI18n';
import { useSettings } from '@/ui/hooks/useSettings';
import { DEFAULT_SETTINGS } from '@/shared/types';
import type { Settings, IndexStatus, RuntimeMessage } from '@/shared/types';
import type { Locale } from '@/shared/i18n';
import { useState, useEffect } from 'preact/hooks';

interface SettingsPanelProps {
  onClose: () => void;
}

export default function SettingsPanel({ onClose }: SettingsPanelProps) {
  const { t, locale, setLocale } = useI18n();
  const { settings, saveSettings, saved } = useSettings();
  const [form, setForm] = useState<Settings>(settings ?? DEFAULT_SETTINGS);
  const [indexing, setIndexing] = useState(false);
  const [indexStatus, setIndexStatus] = useState<IndexStatus | null>(null);
  const [indexMessage, setIndexMessage] = useState('');

  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  useEffect(() => {
    const listener = (message: RuntimeMessage) => {
      if (message.type === 'INDEX_STATUS') {
        setIndexStatus(message.status);
        if (message.status.phase === 'idle' || message.status.phase === 'complete' || message.status.phase === 'error') {
          setIndexing(false);
        }
        if (message.status.phase === 'error' && message.status.error) {
          setIndexMessage(message.status.error);
        }
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => {
      chrome.runtime.onMessage.removeListener(listener);
    };
  }, []);

  if (!settings) {
    return (
      <div class="flex flex-col h-full overflow-hidden">
        <div class="flex items-center justify-between p-3 px-4 border-b border-border-light shrink-0">
          <h3 class="text-base font-bold tracking-[-0.01em]">{t('settings.title')}</h3>
          <button class="btn-icon" onClick={onClose}>×</button>
        </div>
        <div class="flex-1 overflow-y-auto p-3">
          <p>{t('settings.loading')}</p>
        </div>
      </div>
    );
  }

  const update = (key: keyof Settings, value: string | number) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = (e: Event) => {
    e.preventDefault();
    saveSettings(form);
  };

  const handleReindex = async () => {
    setIndexing(true);
    setIndexMessage('');
    setIndexStatus(null);
    await chrome.runtime.sendMessage({ type: 'START_INDEXING' });
  };

  const isIndexing = indexStatus?.phase === 'scanning' || indexStatus?.phase === 'embedding';
  const pct = indexStatus && indexStatus.total > 0
    ? Math.round((indexStatus.indexed / indexStatus.total) * 100)
    : 0;

  return (
    <div class="flex flex-col h-full overflow-hidden">
      <div class="flex items-center justify-between p-3 px-4 border-b border-border-light shrink-0">
        <h3 class="text-base font-bold tracking-[-0.01em]">{t('settings.title')}</h3>
        <button class="btn-icon" onClick={onClose}>×</button>
      </div>

      <div class="flex-1 overflow-y-auto p-3">
        <form onSubmit={handleSave} class="flex flex-col gap-4">
          <div class="flex flex-col gap-2">
            <h4 class="text-sm font-semibold text-text-secondary uppercase tracking-[0.05em] pb-1 border-b border-border-light mb-1">{t('settings.language')}</h4>
            <label class="flex flex-col gap-1 text-sm font-medium text-text-secondary">
              {t('settings.languageDesc')}
              <select
                value={locale}
                onChange={(e) => setLocale((e.target as HTMLSelectElement).value as Locale)}
                class="py-1 px-2 border border-border rounded-xs text-base font-sans bg-bg-primary text-text-primary outline-none transition-colors duration-120 focus:border-accent"
              >
                <option value="zh-CN">中文</option>
                <option value="en">English</option>
              </select>
            </label>
          </div>

          <div class="flex flex-col gap-2">
            <h4 class="text-sm font-semibold text-text-secondary uppercase tracking-[0.05em] pb-1 border-b border-border-light mb-1">{t('settings.apiConfig')}</h4>

            <label class="flex flex-col gap-1 text-sm font-medium text-text-secondary">
              {t('settings.apiBaseUrl')}
              <input
                type="text"
                value={form.apiBaseUrl}
                onInput={(e) => update('apiBaseUrl', (e.target as HTMLInputElement).value)}
                placeholder="https://api.openai.com/v1"
                class="py-1 px-2 border border-border rounded-xs text-base font-sans bg-bg-primary text-text-primary outline-none transition-colors duration-120 focus:border-accent"
              />
            </label>

            <label class="flex flex-col gap-1 text-sm font-medium text-text-secondary">
              {t('settings.apiKey')}
              <input
                type="password"
                value={form.apiKey}
                onInput={(e) => update('apiKey', (e.target as HTMLInputElement).value)}
                placeholder="sk-..."
                class="py-1 px-2 border border-border rounded-xs text-base font-sans bg-bg-primary text-text-primary outline-none transition-colors duration-120 focus:border-accent"
              />
            </label>

            <label class="flex flex-col gap-1 text-sm font-medium text-text-secondary">
              {t('settings.chatModel')}
              <input
                type="text"
                value={form.chatModel}
                onInput={(e) => update('chatModel', (e.target as HTMLInputElement).value)}
                class="py-1 px-2 border border-border rounded-xs text-base font-sans bg-bg-primary text-text-primary outline-none transition-colors duration-120 focus:border-accent"
              />
            </label>
          </div>

          <div class="flex flex-col gap-2">
            <h4 class="text-sm font-semibold text-text-secondary uppercase tracking-[0.05em] pb-1 border-b border-border-light mb-1">{t('settings.embeddingConfig')}</h4>
            <p class="text-xs text-text-tertiary mb-3">{t('settings.embeddingApiHint')}</p>

            <label class="flex flex-col gap-1 text-sm font-medium text-text-secondary">
              {t('settings.embeddingApiBaseUrl')}
              <input
                type="text"
                value={form.embeddingApiBaseUrl}
                onInput={(e) => update('embeddingApiBaseUrl', (e.target as HTMLInputElement).value)}
                placeholder={form.apiBaseUrl || 'https://api.openai.com/v1'}
                class="py-1 px-2 border border-border rounded-xs text-base font-sans bg-bg-primary text-text-primary outline-none transition-colors duration-120 focus:border-accent"
              />
            </label>

            <label class="flex flex-col gap-1 text-sm font-medium text-text-secondary">
              {t('settings.embeddingApiKey')}
              <input
                type="password"
                value={form.embeddingApiKey}
                onInput={(e) => update('embeddingApiKey', (e.target as HTMLInputElement).value)}
                placeholder={form.apiKey ? '(using chat API key)' : 'sk-...'}
                class="py-1 px-2 border border-border rounded-xs text-base font-sans bg-bg-primary text-text-primary outline-none transition-colors duration-120 focus:border-accent"
              />
            </label>

            <label class="flex flex-col gap-1 text-sm font-medium text-text-secondary">
              {t('settings.embeddingModel')}
              <input
                type="text"
                value={form.embeddingModel}
                onInput={(e) => update('embeddingModel', (e.target as HTMLInputElement).value)}
                class="py-1 px-2 border border-border rounded-xs text-base font-sans bg-bg-primary text-text-primary outline-none transition-colors duration-120 focus:border-accent"
              />
            </label>

            <label class="flex flex-col gap-1 text-sm font-medium text-text-secondary">
              {t('settings.embeddingMode')}
              <select
                value={form.embeddingMode}
                onChange={(e) => update('embeddingMode', (e.target as HTMLSelectElement).value)}
                class="py-1 px-2 border border-border rounded-xs text-base font-sans bg-bg-primary text-text-primary outline-none transition-colors duration-120 focus:border-accent"
              >
                <option value="remote">{t('settings.embeddingModeRemote')}</option>
                <option value="local">{t('settings.embeddingModeLocal')}</option>
              </select>
            </label>
          </div>

          <div class="flex flex-col gap-2">
            <h4 class="text-sm font-semibold text-text-secondary uppercase tracking-[0.05em] pb-1 border-b border-border-light mb-1">{t('settings.searchSettings')}</h4>

            <label class="flex flex-col gap-1 text-sm font-medium text-text-secondary">
              {t('settings.vectorSearchTopK')}
              <input
                type="number"
                min={5}
                max={100}
                value={form.vectorSearchTopK}
                onInput={(e) => update('vectorSearchTopK', parseInt((e.target as HTMLInputElement).value))}
                class="py-1 px-2 border border-border rounded-xs text-base font-sans bg-bg-primary text-text-primary outline-none transition-colors duration-120 focus:border-accent"
              />
            </label>

            <label class="flex flex-col gap-1 text-sm font-medium text-text-secondary">
              {t('settings.maxBookmarksLLM')}
              <input
                type="number"
                min={50}
                max={2000}
                value={form.maxBookmarksForLLM}
                onInput={(e) => update('maxBookmarksForLLM', parseInt((e.target as HTMLInputElement).value))}
                class="py-1 px-2 border border-border rounded-xs text-base font-sans bg-bg-primary text-text-primary outline-none transition-colors duration-120 focus:border-accent"
              />
            </label>
          </div>

          <div class="flex flex-col gap-2">
            <h4 class="text-sm font-semibold text-text-secondary uppercase tracking-[0.05em] pb-1 border-b border-border-light mb-1">{t('settings.indexManagement')}</h4>

            {isIndexing && (
              <div class="flex items-center gap-2">
                <div class="progress-bar">
                  <div class="progress-fill" style={{ width: `${pct}%` }} />
                </div>
                <span class="text-sm text-text-secondary whitespace-nowrap">
                  {indexStatus?.phase === 'scanning' ? t('index.scanning') : t('index.indexing', { pct })}
                </span>
              </div>
            )}

            {indexStatus?.phase === 'complete' && !isIndexing && (
              <div class="text-sm text-success">
                {t('index.bookmarksIndexed', { count: indexStatus.indexed })}
              </div>
            )}

            {indexStatus?.phase === 'error' && !isIndexing && (
              <div class="text-sm text-error">
                {t('index.errorPrefix')}: {indexMessage}
              </div>
            )}

            <div class="flex gap-2">
              <button type="button" onClick={handleReindex} disabled={isIndexing}
                class="py-1 px-3 border border-border rounded-xs bg-bg-primary text-text-primary cursor-pointer text-sm transition-colors duration-120 hover:bg-bg-hover disabled:opacity-50"
              >
                {isIndexing ? t('index.indexing', { pct }) : t('settings.reindex')}
              </button>
            </div>
          </div>

          <div class="pt-3">
            <button type="submit" class="btn-primary w-full">
              {saved ? t('settings.saved') : t('settings.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
