'use client';

import { useEffect } from 'react';
import { useBranding } from '@/components/BrandingProvider';
import LibraryView from '@/components/LibraryView';

export default function LibraryPage() {
  const branding = useBranding();

  useEffect(() => {
    document.title = `${branding.name} - Content Library`;
  }, [branding.name]);

  return <LibraryView />;
}
