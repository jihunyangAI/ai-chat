'use client';
import type { MessageDTO } from '@/lib/types';

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
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-[72%] ${isUser ? '' : 'flex flex-col'}`}>
        {!isUser && (
          <span className="text-xs font-medium text-muted mb-1 ml-1">AI</span>
        )}
        <div
          className={
            isUser
              ? 'bg-user-bubble text-user-bubble-text rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm leading-relaxed'
              : 'bg-card text-foreground rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm leading-relaxed shadow-sm border border-border'
          }
        >
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        </div>
        <span
          className={`text-xs text-muted mt-1 block ${isUser ? 'text-right' : 'text-left ml-1'}`}
        >
          {formatTime(message.createdAt)}
        </span>
      </div>
    </div>
  );
}
