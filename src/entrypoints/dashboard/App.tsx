import { I18nProvider, useI18n } from '@/ui/hooks/useI18n';
import BookmarkTree from '@/ui/components/BookmarkTree';
import ChatView from '@/ui/components/ChatView';
import ChatInput from '@/ui/components/ChatInput';
import ResultPanel from '@/ui/components/ResultPanel';
import OrganizePanel from '@/ui/components/OrganizePanel';
import DuplicatesPanel from '@/ui/components/DuplicatesPanel';
import ExportImportPanel from '@/ui/components/ExportImportPanel';
import SettingsPanel from '@/ui/components/SettingsPanel';
import { useChat } from '@/ui/hooks/useChat';
import { useMemo, useState } from 'preact/hooks';
import type { SearchResult } from '@/shared/types';

type RightPanel = 'results' | 'organize' | 'duplicates' | 'exportImport' | 'settings';

function DashboardApp() {
  const { t } = useI18n();
  const { messages, status, sendMessage, clearChat } = useChat();
  const [rightPanel, setRightPanel] = useState<RightPanel>('results');

  const latestResults: SearchResult[] = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant' && messages[i].results?.length) {
        return messages[i].results;
      }
    }
    return [];
  }, [messages]);

  const switchTo = (panel: RightPanel) => {
    setRightPanel((prev) => (prev === panel ? 'results' : panel));
  };

  return (
    <div class="dashboard-container">
      {/* Left: Bookmark Tree */}
      <aside class="dashboard-left">
        <BookmarkTree />
        <div class="dashboard-left-footer">
          <button
            class={`btn-text ${rightPanel === 'duplicates' ? 'active' : ''}`}
            onClick={() => switchTo('duplicates')}
          >
            {t('duplicates.title')}
          </button>
          <button
            class={`btn-text ${rightPanel === 'organize' ? 'active' : ''}`}
            onClick={() => switchTo('organize')}
          >
            {t('organize.title')}
          </button>
          <button
            class={`btn-text ${rightPanel === 'exportImport' ? 'active' : ''}`}
            onClick={() => switchTo('exportImport')}
          >
            {t('exportImport.title')}
          </button>
          <button
            class={`btn-text ${rightPanel === 'settings' ? 'active' : ''}`}
            onClick={() => switchTo('settings')}
          >
            {t('sidebar.settings')}
          </button>
        </div>
      </aside>

      {/* Center: Chat */}
      <main class="dashboard-center">
        <ChatView messages={messages} status={status} onClear={clearChat} />
        <ChatInput onSend={sendMessage} disabled={status === 'searching'} />
      </main>

      {/* Right: Panel switcher */}
      <aside class="dashboard-right">
        {rightPanel === 'duplicates' && (
          <DuplicatesPanel onClose={() => setRightPanel('results')} />
        )}
        {rightPanel === 'organize' && (
          <OrganizePanel onClose={() => setRightPanel('results')} />
        )}
        {rightPanel === 'exportImport' && (
          <ExportImportPanel onClose={() => setRightPanel('results')} />
        )}
        {rightPanel === 'settings' && (
          <SettingsPanel onClose={() => setRightPanel('results')} />
        )}
        {rightPanel === 'results' && (
          <ResultPanel results={latestResults} />
        )}
      </aside>
    </div>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <DashboardApp />
    </I18nProvider>
  );
}
