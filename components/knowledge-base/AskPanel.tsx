'use client';

import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useBranding } from '@/components/BrandingProvider';

/** What the chat searches: everything, one or more folders, or a single document. */
export type AskScope =
  | { mode: 'all' }
  | { mode: 'folders'; folderIds: string[]; folderNames: string[] }
  | { mode: 'document'; documentId: string; documentTitle: string };

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: string[];
}

interface AskPanelProps {
  scope: AskScope;
  onClose: () => void;
}

function scopeLabel(scope: AskScope): string {
  if (scope.mode === 'document') return scope.documentTitle;
  if (scope.mode === 'folders') return scope.folderNames.join(', ');
  return 'All documents';
}

export default function AskPanel({ scope, onClose }: AskPanelProps) {
  const branding = useBranding();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinking]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const send = async () => {
    const text = input.trim();
    if (!text || thinking) return;
    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setInput('');
    setThinking(true);
    try {
      const res = await fetch('/api/knowledge-base/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message: text, history, scope }),
        signal: AbortSignal.timeout(90_000),
      });
      const data = await res.json().catch(() => null);
      if (res.ok === false || !data?.answer) throw new Error();
      setMessages((prev) => [...prev, { role: 'assistant', content: data.answer, sources: data.sources || [] }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Something went wrong while searching your documents. Please try again.' },
      ]);
    } finally {
      setThinking(false);
    }
  };

  const placeholder =
    scope.mode === 'document' ? 'Ask something about this document…' : 'Ask something about your documents…';

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-gray-900/20" onClick={onClose}>
      <aside
        className="flex h-full w-full max-w-lg flex-col border-l border-gray-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-6 py-4">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-gray-900">Ask your knowledge base</h2>
            <p className="mt-0.5 truncate text-xs text-gray-400" title={scopeLabel(scope)}>
              Searching: <span className="font-medium text-gray-600">{scopeLabel(scope)}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {messages.length === 0 && (
            <div className="rounded-xl bg-gray-50 p-4 text-sm text-gray-600">
              {scope.mode === 'document'
                ? 'Ask anything about this document: a summary, a specific figure, or what it says about a topic.'
                : 'Check what the platform knows before you write. Ask for facts, specs, figures or a quick summary, and see which documents the answer comes from.'}
            </div>
          )}

          {messages.map((m, i) =>
            m.role === 'user' ? (
              <div key={i} className="flex justify-end">
                <p
                  className="max-w-[85%] rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm text-white"
                  style={{ backgroundColor: branding.primaryColor }}
                >
                  {m.content}
                </p>
              </div>
            ) : (
              <div key={i}>
                <div className="prose prose-sm max-w-none text-gray-700">
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
                {m.sources && m.sources.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {m.sources.map((s) => (
                      <span key={s} className="max-w-full truncate rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500" title={s}>
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )
          )}

          {thinking && (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <span className="h-2 w-2 animate-pulse rounded-full" style={{ backgroundColor: branding.primaryColor }} />
              Searching your documents…
            </div>
          )}
          <div ref={endRef} />
        </div>

        <div className="border-t border-gray-100 px-6 py-4">
          <div className="flex items-end gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 focus-within:border-gray-300 focus-within:ring-1 focus-within:ring-gray-300">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              rows={1}
              placeholder={placeholder}
              disabled={thinking}
              className="max-h-32 flex-1 resize-none bg-transparent text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none disabled:opacity-50"
            />
            <button
              onClick={send}
              disabled={!input.trim() || thinking}
              className="shrink-0 rounded-lg px-3 py-1.5 text-sm font-semibold text-white transition-opacity disabled:opacity-30"
              style={{ backgroundColor: branding.primaryColor }}
            >
              Ask
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
