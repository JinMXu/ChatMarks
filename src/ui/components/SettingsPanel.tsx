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

  // Listen for index status updates from background
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
      <div class="settings-panel">
        <div class="panel-header">
          <h3>{t('settings.title')}</h3>
          <button class="btn-icon" onClick={onClose}>×</button>
        </div>
        <div class="panel-content">
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
    <div class="settings-panel">
      <div class="panel-header">
        <h3>{t('settings.title')}</h3>
        <button class="btn-icon" onClick={onClose}>×</button>
      </div>

      <div class="panel-content">
        <form onSubmit={handleSave} class="settings-form">
          <div class="settings-section">
            <h4>{t('settings.language')}</h4>
            <label>
              {t('settings.languageDesc')}
              <select
                value={locale}
                onChange={(e) => setLocale((e.target as HTMLSelectElement).value as Locale)}
              >
                <option value="zh-CN">中文</option>
                <option value="en">English</option>
              </select>
            </label>
          </div>

          <div class="settings-section">
            <h4>{t('settings.apiConfig')}</h4>

            <label>
              {t('settings.apiBaseUrl')}
              <input
                type="text"
                value={form.apiBaseUrl}
                onInput={(e) => update('apiBaseUrl', (e.target as HTMLInputElement).value)}
                placeholder="https://api.openai.com/v1"
              />
            </label>

            <label>
              {t('settings.apiKey')}
              <input
                type="password"
                value={form.apiKey}
                onInput={(e) => update('apiKey', (e.target as HTMLInputElement).value)}
                placeholder="sk-..."
              />
            </label>

            <label>
              {t('settings.chatModel')}
              <input
                type="text"
                value={form.chatModel}
                onInput={(e) => update('chatModel', (e.target as HTMLInputElement).value)}
              />
            </label>
          </div>

          <div class="settings-section">
            <h4>{t('settings.embeddingConfig')}</h4>
            <p class="hint" style="margin-bottom: var(--space-3);">{t('settings.embeddingApiHint')}</p>

            <label>
              {t('settings.embeddingApiBaseUrl')}
              <input
                type="text"
                value={form.embeddingApiBaseUrl}
                onInput={(e) => update('embeddingApiBaseUrl', (e.target as HTMLInputElement).value)}
                placeholder={form.apiBaseUrl || 'https://api.openai.com/v1'}
              />
            </label>

            <label>
              {t('settings.embeddingApiKey')}
              <input
                type="password"
                value={form.embeddingApiKey}
                onInput={(e) => update('embeddingApiKey', (e.target as HTMLInputElement).value)}
                placeholder={form.apiKey ? '(using chat API key)' : 'sk-...'}
              />
            </label>

            <label>
              {t('settings.embeddingModel')}
              <input
                type="text"
                value={form.embeddingModel}
                onInput={(e) => update('embeddingModel', (e.target as HTMLInputElement).value)}
              />
            </label>

            <label>
              {t('settings.embeddingMode')}
              <select
                value={form.embeddingMode}
                onChange={(e) => update('embeddingMode', (e.target as HTMLSelectElement).value)}
              >
                <option value="remote">{t('settings.embeddingModeRemote')}</option>
                <option value="local">{t('settings.embeddingModeLocal')}</option>
              </select>
            </label>
          </div>

          <div class="settings-section">
            <h4>{t('settings.searchSettings')}</h4>

            <label>
              {t('settings.vectorSearchTopK')}
              <input
                type="number"
                min={5}
                max={100}
                value={form.vectorSearchTopK}
                onInput={(e) => update('vectorSearchTopK', parseInt((e.target as HTMLInputElement).value))}
              />
            </label>

            <label>
              {t('settings.maxBookmarksLLM')}
              <input
                type="number"
                min={50}
                max={2000}
                value={form.maxBookmarksForLLM}
                onInput={(e) => update('maxBookmarksForLLM', parseInt((e.target as HTMLInputElement).value))}
              />
            </label>
          </div>

          <div class="settings-section">
            <h4>{t('settings.indexManagement')}</h4>

            {isIndexing && (
              <div class="index-status-row">
                <div class="progress-bar">
                  <div class="progress-fill" style={{ width: `${pct}%` }} />
                </div>
                <span class="index-status-text">
                  {indexStatus?.phase === 'scanning' ? t('index.scanning') : t('index.indexing', { pct })}
                </span>
              </div>
            )}

            {indexStatus?.phase === 'complete' && !isIndexing && (
              <div class="index-done">
                {t('index.bookmarksIndexed', { count: indexStatus.indexed })}
              </div>
            )}

            {indexStatus?.phase === 'error' && !isIndexing && (
              <div class="index-error">
                {t('index.errorPrefix')}: {indexMessage}
              </div>
            )}

            <div class="actions">
              <button type="button" onClick={handleReindex} disabled={isIndexing}>
                {isIndexing ? t('index.indexing', { pct }) : t('settings.reindex')}
              </button>
            </div>
          </div>

          <div class="settings-form-footer">
            <button type="submit" class="btn-primary">
              {saved ? t('settings.saved') : t('settings.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
