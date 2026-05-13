'use client';
import { useEffect, useRef } from 'react';
import type { MessageDTO } from '@/lib/types';
import MessageBubble from './MessageBubble';
import MarkdownRenderer from '@/components/ui/MarkdownRenderer';

interface Props {
  messages: MessageDTO[];
  isStreaming: boolean;
  streamingContent: string;
  isLoading?: boolean;
}

function TypingIndicator({ content }: { content: string }) {
  return (
    <div className="flex justify-start mb-4">
      <div className="max-w-[72%] flex flex-col">
        <span className="text-xs font-medium text-muted mb-1 ml-1">AI</span>
        <div className="bg-card text-foreground rounded-2xl rounded-tl-sm px-4 py-2.5 shadow-sm border border-border">
          {content ? (
            <MarkdownRenderer content={content} />
          ) : (
            <span className="flex gap-1 items-center h-5">
              <span className="w-1.5 h-1.5 rounded-full bg-muted animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-muted animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-muted animate-bounce" />
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function SkeletonMessage({ reverse }: { reverse?: boolean }) {
  return (
    <div className={`flex ${reverse ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className="h-10 w-48 rounded-2xl bg-border animate-pulse" />
    </div>
  );
}

export default function ChatWindow({ messages, isStreaming, streamingContent, isLoading }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, streamingContent]);

  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-4xl mx-auto">
          <SkeletonMessage />
          <SkeletonMessage reverse />
          <SkeletonMessage />
        </div>
      </div>
    );
  }

  if (messages.length === 0 && !isStreaming) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
        <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4">
          <svg className="w-6 h-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-foreground">대화를 시작하세요</p>
        <p className="text-xs text-muted mt-1">아래 입력창에 메시지를 입력하면 AI가 응답합니다.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="max-w-4xl mx-auto">
        {messages.map((msg) => (
          <MessageBubble key={msg._id} message={msg} />
        ))}
        {isStreaming && <TypingIndicator content={streamingContent} />}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
