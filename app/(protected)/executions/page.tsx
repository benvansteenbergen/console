'use client';
// ---------------------------------------------------------------------------
// ⚡️  Wingsuite – Recent Executions view (Tailwind + SWR)
// ---------------------------------------------------------------------------
// Displays the 10 most‑recent workflow executions for the current client.
// Swap the /api endpoint once your backend proxy is ready.
// ---------------------------------------------------------------------------

import useSWR from 'swr';

interface Exec {
    id: number;
    workflowName: string;
    status: 'success' | 'error' | 'running';
    started: string; // ISO string
    durationMs: number; // 0 if still running
    mode: string;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function Executions() {
    const { data, error } = useSWR<Exec[]>('/api/live-executions?limit=10', fetcher, {
        refreshInterval: 5000, // poll every 5 s
    });

    if (error) return <p className="p-6 text-red-600">Failed to load executions.</p>;

    return (
        <section className="mx-auto w-full max-w-4xl space-y-6 px-6 py-10">
            <h1 className="text-2xl font-bold">Recent Executions</h1>

            {/* Table skeleton */}
            {!data ? (
                <div className="space-y-2">
                    {Array.from({ length: 10 }).map((_, i) => (
                        <div key={i} className="h-10 animate-pulse rounded bg-gray-200" />
                    ))}
                </div>
            ) : (
                <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-left font-semibold text-gray-600">
                        <tr>
                            <th className="px-4 py-2">Workflow</th>
                            <th className="px-4 py-2">Status</th>
                            <th className="px-4 py-2">Started</th>
                            <th className="px-4 py-2 text-right">Run time</th>
                            <th className="px-4 py-2 text-right">Trigger</th>
                        </tr>
                        </thead>
                        <tbody>
                        {data.map((ex) => (
                            <tr key={ex.id} className="border-t text-gray-700 hover:bg-gray-50">
                                <td className="px-4 py-2">{ex.workflowName}</td>
                                <td className="px-4 py-2">
                                    {ex.status === 'success' && (
                                        <span className="inline-flex items-center gap-1 text-green-600">
                        ● Success
                      </span>
                                    )}
                                    {ex.status === 'error' && (
                                        <span className="inline-flex items-center gap-1 text-red-600">
                        ● Error
                      </span>
                                    )}
                                    {ex.status === 'running' && (
                                        <span className="inline-flex items-center gap-1 text-yellow-600 animate-pulse">
                        ● Running
                      </span>
                                    )}
                                </td>
                                <td className="px-4 py-2">{new Date(ex.started).toLocaleString()}</td>
                                <td className="px-4 py-2 text-right">
                                    {ex.status === 'running'
                                        ? '—'
                                        : `${(ex.durationMs / 1000).toFixed(2)}s`}
                                </td>
                                <td className="px-4 py-2 text-right">{ex.mode}</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}