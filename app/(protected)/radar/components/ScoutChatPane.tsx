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
  onComplete?: () => void;
  onBack: () => void;
  profileContext?: {
    name?: string;
    industry?: string;
    tagline?: string;
    audience?: string;
    tone_keywords?: string[];
    content_types?: string[];
    recommendations?: Array<{ format?: string; topic?: string; reason?: string }>;
  };
}

export default function ScoutChatPane({
  mode,
  sessionId,
  onSessionId,
  onConversationActive,
  onComplete,
  onBack,
  profileContext,
}: ScoutChatPaneProps) {
  const branding = useBranding();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [thinkingNote, setThinkingNote] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const sendMessage = async (text?: string) => {
    const userMessage = (text ?? input).trim();
    if (!userMessage || isGenerating || isDone) return;

    // Only narrate what Scout is doing when it's actually about to curate sources
    // (the user said "just go", or this is the closing turn). Otherwise: plain thinking dots.
    const justGo = /(\bjust go\b|\bgo ahead\b|\bfind them\b|ga maar|ga door|zoek maar|vind bronnen|doe maar|begin maar|sla over)/i.test(userMessage);
    const curating = justGo || messages.filter((mm) => mm.role === 'user').length >= 1;
    setThinkingNote(curating ? 'Scout is finding sources that fit you…' : null);

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
        signal: AbortSignal.timeout(60_000), // don't let a slow/hung curation freeze the chat
      });

      const result: ScoutResponse = await response.json().catch(() => ({}) as ScoutResponse);
      if (response.ok === false) throw new Error(`HTTP ${response.status}`);

      if (result.session_id && !sessionId) {
        onSessionId(result.session_id);
      }

      dispatchScoutEvents(result.events);

      const hasText = typeof result.message === 'string' && result.message.trim().length > 0;
      const assistantMsg: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: hasText ? result.message : 'Sorry, something went wrong while putting that together. Please try again.',
      };
      setMessages((prev) => [...prev, assistantMsg]);

      // Only close the conversation on a real, non-empty response.
      if (result.done && hasText) {
        setIsDone(true);
        onConversationActive(false);
        onComplete?.();
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

  // Scout already knows the company from the brand interview, so reflect it, don't re-ask.
  const p = profileContext || {};
  const knownName = p.name?.trim();
  const knownAudience = p.audience?.trim();
  const knownTone = (p.tone_keywords || []).filter(Boolean).slice(0, 2).join(', ');
  const welcome =
    mode === 'B'
      ? 'Welcome back. Want me to find new sources, fill a gap, or refine your priorities?'
      : (() => {
          const bits: string[] = [];
          if (knownName) bits.push(`You are ${knownName}`);
          if (knownAudience) bits.push(`you create content for ${knownAudience}`);
          if (knownTone) bits.push(`your tone is ${knownTone}`);
          const intro = bits.length ? `${bits.join(', ')}. ` : '';
          return `${intro}I look for sources that inspire new content. Think of news to react to, or visions to share in your own words. Which topics or people should I keep an eye on?`;
        })();

  return (
    <div className="flex h-full flex-col">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto max-w-2xl space-y-6">
          {/* Welcome message, reflects what Scout already knows, with a one-click "just go" */}
          {messages.length === 0 && !isGenerating && (
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="rounded-2xl rounded-tl-sm bg-gray-50 px-4 py-3 text-sm text-gray-700">
                  <p>{welcome}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pl-1">
                <button
                  onClick={() => sendMessage('Just go')}
                  className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90"
                  style={{ backgroundColor: branding.primaryColor }}
                >
                  Just go, find sources
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </button>
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

          {/* While generating: a status line only when relevant, otherwise the plain thinking dots */}
          {isGenerating && (
            <div className="flex gap-3">
              <div className="rounded-2xl rounded-tl-sm bg-gray-50 px-4 py-3">
                {thinkingNote ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span
                      className="h-2 w-2 animate-pulse rounded-full"
                      style={{ backgroundColor: branding.primaryColor }}
                    />
                    {thinkingNote}
                  </div>
                ) : (
                  <div className="flex gap-1">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-gray-300" style={{ animationDelay: '0ms' }} />
                    <span className="h-2 w-2 animate-pulse rounded-full bg-gray-300" style={{ animationDelay: '150ms' }} />
                    <span className="h-2 w-2 animate-pulse rounded-full bg-gray-300" style={{ animationDelay: '300ms' }} />
                  </div>
                )}
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
              View your sources
            </button>
            <Link
              href="/studio"
              className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium text-white transition-colors hover:opacity-90"
              style={{ backgroundColor: branding.primaryColor }}
            >
              Go to Content Studio
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
                    sendMessage();
                  }
                }}
                placeholder={
                  mode === 'A'
                    ? 'Which topics matter for your company?'
                    : 'What has changed since last time?'
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
                onClick={() => sendMessage()}
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
