"use client";

import Image from "next/image";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import { useState } from "react";

export interface DriveFile {
    id: string;
    name: string;
    webViewLink: string;
    thumbnailLink: string;
    new?: number;
    mimeType?: string;  // to detect folders
    isFolder?: boolean; // helper flag
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
    const { data = initialItems, mutate } = useSWR<DriveFile[]>(
        `/api/content-storage?folder=${encodeURIComponent(folder)}`,
        fetcher,
        { refreshInterval: 5000, fallbackData: initialItems },
    );

    const router = useRouter();
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);

    const openDoc = (url: string) => window.open(url, "_blank");
    const handleReview = (id: string) => router.push(`/editor/${id}?source=review`);
    const downloadUrl = (id: string, fmt: string) =>
        `https://docs.google.com/document/d/${id}/export?format=${fmt}`;

    // Navigate into subfolder using folder ID
    const handleFolderClick = (folderId: string, folderName: string) => {
        // Use folder ID to navigate instead of name-based slug
        const folderSlug = folderName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        const currentPath = folder.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        router.push(`/content/${currentPath}/${folderSlug}`);
    };

    const handleDelete = async (id: string) => {
        setDeleting(true);
        try {
            const res = await fetch(`/api/delete-document?fileId=${id}`, {
                method: 'POST',
            });

            if (res.ok) {
                // Remove from local data immediately
                mutate(data.filter(file => file.id !== id), false);
                setDeleteConfirm(null);
            } else {
                console.error('Delete failed:', await res.text());
                alert('Failed to delete document. Please try again.');
            }
        } catch (error) {
            console.error('Delete error:', error);
            alert('Failed to delete document. Please try again.');
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="grid auto-rows-max grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3 sm:grid-cols-[repeat(auto-fill,minmax(160px,1fr))] sm:gap-4">
            {data.map(({ id, name, thumbnailLink, webViewLink, new: isNew, mimeType, isFolder }) => {
                const itemIsFolder = isFolder || mimeType === 'application/vnd.google-apps.folder';

                return (
                <div key={id} className="group flex flex-col items-center">
                    <div className="relative w-full">
                    {itemIsFolder ? (
                        // Folder card
                        <div
                            onClick={() => handleFolderClick(id, name)}
                            className="flex h-[200px] w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-gradient-to-br from-blue-50 to-purple-50 shadow-sm transition-all hover:border-blue-400 hover:shadow-md"
                        >
                            <svg
                                className="h-16 w-16 text-blue-600"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={1.5}
                                    d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                                />
                            </svg>
                            <p className="mt-2 text-sm font-medium text-gray-700">{name}</p>
                        </div>
                    ) : (
                        // File card
                        <>
                        <Image
                            src={thumbnailLink}
                            alt={name}
                            width={160}
                            height={200}
                            className="w-full rounded-lg border border-slate-200 shadow-sm"
                            unoptimized
                        />

                        {/* hover actions - tap on mobile, hover on desktop */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 rounded-lg bg-black/60 opacity-0 transition-opacity group-hover:opacity-100 group-active:opacity-100 sm:gap-2">
                        <button
                            onClick={() => handleReview(id)}
                            className="w-24 rounded bg-sky-600 py-1 text-xs font-medium text-white hover:bg-sky-700 sm:w-28"
                        >
                            Review
                        </button>
                        <button
                            onClick={() => openDoc(webViewLink)}
                            className="w-24 rounded bg-white/90 py-1 text-xs font-medium text-sky-700 hover:bg-white sm:w-28"
                        >
                            Open
                        </button>
                        <div className="flex w-24 justify-center gap-1 sm:w-28">
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
                        <button
                            onClick={() => setDeleteConfirm(id)}
                            className="w-24 rounded bg-red-600 py-1 text-xs font-medium text-white hover:bg-red-700 sm:w-28"
                        >
                            Delete
                        </button>
                    </div>

                    {isNew && !itemIsFolder ? (
                        <span className="absolute top-1 right-1 rounded-full bg-sky-600 px-2 py-0.5 text-[10px] font-semibold text-white">
              NEW
            </span>
                    ) : null}
                    </>
                    )}
                </div>
                {/* file/folder title --------------------------------------------------- */}
                {!itemIsFolder && (
                    <p className="mt-1 w-full truncate text-center text-xs font-medium text-slate-700">
                        {name}
                    </p>
                )}
                </div>
                );
            })}

            {/* Delete confirmation modal */}
            {deleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
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
                                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                    />
                                </svg>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900">
                                Delete document?
                            </h3>
                        </div>
                        <p className="mb-6 text-sm text-gray-600">
                            Are you sure you want to delete this document? This action cannot be undone.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteConfirm(null)}
                                disabled={deleting}
                                className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleDelete(deleteConfirm)}
                                disabled={deleting}
                                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                            >
                                {deleting ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}