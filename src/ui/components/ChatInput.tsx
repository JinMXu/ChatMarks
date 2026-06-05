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
    <div class="p-3 px-4 border-t border-border-light bg-bg-primary shrink-0">
      <div class="flex gap-2 items-end bg-bg-secondary border border-border rounded-xl p-1 pl-4 transition-colors duration-180 focus-within:border-accent focus-within:shadow-[0_0_0_3px_var(--accent-light)]">
        <textarea
          ref={textareaRef}
          value={text}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={t('chat.placeholder')}
          disabled={disabled}
          rows={1}
          class="flex-1 resize-none min-h-[22px] max-h-[120px] py-2 border-none outline-none font-sans text-base leading-[1.4] text-text-primary bg-transparent self-center placeholder:text-text-tertiary disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <button
          onClick={handleSend}
          disabled={disabled || !text.trim()}
          title={t('chat.send')}
          class="shrink-0 w-[34px] h-[34px] rounded-full border-none bg-accent text-white cursor-pointer text-lg flex items-center justify-center transition-all duration-120 p-0 leading-none hover:not-disabled:bg-accent-hover hover:not-disabled:scale-105 hover:not-disabled:shadow-sm active:not-disabled:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-text-tertiary"
        >
          ↑
        </button>
      </div>
    </div>
  );
}
