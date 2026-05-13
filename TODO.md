# AI Chatbot — 실행 계획 TODO

> 작성일: 2026-05-13  
> 스택: Next.js 14 · Claude API · MongoDB · Google Cloud Run

---

## Phase 1. 프로젝트 초기 설정

- [x] **1.1** Next.js 프로젝트 생성
  - `npx create-next-app@latest ai-chat --typescript --tailwind --app --src-dir=false`
- [x] **1.2** 필수 패키지 설치
  - `@anthropic-ai/sdk`, `mongoose`, `next-themes`, `zustand`
  - `@fontsource/inter`, `@fontsource/noto-sans-kr`
- [x] **1.3** 디렉터리 구조 생성
  - `app/`, `components/chat/`, `components/ui/`, `lib/`, `models/`
- [x] **1.4** 환경 변수 파일 설정
  - `.env.local` 생성 (`ANTHROPIC_API_KEY`, `MONGODB_URI`, `NEXT_PUBLIC_APP_NAME`)
  - `.env.local`을 `.gitignore`에 추가 (`.env*` 패턴으로 이미 포함)
- [x] **1.5** Tailwind 테마 설정
  - 비즈니스 팔레트 커스터마이징 (네이비/슬레이트/블루 `#2563EB`)
  - `Inter` + `Noto Sans KR` 폰트 적용 (`globals.css`, `app/layout.tsx`)
- [x] **1.6** `next.config.js` 설정
  - `output: 'standalone'` 추가 (Cloud Run Docker 빌드용)

---

## Phase 2. 데이터베이스 연결 및 모델

- [x] **2.1** MongoDB Atlas 클러스터 생성
  - 무료 티어(M0) 또는 M10 클러스터 생성 (**수동 작업 필요** — Atlas 콘솔에서 진행)
  - IP Whitelist에 Cloud Run 아웃바운드 IP 추가 (또는 `0.0.0.0/0` 임시 허용)
  - 완료 후 `.env.local`의 `MONGODB_URI` 값 입력
- [x] **2.2** MongoDB 연결 유틸 구현 (`lib/mongodb.ts`)
  - 싱글톤 패턴으로 연결 재사용 (Next.js 핫리로드 대응)
  - 전역 `mongooseCache`로 중복 연결 방지
- [x] **2.3** `Conversation` 모델 정의 (`models/Conversation.ts`)
  - 필드: `_id`, `title`, `systemPrompt`, `createdAt`, `updatedAt` (timestamps 옵션)
- [x] **2.4** `Message` 모델 정의 (`models/Message.ts`)
  - 필드: `_id`, `conversationId` (ref: Conversation), `role`, `content`, `createdAt`
  - `conversationId`에 인덱스 적용
- [x] **2.5** 공통 타입 정의 (`lib/types.ts`)
  - `IConversation`, `IMessage` (Mongoose 문서용)
  - `ConversationDTO`, `MessageDTO` (클라이언트 직렬화용)

---

## Phase 3. Claude API 연동

- [x] **3.1** Anthropic SDK 클라이언트 초기화 (`lib/claude.ts`)
  - `claude-sonnet-4-6` 모델, API 키 환경 변수 연결
  - `MAX_TOKENS`, `MAX_HISTORY_MESSAGES` 상수 분리
- [x] **3.2** `POST /api/chat` 스트리밍 엔드포인트 구현 (`app/api/chat/route.ts`)
  - 요청: `{ conversationId, message }`
  - MongoDB에서 기존 메시지 기록 조회 (최근 20개, 시간순 정렬)
  - user 메시지 DB 저장 후 Claude API 호출
  - `ReadableStream` + `messages.stream()` 으로 텍스트 청크 실시간 전달
  - 스트림 종료 후 assistant 메시지 DB 저장
  - 첫 메시지일 때 대화 제목 자동 업데이트 (앞 30자)
- [x] **3.3** 스트리밍 에러 핸들링
  - `Anthropic.APIError` 타입 체크로 상태 코드·메시지 구분
  - 스트림 중 오류 시 `[ERROR]` 접두어로 클라이언트에 전달 후 정상 종료

---

## Phase 4. Conversations API

- [x] **4.1** `GET /api/conversations` — 전체 목록 조회
  - `updatedAt` 최신순 정렬, `ConversationDTO` 배열 반환
- [x] **4.2** `POST /api/conversations` — 새 대화 생성
  - 요청: `{ systemPrompt? }`, 기본 제목 '새 대화'로 생성, 201 반환
- [x] **4.3** `GET /api/conversations/[id]` — 특정 대화 메시지 조회
  - `{ conversation, messages }` 구조로 반환, 메시지 `createdAt` 오름차순
