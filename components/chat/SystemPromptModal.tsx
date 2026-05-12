'use client';
import { useEffect, useRef, useState } from 'react';

interface Props {
  isOpen: boolean;
  currentPrompt: string;
  onClose: () => void;
  onSave: (prompt: string) => Promise<boolean>;
}

const MAX_LENGTH = 2000;

export default function SystemPromptModal({ isOpen, currentPrompt, onClose, onSave }: Props) {
  const [value, setValue] = useState(currentPrompt);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 열릴 때마다 현재 값으로 초기화 + 포커스 (isOpen 토글 시 형태 동기화)
  useEffect(() => {
    if (!isOpen) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setValue(currentPrompt);
    setError('');
    setTimeout(() => textareaRef.current?.focus(), 50);
  }, [isOpen, currentPrompt]);

  // ESC 키로 닫기
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  async function handleSave() {
    if (isSaving) return;
    setIsSaving(true);
    setError('');
    try {
      const ok = await onSave(value.trim());
      if (ok) {
        onClose();
      } else {
        setError('저장에 실패했습니다. 다시 시도해 주세요.');
      }
    } finally {
      setIsSaving(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 오버레이 */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* 모달 패널 */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="relative w-full max-w-lg bg-card border border-border rounded-xl shadow-xl flex flex-col"
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 id="modal-title" className="text-sm font-semibold text-foreground">
              시스템 프롬프트 설정
            </h2>
            <p className="text-xs text-muted mt-0.5">
              AI의 역할, 어조, 제약 조건을 지정합니다
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="닫기"
            className="w-7 h-7 flex items-center justify-center rounded-lg text-muted hover:text-foreground hover:bg-border transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 본문 */}
        <div className="px-5 py-4">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => {
              if (e.target.value.length <= MAX_LENGTH) setValue(e.target.value);
            }}
            rows={8}
            placeholder="예시: 당신은 친절한 한국어 비서입니다. 항상 간결하고 명확하게 답변하세요."
            className="w-full resize-none rounded-lg border border-border bg-background text-foreground placeholder:text-muted text-sm px-3.5 py-3 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-colors leading-relaxed"
          />
          <div className="flex items-center justify-between mt-2">
            <span className={`text-xs ${value.length > MAX_LENGTH * 0.9 ? 'text-amber-500' : 'text-muted'}`}>
              {value.length} / {MAX_LENGTH}
            </span>
            {error && <span className="text-xs text-red-500">{error}</span>}
          </div>

          {/* 예시 프롬프트 */}
          <div className="mt-3 space-y-1.5">
            <p className="text-xs font-medium text-muted">빠른 예시</p>
            {PRESET_PROMPTS.map((preset) => (
              <button
                key={preset.label}
                onClick={() => setValue(preset.prompt)}
                className="w-full text-left px-3 py-2 rounded-lg border border-border text-xs text-muted hover:text-foreground hover:border-accent/50 hover:bg-accent/5 transition-colors"
              >
                <span className="font-medium text-foreground">{preset.label}</span>
                <span className="ml-2 text-muted">{preset.preview}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-border">
          <button
            onClick={() => setValue('')}
            className="text-xs text-muted hover:text-foreground transition-colors"
          >
            초기화
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-muted hover:text-foreground border border-border rounded-lg hover:bg-border transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-white bg-accent rounded-lg hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-w-[60px]"
            >
              {isSaving ? '저장 중…' : '저장'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const PRESET_PROMPTS = [
  {
    label: '친절한 비서',
    preview: '한국어로 친절하고 간결하게 답변',
    prompt: '당신은 친절하고 전문적인 한국어 AI 비서입니다. 항상 간결하고 명확하게 답변하며, 필요한 경우 구조화된 형식으로 정보를 제공합니다.',
  },
  {
    label: '코드 도우미',
    preview: '코드 리뷰·작성에 집중',
    prompt: '당신은 숙련된 소프트웨어 엔지니어입니다. 코드 작성, 리뷰, 디버깅을 도와주며 항상 명확한 설명과 함께 예제 코드를 제공합니다. 한국어로 답변합니다.',
  },
  {
    label: '문서 작성가',
    preview: '비즈니스 문서 작성 지원',
    prompt: '당신은 비즈니스 문서 작성 전문가입니다. 보고서, 이메일, 기획서 등의 작성을 도와주며 전문적이고 명확한 한국어 표현을 사용합니다.',
  },
];
