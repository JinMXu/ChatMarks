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
    <div class="sidepanel-container">
      <aside class="sidebar">
        <div class="sidebar-header">
          <h2>ChatMarks</h2>
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
        <div class="sidebar-footer">
          <button class="btn-text" onClick={handleDashboard}>
            {t('settingsBar.dashboard')}
          </button>
          <button class="btn-text" onClick={handleSettingsClick}>
            {t('sidebar.settings')}
          </button>
          <IndexStatus minimal />
        </div>
      </aside>
      <main class="chat-area">
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
