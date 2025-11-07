"use client";

import useSWR from "swr";
import clsx from "clsx";
import Link from "next/link";

/* -------- types returned by /api/content-forms -------------------- */
export interface ContentForm {
    id: string;
    slug: string;
    name: string;
    formUrl: string;
}

/* -------- local fetcher ------------------------------------------ */
const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Props {
    className?: string;   // extra Tailwind classes (optional)
    showTitle?: boolean;  // default TRUE
}

export default function ContentFormGrid({ className, showTitle = true }: Props) {
    const { data, error } = useSWR<ContentForm[]>("/api/content-forms", fetcher);

    if (error)
        return (
            <p className={clsx("p-4 text-red-600", className)}>
                Failed to load content‑form list.
            </p>
        );

    return (
        <section className={clsx("space-y-4", className)}>
            {showTitle && (
                <h2 className="text-xl font-semibold">What do you want to create?</h2>
            )}

            {/* skeleton ----------------------------------------------------- */}
            {!data ? (
                <div className="grid grid-cols-2 gap-6 p-6 lg:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="h-32 animate-pulse rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200" />
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-6 p-6 lg:grid-cols-4">
                    {data.map((f) => (
                        <Link
                            key={f.id}
                            href={`/create/${f.slug}`}
                            className="group relative overflow-hidden rounded-2xl transition-all duration-300 hover:scale-105"
                        >
                            {/* Background glow effect */}
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 via-purple-400/20 to-pink-400/20 blur-xl transition-opacity duration-300 group-hover:opacity-100 opacity-70" />

                            {/* Glass card */}
                            <div className="relative flex flex-col items-center gap-3 rounded-2xl border border-white/20 bg-white/60 backdrop-blur-xl p-6 shadow-lg transition-all duration-300 group-hover:bg-white/70 group-hover:shadow-xl">
                                {/* Icon circle with gradient */}
                                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 p-0.5 shadow-lg">
                                    <div className="flex h-full w-full items-center justify-center rounded-full bg-white">
                                        <svg
                                            className="h-7 w-7 text-purple-600"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M12 4v16m8-8H4"
                                            />
                                        </svg>
                                    </div>
                                </div>

                                {/* Form name */}
                                <p className="text-center text-base font-semibold text-gray-800 transition-colors group-hover:text-purple-700">
                                    {f.name}
                                </p>

                                {/* Action text */}
                                <span className="text-xs font-medium text-gray-500 transition-colors group-hover:text-purple-600">
                                    Create new →
                                </span>

                                {/* Shine effect on hover */}
                                <div className="absolute inset-0 -translate-x-full transform bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </section>
    );
}