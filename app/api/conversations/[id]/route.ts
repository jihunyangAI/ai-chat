import { NextRequest, NextResponse } from 'next/server';
import { isValidObjectId } from 'mongoose';
import { dbConnect } from '@/lib/mongodb';
import Conversation from '@/models/Conversation';
import Message from '@/models/Message';
import type { ConversationDTO, MessageDTO } from '@/lib/types';

type Params = { params: Promise<{ id: string }> };

function invalidId() {
  return NextResponse.json({ error: '유효하지 않은 대화 ID입니다.' }, { status: 400 });
}

function notFound() {
  return NextResponse.json({ error: '대화를 찾을 수 없습니다.' }, { status: 404 });
}

// 4.3 GET /api/conversations/[id] — 특정 대화의 메시지 전체 조회
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  if (!isValidObjectId(id)) return invalidId();

  try {
    await dbConnect();

    const conversation = await Conversation.findById(id).lean();
    if (!conversation) return notFound();

    const messages = await Message.find({ conversationId: id })
      .sort({ createdAt: 1 })
      .lean();

    const conversationData: ConversationDTO = {
      _id: conversation._id.toString(),
      title: conversation.title,
      systemPrompt: conversation.systemPrompt,
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
    };

    const messagesData: MessageDTO[] = messages.map((m) => ({
      _id: m._id.toString(),
      conversationId: m.conversationId.toString(),
      role: m.role,
      content: m.content,
      createdAt: m.createdAt.toISOString(),
    }));

    return NextResponse.json({ conversation: conversationData, messages: messagesData });
  } catch (err) {
    console.error('[GET /api/conversations/[id]]', err);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// 4.4 PATCH /api/conversations/[id] — 제목 또는 시스템 프롬프트 수정
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  if (!isValidObjectId(id)) return invalidId();

  try {
    await dbConnect();

    const body = await req.json().catch(() => ({}));
    const update: { title?: string; systemPrompt?: string } = {};

    if (typeof body.title === 'string' && body.title.trim()) {
      update.title = body.title.trim().slice(0, 100);
    }
    if (typeof body.systemPrompt === 'string') {
      update.systemPrompt = body.systemPrompt;
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: '수정할 항목(title, systemPrompt)이 없습니다.' }, { status: 400 });
    }

    const conversation = await Conversation.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true, runValidators: true }
    ).lean();

    if (!conversation) return notFound();

    const data: ConversationDTO = {
      _id: conversation._id.toString(),
      title: conversation.title,
      systemPrompt: conversation.systemPrompt,
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
    };

    return NextResponse.json(data);
  } catch (err) {
    console.error('[PATCH /api/conversations/[id]]', err);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// 4.5 DELETE /api/conversations/[id] — 대화 및 관련 메시지 삭제
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  if (!isValidObjectId(id)) return invalidId();

  try {
    await dbConnect();

    const conversation = await Conversation.findByIdAndDelete(id);
    if (!conversation) return notFound();

    await Message.deleteMany({ conversationId: id });

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error('[DELETE /api/conversations/[id]]', err);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
