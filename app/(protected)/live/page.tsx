'use client';

import { useEffect } from 'react';
import { useSession } from '@/components/SessionProvider';
import { useBranding } from '@/components/BrandingProvider';
import LiveChat from '@/components/LiveChat';
import PageLoader from '@/components/ui/PageLoader';

export default function LivePage() {
  const { loading } = useSession();
  const branding = useBranding();

  useEffect(() => {
    document.title = `${branding.name} - Live Content`;
  }, [branding.name]);

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Live Content Generation</h1>
        <p className="text-gray-600">
          Create content on the fly using your knowledge base. Select clusters, ask questions, and iterate until perfect.
        </p>
      </div>

      <LiveChat />
    </div>
  );
}
