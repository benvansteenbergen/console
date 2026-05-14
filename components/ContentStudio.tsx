'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import { XMarkIcon } from '@heroicons/react/20/solid';
import { useBranding } from '@/components/BrandingProvider';
import TemplatePicker from '@/components/studio/TemplatePicker';
import DraftCard from '@/components/studio/DraftCard';
import StudioHistory from '@/components/studio/StudioHistory';

interface FormatTemplate {
  id: string;
  name: string;
  description?: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  hasDraft?: boolean;
  draftContent?: string;
  reviewSummary?: string;
  sources?: ContextSource[];
  choices?: string[];
}

interface ContextSource {
  document_id: string;
  title: string;
  snippet: string;
  cluster?: string;
}

interface StudioResponse {
  content: string;
  conversationId: string;
  hasDraft?: boolean;
  draftContent?: string;
  reviewSummary?: string;
  sources?: ContextSource[];
}

const DRAFT_REGEX = /===DRAFT===\n?([\s\S]*?)\n?===DRAFT===/;
const CHOICES_REGEX = /===CHOICES===\n?([\s\S]*?)\n?===CHOICES===/;

export default function ContentStudio() {
  const branding = useBranding();
  const searchParams = useSearchParams();

  const [view, setView] = useState<'picker' | 'conversation'>('picker');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<FormatTemplate | null>(null);
  const [saving, setSaving] = useState(false);
  const [useKnowledgeBase, setUseKnowledgeBase] = useState(true);
  const [usePersonalVoice, setUsePersonalVoice] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Check URL params for pre-filled format/topic
  useEffect(() => {
    const format = searchParams.get('format');
    const topic = searchParams.get('topic');
    if (format || topic) {
      setView('conversation');
      if (topic) {
        setInput(topic);
      }
      if (format) {
        setSelectedFormat({ id: format, name: format.replace(/-/g, ' ') });
      }
    }
  }, [searchParams]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const sendMessage = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || sending) return;

    setInput('');
    setSending(true);

    const userMsg: Message = { role: 'user', content: msg };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const res = await fetch('/api/studio/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          conversationId,
          message: msg,
          contentFormat: selectedFormat?.id || null,
          useKnowledgeBase,
          usePersonalVoice,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data: StudioResponse = await res.json();

      if (data.conversationId && !conversationId) {
        setConversationId(data.conversationId);
      }

      // Extract draft from content if present
      let content = data.content;
      let draftContent = data.draftContent;
      let hasDraft = data.hasDraft;

      const draftMatch = content.match(DRAFT_REGEX);
      if (draftMatch) {
        draftContent = draftMatch[1].trim();
        content = content.replace(DRAFT_REGEX, '').trim();
        hasDraft = true;
      }

      // Extract choices
      let choices: string[] | undefined;
      const choicesMatch = content.match(CHOICES_REGEX);
      if (choicesMatch) {
        const raw = choicesMatch[1].trim();
        // Try splitting on pipe first (robust delimiter), then newlines
        let parsed: string[];
        if (raw.includes('|')) {
          parsed = raw.split('|').map((c) => c.trim()).filter((c) => c.length > 0);
        } else {
          parsed = raw.split('\n').map((c) => c.trim()).filter((c) => c.length > 0);
        }
        // Strip leading numbers/bullets
        parsed = parsed.map((c) => c.replace(/^[\d]+[.)]\s*/, '').replace(/^[-•]\s*/, ''));
        if (parsed.length > 1) {
          choices = parsed;
        }
        content = content.replace(CHOICES_REGEX, '').trim();
      }

      const assistantMsg: Message = {
        role: 'assistant',
        content,
        hasDraft,
        draftContent,
        reviewSummary: data.reviewSummary,
        sources: data.sources,
        choices,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error('Studio send error:', err);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Something went wrong. Please try again.' },
      ]);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const deriveTitle = (draft: string): string => {
    // Try first markdown heading
    const headingMatch = draft.match(/^#{1,3}\s+(.+)$/m);
    if (headingMatch) return headingMatch[1].trim().substring(0, 100);

    // Try first non-empty line
    const firstLine = draft.split('\n').find((l) => l.trim().length > 0);
    if (firstLine) return firstLine.replace(/[#*_`]/g, '').trim().substring(0, 100);

    // Fallback to first user message
    const firstUserMsg = messages.find((m) => m.role === 'user');
    if (firstUserMsg) return firstUserMsg.content.substring(0, 100);

    return selectedFormat?.name || 'Content';
  };

  const handleSave = async (content: string) => {
    setSaving(true);
    try {
      const res = await fetch('/api/studio/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          content,
          title: deriveTitle(content),
          format: selectedFormat?.id,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      if (data.webViewLink) {
        window.open(data.webViewLink, '_blank');
      }
    } catch (err) {
      console.error('Save error:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleSelectFormat = (fmt: FormatTemplate) => {
    setSelectedFormat(fmt);
    setView('conversation');
  };

  const handleFreeform = () => {
    setSelectedFormat(null);
    setView('conversation');
  };

  const handleHistorySelect = (id: string) => {
    setConversationId(id);
    setView('conversation');
    // Messages will be loaded by the conversation
  };

  // Template picker view
  if (view === 'picker') {
    return (
      <div>
        <TemplatePicker onSelect={handleSelectFormat} onFreeform={handleFreeform} />
        <div className="mx-auto max-w-3xl px-6">
          <StudioHistory onSelect={handleHistorySelect} />
        </div>
      </div>
    );
  }

  // Conversation view
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-gray-100 px-6 py-3">
        <button
          onClick={() => {
            setView('picker');
            setMessages([]);
            setConversationId(null);
            setSelectedFormat(null);
          }}
          className="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
        </button>
        <div>
          <h2 className="text-sm font-medium text-gray-900">
            {selectedFormat ? selectedFormat.name : 'Freeform'}
          </h2>
          <p className="text-xs text-gray-400">Content Studio</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto max-w-2xl space-y-6">
          {messages.length === 0 && !sending && (
            <div className="flex gap-3">
              <div
                className="h-8 w-8 shrink-0 rounded-full"
                style={{ backgroundColor: branding.primaryColor + '20' }}
              />
              <div className="rounded-2xl rounded-tl-sm bg-gray-50 px-4 py-3 text-sm text-gray-700">
                {selectedFormat
                  ? `I have your ${selectedFormat.name} template ready. What should I write about?`
                  : 'What would you like to create? Tell me the topic and format.'}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i}>
              <div className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                {msg.role === 'assistant' && (
                  <div
                    className="h-8 w-8 shrink-0 rounded-full"
                    style={{ backgroundColor: branding.primaryColor + '20' }}
                  />
                )}
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
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  ) : (
                    <div className="prose prose-sm max-w-none">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>

              {/* Choice buttons */}
              {msg.choices && msg.choices.length > 0 && i === messages.length - 1 && !sending && (
                <div className="mt-3 ml-11 flex flex-wrap gap-2">
                  {msg.choices.map((choice, j) => (
                    <button
                      key={j}
                      onClick={() => sendMessage(choice)}
                      className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-all hover:border-gray-300 hover:bg-gray-50 hover:shadow-sm"
                    >
                      {choice}
                    </button>
                  ))}
                </div>
              )}

              {/* Draft card */}
              {msg.hasDraft && msg.draftContent && (
                <div className="mt-4 ml-11">
                  <DraftCard
                    content={msg.draftContent}
                    reviewSummary={msg.reviewSummary}
                    onSave={() => handleSave(msg.draftContent!)}
                    onRefine={(feedback) => sendMessage(feedback)}
                  />
                </div>
              )}

              {/* Sources */}
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-2 ml-11 flex flex-wrap gap-1.5">
                  {msg.sources.map((src, j) => (
                    <span
                      key={j}
                      className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500"
                      title={src.snippet}
                    >
                      {src.title}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Thinking indicator */}
          {sending && (
            <div className="flex gap-3">
              <div
                className="h-8 w-8 shrink-0 rounded-full"
                style={{ backgroundColor: branding.primaryColor + '20' }}
              />
              <div className="rounded-2xl rounded-tl-sm bg-gray-50 px-4 py-3">
                <div className="flex gap-1">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-gray-300" style={{ animationDelay: '0ms' }} />
                  <span className="h-2 w-2 animate-pulse rounded-full bg-gray-300" style={{ animationDelay: '150ms' }} />
                  <span className="h-2 w-2 animate-pulse rounded-full bg-gray-300" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          {saving && (
            <div className="text-center text-xs text-gray-400">Saving to Google Drive...</div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area */}
      <div className="border-t border-gray-100 px-6 py-4">
        <div className="mx-auto max-w-2xl">
          {/* Chip toggles */}
          <div className="mb-2 flex items-center gap-2">
            {useKnowledgeBase ? (
              <button
                onClick={() => setUseKnowledgeBase(false)}
                className="flex items-center gap-1.5 rounded-full bg-gray-900 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-gray-700"
              >
                Kennisbank
                <XMarkIcon className="h-3 w-3" />
              </button>
            ) : (
              <button
                onClick={() => setUseKnowledgeBase(true)}
                className="rounded-full border border-dashed border-gray-300 px-3 py-1 text-xs font-medium text-gray-400 transition-colors hover:border-gray-400 hover:text-gray-500"
              >
                Kennisbank
              </button>
            )}
            {usePersonalVoice ? (
              <button
                onClick={() => setUsePersonalVoice(false)}
                className="flex items-center gap-1.5 rounded-full bg-gray-900 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-gray-700"
              >
                Eigen schrijfstijl
                <XMarkIcon className="h-3 w-3" />
              </button>
            ) : (
              <button
                onClick={() => setUsePersonalVoice(true)}
                className="rounded-full border border-dashed border-gray-300 px-3 py-1 text-xs font-medium text-gray-400 transition-colors hover:border-gray-400 hover:text-gray-500"
              >
                Eigen schrijfstijl
              </button>
            )}
          </div>
          <div className="flex items-end gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm focus-within:border-gray-300 focus-within:ring-1 focus-within:ring-gray-300">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={messages.length === 0 ? 'Describe what you want to create...' : ''}
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
              onClick={() => sendMessage()}
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
    </div>
  );
}
