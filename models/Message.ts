import { model, models, Schema } from 'mongoose';
import type { IMessage } from '@/lib/types';

const messageSchema = new Schema<IMessage>(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Next.js 핫리로드 시 모델이 중복 등록되는 것을 방지
const Message = models.Message ?? model<IMessage>('Message', messageSchema);

export default Message;
