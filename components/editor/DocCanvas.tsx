"use client";

import ReactMarkdown from "react-markdown";
import { motion } from "framer-motion";

export function DocCanvas({ content, preview }: { content: string; preview: string | null }) {
    const displayContent = preview || content;
    const isPreviewing = Boolean(preview);

    return (
        <div className="p-8">
            <div className="flex items-center justify-between mb-4">
                <h1 className="text-lg font-semibold">Document Preview</h1>
                {isPreviewing && (
                    <span className="text-xs px-2 py-1 rounded bg-yellow-100 text-yellow-800">
                        Previewing suggested edits
                    </span>
                )}
            </div>

            <div className="prose max-w-none overflow-y-auto max-h-[calc(100vh-8rem)]">
                {displayContent ? (
                    <ReactMarkdown>{displayContent}</ReactMarkdown>
                ) : (
                    <p className="text-muted-foreground text-sm italic">
                        No document content available.
                    </p>
                )}
            </div>

            {isPreviewing && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-4 p-3 rounded-md bg-yellow-50 text-yellow-800 text-sm border border-yellow-200"
                >
                    Preview mode — not yet applied
                </motion.div>
            )}
        </div>
    );
}