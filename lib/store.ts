import { create } from 'zustand';
import type { ConversationDTO, MessageDTO } from '@/lib/types';

interface ChatStore {
  conversations: ConversationDTO[];
  activeConversationId: string | null;
  messages: MessageDTO[];
  isStreaming: boolean;
  streamingContent: string;
  isLoadingMessages: boolean;
  isSidebarOpen: boolean;
  errorMessage: string | null;

  setConversations: (conversations: ConversationDTO[]) => void;
  addConversation: (conversation: ConversationDTO) => void;
  removeConversation: (id: string) => void;
  updateConversation: (id: string, updates: Partial<ConversationDTO>) => void;
  setActiveConversationId: (id: string | null) => void;
  setMessages: (messages: MessageDTO[]) => void;
  addMessage: (message: MessageDTO) => void;
  appendStreamingContent: (text: string) => void;
  setIsStreaming: (v: boolean) => void;
  resetStreaming: () => void;
  setIsLoadingMessages: (v: boolean) => void;
  setSidebarOpen: (v: boolean) => void;
  setErrorMessage: (msg: string | null) => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  conversations: [],
  activeConversationId: null,
  messages: [],
  isStreaming: false,
  streamingContent: '',
  isLoadingMessages: false,
  isSidebarOpen: false,
  errorMessage: null,

  setConversations: (conversations) => set({ conversations }),
  addConversation: (conversation) =>
    set((s) => ({ conversations: [conversation, ...s.conversations] })),
  removeConversation: (id) =>
    set((s) => ({ conversations: s.conversations.filter((c) => c._id !== id) })),
  updateConversation: (id, updates) =>
    set((s) => ({
      conversations: s.conversations.map((c) => (c._id === id ? { ...c, ...updates } : c)),
    })),
  setActiveConversationId: (id) => set({ activeConversationId: id }),
  setMessages: (messages) => set({ messages }),
  addMessage: (message) => set((s) => ({ messages: [...s.messages, message] })),
  appendStreamingContent: (text) =>
    set((s) => ({ streamingContent: s.streamingContent + text })),
  setIsStreaming: (v) => set({ isStreaming: v }),
  resetStreaming: () => set({ isStreaming: false, streamingContent: '' }),
  setIsLoadingMessages: (v) => set({ isLoadingMessages: v }),
  setSidebarOpen: (v) => set({ isSidebarOpen: v }),
  setErrorMessage: (msg) => set({ errorMessage: msg }),
}));
