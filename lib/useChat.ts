'use client';
import { useCallback, useRef } from 'react';
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

  // 진행 중인 스트리밍 요청을 추적 — 대화 전환·삭제·재전송 시 abort
  const abortControllerRef = useRef<AbortController | null>(null);

  const loadConversations = useCallback(async () => {
    const res = await fetch('/api/conversations');
    if (!res.ok) return;
    const data: ConversationDTO[] = await res.json();
    useChatStore.getState().setConversations(data);
  }, []);

  const selectConversation = useCallback(async (id: string) => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;

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
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;

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
    if (useChatStore.getState().activeConversationId === id) {
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
    }
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

  const updateConversationTitle = useCallback(async (id: string, title: string) => {
    const trimmed = title.trim();
    if (!trimmed) return false;
    const res = await fetch(`/api/conversations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: trimmed }),
    });
    if (!res.ok) return false;
    const data: ConversationDTO = await res.json();
    useChatStore.getState().updateConversation(id, { title: data.title });
    return true;
  }, []);

  const stopStreaming = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    useChatStore.getState().resetStreaming();
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    const { activeConversationId } = useChatStore.getState();
    if (!activeConversationId || !content.trim()) return;

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

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
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const statusMessages: Record<number, string> = {
          429: 'AI 요청 한도에 도달했습니다. 잠시 후 다시 시도해 주세요.',
          404: '대화를 찾을 수 없습니다.',
          401: 'API 키가 유효하지 않습니다.',
        };
        const msg = statusMessages[res.status] ?? `서버 오류가 발생했습니다. (${res.status})`;
        useChatStore.getState().setErrorMessage(msg);
        return;
      }

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

      if (fullContent.startsWith('[ERROR]')) {
        const msg = fullContent.replace(/^\[ERROR\]\s*/, '');
        useChatStore.getState().setErrorMessage(msg || 'AI 응답 중 오류가 발생했습니다.');
      } else {
        const assistantMsg: MessageDTO = {
          _id: `temp-assistant-${Date.now()}`,
          conversationId: activeConversationId,
          role: 'assistant',
          content: fullContent,
          createdAt: new Date().toISOString(),
        };
        useChatStore.getState().addMessage(assistantMsg);
        await loadConversations();
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      useChatStore.getState().setErrorMessage('네트워크 오류가 발생했습니다. 다시 시도해 주세요.');
    } finally {
      useChatStore.getState().resetStreaming();
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
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
    stopStreaming,
    updateSystemPrompt,
    updateConversationTitle,
  };
}
