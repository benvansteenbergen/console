'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useBranding } from '@/components/BrandingProvider';
import { hostname, type RadarConcept } from '../shared';

interface RadarConceptOverlayProps {
  concept: RadarConcept;
  onClose: () => void;
  onAction: (conceptId: string, action: string) => void;
  acting?: boolean;
}

function foundOn(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="border-t border-gray-100 py-5">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</h3>
      {children}
    </section>
  );
}

export default function RadarConceptOverlay({
  concept,
  onClose,
  onAction,
  acting = false,
}: RadarConceptOverlayProps) {
  const router = useRouter();
  const branding = useBranding();

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

  const meta = [concept.scout_name, concept.article_url ? hostname(concept.article_url) : null, foundOn(concept.created_at)]
    .filter(Boolean)
    .join(' · ');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/30 p-4 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Wordmark, like the weekly email */}
        <div className="flex items-center justify-between px-8 pt-6">
          <p className="text-sm font-extrabold tracking-tight text-gray-900">
            {branding.name.toLowerCase()} <span className="font-normal">radar</span>
          </p>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto px-8 pb-2">
          {/* The find: headline + why it matters to you */}
          <div className="pb-6 pt-5">
            {meta && <p className="mb-2 text-xs text-gray-400">{meta}</p>}
            <h2 className="text-xl font-bold leading-snug text-gray-900">{concept.headline}</h2>
            {concept.alignment_why && (
              <p className="mt-3 text-[15px] leading-relaxed text-gray-600">{concept.alignment_why}</p>
            )}
          </div>

          {concept.concept_body && (
            <Section label="The angle">
              <p className="text-sm leading-relaxed text-gray-700">{concept.concept_body}</p>
            </Section>
          )}

          {concept.verdict && (
            <Section label="Fact check">
              <p className="text-sm font-semibold text-gray-900">{concept.verdict}</p>
              {concept.verdict_body && (
                <p className="mt-1.5 text-sm leading-relaxed text-gray-600">{concept.verdict_body}</p>
              )}
              {concept.verdict_writing_note && (
                <p className="mt-3 text-sm leading-relaxed text-gray-500">
                  <span className="font-medium text-gray-700">Writing tip: </span>
                  {concept.verdict_writing_note}
                </p>
              )}
            </Section>
          )}

          {(concept.alignment_priority || concept.alignment_quote) && (
            <Section label="Matches your priority">
              {concept.alignment_priority && (
                <p className="text-sm font-medium text-gray-900">{concept.alignment_priority}</p>
              )}
              {concept.alignment_quote && (
                <p className="mt-1.5 border-l-2 border-gray-200 pl-3 text-sm italic leading-relaxed text-gray-500">
                  {concept.alignment_quote}
                </p>
              )}
            </Section>
          )}
        </div>

        {/* Footer: source + actions */}
        <div className="flex flex-wrap items-center gap-3 border-t border-gray-100 px-8 py-4">
          {concept.article_url && (
            <a
              href={concept.article_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mr-auto text-xs text-gray-400 underline decoration-gray-300 underline-offset-2 hover:text-gray-600"
            >
              Source: {hostname(concept.article_url)}
            </a>
          )}
          <button
            onClick={() => onAction(concept.id, 'dropped')}
            disabled={acting}
            className="rounded-lg px-3 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
          >
            Drop
          </button>
          {concept.status !== 'saved' && (
            <button
              onClick={() => onAction(concept.id, 'saved')}
              disabled={acting}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
            >
              Save
            </button>
          )}
          {concept.article_url && (
            <button
              onClick={writeInStudio}
              disabled={acting}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: branding.primaryColor }}
            >
              Write in Studio
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
