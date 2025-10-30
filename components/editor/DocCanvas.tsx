"use client";

import ReactMarkdown from "react-markdown";
import { motion } from "framer-motion";
import DiffMatchPatch from "diff-match-patch";

export function DocCanvas({
  content,
  preview,
  loading = false,
  showSaved = false,
}: {
  content: string;
  preview: string | null;
  loading?: boolean;
  showSaved?: boolean;
}) {
  const isPreviewing = Boolean(preview);

  const renderDiff = () => {
    if (!preview) return null;

    // Normalize text for consistent comparison
    const normalize = (text: string) => {
      return text
        // Normalize line endings
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        // Trim
        .trim()
        // Normalize multiple blank lines
        .replace(/\n{3,}/g, "\n\n")
        // Remove trailing spaces on lines
        .replace(/ +$/gm, "")
        // Normalize header spacing
        .replace(/^(#{1,6})\s+/gm, "$1 ");
    };

    const oldBlocks = normalize(content).split(/\n{2,}/);
    const newBlocks = normalize(preview).split(/\n{2,}/);

    const dmp = new DiffMatchPatch();
    const max = Math.max(oldBlocks.length, newBlocks.length);
    const blocks: { changed: boolean; text: string }[] = [];

    for (let i = 0; i < max; i++) {
      const oldB = oldBlocks[i] || "";
      const newB = newBlocks[i] || "";
      const diffs = dmp.diff_main(oldB, newB);
      dmp.diff_cleanupSemantic(diffs);
      const hasChanges = diffs.some(([type]) => type !== 0);
      // Push new block if available, otherwise push old block to maintain full document
      blocks.push({ changed: hasChanges, text: newB || oldB });
    }

    // Render full doc — only changed blocks highlighted
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
    <div className="relative p-4 bg-white sm:p-6 md:p-8">
      <div className="flex flex-col gap-2 mb-4 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
        <h1 className="text-base font-semibold text-slate-900 sm:text-lg">
          Document Preview
        </h1>
        {isPreviewing && (
          <span className="text-xs font-medium px-2 py-1 rounded bg-yellow-100 text-yellow-800 border border-yellow-200">
            Previewing suggested edits
          </span>
        )}
        {showSaved && !isPreviewing && (
          <motion.span
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="text-xs font-medium px-2 py-1 rounded bg-green-100 text-green-800 border border-green-200"
          >
            Saved
          </motion.span>
        )}
      </div>

      <div className="flex gap-4">
        {/* Line Numbers */}
        <div className="select-none text-right text-xs text-gray-400 pt-1 pr-4 border-r border-gray-200 shrink-0 font-mono leading-relaxed">
          {(isPreviewing ? preview : content)?.split('\n').map((_, i) => (
            <div key={i} className="h-[1.75rem]">{i + 1}</div>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
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