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
      <div class="flex-1 overflow-y-auto flex flex-col gap-px -mx-1 px-1">
        <div class="p-3 text-xs text-text-tertiary text-center">
          {t('sidebar.noConversations')}
        </div>
      </div>
    );
  }

  return (
    <div class="flex-1 overflow-y-auto flex flex-col gap-px -mx-1 px-1">
      {conversations.map((conv) => (
        <div
          key={conv.id}
          class={`conv-item flex items-center justify-between gap-2 py-2 px-3 rounded cursor-pointer transition-colors duration-120 text-base relative ${
            conv.id === activeId
              ? 'bg-accent-light text-accent font-medium'
              : 'hover:bg-bg-hover'
          }`}
          onClick={() => onSelect(conv.id)}
        >
          <div class="overflow-hidden">
            <div class="overflow-hidden text-ellipsis whitespace-nowrap text-[13px]">
              {conv.title}
            </div>
            <div class="text-[11px] text-text-tertiary">
              {relativeTimeLocale(locale, conv.updatedAt)}
            </div>
          </div>
          <button
            class="conv-delete-btn"
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
