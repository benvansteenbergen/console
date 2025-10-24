"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChatPane } from "@/components/editor/ChatPane";
import { DocCanvas } from "@/components/editor/DocCanvas";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type DocumentSnapshot = {
    fileId: string;
    content: string;
};

export type EditOperation =
    | { type: "replaceRange"; start: number; end: number; text: string }
    | { type: "insertAt"; pos: number; text: string }
    | { type: "deleteRange"; start: number; end: number };

export default function EditorPage() {
    const params = useParams<{ fileId: string }>();
    const router = useRouter();
    const [doc, setDoc] = useState<DocumentSnapshot | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

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
        } finally {
            setSaving(false);
        }
    };

    if (loading || !doc)
        return (
            <div className="p-6 text-sm text-muted-foreground">Loading document…</div>
        );

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

            {/* Editor Content */}
            <div className="relative flex flex-1 min-h-0">
                {/* Progress Bar */}
            {saving && (
                <div className="absolute top-0 left-0 right-0 z-50 h-1 bg-blue-600 animate-pulse">
                    <div className="h-full bg-blue-400 animate-[shimmer_1s_ease-in-out_infinite]"
                         style={{
                             background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
                             backgroundSize: '200% 100%',
                             animation: 'shimmer 1.5s infinite'
                         }}
                    />
                </div>
            )}

            <div className={cn(
                "w-[30%] border-r bg-gray-50 flex flex-col min-h-0",
                saving && "pointer-events-none"
            )}>
                <ChatPane
                    fileId={doc.fileId}
                    onPreview={handlePreview}
                    onAccept={handleAccept}
                    onLoadingChange={setSaving}
                    hasChanges={preview !== null}
                />
            </div>

            <Separator orientation="vertical" />

            <div className={cn(
                "flex-1 overflow-y-auto bg-white transition-all duration-200 min-h-0",
                saving && "blur-sm opacity-75"
            )}>
                <DocCanvas content={doc.content} preview={preview} />
            </div>

            <style jsx>{`
                @keyframes shimmer {
                    0% { background-position: -200% 0; }
                    100% { background-position: 200% 0; }
                }
            `}</style>
            </div>
        </div>
    );
}