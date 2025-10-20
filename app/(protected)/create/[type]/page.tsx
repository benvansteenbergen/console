'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';

interface ContentForm {
    id: string;
    name: string;
    formUrl: string;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function CreateFormPage({ params }: { params: { type: string } }) {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const router = useRouter();
    const { data: forms } = useSWR<ContentForm[]>('/api/content-forms', fetcher);
    const [formUrl, setFormUrl] = useState<string | null>(null);

    // Find the form URL from the API based on form ID
    useEffect(() => {
        if (forms) {
            const form = forms.find((f) => f.id === params.type);
            if (form) {
                setFormUrl(form.formUrl);
            } else {
                console.error(`Form not found: ${params.type}`);
                router.replace('/dashboard');
            }
        }
    }, [forms, params.type, router]);

    useEffect(() => {
        if (!formUrl) return;

        const checkForExecution = () => {
            const iframe = iframeRef.current;
            if (!iframe) return;

            try {
                const href = iframe.contentWindow?.location.href;
                const url = new URL(href ?? '');
                const execution = url.searchParams.get('execution');

                if (execution) {
                    router.replace(`/create/${params.type}/progress?execution=${execution}`);
                }
            } catch {
                // Silent fail on cross-origin
            }
        };

        const iframe = iframeRef.current;
        iframe?.addEventListener('load', checkForExecution);
        return () => iframe?.removeEventListener('load', checkForExecution);
    }, [formUrl, params.type, router]);

    if (!formUrl) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="text-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto" />
                    <p className="mt-4 text-sm text-gray-500">Loading form...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen w-full">
            <iframe
                ref={iframeRef}
                src={formUrl}
                className="w-full h-full border-0"
            />
        </div>
    );
}