"use client";

import { useState } from "react";
import { mutate } from "swr";

export default function CreateFolderButton({ parentFolderId }: { parentFolderId: string }) {
    const [showModal, setShowModal] = useState(false);
    const [folderName, setFolderName] = useState("");
    const [creating, setCreating] = useState(false);

    const handleCreate = async () => {
        if (!folderName.trim()) return;

        setCreating(true);
        try {
            const res = await fetch('/api/create-folder', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    parentFolderId,
                    folderName: folderName.trim(),
                }),
            });

            if (res.ok) {
                setShowModal(false);
                setFolderName("");
                // Trigger cache refresh in background for all content-storage queries
                mutate(
                    key => typeof key === 'string' && key.startsWith('/api/content-storage'),
                    undefined,
                    { revalidate: true }
                );
            } else {
                const error = await res.json();
                alert(`Failed to create folder: ${error.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Create folder error:', error);
            alert('Failed to create folder. Please try again.');
        } finally {
            setCreating(false);
        }
    };

    return (
        <>
            <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Folder
            </button>

            {/* Create folder modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
                        <div className="mb-4 flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                                <svg
                                    className="h-6 w-6 text-blue-600"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                                    />
                                </svg>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900">
                                Create New Folder
                            </h3>
                        </div>
                        <p className="mb-4 text-sm text-gray-600">
                            Enter a name for your new subfolder.
                        </p>
                        <input
                            type="text"
                            value={folderName}
                            onChange={(e) => setFolderName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                            placeholder="Folder name"
                            className="mb-6 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            autoFocus
                            disabled={creating}
                        />
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowModal(false);
                                    setFolderName("");
                                }}
                                disabled={creating}
                                className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreate}
                                disabled={creating || !folderName.trim()}
                                className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                            >
                                {creating ? 'Creating...' : 'Create'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
