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
    <div class="dashboard-container flex h-screen overflow-hidden bg-bg-primary">
      {/* Left: Bookmark Tree */}
      <aside class="dashboard-left w-[280px] min-w-[220px] max-w-[400px] overflow-hidden bg-bg-secondary border-r border-border flex flex-col">
        <BookmarkTree />
        <div class="p-2 px-3 border-t border-border-light shrink-0">
          <button
            class={`btn-text ${rightPanel === 'duplicates' ? 'text-accent bg-accent-light font-semibold' : ''}`}
            onClick={() => switchTo('duplicates')}
          >
            {t('duplicates.title')}
          </button>
          <button
            class={`btn-text ${rightPanel === 'organize' ? 'text-accent bg-accent-light font-semibold' : ''}`}
            onClick={() => switchTo('organize')}
          >
            {t('organize.title')}
          </button>
          <button
            class={`btn-text ${rightPanel === 'exportImport' ? 'text-accent bg-accent-light font-semibold' : ''}`}
            onClick={() => switchTo('exportImport')}
          >
            {t('exportImport.title')}
          </button>
          <button
            class={`btn-text ${rightPanel === 'settings' ? 'text-accent bg-accent-light font-semibold' : ''}`}
            onClick={() => switchTo('settings')}
          >
            {t('sidebar.settings')}
          </button>
        </div>
      </aside>

      {/* Center: Chat */}
      <main class="flex-1 flex flex-col overflow-hidden min-w-0">
        <ChatView messages={messages} status={status} onClear={clearChat} />
        <ChatInput onSend={sendMessage} disabled={status === 'searching'} />
      </main>

      {/* Right: Panel switcher */}
      <aside class="dashboard-right w-[320px] min-w-[240px] max-w-[500px] overflow-hidden bg-bg-secondary border-l border-border flex flex-col">
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
