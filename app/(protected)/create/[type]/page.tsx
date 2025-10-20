'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function CreateFormPage({ params }: { params: { type: string } }) {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const router = useRouter();

    useEffect(() => {
        const checkForExecution = () => {
            const iframe = iframeRef.current;
            if (!iframe) return;

            try {
                const href = iframe.contentWindow?.location.href;
                const url = new URL(href ?? '');
                const execution = url.searchParams.get('execution');

                if (execution) {
                    router.replace(`/editor/${fileId}`);
                }
            } catch {
                // Silent fail on cross-origin
            }
        };

        const iframe = iframeRef.current;
        iframe?.addEventListener('load', checkForExecution);
        return () => iframe?.removeEventListener('load', checkForExecution);
    }, [params.type, router]);

    const iframeUrl = `https://workflow.wingsuite.io/webhook/${params.type}`;

    return (
        <div className="h-screen w-full">
            <iframe
                ref={iframeRef}
                src={iframeUrl}
                className="w-full h-full border-0"
            />
        </div>
    );
}