import { I18nProvider } from '@/ui/hooks/useI18n';
import ChatView from '@/ui/components/ChatView';
import ChatInput from '@/ui/components/ChatInput';
import IndexStatus from '@/ui/components/IndexStatus';
import SettingsBar from '@/ui/components/SettingsBar';
import { useChat } from '@/ui/hooks/useChat';
import { useSettings } from '@/ui/hooks/useSettings';

function PopupApp() {
  const { settings } = useSettings();
  const { messages, status, sendMessage, clearChat, openSidePanel } = useChat();

  if (!settings) {
    return (
      <div class="app-container">
        <SettingsBar onSave={() => {}} />
      </div>
    );
  }

  return (
    <div class="app-container">
      <SettingsBar onSave={openSidePanel} />
      <IndexStatus />
      <ChatView messages={messages} status={status} onClear={clearChat} />
      <ChatInput onSend={sendMessage} disabled={status === 'searching'} />
    </div>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <PopupApp />
    </I18nProvider>
  );
}
