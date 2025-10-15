"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { EditOperation } from "@/app/(protected)/editor/[fileId]/page";

export function ChatPane({
                             fileId,
                             onPreview,
                             onAccept,
                         }: {
    fileId: string;
    onPreview: (proposed: string) => void;
    onAccept: (ops: EditOperation[]) => void;
}) {
    const [messages, setMessages] = useState<
        { role: "user" | "assistant"; content: string }[]
    >([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);

    const sendMessage = async () => {
        if (!input.trim()) return;
        const userMsg = { role: "user" as const, content: input };
        setMessages((m) => [...m, userMsg]);
        setLoading(true);

        const res = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fileId, messages: [...messages, userMsg] }),
        });

        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        let assistantText = "";

        while (reader) {
            const { done, value } = await reader.read();
            if (done) break;
            assistantText += decoder.decode(value, { stream: true });
            setMessages((m) => [
                ...m.filter((msg) => msg.role !== "assistant"),
                { role: "assistant", content: assistantText },
            ]);
        }

        setLoading(false);
        onPreview(`**Suggested change:** ${assistantText}`);
    };

    const acceptChanges = async () => {
        const fakeOps: EditOperation[] = [
            { type: "replaceRange", start: 0, end: 0, text: "New text..." },
        ];
        await onAccept(fakeOps);
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
            <div className="p-4 border-t space-y-2">
                <Textarea
                    placeholder="Ask AI to suggest edits..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={loading}
                />
                <div className="flex gap-2">
                    <Button onClick={sendMessage} disabled={loading || !input.trim()}>
                        {loading ? "Thinking..." : "Send"}
                    </Button>
                    <Button variant="default" onClick={acceptChanges}>
                        Accept Changes
                    </Button>
                </div>
            </div>
        </div>
    );
}