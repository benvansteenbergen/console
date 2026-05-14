'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import {
  MagnifyingGlassIcon,
  FolderIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import ContentPreview from '@/components/library/ContentPreview';

interface FolderStat {
  folder: string;
  unseen: number;
  items: ContentFile[];
}

interface ContentFile {
  id: string;
  name: string;
  mimeType?: string;
  webViewLink?: string;
  thumbnailLink?: string;
  createdTime?: string;
  modifiedTime?: string;
  content?: string;
}

const fetcher = (url: string) =>
  fetch(url, { credentials: 'include' }).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  });

function relativeDate(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return 'This week';
  if (diffDays < 30) return 'This month';
  if (diffDays < 60) return 'Last month';
  return date.toLocaleDateString();
}

export default function LibraryView() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<ContentFile | null>(null);

  const {
    data: folders,
    error,
    isLoading,
  } = useSWR<FolderStat[]>('/api/content-storage', fetcher, {
    refreshInterval: 30_000,
  });

  const allFiles = useMemo(() => {
    if (!folders) return [];
    return folders.flatMap((f) =>
      f.items.map((item) => ({
        ...item,
        folder: f.folder,
      })),
    );
  }, [folders]);

  const filteredFiles = useMemo(() => {
    let files = activeFolder
      ? allFiles.filter((f) => f.folder === activeFolder)
      : allFiles;

    if (search.trim()) {
      const q = search.toLowerCase();
      files = files.filter((f) => f.name.toLowerCase().includes(q));
    }

    // Sort by creation date descending
    files.sort((a, b) => {
      const ta = a.createdTime ? new Date(a.createdTime).getTime() : 0;
      const tb = b.createdTime ? new Date(b.createdTime).getTime() : 0;
      return tb - ta;
    });

    return files;
  }, [allFiles, activeFolder, search]);

  const isFolder = (f: ContentFile & { folder?: string }) =>
    f.mimeType === 'application/vnd.google-apps.folder';

  const filteredFolders = useMemo(
    () => filteredFiles.filter(isFolder),
    [filteredFiles],
  );
  const filteredDocs = useMemo(
    () => filteredFiles.filter((f) => !isFolder(f)),
    [filteredFiles],
  );

  return (
    <section className="mx-auto w-full max-w-5xl space-y-6 px-6 py-10">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Content Library</h1>
        <p className="mt-1 text-sm text-gray-500">All your generated content in one place</p>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search content..."
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-4 text-sm text-gray-700 placeholder:text-gray-400 focus:border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-300"
          />
        </div>

        {/* Folder filter */}
        <div className="flex gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveFolder(null)}
            className={`shrink-0 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
              !activeFolder
                ? 'border-gray-900 bg-gray-900 text-white'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            All
          </button>
          {folders?.map((f) => (
            <button
              key={f.folder}
              onClick={() => setActiveFolder(f.folder)}
              className={`shrink-0 rounded-lg border px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                activeFolder === f.folder
                  ? 'border-gray-900 bg-gray-900 text-white'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {f.folder}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : error ? (
        <p className="text-sm text-red-600">Could not load content.</p>
      ) : filteredFiles.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <FolderIcon className="mx-auto h-8 w-8 text-gray-300" />
          <p className="mt-3 text-sm text-gray-500">
            {search ? 'No content matches your search' : 'No content yet'}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Folders */}
          {filteredFolders.length > 0 && (
            <div>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                Folders
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {filteredFolders.map((file) => (
                  <button
                    key={file.id}
                    onClick={() => {
                      const parent = file.folder || 'content';
                      router.push(`/content/${encodeURIComponent(parent)}/${file.id}`);
                    }}
                    className="group flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-left transition-all hover:border-gray-300 hover:bg-white hover:shadow-sm"
                  >
                    <FolderIcon className="h-5 w-5 shrink-0 text-gray-400 group-hover:text-gray-600" />
                    <p className="line-clamp-1 text-sm font-medium text-gray-700 group-hover:text-gray-900">
                      {file.name}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Files */}
          {filteredDocs.length > 0 && (
            <div>
              {filteredFolders.length > 0 && (
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Files
                </h2>
              )}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredDocs.map((file) => (
                  <button
                    key={file.id}
                    onClick={() => setPreviewFile(file)}
                    className="group rounded-xl border border-gray-200 bg-white p-5 text-left transition-all hover:border-gray-300 hover:shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      <DocumentTextIcon className="mt-0.5 h-5 w-5 shrink-0 text-gray-300 group-hover:text-gray-400" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between">
                          <p className="line-clamp-2 text-sm font-medium text-gray-900 group-hover:text-gray-700">
                            {file.name}
                          </p>
                          {file.folder && (
                            <span className="ml-2 shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500">
                              {file.folder}
                            </span>
                          )}
                        </div>
                        {file.createdTime && (
                          <p className="mt-1 text-xs text-gray-400">
                            {relativeDate(file.createdTime)}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Preview slide-over */}
      {previewFile && (
        <ContentPreview
          file={previewFile}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </section>
  );
}
