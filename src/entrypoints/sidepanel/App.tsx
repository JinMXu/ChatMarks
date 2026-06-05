import { I18nProvider, useI18n } from '@/ui/hooks/useI18n';
import ChatView from '@/ui/components/ChatView';
import ChatInput from '@/ui/components/ChatInput';
import IndexStatus from '@/ui/components/IndexStatus';
import ConversationList from '@/ui/components/ConversationList';
import { useChat } from '@/ui/hooks/useChat';
import { useConversations } from '@/ui/hooks/useConversations';

function SidePanelApp() {
  const { t } = useI18n();
  const { conversations, activeId, selectConversation, createConversation, deleteConversation } =
    useConversations();
  const { messages, status, sendMessage, clearChat } = useChat(activeId);

  const handleSettingsClick = () => {
    chrome.runtime.openOptionsPage?.();
  };

  const handleDashboard = () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
  };

  return (
    <div class="sidepanel-container flex h-screen overflow-hidden bg-bg-primary">
      <aside class="w-[260px] min-w-[260px] bg-bg-secondary border-r border-border flex flex-col p-3 gap-2">
        <div class="flex items-center justify-between py-1 px-1 pb-3 border-b border-border-light shrink-0">
          <h2 class="text-lg font-bold tracking-[-0.01em] text-text-primary">ChatMarks</h2>
          <button
            class="btn-icon"
            onClick={createConversation}
            title={t('sidebar.newConv')}
          >
            +
          </button>
        </div>
        <ConversationList
          conversations={conversations}
          activeId={activeId}
          onSelect={selectConversation}
          onDelete={deleteConversation}
        />
        <div class="mt-auto pt-2 border-t border-border-light flex flex-col gap-1 shrink-0">
          <button class="btn-text" onClick={handleDashboard}>
            {t('settingsBar.dashboard')}
          </button>
          <button class="btn-text" onClick={handleSettingsClick}>
            {t('sidebar.settings')}
          </button>
          <IndexStatus minimal />
        </div>
      </aside>
      <main class="flex-1 flex flex-col overflow-hidden min-w-0 bg-bg-primary">
        <ChatView messages={messages} status={status} onClear={clearChat} />
        <ChatInput onSend={sendMessage} disabled={status === 'searching'} />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <SidePanelApp />
    </I18nProvider>
  );
}
