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
    };

    if (loading || !doc)
        return (
            <div className="p-6 text-sm text-muted-foreground">Loading document…</div>
        );

    return (
        <div className="flex h-[calc(100vh-60px)]">
            <div className="w-[30%] border-r bg-muted/10 overflow-y-auto">
                <ChatPane
                    fileId={doc.fileId}
                    onPreview={handlePreview}
                    onAccept={handleAccept}
                />
            </div>

            <Separator orientation="vertical" />

            <div className={cn("flex-1 overflow-y-auto")}>
                <DocCanvas content={doc.content} preview={preview} />
            </div>
        </div>
    );
}