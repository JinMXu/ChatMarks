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

  useEffect(() => {
    if (settings) {
      setForm(settings);
    }
  }, [settings]);

  if (!settings) {
    return (
      <div class="max-w-[680px] mx-auto p-6 px-6">
        <h1 class="text-2xl font-bold tracking-[-0.02em] mb-6">ChatMarks</h1>
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
    <div class="max-w-[680px] mx-auto p-6 px-6">
      <h1 class="text-2xl font-bold tracking-[-0.02em] mb-6">{t('settings.title')}</h1>

      <form onSubmit={handleSave}>
        <section class="mb-6 bg-bg-secondary border border-border-light rounded p-5">
          <h2 class="text-lg font-semibold mb-4 pb-2 border-b border-border-light text-text-primary">{t('settings.language')}</h2>
          <label class="flex flex-col gap-1 text-base font-medium text-text-primary mb-4">
            {t('settings.languageDesc')}
            <select
              value={locale}
              onChange={(e) => {
                const newLocale = (e.target as HTMLSelectElement).value as Locale;
                setLocale(newLocale);
              }}
              class="py-2 px-3 border border-border rounded-sm text-base font-sans bg-bg-primary text-text-primary outline-none transition-all duration-120 focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-light)]"
            >
              <option value="zh-CN">中文</option>
              <option value="en">English</option>
            </select>
          </label>
        </section>

        <section class="mb-6 bg-bg-secondary border border-border-light rounded p-5">
          <h2 class="text-lg font-semibold mb-4 pb-2 border-b border-border-light text-text-primary">{t('settings.apiConfig')}</h2>

          <label class="flex flex-col gap-1 text-base font-medium text-text-primary mb-4">
            {t('settings.apiBaseUrl')}
            <input
              type="text"
              value={form.apiBaseUrl}
              onInput={(e) => update('apiBaseUrl', (e.target as HTMLInputElement).value)}
              placeholder="https://api.openai.com/v1"
              class="py-2 px-3 border border-border rounded-sm text-base font-sans bg-bg-primary text-text-primary outline-none transition-all duration-120 placeholder:text-text-tertiary focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-light)]"
            />
          </label>

          <label class="flex flex-col gap-1 text-base font-medium text-text-primary mb-4">
            {t('settings.apiKey')}
            <input
              type="password"
              value={form.apiKey}
              onInput={(e) => update('apiKey', (e.target as HTMLInputElement).value)}
              placeholder="sk-..."
              class="py-2 px-3 border border-border rounded-sm text-base font-sans bg-bg-primary text-text-primary outline-none transition-all duration-120 placeholder:text-text-tertiary focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-light)]"
            />
          </label>

          <label class="flex flex-col gap-1 text-base font-medium text-text-primary mb-4">
            {t('settings.chatModel')}
            <input
              type="text"
              value={form.chatModel}
              onInput={(e) => update('chatModel', (e.target as HTMLInputElement).value)}
              class="py-2 px-3 border border-border rounded-sm text-base font-sans bg-bg-primary text-text-primary outline-none transition-all duration-120 focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-light)]"
            />
          </label>

          <label class="flex flex-col gap-1 text-base font-medium text-text-primary mb-4">
            {t('settings.embeddingModel')}
            <input
              type="text"
              value={form.embeddingModel}
              onInput={(e) => update('embeddingModel', (e.target as HTMLInputElement).value)}
              class="py-2 px-3 border border-border rounded-sm text-base font-sans bg-bg-primary text-text-primary outline-none transition-all duration-120 focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-light)]"
            />
          </label>
        </section>

        <section class="mb-6 bg-bg-secondary border border-border-light rounded p-5">
          <h2 class="text-lg font-semibold mb-4 pb-2 border-b border-border-light text-text-primary">{t('settings.searchSettings')}</h2>

          <label class="flex flex-col gap-1 text-base font-medium text-text-primary mb-4">
            {t('settings.embeddingMode')}
            <select
              value={form.embeddingMode}
              onChange={(e) =>
                update('embeddingMode', (e.target as HTMLSelectElement).value)
              }
              class="py-2 px-3 border border-border rounded-sm text-base font-sans bg-bg-primary text-text-primary outline-none transition-all duration-120 focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-light)]"
            >
              <option value="remote">{t('settings.embeddingModeRemote')}</option>
              <option value="local">{t('settings.embeddingModeLocal')}</option>
            </select>
          </label>

          <label class="flex flex-col gap-1 text-base font-medium text-text-primary mb-4">
            {t('settings.vectorSearchTopK')}
            <input
              type="number"
              min={5}
              max={100}
              value={form.vectorSearchTopK}
              onInput={(e) =>
                update('vectorSearchTopK', parseInt((e.target as HTMLInputElement).value))
              }
              class="py-2 px-3 border border-border rounded-sm text-base font-sans bg-bg-primary text-text-primary outline-none transition-all duration-120 focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-light)]"
            />
          </label>

          <label class="flex flex-col gap-1 text-base font-medium text-text-primary mb-4">
            {t('settings.maxBookmarksLLM')}
            <input
              type="number"
              min={50}
              max={2000}
              value={form.maxBookmarksForLLM}
              onInput={(e) =>
                update('maxBookmarksForLLM', parseInt((e.target as HTMLInputElement).value))
              }
              class="py-2 px-3 border border-border rounded-sm text-base font-sans bg-bg-primary text-text-primary outline-none transition-all duration-120 focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-light)]"
            />
          </label>
        </section>

        <section class="mb-6 bg-bg-secondary border border-border-light rounded p-5">
          <h2 class="text-lg font-semibold mb-4 pb-2 border-b border-border-light text-text-primary">{t('settings.indexManagement')}</h2>
          <div class="flex gap-2 flex-wrap">
            <button type="button" onClick={handleReindex}
              class="py-2 px-4 border border-border rounded-sm bg-bg-primary text-text-primary cursor-pointer text-base font-medium transition-all duration-120 hover:bg-bg-hover hover:border-accent-border"
            >
              {t('settings.reindex')}
            </button>
          </div>
        </section>

        <div class="pt-4 border-t border-border-light">
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
