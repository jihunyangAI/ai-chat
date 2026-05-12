import type { Types } from 'mongoose';

export interface IConversation {
  _id: Types.ObjectId;
  title: string;
  systemPrompt: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IMessage {
  _id: Types.ObjectId;
  conversationId: Types.ObjectId;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
}

// Plain serializable versions for client components
export interface ConversationDTO {
  _id: string;
  title: string;
  systemPrompt: string;
  createdAt: string;
  updatedAt: string;
}

export interface MessageDTO {
  _id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}
