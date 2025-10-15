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

    // 1️⃣ Normaliseer whitespace
    const normalize = (text: string) =>
        text.replace(/\r\n/g, "\n").replace(/\n{2,}/g, "\n\n").trim();

    const oldText = normalize(content);
    const newText = normalize(preview);

    // 2️⃣ Diff op paragrafen (split per dubbele newline)
    const oldParagraphs = oldText.split("\n\n");
    const newParagraphs = newText.split("\n\n");

    const diffs: [number, string][] = [];

    // Vergelijk per paragraaf
    const max = Math.max(oldParagraphs.length, newParagraphs.length);
    for (let i = 0; i < max; i++) {
      const oldP = oldParagraphs[i] || "";
      const newP = newParagraphs[i] || "";

      if (oldP === newP) {
        diffs.push([0, newP]);
        continue;
      }

      const dmp = new DiffMatchPatch();
      const innerDiffs = dmp.diff_main(oldP, newP);
      dmp.diff_cleanupSemantic(innerDiffs);
      innerDiffs.forEach((d) => diffs.push(d));
      diffs.push([0, "\n\n"]); // voeg paragraaf-scheiding terug
    }

    // 3️⃣ Render schoon
    return (
        <div className="prose prose-docs max-w-none leading-relaxed">
          {diffs.map(([type, text], i) => {
            if (type === 1)
              return (
                  <mark
                      key={i}
                      className="bg-green-50 rounded-sm px-0.5"
                      style={{ display: "inline" }}
                  >
                    <ReactMarkdown>{text}</ReactMarkdown>
                  </mark>
              );
            if (type === -1)
              return (
                  <mark
                      key={i}
                      className="bg-red-50 line-through opacity-50 rounded-sm px-0.5"
                      style={{ display: "inline" }}
                  >
                    <ReactMarkdown>{text}</ReactMarkdown>
                  </mark>
              );
            return <ReactMarkdown key={i}>{text}</ReactMarkdown>;
          })}
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