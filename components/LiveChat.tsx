'use client';

import { useState, useRef, useEffect } from 'react';
import useSWR, { mutate, useSWRConfig } from 'swr';
import ReactMarkdown from 'react-markdown';

const STORAGE_KEY = 'live_conversation_id';

interface AssistantProfile {
  name: string;
  goals: string;
  instructions: string;
  personality: string;
  defaultAudience?: string;
  defaultLanguage?: string;
}

type PlanningMode = 'simple' | 'advanced';

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
  mode?: ConversationMode;
  brief?: Brief;
  unread?: boolean;
  status?: string;
}

interface Document {
  document_id: string;
  title: string;
  cluster?: string;
  visibility: 'private' | 'shared';
}

type ConversationMode = 'sandbox' | 'planning';

interface Brief {
  meta?: {
    planningTurn?: number;
  };
  deliverable?: {
    type?: string;
    channel?: string;
    length?: string;
  };
  audience?: {
    headline?: string;
    detail?: string;
    stage?: string;
  };
  outcome?: {
    goal?: string;
    cta?: string;
  };
  message?: {
    keyPoints?: string[];
    outline?: string[];
  };
  voice?: {
    tone?: string;
    constraints?: string[];
  };
  sources?: {
    mustUse?: string[];
    optional?: string[];
  };
  assumptions?: string[];
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

// Strip markdown formatting from text
const stripMarkdown = (text: string): string => {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')  // **bold**
    .replace(/\*(.+?)\*/g, '$1')       // *italic*
    .replace(/__(.+?)__/g, '$1')       // __bold__
    .replace(/_(.+?)_/g, '$1')         // _italic_
    .replace(/~~(.+?)~~/g, '$1')       // ~~strikethrough~~
    .replace(/`(.+?)`/g, '$1')         // `code`
    .replace(/\[(.+?)\]\(.+?\)/g, '$1') // [link](url)
    .replace(/^#+\s*/gm, '')           // # headers
    .replace(/^[-*]\s+/gm, '')         // - list items
    .trim();
};

export default function LiveChat() {
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedClusters, setSelectedClusters] = useState<string[]>([]);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [expandedClusters, setExpandedClusters] = useState<string[]>([]);
  const [mode, setMode] = useState<ConversationMode>('sandbox');
  const [brief, setBrief] = useState<Brief>({});
  const [expandedBriefSections, setExpandedBriefSections] = useState<string[]>([]);
  const [sourcesCollapsed, setSourcesCollapsed] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [planningMode, setPlanningMode] = useState<PlanningMode>('simple');
  const [productionReady, setProductionReady] = useState(false);
  const [showInputAfterReady, setShowInputAfterReady] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileForm, setProfileForm] = useState<AssistantProfile>({
    name: 'Senior Marketing Assistant',
    goals: '',
    instructions: '',
    personality: 'professional',
    defaultLanguage: 'nl',
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
      setMode('sandbox');
      setBrief({});
    }
  }, [currentConversationId]);

  // Set mode and brief from conversations data when available
  useEffect(() => {
    if (currentConversationId && conversations.length > 0) {
      const conversation = conversations.find(c => c.id === currentConversationId);
      if (conversation) {
        setMode(conversation.mode || 'sandbox');
        setBrief(conversation.brief || {});
        if (conversation.mode === 'planning') {
          setShowSettings(true);
        }
      }
    }
  }, [currentConversationId, conversations]);

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

  const _updateBrief = async (updates: Partial<Brief>) => {
    if (!currentConversationId) return;

    const newBrief = { ...brief, ...updates };
    setBrief(newBrief);

    try {
      await fetch('/api/live/brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: currentConversationId,
          brief: newBrief,
        }),
      });
    } catch (error) {
      console.error('Failed to update brief:', error);
    }
  };

  const _updateMode = async (newMode: ConversationMode) => {
    if (!currentConversationId) return;

    setMode(newMode);

    try {
      await fetch('/api/live/brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: currentConversationId,
          mode: newMode,
        }),
      });
    } catch (error) {
      console.error('Failed to update mode:', error);
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
    const conversation = conversations.find(c => c.id === conversationId);
    setCurrentConversationId(conversationId);
    localStorage.setItem(STORAGE_KEY, conversationId);
    setShowHistory(false);

    // Set mode and brief from conversation data
    if (conversation) {
      setMode(conversation.mode || 'sandbox');
      setBrief(conversation.brief || {});
      // Open settings panel if in planning mode
      if (conversation.mode === 'planning') {
        setShowSettings(true);
      }
    }
  };

  const startNewChat = () => {
    setCurrentConversationId(null);
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
    setShowHistory(false);
  };

  const archiveConversation = async (conversationId: string, archive: boolean) => {
    try {
      await fetch('/api/live/archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, status: archive ? 'archived' : 'active' }),
      });
      mutate('/api/live/conversations');
      // If archiving the current conversation, clear it
      if (archive && conversationId === currentConversationId) {
        startNewChat();
      }
    } catch (error) {
      console.error('Failed to archive conversation:', error);
    }
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

  const handleGenerateDocument = async () => {
    if (isGenerating || !currentConversationId) return;

    setIsGenerating(true);

    // Add a system message indicating generation started
    const generatingMessage: Message = {
      id: `generating-${Date.now()}`,
      role: 'user',
      content: '🚀 Generate document',
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, generatingMessage]);

    try {
      // Call the production endpoint with the brief and knowledge sources
      const response = await fetch('/api/live/production', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: currentConversationId,
          brief,
          selectedClusters,
          selectedDocuments,
        }),
      });

      const result = await response.json();
      console.log('Generate document response:', result);

      const data = result.object || result;

      if (result.success !== false && data.content) {
        const assistantMessage: Message = {
          id: data.messageId || `msg-${Date.now()}`,
          role: 'assistant',
          content: data.content,
          created_at: new Date().toISOString(),
          metadata: { sources: data.sources },
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        const errorMessage: Message = {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: `Error: ${result.error || 'Failed to generate document'}`,
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('Generate document error:', error);
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'An error occurred while generating the document. Please try again.',
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsGenerating(false);
      // Reset production ready state after generating
      setProductionReady(false);
      setShowInputAfterReady(false);
    }
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
          mode,
          planningMode,
          selectedClusters,
          selectedDocuments,
        }),
      });

      const result = await response.json();
      console.log('API response:', result);

      // Handle nested response structure (n8n returns { object: { ... }, conversationId })
      const data = result.object || result;
      const conversationId = result.conversationId || data.conversationId;
      console.log('Extracted data:', data);
      console.log('production_ready value:', data.production_ready, 'type:', typeof data.production_ready);

      // Handle production_ready flag from AI (runs regardless of success)
      if (data.production_ready !== undefined) {
        const isReady = data.production_ready === true || data.production_ready === 'true';
        console.log('Setting productionReady to:', isReady);
        setProductionReady(isReady);
        // Reset input visibility when becoming production ready
        if (isReady) {
          setShowInputAfterReady(false);
        }
      } else {
        console.log('production_ready is undefined in data');
      }

      if (result.success !== false) {
        if (conversationId && !currentConversationId) {
          setCurrentConversationId(conversationId);
          localStorage.setItem(STORAGE_KEY, conversationId);
          mutate('/api/live/conversations');
        }

        // Handle mode change from AI
        if (data.modeChange) {
          setMode(data.modeChange);
          // Auto-show settings panel when entering planning
          if (data.modeChange === 'planning') {
            setShowSettings(true);
            setProductionReady(false); // Reset when entering planning
          }
        }

        // Handle brief update from AI
        if (data.briefUpdate) {
          setBrief(prev => ({ ...prev, ...data.briefUpdate }));
        }

        // Refresh conversations cache if mode or brief changed
        if (data.modeChange || data.briefUpdate) {
          mutate('/api/live/conversations');
        }

        const assistantMessage: Message = {
          id: data.messageId || `msg-${Date.now()}`,
          role: 'assistant',
          content: data.content,
          created_at: new Date().toISOString(),
          metadata: { sources: data.sources },
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
          <div className="p-3 space-y-2">
            <button
              onClick={startNewChat}
              className="w-full px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all flex items-center justify-center gap-2 font-medium shadow-md"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Chat
            </button>
            <button
              onClick={() => setShowArchived(!showArchived)}
              className={`w-full px-3 py-1.5 text-xs rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                showArchived ? 'bg-gray-200 text-gray-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
              {showArchived ? 'Hide Archived' : 'Show Archived'}
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {conversations.filter(c => showArchived ? c.status === 'archived' : c.status !== 'archived').length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">
                {showArchived ? 'No archived conversations' : 'No conversations yet'}
              </p>
            ) : (
              <div className="space-y-1">
                {conversations.filter(c => showArchived ? c.status === 'archived' : c.status !== 'archived').map((conv) => {
                  const date = new Date(conv.last_message_at);
                  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  const preview = stripMarkdown(conv.preview || 'New conversation');
                  return (
                    <div
                      key={conv.id}
                      className={`group flex items-center gap-1 rounded-lg transition-all ${
                        currentConversationId === conv.id
                          ? 'bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <button
                        onClick={() => selectConversation(conv.id)}
                        className={`flex-1 min-w-0 text-left px-3 py-2.5 ${
                          currentConversationId === conv.id ? 'text-blue-700' : 'text-gray-700'
                        }`}
                      >
                        <div className="text-sm font-medium truncate">{preview}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{formatDate(conv.last_message_at)} · {timeStr}</div>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          archiveConversation(conv.id, conv.status !== 'archived');
                        }}
                        className="p-1.5 mr-2 rounded-md opacity-0 group-hover:opacity-100 hover:bg-gray-200 transition-all flex-shrink-0"
                        title={conv.status === 'archived' ? 'Unarchive' : 'Archive'}
                      >
                        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                        </svg>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Panel - Contextual based on mode */}
      <div className={`${showSettings || mode === 'planning' ? 'w-80' : 'w-0'} transition-all duration-300 overflow-hidden order-2`}>
        <div className="w-80 h-full bg-white rounded-xl shadow-lg flex flex-col overflow-hidden">
        {/* Panel Header */}
        <div className="p-4 border-b bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Settings</h3>
            {mode === 'sandbox' && (
              <button
                onClick={() => setShowSettings(false)}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Close
              </button>
            )}
            {mode === 'planning' && (
              <span className="text-xs px-2 py-1 rounded-full font-medium bg-amber-100 text-amber-700">
                Planning {planningMode === 'advanced' ? '(Advanced)' : ''}
              </span>
            )}
          </div>

          {/* Planning Mode Toggle - Only show in planning mode */}
          {mode === 'planning' && (
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-gray-500">Planning mode</span>
              <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                <button
                  onClick={() => setPlanningMode('simple')}
                  className={`px-3 py-1 text-xs font-medium transition-colors ${
                    planningMode === 'simple'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Simple
                </button>
                <button
                  onClick={() => setPlanningMode('advanced')}
                  className={`px-3 py-1 text-xs font-medium transition-colors ${
                    planningMode === 'advanced'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Advanced
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Scrollable Content Area */}
        {(mode === 'sandbox' || mode === 'planning') && (
          <div className="flex-1 overflow-y-auto">
            {/* Knowledge Sources */}
            <div className="border-b">
              <button
                onClick={() => setSourcesCollapsed(!sourcesCollapsed)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <span className="font-medium text-sm text-gray-900">Knowledge Sources</span>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded ${selectedClusters.length > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {selectedClusters.length} selected
                  </span>
                  <svg className={`w-4 h-4 text-gray-400 transition-transform ${sourcesCollapsed ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {!sourcesCollapsed && (
                <>
                  <div className="px-4 py-2 flex gap-2 border-t">
                    <button onClick={selectAllClusters} className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                      Select All
                    </button>
                    <span className="text-gray-300">|</span>
                    <button onClick={clearAllClusters} className="text-xs text-gray-600 hover:text-gray-700">
                      Clear
                    </button>
                  </div>

                  <div className="p-3 pt-0 space-y-2">
                    {availableClusters.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-8">No documents uploaded yet</p>
                    ) : (
                      availableClusters.map((cluster) => (
                    <div key={cluster} className="rounded-lg border border-gray-100 overflow-hidden">
                      <div className="flex items-center gap-2 p-3 hover:bg-gray-50 transition-colors">
                        <input
                          type="checkbox"
                          checked={selectedClusters.includes(cluster)}
                          onChange={() => toggleCluster(cluster)}
                          className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                        />
                        <button
                          onClick={() => setExpandedClusters(prev =>
                            prev.includes(cluster) ? prev.filter(c => c !== cluster) : [...prev, cluster]
                          )}
                          className="flex-1 flex items-center justify-between text-left"
                        >
                          <span className="font-medium text-sm text-gray-900">
                            {CLUSTER_LABELS[cluster] || cluster}
                          </span>
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                            {documentsByCluster[cluster].length}
                          </span>
                        </button>
                      </div>

                      {expandedClusters.includes(cluster) && (
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
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Briefing Sections - Only in Planning Mode */}
            {mode === 'planning' && (
              <div className="p-3 space-y-1">
              {/* Simple mode header */}
              {planningMode === 'simple' && (
                <div className="mb-2 px-3 py-2 bg-blue-50 rounded-lg">
                  <span className="text-xs text-blue-700">Quick planning - using your default settings</span>
                </div>
              )}

              {/* Deliverable - Always shown */}
              <div className="border border-gray-100 rounded-lg overflow-hidden">
                <button
                  onClick={() => setExpandedBriefSections(prev =>
                    prev.includes('deliverable') ? prev.filter(s => s !== 'deliverable') : [...prev, 'deliverable']
                  )}
                  className="w-full flex items-center justify-between gap-2 p-3 hover:bg-gray-50 transition-colors"
                >
                  <span className="font-medium text-sm text-gray-900 flex-shrink-0">Deliverable</span>
                  <span className={`text-xs px-2 py-0.5 rounded truncate max-w-[70%] ${brief.deliverable?.type ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {brief.deliverable?.type || 'Not set'}
                  </span>
                </button>
                {expandedBriefSections.includes('deliverable') && brief.deliverable && (
                  <div className="px-3 pb-3 text-xs text-gray-600 bg-gray-50 space-y-1">
                    {brief.deliverable.type && <p>Type: {brief.deliverable.type}</p>}
                    {brief.deliverable.channel && <p>Channel: {brief.deliverable.channel}</p>}
                    {brief.deliverable.length && <p>Length: {brief.deliverable.length}</p>}
                  </div>
                )}
              </div>

              {/* Outcome - Always shown */}
              <div className="border border-gray-100 rounded-lg overflow-hidden">
                <button
                  onClick={() => setExpandedBriefSections(prev =>
                    prev.includes('outcome') ? prev.filter(s => s !== 'outcome') : [...prev, 'outcome']
                  )}
                  className="w-full flex items-center justify-between gap-2 p-3 hover:bg-gray-50 transition-colors"
                >
                  <span className="font-medium text-sm text-gray-900 flex-shrink-0">Goal</span>
                  <span className={`text-xs px-2 py-0.5 rounded truncate max-w-[70%] ${
                    (brief.outcome?.goal || brief.outcome?.cta) ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {brief.outcome?.goal || brief.outcome?.cta || 'Not set'}
                  </span>
                </button>
                {expandedBriefSections.includes('outcome') && brief.outcome && (
                  <div className="px-3 pb-3 text-xs text-gray-600 bg-gray-50 space-y-1">
                    {brief.outcome.goal && <p>Goal: {brief.outcome.goal}</p>}
                    {brief.outcome.cta && <p>CTA: {brief.outcome.cta}</p>}
                  </div>
                )}
              </div>

              {/* Message - Always shown */}
              <div className="border border-gray-100 rounded-lg overflow-hidden">
                <button
                  onClick={() => setExpandedBriefSections(prev =>
                    prev.includes('message') ? prev.filter(s => s !== 'message') : [...prev, 'message']
                  )}
                  className="w-full flex items-center justify-between gap-2 p-3 hover:bg-gray-50 transition-colors"
                >
                  <span className="font-medium text-sm text-gray-900 flex-shrink-0">Message</span>
                  <span className={`text-xs px-2 py-0.5 rounded truncate max-w-[70%] ${
                    ((brief.message?.keyPoints?.length || 0) + (brief.message?.outline?.length || 0)) > 0
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    {(brief.message?.keyPoints?.length || 0) > 0
                      ? `${brief.message?.keyPoints?.length} key points`
                      : (brief.message?.outline?.length || 0) > 0
                        ? `${brief.message?.outline?.length} outline items`
                        : 'Not set'}
                  </span>
                </button>
                {expandedBriefSections.includes('message') && brief.message && (
                  <div className="px-3 pb-3 text-xs text-gray-600 bg-gray-50 space-y-1">
                    {brief.message.keyPoints && brief.message.keyPoints.length > 0 && (
                      <div>
                        <p className="font-medium">Key Points:</p>
                        <ul className="list-disc list-inside">
                          {brief.message.keyPoints.map((point, i) => <li key={i}>{point}</li>)}
                        </ul>
                      </div>
                    )}
                    {brief.message.outline && brief.message.outline.length > 0 && (
                      <div>
                        <p className="font-medium">Outline:</p>
                        <ul className="list-decimal list-inside">
                          {brief.message.outline.map((item, i) => <li key={i}>{item}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Advanced sections - Only in advanced mode */}
              {planningMode === 'advanced' && (
                <>
                  {/* Audience */}
                  <div className="border border-gray-100 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setExpandedBriefSections(prev =>
                        prev.includes('audience') ? prev.filter(s => s !== 'audience') : [...prev, 'audience']
                      )}
                      className="w-full flex items-center justify-between gap-2 p-3 hover:bg-gray-50 transition-colors"
                    >
                      <span className="font-medium text-sm text-gray-900 flex-shrink-0">Audience</span>
                      <span className={`text-xs px-2 py-0.5 rounded truncate max-w-[70%] ${brief.audience?.headline ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {brief.audience?.headline || 'Not set'}
                      </span>
                    </button>
                    {expandedBriefSections.includes('audience') && brief.audience && (
                      <div className="px-3 pb-3 text-xs text-gray-600 bg-gray-50 space-y-1">
                        {brief.audience.headline && <p>Who: {brief.audience.headline}</p>}
                        {brief.audience.detail && <p>Detail: {brief.audience.detail}</p>}
                        {brief.audience.stage && <p>Stage: {brief.audience.stage}</p>}
                      </div>
                    )}
                  </div>

                  {/* Voice */}
                  <div className="border border-gray-100 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setExpandedBriefSections(prev =>
                        prev.includes('voice') ? prev.filter(s => s !== 'voice') : [...prev, 'voice']
                      )}
                      className="w-full flex items-center justify-between gap-2 p-3 hover:bg-gray-50 transition-colors"
                    >
                      <span className="font-medium text-sm text-gray-900 flex-shrink-0">Voice</span>
                      <span className={`text-xs px-2 py-0.5 rounded truncate max-w-[70%] ${brief.voice?.tone ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {brief.voice?.tone || 'Not set'}
                      </span>
                    </button>
                    {expandedBriefSections.includes('voice') && brief.voice && (
                      <div className="px-3 pb-3 text-xs text-gray-600 bg-gray-50 space-y-1">
                        {brief.voice.tone && <p>Tone: {brief.voice.tone}</p>}
                        {brief.voice.constraints && brief.voice.constraints.length > 0 && (
                          <p>Constraints: {brief.voice.constraints.join(', ')}</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Sources */}
                  <div className="border border-gray-100 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setExpandedBriefSections(prev =>
                        prev.includes('sources') ? prev.filter(s => s !== 'sources') : [...prev, 'sources']
                      )}
                      className="w-full flex items-center justify-between gap-2 p-3 hover:bg-gray-50 transition-colors"
                    >
                      <span className="font-medium text-sm text-gray-900 flex-shrink-0">Sources</span>
                      <span className={`text-xs px-2 py-0.5 rounded truncate max-w-[70%] ${
                        (brief.sources?.mustUse?.length || 0) > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {(brief.sources?.mustUse?.length || 0) + (brief.sources?.optional?.length || 0)} sources
                      </span>
                    </button>
                    {expandedBriefSections.includes('sources') && brief.sources && (
                      <div className="px-3 pb-3 text-xs text-gray-600 bg-gray-50 space-y-1">
                        {brief.sources.mustUse && brief.sources.mustUse.length > 0 && (
                          <p>Must use: {brief.sources.mustUse.join(', ')}</p>
                        )}
                        {brief.sources.optional && brief.sources.optional.length > 0 && (
                          <p>Optional: {brief.sources.optional.join(', ')}</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Assumptions */}
                  {brief.assumptions && brief.assumptions.length > 0 && (
                    <div className="border border-gray-100 rounded-lg overflow-hidden">
                      <button
                        onClick={() => setExpandedBriefSections(prev =>
                          prev.includes('assumptions') ? prev.filter(s => s !== 'assumptions') : [...prev, 'assumptions']
                        )}
                        className="w-full flex items-center justify-between gap-2 p-3 hover:bg-gray-50 transition-colors"
                      >
                        <span className="font-medium text-sm text-gray-900 flex-shrink-0">Assumptions</span>
                        <span className="text-xs px-2 py-0.5 rounded truncate max-w-[70%] bg-amber-100 text-amber-700">
                          {brief.assumptions.length} items
                        </span>
                      </button>
                      {expandedBriefSections.includes('assumptions') && (
                        <div className="px-3 pb-3 text-xs text-gray-600 bg-gray-50">
                          <ul className="list-disc list-inside">
                            {brief.assumptions.map((assumption, i) => <li key={i}>{assumption}</li>)}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
            )}
          </div>
        )}

        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white rounded-xl shadow-lg overflow-hidden order-1">
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

          {/* Settings Toggle */}
          {mode === 'sandbox' && (
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                showSettings
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Settings
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
                      <div className="prose prose-sm max-w-none text-gray-800">
                        <ReactMarkdown>{message.content}</ReactMarkdown>
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
        <div className="border-t p-4 bg-gray-50">
          {/* Production ready state - prominent Generate button */}
          {mode === 'planning' && productionReady && !showInputAfterReady ? (
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleGenerateDocument}
                disabled={isGenerating}
                className="w-full px-4 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed transition-all shadow-md font-medium flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Generate Document
                  </>
                )}
              </button>
              <p className="text-xs text-center">
                <span className="text-gray-500">Briefing is ready! </span>
                <button
                  type="button"
                  onClick={() => setShowInputAfterReady(true)}
                  className="text-blue-600 hover:text-blue-700 underline"
                >
                  Continue conversation
                </button>
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {/* Subtle Generate button when continuing conversation */}
              {mode === 'planning' && productionReady && showInputAfterReady && (
                <div className="flex items-center justify-between mb-3 px-1">
                  <button
                    type="button"
                    onClick={handleGenerateDocument}
                    disabled={isGenerating}
                    className="text-sm text-green-600 hover:text-green-700 disabled:text-gray-400 font-medium flex items-center gap-1"
                  >
                    {isGenerating ? (
                      <>
                        <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Generate Document
                      </>
                    )}
                  </button>
                  <span className="text-xs text-gray-400">Briefing ready</span>
                </div>
              )}
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
                  placeholder={mode === 'planning' ? "Describe your content goals..." : "Ask me anything..."}
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
                {mode === 'planning'
                  ? "I'll help you build your content briefing step by step"
                  : "Press Enter to send · Shift+Enter for new line"
                }
              </p>
            </form>
          )}
        </div>
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

              {/* Default Language */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Default Language
                </label>
                <select
                  value={profileForm.defaultLanguage || 'nl'}
                  onChange={(e) => setProfileForm({ ...profileForm, defaultLanguage: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="nl">Nederlands (Dutch)</option>
                  <option value="en">English</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">The language used for generating content</p>
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
