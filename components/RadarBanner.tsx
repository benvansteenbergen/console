'use client';

import useSWR from 'swr';
import Link from 'next/link';

interface ConceptsResponse {
  success: boolean;
  concepts: { id: string }[];
}

const fetcher = (url: string) =>
  fetch(url, { credentials: 'include' }).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  });

export default function RadarBanner() {
  const { data } = useSWR<ConceptsResponse>(
    '/api/radar/concepts?status=active&unseen=true',
    fetcher,
    { refreshInterval: 60_000 }
  );

  const count = data?.concepts?.length ?? 0;
  if (count === 0) return null;

  return (
    <Link
      href="/radar"
      className="group block rounded-2xl bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200 p-5 shadow-sm transition-all hover:shadow-md hover:border-blue-300"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 shadow-sm">
            <svg
              className="h-5 w-5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900">
              {count} new Radar concept{count === 1 ? '' : 's'}
            </p>
            <p className="text-sm text-gray-600">
              Fresh ideas from your sources — review them now
            </p>
          </div>
        </div>
        <span className="flex-shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-blue-100 px-3 py-1.5 text-xs font-medium text-blue-800 transition-colors group-hover:bg-blue-200">
          View feed
          <svg
            className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </span>
      </div>
    </Link>
  );
}
