# AI Chatbot — CLAUDE.md

## 프로젝트 개요

범용 AI 대화 챗봇. Next.js 풀스택으로 구성하며, Anthropic Claude API를 통해 AI 응답을 처리한다.
대화 기록은 MongoDB에 저장하고, 다크/라이트 모드와 한국어 UI를 기본으로 제공한다.
비즈니스 스타일 디자인, Google Cloud Run 배포, 동시접속 5~10명 규모를 기준으로 설계한다.

---

## 기술 스택

| 영역 | 기술 |
|---|---|
| 프론트엔드 | Next.js 14+ (App Router), React, TypeScript |
| 백엔드 | Next.js API Routes |
| AI | Anthropic Claude API (`claude-sonnet-4-6`) |
| DB | MongoDB (Mongoose ODM) |
| 스타일링 | Tailwind CSS |
| 상태 관리 | Zustand 또는 React Context |
| 배포 | Google Cloud Run (컨테이너 기반) |
| 컨테이너 | Docker |

---

## 디렉터리 구조

```
/
├── app/
│   ├── (chat)/
│   │   ├── page.tsx            # 메인 채팅 페이지
│   │   └── layout.tsx
│   ├── api/
│   │   ├── chat/
│   │   │   └── route.ts        # AI 응답 스트리밍 엔드포인트
│   │   └── conversations/
│   │       ├── route.ts        # 대화 목록 CRUD
│   │       └── [id]/route.ts   # 개별 대화 CRUD
│   └── layout.tsx
├── components/
│   ├── chat/
│   │   ├── ChatWindow.tsx      # 메시지 목록 + 입력창
│   │   ├── MessageBubble.tsx   # 단일 메시지 컴포넌트
│   │   ├── InputBar.tsx        # 텍스트 입력 + 전송 버튼
│   │   └── ConversationSidebar.tsx  # 대화 세션 목록
│   └── ui/
│       ├── ThemeToggle.tsx     # 다크/라이트 모드 토글
│       └── SystemPromptModal.tsx    # 시스템 프롬프트 설정
├── lib/
│   ├── mongodb.ts              # MongoDB 연결 유틸
│   ├── claude.ts               # Anthropic SDK 클라이언트
│   └── types.ts                # 공통 타입 정의
├── models/
│   ├── Conversation.ts         # 대화 세션 스키마
│   └── Message.ts              # 메시지 스키마
├── Dockerfile
├── .dockerignore
└── .env.local
```

---

## 핵심 기능

### 1. 대화 세션 관리
- 사이드바에서 새 대화 시작 및 기존 대화 선택
- 대화는 MongoDB에 저장 (세션 ID 기준)
- 대화 제목은 첫 번째 메시지 내용으로 자동 생성

### 2. AI 응답 스트리밍
- `POST /api/chat` 에서 Anthropic SDK의 스트리밍 응답 반환
- 응답을 실시간 타이핑 효과로 프론트엔드에 표시
- `TransformStream` + `ReadableStream`으로 SSE 구현

### 3. 시스템 프롬프트 커스터마이징
- 대화 생성 시 또는 설정 모달에서 시스템 프롬프트 입력
- 세션별로 시스템 프롬프트를 독립적으로 관리
- Claude API 호출 시 `system` 필드에 주입

### 4. 다크/라이트 모드
- `next-themes` 라이브러리로 테마 관리
- 헤더의 토글 버튼으로 전환
- 기본값: 시스템 설정 따름 (prefersDarkMode)

---

## 데이터 모델 (MongoDB)

### Conversation
```typescript
{
  _id: ObjectId,
  title: string,          // 첫 메시지에서 자동 생성
  systemPrompt: string,   // 커스텀 시스템 프롬프트
  createdAt: Date,
  updatedAt: Date,
}
```

### Message
```typescript
{
  _id: ObjectId,
  conversationId: ObjectId,
  role: 'user' | 'assistant',
  content: string,
  createdAt: Date,
}
```

---

## API 명세

### `POST /api/chat`
AI 응답을 스트리밍으로 반환한다.

**Request body:**
```json
{
  "conversationId": "string",
  "message": "string"
}
```

**Response:** `text/event-stream` (Server-Sent Events)

**동작:**
1. conversationId로 기존 메시지 기록 조회
2. 새 user 메시지를 DB에 저장
3. Claude API에 전체 메시지 기록과 system prompt 전달
4. 스트리밍 응답을 클라이언트에 전달하면서 동시에 assistant 메시지 누적
5. 스트림 종료 시 완성된 assistant 메시지를 DB에 저장

### `GET /api/conversations`
전체 대화 목록 반환 (최신순 정렬)

### `POST /api/conversations`
새 대화 세션 생성

### `GET /api/conversations/[id]`
특정 대화의 메시지 전체 조회

### `DELETE /api/conversations/[id]`
대화 삭제

---

## 환경 변수 (`.env.local`)

