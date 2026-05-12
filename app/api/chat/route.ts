import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { dbConnect } from '@/lib/mongodb';
import { anthropic, CLAUDE_MODEL, MAX_TOKENS, MAX_HISTORY_MESSAGES } from '@/lib/claude';
import Conversation from '@/models/Conversation';
import Message from '@/models/Message';

export async function POST(req: NextRequest) {
  let conversationId: string | undefined;

  try {
    const body = await req.json();
    conversationId = body.conversationId as string;
    const userMessage = body.message as string;

    if (!conversationId || !userMessage?.trim()) {
      return NextResponse.json(
        { error: 'conversationId와 message는 필수입니다.' },
        { status: 400 }
      );
    }

    await dbConnect();

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return NextResponse.json({ error: '대화를 찾을 수 없습니다.' }, { status: 404 });
    }

    // 기존 메시지 기록 조회 (최근 N개)
    const history = await Message.find({ conversationId })
      .sort({ createdAt: -1 })
      .limit(MAX_HISTORY_MESSAGES)
      .lean();
    history.reverse();

    // 유저 메시지 DB 저장
    await Message.create({
      conversationId,
      role: 'user',
      content: userMessage.trim(),
    });

    // Claude API에 전달할 메시지 배열 구성
    const messages: Anthropic.MessageParam[] = [
      ...history.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user', content: userMessage.trim() },
    ];

    // 스트리밍 응답 생성
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        let fullContent = '';

        try {
          const anthropicStream = anthropic.messages.stream({
            model: CLAUDE_MODEL,
            max_tokens: MAX_TOKENS,
            system: conversation.systemPrompt || undefined,
            messages,
          });

          for await (const event of anthropicStream) {
            if (
              event.type === 'content_block_delta' &&
              event.delta.type === 'text_delta'
            ) {
              const text = event.delta.text;
              fullContent += text;
              controller.enqueue(encoder.encode(text));
            }
          }

          // 스트림 종료 후 assistant 메시지 DB 저장
          await Message.create({
            conversationId,
            role: 'assistant',
            content: fullContent,
          });

          // 첫 번째 메시지인 경우 대화 제목 자동 설정
          if (conversation.title === '새 대화' || !conversation.title) {
            const autoTitle = userMessage.trim().slice(0, 30);
            await Conversation.findByIdAndUpdate(conversationId, { title: autoTitle });
          }

          controller.close();
        } catch (err) {
          // 스트림 중 오류: 클라이언트에 에러 신호 전송
          const errorMsg = err instanceof Anthropic.APIError
            ? `[ERROR] ${err.status}: ${err.message}`
            : '[ERROR] AI 응답 중 오류가 발생했습니다.';
          controller.enqueue(encoder.encode(errorMsg));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (err) {
    console.error('[/api/chat]', err);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
