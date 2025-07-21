/* components/RecentExecutions.tsx
   -------------------------------------------------------------------- */
"use client";

import useSWR from "swr";
import clsx from "clsx";
import Link from "next/link";

export interface Exec {
    id: number;
    workflowName: string;
    status: "success" | "error" | "running";
    started: string;      // ISO
    durationMs: number;   // 0 if still running
    mode: string;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Props {
    limit?: number;          // default 10
    className?: string;      // optional extra Tailwind classes
    showTitle?: boolean;     // hide title if you embed in a card that already has one
}

export default function RecentExecutions({
                                             limit = 10,
                                             className,
                                             showTitle = true,
                                         }: Props) {
    const { data, error } = useSWR<Exec[]>(
        `/api/live-executions?limit=${limit}`,
        fetcher,
        { refreshInterval: 5_000 }           // poll every 5 s
    );

    if (error)
        return (
            <p className={clsx("text-red-600", className)}>
                Failed to load executions.
            </p>
        );

    return (
        <section className={clsx("space-y-4", className)}>
            {showTitle && <h2 className="text-xl font-semibold">Recent </h2>}

            {/* skeleton while loading ------------------------------------------------ */}
            {!data ? (
                <div className="space-y-2">
                    {Array.from({ length: limit }).map((_, i) => (
                        <div key={i} className="h-8 animate-pulse rounded bg-gray-200" />
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
                            <tr
                                key={ex.id}
                                className="border-t text-gray-700 hover:bg-gray-50"
                            >
                                <td className="px-4 py-2"><Link href={"/executions/"+ex.id}>{ex.workflowName}</Link></td>
                                <td className="px-4 py-2">
                                    {ex.status === "success" && (
                                        <span className="inline-flex items-center gap-1 text-green-600">
                        ● Success
                      </span>
                                    )}
                                    {ex.status === "error" && (
                                        <span className="inline-flex items-center gap-1 text-red-600">
                        ● Error
                      </span>
                                    )}
                                    {ex.status === "running" && (
                                        <span className="inline-flex items-center gap-1 text-yellow-600 animate-pulse">
                        ● Running
                      </span>
                                    )}
                                </td>
                                <td className="px-4 py-2">
                                    {new Date(ex.started).toLocaleString()}
                                </td>
                                <td className="px-4 py-2 text-right">
                                    {ex.status === "running"
                                        ? "—"
                                        : `${(ex.durationMs / 1000).toFixed(2)} s`}
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