'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useBranding } from '@/components/BrandingProvider';
import { CURRENT_VERSION } from '@/lib/releases';

const SEEN_KEY = 'release_notes_seen';

function readSeen(): string | null {
  try {
    return localStorage.getItem(SEEN_KEY);
  } catch {
    return null;
  }
}

/** Marks the current version as seen. Rendered on the release notes page. */
export function MarkReleaseNotesSeen() {
  useEffect(() => {
    try {
      localStorage.setItem(SEEN_KEY, CURRENT_VERSION);
    } catch {
      /* storage unavailable: the dot just keeps showing */
    }
  }, []);
  return null;
}

/** Small version number in the bottom-right corner; links to the release notes. */
export default function VersionBadge() {
  const branding = useBranding();
  const pathname = usePathname();
  const [unseen, setUnseen] = useState(false);

  // Re-check on navigation, so the dot disappears after visiting the release notes.
  useEffect(() => {
    setUnseen(readSeen() !== CURRENT_VERSION);
  }, [pathname]);

  return (
    <Link
      href="/release-notes"
      className="fixed bottom-3 right-4 z-40 inline-flex items-center gap-1.5 rounded-full bg-white/80 px-2 py-0.5 text-[11px] text-gray-400 backdrop-blur transition-colors hover:text-gray-600"
      title="What's new"
    >
      {unseen && (
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: branding.primaryColor }} />
      )}
      v{CURRENT_VERSION}
    </Link>
  );
}
