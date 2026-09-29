'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { useBranding } from '@/components/BrandingProvider';
import { cn } from '@/lib/utils';
import RadarFeed from './RadarFeed';
import RadarConceptOverlay from './RadarConceptOverlay';
import { fetcher, SCOUTS_KEY, type RadarConcept, type RadarScout } from '../shared';

/** The Feed (/radar) and Saved (/radar/saved) tabs: same topic filter, list and overlay. */
export default function RadarConceptsView({ view }: { view: 'feed' | 'saved' }) {
  const branding = useBranding();
  const router = useRouter();
  const searchParams = useSearchParams();
  const topic = searchParams.get('topic');

  const [selectedConcept, setSelectedConcept] = useState<RadarConcept | null>(null);
  const [acting, setActing] = useState(false);

  const { data: scoutsData } = useSWR<{ success: boolean; scouts: RadarScout[] }>(SCOUTS_KEY, fetcher);
  const scouts = scoutsData?.scouts || [];
  const activeTopic = topic && scouts.some((s) => s.id === topic) ? topic : null;
  const scoutParam = activeTopic ? `&scout_id=${activeTopic}` : '';

  const basePath = view === 'saved' ? '/radar/saved' : '/radar';

  const { data: conceptsData, mutate: mutateConcepts } = useSWR<{ success: boolean; concepts: RadarConcept[] }>(
    `/api/radar/concepts?status=${view === 'saved' ? 'saved' : 'active'}${scoutParam}`,
    fetcher,
    { refreshInterval: 300_000 }
  );

  const concepts = conceptsData?.concepts || [];

  // Handle deep-link to a specific concept via ?concept= (or legacy #concept=)
  const deepLinkHandled = useRef(false);
  useEffect(() => {
    if (deepLinkHandled.current || !conceptsData?.concepts) return;
    const hash = window.location.hash;
    const conceptId =
      searchParams.get('concept') || (hash.startsWith('#concept=') ? hash.replace('#concept=', '') : null);
    deepLinkHandled.current = true;
    if (!conceptId) return;
    const match = conceptsData.concepts.find((c) => c.id === conceptId);
    if (match) {
      setSelectedConcept(match);
      return;
    }
    // Not in the active feed; it may have been saved already (digest links both)
    if (view === 'saved') return;
    fetch(`/api/radar/concepts?status=saved`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { concepts?: RadarConcept[] } | null) => {
        const saved = data?.concepts?.find((c) => c.id === conceptId);
        if (saved) setSelectedConcept(saved);
      })
      .catch(() => {});
  }, [conceptsData, searchParams, view]);

  const selectTopic = (scoutId: string | null) => {
    router.replace(scoutId ? `${basePath}?topic=${scoutId}` : basePath, { scroll: false });
  };

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

  // No scouts yet: one clear next step.
  if (scoutsData && scouts.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="max-w-md rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <h3 className="mb-1 text-base font-semibold text-gray-900">Start your first scout</h3>
          <p className="mb-5 text-sm text-gray-500">
            A scout watches one topic for you and brings back fresh angles to write about. Tell it what to watch,
            it finds the sources.
          </p>
          <Link
            href="/radar/scouts/new"
            className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium text-white transition-colors hover:opacity-90"
            style={{ backgroundColor: branding.primaryColor }}
          >
            Start a scout
          </Link>
        </div>
      </div>
    );
  }

  const topicName = scouts.find((s) => s.id === activeTopic)?.name;

  return (
    <div className="h-full overflow-auto p-6">
      <div className="space-y-8">
        {/* Topic filter: only worth showing once there is more than one scout */}
        {scouts.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {[{ id: null, name: 'All' } as { id: string | null; name: string }, ...scouts].map((s) => {
              const active = (s.id ?? null) === activeTopic;
              return (
                <button
                  key={s.id ?? 'all'}
                  onClick={() => selectTopic(s.id)}
                  className={cn(
                    'rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
                    active ? 'text-white' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                  )}
                  style={active ? { backgroundColor: branding.primaryColor, borderColor: branding.primaryColor } : undefined}
                >
                  {s.name}
                </button>
              );
            })}
          </div>
        )}

        {view === 'saved' ? (
          <RadarFeed
            title="Saved"
            concepts={concepts}
            onSelect={setSelectedConcept}
            showTopic={activeTopic === null}
            emptyText={
              topicName
                ? `Nothing saved for ${topicName} yet.`
                : 'Nothing saved yet. Save a find from the feed and it stays here.'
            }
          />
        ) : (
          <RadarFeed
            concepts={concepts}
            onSelect={setSelectedConcept}
            showTopic={activeTopic === null}
            emptyText={
              topicName
                ? `Nothing new for ${topicName} yet. Finds appear here after the next sweep.`
                : undefined
            }
          />
        )}
      </div>

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
