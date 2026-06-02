import { putConversation, getConversation } from '@/shared/db';
import { generateId } from '@/shared/utils';
import type { Conversation, ChatMessage, ConversationId, SearchResult } from '@/shared/types';
import { t, type Locale } from '@/shared/i18n';
import { STORAGE_KEY_SETTINGS } from '@/shared/constants';
import type { Settings } from '@/shared/types';

async function getLocale(): Promise<Locale> {
  try {
    const stored = await chrome.storage.local.get(STORAGE_KEY_SETTINGS);
    const settings: Settings | undefined = stored[STORAGE_KEY_SETTINGS];
    const lang = settings?.language;
    if (lang === 'zh-CN') return 'zh-CN';
  } catch {}
  return 'en';
}

export class ConversationManager {
  /**
   * Add a user message. Creates a new conversation if conversationId is not provided.
   */
  async addUserMessage(
    content: string,
    conversationId?: ConversationId,
  ): Promise<Conversation> {
    let conversation: Conversation;

    if (conversationId) {
      const existing = await getConversation(conversationId);
      if (existing) {
        conversation = existing;
      } else {
        conversation = await this.createNew();
      }
    } else {
      conversation = await this.createNew();
    }

    const message: ChatMessage = {
      id: generateId(),
      role: 'user',
      content,
      timestamp: Date.now(),
    };

    conversation.messages.push(message);
    conversation.updatedAt = Date.now();

    // Auto-title from first message
    if (conversation.messages.length === 1) {
      conversation.title = content.slice(0, 50) + (content.length > 50 ? '...' : '');
    }

    await putConversation(conversation);
    return conversation;
  }

  /**
   * Add an assistant message.
   */
  async addAssistantMessage(
    conversationId: ConversationId,
    content: string,
    results?: SearchResult[],
  ): Promise<void> {
    const conversation = await getConversation(conversationId);
    if (!conversation) return;

    const message: ChatMessage = {
      id: generateId(),
      role: 'assistant',
      content,
      timestamp: Date.now(),
      results,
    };

    conversation.messages.push(message);
    conversation.updatedAt = Date.now();

    await putConversation(conversation);
  }

  private async createNew(): Promise<Conversation> {
    const locale = await getLocale();
    return {
      id: generateId(),
      title: t(locale, 'conv.newChat'),
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }
}

/**
 * Get all conversation IDs from the database.
 */
export async function getAllConversationIds(): Promise<ConversationId[]> {
  const { getAllConversations } = await import('@/shared/db');
  const conversations = await getAllConversations();
  return conversations.map((c) => c.id);
}
