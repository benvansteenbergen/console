"use client";

import ReactMarkdown from "react-markdown";
import { motion } from "framer-motion";

export function DocCanvas({ content, preview }: { content: string; preview: string | null }) {
    return (
        <div className="p-8">
            <h1 className="text-lg font-semibold mb-4">Document Preview</h1>
            <div className="prose max-w-none">
                <ReactMarkdown>{preview || content}</ReactMarkdown>
            </div>
            {preview && (
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