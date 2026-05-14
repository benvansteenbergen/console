'use client';

import useSWR from 'swr';
import ReactMarkdown from 'react-markdown';

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

interface ScoutHabitatPaneProps {
  isConversationActive: boolean;
}

const fetcher = (url: string) =>
  fetch(url, { credentials: 'include' }).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  });

export default function ScoutHabitatPane({ isConversationActive }: ScoutHabitatPaneProps) {
  // Poll faster during active conversation
  const pollInterval = isConversationActive ? 2_000 : 30_000;

  const { data: prioritiesData } = useSWR<{ success: boolean; markdown: string }>(
    '/api/radar/priorities',
    fetcher,
    { refreshInterval: pollInterval }
  );

  const { data: followedData } = useSWR<{ success: boolean; sources: RadarSource[] }>(
    '/api/radar/sources?status=followed',
    fetcher,
    { refreshInterval: pollInterval }
  );

  const { data: proposedData } = useSWR<{ success: boolean; sources: RadarSource[] }>(
    '/api/radar/sources?status=proposed',
    fetcher,
    { refreshInterval: pollInterval }
  );

  const priorities = prioritiesData?.markdown || '';
  const followed = followedData?.sources || [];
  const proposed = proposedData?.sources || [];

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4 bg-gradient-to-r from-gray-50 to-white">
        <h2 className="font-semibold text-gray-900">Your Radar</h2>
        <p className="text-xs text-gray-500">
          {isConversationActive ? 'Updating live...' : 'Priorities and sources'}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Priorities section */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Priorities</h3>
          {priorities ? (
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
              <div className="prose prose-sm max-w-none text-gray-700">
                <ReactMarkdown>{priorities}</ReactMarkdown>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400">
              No priorities set yet. Chat with Scout to define them.
            </p>
          )}
        </div>

        {/* Proposed sources — yellow pulse during conversation */}
        {proposed.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">
              Proposed
              <span className="ml-2 text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-700">
                {proposed.length}
              </span>
            </h3>
            <div className="space-y-1.5">
              {proposed.map((source) => (
                <div
                  key={source.id}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-all ${
                    isConversationActive
                      ? 'border-amber-300 bg-amber-50 animate-pulse'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
                  <span className="text-gray-900 truncate flex-1">
                    {source.name || source.url}
                  </span>
                  {source.category && (
                    <span className="text-xs text-gray-500 flex-shrink-0">{source.category}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Followed sources — green dots */}
        {followed.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">
              Following
              <span className="ml-2 text-xs px-2 py-0.5 rounded bg-green-100 text-green-700">
                {followed.length}
              </span>
            </h3>
            <div className="space-y-1.5">
              {followed.map((source) => (
                <div
                  key={source.id}
                  className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                >
                  <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                  <span className="text-gray-900 truncate flex-1">
                    {source.name || source.url}
                  </span>
                  {source.tone_tag && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 flex-shrink-0">
                      {source.tone_tag}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!priorities && followed.length === 0 && proposed.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <p className="text-sm text-gray-500">
              Start chatting with Scout to build your radar.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