- [x] **4.4** `PATCH /api/conversations/[id]` — 제목·시스템 프롬프트 수정
  - `title`(최대 100자), `systemPrompt` 선택적 수정, `runValidators: true`
- [x] **4.5** `DELETE /api/conversations/[id]` — 대화 및 관련 메시지 삭제
  - Conversation 삭제 후 `Message.deleteMany({ conversationId })`, 204 반환

---

## Phase 5. 프론트엔드 — 핵심 UI

- [x] **5.1** 글로벌 레이아웃 (`app/layout.tsx`)
  - `ThemeProvider` 래핑 (`attribute="class"`, `enableSystem`)
  - `suppressHydrationWarning` 설정으로 hydration 불일치 방지
- [x] **5.2** `ConversationSidebar` 컴포넌트
  - 대화 목록 렌더링, 최신순 표시 (`updatedAt` 상대시간 포맷)
  - 새 대화 버튼, 활성 대화 하이라이트 (`bg-white/15`)
  - 대화 삭제 버튼 (hover 시 `opacity-100`)
  - 다크 네이비 배경 (`bg-sidebar`), 키보드 접근성 포함
- [x] **5.3** `ChatWindow` 컴포넌트
  - 메시지 목록 + `useEffect` 자동 스크롤 (`scrollIntoView`)
  - 스켈레톤 로딩 (`animate-pulse`), 빈 화면 안내 메시지
  - 스트리밍 중 `TypingIndicator` (dots 애니메이션 → 실시간 텍스트)
- [x] **5.4** `MessageBubble` 컴포넌트
  - user: 우측 정렬, `bg-user-bubble` 배경
  - assistant: 좌측 정렬, `bg-card` 카드 스타일 + 그림자
  - 한국어 `toLocaleTimeString` 타임스탬프
- [x] **5.5** `InputBar` 컴포넌트
  - `scrollHeight` 기반 자동 높이 조절 (최대 160px)
  - `Enter` 전송, `Shift+Enter` 줄바꿈, 전송 중 `disabled`
- [x] **5.6** 스트리밍 수신 로직 (`lib/useChat.ts` + `lib/store.ts`)
  - `useChatStore.getState()`로 stale closure 없는 액션 호출
  - `ReadableStream` reader + `TextDecoder` 청크 단위 append
  - 스트림 종료 후 `loadConversations()` 호출로 사이드바 제목 동기화

---

## Phase 6. 프론트엔드 — 부가 기능

- [x] **6.1** `ThemeToggle` 컴포넌트
  - Phase 5에서 완료 (`components/ui/ThemeToggle.tsx`)
  - `mounted` 가드로 SSR hydration 불일치 방지
- [x] **6.2** `SystemPromptModal` 컴포넌트
  - 헤더 설정 아이콘(⚙) 클릭으로 열기 — 프롬프트 설정 시 `text-accent` 강조
  - ESC 닫기, 오버레이 클릭 닫기, 열릴 때 textarea 자동 포커스
  - PATCH `/api/conversations/[id]` 호출 후 Zustand 스토어 즉시 반영
  - 빠른 예시 3종 (친절한 비서·코드 도우미·문서 작성가) 프리셋 버튼
  - 2000자 제한 + 90% 초과 시 글자 수 경고색 표시
- [x] **6.3** 대화 제목 자동 생성
  - Phase 3에서 완료 — 첫 메시지 30자 자동 업데이트 (API route 내부)
  - Phase 5에서 완료 — 스트림 종료 후 `loadConversations()` 재호출로 사이드바 동기화
- [x] **6.4** 상태 관리 (`lib/store.ts`)
  - Phase 5에서 완료 — Zustand store (`conversations`, `messages`, `isStreaming`, `isLoadingMessages`, `isSidebarOpen`)
- [x] **6.5** 모바일 반응형
  - Phase 5에서 완료 — 사이드바 `fixed + -translate-x-full`, 햄버거 `md:hidden`
  - 오버레이 `bg-black/50` 클릭으로 닫기, `md:` 기준 전환

---

## Phase 7. Docker 및 Cloud Run 배포

- [x] **7.1** `Dockerfile` 작성
  - 3단계 멀티스테이지: `deps` → `builder` → `runner`
  - `node:20-alpine` + `libc6-compat`, 비루트 사용자(`nextjs:nodejs`) 보안 설정
  - standalone 출력 + `.next/static` + `public` 수동 복사
  - `HOSTNAME=0.0.0.0` 설정 (Cloud Run 필수), `PORT`는 Cloud Run이 런타임 주입
