'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function ProgressPage({ params }: { params: { type: string } }) {
    const searchParams = useSearchParams();
    const execution = searchParams.get('execution');
    const router = useRouter();

    useEffect(() => {
        if (!execution) return;

        const interval = setInterval(async () => {
            const res = await fetch(`/api/live-executions/${execution}`);
            const data = await res.json();

            if (data.status === 'success') {
                clearInterval(interval);

                // Extract fileId from trace (look for Google Docs URL)
                const fileIdStep = data.trace?.find((step: { label: string; summary: string }) =>
                    step.summary?.includes('docs.google.com/document/d/')
                );

                if (fileIdStep) {
                    // Extract ID from URL like: https://docs.google.com/document/d/abc123/edit
                    const match = fileIdStep.summary.match(/\/d\/([a-zA-Z0-9_-]+)/);
                    const fileId = match?.[1];

                    if (fileId) {
                        router.replace(`/editor/${fileId}`);
                        return;
                    }
                }

                // Fallback: if no fileId found, go to dashboard
                console.error('No fileId found in execution trace');
                router.replace('/dashboard');
            }

            if (data.status === 'error') {
                clearInterval(interval);
                // Could redirect to error page or show error message
                console.error('Workflow execution failed');
                router.replace('/dashboard');
            }
        }, 2000);

        return () => clearInterval(interval);
    }, [execution, params.type, router]);

    return (
        <div className="flex h-screen flex-col md:flex-row">
            <div className="flex flex-1 flex-col items-center justify-center p-6">
                <p className="text-lg font-semibold sm:text-xl">Generating your {params.type}…</p>
                <div className="mt-4 h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
                <p className="mt-2 text-sm text-gray-500">Hang tight, we&apos;re almost done</p>
            </div>

            <div
                className="hidden flex-1 bg-cover bg-center md:block"
                style={{
                    backgroundImage: `url('/images/inspiration/${params.type}.jpg')`,
                }}
            />
        </div>
    );
}