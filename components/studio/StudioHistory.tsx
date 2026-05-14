'use client';

import useSWR from 'swr';
import { ClockIcon } from '@heroicons/react/24/outline';

interface StudioConversation {
  id: string;
  preview?: string;
  created_at: string;
  last_message_at?: string;
  contentFormat?: string;
}

interface StudioHistoryProps {
  onSelect: (conversationId: string) => void;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function StudioHistory({ onSelect }: StudioHistoryProps) {
  const { data: conversations } = useSWR<StudioConversation[]>(
    '/api/studio/conversations',
    fetcher,
  );

  if (!conversations || !Array.isArray(conversations) || conversations.length === 0) return null;

  return (
    <div className="mt-8">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-gray-500">
        <ClockIcon className="h-4 w-4" />
        Recent conversations
      </h3>
      <div className="space-y-2">
        {conversations.slice(0, 5).map((conv) => (
          <button
            key={conv.id}
            onClick={() => onSelect(conv.id)}
            className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-left transition-all hover:border-gray-300 hover:shadow-sm"
          >
            <div className="flex items-center justify-between">
              <p className="truncate text-sm text-gray-700">
                {conv.preview || 'Untitled conversation'}
              </p>
              <span className="shrink-0 text-xs text-gray-400">
                {relativeTime(conv.last_message_at || conv.created_at)}
              </span>
            </div>
            {conv.contentFormat && (
              <p className="mt-0.5 text-xs text-gray-400">{conv.contentFormat}</p>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
