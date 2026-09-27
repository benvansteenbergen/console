'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RadarSourcesRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/radar/scouts'); }, [router]);
  return null;
}
