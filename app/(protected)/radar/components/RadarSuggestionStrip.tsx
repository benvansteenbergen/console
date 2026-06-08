'use client';

import { useState } from 'react';
import { useBranding } from '@/components/BrandingProvider';

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

interface RadarSuggestionStripProps {
  sources: RadarSource[];
}

const COLLAPSED_COUNT = 6;

export default function RadarSuggestionStrip({ sources }: RadarSuggestionStripProps) {
  const branding = useBranding();
  const accent = branding.primaryColor;
  const [acting, setActing] = useState<string | null>(null);
  const [hidden, setHidden] = useState<Record<string, boolean>>({});
  const [expanded, setExpanded] = useState(false);

  // Collapse only true duplicates (same URL). A site may legitimately provide several
  // sections (e.g. business vs consumer) under the same name but different URLs — keep those.
  const seen = new Set<string>();
  const deduped = sources.filter((s) => {
    const key = (s.url || s.name || '')
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/+$/, '');
    if (key === '' || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const visible = deduped.filter((s) => hidden[s.id] !== true);
  if (visible.length === 0) return null;

  const shown = expanded ? visible : visible.slice(0, COLLAPSED_COUNT);
  const overflow = visible.length - COLLAPSED_COUNT;

  const handleAction = async (sourceId: string, action: string) => {
    setActing(sourceId);
    setHidden((h) => ({ ...h, [sourceId]: true })); // optimistic: row leaves the list right away
    try {
      const res = await fetch('/api/radar/sources/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ source_id: sourceId, action }),
      });
      if (res.ok === false) throw new Error('action failed');
    } catch {
      setHidden((h) => ({ ...h, [sourceId]: false })); // revert on failure
    } finally {
      setActing(null);
    }
  };

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-lg font-semibold text-gray-900">Suggested sources</h2>
        <span
          className="rounded-full px-2 py-0.5 text-xs font-semibold"
          style={{ backgroundColor: accent + '14', color: accent }}
        >
          {visible.length}
        </span>
      </div>

      <div
        className={
          'grid grid-cols-1 gap-2 sm:grid-cols-2' +
          (expanded && visible.length > 10 ? ' max-h-[460px] overflow-y-auto pr-1' : '')
        }
      >
        {shown.map((source) => {
          const isActing = acting === source.id;
          return (
            <div
              key={source.id}
              className="group flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 transition-colors hover:border-gray-300 hover:bg-gray-50/60"
            >
              <div
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold"
                style={{ backgroundColor: accent + '1a', color: accent }}
              >
                {(source.name || source.url).charAt(0).toUpperCase()}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-900">
                    {source.name || source.url}
                  </p>
                  {source.category && (
                    <span className="max-w-[7rem] flex-shrink-0 truncate rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
                      {source.category}
                    </span>
                  )}
                  {source.tone_tag && (
                    <span
                      className="flex-shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                      style={{ backgroundColor: accent + '14', color: accent }}
                    >
                      {source.tone_tag}
                    </span>
                  )}
                </div>
                <p className="truncate text-xs italic text-gray-500">
                  {source.because_quote ? `“${source.because_quote}”` : source.url}
                </p>
              </div>

              <div className="flex flex-shrink-0 items-center gap-1">
                <button
                  onClick={() => handleAction(source.id, 'followed')}
                  disabled={isActing}
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: accent }}
                >
                  Follow
                </button>
                <button
                  onClick={() => handleAction(source.id, 'naylisted')}
                  disabled={isActing}
                  title="Not interested"
                  className="rounded-lg p-1.5 text-gray-300 transition-colors hover:bg-gray-100 hover:text-gray-500 disabled:opacity-50"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {overflow > 0 && (
        <button
          onClick={() => setExpanded((e) => !e)}
          className="mt-3 text-sm font-medium transition-opacity hover:opacity-80"
          style={{ color: accent }}
        >
          {expanded ? 'Show less' : `Show all ${visible.length}`}
        </button>
      )}
    </div>
  );
}
