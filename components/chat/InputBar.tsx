'use client';
import { useRef, useState, type KeyboardEvent } from 'react';

interface Props {
  onSend: (message: string) => void;
  onStop?: () => void;
  disabled?: boolean;
}

export default function InputBar({ onSend, onStop, disabled = false }: Props) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleSend() {
    if (!value.trim() || disabled) return;
    onSend(value.trim());
    setValue('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleInput() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }

  const isStreaming = disabled && !!onStop;

  return (
    <div className="flex-shrink-0 border-t border-border bg-background px-4 py-3">
      <div className="flex items-end gap-3 max-w-4xl mx-auto">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          rows={1}
          disabled={disabled}
          placeholder={
            disabled
              ? 'AI가 응답 중입니다...'
              : '메시지를 입력하세요. (Enter: 전송, Shift+Enter: 줄바꿈)'
          }
          className="flex-1 resize-none rounded-lg border border-border bg-card text-foreground placeholder:text-muted text-sm px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent disabled:opacity-50 transition-colors min-h-[44px] max-h-40"
        />

        {isStreaming ? (
          <button
            onClick={onStop}
            aria-label="응답 중단"
            title="응답 중단"
            className="flex-shrink-0 w-10 h-10 rounded-lg bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
          >
            {/* filled square — stop icon */}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <rect x="5" y="5" width="14" height="14" rx="2" />
            </svg>
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={disabled || !value.trim()}
            aria-label="메시지 전송"
            className="flex-shrink-0 w-10 h-10 rounded-lg bg-accent text-white flex items-center justify-center hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
