'use client';

import { useState } from 'react';
import useSWR from 'swr';
import ScoutChatPane from '../components/ScoutChatPane';
import ScoutHabitatPane from '../components/ScoutHabitatPane';

const fetcher = (url: string) =>
  fetch(url, { credentials: 'include' }).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  });

export default function RadarScoutPage() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isConversationActive, setIsConversationActive] = useState(false);

  // Check if priorities exist to determine mode (A vs B)
  const { data: prioritiesData } = useSWR<{ success: boolean; markdown: string }>(
    '/api/radar/priorities',
    fetcher
  );

  const hasPriorities = !!prioritiesData?.markdown;
  const mode = hasPriorities ? 'B' : 'A';

  return (
    <div className="flex h-full">
      {/* Left pane: Scout chat */}
      <div className="w-1/2 border-r border-gray-200">
        <ScoutChatPane
          mode={mode}
          sessionId={sessionId}
          onSessionId={setSessionId}
          onConversationActive={setIsConversationActive}
        />
      </div>

      {/* Right pane: live habitat */}
      <div className="w-1/2 overflow-auto">
        <ScoutHabitatPane
          isConversationActive={isConversationActive}
        />
      </div>
    </div>
  );
}
