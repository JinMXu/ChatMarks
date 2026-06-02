import { I18nProvider, useI18n } from '@/ui/hooks/useI18n';
import { useSettings } from '@/ui/hooks/useSettings';
import { DEFAULT_SETTINGS } from '@/shared/types';
import type { Settings } from '@/shared/types';
import type { Locale } from '@/shared/i18n';
import { useState, useEffect } from 'preact/hooks';

function OptionsApp() {
  const { t, locale, setLocale } = useI18n();
  const { settings, saveSettings, saved } = useSettings();
  const [form, setForm] = useState<Settings>(settings ?? DEFAULT_SETTINGS);

  // Sync form state when settings load from storage
  useEffect(() => {
    if (settings) {
      setForm(settings);
    }
  }, [settings]);

  if (!settings) {
    return (
      <div class="settings-page">
        <h1>ChatMarks</h1>
        <p>{t('settings.loading')}</p>
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
    <div class="settings-page">
      <h1>{t('settings.title')}</h1>

      <form onSubmit={handleSave}>
        <section>
          <h2>{t('settings.language')}</h2>
          <label>
            {t('settings.languageDesc')}
            <select
              value={locale}
              onChange={(e) => {
                const newLocale = (e.target as HTMLSelectElement).value as Locale;
                setLocale(newLocale);
              }}
            >
              <option value="zh-CN">中文</option>
              <option value="en">English</option>
            </select>
          </label>
        </section>

        <section>
          <h2>{t('settings.apiConfig')}</h2>

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
        </section>

        <section>
          <h2>{t('settings.searchSettings')}</h2>

          <label>
            {t('settings.embeddingMode')}
            <select
              value={form.embeddingMode}
              onChange={(e) =>
                update('embeddingMode', (e.target as HTMLSelectElement).value)
              }
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
              onInput={(e) =>
                update('vectorSearchTopK', parseInt((e.target as HTMLInputElement).value))
              }
            />
          </label>

          <label>
            {t('settings.maxBookmarksLLM')}
            <input
              type="number"
              min={50}
              max={2000}
              value={form.maxBookmarksForLLM}
              onInput={(e) =>
                update('maxBookmarksForLLM', parseInt((e.target as HTMLInputElement).value))
              }
            />
          </label>
        </section>

        <section>
          <h2>{t('settings.indexManagement')}</h2>
          <div class="actions">
            <button type="button" onClick={handleReindex}>
              {t('settings.reindex')}
            </button>
          </div>
        </section>

        <div class="form-footer">
          <button type="submit" class="btn-primary">
            {saved ? t('settings.saved') : t('settings.save')}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <OptionsApp />
    </I18nProvider>
  );
}
