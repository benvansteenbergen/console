'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface RadarConcept {
  id: string;
  source_id: string;
  article_url: string;
  headline: string;
  concept_body: string;
  alignment_quote: string;
  alignment_priority: string;
  alignment_why: string;
  verdict: string | null;
  verdict_body: string | null;
  verdict_writing_note: string | null;
  status: string;
  banner_seen: boolean;
  created_at: string;
}

interface RadarConceptOverlayProps {
  concept: RadarConcept;
  onClose: () => void;
  onAction: (conceptId: string, action: string) => void;
  acting?: boolean;
}

export default function RadarConceptOverlay({
  concept,
  onClose,
  onAction,
  acting = false,
}: RadarConceptOverlayProps) {
  const router = useRouter();

  // Hand this article over to Content Studio as the source for a new piece.
  const writeInStudio = () => {
    try {
      sessionStorage.setItem(
        'studio_source',
        JSON.stringify({ url: concept.article_url, headline: concept.headline }),
      );
    } catch {
      /* sessionStorage unavailable; fall through to navigation anyway */
    }
    router.push('/studio');
  };

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl bg-white shadow-xl mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="p-6 space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 pr-8">{concept.headline}</h2>
            <p className="text-sm text-gray-600 mt-2 leading-relaxed">{concept.concept_body}</p>
          </div>

          <div className="rounded-lg bg-gray-50 p-4 space-y-2">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Alignment</p>
            <blockquote className="text-sm text-gray-700 border-l-2 border-blue-400 pl-3 italic">
              &ldquo;{concept.alignment_quote}&rdquo;
            </blockquote>
            <p className="text-xs text-gray-500">
              <span className="font-medium">{concept.alignment_priority}</span>
              {concept.alignment_why && <> &mdash; {concept.alignment_why}</>}
            </p>
          </div>

          {concept.verdict && (
            <div className="rounded-lg bg-blue-50 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Verdict</p>
                <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-medium">
                  {concept.verdict}
                </span>
              </div>
              {concept.verdict_body && (
                <p className="text-sm text-gray-700 leading-relaxed">{concept.verdict_body}</p>
              )}
              {concept.verdict_writing_note && (
                <p className="text-xs text-gray-500 italic">
                  Writing note: {concept.verdict_writing_note}
                </p>
              )}
            </div>
          )}

          {concept.article_url && (
            <a
              href={concept.article_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 transition-colors"
            >
              View original article
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          )}

          <div className="flex gap-3 pt-2 border-t border-gray-100">
            {concept.article_url && (
              <button
                onClick={writeInStudio}
                disabled={acting}
                className="flex-1 px-4 py-2 text-sm font-medium rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-400 transition-all"
              >
                Write in Studio
              </button>
            )}
            <button
              onClick={() => onAction(concept.id, 'saved')}
              disabled={acting}
              className="px-4 py-2 text-sm font-medium rounded-lg text-gray-700 border border-gray-200 hover:bg-gray-50 disabled:text-gray-400 disabled:border-gray-200 transition-colors"
            >
              Save
            </button>
            <button
              onClick={() => onAction(concept.id, 'dropped')}
              disabled={acting}
              className="px-4 py-2 text-sm font-medium rounded-lg text-red-600 border border-red-200 hover:bg-red-50 disabled:text-gray-400 disabled:border-gray-200 transition-colors"
            >
              Drop
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
