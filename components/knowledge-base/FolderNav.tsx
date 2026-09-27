'use client';

import { useState, type ReactNode } from 'react';
import { EllipsisHorizontalIcon, FolderIcon, PlusIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';
import type { KbFolder, KbView } from './types';

interface FolderNavProps {
  folders: KbFolder[];
  counts: Record<string, number>;
  view: KbView;
  onView: (view: KbView) => void;
  onCreate: (name: string) => Promise<string | null>;
  onRename: (folderId: string, name: string) => Promise<string | null>;
  onDelete: (folderId: string) => Promise<void>;
}

const ERRORS: Record<string, string> = {
  name_exists: 'You already have a folder with that name.',
  name_required: 'Give the folder a name.',
};

function Row({
  active,
  label,
  count,
  onClick,
  icon = false,
  children,
}: {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
  icon?: boolean;
  children?: ReactNode;
}) {
  return (
    <div
      className={cn(
        'group flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm transition-colors',
        active ? 'bg-gray-100 font-medium text-gray-900' : 'text-gray-600 hover:bg-gray-50'
      )}
    >
      <button onClick={onClick} className="flex min-w-0 flex-1 items-center gap-2 text-left">
        {icon && <FolderIcon className="h-4 w-4 flex-shrink-0 text-gray-400" />}
        <span className="truncate">{label}</span>
      </button>
      <span className="text-xs text-gray-400">{count}</span>
      {children}
    </div>
  );
}

export default function FolderNav({ folders, counts, view, onView, onCreate, onRename, onDelete }: FolderNavProps) {
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitCreate = async () => {
    const name = draft.trim();
    if (!name) {
      setCreating(false);
      return;
    }
    const err = await onCreate(name);
    if (err) setError(ERRORS[err] || 'Could not create the folder.');
    else {
      setDraft('');
      setCreating(false);
      setError(null);
    }
  };

  const submitRename = async (folder: KbFolder) => {
    const name = draft.trim();
    setRenaming(null);
    if (!name || name === folder.name) return;
    const err = await onRename(folder.id, name);
    if (err) setError(ERRORS[err] || 'Could not rename the folder.');
  };

  return (
    <nav className="space-y-4">
      <div className="space-y-0.5">
        <Row active={view === 'all'} label="All documents" count={counts.all ?? 0} onClick={() => onView('all')} />
        <Row active={view === 'unfiled'} label="Unfiled" count={counts.unfiled ?? 0} onClick={() => onView('unfiled')} />
      </div>

      <div>
        <h3 className="mb-1.5 px-2.5 text-xs font-semibold uppercase tracking-wide text-gray-400">Your folders</h3>
        <div className="space-y-0.5">
          {folders.map((folder) =>
            renaming === folder.id ? (
              <input
                key={folder.id}
                autoFocus
                value={draft}
                maxLength={60}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={() => submitRename(folder)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submitRename(folder);
                  if (e.key === 'Escape') setRenaming(null);
                }}
                className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-300"
              />
            ) : (
              <div key={folder.id}>
                <Row
                  active={view === folder.id}
                  label={folder.name}
                  count={counts[folder.id] ?? 0}
                  onClick={() => onView(folder.id)}
                  icon
                >
                  <div className="relative">
                    <button
                      onClick={() => setMenuFor((m) => (m === folder.id ? null : folder.id))}
                      className="rounded p-0.5 text-gray-400 opacity-0 transition-opacity hover:bg-gray-200 hover:text-gray-600 group-hover:opacity-100"
                      aria-label={`Options for ${folder.name}`}
                    >
                      <EllipsisHorizontalIcon className="h-4 w-4" />
                    </button>
                    {menuFor === folder.id && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setMenuFor(null)} />
                        <div className="absolute right-0 z-20 mt-1 w-36 rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
                          <button
                            onClick={() => {
                              setMenuFor(null);
                              setDraft(folder.name);
                              setRenaming(folder.id);
                            }}
                            className="block w-full px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50"
                          >
                            Rename
                          </button>
                          <button
                            onClick={() => {
                              setMenuFor(null);
                              setConfirmDelete(folder.id);
                            }}
                            className="block w-full px-3 py-1.5 text-left text-sm text-red-600 hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </Row>
                {confirmDelete === folder.id && (
                  <div className="mx-2.5 mb-1 mt-1 rounded-lg bg-red-50 p-2 text-xs text-red-700">
                    Delete &ldquo;{folder.name}&rdquo;? Its documents move to Unfiled.
                    <div className="mt-1.5 flex gap-2">
                      <button
                        onClick={async () => {
                          setConfirmDelete(null);
                          await onDelete(folder.id);
                        }}
                        className="font-semibold hover:underline"
                      >
                        Delete folder
                      </button>
                      <button onClick={() => setConfirmDelete(null)} className="text-red-500 hover:underline">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          )}

          {creating ? (
            <input
              autoFocus
              value={draft}
              maxLength={60}
              placeholder="Folder name"
              onChange={(e) => setDraft(e.target.value)}
              onBlur={submitCreate}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitCreate();
                if (e.key === 'Escape') {
                  setCreating(false);
                  setDraft('');
                }
              }}
              className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-300"
            />
          ) : (
            <button
              onClick={() => {
                setDraft('');
                setError(null);
                setCreating(true);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-700"
            >
              <PlusIcon className="h-4 w-4" />
              New folder
            </button>
          )}
          {error && <p className="px-2.5 text-xs text-red-600">{error}</p>}
        </div>
      </div>

      {(counts.shared ?? 0) > 0 && (
        <div>
          <h3 className="mb-1.5 px-2.5 text-xs font-semibold uppercase tracking-wide text-gray-400">Team</h3>
          <Row
            active={view === 'shared'}
            label="Shared by colleagues"
            count={counts.shared ?? 0}
            onClick={() => onView('shared')}
          />
        </div>
      )}
    </nav>
  );
}
