'use client';

import { useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { ChevronDownIcon } from '@heroicons/react/20/solid';
import { cn } from '@/lib/utils';
import {
  FOLDERS_KEY,
  SHARED_SCOPE_ID,
  kbFetcher,
  type KbFolder,
  type KbScope,
} from '@/components/knowledge-base/types';

interface KnowledgePickerProps {
  scope: KbScope;
  onChange: (scope: KbScope) => void;
}

const SHARED_LABEL = 'Shared by colleagues';

export function scopeLabel(scope: KbScope): string {
  if (scope.mode === 'off') return 'Knowledge base off';
  if (scope.mode === 'all') return 'Knowledge base';
  if (scope.folderNames.length === 1) return `Knowledge base: ${scope.folderNames[0]}`;
  return `Knowledge base: ${scope.folderNames.length} folders`;
}

/** Studio chip: use the whole knowledge base, only some folders, or none. Opens upward. */
export default function KnowledgePicker({ scope, onChange }: KnowledgePickerProps) {
  const [open, setOpen] = useState(false);
  const { data } = useSWR<{ success: boolean; folders: KbFolder[] }>(FOLDERS_KEY, kbFetcher);
  const folders = data?.folders ?? [];

  const selectedIds = scope.mode === 'folders' ? scope.folderIds : [];
  const options = [...folders.map((f) => ({ id: f.id, name: f.name })), { id: SHARED_SCOPE_ID, name: SHARED_LABEL }];

  const toggleFolder = (id: string) => {
    const ids = selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id];
    if (ids.length === 0) {
      onChange({ mode: 'all' });
      return;
    }
    const names = options.filter((o) => ids.includes(o.id)).map((o) => o.name);
    onChange({ mode: 'folders', folderIds: ids, folderNames: names });
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex max-w-[260px] items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors',
          scope.mode === 'off'
            ? 'border border-dashed border-gray-300 text-gray-400 hover:border-gray-400 hover:text-gray-500'
            : 'bg-gray-900 text-white hover:bg-gray-700'
        )}
      >
        <span className="truncate">{scopeLabel(scope)}</span>
        <ChevronDownIcon className="h-3.5 w-3.5 flex-shrink-0" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full left-0 z-20 mb-2 w-64 rounded-xl border border-gray-200 bg-white py-1.5 shadow-lg">
            <button
              onClick={() => {
                onChange({ mode: 'all' });
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50"
            >
              <span className={cn('h-2 w-2 rounded-full', scope.mode === 'all' ? 'bg-gray-900' : 'bg-gray-200')} />
              All documents
            </button>

            <p className="mt-1 px-3 pb-1 pt-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">
              Only these folders
            </p>
            <div className="max-h-52 overflow-y-auto">
              {options.map((o) => (
                <label
                  key={o.id}
                  className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(o.id)}
                    onChange={() => toggleFolder(o.id)}
                    className="h-3.5 w-3.5 rounded border-gray-300"
                  />
                  <span className="truncate">{o.name}</span>
                </label>
              ))}
            </div>
            {folders.length === 0 && (
              <p className="px-3 py-1 text-xs text-gray-400">
                No folders yet.{' '}
                <Link href="/company-private-storage" className="underline hover:text-gray-600">
                  Organise your documents
                </Link>
              </p>
            )}

            <div className="mt-1 border-t border-gray-100 pt-1">
              <button
                onClick={() => {
                  onChange({ mode: 'off' });
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50"
              >
                <span className={cn('h-2 w-2 rounded-full', scope.mode === 'off' ? 'bg-gray-900' : 'bg-gray-200')} />
                Don&apos;t use the knowledge base
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
