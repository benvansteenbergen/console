'use client';

import { ReactNode, useEffect } from 'react';
import { useBranding } from '@/components/BrandingProvider';

export default function RadarLayout({ children }: { children: ReactNode }) {
  const branding = useBranding();

  useEffect(() => {
    document.title = `${branding.name} - Radar`;
  }, [branding.name]);

  return <>{children}</>;
}
