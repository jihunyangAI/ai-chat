import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongodb';
import Conversation from '@/models/Conversation';
import type { ConversationDTO } from '@/lib/types';

// 4.1 GET /api/conversations — 전체 목록 (최신순)
export async function GET() {
  try {
    await dbConnect();

    const conversations = await Conversation.find()
      .sort({ updatedAt: -1 })
      .select('title systemPrompt createdAt updatedAt')
      .lean();

    const data: ConversationDTO[] = conversations.map((c) => ({
      _id: c._id.toString(),
      title: c.title,
      systemPrompt: c.systemPrompt,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }));

    return NextResponse.json(data);
  } catch (err) {
    console.error('[GET /api/conversations]', err);
    return NextResponse.json({ error: '대화 목록을 불러오지 못했습니다.' }, { status: 500 });
  }
}

// 4.2 POST /api/conversations — 새 대화 생성
export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    const body = await req.json().catch(() => ({}));
    const systemPrompt = typeof body.systemPrompt === 'string' ? body.systemPrompt : '';

    const conversation = await Conversation.create({
      title: '새 대화',
      systemPrompt,
    });

    const data: ConversationDTO = {
      _id: conversation._id.toString(),
      title: conversation.title,
      systemPrompt: conversation.systemPrompt,
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
    };

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error('[POST /api/conversations]', err);
    return NextResponse.json({ error: '대화를 생성하지 못했습니다.' }, { status: 500 });
  }
}
