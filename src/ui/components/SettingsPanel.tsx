import { useI18n } from '@/ui/hooks/useI18n';
import { useSettings } from '@/ui/hooks/useSettings';
import { DEFAULT_SETTINGS } from '@/shared/types';
import type { Settings } from '@/shared/types';
import type { Locale } from '@/shared/i18n';
import { useState, useEffect } from 'preact/hooks';

interface SettingsPanelProps {
  onClose: () => void;
}

export default function SettingsPanel({ onClose }: SettingsPanelProps) {
  const { t, locale, setLocale } = useI18n();
  const { settings, saveSettings, saved } = useSettings();
  const [form, setForm] = useState<Settings>(settings ?? DEFAULT_SETTINGS);

  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

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
    await chrome.runtime.sendMessage({ type: 'START_INDEXING' });
  };

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

            <label>
              {t('settings.embeddingModel')}
              <input
                type="text"
                value={form.embeddingModel}
                onInput={(e) => update('embeddingModel', (e.target as HTMLInputElement).value)}
              />
            </label>
          </div>

          <div class="settings-section">
            <h4>{t('settings.searchSettings')}</h4>

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
            <div class="actions">
              <button type="button" onClick={handleReindex}>
                {t('settings.reindex')}
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
