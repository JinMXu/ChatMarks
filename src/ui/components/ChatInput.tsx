import { useRef, useState, useCallback } from 'preact/hooks';
import { useI18n } from '@/ui/hooks/useI18n';

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
}

export default function ChatInput({ onSend, disabled }: ChatInputProps) {
  const { t } = useI18n();
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(() => {
    if (!text.trim() || disabled) return;
    onSend(text);
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [text, disabled, onSend]);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: Event) => {
    const target = e.target as HTMLTextAreaElement;
    setText(target.value);
    target.style.height = 'auto';
    target.style.height = Math.min(target.scrollHeight, 120) + 'px';
  };

  return (
    <div class="chat-input-container">
      <div class="chat-input-row">
        <textarea
          ref={textareaRef}
          value={text}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={t('chat.placeholder')}
          disabled={disabled}
          rows={1}
        />
        <button onClick={handleSend} disabled={disabled || !text.trim()} title={t('chat.send')}>
          ↑
        </button>
      </div>
    </div>
  );
}
