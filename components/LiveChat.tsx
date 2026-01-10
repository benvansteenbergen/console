'use client';

import { useState, useRef, useEffect } from 'react';
import useSWR, { mutate, useSWRConfig } from 'swr';

const STORAGE_KEY = 'live_conversation_id';

interface AssistantProfile {
  name: string;
  goals: string;
  instructions: string;
  personality: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  metadata?: {
    sources?: ContextSource[];
  };
}

interface ContextSource {
  document_id: string;
  title: string;
  snippet: string;
  cluster?: string;
}

interface Conversation {
  id: string;
  created_at: string;
  last_message_at: string;
  preview?: string;
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

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function LiveChat() {
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [contentFormat, setContentFormat] = useState('');
  const [toneOfVoice, setToneOfVoice] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [showSources, setShowSources] = useState(true);
  const [selectedClusters, setSelectedClusters] = useState<string[]>([]);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileForm, setProfileForm] = useState<AssistantProfile>({
    name: 'Senior Marketing Assistant',
    goals: '',
    instructions: '',
    personality: 'professional',
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { mutate: globalMutate } = useSWRConfig();

  // Fetch conversations list
  const { data: conversationsData } = useSWR<{
    success: boolean;
    conversations: Conversation[];
  }>('/api/live/conversations', fetcher);

  // Fetch documents
  const { data: documentsData } = useSWR<{
    success: boolean;
    documents: Document[];
  }>('/api/knowledge-base/documents', fetcher);

  // Fetch content formats
  const { data: contentFormatsData } = useSWR<{
    success: boolean;
    formats: { value: string; label: string }[];
  }>('/api/content-formats', fetcher);

  // Fetch tone of voice options
  const { data: toneOfVoiceData } = useSWR<{
    success: boolean;
    tones: { value: string; label: string }[];
  }>('/api/tone-of-voice', fetcher);

  // Fetch assistant profile
  const { data: assistantProfileData, mutate: mutateProfile } = useSWR<{
    success: boolean;
    profile: AssistantProfile;
  }>('/api/live/assistant-profile', fetcher);

  // Update profile form when data loads
  useEffect(() => {
    if (assistantProfileData?.profile) {
      setProfileForm(assistantProfileData.profile);
    }
  }, [assistantProfileData]);

  const conversations = conversationsData?.conversations || [];
  const documents = documentsData?.documents || [];
  const contentFormats = [
    { value: '', label: 'Default' },
    ...(contentFormatsData?.formats?.filter(f => f.value !== '') || [])
  ];
  const toneOfVoiceOptions = [
    { value: '', label: 'Default' },
    ...(toneOfVoiceData?.tones?.filter(t => t.value !== '') || [])
  ];

  // Group documents by cluster
  const documentsByCluster = documents.reduce((acc, doc) => {
    const cluster = doc.cluster || 'no_cluster';
    if (!acc[cluster]) acc[cluster] = [];
    acc[cluster].push(doc);
    return acc;
  }, {} as { [key: string]: Document[] });

  const availableClusters = Object.keys(documentsByCluster).sort();

  // Load conversation ID from localStorage on mount and start loading immediately
  useEffect(() => {
    const savedId = localStorage.getItem(STORAGE_KEY);
    if (savedId) {
      setCurrentConversationId(savedId);
      setIsLoadingMessages(true);
    }
    globalMutate('/api/live/unread-count');
  }, [globalMutate]);

  // Load messages when conversation changes
  useEffect(() => {
    if (currentConversationId) {
      loadMessages(currentConversationId);
    } else {
      setMessages([]);
      setIsLoadingMessages(false);
    }
  }, [currentConversationId]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadMessages = async (conversationId: string) => {
    setIsLoadingMessages(true);
    try {
      const response = await fetch(`/api/live/messages?conversationId=${conversationId}`);
      const result = await response.json();
      if (result.success) {
        setMessages(result.messages || []);
        markAsRead(conversationId);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const markAsRead = async (conversationId: string | null) => {
    if (!conversationId) return;
    try {
      await fetch('/api/live/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId }),
      });
      // Refresh the unread count in the sidebar
      globalMutate('/api/live/unread-count');
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const selectConversation = (conversationId: string) => {
    setCurrentConversationId(conversationId);
    localStorage.setItem(STORAGE_KEY, conversationId);
    setShowHistory(false);
  };

  const startNewChat = () => {
    setCurrentConversationId(null);
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
    setShowHistory(false);
  };

  const toggleCluster = (cluster: string) => {
    const isSelected = selectedClusters.includes(cluster);
    const clusterDocIds = (documentsByCluster[cluster] || []).map(d => d.document_id);

    if (isSelected) {
      // Deselecting cluster - remove cluster and its documents
      setSelectedClusters((prev) => prev.filter((c) => c !== cluster));
      setSelectedDocuments((prev) => prev.filter((d) => !clusterDocIds.includes(d)));
    } else {
      // Selecting cluster - add cluster and all its documents
      setSelectedClusters((prev) => [...prev, cluster]);
      setSelectedDocuments((prev) => [...new Set([...prev, ...clusterDocIds])]);
    }
  };

  const toggleDocument = (docId: string) => {
    setSelectedDocuments((prev) =>
      prev.includes(docId) ? prev.filter((d) => d !== docId) : [...prev, docId]
    );
  };

  const selectAllClusters = () => {
    setSelectedClusters(availableClusters);
    const allDocIds = documents.map(d => d.document_id);
    setSelectedDocuments(allDocIds);
  };
  const clearAllClusters = () => {
    setSelectedClusters([]);
    setSelectedDocuments([]);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();

    if (!input.trim() || isGenerating) return;

    const userMessage = input.trim();

    // Optimistically add user message
    const tempUserMessage: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: userMessage,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMessage]);
    setInput('');
    setIsGenerating(true);

    try {
      const response = await fetch('/api/live/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: currentConversationId,
          message: userMessage,
          contentFormat: contentFormat || null,
          toneOfVoice: toneOfVoice || null,
          selectedClusters,
          selectedDocuments,
        }),
      });

      const result = await response.json();

      if (result.success) {
        if (result.conversationId && !currentConversationId) {
          setCurrentConversationId(result.conversationId);
          localStorage.setItem(STORAGE_KEY, result.conversationId);
          mutate('/api/live/conversations');
        }

        const assistantMessage: Message = {
          id: result.messageId || `msg-${Date.now()}`,
          role: 'assistant',
          content: result.content,
          created_at: new Date().toISOString(),
          metadata: { sources: result.sources },
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        const errorMessage: Message = {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: `Error: ${result.error || 'Failed to generate response'}`,
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('Send message error:', error);
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'Failed to send message. Please try again.',
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (content: string, messageId: string) => {
    navigator.clipboard.writeText(content);
    setCopiedMessageId(messageId);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      const response = await fetch('/api/live/assistant-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileForm),
      });

      const result = await response.json();
      if (result.success) {
        mutateProfile();
        setShowProfileModal(false);
      }
    } catch (error) {
      console.error('Failed to save profile:', error);
    } finally {
      setSavingProfile(false);
    }
  };

  const assistantName = profileForm.name || 'Senior Marketing Assistant';
  const assistantInitials = assistantName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="flex h-[calc(100vh-200px)] gap-4">
      {/* History Drawer */}
      <div className={`${showHistory ? 'w-72' : 'w-0'} transition-all duration-300 overflow-hidden`}>
        <div className="w-72 h-full bg-white rounded-xl shadow-lg flex flex-col">
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Chat History</h3>
            <button onClick={() => setShowHistory(false)} className="p-1 hover:bg-gray-100 rounded">
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="p-3">
            <button
              onClick={startNewChat}
              className="w-full px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all flex items-center justify-center gap-2 font-medium shadow-md"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Chat
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {conversations.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">No conversations yet</p>
            ) : (
              <div className="space-y-1">
                {conversations.map((conv) => {
                  const date = new Date(conv.last_message_at);
                  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  const preview = conv.preview || 'New conversation';
                  return (
                    <button
                      key={conv.id}
                      onClick={() => selectConversation(conv.id)}
                      className={`w-full text-left px-3 py-2.5 rounded-lg transition-all ${
                        currentConversationId === conv.id
                          ? 'bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 border border-blue-200'
                          : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-medium truncate flex-1">{preview}</div>
                        <div className="text-xs text-gray-400 whitespace-nowrap">{timeStr}</div>
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">{formatDate(conv.last_message_at)}</div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Knowledge Sources Panel */}
      {showSources && (
        <div className="w-72 bg-white rounded-xl shadow-lg flex flex-col overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between bg-gradient-to-r from-gray-50 to-white">
            <h3 className="font-semibold text-gray-900">Knowledge Sources</h3>
            <button onClick={() => setShowSources(false)} className="p-1 hover:bg-gray-100 rounded">
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Quick Actions */}
          <div className="px-4 py-2 border-b flex gap-2">
            <button onClick={selectAllClusters} className="text-xs text-blue-600 hover:text-blue-700 font-medium">
              Select All
            </button>
            <span className="text-gray-300">|</span>
            <button onClick={clearAllClusters} className="text-xs text-gray-600 hover:text-gray-700">
              Clear
            </button>
          </div>

          {/* Clusters */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {availableClusters.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">No documents uploaded yet</p>
            ) : (
              availableClusters.map((cluster) => (
                <div key={cluster} className="rounded-lg border border-gray-100 overflow-hidden">
                  <label className="flex items-center gap-2 p-3 cursor-pointer hover:bg-gray-50 transition-colors">
                    <input
                      type="checkbox"
                      checked={selectedClusters.includes(cluster)}
                      onChange={() => toggleCluster(cluster)}
                      className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <span className="flex-1 font-medium text-sm text-gray-900">
                      {CLUSTER_LABELS[cluster] || cluster}
                    </span>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                      {documentsByCluster[cluster].length}
                    </span>
                  </label>

                  {selectedClusters.includes(cluster) && (
                    <div className="px-3 pb-3 space-y-1 bg-gray-50">
                      {documentsByCluster[cluster].map((doc) => (
                        <label key={doc.document_id} className="flex items-center gap-2 cursor-pointer py-1">
                          <input
                            type="checkbox"
                            checked={selectedDocuments.includes(doc.document_id)}
                            onChange={() => toggleDocument(doc.document_id)}
                            className="h-3 w-3 text-blue-600 rounded border-gray-300"
                          />
                          <span className="text-xs text-gray-700 truncate flex-1">{doc.title}</span>
                          <span className="text-xs" title={doc.visibility === 'private' ? 'Private' : 'Shared'}>
                            {doc.visibility === 'private' ? '🔒' : '👥'}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Format & Tone */}
          <div className="p-3 border-t bg-gray-50 space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Content Format</label>
              <select
                value={contentFormat}
                onChange={(e) => setContentFormat(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                {contentFormats.map((format) => (
                  <option key={format.value} value={format.value}>{format.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Tone of Voice</label>
              <select
                value={toneOfVoice}
                onChange={(e) => setToneOfVoice(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                {toneOfVoiceOptions.map((tone) => (
                  <option key={tone.value} value={tone.value}>{tone.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white rounded-xl shadow-lg overflow-hidden">
        {/* Chat Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center gap-3">
            {/* History Toggle */}
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={`p-2 rounded-lg transition-colors ${showHistory ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-600'}`}
              title="Chat History"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>

            <button
              onClick={() => setShowProfileModal(true)}
              className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold shadow-md hover:shadow-lg hover:scale-105 transition-all cursor-pointer"
              title="Edit assistant profile"
            >
              {assistantInitials}
            </button>
            <div>
              <button
                onClick={() => setShowProfileModal(true)}
                className="font-semibold text-gray-900 hover:text-blue-600 transition-colors text-left"
              >
                {assistantName}
              </button>
              <div className="text-xs text-gray-500">
                {selectedClusters.length > 0
                  ? `Using ${selectedClusters.length} knowledge source${selectedClusters.length > 1 ? 's' : ''}`
                  : 'General assistant mode'
                }
              </div>
            </div>
          </div>

          {/* Sources Toggle */}
          {!showSources && (
            <button
              onClick={() => setShowSources(true)}
              className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              Sources
            </button>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Loading state */}
          {isLoadingMessages && (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold mb-4 shadow-lg animate-pulse">
                {assistantInitials}
              </div>
              <div className="flex items-center gap-2 text-gray-500">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
                <span>Loading conversation...</span>
              </div>
            </div>
          )}

          {/* Intro screen - only show when not loading and no messages */}
          {!isLoadingMessages && messages.length === 0 && !currentConversationId && (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <button
                onClick={() => setShowProfileModal(true)}
                className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-3xl font-semibold mb-4 shadow-lg hover:shadow-xl hover:scale-105 transition-all"
                title="Edit assistant profile"
              >
                {assistantInitials}
              </button>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Hi! I'm your {assistantName}</h3>
              <p className="text-gray-500 max-w-md mb-6">
                I can help you create content, brainstorm ideas, and answer questions using your knowledge base.
              </p>

              {/* Quick Start Suggestions */}
              <div className="w-full max-w-lg space-y-2 mb-6">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Try asking me to...</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { icon: '✍️', text: 'Write a LinkedIn post about our latest feature' },
                    { icon: '📧', text: 'Draft an email to follow up with a prospect' },
                    { icon: '💡', text: 'Generate 5 blog post ideas for next month' },
                    { icon: '📊', text: 'Create a product comparison summary' },
                  ].map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setInput(suggestion.text);
                        inputRef.current?.focus();
                      }}
                      className="flex items-center gap-2 p-3 text-left text-sm bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all group"
                    >
                      <span className="text-lg">{suggestion.icon}</span>
                      <span className="text-gray-700 group-hover:text-blue-700">{suggestion.text}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setShowProfileModal(true)}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Customize my personality and goals
              </button>
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
                    {assistantInitials}
                  </div>
                  <div className="flex-1">
                    <div className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 max-w-3xl">
                      <div className="prose prose-sm max-w-none whitespace-pre-wrap text-gray-800">
                        {message.content}
                      </div>
                    </div>
                    <div className="flex gap-3 mt-2">
                      <button
                        onClick={() => copyToClipboard(message.content, message.id)}
                        className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 transition-colors"
                      >
                        {copiedMessageId === message.id ? (
                          <>
                            <svg className="w-3.5 h-3.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="text-green-600">Copied!</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                            </svg>
                            Copy
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          {isGenerating && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 shadow-sm">
                {assistantInitials}
              </div>
              <div className="flex items-center gap-2 text-gray-500 bg-gray-50 px-4 py-2.5 rounded-2xl">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
                <span className="text-sm">Thinking...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <form onSubmit={handleSubmit} className="border-t p-4 bg-gray-50">
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
              placeholder="Ask me anything..."
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
          <p className="text-xs text-gray-500 mt-2 text-center">
            Press Enter to send · Shift+Enter for new line
          </p>
        </form>
      </div>

      {/* Assistant Profile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-6 border-b bg-gradient-to-r from-blue-50 to-purple-50 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xl font-semibold shadow-lg">
                  {assistantInitials}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Assistant Profile</h3>
                  <p className="text-sm text-gray-500">Customize how your assistant behaves</p>
                </div>
              </div>
              <button
                onClick={() => setShowProfileModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-6 space-y-6">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assistant Name
                </label>
                <input
                  type="text"
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  placeholder="e.g., Senior Marketing Assistant"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">Give your assistant a name that reflects its role</p>
              </div>

              {/* Personality */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Personality
                </label>
                <select
                  value={profileForm.personality}
                  onChange={(e) => setProfileForm({ ...profileForm, personality: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="professional">Professional & Formal</option>
                  <option value="friendly">Friendly & Approachable</option>
                  <option value="creative">Creative & Innovative</option>
                  <option value="concise">Concise & Direct</option>
                  <option value="educational">Educational & Detailed</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">How should the assistant communicate?</p>
              </div>

              {/* Goals */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Goals & Objectives
                </label>
                <textarea
                  value={profileForm.goals}
                  onChange={(e) => setProfileForm({ ...profileForm, goals: e.target.value })}
                  placeholder="e.g., Help create engaging content that drives brand awareness and lead generation. Focus on our Q1 product launch campaign."
                  rows={4}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
                <p className="text-xs text-gray-500 mt-1">What are your strategic goals? The assistant will align its suggestions with these objectives.</p>
              </div>

              {/* Instructions */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Custom Instructions
                </label>
                <textarea
                  value={profileForm.instructions}
                  onChange={(e) => setProfileForm({ ...profileForm, instructions: e.target.value })}
                  placeholder="e.g., Always mention our USP of 24/7 support. Avoid using industry jargon. Reference case studies when possible."
                  rows={4}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
                <p className="text-xs text-gray-500 mt-1">Specific instructions the assistant should follow when generating content.</p>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t bg-gray-50 flex gap-3 justify-end">
              <button
                onClick={() => setShowProfileModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveProfile}
                disabled={savingProfile}
                className="px-6 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-400 transition-all shadow-md flex items-center gap-2"
              >
                {savingProfile && (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                )}
                {savingProfile ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
