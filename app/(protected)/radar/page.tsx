'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import RadarSuggestionStrip from './components/RadarSuggestionStrip';
import RadarFeed from './components/RadarFeed';
import RadarConceptOverlay from './components/RadarConceptOverlay';

interface RadarSource {
  id: string;
  url: string;
  name: string;
  category: string;
  tone_tag: string;
  because_quote: string;
  status: string;
  created_at: string;
}

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

const fetcher = (url: string) =>
  fetch(url, { credentials: 'include' }).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  });

export default function RadarPage() {
  const { data: suggestionsData } = useSWR<{ success: boolean; sources: RadarSource[] }>(
    '/api/radar/sources?status=proposed',
    fetcher,
    { refreshInterval: 60_000 }
  );

  const { data: conceptsData, mutate: mutateConcepts } = useSWR<{ success: boolean; concepts: RadarConcept[] }>(
    '/api/radar/concepts?status=active',
    fetcher,
    { refreshInterval: 60_000 }
  );

  const [selectedConcept, setSelectedConcept] = useState<RadarConcept | null>(null);
  const [acting, setActing] = useState(false);

  // Handle deep-link to a specific concept via hash
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.startsWith('#concept=')) {
      const conceptId = hash.replace('#concept=', '');
      // TODO: open RadarConceptOverlay for this concept (Slice 3)
      console.log('Deep-link to concept:', conceptId);
    }
  }, []);

  const suggestions = suggestionsData?.sources || [];
  const concepts = conceptsData?.concepts || [];

  const handleConceptAction = async (conceptId: string, action: string) => {
    setActing(true);
    try {
      await fetch('/api/radar/concepts/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ concept_id: conceptId, action }),
      });
      setSelectedConcept(null);
      mutateConcepts();
    } finally {
      setActing(false);
    }
  };

  return (
    <div className="p-6 space-y-8">
      <RadarSuggestionStrip sources={suggestions} />
      <RadarFeed concepts={concepts} onSelect={setSelectedConcept} />
      {selectedConcept && (
        <RadarConceptOverlay
          concept={selectedConcept}
          onClose={() => setSelectedConcept(null)}
          onAction={handleConceptAction}
          acting={acting}
        />
      )}
    </div>
  );
}
