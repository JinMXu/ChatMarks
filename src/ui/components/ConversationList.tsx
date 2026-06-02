import type { Conversation, ConversationId } from '@/shared/types';
import { relativeTimeLocale } from '@/shared/i18n';
import { useI18n } from '@/ui/hooks/useI18n';

interface ConversationListProps {
  conversations: Conversation[];
  activeId?: ConversationId;
  onSelect: (id: ConversationId) => void;
  onDelete: (id: ConversationId) => void;
}

export default function ConversationList({
  conversations,
  activeId,
  onSelect,
  onDelete,
}: ConversationListProps) {
  const { t, locale } = useI18n();

  if (conversations.length === 0) {
    return (
      <div class="conversation-list">
        <div style={{ padding: '12px', color: 'var(--text-tertiary)', fontSize: '12px', textAlign: 'center' }}>
          {t('sidebar.noConversations')}
        </div>
      </div>
    );
  }

  return (
    <div class="conversation-list">
      {conversations.map((conv) => (
        <div
          key={conv.id}
          class={`conversation-item ${conv.id === activeId ? 'active' : ''}`}
          onClick={() => onSelect(conv.id)}
        >
          <div style={{ overflow: 'hidden' }}>
            <div
              style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontSize: '13px',
              }}
            >
              {conv.title}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
              {relativeTimeLocale(locale, conv.updatedAt)}
            </div>
          </div>
          <button
            class="delete-btn"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(conv.id);
            }}
            title={t('delete')}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
