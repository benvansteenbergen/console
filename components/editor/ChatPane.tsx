"use client";

import { useState } from "react";
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
                body: JSON.stringify({ fileId, messages: [...messages, userMsg], persona }),
            });

            const data = await res.json();

            // Update chat (assistant message)
            if (data.assistant_message) {
                setMessages((m) => [
                    ...m,
                    { role: "assistant", content: data.assistant_message },
                ]);
            }

            if (data.suggested_text) {
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
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
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
                        className={m.role === "user" ? "text-right" : "text-left text-muted-foreground"}
                    >
                        <div
                            className={`inline-block px-3 py-2 rounded-2xl ${
                                m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                            }`}
                        >
                            {m.content}
                        </div>
                    </div>
                ))}
            </div>
            <div className="p-4 border-t space-y-3">
                <div className="flex items-center gap-2">
                    <label htmlFor="persona-select" className="text-sm font-medium text-gray-700 whitespace-nowrap">
                        AI Persona:
                    </label>
                    <select
                        id="persona-select"
                        value={persona}
                        onChange={(e) => setPersona(e.target.value)}
                        className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                        disabled={loading}
                    >
                        <option value="general">General Assistant</option>
                        <option value="seo">SEO Expert</option>
                        <option value="marketing">Marketing Expert</option>
                        <option value="proofreader">Proof Reader</option>
                    </select>
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