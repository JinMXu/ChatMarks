import { useState, useEffect } from 'preact/hooks';
import type { Settings } from '@/shared/types';
import { DEFAULT_SETTINGS } from '@/shared/types';

export function useSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, (response) => {
      if (response?.settings) {
        setSettings(response.settings);
      }
    });
  }, []);

  const saveSettings = async (updated: Settings) => {
    await chrome.runtime.sendMessage({
      type: 'SAVE_SETTINGS',
      settings: updated,
    });
    setSettings(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return { settings, saveSettings, saved };
}
