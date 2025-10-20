"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
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

    const handleAccept = async (ops: EditOperation[]) => {
        setSaving(true);
        try {
            const res = await fetch(`/api/drive/commit`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    fileId: doc?.fileId,
                    ops
                }),
            });
            const updated = (await res.json()) as DocumentSnapshot;
            setDoc(updated);
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
        <div className="relative flex h-[calc(100vh-60px)]">
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
                "w-[30%] border-r bg-muted/10 overflow-y-auto",
                saving && "pointer-events-none"
            )}>
                <ChatPane
                    fileId={doc.fileId}
                    onPreview={handlePreview}
                    onAccept={handleAccept}
                    onLoadingChange={setSaving}
                />
            </div>

            <Separator orientation="vertical" />

            <div className={cn(
                "flex-1 overflow-y-auto transition-all duration-200",
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
    );
}