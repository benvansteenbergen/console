'use client';

import RecentExecutions from '@/components/RecentExecutions';

export default function Executions() {
    return (
        <main className="mx-auto w-full max-w-4xl space-y-8 px-6 py-10">
            <RecentExecutions limit={10} showTitle />
        </main>
    );
}