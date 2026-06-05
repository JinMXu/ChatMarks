import { useI18n } from '@/ui/hooks/useI18n';

interface SettingsBarProps {
  onSave: () => void;
}

export default function SettingsBar({ onSave }: SettingsBarProps) {
  const { t } = useI18n();

  const handleSettings = () => {
    chrome.runtime.openOptionsPage?.();
  };

  const handleDashboard = () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
  };

  return (
    <div class="flex items-center justify-between p-2 px-3 bg-bg-secondary border-b border-border-light shrink-0">
      <span class="text-base font-semibold text-text-primary">{t('settingsBar.title')}</span>
      <div class="flex gap-1">
        <button class="btn-text" onClick={handleDashboard} title={t('settingsBar.dashboard')}>
          {t('settingsBar.dashboard')}
        </button>
        <button class="btn-text" onClick={onSave} title={t('settingsBar.sidePanel')}>
          {t('settingsBar.sidePanel')}
        </button>
        <button class="btn-text" onClick={handleSettings} title={t('settingsBar.settings')}>
          {t('settingsBar.settings')}
        </button>
      </div>
    </div>
  );
}
