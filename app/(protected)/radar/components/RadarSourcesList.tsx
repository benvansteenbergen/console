'use client';

import { useState } from 'react';
import type { RadarScout, RadarSource } from '../shared';

interface SourceHealth {
  status: string;
  last_sweep?: string;
  consecutive_failures?: number;
  reason?: string;
}

function parseHealth(notes?: string | null): SourceHealth | null {
  if (!notes) return null;
  try {
    return JSON.parse(notes).health ?? null;
  } catch {
    return null;
  }
}

interface ActionDef {
  label: string;
  action: string;
  variant: 'default' | 'danger';
}

export type CopyResult = 'copied' | 'already' | 'error';

interface RadarSourcesListProps {
  title: string;
  sources: RadarSource[];
  actions: ActionDef[];
  onAction: (sourceId: string, action: string) => void;
  /** Other scouts a source can be copied to. Omit to hide "Copy to…". */
  copyTargets?: RadarScout[];
  onCopy?: (sourceId: string, targetScoutId: string) => Promise<CopyResult>;
}

export default function RadarSourcesList({
  title,
  sources,
  actions,
  onAction,
  copyTargets = [],
  onCopy,
}: RadarSourcesListProps) {
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [copyNote, setCopyNote] = useState<Record<string, string>>({});
  const canCopy = Boolean(onCopy) && copyTargets.length > 0;

  const copy = async (sourceId: string, target: RadarScout) => {
    setMenuFor(null);
    if (onCopy === undefined) return;
    setCopyNote((n) => ({ ...n, [sourceId]: `Copying to ${target.name}…` }));
    const result = await onCopy(sourceId, target.id);
    const text =
      result === 'copied'
        ? `Copied to ${target.name}`
        : result === 'already'
          ? `Already in ${target.name}`
          : 'Copy failed, try again';
    setCopyNote((n) => ({ ...n, [sourceId]: text }));
  };

  if (sources.length === 0) {
    return (
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">{title}</h2>
        <p className="text-sm text-gray-500">No sources yet.</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-3">{title}</h2>
      <div className="space-y-2">
        {sources.map((source) => {
          const health = parseHealth(source.notes);
          return (
          <div
            key={source.id}
            className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white px-4 py-3 hover:bg-gray-50 transition-colors"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm text-gray-900 truncate">
                  {source.name || source.url}
                </span>
                {source.category && (
                  <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600 flex-shrink-0">
                    {source.category}
                  </span>
                )}
                {source.tone_tag && (
                  <span className="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700 flex-shrink-0">
                    {source.tone_tag}
                  </span>
                )}
                {health?.status === 'failed' && (
                  <span
                    className="text-xs px-2 py-0.5 rounded bg-amber-50 text-amber-700 flex-shrink-0"
                    title={health.reason}
                  >
                    Fetch failing
                    {health.consecutive_failures && health.consecutive_failures > 1
                      ? ` (${health.consecutive_failures} sweeps)`
                      : ''}
                  </span>
                )}
              </div>
              {source.because_quote && (
                <p className="text-xs text-gray-500 mt-1 truncate">
                  {source.because_quote}
                </p>
              )}
              {copyNote[source.id] && (
                <p className="text-xs text-gray-400 mt-1">{copyNote[source.id]}</p>
              )}
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {canCopy && (
                <div className="relative">
                  <button
                    onClick={() => setMenuFor((m) => (m === source.id ? null : source.id))}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    Copy to…
                  </button>
                  {menuFor === source.id && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setMenuFor(null)} />
                      <div className="absolute right-0 z-20 mt-1 w-56 rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
                        {copyTargets.map((target) => (
                          <button
                            key={target.id}
                            onClick={() => copy(source.id, target)}
                            className="block w-full truncate px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                          >
                            {target.name}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
              {actions.map((act) => (
                <button
                  key={act.action}
                  onClick={() => onAction(source.id, act.action)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    act.variant === 'danger'
                      ? 'text-red-600 hover:bg-red-50'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {act.label}
                </button>
              ))}
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
}
