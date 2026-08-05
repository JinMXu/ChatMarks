import { useState, useEffect, useRef } from 'preact/hooks';
import type { Settings } from '@/shared/types';
import { DEFAULT_SETTINGS } from '@/shared/types';

export function useSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saved, setSaved] = useState(false);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, (response) => {
      if (response?.settings) {
        setSettings(response.settings);
      }
    });
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  const saveSettings = async (updated: Settings) => {
    try {
      await chrome.runtime.sendMessage({
        type: 'SAVE_SETTINGS',
        settings: updated,
      });
    } catch (err) {
      console.error('Failed to save settings:', err);
      return;
    }
    setSettings(updated);
    setSaved(true);
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => setSaved(false), 2000);
  };

  return { settings, saveSettings, saved };
}
