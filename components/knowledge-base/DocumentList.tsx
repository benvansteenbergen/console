'use client';

import { useState } from 'react';
import { EllipsisHorizontalIcon, LockClosedIcon, UsersIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';
import type { KbDocument, KbFolder } from './types';

interface DocumentListProps {
  documents: KbDocument[];
  folders: KbFolder[];
  showFolder: boolean;
  selected: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: (ids: string[]) => void;
  onMove: (ids: string[], folderId: string) => Promise<void>;
  onDelete: (ids: string[]) => Promise<void>;
  busy: boolean;
}

const TYPE_LABEL: Record<KbDocument['file_type'], string> = { pdf: 'PDF', docx: 'DOCX', doc: 'DOC' };

function formatDate(ms: number): string {
  if (!ms) return '';
  const d = new Date(ms);
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: days > 300 ? 'numeric' : undefined });
}

/** "Move to…" list: Unfiled + every folder except the one the documents are already in. */
function MoveMenu({
  folders,
  currentFolderId,
  onPick,
  onClose,
  align = 'right',
}: {
  folders: KbFolder[];
  currentFolderId?: string;
  onPick: (folderId: string) => void;
  onClose: () => void;
  align?: 'right' | 'left';
}) {
  const options = [{ id: '', name: 'Unfiled' }, ...folders].filter((f) => f.id !== currentFolderId);
  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onClose} />
      <div
        className={cn(
          'absolute z-20 mt-1 max-h-72 w-56 overflow-y-auto rounded-xl border border-gray-200 bg-white py-1 shadow-lg',
          align === 'right' ? 'right-0' : 'left-0'
        )}
      >
        <p className="px-3 pb-1 pt-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">Move to</p>
        {options.map((f) => (
          <button
            key={f.id || 'unfiled'}
            onClick={() => onPick(f.id)}
            className="block w-full truncate px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50"
          >
            {f.name}
          </button>
        ))}
        {folders.length === 0 && (
          <p className="px-3 py-1.5 text-xs text-gray-400">Create a folder on the left first.</p>
        )}
      </div>
    </>
  );
}

