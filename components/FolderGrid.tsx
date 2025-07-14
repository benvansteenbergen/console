// ============================================================================
// File: components/FolderGrid.tsx   (Client Component; now with SWR)
// ----------------------------------------------------------------------------
"use client";

import Image from "next/image";
import useSWR from "swr";

export interface DriveFile {
    id: string;
    name: string;
    webViewLink: string;
    thumbnailLink: string;
    new?: number;
}

interface GridProps {
    folder: string;
    initialItems: DriveFile[];
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function FolderGrid({ folder, initialItems }: GridProps) {
    const { data } = useSWR<DriveFile[]>(
        `/api/content-storage?folder=${encodeURIComponent(folder)}`,
        fetcher,
        {
            refreshInterval: 5000,
            fallbackData: initialItems,
        },
    );

    const items = data ?? [];

    // Placeholder until revise‑agent workflow is defined
    const handleReview = () => alert("Review flow coming soon ✨");

    const getDownloadUrl = (id: string, format: string) =>
        `https://docs.google.com/document/d/${id}/export?format=${format}`;

    return (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-4">
            {items.map((item) => (
                <div key={item.id} className="relative group">
                    <Image
                        src={item.thumbnailLink}
                        alt={item.name}
                        width={160}
                        height={200}
                        className="rounded-lg border border-slate-200 shadow-sm"
                        unoptimized
                    />

                    {/* hover overlay */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center space-y-2 rounded-lg bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                            onClick={handleReview}
                            className="w-28 rounded bg-sky-600 py-1 text-xs font-medium text-white hover:bg-sky-700"
                        >
                            Review
                        </button>
                        <button
                            onClick={() => window.open(item.webViewLink, "_blank")}
                            className="w-28 rounded bg-white/90 py-1 text-xs font-medium text-sky-700 hover:bg-white"
                        >
                            Open
                        </button>

                        {/* download format buttons */}
                        <div className="flex w-28 justify-center space-x-1">
                            {[
                                { fmt: "pdf", label: "PDF" },
                                { fmt: "docx", label: "DOCX" },
                                { fmt: "txt", label: "TXT" },
                            ].map(({ fmt, label }) => (
                                <a
                                    key={fmt}
                                    href={getDownloadUrl(item.id, fmt)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="rounded bg-white/90 px-1 py-0.5 text-[10px] font-medium text-sky-700 hover:bg-white"
                                >
                                    {label}
                                </a>
                            ))}
                        </div>
                    </div>

                    {item.new ? (
                        <span className="absolute top-1 right-1 rounded-full bg-sky-600 px-2 py-0.5 text-[10px] font-semibold text-white">
              NEW
            </span>
                    ) : null}
                </div>
            ))}
        </div>
    );
}