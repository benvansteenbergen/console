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

const DOWNLOAD_FORMATS = [
    { fmt: "pdf", label: "PDF" },
    { fmt: "docx", label: "DOCX" },
    { fmt: "txt", label: "TXT" },
];

const fetcher = async (url: string): Promise<DriveFile[]> => {
    const raw = await fetch(url).then(r => r.json());

    // When /api/content-storage returns [{ folder, unseen, items }]
    if (Array.isArray(raw) && raw.length && "items" in raw[0]) {
        return (raw[0]).items as DriveFile[];
    }

    // When it already returns DriveFile[]
    return raw as DriveFile[];
};
export default function FolderGrid({ folder, initialItems }: GridProps) {
    const { data = initialItems } = useSWR<DriveFile[]>(
        `/api/content-storage?folder=${encodeURIComponent(folder)}`,
        fetcher,
        { refreshInterval: 5000, fallbackData: initialItems },
    );

    const openDoc = (url: string) => window.open(url, "_blank");
    const downloadUrl = (id: string, fmt: string) =>
        `https://docs.google.com/document/d/${id}/export?format=${fmt}`;

    return (
        <div className="grid auto-rows-max grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-4">
            {data.map(({ id, name, thumbnailLink, webViewLink, new: isNew }) => (
                <div key={id} className="relative group">
                    <Image
                        src={thumbnailLink}
                        alt={name}
                        width={160}
                        height={200}
                        className="rounded-lg border border-slate-200 shadow-sm"
                        unoptimized
                    />

                    {/* hover actions */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-lg bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                            onClick={() => alert("Review flow coming soon ✨")}
                            className="w-28 rounded bg-sky-600 py-1 text-xs font-medium text-white hover:bg-sky-700"
                        >
                            Review
                        </button>
                        <button
                            onClick={() => openDoc(webViewLink)}
                            className="w-28 rounded bg-white/90 py-1 text-xs font-medium text-sky-700 hover:bg-white"
                        >
                            Open
                        </button>
                        <div className="flex w-28 justify-center gap-1">
                            {DOWNLOAD_FORMATS.map(({ fmt, label }) => (
                                <a
                                    key={fmt}
                                    href={downloadUrl(id, fmt)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="rounded bg-white/90 px-1 py-0.5 text-[10px] font-medium text-sky-700 hover:bg-white"
                                >
                                    {label}
                                </a>
                            ))}
                        </div>
                    </div>

                    {isNew ? (
                        <span className="absolute top-1 right-1 rounded-full bg-sky-600 px-2 py-0.5 text-[10px] font-semibold text-white">
              NEW
            </span>
                    ) : null}
                </div>
            ))}
        </div>
    );
}