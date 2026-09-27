'use client';

import { useRef, useState } from 'react';
import { ArrowUpTrayIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useBranding } from '@/components/BrandingProvider';
import { cn } from '@/lib/utils';
import type { KbFolder } from './types';

const ACCEPT = '.pdf,.docx,.doc';
const MAX_BYTES = 10 * 1024 * 1024;

type Status = 'reading' | 'ready' | 'uploading' | 'done' | 'error';

interface QueueItem {
  key: string;
  file: File;
  title: string;
  description: string;
  folderId: string;
  visibility: 'private' | 'shared';
  status: Status;
  error?: string;
}

interface UploadPanelProps {
  folders: KbFolder[];
  defaultFolderId: string;
  onClose: () => void;
  /** Called after each successful upload so the list refreshes right away. */
  onUploaded: () => void;
}

const STATUS_LABEL: Record<Status, string> = {
  reading: 'Reading…',
  ready: 'Ready',
  uploading: 'Adding…',
  done: 'Added',
  error: 'Failed',
};

function extensionOk(name: string) {
  return /\.(pdf|docx|doc)$/i.test(name);
}

export default function UploadPanel({ folders, defaultFolderId, onClose, onUploaded }: UploadPanelProps) {
  const branding = useBranding();
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<QueueItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const [running, setRunning] = useState(false);

  const update = (key: string, patch: Partial<QueueItem>) =>
    setItems((list) => list.map((i) => (i.key === key ? { ...i, ...patch } : i)));

  // Read the text and let the helper suggest a description. Failure here never blocks the upload.
  const prepare = async (item: QueueItem) => {
    try {
      const fd = new FormData();
      fd.append('file', item.file);
      const res = await fetch('/api/knowledge-base/extract-text', { method: 'POST', credentials: 'include', body: fd });
      const data = res.ok ? await res.json() : null;
      const text: string = data?.text || '';
      if (text) {
        const afd = new FormData();
        afd.append('excerpt', text.slice(0, 4000));
        const ares = await fetch('/api/knowledge-base/analyze', { method: 'POST', credentials: 'include', body: afd });
        const adata = ares.ok ? await ares.json() : null;
        if (adata?.description) {
          setItems((list) =>
            list.map((i) => (i.key === item.key && i.description === '' ? { ...i, description: adata.description } : i))
          );
        }
      }
    } catch {
      /* description stays empty; the user can still add the file */
    }
    update(item.key, { status: 'ready' });
  };

  const addFiles = (files: FileList | File[]) => {
    const next: QueueItem[] = Array.from(files).map((file) => {
      const base: QueueItem = {
        key: `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        title: file.name.replace(/\.[^.]+$/, ''),
        description: '',
        folderId: defaultFolderId,
        visibility: 'private',
        status: 'reading',
      };
      if (!extensionOk(file.name)) return { ...base, status: 'error', error: 'Only PDF and Word files' };
      if (file.size > MAX_BYTES) return { ...base, status: 'error', error: 'Larger than 10 MB' };
      return base;
    });
    setItems((list) => [...list, ...next]);
    next.filter((i) => i.status === 'reading').forEach(prepare);
  };

  const uploadAll = async () => {
    setRunning(true);
    for (const item of items) {
      if (item.status !== 'ready') continue;
      update(item.key, { status: 'uploading' });
      try {
        const fd = new FormData();
        fd.append('file', item.file);
        fd.append('title', item.title.trim() || item.file.name);
        fd.append('description', item.description);
        fd.append('visibility', item.visibility);
        fd.append('folder_id', item.folderId);
        const res = await fetch('/api/knowledge-base/upload', { method: 'POST', credentials: 'include', body: fd });
        const data = await res.json().catch(() => null);
        if (res.ok === false || data?.success === false) throw new Error(data?.error || 'Upload failed');
        update(item.key, { status: 'done' });
        onUploaded();
      } catch (e) {
        update(item.key, { status: 'error', error: e instanceof Error ? e.message : 'Upload failed' });
      }
    }
    setRunning(false);
  };

  const readyCount = items.filter((i) => i.status === 'ready').length;
  const reading = items.some((i) => i.status === 'reading');
  const allDone = items.length > 0 && items.every((i) => i.status === 'done' || i.status === 'error');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/30 p-4 backdrop-blur-[2px]" onClick={onClose}>
      <div
        className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-5">
          <h2 className="text-lg font-bold text-gray-900">Add documents</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600" aria-label="Close">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-6 pb-2 pt-4">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
            }}
            onClick={() => inputRef.current?.click()}
            className={cn(
              'flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors',
              dragging ? 'border-gray-400 bg-gray-50' : 'border-gray-200 hover:border-gray-300'
            )}
          >
            <ArrowUpTrayIcon className="h-6 w-6 text-gray-400" />
            <p className="mt-2 text-sm font-medium text-gray-700">Drop files here or click to choose</p>
            <p className="mt-0.5 text-xs text-gray-400">PDF or Word (.docx, .doc), up to 10 MB each</p>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept={ACCEPT}
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) addFiles(e.target.files);
                e.target.value = '';
              }}
            />
          </div>

          {items.length > 0 && (
            <ul className="mt-4 divide-y divide-gray-100 rounded-xl border border-gray-200">
              {items.map((item) => {
                const editable = item.status === 'ready' || item.status === 'reading';
                return (
                  <li key={item.key} className="space-y-2 p-4">
                    <div className="flex items-center gap-3">
                      <input
                        value={item.title}
                        disabled={editable === false}
                        onChange={(e) => update(item.key, { title: e.target.value })}
                        className="min-w-0 flex-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm font-medium text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-300 disabled:bg-gray-50"
                        aria-label="Title"
                      />
                      <span
                        className={cn(
                          'flex-shrink-0 text-xs',
                          item.status === 'done' && 'text-green-700',
                          item.status === 'error' && 'text-red-600',
                          (item.status === 'reading' || item.status === 'uploading') && 'text-gray-400',
                          item.status === 'ready' && 'text-gray-500'
                        )}
                        title={item.error}
                      >
                        {item.status === 'error' && item.error ? item.error : STATUS_LABEL[item.status]}
                      </span>
                      {editable && (
                        <button
                          onClick={() => setItems((list) => list.filter((i) => i.key !== item.key))}
                          className="flex-shrink-0 rounded p-0.5 text-gray-300 hover:text-gray-500"
                          aria-label="Remove from list"
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    {editable && (
                      <>
                        <textarea
                          value={item.description}
                          rows={2}
                          placeholder={item.status === 'reading' ? 'Writing a short description…' : 'What is this document about? (optional)'}
                          onChange={(e) => update(item.key, { description: e.target.value })}
                          className="w-full resize-none rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-600 focus:outline-none focus:ring-1 focus:ring-gray-300"
                        />
                        <div className="flex flex-wrap gap-2">
                          <select
                            value={item.folderId}
                            onChange={(e) => update(item.key, { folderId: e.target.value })}
                            className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700"
                            aria-label="Folder"
                          >
                            <option value="">Unfiled</option>
                            {folders.map((f) => (
                              <option key={f.id} value={f.id}>
                                {f.name}
                              </option>
                            ))}
                          </select>
                          <select
                            value={item.visibility}
                            onChange={(e) => update(item.key, { visibility: e.target.value as QueueItem['visibility'] })}
                            className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700"
                            aria-label="Who can use it"
                          >
                            <option value="private">Only me</option>
                            <option value="shared">My team</option>
                          </select>
                        </div>
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
          {allDone ? (
            <button
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
              style={{ backgroundColor: branding.primaryColor }}
            >
              Done
            </button>
          ) : (
            <>
              <button onClick={onClose} className="rounded-lg px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100">
                Cancel
              </button>
              <button
                onClick={uploadAll}
                disabled={readyCount === 0 || running || reading}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                style={{ backgroundColor: branding.primaryColor }}
              >
                {running ? 'Adding…' : readyCount > 1 ? `Add ${readyCount} documents` : 'Add document'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