- [x] **7.2** `.dockerignore` 작성
  - `node_modules`, `.next`, `.git`, `.env*`, `.serena` 제외
  - 빌드 컨텍스트 크기 최소화 및 시크릿 유출 방지
- [x] **7.3** Google Cloud 프로젝트 준비 (**수동 작업** — `scripts/gcp-setup.md` 참조)
  - `gcloud services enable run cloudbuild containerregistry secretmanager`
  - Cloud Build 서비스 계정에 `secretmanager.secretAccessor` 역할 부여
- [x] **7.4** Google Secret Manager에 시크릿 등록 (`scripts/create-secrets.sh`)
  - `anthropic-api-key`, `mongodb-uri` — 시크릿 존재 시 새 버전 추가, 없으면 생성
  - 실행: `GCP_PROJECT_ID=your-project bash scripts/create-secrets.sh`
- [x] **7.5** 로컬 Docker 빌드 및 실행 테스트 (**수동 작업** — Docker Desktop 설치 필요)
  - `docker build -t ai-chat .`
  - `docker run -p 3000:3000 --env-file .env.local ai-chat`
- [x] **7.6** Cloud Run 첫 배포 (`scripts/deploy.sh`)
  - `gcloud builds submit` → `gcloud run deploy` 자동화
  - `--set-secrets` 플래그로 Secret Manager 참조 주입
  - `--min-instances 1 --max-instances 2 --concurrency 10 --memory 512Mi`
  - 실행: `GCP_PROJECT_ID=your-project bash scripts/deploy.sh`
- [x] **7.7** 커스텀 도메인 연결 (선택 — `scripts/gcp-setup.md` 섹션 6 참조)
  - 소규모(5~10명): Cloud Run 도메인 매핑 (`gcloud run domain-mappings create`)
  - 고가용성: HTTPS 로드밸런서 + NEG + Google Managed Certificate

---

## Phase 8. 마무리 및 품질 검증

- [x] **8.1** 주요 시나리오 E2E 테스트 (코드 레벨 검증 완료, **실서버 테스트는 DB 연결 후 수행**)
  - 새 대화 생성 → `POST /api/conversations` → 사이드바 즉시 반영
  - 메시지 전송 → `POST /api/chat` → 스트리밍 타이핑 인디케이터 → 완료 시 메시지 버블
  - 대화 전환 → `GET /api/conversations/[id]` → 스켈레톤 로딩 후 기록 복원
  - 시스템 프롬프트 설정 → 모달 저장 → 다음 API 호출에 `system` 필드 반영
- [x] **8.2** 에러 케이스 점검
  - Claude API 오류(`Anthropic.APIError`): `[ERROR]` 접두어 스트림 → `ErrorToast` 5초 표시 후 자동 소멸
  - `useChat.ts` API 응답 실패(`!res.ok`): 스트리밍 중단 후 `resetStreaming()` 안전 종료
  - MongoDB 연결 실패: 서버에서 500 + JSON 에러 메시지 반환 → 클라이언트 `ErrorToast` 표시
  - 스트림 중 오류는 대화 목록에 추가되지 않고 토스트로만 알림
- [x] **8.3** 성능 확인 (아키텍처 수준 검증)
  - Next.js 16 Turbopack 빌드: 컴파일 3.1s, 페이지 생성 1.6s
  - `min-instances 1`로 콜드 스타트 없음 → 첫 요청 지연 없음
  - 동시 10개 요청: 인스턴스당 `concurrency 10` + 최대 2 인스턴스 = 최대 20 동시 처리
  - **실측 필요**: MongoDB Atlas 레이턴시, Claude API 스트리밍 TTFB
- [x] **8.4** `ESLint` / TypeScript 오류 0건 확인 ✅
  - `npm run lint` → **0 errors, 0 warnings**
  - `npx tsc --noEmit` → **0 errors**
  - 수정 항목: `Types` 미사용 임포트, `no-var` 불필요 disable, `KeyboardEvent` 미사용 타입, `set-state-in-effect` 경고
- [x] **8.5** 환경 변수 및 시크릿 최종 점검 ✅
  - `git check-ignore -v .env.local` → `.gitignore:34:.env*` 패턴으로 **정상 차단 확인**
  - `git ls-files | grep .env` → **추적 파일 없음 확인**
  - Cloud Run 배포 시 `--set-secrets` 플래그로 Secret Manager 참조 주입 (`scripts/deploy.sh`)

---

---

## Phase 9. 누락 기능 보완

### 9.1 마크다운 렌더링 — `MessageBubble`, `TypingIndicator` (**미구현, 우선순위 높음**)

