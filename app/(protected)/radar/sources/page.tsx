'use client';

import useSWR from 'swr';
import RadarSourcesList from '../components/RadarSourcesList';

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

const fetcher = (url: string) =>
  fetch(url, { credentials: 'include' }).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  });

export default function RadarSourcesPage() {
  const { data: followedData, mutate: mutateFollowed } = useSWR<{
    success: boolean;
    sources: RadarSource[];
  }>('/api/radar/sources?status=followed', fetcher, { refreshInterval: 60_000 });

  const { data: naylistedData, mutate: mutateNaylisted } = useSWR<{
    success: boolean;
    sources: RadarSource[];
  }>('/api/radar/sources?status=naylisted', fetcher, { refreshInterval: 60_000 });

  const followed = followedData?.sources || [];
  const naylisted = naylistedData?.sources || [];

  const handleAction = async (sourceId: string, action: string) => {
    await fetch('/api/radar/sources/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ source_id: sourceId, action }),
    });
    mutateFollowed();
    mutateNaylisted();
  };

  return (
    <div className="p-6 space-y-8">
      <RadarSourcesList
        title="On the Radar"
        sources={followed}
        actions={[{ label: 'Drop', action: 'dropped', variant: 'danger' }]}
        onAction={handleAction}
      />

      {naylisted.length > 0 && (
        <RadarSourcesList
          title="Nay-list"
          sources={naylisted}
          actions={[{ label: 'Restore', action: 'followed', variant: 'default' }]}
          onAction={handleAction}
        />
      )}
    </div>
  );
}
