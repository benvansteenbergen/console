"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChatPane } from "@/components/editor/ChatPane";
import { DocCanvas } from "@/components/editor/DocCanvas";
import { cn } from "@/lib/utils";
import PageLoader from "@/components/ui/PageLoader";

type DocumentSnapshot = {
    fileId: string;
    content: string;
};

export type EditOperation =
    | { type: "replaceRange"; start: number; end: number; text: string }
    | { type: "insertAt"; pos: number; text: string }
    | { type: "deleteRange"; start: number; end: number };

type ViewMode = "balanced" | "chat-expanded" | "doc-expanded";

export default function EditorPage() {
    const params = useParams<{ fileId: string }>();
    const router = useRouter();
    const [doc, setDoc] = useState<DocumentSnapshot | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showSaved, setShowSaved] = useState(false);
    const [viewMode, setViewMode] = useState<ViewMode>("balanced");

    useEffect(() => {
        const fetchDoc = async () => {
            if (!params?.fileId) return;
            const res = await fetch(`/api/drive/file?fileId=${params.fileId}`);
            const data = (await res.json()) as DocumentSnapshot;
            setDoc(data);
            setLoading(false);
        };
        fetchDoc();
    }, [params?.fileId]);

    const handlePreview = (proposed: string) => setPreview(proposed);

    const handleAccept = async () => {
        if (!preview) return;

        setSaving(true);
        try {
            await fetch(`/api/drive/commit`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    fileId: doc?.fileId,
                    content: preview, // Send the full updated markdown content
                }),
            });

            // Update doc with new content
            setDoc({
                fileId: doc!.fileId,
                content: preview,
            });
            setPreview(null);

            // Show saved indicator
            setShowSaved(true);
            setTimeout(() => setShowSaved(false), 3000); // Hide after 3 seconds
        } finally {
            setSaving(false);
        }
    };

    if (loading || !doc) {
        return <PageLoader />;
    }

    const docHeight = viewMode === "doc-expanded" ? "80%" : viewMode === "chat-expanded" ? "20%" : "50%";
    const chatHeight = viewMode === "chat-expanded" ? "80%" : viewMode === "doc-expanded" ? "20%" : "50%";

    return (
        <div className="flex flex-col h-screen">
            {/* Header with Breadcrumb and Close */}
            <div className="flex items-center justify-between px-6 py-3 border-b bg-white shrink-0">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                    <button
                        onClick={() => router.push('/dashboard')}
                        className="hover:text-gray-900 transition-colors"
                    >
                        Dashboard
                    </button>
                    <span>/</span>
                    <span className="text-gray-900 font-medium">
                        {doc?.fileId ? `Document ${doc.fileId.slice(0, 8)}...` : 'Document'}
                    </span>
                </div>
                <button
                    onClick={() => router.push('/dashboard')}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Close document"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {/* Editor Content - Vertical Layout */}
            <div className="relative flex flex-col flex-1 min-h-0">
                {/* Progress Bar */}
                {saving && (
                    <div className="absolute top-0 left-0 right-0 z-50 h-1 bg-blue-600 animate-pulse" />
                )}

                {/* Document Panel - Top */}
                <div
                    className={cn(
                        "overflow-y-auto bg-white transition-all duration-300 ease-in-out",
                        saving && "blur-sm opacity-75"
                    )}
                    style={{ height: docHeight }}
                >
                    <DocCanvas content={doc.content} preview={preview} showSaved={showSaved} />
                </div>

                {/* Resize Bar with Controls */}
                <div className="flex items-center justify-center gap-2 py-1 border-y bg-gray-100 shrink-0">
                    <button
                        onClick={() => setViewMode("chat-expanded")}
                        className={cn(
                            "p-1.5 rounded transition-colors",
                            viewMode === "chat-expanded" ? "bg-blue-600 text-white" : "hover:bg-gray-200 text-gray-600"
                        )}
                        title="Expand chat"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                    </button>
                    <button
                        onClick={() => setViewMode("balanced")}
                        className={cn(
                            "p-1.5 rounded transition-colors",
                            viewMode === "balanced" ? "bg-blue-600 text-white" : "hover:bg-gray-200 text-gray-600"
                        )}
                        title="Balanced view"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                    <button
                        onClick={() => setViewMode("doc-expanded")}
                        className={cn(
                            "p-1.5 rounded transition-colors",
                            viewMode === "doc-expanded" ? "bg-blue-600 text-white" : "hover:bg-gray-200 text-gray-600"
                        )}
                        title="Expand document"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                </div>

                {/* Chat Panel - Bottom */}
                <div
                    className={cn(
                        "bg-gray-50 flex flex-col transition-all duration-300 ease-in-out",
                        saving && "pointer-events-none"
                    )}
                    style={{ height: chatHeight }}
                >
                    <ChatPane
                        fileId={doc.fileId}
                        currentContent={preview ?? doc.content}
                        onPreview={handlePreview}
                        onAccept={handleAccept}
                        onDiscard={() => setPreview(null)}
                        onLoadingChange={setSaving}
                        hasChanges={preview !== null}
                    />
                </div>
            </div>
        </div>
    );
}