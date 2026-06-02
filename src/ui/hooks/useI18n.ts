import { createContext, type ComponentChildren } from 'preact';
import { useContext, useEffect, useState, useCallback } from 'preact/hooks';
import { h } from 'preact';
import type { Locale } from '@/shared/i18n';
import { t, detectSystemLocale } from '@/shared/i18n';
import { useSettings } from './useSettings';

interface I18nContextType {
  locale: Locale;
  t: (key: string, params?: Record<string, string | number>) => string;
  setLocale: (locale: Locale) => void;
}

const I18nContext = createContext<I18nContextType>({
  locale: 'en',
  t: (key) => key,
  setLocale: () => {},
});

/**
 * Provider that reads locale from settings (or falls back to system locale).
 */
export function I18nProvider({ children }: { children: ComponentChildren }) {
  const { settings } = useSettings();
  const [locale, setLocaleState] = useState<Locale>(() => detectSystemLocale());

  useEffect(() => {
    if (settings?.language) {
      setLocaleState(settings.language as Locale);
    }
  }, [settings?.language]);

  const setLocale = useCallback(async (newLocale: Locale) => {
    setLocaleState(newLocale);
    chrome.runtime.sendMessage({
      type: 'SAVE_SETTINGS',
      settings: { language: newLocale },
    });
  }, []);

  const translate = useCallback(
    (key: string, params?: Record<string, string | number>) => t(locale, key, params),
    [locale],
  );

  return h(
    I18nContext.Provider,
    { value: { locale, t: translate, setLocale } },
    children,
  );
}

export function useI18n(): I18nContextType {
  return useContext(I18nContext);
}
