'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import useSWR, { mutate as globalMutate } from 'swr';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useBranding } from '@/components/BrandingProvider';
import { cn } from '@/lib/utils';
import RadarSuggestionStrip from '../../components/RadarSuggestionStrip';
import RadarSourcesList, { type CopyResult } from '../../components/RadarSourcesList';
import ScoutChatPane from '../../components/ScoutChatPane';
import ScoutHabitatPane from '../../components/ScoutHabitatPane';
import { fetcher, SCOUTS_KEY, sourcesKey, useScoutProfile, type RadarScout, type RadarSource } from '../../shared';

type SourcesResponse = { success: boolean; sources: RadarSource[] };

export default function ScoutDetailPage() {
  const branding = useBranding();
  const router = useRouter();
  const { id: scoutId } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab') === 'refine' ? 'refine' : 'sources';

  const { data: scoutsData, isLoading: scoutsLoading } = useSWR<{ success: boolean; scouts: RadarScout[] }>(
    SCOUTS_KEY,
    fetcher
  );
  const scouts = scoutsData?.scouts || [];
  const scout = scouts.find((s) => s.id === scoutId);
  const copyTargets = scouts.filter((s) => s.id !== scoutId);

  const { data: proposedData, mutate: mutateProposed } = useSWR<SourcesResponse>(
    sourcesKey(scoutId, 'proposed'),
    fetcher
  );
  const { data: followedData, mutate: mutateFollowed } = useSWR<SourcesResponse>(
    sourcesKey(scoutId, 'followed'),
    fetcher,
    { refreshInterval: 300_000 }
  );
  const { data: naylistedData, mutate: mutateNaylisted } = useSWR<SourcesResponse>(
    sourcesKey(scoutId, 'naylisted'),
    fetcher
  );

  const [naylistOpen, setNaylistOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [refineDone, setRefineDone] = useState(false);
  const profile = useScoutProfile();

  const refreshAll = () => {
    mutateProposed();
    mutateFollowed();
    mutateNaylisted();
    globalMutate(SCOUTS_KEY);
  };

  const handleSourceAction = async (sourceId: string, action: string) => {
    await fetch('/api/radar/sources/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ source_id: sourceId, action }),
    });
    refreshAll();
  };

  const handleCopy = async (sourceId: string, targetScoutId: string): Promise<CopyResult> => {
    try {
      const res = await fetch('/api/radar/sources/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ source_id: sourceId, action: 'copy', target_scout_id: targetScoutId }),
      });
      if (res.ok === false) return 'error';
      const data: { copied?: number; already_there?: boolean } = await res.json();
      globalMutate(SCOUTS_KEY);
      if (data.already_there) return 'already';
      return (data.copied ?? 0) > 0 ? 'copied' : 'error';
    } catch {
      return 'error';
    }
  };

  const setTab = (next: 'sources' | 'refine') => {
    setRefineDone(false);
    router.replace(next === 'refine' ? `/radar/scouts/${scoutId}?tab=refine` : `/radar/scouts/${scoutId}`, {
      scroll: false,
    });
  };

  if (scoutsData && scout === undefined && scoutsLoading === false) {
    return (
      <div className="p-6 text-sm text-gray-500">
        This scout no longer exists.{' '}
        <Link href="/radar/scouts" className="underline">
          Back to scouts
        </Link>
      </div>
    );
  }

  const followed = followedData?.sources || [];
  const naylisted = naylistedData?.sources || [];

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-gray-100 px-6 py-3">
        <Link
          href="/radar/scouts"
          className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
          title="All scouts"
        >
          <ArrowLeftIcon className="h-4 w-4" />
        </Link>
        <h2 className="truncate text-lg font-semibold text-gray-900">{scout?.name ?? '…'}</h2>
        {scout?.status === 'paused' && (
          <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500">Paused</span>
        )}
        <div className="ml-auto flex rounded-lg bg-gray-100 p-0.5">
          {(['sources', 'refine'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'rounded-md px-3 py-1 text-sm font-medium transition-colors',
                tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              )}
            >
              {t === 'sources' ? 'Sources' : 'Refine'}
            </button>
          ))}
        </div>
      </div>

      {tab === 'refine' ? (
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <div className="flex-1 lg:w-[65%]">
            <ScoutChatPane
              key={scoutId}
              mode="B"
              scoutId={scoutId}
              scoutName={scout?.name}
              sessionId={sessionId}
              onSessionId={setSessionId}
              onConversationActive={() => {}}
              onComplete={() => {
                setRefineDone(true);
                refreshAll();
              }}
              onBack={() => setTab('sources')}
              backLabel="Review sources"
              profileContext={profile}
            />
          </div>
          <div className="hidden w-[35%] border-l border-gray-100 bg-gray-50/50 lg:block">
            <ScoutHabitatPane profile={profile} scoutId={scoutId} isComplete={refineDone} />
          </div>
        </div>
      ) : (
        <div className="min-h-0 flex-1 space-y-8 overflow-auto p-6">
          <RadarSuggestionStrip sources={proposedData?.sources || []} onChanged={refreshAll} />

          <RadarSourcesList
            title="On the Radar"
            sources={followed}
            actions={[{ label: 'Drop', action: 'dropped', variant: 'danger' }]}
            onAction={handleSourceAction}
            copyTargets={copyTargets}
            onCopy={handleCopy}
          />

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

          <div className="flex justify-center pt-2">
            <button
              onClick={() => setTab('refine')}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
            >
              Find more sources with Scout
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                style={{ color: branding.primaryColor }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