```env
ANTHROPIC_API_KEY=sk-ant-...
MONGODB_URI=mongodb+srv://...
NEXT_PUBLIC_APP_NAME=AI Chat
GCP_PROJECT_ID=your-project-id
GCP_REGION=asia-northeast3
```

---

## Claude API 사용 지침

- 모델: `claude-sonnet-4-6` (기본값)
- 최대 토큰: `4096`
- 스트리밍: `stream: true`
- 대화 기록은 최근 20개 메시지로 제한하여 context window 초과 방지
- `@anthropic-ai/sdk` 패키지 사용

```typescript
// lib/claude.ts
import Anthropic from '@anthropic-ai/sdk';
export const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
```

---

## UI / UX 요구사항

- **언어**: 한국어 우선 (UI 텍스트, 기본 시스템 프롬프트 등)
- **레이아웃**: ChatGPT 유사 — 좌측 사이드바(대화 목록) + 우측 메인 채팅 영역
- **테마**: 다크/라이트 토글, `next-themes` 사용
- **반응형**: 모바일에서 사이드바는 오버레이로 전환
- **메시지 표시**: 사용자 메시지는 우측, AI 응답은 좌측 정렬
- **입력**: `Shift+Enter`로 줄바꿈, `Enter`로 전송

### 비즈니스 스타일 디자인 가이드

- **컬러 팔레트**: 네이비/슬레이트 계열 주색상, 악센트는 블루(`#2563EB`)
- **타이포그래피**: `Inter` 또는 `Noto Sans KR`, 본문 14–16px, 라인 높이 1.6
- **모서리 처리**: 8px 이하 소각 처리 (과도한 라운딩 지양)
- **공백**: 넉넉한 패딩으로 정보 밀도 조절, 섹션 간 구분선 사용
- **그림자**: 미묘한 그림자(`shadow-sm`)로 카드/패널 구분, 플랫하고 깔끔하게
- **버튼**: 고형(solid) 스타일 위주, 호버 시 명확한 피드백
- **사이드바**: 다크 네이비 배경(`#0F172A`), 아이템 호버 시 밝은 하이라이트
- **메시지 버블**: AI 응답은 흰 카드 스타일, 사용자 메시지는 주색상 배경

---

## 개발 우선순위

1. MongoDB 연결 및 데이터 모델 설정
2. `/api/chat` 스트리밍 엔드포인트 구현
3. `/api/conversations` CRUD 구현
4. 기본 채팅 UI (ChatWindow, MessageBubble, InputBar)
5. 대화 사이드바 및 세션 전환
6. 시스템 프롬프트 설정 모달
7. 다크/라이트 모드 테마 적용
8. 모바일 반응형 처리

---

## 배포 — Google Cloud Run

### 아키텍처
- **플랫폼**: Google Cloud Run (서버리스 컨테이너)
- **리전**: `asia-northeast3` (서울)
- **스케일링**: 최소 인스턴스 1, 최대 2 (동시접속 5~10명 기준)
- **동시 요청**: 인스턴스당 `--concurrency 10` 설정
- **MongoDB**: MongoDB Atlas (외부 관리형 클러스터) 또는 Google Cloud 내 VM

### Dockerfile
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

> Next.js `output: 'standalone'` 모드를 `next.config.js`에 설정할 것.

### 배포 명령어
```bash
# Docker 이미지 빌드 & 푸시
gcloud builds submit --tag gcr.io/$GCP_PROJECT_ID/ai-chat

# Cloud Run 배포
gcloud run deploy ai-chat \
  --image gcr.io/$GCP_PROJECT_ID/ai-chat \
  --platform managed \
  --region asia-northeast3 \
  --allow-unauthenticated \
  --concurrency 10 \
  --min-instances 1 \
  --max-instances 2 \
  --set-secrets ANTHROPIC_API_KEY=anthropic-api-key:latest \
  --set-secrets MONGODB_URI=mongodb-uri:latest
```

### Secret 관리
민감 정보는 환경 변수로 직접 넣지 않고 **Google Secret Manager**를 사용한다.
```bash
echo -n "sk-ant-..." | gcloud secrets create anthropic-api-key --data-file=-
echo -n "mongodb+srv://..." | gcloud secrets create mongodb-uri --data-file=-
```

---

## 개발 명령어

```bash
npm run dev      # 개발 서버 실행 (localhost:3000)
npm run build    # 프로덕션 빌드
npm run lint     # ESLint 검사
docker build -t ai-chat .          # 로컬 Docker 빌드 테스트
docker run -p 3000:3000 ai-chat    # 로컬 컨테이너 실행
```

---

## 주요 패키지

```json
{
  "@anthropic-ai/sdk": "latest",
  "mongoose": "^8",
  "next-themes": "^0.3",
  "tailwindcss": "^3",
  "zustand": "^4",
  "@fontsource/inter": "latest",
  "@fontsource/noto-sans-kr": "latest"
}
```
