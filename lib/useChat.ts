'use client';
import { useCallback } from 'react';
import { useChatStore } from '@/lib/store';
import type { ConversationDTO, MessageDTO } from '@/lib/types';

export function useChat() {
  const conversations = useChatStore((s) => s.conversations);
  const activeConversationId = useChatStore((s) => s.activeConversationId);
  const messages = useChatStore((s) => s.messages);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const streamingContent = useChatStore((s) => s.streamingContent);
  const isLoadingMessages = useChatStore((s) => s.isLoadingMessages);
  const isSidebarOpen = useChatStore((s) => s.isSidebarOpen);
  const setSidebarOpen = useChatStore((s) => s.setSidebarOpen);
  const errorMessage = useChatStore((s) => s.errorMessage);

  const loadConversations = useCallback(async () => {
    const res = await fetch('/api/conversations');
    if (!res.ok) return;
    const data: ConversationDTO[] = await res.json();
    useChatStore.getState().setConversations(data);
  }, []);

  const selectConversation = useCallback(async (id: string) => {
    const state = useChatStore.getState();
    state.setActiveConversationId(id);
    state.setMessages([]);
    state.setIsLoadingMessages(true);
    try {
      const res = await fetch(`/api/conversations/${id}`);
      if (!res.ok) return;
      const data: { conversation: ConversationDTO; messages: MessageDTO[] } = await res.json();
      useChatStore.getState().setMessages(data.messages);
    } finally {
      useChatStore.getState().setIsLoadingMessages(false);
    }
  }, []);

  const createConversation = useCallback(async (systemPrompt = '') => {
    const res = await fetch('/api/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ systemPrompt }),
    });
    if (!res.ok) return null;
    const data: ConversationDTO = await res.json();
    const state = useChatStore.getState();
    state.addConversation(data);
    state.setActiveConversationId(data._id);
    state.setMessages([]);
    return data;
  }, []);

  const deleteConversation = useCallback(async (id: string) => {
    const res = await fetch(`/api/conversations/${id}`, { method: 'DELETE' });
    if (!res.ok) return;
    const state = useChatStore.getState();
    state.removeConversation(id);
    if (state.activeConversationId === id) {
      state.setActiveConversationId(null);
      state.setMessages([]);
    }
  }, []);

  const updateSystemPrompt = useCallback(async (systemPrompt: string) => {
    const { activeConversationId } = useChatStore.getState();
    if (!activeConversationId) return false;
    const res = await fetch(`/api/conversations/${activeConversationId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ systemPrompt }),
    });
    if (!res.ok) return false;
    const data: ConversationDTO = await res.json();
    useChatStore.getState().updateConversation(activeConversationId, { systemPrompt: data.systemPrompt });
    return true;
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    const { activeConversationId } = useChatStore.getState();
    if (!activeConversationId || !content.trim()) return;

    const userMsg: MessageDTO = {
      _id: `temp-user-${Date.now()}`,
      conversationId: activeConversationId,
      role: 'user',
      content: content.trim(),
      createdAt: new Date().toISOString(),
    };

    const state = useChatStore.getState();
    state.addMessage(userMsg);
    state.setIsStreaming(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: activeConversationId, message: content.trim() }),
      });

      if (!res.ok || !res.body) return;

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        fullContent += chunk;
        useChatStore.getState().appendStreamingContent(chunk);
      }

      // 스트리밍 중 서버 에러([ERROR] 접두어) 감지
      if (fullContent.startsWith('[ERROR]')) {
        const msg = fullContent.replace(/^\[ERROR\]\s*/, '');
        useChatStore.getState().setErrorMessage(msg || 'AI 응답 중 오류가 발생했습니다.');
        // 에러 메시지는 대화에 추가하지 않음
      } else {
        const assistantMsg: MessageDTO = {
          _id: `temp-assistant-${Date.now()}`,
          conversationId: activeConversationId,
          role: 'assistant',
          content: fullContent,
          createdAt: new Date().toISOString(),
        };
        useChatStore.getState().addMessage(assistantMsg);
        // 사이드바 제목 동기화 (첫 메시지로 업데이트됨)
        await loadConversations();
      }
    } finally {
      useChatStore.getState().resetStreaming();
    }
  }, [loadConversations]);

  return {
    conversations,
    activeConversationId,
    messages,
    isStreaming,
    streamingContent,
    isLoadingMessages,
    isSidebarOpen,
    errorMessage,
    setSidebarOpen,
    clearError: () => useChatStore.getState().setErrorMessage(null),
    loadConversations,
    selectConversation,
    createConversation,
    deleteConversation,
    sendMessage,
    updateSystemPrompt,
  };
}
