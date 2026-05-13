'use client';
import { useEffect, useState } from 'react';
import { useChat } from '@/lib/useChat';
import ConversationSidebar from '@/components/chat/ConversationSidebar';
import ChatWindow from '@/components/chat/ChatWindow';
import InputBar from '@/components/chat/InputBar';
import ThemeToggle from '@/components/ui/ThemeToggle';
import SystemPromptModal from '@/components/chat/SystemPromptModal';
import ErrorToast from '@/components/ui/ErrorToast';

export default function ChatPage() {
  const {
    conversations,
    activeConversationId,
    messages,
    isStreaming,
    streamingContent,
    isLoadingMessages,
    isSidebarOpen,
    setSidebarOpen,
    loadConversations,
    selectConversation,
    createConversation,
    deleteConversation,
    sendMessage,
    stopStreaming,
    updateSystemPrompt,
    updateConversationTitle,
    errorMessage,
    clearError,
  } = useChat();

  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const activeConversation = conversations.find((c) => c._id === activeConversationId);

  return (
    <div className="flex h-full bg-background overflow-hidden">
      {/* 모바일 사이드바 오버레이 */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* 사이드바 */}
      <div
        className={`
          fixed inset-y-0 left-0 z-30 h-full
          md:relative md:z-auto
          transition-transform duration-200 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        <ConversationSidebar
          conversations={conversations}
          activeId={activeConversationId}
          onSelect={(id) => { selectConversation(id); setSidebarOpen(false); }}
          onCreate={() => createConversation()}
          onDelete={deleteConversation}
          onRename={updateConversationTitle}
        />
      </div>

      {/* 메인 영역 */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        {/* 헤더 */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-background flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {/* 모바일 햄버거 */}
            <button
              onClick={() => setSidebarOpen(true)}
              aria-label="메뉴 열기"
              className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg text-muted hover:text-foreground hover:bg-border transition-colors flex-shrink-0"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h2 className="text-sm font-semibold text-foreground truncate">
              {activeConversation?.title ?? '대화를 선택하세요'}
            </h2>
          </div>

          {/* 헤더 우측 액션 */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {activeConversationId && (
              <button
                onClick={() => setIsPromptModalOpen(true)}
                aria-label="시스템 프롬프트 설정"
                title="시스템 프롬프트 설정"
                className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
                  activeConversation?.systemPrompt
                    ? 'text-accent hover:bg-accent/10'
                    : 'text-muted hover:text-foreground hover:bg-border'
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            )}
            <ThemeToggle />
          </div>
        </header>

        {/* 대화 미선택 화면 */}
        {!activeConversationId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
            <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mb-6">
              <svg className="w-8 h-8 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-foreground mb-2">AI 챗봇에 오신 것을 환영합니다</h3>
            <p className="text-sm text-muted mb-6 max-w-xs leading-relaxed">
              좌측 사이드바에서 새 대화를 시작하거나 기존 대화를 선택하세요.
            </p>
            <button
              onClick={() => createConversation()}
              className="px-5 py-2.5 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent-hover transition-colors"
            >
              새 대화 시작
            </button>
          </div>
        ) : (
          <>
            <ChatWindow
              messages={messages}
              isStreaming={isStreaming}
              streamingContent={streamingContent}
              isLoading={isLoadingMessages}
            />
            <InputBar onSend={sendMessage} onStop={stopStreaming} disabled={isStreaming} />
          </>
        )}
      </div>

      {/* 에러 토스트 */}
      <ErrorToast message={errorMessage} onDismiss={clearError} />

      {/* 시스템 프롬프트 모달 */}
      <SystemPromptModal
        isOpen={isPromptModalOpen}
        currentPrompt={activeConversation?.systemPrompt ?? ''}
        onClose={() => setIsPromptModalOpen(false)}
        onSave={updateSystemPrompt}
      />
    </div>
  );
}
