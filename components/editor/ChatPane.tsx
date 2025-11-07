"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function ChatPane({
                             fileId,
                             onPreview,
                             onAccept,
                             onLoadingChange,
                             hasChanges,
                         }: {
    fileId: string;
    onPreview: (proposed: string) => void;
    onAccept: () => void;
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

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const sendMessage = async () => {
        if (!input.trim()) return;
        const userMsg = { role: "user" as const, content: input };
        setMessages((m) => [...m, userMsg]);
        setLoading(true);
        onLoadingChange?.(true);

        try {
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ fileId, messages: [...messages, userMsg], persona, mode }),
            });

            const data = await res.json();

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

            // ✅ Clear input after sending
            setInput("");

        } catch (error) {
            console.error("Chat error:", error);
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
                    <div className="flex items-center justify-center h-full text-center px-4">
                        <div className="space-y-2">
                            <p className="text-sm font-medium text-gray-700">
                                Ask me what you want to do and I'll help you
                            </p>
                            <p className="text-xs text-gray-500">
                                I can help you edit, improve, or transform your document
                            </p>
                        </div>
                    </div>
                )}
                {messages.map((m, i) => (
                    <div
                        key={i}
                        className={m.role === "user" ? "text-right" : "text-left"}
                    >
                        <div
                            className={`inline-block px-4 py-3 rounded-2xl max-w-[85%] shadow-sm ${
                                m.role === "user"
                                    ? "bg-blue-600 text-white"
                                    : "bg-white text-gray-800 border border-gray-200"
                            }`}
                        >
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.content}</p>
                        </div>
                    </div>
                ))}
                {/* Invisible div to scroll to */}
                <div ref={messagesEndRef} />
            </div>
            <div className="p-4 border-t bg-white space-y-3 shrink-0">
                <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                        <label htmlFor="mode-select" className="text-xs font-medium text-gray-600">
                            Mode
                        </label>
                        <select
                            id="mode-select"
                            value={mode}
                            onChange={(e) => setMode(e.target.value as "edit" | "feedback")}
                            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
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
                            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                            disabled={loading}
                        >
                            <option value="general">General Assistant</option>
                            <option value="seo">SEO Expert</option>
                            <option value="marketing">Marketing Expert</option>
                            <option value="proofreader">Proof Reader</option>
                        </select>
                    </div>
                </div>
                <Textarea
                    placeholder="Ask AI to suggest edits..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={loading}
                />
                <div className="flex gap-2">
                    <Button
                        onClick={sendMessage}
                        disabled={loading || !input.trim()}
                        className="flex-1 relative flex items-center justify-center gap-2"
                    >
                        {loading && (
                            <span className="inline-block w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        )}
                        {loading ? "Thinking..." : "Send"}
                    </Button>
                    <Button
                        variant="outline"
                        onClick={acceptChanges}
                        disabled={!hasChanges}
                    >
                        Accept Changes
                    </Button>
                </div>
            </div>
        </div>
    );
}