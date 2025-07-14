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

    const handleReview = () => alert("Review flow coming soon ✨");
    const dlUrl = (id: string, fmt: string) =>
        `https://docs.google.com/document/d/${id}/export?format=${fmt}`;

    return (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-4">
            {items.map((f) => (
                <div key={f.id} className="relative group">
                    <Image
                        src={f.thumbnailLink}
                        alt={f.name}
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
                            onClick={() => window.open(f.webViewLink, "_blank")}
                            className="w-28 rounded bg-white/90 py-1 text-xs font-medium text-sky-700 hover:bg-white"
                        >
                            Open
                        </button>
                        <div className="flex w-28 justify-center space-x-1">
                            {[
                                { fmt: "pdf", label: "PDF" },
                                { fmt: "docx", label: "DOCX" },
                                { fmt: "txt", label: "TXT" },
                            ].map(({ fmt, label }) => (
                                <a
                                    key={fmt}
                                    href={dlUrl(f.id, fmt)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="rounded bg-white/90 px-1 py-0.5 text-[10px] font-medium text-sky-700 hover:bg-white"
                                >
                                    {label}
                                </a>
                            ))}
                        </div>
                    </div>

                    {f.new ? (
                        <span className="absolute top-1 right-1 rounded-full bg-sky-600 px-2 py-0.5 text-[10px] font-semibold text-white">
              NEW
            </span>
                    ) : null}
                </div>
            ))}
        </div>
    );
}