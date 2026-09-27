'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { mutate } from 'swr';
import ScoutChatPane from '../../components/ScoutChatPane';
import ScoutHabitatPane from '../../components/ScoutHabitatPane';
import { SCOUTS_KEY, useScoutProfile } from '../../shared';

export default function NewScoutPage() {
  const router = useRouter();
  const profile = useScoutProfile();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [createdScoutId, setCreatedScoutId] = useState<string | null>(null);

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex-1 lg:w-[65%]">
        <ScoutChatPane
          mode="A"
          scoutId={null}
          sessionId={sessionId}
          onSessionId={setSessionId}
          onConversationActive={() => {}}
          onComplete={(result) => {
            if (result.scout_id) setCreatedScoutId(result.scout_id);
            mutate(SCOUTS_KEY);
          }}
          onBack={() => router.push(createdScoutId ? `/radar/scouts/${createdScoutId}` : '/radar/scouts')}
          backLabel="Review suggested sources"
          profileContext={profile}
        />
      </div>
      <div className="hidden w-[35%] border-l border-gray-100 bg-gray-50/50 lg:block">
        <ScoutHabitatPane profile={profile} scoutId={createdScoutId} isComplete={createdScoutId !== null} />
      </div>
    </div>
  );
}
