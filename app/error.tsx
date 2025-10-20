'use client';

import { useEffect } from 'react';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error('Global error:', error);
    }, [error]);

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
            <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                        <svg
                            className="h-6 w-6 text-red-600"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                            />
                        </svg>
                    </div>
                    <h2 className="text-xl font-semibold text-slate-900">
                        Something went wrong
                    </h2>
                </div>
                <p className="mb-4 text-sm text-slate-600">
                    We encountered an unexpected error. Please try again.
                </p>
                {process.env.NODE_ENV === 'development' && (
                    <details className="mb-4 rounded bg-slate-100 p-3 text-xs">
                        <summary className="cursor-pointer font-medium text-slate-700">
                            Error details
                        </summary>
                        <pre className="mt-2 overflow-auto text-red-600">
                            {error.message}
                            {'\n\n'}
                            {error.stack}
                        </pre>
                    </details>
                )}
                <div className="flex gap-2">
                    <button
                        onClick={reset}
                        className="flex-1 rounded bg-sky-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-700"
                    >
                        Try again
                    </button>
                    <button
                        onClick={() => (window.location.href = '/dashboard')}
                        className="flex-1 rounded border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                    >
                        Go to dashboard
                    </button>
                </div>
            </div>
        </div>
    );
}
