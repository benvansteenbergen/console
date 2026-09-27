'use client';

import { hostname, type RadarConcept } from '../shared';

interface RadarFeedProps {
  concepts: RadarConcept[];
  onSelect?: (concept: RadarConcept) => void;
  title?: string;
  /** Show which scout (topic) each find came from. */
  showTopic?: boolean;
  emptyText?: string;
}

function shortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function RadarFeed({
  concepts,
  onSelect,
  title = 'Feed',
  showTopic = false,
  emptyText = 'No concepts yet. Once your sources are set up and the sweep runs, concepts will appear here.',
}: RadarFeedProps) {
  if (concepts.length === 0) {
    return (
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">{title}</h2>
        <p className="text-sm text-gray-500">{emptyText}</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-3">{title}</h2>
      {/* One card, rows split by thin lines: the same reading rhythm as the weekly email */}
      <div className="rounded-xl border border-gray-200 bg-white px-6">
        {concepts.map((concept) => {
          const meta = [
            showTopic ? concept.scout_name : null,
            concept.article_url ? hostname(concept.article_url) : null,
            shortDate(concept.created_at),
          ]
            .filter(Boolean)
            .join(' · ');
          return (
            <button
              key={concept.id}
              onClick={() => onSelect?.(concept)}
              className="group block w-full border-b border-gray-100 py-5 text-left last:border-b-0"
            >
              <h3 className="text-base font-bold leading-snug text-gray-900 group-hover:underline group-hover:decoration-gray-300 group-hover:underline-offset-4">
                {concept.headline}
              </h3>
              {(concept.alignment_why || concept.concept_body) && (
                <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-gray-600">
                  {concept.alignment_why || concept.concept_body}
                </p>
              )}
              {meta && <p className="mt-2 text-xs text-gray-400">{meta}</p>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
