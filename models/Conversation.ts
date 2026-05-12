import { model, models, Schema } from 'mongoose';
import type { IConversation } from '@/lib/types';

const conversationSchema = new Schema<IConversation>(
  {
    title: { type: String, required: true, default: '새 대화' },
    systemPrompt: { type: String, default: '' },
  },
  { timestamps: true }
);

// Next.js 핫리로드 시 모델이 중복 등록되는 것을 방지
const Conversation = models.Conversation ?? model<IConversation>('Conversation', conversationSchema);

export default Conversation;
