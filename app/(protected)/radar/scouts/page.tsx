'use client';

import { useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { PencilIcon, PlusIcon } from '@heroicons/react/24/outline';
import { useBranding } from '@/components/BrandingProvider';
import { fetcher, SCOUTS_KEY, type RadarScout } from '../shared';

type ManageAction = 'rename' | 'pause' | 'resume' | 'archive';

function relativeDay(iso?: string | null): string | null {
  if (!iso) return null;
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  return `${days} days ago`;
}

export default function ScoutsOverviewPage() {
  const branding = useBranding();
  const { data, mutate, isLoading } = useSWR<{ success: boolean; scouts: RadarScout[] }>(SCOUTS_KEY, fetcher);
  const scouts = data?.scouts || [];

  const [renaming, setRenaming] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const manage = async (scoutId: string, action: ManageAction, name?: string) => {
    setBusy(scoutId);
    try {
      await fetch('/api/radar/scouts/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ scout_id: scoutId, action, name }),
      });
      await mutate();
    } finally {
      setBusy(null);
    }
  };

  const saveName = async (scout: RadarScout) => {
    const name = draftName.trim();
    setRenaming(null);
    if (name && name !== scout.name) await manage(scout.id, 'rename', name);
  };

  return (
    <div className="h-full overflow-auto p-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <p className="text-sm text-gray-500">Each scout watches one topic. All finds land in one feed.</p>
        <Link
          href="/radar/scouts/new"
          className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90"
          style={{ backgroundColor: branding.primaryColor }}
        >
          <PlusIcon className="h-4 w-4" />
          New scout
        </Link>
      </div>

      {isLoading && scouts.length === 0 ? (
        <p className="text-sm text-gray-400">Loading scouts…</p>
      ) : scouts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-500">
          No scouts yet. Start one and tell it which topic to watch.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {scouts.map((scout) => {
            const paused = scout.status === 'paused';
            const lastFind = relativeDay(scout.last_find_at);
            const isBusy = busy === scout.id;
            return (
              <div
                key={scout.id}
                className={`rounded-xl border bg-white p-5 transition-opacity ${
                  paused ? 'border-gray-200 opacity-70' : 'border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    {renaming === scout.id ? (
                      <input
                        autoFocus
                        value={draftName}
                        maxLength={60}
                        onChange={(e) => setDraftName(e.target.value)}
                        onBlur={() => saveName(scout)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveName(scout);
                          if (e.key === 'Escape') setRenaming(null);
                        }}
                        className="w-full rounded-lg border border-gray-300 px-2 py-1 text-base font-semibold text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-300"
                      />
                    ) : (
                      <button
                        onClick={() => {
                          setDraftName(scout.name);
                          setRenaming(scout.id);
                        }}
                        className="group flex max-w-full items-center gap-1.5 text-left"
                        title="Rename"
                      >
                        <span className="truncate text-base font-semibold text-gray-900">{scout.name}</span>
                        <PencilIcon className="h-3.5 w-3.5 flex-shrink-0 text-gray-300 group-hover:text-gray-500" />
                      </button>
                    )}
                    <p className="mt-1 text-xs text-gray-500">
                      {paused ? 'Paused' : 'Watching'} · {scout.sources_followed ?? 0} sources
                      {(scout.sources_proposed ?? 0) > 0 && ` · ${scout.sources_proposed} suggested`}
                    </p>
                  </div>
                  {(scout.sources_failing ?? 0) > 0 && (
                    <span className="flex-shrink-0 rounded bg-amber-50 px-2 py-0.5 text-xs text-amber-700">
                      {scout.sources_failing} failing
                    </span>
                  )}
                </div>

                <p className="mt-4 text-sm text-gray-700">
                  {(scout.finds_week ?? 0) > 0
                    ? `${scout.finds_week} ${scout.finds_week === 1 ? 'find' : 'finds'} this week`
                    : 'No finds this week'}
                  {lastFind && <span className="text-gray-400"> · last {lastFind}</span>}
                </p>

                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <Link
                    href={`/radar/scouts/${scout.id}`}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Sources
                  </Link>
                  <Link
                    href={`/radar/scouts/${scout.id}?tab=refine`}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Adjust
                  </Link>
                  <Link
                    href={`/radar?topic=${scout.id}`}
                    className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100"
                  >
                    View finds
                  </Link>
                  <div className="ml-auto flex items-center gap-1">
                    <button
                      onClick={() => manage(scout.id, paused ? 'resume' : 'pause')}
                      disabled={isBusy}
                      className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                    >
                      {paused ? 'Resume' : 'Pause'}
                    </button>
                    {confirmRemove === scout.id ? (
                      <>
                        <button
                          onClick={() => {
                            setConfirmRemove(null);
                            manage(scout.id, 'archive');
                          }}
                          disabled={isBusy}
                          className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
                        >
                          Remove scout
                        </button>
                        <button
                          onClick={() => setConfirmRemove(null)}
                          className="rounded-lg px-2 py-1.5 text-xs text-gray-500 hover:bg-gray-100"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setConfirmRemove(scout.id)}
                        disabled={isBusy}
                        className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
                {confirmRemove === scout.id && (
                  <p className="mt-3 text-xs text-gray-500">
                    It stops watching. Finds already in your feed stay, saved finds stay.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
