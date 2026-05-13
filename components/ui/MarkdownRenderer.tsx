'use client';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useState, type ReactElement, type ReactNode } from 'react';

function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="my-3 rounded-lg overflow-hidden border border-white/10 text-sm">
      <div className="flex items-center justify-between px-4 py-1.5 bg-slate-800 dark:bg-slate-900">
        <span className="text-xs text-slate-400 font-mono">{language || 'code'}</span>
        <button
          onClick={handleCopy}
          className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
        >
          {copied ? '복사됨 ✓' : '복사'}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 bg-slate-900 dark:bg-slate-950 text-slate-100 leading-relaxed">
        <code className="font-mono">{code}</code>
      </pre>
    </div>
  );
}

const components: Components = {
  // pre는 code 컴포넌트가 CodeBlock을 반환하므로 wrapper만 제거
  pre({ children }) {
    return <>{children}</>;
  },
  code({ className, children }) {
    const codeStr = String(children ?? '').replace(/\n$/, '');
    const language = className?.replace('language-', '') ?? '';
    // className이 있으면 fenced code block, 개행이 있으면 언어 미지정 code block
    const isBlock = Boolean(language) || codeStr.includes('\n');

    if (isBlock) {
      return <CodeBlock language={language} code={codeStr} />;
    }
    return (
      <code className="bg-border px-1.5 py-0.5 rounded text-[0.85em] font-mono text-foreground">
        {children}
      </code>
    );
  },
  p({ children }) {
    return <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>;
  },
  ul({ children }) {
    return <ul className="mb-3 last:mb-0 pl-5 space-y-1 list-disc">{children}</ul>;
  },
  ol({ children }) {
    return <ol className="mb-3 last:mb-0 pl-5 space-y-1 list-decimal">{children}</ol>;
  },
  li({ children }) {
    return <li className="leading-relaxed">{children}</li>;
  },
  h1({ children }) {
    return <h1 className="text-base font-bold mb-2 mt-4 first:mt-0 text-foreground">{children}</h1>;
  },
  h2({ children }) {
    return <h2 className="text-sm font-bold mb-2 mt-3 first:mt-0 text-foreground">{children}</h2>;
  },
  h3({ children }) {
    return <h3 className="text-sm font-semibold mb-1.5 mt-3 first:mt-0 text-foreground">{children}</h3>;
  },
  blockquote({ children }) {
    return (
      <blockquote className="border-l-2 border-accent pl-3 my-3 text-muted italic">
        {children}
      </blockquote>
    );
  },
  a({ href, children }) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
        {children}
      </a>
    );
  },
  strong({ children }) {
    return <strong className="font-semibold text-foreground">{children}</strong>;
  },
  em({ children }) {
    return <em className="italic">{children}</em>;
  },
  hr() {
    return <hr className="my-4 border-border" />;
  },
  table({ children }) {
    return (
      <div className="overflow-x-auto my-3">
        <table className="w-full text-sm border-collapse border border-border rounded-lg overflow-hidden">
          {children}
        </table>
      </div>
    );
  },
  thead({ children }) {
    return <thead className="bg-border/50">{children}</thead>;
  },
  th({ children }) {
    return (
      <th className="px-3 py-2 text-left font-semibold text-foreground border border-border">
        {children}
      </th>
    );
  },
  td({ children }) {
    return (
      <td className="px-3 py-2 border border-border text-foreground">
        {children}
      </td>
    );
  },
};

export default function MarkdownRenderer({ content }: { content: string }) {
  return (
    <div className="text-sm leading-relaxed">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
