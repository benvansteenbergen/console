'use client';

import { useEffect, useMemo, useState } from 'react';
import useSWR, { mutate as globalMutate } from 'swr';
import { ArrowUpTrayIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useBranding } from '@/components/BrandingProvider';
import DocumentList from '@/components/knowledge-base/DocumentList';
import FolderNav from '@/components/knowledge-base/FolderNav';
import UploadPanel from '@/components/knowledge-base/UploadPanel';
import {
  FOLDERS_KEY,
  LIBRARY_KEY,
  inView,
  kbFetcher,
  type KbLibrary,
  type KbView,
} from '@/components/knowledge-base/types';

type Sort = 'newest' | 'name';

export default function KnowledgeBasePage() {
  const branding = useBranding();
  const { data, error, isLoading, mutate } = useSWR<KbLibrary>(LIBRARY_KEY, kbFetcher);

  const [view, setView] = useState<KbView>('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<Sort>('newest');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [uploadOpen, setUploadOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    document.title = `${branding.name} - Knowledge base`;
  }, [branding.name]);

  const documents = data?.documents ?? [];
  const folders = data?.folders ?? [];

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: documents.length, unfiled: 0, shared: 0 };
    for (const f of folders) c[f.id] = 0;
    for (const d of documents) {
      if (d.mine === false) c.shared += 1;
      else if (d.folder_id && c[d.folder_id] !== undefined) c[d.folder_id] += 1;
      else c.unfiled += 1;
    }
    return c;
  }, [documents, folders]);

  // A deleted folder falls back to "All".
  const activeView: KbView =
    view === 'all' || view === 'unfiled' || view === 'shared' || folders.some((f) => f.id === view) ? view : 'all';

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return documents
      .filter((d) => inView(d, activeView))
      .filter((d) => !q || d.title.toLowerCase().includes(q) || d.description.toLowerCase().includes(q))
      .sort((a, b) => (sort === 'name' ? a.title.localeCompare(b.title) : b.created_at - a.created_at));
  }, [documents, activeView, search, sort]);

  const changeView = (next: KbView) => {
    setView(next);
    setSelected(new Set());
  };

  const refresh = () => {
    mutate();
    globalMutate(FOLDERS_KEY);
  };

  const folderAction = async (body: Record<string, string>): Promise<string | null> => {
    const res = await fetch('/api/knowledge-base/folders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
    });
    const result = await res.json().catch(() => null);
    refresh();
    return result?.success ? null : result?.error || 'error';
  };

  const moveDocuments = async (ids: string[], folderId: string) => {
    setBusy(true);
    try {
      const res = await fetch('/api/knowledge-base/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ document_ids: ids, folder_id: folderId }),
      });
      if (res.ok === false) throw new Error();
      const name = folderId ? folders.find((f) => f.id === folderId)?.name : 'Unfiled';
      setNotice(`Moved ${ids.length === 1 ? '1 document' : `${ids.length} documents`} to ${name}.`);
      setSelected(new Set());
    } catch {
      setNotice('Moving failed. Please try again.');
    } finally {
      setBusy(false);
      mutate();
    }
  };

  const deleteDocuments = async (ids: string[]) => {
    setBusy(true);
    let failed = 0;
    for (const id of ids) {
      const res = await fetch(`/api/knowledge-base/documents/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        credentials: 'include',
      }).catch(() => null);
      const result = res ? await res.json().catch(() => null) : null;
      if (!res || res.ok === false || result?.success === false) failed += 1;
    }
    setBusy(false);
    setSelected(new Set());
    setNotice(failed ? `${failed} could not be deleted.` : `Deleted ${ids.length === 1 ? '1 document' : `${ids.length} documents`}.`);
    mutate();
  };

  const viewLabel =
    activeView === 'all'
      ? 'All documents'
      : activeView === 'unfiled'
        ? 'Unfiled'
        : activeView === 'shared'
          ? 'Shared by colleagues'
          : folders.find((f) => f.id === activeView)?.name ?? '';

  return (
    <div className="h-full overflow-auto">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Knowledge base</h1>
            <p className="mt-1 text-sm text-gray-500">
              Documents Content Studio can use. Put them in folders to point Studio at the right ones.
            </p>
          </div>
          <button
            onClick={() => setUploadOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: branding.primaryColor }}
          >
            <ArrowUpTrayIcon className="h-4 w-4" />
            Add documents
          </button>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[220px_1fr]">
          {/* Folders: sidebar on desktop, select on mobile */}
          <aside className="hidden lg:block">
            <FolderNav
              folders={folders}
              counts={counts}
              view={activeView}
              onView={changeView}
              onCreate={(name) => folderAction({ action: 'create', name })}
              onRename={(folderId, name) => folderAction({ action: 'rename', folder_id: folderId, name })}
              onDelete={async (folderId) => {
                await folderAction({ action: 'delete', folder_id: folderId });
              }}
            />
          </aside>
          <select
            value={activeView}
            onChange={(e) => changeView(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 lg:hidden"
            aria-label="Folder"
          >
            <option value="all">All documents ({counts.all})</option>
            <option value="unfiled">Unfiled ({counts.unfiled})</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name} ({counts[f.id] ?? 0})
              </option>
            ))}
            {counts.shared > 0 && <option value="shared">Shared by colleagues ({counts.shared})</option>}
          </select>

          <section className="min-w-0">
            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 sm:mr-auto">{viewLabel}</h2>
              <div className="relative sm:w-64">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search documents…"
                  className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-700 placeholder:text-gray-400 focus:border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-300"
                />
              </div>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as Sort)}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
                aria-label="Sort"
              >
                <option value="newest">Newest first</option>
                <option value="name">Name A–Z</option>
              </select>
            </div>

            {notice && (
              <div className="mb-3 flex items-center justify-between rounded-lg bg-gray-50 px-4 py-2 text-sm text-gray-600">
                {notice}
                <button onClick={() => setNotice(null)} className="text-xs text-gray-400 hover:text-gray-600">
                  Dismiss
                </button>
              </div>
            )}

            <div className="rounded-xl border border-gray-200 bg-white">
              {isLoading ? (
                <div className="space-y-2 p-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-12 animate-pulse rounded-lg bg-gray-100" />
                  ))}
                </div>
              ) : error ? (
                <p className="p-6 text-sm text-gray-500">Your documents could not be loaded. Refresh the page to try again.</p>
              ) : documents.length === 0 ? (
                <div className="p-10 text-center">
                  <p className="text-sm font-medium text-gray-900">No documents yet</p>
                  <p className="mt-1 text-sm text-gray-500">
                    Add product sheets, case studies or anything Studio should know about your company.
                  </p>
                </div>
              ) : visible.length === 0 ? (
                <p className="p-6 text-sm text-gray-500">
                  {search ? `Nothing matches “${search}”.` : 'No documents here yet. Move documents in, or add new ones.'}
                </p>
              ) : (
                <DocumentList
                  documents={visible}
                  folders={folders}
                  showFolder={activeView === 'all'}
                  selected={selected}
                  onToggle={(id) =>
                    setSelected((s) => {
                      const next = new Set(s);
                      if (next.has(id)) next.delete(id);
                      else next.add(id);
                      return next;
                    })
                  }
                  onToggleAll={(ids) => setSelected(new Set(ids))}
                  onMove={moveDocuments}
                  onDelete={deleteDocuments}
                  busy={busy}
                />
              )}
            </div>
            {data?.truncated && (
              <p className="mt-2 text-xs text-amber-700">
                Very large knowledge base: the list may be incomplete. Studio still searches everything.
              </p>
            )}
          </section>
        </div>
      </div>

      {uploadOpen && (
        <UploadPanel
          folders={folders}
          defaultFolderId={folders.some((f) => f.id === activeView) ? activeView : ''}
          onClose={() => setUploadOpen(false)}
          onUploaded={() => mutate()}
        />
      )}
    </div>
  );
}
