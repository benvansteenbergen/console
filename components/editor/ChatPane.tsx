"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";

export function ChatPane({
                             fileId,
                             currentContent,
                             onPreview,
                             onAccept,
                             onDiscard,
                             onLoadingChange,
                             hasChanges,
                         }: {
    fileId: string;
    currentContent: string;
    onPreview: (proposed: string) => void;
    onAccept: () => void;
    onDiscard: () => void;
    onLoadingChange?: (loading: boolean) => void;
    hasChanges?: boolean;
}) {
    const [messages, setMessages] = useState<
        { role: "user" | "assistant"; content: string }[]
    >([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [persona, setPersona] = useState<string>("general");
    const [mode, setMode] = useState<"edit" | "feedback">("edit");
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const conversationIdRef = useRef<string | null>(null);

    const storageKey = `editor_conversation_${fileId}`;

    // Load conversationId from localStorage on mount
    useEffect(() => {
        const savedId = localStorage.getItem(storageKey);
        if (savedId) {
            conversationIdRef.current = savedId;
        }
    }, [storageKey]);

    const setConversationId = (id: string) => {
        conversationIdRef.current = id;
        localStorage.setItem(storageKey, id);
    };

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const sendMessage = async () => {
        if (!input.trim()) return;
        const userMessage = input.trim();

        // Add user message to UI immediately
        setMessages((m) => [...m, { role: "user", content: userMessage }]);
        setInput("");
        setLoading(true);
        onLoadingChange?.(true);

        try {
            // Get conversationId from ref (always current) or localStorage as fallback
            const currentConversationId = conversationIdRef.current || localStorage.getItem(storageKey);

            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    conversationId: currentConversationId,
                    fileId,
                    documentText: currentContent,
                    message: userMessage,
                    persona,
                    mode
                }),
            });

            const data = await res.json();

            // Store conversation ID for subsequent messages
            if (data.conversationId) {
                setConversationId(data.conversationId);
            }

            // Update chat (assistant message)
            if (data.assistant_message) {
                setMessages((m) => [
                    ...m,
                    { role: "assistant", content: data.assistant_message },
                ]);
            }

            // Only preview changes in edit mode
            if (mode === "edit" && data.suggested_text) {
                onPreview(data.suggested_text);
            }

        } catch (error) {
            console.error("Chat error:", error);
            setMessages((m) => [
                ...m,
                { role: "assistant", content: "Something went wrong. Please try again." },
            ]);
        } finally {
            setLoading(false);
            onLoadingChange?.(false);
        }
    };

    const acceptChanges = async () => {
        await onAccept();
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center px-4">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-semibold shadow-lg">
                                AI
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900">Document Assistant</h3>
                        </div>
                        <p className="text-sm text-gray-500 max-w-sm">
                            I can help you edit, improve, or transform your document. Just tell me what you need.
                        </p>
                    </div>
                )}
                {messages.map((m, i) => (
                    <div key={i}>
                        {m.role === "user" ? (
                            <div className="flex justify-end">
                                <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl px-4 py-2.5 max-w-[85%] shadow-sm">
                                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.content}</p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex gap-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 shadow-sm">
                                    AI
                                </div>
                                <div className="flex-1">
                                    <div className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 max-w-[90%]">
                                        <div className="prose prose-sm max-w-none text-gray-800">
                                            <ReactMarkdown>{m.content}</ReactMarkdown>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
                {/* Loading indicator */}
                {loading && (
                    <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 shadow-sm">
                            AI
                        </div>
                        <div className="flex items-center gap-2 text-gray-500 bg-gray-50 px-4 py-2.5 rounded-2xl">
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
                            <span className="text-sm">Thinking...</span>
                        </div>
                    </div>
                )}
                {/* Invisible div to scroll to */}
                <div ref={messagesEndRef} />
            </div>
            <div className="p-4 border-t bg-gray-50 space-y-3 shrink-0">
                <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                        <label htmlFor="mode-select" className="text-xs font-medium text-gray-600">
                            Mode
                        </label>
                        <select
                            id="mode-select"
                            value={mode}
                            onChange={(e) => setMode(e.target.value as "edit" | "feedback")}
                            className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm"
                            disabled={loading}
                        >
                            <option value="edit">Edit Document</option>
                            <option value="feedback">Give Feedback</option>
                        </select>
                    </div>
                    <div className="flex flex-col gap-1">
                        <label htmlFor="persona-select" className="text-xs font-medium text-gray-600">
                            Persona
                        </label>
                        <select
                            id="persona-select"
                            value={persona}
                            onChange={(e) => setPersona(e.target.value)}
                            className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm"
                            disabled={loading}
                        >
                            <option value="general">General Assistant</option>
                            <option value="seo">SEO Expert</option>
                            <option value="geoaeo">GEO/AEO Expert</option>
                            <option value="marketing">Marketing Expert</option>
                            <option value="proofreader">Proof Reader</option>
                        </select>
                    </div>
                </div>
                <div className="flex gap-3">
                    <textarea
                        placeholder="Ask AI to suggest edits..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                sendMessage();
                            }
                        }}
                        disabled={loading}
                        rows={1}
                        className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none disabled:bg-gray-100 disabled:cursor-not-allowed bg-white shadow-sm"
                    />
                    <button
                        onClick={sendMessage}
                        disabled={loading || !input.trim()}
                        className="px-5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed transition-all shadow-md"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                    </button>
                </div>
                {hasChanges && (
                    <div className="flex gap-2">
                        <button
                            onClick={onDiscard}
                            className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
                        >
                            Discard Changes
                        </button>
                        <button
                            onClick={acceptChanges}
                            className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-green-500 to-green-600 rounded-xl hover:from-green-600 hover:to-green-700 transition-all shadow-md"
                        >
                            Accept Changes
                        </button>
                    </div>
                )}
                <p className="text-xs text-gray-500 text-center">
                    Press Enter to send · Shift+Enter for new line
                </p>
            </div>
        </div>
    );
}