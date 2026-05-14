'use client';

import { useState } from 'react';

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

export default function RadarSuggestionStrip({ sources }: RadarSuggestionStripProps) {
  const [acting, setActing] = useState<string | null>(null);

  if (sources.length === 0) return null;

  const handleAction = async (sourceId: string, action: string) => {
    setActing(sourceId);
    try {
      await fetch('/api/radar/sources/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ source_id: sourceId, action }),
      });
      // SWR revalidation happens via the parent page's refreshInterval
    } finally {
      setActing(null);
    }
  };

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-3">Suggested Sources</h2>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {sources.map((source) => {
          const isActing = acting === source.id;
          return (
            <div
              key={source.id}
              className="min-w-[260px] max-w-[320px] flex-shrink-0 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                  {(source.name || source.url).charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {source.name || source.url}
                  </p>
                  {source.category && (
                    <span className="text-xs text-gray-500">{source.category}</span>
                  )}
                </div>
              </div>

              {source.because_quote && (
                <p className="text-xs text-gray-600 mb-3 line-clamp-2">
                  {source.because_quote}
                </p>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => handleAction(source.id, 'followed')}
                  disabled={isActing}
                  className="flex-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-400 transition-all"
                >
                  Follow
                </button>
                <button
                  onClick={() => handleAction(source.id, 'naylisted')}
                  disabled={isActing}
                  className="flex-1 px-3 py-1.5 text-xs font-medium rounded-lg text-gray-600 hover:bg-gray-100 disabled:text-gray-400 transition-colors"
                >
                  Not interested
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
