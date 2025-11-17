'use client';

import { useEffect } from 'react';
import { useBranding } from '@/components/BrandingProvider';
import RecentExecutions from '@/components/RecentExecutions';

export default function Executions() {
    const branding = useBranding();

    useEffect(() => {
        document.title = `${branding.name} - Executions`;
    }, [branding.name]);

    return (
        <main className="mx-auto w-full max-w-4xl space-y-8 px-6 py-10">
            <RecentExecutions limit={10} showTitle />
        </main>
    );
}