'use client';

import { useEffect } from 'react';
import { useBranding } from '@/components/BrandingProvider';
import ContentStudio from '@/components/ContentStudio';

export default function StudioPage() {
  const branding = useBranding();

  useEffect(() => {
    document.title = `${branding.name} - Content Studio`;
  }, [branding.name]);

  return <ContentStudio />;
}