export default function DocumentList({
  documents,
  folders,
  showFolder,
  selected,
  onToggle,
  onToggleAll,
  onMove,
  onDelete,
  busy,
}: DocumentListProps) {
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [moveFor, setMoveFor] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string[] | null>(null);
  const [bulkMove, setBulkMove] = useState(false);

  const folderName = (id: string) => folders.find((f) => f.id === id)?.name;
  const selectable = documents.filter((d) => d.mine).map((d) => d.document_id);
  const selectedIds = selectable.filter((id) => selected.has(id));
  const allSelected = selectable.length > 0 && selectedIds.length === selectable.length;

  return (
    <div>
      {/* Bulk bar */}
      <div className="flex h-10 items-center gap-3 border-b border-gray-100 px-4 text-sm">
        <input
          type="checkbox"
          checked={allSelected}
          disabled={selectable.length === 0}
          onChange={() => onToggleAll(allSelected ? [] : selectable)}
          className="h-4 w-4 rounded border-gray-300"
          aria-label="Select all"
        />
        {selectedIds.length > 0 ? (
          <>
            <span className="font-medium text-gray-700">{selectedIds.length} selected</span>
            <div className="relative">
              <button
                onClick={() => setBulkMove((b) => !b)}
                disabled={busy}
                className="rounded-lg px-2.5 py-1 text-gray-700 hover:bg-gray-100 disabled:opacity-50"
              >
                Move to…
              </button>
              {bulkMove && (
                <MoveMenu
                  folders={folders}
                  align="left"
                  onClose={() => setBulkMove(false)}
                  onPick={async (fid) => {
                    setBulkMove(false);
                    await onMove(selectedIds, fid);
                  }}
                />
              )}
            </div>
            <button
              onClick={() => setConfirmDelete(selectedIds)}
              disabled={busy}
              className="rounded-lg px-2.5 py-1 text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              Delete
            </button>
            <button onClick={() => onToggleAll([])} className="ml-auto text-xs text-gray-400 hover:text-gray-600">
              Clear
            </button>
          </>
        ) : (
          <span className="text-xs text-gray-400">
            {documents.length} {documents.length === 1 ? 'document' : 'documents'}
          </span>
        )}
      </div>

      {confirmDelete && (
        <div className="flex flex-wrap items-center gap-3 border-b border-red-100 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          Delete {confirmDelete.length === 1 ? 'this document' : `${confirmDelete.length} documents`}? Studio can no
          longer use {confirmDelete.length === 1 ? 'it' : 'them'}.
          <button
            onClick={async () => {
              const ids = confirmDelete;
              setConfirmDelete(null);
              await onDelete(ids);
            }}
            className="font-semibold hover:underline"
          >
            Delete
          </button>
          <button onClick={() => setConfirmDelete(null)} className="text-red-500 hover:underline">
            Cancel
          </button>
        </div>
      )}

      <ul>
        {documents.map((doc) => {
          const folder = doc.folder_id ? folderName(doc.folder_id) : undefined;
          const meta = [
            showFolder && doc.mine ? folder || 'Unfiled' : null,
            doc.mine ? null : 'Shared by a colleague',
            formatDate(doc.created_at),
          ].filter(Boolean);
          return (
            <li
              key={doc.document_id}
              className={cn(
                'group flex items-start gap-3 border-b border-gray-100 px-4 py-3 last:border-b-0',
                selected.has(doc.document_id) ? 'bg-gray-50' : 'hover:bg-gray-50/60'
              )}
            >
              <input
                type="checkbox"
                checked={selected.has(doc.document_id)}
                disabled={doc.mine === false}
                onChange={() => onToggle(doc.document_id)}
                className="mt-1 h-4 w-4 rounded border-gray-300 disabled:invisible"
                aria-label={`Select ${doc.title}`}
              />
              <span className="mt-0.5 w-11 flex-shrink-0 rounded bg-gray-100 py-0.5 text-center text-[10px] font-semibold text-gray-500">
                {TYPE_LABEL[doc.file_type] ?? 'PDF'}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-sm font-semibold text-gray-900" title={doc.title}>
                    {doc.title}
                  </p>
                  {doc.visibility === 'shared' ? (
                    <UsersIcon className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" aria-label="Shared with your team" />
                  ) : (
                    <LockClosedIcon className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" aria-label="Only you" />
                  )}
                </div>
                {doc.description && <p className="mt-0.5 truncate text-xs text-gray-500">{doc.description}</p>}
                {meta.length > 0 && <p className="mt-0.5 text-xs text-gray-400">{meta.join(' · ')}</p>}
              </div>

              {doc.mine && (
                <div className="relative flex-shrink-0">
                  <button
                    onClick={() => setMenuFor((m) => (m === doc.document_id ? null : doc.document_id))}
                    className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    aria-label={`Options for ${doc.title}`}
                  >
                    <EllipsisHorizontalIcon className="h-5 w-5" />
                  </button>
                  {menuFor === doc.document_id && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setMenuFor(null)} />
                      <div className="absolute right-0 z-20 mt-1 w-40 rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
                        <button
                          onClick={() => {
                            setMenuFor(null);
                            setMoveFor(doc.document_id);
                          }}
                          className="block w-full px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50"
                        >
                          Move to…
                        </button>
                        <button
                          onClick={() => {
                            setMenuFor(null);
                            setConfirmDelete([doc.document_id]);
                          }}
                          className="block w-full px-3 py-1.5 text-left text-sm text-red-600 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                  {moveFor === doc.document_id && (
                    <MoveMenu
                      folders={folders}
                      currentFolderId={doc.folder_id}
                      onClose={() => setMoveFor(null)}
                      onPick={async (fid) => {
                        setMoveFor(null);
                        await onMove([doc.document_id], fid);
                      }}
                    />
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
