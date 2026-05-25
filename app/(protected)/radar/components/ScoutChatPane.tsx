'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { useBranding } from '@/components/BrandingProvider';
import { dispatchScoutEvents, ScoutResponse } from './ScoutResponseDispatcher';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface ScoutChatPaneProps {
  mode: 'A' | 'B';
  sessionId: string | null;
  onSessionId: (id: string) => void;
  onConversationActive: (active: boolean) => void;
  onBack: () => void;
  profileContext?: {
    name?: string;
    industry?: string;
    tagline?: string;
    audience?: string;
    tone_keywords?: string[];
    content_types?: string[];
  };
}

export default function ScoutChatPane({
  mode,
  sessionId,
  onSessionId,
  onConversationActive,
  onBack,
  profileContext,
}: ScoutChatPaneProps) {
  const branding = useBranding();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isGenerating || isDone) return;

    const userMessage = input.trim();

    const tempMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: userMessage,
    };
    setMessages((prev) => [...prev, tempMsg]);
    setInput('');
    setIsGenerating(true);
    onConversationActive(true);

    try {
      const history = messages
        .map((m) => `[${m.role}] ${m.content}`)
        .join('\n\n');

      const response = await fetch('/api/radar/scout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          mode,
          message: userMessage,
          session_id: sessionId,
          history,
          profile_context: profileContext,
        }),
      });

      const result: ScoutResponse = await response.json();

      if (result.session_id && !sessionId) {
        onSessionId(result.session_id);
      }

      dispatchScoutEvents(result.events);

      const assistantMsg: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: result.message,
      };
      setMessages((prev) => [...prev, assistantMsg]);

      if (result.done) {
        setIsDone(true);
        onConversationActive(false);
      }
    } catch {
      const errorMsg: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'Something went wrong. Please try again.',
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto max-w-2xl space-y-6">
          {/* Welcome message */}
          {messages.length === 0 && !isGenerating && (
            <div className="flex gap-3">
              <div className="rounded-2xl rounded-tl-sm bg-gray-50 px-4 py-3 text-sm text-gray-700">
                <p>
                  {mode === 'A'
                    ? 'Vertel me over je content-interesses en strategische prioriteiten. Ik vind bronnen die het volgen waard zijn.'
                    : 'Ik kan je prioriteiten verfijnen of nieuwe bronnen vinden op basis van wat er veranderd is.'}
                </p>
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                  message.role === 'user'
                    ? 'rounded-tr-sm text-white'
                    : 'rounded-tl-sm bg-gray-50 text-gray-700'
                }`}
                style={
                  message.role === 'user'
                    ? { backgroundColor: branding.primaryColor }
                    : undefined
                }
              >
                {message.role === 'user' ? (
                  <p>{message.content}</p>
                ) : (
                  <div className="prose prose-sm max-w-none">
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Thinking indicator — 3 animated dots */}
          {isGenerating && (
            <div className="flex gap-3">
              <div className="rounded-2xl rounded-tl-sm bg-gray-50 px-4 py-3">
                <div className="flex gap-1">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-gray-300" style={{ animationDelay: '0ms' }} />
                  <span className="h-2 w-2 animate-pulse rounded-full bg-gray-300" style={{ animationDelay: '150ms' }} />
                  <span className="h-2 w-2 animate-pulse rounded-full bg-gray-300" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area / Completion CTAs */}
      {isDone ? (
        <div className="border-t border-gray-100 px-6 py-6">
          <div className="mx-auto flex max-w-2xl items-center justify-center gap-3">
            <button
              onClick={onBack}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              Bekijk je bronnen
            </button>
            <Link
              href="/studio"
              className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium text-white transition-colors hover:opacity-90"
              style={{ backgroundColor: branding.primaryColor }}
            >
              Ga naar Content Studio
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          </div>
        </div>
      ) : (
        <div className="border-t border-gray-100 px-6 py-4">
          <div className="mx-auto max-w-2xl">
            <div className="flex items-end gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm focus-within:border-gray-300 focus-within:ring-1 focus-within:ring-gray-300">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                placeholder={
                  mode === 'A'
                    ? 'Welke onderwerpen zijn belangrijk voor je bedrijf?'
                    : 'Wat is er veranderd sinds de vorige keer?'
                }
                disabled={isGenerating}
                rows={1}
                className="flex-1 resize-none bg-transparent text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none disabled:opacity-50"
                style={{ maxHeight: '120px' }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = target.scrollHeight + 'px';
                }}
              />
              <button
                onClick={() => handleSubmit()}
                disabled={!input.trim() || isGenerating}
                className="shrink-0 rounded-lg p-2 text-white transition-colors disabled:opacity-30"
                style={{ backgroundColor: branding.primaryColor }}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
