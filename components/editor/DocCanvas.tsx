"use client";

import ReactMarkdown from "react-markdown";
import { motion } from "framer-motion";
import DiffMatchPatch from "diff-match-patch";

export function DocCanvas({ content, preview }: { content: string; preview: string | null }) {
  const isPreviewing = Boolean(preview);
  const dmp = new DiffMatchPatch();

  const renderDiff = () => {
    if (!preview) return null;
    const diffs = dmp.diff_main(content, preview);
    dmp.diff_cleanupSemantic(diffs);

    return (
      <div className="prose prose-slate dark:prose-invert max-w-none leading-relaxed">
        {diffs.map(([type, text], i) => {
          if (type === 1)
            return (
              <span key={i} className="text-green-700">
                {text}
              </span>
            );
          if (type === -1)
            return (
              <span key={i} className="text-red-600 line-through opacity-70">
                {text}
              </span>
            );
          return <span key={i}>{text}</span>;
        })}
      </div>
    );
  };

  return (
    <div className="p-8 bg-white">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold text-slate-900">Document Preview</h1>
        {isPreviewing && (
          <span className="text-xs font-medium px-2 py-1 rounded bg-yellow-100 text-yellow-800 border border-yellow-200">
            Previewing suggested edits
          </span>
        )}
      </div>

      <div className="overflow-y-auto max-h-[calc(100vh-8rem)]">
        {!content && !preview ? (
          <p className="text-muted-foreground text-sm italic">
            No document content available.
          </p>
        ) : isPreviewing ? (
          renderDiff()
        ) : (
          <article className="prose prose-slate dark:prose-invert max-w-none leading-relaxed">
            <ReactMarkdown>{content}</ReactMarkdown>
          </article>
        )}
      </div>

      {isPreviewing && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-4 p-3 rounded-md bg-yellow-50 text-yellow-800 text-sm border border-yellow-200 text-center"
        >
          Preview mode — not yet applied
        </motion.div>
      )}
    </div>
  );
}