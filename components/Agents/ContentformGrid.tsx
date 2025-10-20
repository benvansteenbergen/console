"use client";

import useSWR from "swr";
import clsx from "clsx";

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

    /* tiny card wrapper */
    const Card = ({ children }: { children: React.ReactNode }) => (
        <div className="flex flex-col items-center gap-4 rounded-lg border bg-white p-6 shadow-sm">
            {children}
        </div>
    );

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
                        <div key={i} className="h-24 animate-pulse rounded-lg bg-gray-200" />
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-6 p-6 lg:grid-cols-4">
                    {data.map((f) => (
                        <Card key={f.id}>
                            <p className="text-center text-lg font-semibold">{f.name}</p>
                            <button
                                className="w-full rounded border px-3 py-1 text-xs hover:bg-gray-50"
                                onClick={() =>
                                    window.open(
                                        f.formUrl,
                                        "contentForm",
                                        "noopener,width=480,height=640",
                                    )
                                }
                            >
                                New
                            </button>
                        </Card>
                    ))}
                </div>
            )}
        </section>
    );
}