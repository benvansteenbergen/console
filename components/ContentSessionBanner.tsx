'use client';

import useSWR from 'swr';
import Link from 'next/link';

interface ContentSession {
  conversationId: string;
  contentType: string;
  message: string;
  scheduledAt: string;
}

interface ContentSessionsResponse {
  success: boolean;
  sessions: ContentSession[];
}

const fetcher = (url: string) =>
  fetch(url, { credentials: 'include' }).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  });

export default function ContentSessionBanner() {
  const { data } = useSWR<ContentSessionsResponse>(
    '/api/content-sessions',
    fetcher,
    { refreshInterval: 60_000 }
  );

  const sessions = data?.sessions;

  if (!sessions || sessions.length === 0) return null;

  return (
    <div className="space-y-3">
      {sessions.map((session) => (
        <Link
          key={session.conversationId}
          href={`/live?conversation=${session.conversationId}`}
          className="group block rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 p-5 shadow-sm transition-all hover:shadow-md hover:border-amber-300"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-sm">
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
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900">
                  {session.contentType.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                </p>
                <p className="text-sm text-gray-600 truncate">{session.message}</p>
              </div>
            </div>
            <span className="flex-shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-amber-100 px-3 py-1.5 text-xs font-medium text-amber-800 transition-colors group-hover:bg-amber-200">
              Start conversation
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
      ))}
    </div>
  );
}
