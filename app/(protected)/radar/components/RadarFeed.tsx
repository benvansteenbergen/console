'use client';

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

interface RadarFeedProps {
  concepts: RadarConcept[];
  onSelect?: (concept: RadarConcept) => void;
}

export default function RadarFeed({ concepts, onSelect }: RadarFeedProps) {
  if (concepts.length === 0) {
    return (
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Feed</h2>
        <p className="text-sm text-gray-500">
          No concepts yet. Once your sources are set up and the sweep runs, concepts will appear here.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-3">Feed</h2>
      <div className="space-y-3">
        {concepts.map((concept) => (
          <div
            key={concept.id}
            className="rounded-xl border border-gray-200 bg-white p-4 hover:shadow-sm transition-shadow cursor-pointer"
            onClick={() => onSelect?.(concept)}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-medium text-gray-900">{concept.headline}</h3>
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{concept.concept_body}</p>
                {concept.verdict && (
                  <span className="inline-block mt-2 text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                    {concept.verdict}
                  </span>
                )}
              </div>
              <span className="text-xs text-gray-400 flex-shrink-0">
                {concept.alignment_priority}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
