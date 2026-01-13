"use client";

import ReactMarkdown from "react-markdown";
import { motion } from "framer-motion";
import DiffMatchPatch from "diff-match-patch";

export function DocCanvas({
  content,
  preview,
  loading = false,
  showSaved = false,
  showLineNumbers = false,
}: {
  content: string;
  preview: string | null;
  loading?: boolean;
  showSaved?: boolean;
  showLineNumbers?: boolean;
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
    <div className="relative h-full bg-gray-100 p-6 overflow-auto">
      {/* Header Bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-sm">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h1 className="text-sm font-medium text-gray-700">Document Preview</h1>
        </div>
        <div className="flex items-center gap-2">
          {isPreviewing && (
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-yellow-100 text-yellow-700 border border-yellow-200">
              Previewing edits
            </span>
          )}
          {showSaved && !isPreviewing && (
            <motion.span
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="text-xs font-medium px-2.5 py-1 rounded-full bg-green-100 text-green-700 border border-green-200"
            >
              Saved
            </motion.span>
          )}
        </div>
      </div>

      {/* Document Page */}
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 min-h-[calc(100%-60px)]">
        {/* Page top edge decoration */}
        <div className="h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 rounded-t-lg" />

        <div className="p-8 sm:p-10 md:p-12">
          <div className="flex gap-4">
            {/* Line Numbers (optional) */}
            {showLineNumbers && (
              <div className="select-none text-right text-xs text-gray-300 pt-1 pr-4 border-r border-gray-100 shrink-0 font-mono leading-relaxed">
                {(isPreviewing ? preview : content)?.split('\n').map((_, i) => (
                  <div key={i} className="h-[1.75rem]">{i + 1}</div>
                ))}
              </div>
            )}

            {/* Content */}
            <div className="flex-1 min-w-0">
              {!content && !preview ? (
                <p className="text-gray-400 text-sm italic text-center py-12">
                  No document content available.
                </p>
              ) : isPreviewing ? (
                renderDiff()
              ) : (
                <article className="prose prose-docs max-w-none leading-relaxed prose-headings:text-gray-900 prose-p:text-gray-700">
                  <ReactMarkdown>{content}</ReactMarkdown>
                </article>
              )}
            </div>
          </div>
        </div>

        {isPreviewing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mx-8 mb-8 p-3 rounded-lg bg-yellow-50 text-yellow-700 text-sm border border-yellow-200 text-center"
          >
            Preview mode — changes not yet applied
          </motion.div>
        )}
      </div>

      {loading && (
        <div className="absolute inset-0 bg-gray-100/80 backdrop-blur-sm flex items-center justify-center rounded-lg">
          <div className="bg-white p-4 rounded-xl shadow-lg flex items-center gap-3">
            <span className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
            <span className="text-sm text-gray-600">Loading...</span>
          </div>
        </div>
      )}
    </div>
  );
}