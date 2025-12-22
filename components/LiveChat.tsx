'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import useSWR from 'swr';

interface Message {
  id: string;
  type: 'user' | 'context' | 'assistant';
  content: string;
  sources?: ContextSource[];
}

interface ContextSource {
  document_id: string;
  title: string;
  snippet: string;
  cluster?: string;
}

interface Document {
  document_id: string;
  title: string;
  cluster?: string;
  visibility: 'private' | 'shared';
}

const CLUSTER_LABELS: { [key: string]: string } = {
  general_company_info: 'General Company Info',
  product_sheets: 'Product Sheets',
  pricing_sales: 'Pricing & Sales',
  documentation: 'Documentation',
  marketing_materials: 'Marketing Materials',
  case_studies: 'Case Studies',
  technical_specs: 'Technical Specs',
  training_materials: 'Training Materials',
  no_cluster: 'Uncategorized',
};

const SAMPLE_QUESTIONS = [
  'Generate a 100-word summary about our company for a partner portal',
  'Write a brief history timeline of our company',
  'Write a short introduction in 3 languages',
  'Create an elevator pitch for investors',
  'List our key products and their main benefits',
  'Summarize our pricing strategy',
];

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// Generate unique session ID
const generateSessionId = () => {
  return `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

export default function LiveChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedClusters, setSelectedClusters] = useState<string[]>([]);
  const [excludedDocuments, setExcludedDocuments] = useState<string[]>([]);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [contentFormat, setContentFormat] = useState('');
  const [toneOfVoice, setToneOfVoice] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Generate session ID once and keep it for the session
  const sessionId = useMemo(() => generateSessionId(), []);

  const { data: documentsData } = useSWR<{
    success: boolean;
    documents: Document[];
  }>('/api/knowledge-base/documents', fetcher);

  const { data: contentFormatsData, isLoading: formatsLoading } = useSWR<{
    success: boolean;
    formats: { value: string; label: string }[];
  }>('/api/content-formats', fetcher);

  const { data: toneOfVoiceData, isLoading: tonesLoading } = useSWR<{
    success: boolean;
    tones: { value: string; label: string }[];
  }>('/api/tone-of-voice', fetcher);

  const documents = documentsData?.documents || [];

  // Always start with "None" option and add fetched options
  const contentFormats = [
    { value: '', label: 'None (Regular Chat)' },
    ...(contentFormatsData?.formats?.filter(f => f.value !== '') || [])
  ];

  const toneOfVoiceOptions = [
    { value: '', label: 'None' },
    ...(toneOfVoiceData?.tones?.filter(t => t.value !== '') || [])
  ];

  // Group documents by cluster
  const documentsByCluster = documents.reduce((acc, doc) => {
    const cluster = doc.cluster || 'no_cluster';
    if (!acc[cluster]) {
      acc[cluster] = [];
    }
    acc[cluster].push(doc);
    return acc;
  }, {} as { [key: string]: Document[] });

  const availableClusters = Object.keys(documentsByCluster).sort();

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const toggleCluster = (cluster: string) => {
    setSelectedClusters((prev) =>
      prev.includes(cluster) ? prev.filter((c) => c !== cluster) : [...prev, cluster]
    );
  };

  const toggleDocument = (docId: string) => {
    setExcludedDocuments((prev) =>
      prev.includes(docId) ? prev.filter((d) => d !== docId) : [...prev, docId]
    );
  };

  const selectAllClusters = () => {
    setSelectedClusters(availableClusters);
  };

  const clearAllClusters = () => {
    setSelectedClusters([]);
  };

  const handleSampleQuestion = (question: string) => {
    setInput(question);
    inputRef.current?.focus();
  };

  const handleNewChat = () => {
    if (messages.length > 0 && !confirm('Start a new chat? Current conversation will be cleared.')) {
      return;
    }
    setMessages([]);
    setInput('');
    // Note: sessionId stays the same - n8n will handle new conversation logic
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();

    if (!input.trim() || isGenerating) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsGenerating(true);

    try {
      const response = await fetch('/api/knowledge-base/live', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          query: userMessage.content,
          selectedClusters,
          excludedDocuments,
          contentFormat: contentFormat || null,
          toneOfVoice: toneOfVoice || null,
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Add context message
        if (result.context && result.context.length > 0) {
          const contextMessage: Message = {
            id: (Date.now() + 1).toString(),
            type: 'context',
            content: `Found ${result.context.length} relevant ${result.context.length === 1 ? 'source' : 'sources'}`,
            sources: result.context,
          };
          setMessages((prev) => [...prev, contextMessage]);
        }

        // Add assistant response
        const assistantMessage: Message = {
          id: (Date.now() + 2).toString(),
          type: 'assistant',
          content: result.content,
          sources: result.context,
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: `Error: ${result.error || 'Failed to generate content'}`,
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('Live chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: 'Failed to generate content. Please try again.',
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (content: string, messageId: string) => {
    navigator.clipboard.writeText(content);
    setCopiedMessageId(messageId);
    setTimeout(() => {
      setCopiedMessageId(null);
    }, 2000);
  };

  return (
    <div className="flex gap-6 h-[calc(100vh-200px)]">
      {/* Left Sidebar - Filters */}
      <div className="w-80 bg-white rounded-lg shadow-md p-6 overflow-y-auto flex-shrink-0">
        {/* Content Format */}
        <div className="mb-6">
          <h3 className="font-semibold text-gray-900 mb-2">Content Format</h3>
          <select
            value={contentFormat}
            onChange={(e) => setContentFormat(e.target.value)}
            disabled={formatsLoading}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            {contentFormats.map((format) => (
              <option key={format.value} value={format.value}>
                {format.label}
              </option>
            ))}
          </select>
          {formatsLoading && (
            <p className="text-xs text-gray-500 mt-1">
              Loading formats...
            </p>
          )}
          {!formatsLoading && contentFormat && (
            <p className="text-xs text-gray-500 mt-1">
              Agent will ask format-specific questions
            </p>
          )}
        </div>

        {/* Tone of Voice */}
        <div className="mb-6">
          <h3 className="font-semibold text-gray-900 mb-2">Tone of Voice</h3>
          <select
            value={toneOfVoice}
            onChange={(e) => setToneOfVoice(e.target.value)}
            disabled={tonesLoading}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            {toneOfVoiceOptions.map((tone) => (
              <option key={tone.value} value={tone.value}>
                {tone.label}
              </option>
            ))}
          </select>
          {tonesLoading && (
            <p className="text-xs text-gray-500 mt-1">
              Loading tones...
            </p>
          )}
        </div>

        <div className="border-t border-gray-200 mb-6"></div>

        {/* Knowledge Sources */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Knowledge Sources</h3>
            <div className="flex gap-2">
              <button
                onClick={selectAllClusters}
                className="text-xs text-blue-600 hover:text-blue-700"
              >
                All
              </button>
              <span className="text-gray-400">|</span>
              <button
                onClick={clearAllClusters}
                className="text-xs text-gray-600 hover:text-gray-700"
              >
                None
              </button>
            </div>
          </div>

          {/* Cluster Selection */}
          <div className="space-y-3">
            {availableClusters.map((cluster) => (
              <div key={cluster} className="border-b border-gray-100 pb-3 last:border-b-0">
                <label className="flex items-center gap-2 cursor-pointer mb-2">
                  <input
                    type="checkbox"
                    checked={selectedClusters.includes(cluster)}
                    onChange={() => toggleCluster(cluster)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="font-medium text-sm text-gray-900">
                    {CLUSTER_LABELS[cluster] || cluster}
                  </span>
                  <span className="text-xs text-gray-500">
                    ({documentsByCluster[cluster].length})
                  </span>
                </label>

                {/* Document Exclusion */}
                {selectedClusters.includes(cluster) && (
                  <div className="ml-6 space-y-1.5">
                    {documentsByCluster[cluster].map((doc) => (
                      <label
                        key={doc.document_id}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={!excludedDocuments.includes(doc.document_id)}
                          onChange={() => toggleDocument(doc.document_id)}
                          className="h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="text-xs text-gray-700 truncate">
                          {doc.title}
                        </span>
                        <span className="text-xs" title={doc.visibility === 'private' ? 'Private' : 'Shared'}>
                          {doc.visibility === 'private' ? '🔒' : '👥'}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {availableClusters.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4">
              No documents available yet. Upload documents to get started.
            </p>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white rounded-lg shadow-md overflow-hidden">
        {/* Sample Questions */}
        {messages.length === 0 && (
          <div className="p-6 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-3">Try these questions:</h3>
            <div className="grid grid-cols-2 gap-2">
              {SAMPLE_QUESTIONS.map((question, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSampleQuestion(question)}
                  className="text-left text-sm text-blue-600 hover:bg-blue-50 p-3 rounded-md border border-blue-200 transition-colors"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((message) => (
            <div key={message.id}>
              {message.type === 'user' && (
                <div className="flex justify-end">
                  <div className="bg-blue-600 text-white rounded-lg px-4 py-2 max-w-2xl">
                    {message.content}
                  </div>
                </div>
              )}

              {message.type === 'context' && message.sources && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-blue-900 mb-2">{message.content}</p>
                  <div className="space-y-2">
                    {message.sources.map((source, idx) => (
                      <div key={idx} className="bg-white rounded p-3 text-xs">
                        <div className="font-medium text-gray-900 mb-1">{source.title}</div>
                        <div className="text-gray-600 italic">"{source.snippet}"</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {message.type === 'assistant' && (
                <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-6 max-w-4xl">
                  <div className="prose prose-sm max-w-none mb-4 whitespace-pre-wrap">
                    {message.content}
                  </div>
                  <div className="flex gap-2 pt-4 border-t border-gray-300">
                    <button
                      onClick={() => copyToClipboard(message.content, message.id)}
                      className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      {copiedMessageId === message.id ? 'Copied ✓' : 'Copy Content'}
                    </button>
                    {message.sources && message.sources.length > 0 && (
                      <span className="text-xs text-gray-500 self-center">
                        Based on {message.sources.length} {message.sources.length === 1 ? 'source' : 'sources'}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

          {isGenerating && (
            <div className="flex items-center gap-2 text-gray-500">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
              <span className="text-sm">Generating content...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <form onSubmit={handleSubmit} className="border-t border-gray-200 p-4">
          <div className="flex gap-2">
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
                selectedClusters.length === 0
                  ? 'Select knowledge sources first...'
                  : 'Ask a question or describe the content you need...'
              }
              disabled={isGenerating || selectedClusters.length === 0}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
              rows={2}
            />
            <button
              type="submit"
              disabled={!input.trim() || isGenerating || selectedClusters.length === 0}
              className="px-6 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors self-end"
            >
              Send
            </button>
          </div>
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-gray-500">
              Press Enter to send, Shift+Enter for new line
            </p>
            {messages.length > 0 && (
              <button
                onClick={handleNewChat}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                New Chat
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