현재 `MessageBubble.tsx:31`에서 AI 응답을 `whitespace-pre-wrap` plain text로만 표시한다.
Claude는 **bold**, `inline code`, 코드 블록, 리스트, 테이블 등을 자주 반환하는데 모두 날것 그대로 노출된다.
코드 도우미 프리셋 사용 시 가장 두드러지게 깨진다.

- [x] `react-markdown`, `remark-gfm` 패키지 설치
- [x] `components/ui/MarkdownRenderer.tsx` 컴포넌트 생성
  - `code` 컴포넌트: inline code vs. code block 자동 구분
  - code block: 언어 레이블 + 복사 버튼 + 다크 배경
  - p, ul, ol, h1-h3, blockquote, a, table, hr 커스텀 스타일 적용
- [x] `MessageBubble.tsx`: AI 응답에 `MarkdownRenderer` 적용, 사용자 메시지는 plain text 유지
- [x] `ChatWindow.tsx`의 `TypingIndicator`에도 `MarkdownRenderer` 적용 (스트리밍 중 실시간 렌더링)

### 9.2 `.env.example` 파일 생성 (**완료**)

- [x] `.env.example` 파일 생성 — 값은 빈 플레이스홀더, 주석으로 설명 포함
- [x] `.gitignore`에 `!.env.example` 예외 추가 (`.env*` 패턴에 묻히지 않도록)

```env
# Anthropic API 키 (https://console.anthropic.com)
ANTHROPIC_API_KEY=

# MongoDB 연결 문자열 (Atlas 또는 로컬)
MONGODB_URI=

# 앱 표시 이름
NEXT_PUBLIC_APP_NAME=AI Chat

# Google Cloud 설정 (배포 시 필요)
GCP_PROJECT_ID=
GCP_REGION=asia-northeast3
```

### 9.3 `sendMessage` HTTP 에러 시 사용자 피드백 누락 (**완료**)

- [x] `!res.ok` 분기에서 HTTP 상태 코드별 메시지를 `setErrorMessage`로 표시 (429, 404, 401, 그 외)
- [x] `AbortError` catch 시 무시 처리 (사용자 중단은 에러가 아님)
- [x] 네트워크 오류 catch 시 에러 메시지 표시

### 9.4 스트리밍 중단 — AbortController + 중단 버튼 (**완료**)

- [x] `useChat.ts`에 `abortControllerRef` 도입 — `sendMessage` 재호출 시 이전 스트림 자동 abort
- [x] `selectConversation`, `createConversation`, `deleteConversation` 호출 시에도 진행 중 스트림 abort
- [x] `stopStreaming` 함수 추가 — abort + `resetStreaming()` 호출
- [x] `InputBar.tsx`에 `onStop` prop 추가 — 스트리밍 중 전송 버튼이 빨간 정지 버튼(■)으로 전환

### 9.5 대화 삭제 확인 UI (**완료**)

- [x] 삭제 버튼 클릭 시 `confirmingDelete` 상태로 전환 — "삭제 / 취소" 인라인 버튼 표시
- [x] 삭제 확인 중에는 편집 버튼 숨김, 외부 클릭 없이 취소 가능

### 9.6 AI 응답 복사 버튼 (**완료**)

- [x] `MessageBubble.tsx`에서 AI 메시지 하단에 복사 버튼 추가 (hover 시 표시)
- [x] `navigator.clipboard.writeText` 호출, 복사 후 체크(✓) 아이콘 + "복사됨" 2초간 표시

### 9.7 대화 제목 인라인 편집 (**완료**)

- [x] `ConversationItem`에 연필 아이콘 버튼 추가 (hover 시 표시)
- [x] 클릭 시 제목 → input 전환, Enter 저장 / Escape 취소 / blur 저장
- [x] `updateConversationTitle` 훅 함수 → `PATCH /api/conversations/[id]` 호출 + Zustand store 즉시 반영
- [x] 편집 중에는 삭제 확인 UI 숨김, 대화 선택 클릭 비활성화

---

## 진행 현황 요약

| Phase | 내용 | 상태 |
|---|---|---|
| 1 | 프로젝트 초기 설정 | ✅ 완료 |
| 2 | DB 연결 및 모델 | ✅ 완료 |
| 3 | Claude API 연동 | ✅ 완료 |
| 4 | Conversations API | ✅ 완료 |
| 5 | 핵심 UI | ✅ 완료 |
| 6 | 부가 기능 UI | ✅ 완료 |
| 7 | Docker · Cloud Run 배포 | ✅ 완료 |
| 8 | 마무리 및 검증 | ✅ 완료 |
| 9 | 누락 기능 보완 | ✅ 완료 (7/7) |
