'use client';
import { useState } from 'react';
import type { MessageDTO } from '@/lib/types';
import MarkdownRenderer from '@/components/ui/MarkdownRenderer';

interface Props {
  message: MessageDTO;
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function MessageBubble({ message }: Props) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';

  function handleCopy() {
    navigator.clipboard.writeText(message.content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className={`group flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-[72%] ${isUser ? '' : 'flex flex-col'}`}>
        {!isUser && (
          <span className="text-xs font-medium text-muted mb-1 ml-1">AI</span>
        )}

        <div
          className={
            isUser
              ? 'bg-user-bubble text-user-bubble-text rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm leading-relaxed'
              : 'bg-card text-foreground rounded-2xl rounded-tl-sm px-4 py-2.5 shadow-sm border border-border'
          }
        >
          {isUser ? (
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          ) : (
            <MarkdownRenderer content={message.content} />
          )}
        </div>

        {/* 타임스탬프 + 복사 버튼 */}
        {isUser ? (
          <span className="text-xs text-muted mt-1 block text-right">
            {formatTime(message.createdAt)}
          </span>
        ) : (
          <div className="flex items-center justify-between mt-1 ml-1">
            <button
              onClick={handleCopy}
              aria-label="메시지 복사"
              className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-xs text-muted hover:text-foreground transition-all p-0.5 rounded"
            >
              {copied ? (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>복사됨</span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span>복사</span>
                </>
              )}
            </button>
            <span className="text-xs text-muted">{formatTime(message.createdAt)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
