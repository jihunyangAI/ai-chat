'use client';
import { useRef, useState } from 'react';
import type { ConversationDTO } from '@/lib/types';

interface Props {
  conversations: ConversationDTO[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const diffDays = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (diffDays === 0) return '오늘';
  if (diffDays === 1) return '어제';
  if (diffDays < 7) return `${diffDays}일 전`;
  return d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

export default function ConversationSidebar({ conversations, activeId, onSelect, onCreate, onDelete, onRename }: Props) {
  return (
    <aside className="w-64 h-full flex flex-col bg-sidebar flex-shrink-0">
      <div className="px-4 py-4 border-b border-white/10 flex-shrink-0">
        <h1 className="text-white font-semibold text-base tracking-tight">
          {process.env.NEXT_PUBLIC_APP_NAME ?? 'AI Chat'}
        </h1>
      </div>

      <div className="px-3 pt-3 pb-2 flex-shrink-0">
        <button
          onClick={onCreate}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-white/80 hover:text-white border border-white/15 hover:border-white/25 hover:bg-white/10 transition-colors"
        >
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          새 대화
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5">
        {conversations.length === 0 ? (
          <p className="text-white/40 text-xs text-center py-8">대화 내역이 없습니다</p>
        ) : (
          conversations.map((conv) => (
            <ConversationItem
              key={conv._id}
              conversation={conv}
              isActive={conv._id === activeId}
              onSelect={() => onSelect(conv._id)}
              onDelete={() => onDelete(conv._id)}
              onRename={(title) => onRename(conv._id, title)}
            />
          ))
        )}
      </nav>
    </aside>
  );
}

interface ItemProps {
  conversation: ConversationDTO;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onRename: (title: string) => void;
}

function ConversationItem({ conversation, isActive, onSelect, onDelete, onRename }: ItemProps) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(conversation.title);
  const inputRef = useRef<HTMLInputElement>(null);

  function startEdit(e: React.MouseEvent) {
    e.stopPropagation();
    setEditValue(conversation.title);
    setIsEditing(true);
    setConfirmingDelete(false);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function saveEdit() {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== conversation.title) {
      onRename(trimmed);
    }
    setIsEditing(false);
  }

  function cancelEdit() {
    setEditValue(conversation.title);
    setIsEditing(false);
  }

  function handleEditKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') { e.preventDefault(); saveEdit(); }
    if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); }
  }

  function confirmDelete(e: React.MouseEvent) {
    e.stopPropagation();
    onDelete();
    setConfirmingDelete(false);
  }

  // 편집 모드
  if (isEditing) {
    return (
      <div
        className={`flex items-center gap-2 w-full px-3 py-2.5 rounded-lg ${
          isActive ? 'bg-white/15' : 'bg-white/5'
        }`}
      >
        <input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleEditKeyDown}
          onBlur={saveEdit}
          maxLength={100}
          className="flex-1 min-w-0 bg-transparent text-sm text-white border-b border-white/40 focus:border-white/70 focus:outline-none py-0.5"
        />
        <div className="flex gap-1 flex-shrink-0">
          <button
            onMouseDown={(e) => { e.preventDefault(); saveEdit(); }}
            className="text-xs text-blue-300 hover:text-blue-100 transition-colors px-1"
          >
            저장
          </button>
          <button
            onMouseDown={(e) => { e.preventDefault(); cancelEdit(); }}
            className="text-xs text-white/40 hover:text-white/60 transition-colors px-1"
          >
            취소
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onSelect()}
      className={`group relative flex items-start gap-2 w-full px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
        isActive ? 'bg-white/15 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
      }`}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate leading-snug">{conversation.title}</p>
        <p className="text-xs text-white/40 mt-0.5">{formatDate(conversation.updatedAt)}</p>
      </div>

      <div className="flex gap-0.5 flex-shrink-0 mt-0.5">
        {confirmingDelete ? (
          <>
            <button
              onClick={confirmDelete}
              className="text-xs text-red-400 hover:text-red-300 transition-colors px-1.5 py-0.5 rounded hover:bg-white/10"
            >
              삭제
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setConfirmingDelete(false); }}
              className="text-xs text-white/40 hover:text-white/60 transition-colors px-1.5 py-0.5 rounded hover:bg-white/10"
            >
              취소
            </button>
          </>
        ) : (
          <>
            {/* 제목 편집 */}
            <button
              onClick={startEdit}
              aria-label="제목 편집"
              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-white/15 text-white/50 hover:text-white transition-all"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
            {/* 삭제 */}
            <button
              onClick={(e) => { e.stopPropagation(); setConfirmingDelete(true); }}
              aria-label="대화 삭제"
              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-white/15 text-white/50 hover:text-white transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
