'use client';

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
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
}

export default function ScoutChatPane({
  mode,
  sessionId,
  onSessionId,
  onConversationActive,
}: ScoutChatPaneProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
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
      // Build conversation history for the agent (matching live-message pattern)
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
        }),
      });

      const result: ScoutResponse = await response.json();

      if (result.session_id && !sessionId) {
        onSessionId(result.session_id);
      }

      // Dispatch tool-call events to trigger SWR revalidations
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
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 && !isGenerating && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-semibold mb-4 shadow-lg">
              S
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {mode === 'A' ? 'Let\'s set up your Radar' : 'Welcome back to Scout'}
            </h3>
            <p className="text-sm text-gray-500 max-w-md">
              {mode === 'A'
                ? 'Tell me about your content interests and strategic priorities. I\'ll find sources worth following.'
                : 'I can refine your priorities or find new sources based on what\'s changed.'}
            </p>
          </div>
        )}

        {messages.map((message) => (
          <div key={message.id}>
            {message.role === 'user' ? (
              <div className="flex justify-end">
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl px-4 py-2.5 max-w-2xl shadow-sm">
                  {message.content}
                </div>
              </div>
            ) : (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 shadow-sm">
                  S
                </div>
                <div className="flex-1">
                  <div className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 max-w-3xl">
                    <div className="prose prose-sm max-w-none text-gray-800">
                      <ReactMarkdown>{message.content}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {isGenerating && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 shadow-sm">
              S
            </div>
            <div className="flex items-center gap-2 text-gray-500 bg-gray-50 px-4 py-2.5 rounded-2xl">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
              <span className="text-sm">Thinking...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t p-4 bg-gray-50">
        {isDone ? (
          <div className="text-center py-2">
            <p className="text-sm text-gray-500">
              Scout session complete. Check your sources on the right.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="flex gap-3">
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
                    ? 'What topics matter to your business?'
                    : 'What\'s changed since last time?'
                }
                disabled={isGenerating}
                className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none disabled:bg-gray-100 disabled:cursor-not-allowed bg-white shadow-sm"
                rows={1}
              />
              <button
                type="submit"
                disabled={!input.trim() || isGenerating}
                className="px-5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed transition-all shadow-md"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
