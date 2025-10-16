"use client";

import ReactMarkdown from "react-markdown";
import { motion } from "framer-motion";
import DiffMatchPatch from "diff-match-patch";

export function DocCanvas({
  content,
  preview,
  loading = false,
}: {
  content: string;
  preview: string | null;
  loading?: boolean;
}) {
  const isPreviewing = Boolean(preview);

  const renderDiff = () => {
    if (!preview) return null;

    // Normalize and split both texts into blocks
    const normalize = (text: string) =>
        text.replace(/\r\n/g, "\n").trim();
    const oldBlocks = normalize(content).split(/\n{2,}/);
    const newBlocks = normalize(preview).split(/\n{2,}/);

    const dmp = new DiffMatchPatch();
    const max = Math.max(oldBlocks.length, newBlocks.length);
    const blocks: { changed: boolean; text: string }[] = [];

    for (let i = 0; i < max; i++) {
      const oldB = oldBlocks[i] || "";
      const newB = newBlocks[i] || "";
      if (oldB === newB) {
        blocks.push({ changed: false, text: newB });
        continue;
      }

      // Compare blocks semantically to detect real change
      const diffs = dmp.diff_main(oldB, newB);
      dmp.diff_cleanupSemantic(diffs);
      const hasChanges = diffs.some(([type]) => type !== 0);
      blocks.push({ changed: hasChanges, text: newB });
    }

    // Render blocks — each block stays as Markdown, but changed blocks highlighted
    return (
        <div className="prose prose-docs max-w-none leading-relaxed">
          {blocks.map((b, i) => (
              <div
                  key={i}
                  className={b.changed ? "bg-yellow-50 rounded-md p-1 transition-colors" : ""}
              >
                <ReactMarkdown>{b.text}</ReactMarkdown>
              </div>
          ))}
        </div>
    );
  };

  return (
    <div className="relative p-8 bg-white">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold text-slate-900">
          Document Preview
        </h1>
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
          <article className="prose prose-docs max-w-none leading-relaxed">
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

      {loading && (
        <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex items-center justify-center">
          <span className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></span>
        </div>
      )}
    </div>
  );
}