'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/components/SessionProvider';
import { useBranding } from '@/components/BrandingProvider';
import LiveChat from '@/components/LiveChat';
import PageLoader from '@/components/ui/PageLoader';

export default function LivePage() {
  const router = useRouter();
  const { loading } = useSession();
  const branding = useBranding();
  const [isV2, setIsV2] = useState<boolean | null>(null);

  useEffect(() => {
    const v = localStorage.getItem('wingsuite_version');
    if (v === 'v2') {
      router.replace('/studio');
    } else {
      setIsV2(false);
    }
  }, [router]);

  useEffect(() => {
    if (isV2 === false) {
      document.title = `${branding.name} - Live Content`;
    }
  }, [isV2, branding.name]);

  if (isV2 === null || loading) {
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
