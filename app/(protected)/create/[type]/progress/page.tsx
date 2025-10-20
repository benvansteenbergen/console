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
                router.replace(`/create/${params.type}?execution=${execution}`);
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