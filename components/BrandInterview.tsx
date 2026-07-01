'use client';

import { useState, useRef, useEffect, useCallback, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { useBranding } from '@/components/BrandingProvider';

interface ProfileSummary {
  name?: string;
  industry?: string;
  tagline?: string;
  audience?: string;
  tone_keywords?: string[];
  content_types?: string[];
  completeness?: number;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface InterviewResponse {
  content: string;
  conversationId: string;
  profileUpdate?: Partial<ProfileSummary>;
  interviewComplete?: boolean;
}

interface BrandInterviewProps {
  conversationId?: string;
  profileSummary: ProfileSummary;
  onComplete: () => void;
}

const PROFILE_SECTIONS = [
  { key: 'name', label: 'Company', icon: 'building' },
  { key: 'industry', label: 'Industry', icon: 'globe' },
  { key: 'tagline', label: 'Tagline', icon: 'megaphone' },
  { key: 'audience', label: 'Audience', icon: 'users' },
  { key: 'tone_keywords', label: 'Voice & Tone', icon: 'chat' },
  { key: 'content_types', label: 'Content Types', icon: 'document' },
] as const;

const sectionIcons: Record<string, ReactNode> = {
  building: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3H21" />
    </svg>
  ),
  globe: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
    </svg>
  ),
  megaphone: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 010 3.46" />
    </svg>
  ),
  users: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  ),
  chat: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
    </svg>
  ),
  document: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  ),
};

export default function BrandInterview({
  conversationId: initialConversationId,
  profileSummary: initialSummary,
  onComplete,
}: BrandInterviewProps) {
  const branding = useBranding();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState(initialConversationId);
  const [profile, setProfile] = useState<ProfileSummary>(initialSummary);
  const [completed, setCompleted] = useState(false);
  const [lastUpdatedSection, setLastUpdatedSection] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Clear highlight after 3 seconds
  useEffect(() => {
    if (lastUpdatedSection) {
      const timer = setTimeout(() => setLastUpdatedSection(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [lastUpdatedSection]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || sending) return;

    setInput('');
    setSending(true);

    const userMsg: Message = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const res = await fetch('/api/company-profile/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          conversationId,
          message: text,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data: InterviewResponse = await res.json();

      if (data.conversationId && !conversationId) {
        setConversationId(data.conversationId);
      }

      const assistantMsg: Message = { role: 'assistant', content: data.content };
      setMessages((prev) => [...prev, assistantMsg]);

      if (data.profileUpdate) {
        setProfile((prev) => {
          const updated = { ...prev, ...data.profileUpdate };
          // Find which section was updated
          const updatedKeys = Object.keys(data.profileUpdate!);
          if (updatedKeys.length > 0) {
            setLastUpdatedSection(updatedKeys[updatedKeys.length - 1]);
          }
          return updated;
        });
      }

      if (data.interviewComplete) {
        setCompleted(true);
        // Give a moment to see the completion, then signal parent
        setTimeout(() => onComplete(), 2000);
      }
    } catch (err) {
      console.error('Interview send error:', err);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Let me try again... Something went wrong.' },
      ]);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const filledSections = PROFILE_SECTIONS.filter(({ key }) => {
    const val = profile[key as keyof ProfileSummary];
    if (Array.isArray(val)) return val.length > 0;
    return !!val;
  });

  const completeness = PROFILE_SECTIONS.length > 0
    ? filledSections.length / PROFILE_SECTIONS.length
    : 0;

  return (
    <div className="flex h-full">
      {/* Left panel — Conversation */}
      <div className="flex flex-1 flex-col lg:w-[65%]">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="mx-auto max-w-2xl space-y-6">
            {/* Welcome message if no messages yet */}
            {messages.length === 0 && !sending && (
              <div className="flex gap-3">
                <div className="rounded-2xl rounded-tl-sm bg-gray-50 px-4 py-3 text-sm text-gray-700">
                  <p>Tell me about your company. What do you do?</p>
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                    msg.role === 'user'
                      ? 'rounded-tr-sm text-white'
                      : 'rounded-tl-sm bg-gray-50 text-gray-700'
                  }`}
                  style={
                    msg.role === 'user'
                      ? { backgroundColor: branding.primaryColor }
                      : undefined
                  }
                >
                  {msg.role === 'user' ? (
                    <p>{msg.content}</p>
                  ) : (
                    <div className="prose prose-sm max-w-none">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Thinking indicator */}
            {sending && (
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

        {/* Input area */}
        {!completed && (
          <div className="border-t border-gray-100 px-6 py-4">
            <div className="mx-auto max-w-2xl">
              <div className="flex items-end gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm focus-within:border-gray-300 focus-within:ring-1 focus-within:ring-gray-300">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={messages.length === 0 ? 'Tell me about your company...' : ''}
                  rows={1}
                  disabled={sending}
                  className="flex-1 resize-none bg-transparent text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none disabled:opacity-50"
                  style={{ maxHeight: '120px' }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = target.scrollHeight + 'px';
                  }}
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || sending}
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

        {/* Completion CTA */}
        {completed && (
          <div className="border-t border-gray-100 px-6 py-6">
            <div className="mx-auto max-w-2xl text-center">
              <a
                href="/studio"
                className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-medium text-white transition-colors hover:opacity-90"
                style={{ backgroundColor: branding.primaryColor }}
              >
                Start creating content
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Right panel — Living Profile */}
      <div className="hidden w-[35%] border-l border-gray-100 bg-gray-50/50 lg:block">
        <div className="flex h-full flex-col overflow-y-auto p-6">
          {/* Profile header */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Brand Profile</h2>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: branding.primaryColor }}
                initial={{ width: 0 }}
                animate={{ width: `${completeness * 100}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            </div>
          </div>

          {/* Profile sections */}
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {PROFILE_SECTIONS.map(({ key, label, icon }) => {
                const value = profile[key as keyof ProfileSummary];
                const isFilled = Array.isArray(value) ? value.length > 0 : !!value;
                const isHighlighted = lastUpdatedSection === key;

                return (
                  <motion.div
                    key={key}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className={`rounded-xl border p-4 transition-all duration-500 ${
                      isHighlighted
                        ? 'border-amber-200 bg-amber-50/50 shadow-sm'
                        : isFilled
                          ? 'border-gray-200 bg-white'
                          : 'border-dashed border-gray-200 bg-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
                      {sectionIcons[icon]}
                      {label}
                    </div>
                    {isFilled ? (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.4, delay: 0.1 }}
                        className="mt-2 text-sm text-gray-700"
                      >
                        {Array.isArray(value) ? (
                          <div className="flex flex-wrap gap-1.5">
                            {(value as string[]).map((item, i) => (
                              <span
                                key={i}
                                className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600"
                              >
                                {item}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p>{value as string}</p>
                        )}
                      </motion.div>
                    ) : (
                      <div className="mt-2 h-4 w-3/4 rounded bg-gray-100" />
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {/* Completion badge */}
          {completed && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="mt-6 rounded-xl border border-green-200 bg-green-50 p-4 text-center"
            >
              <p className="text-sm font-medium text-green-800">Profile complete</p>
              <p className="mt-1 text-xs text-green-600">
                Your brand guide has been generated
              </p>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
