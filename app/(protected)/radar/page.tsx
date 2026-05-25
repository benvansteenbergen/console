'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { useBranding } from '@/components/BrandingProvider';
import RadarSuggestionStrip from './components/RadarSuggestionStrip';
import RadarFeed from './components/RadarFeed';
import RadarConceptOverlay from './components/RadarConceptOverlay';
import RadarSourcesList from './components/RadarSourcesList';
import ScoutChatPane from './components/ScoutChatPane';
import ScoutHabitatPane from './components/ScoutHabitatPane';

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

interface ProfileSummary {
  name?: string;
  industry?: string;
  tagline?: string;
  audience?: string;
  tone_keywords?: string[];
  content_types?: string[];
}

const fetcher = (url: string) =>
  fetch(url, { credentials: 'include' }).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  });

export default function RadarPage() {
  const branding = useBranding();
  const [view, setView] = useState<'feed' | 'scout'>('feed');
  const [selectedConcept, setSelectedConcept] = useState<RadarConcept | null>(null);
  const [acting, setActing] = useState(false);
  const [naylistOpen, setNaylistOpen] = useState(false);

  // Scout state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isConversationActive, setIsConversationActive] = useState(false);

  // SWR data fetches — shared across views
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

  const { data: followedData, mutate: mutateFollowed } = useSWR<{ success: boolean; sources: RadarSource[] }>(
    '/api/radar/sources?status=followed',
    fetcher,
    { refreshInterval: 60_000 }
  );

  const { data: naylistedData, mutate: mutateNaylisted } = useSWR<{ success: boolean; sources: RadarSource[] }>(
    '/api/radar/sources?status=naylisted',
    fetcher,
    { refreshInterval: 60_000 }
  );

  const { data: prioritiesData } = useSWR<{ success: boolean; markdown: string }>(
    '/api/radar/priorities',
    fetcher
  );

  const { data: profileData } = useSWR<ProfileSummary>(
    '/api/company-profile',
    fetcher
  );

  const suggestions = suggestionsData?.sources || [];
  const concepts = conceptsData?.concepts || [];
  const followed = followedData?.sources || [];
  const naylisted = naylistedData?.sources || [];
  const hasPriorities = !!prioritiesData?.markdown;
  const scoutMode = hasPriorities ? 'B' : 'A';

  // Handle deep-link to a specific concept via hash
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.startsWith('#concept=')) {
      const conceptId = hash.replace('#concept=', '');
      console.log('Deep-link to concept:', conceptId);
    }
  }, []);

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

  const handleSourceAction = async (sourceId: string, action: string) => {
    await fetch('/api/radar/sources/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ source_id: sourceId, action }),
    });
    mutateFollowed();
    mutateNaylisted();
  };

  // --- Scout view ---
  if (view === 'scout') {
    return (
      <div className="flex h-full flex-col">
        {/* Scout header */}
        <div className="flex items-center gap-3 border-b border-gray-200 px-6 py-4">
          <button
            onClick={() => setView('feed')}
            className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-gray-900">Scout</h1>
        </div>

        {/* Two-panel layout */}
        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 lg:w-[65%]">
            <ScoutChatPane
              mode={scoutMode}
              sessionId={sessionId}
              onSessionId={setSessionId}
              onConversationActive={setIsConversationActive}
              onBack={() => setView('feed')}
              profileContext={profileData}
            />
          </div>
          <div className="hidden w-[35%] border-l border-gray-100 bg-gray-50/50 lg:block">
            <ScoutHabitatPane isConversationActive={isConversationActive} />
          </div>
        </div>
      </div>
    );
  }

  // --- Feed view ---
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-6">
        <h1 className="text-2xl font-bold text-gray-900">Radar</h1>
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-8">
        {/* Suggestion strip */}
        <RadarSuggestionStrip sources={suggestions} />

        {/* Feed */}
        <RadarFeed concepts={concepts} onSelect={setSelectedConcept} />

        {/* Sources section */}
        {followed.length > 0 && (
          <RadarSourcesList
            title="On the Radar"
            sources={followed}
            actions={[{ label: 'Drop', action: 'dropped', variant: 'danger' }]}
            onAction={handleSourceAction}
          />
        )}

        {/* Naylisted — collapsible */}
        {naylisted.length > 0 && (
          <div>
            <button
              onClick={() => setNaylistOpen((prev) => !prev)}
              className="flex items-center gap-2 text-sm font-medium text-gray-500 transition-colors hover:text-gray-700"
            >
              <svg
                className={`h-4 w-4 transition-transform ${naylistOpen ? 'rotate-90' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
              Nay-list ({naylisted.length})
            </button>
            {naylistOpen && (
              <div className="mt-3">
                <RadarSourcesList
                  title=""
                  sources={naylisted}
                  actions={[{ label: 'Restore', action: 'followed', variant: 'default' }]}
                  onAction={handleSourceAction}
                />
              </div>
            )}
          </div>
        )}

        {/* Start Scout CTA */}
        {hasPriorities ? (
          <div className="flex justify-center pt-2">
            <button
              onClick={() => setView('scout')}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
            >
              Verfijn je Radar
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </button>
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm">
            <h3 className="text-base font-semibold text-gray-900 mb-1">Stel je Radar in</h3>
            <p className="text-sm text-gray-500 mb-4 max-w-md mx-auto">
              Vertel Scout over je content-interesses en strategische prioriteiten. We vinden bronnen die het volgen waard zijn.
            </p>
            <button
              onClick={() => setView('scout')}
              className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium text-white transition-colors hover:opacity-90"
              style={{ backgroundColor: branding.primaryColor }}
            >
              Start Scout
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Concept overlay */}
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
