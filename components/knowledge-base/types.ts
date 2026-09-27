export interface KbFolder {
  id: string;
  name: string;
  created_at?: string;
}

export interface KbDocument {
  document_id: string;
  title: string;
  description: string;
  visibility: 'private' | 'shared';
  store: 'private' | 'company';
  /** '' = Unfiled. Only set on the user's own documents (folders are per user). */
  folder_id: string;
  file_type: 'pdf' | 'docx' | 'doc';
  /** Uploaded by the current user; colleagues' shared documents are false. */
  mine: boolean;
  canDelete: boolean;
  chunks: number;
  /** Unix ms of the first chunk. */
  created_at: number;
}

export interface KbLibrary {
  success: boolean;
  documents: KbDocument[];
  folders: KbFolder[];
  truncated?: boolean;
}

/** Which slice of the knowledge base is shown: a folder id, or one of the fixed views. */
export type KbView = 'all' | 'unfiled' | 'shared' | string;

/** The Studio picker's choice, sent as `knowledgeBase` to /api/studio/message. */
export type KbScope =
  | { mode: 'all' }
  | { mode: 'off' }
  | { mode: 'folders'; folderIds: string[]; folderNames: string[] };

/** Pseudo folder id for "Shared by colleagues" in the Studio picker (matches n8n Build Prompt). */
export const SHARED_SCOPE_ID = '__shared__';

export const LIBRARY_KEY = '/api/knowledge-base/library';
export const FOLDERS_KEY = '/api/knowledge-base/folders';

export const kbFetcher = (url: string) =>
  fetch(url, { credentials: 'include' }).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  });

export function inView(doc: KbDocument, view: KbView): boolean {
  if (view === 'all') return true;
  if (view === 'shared') return doc.mine === false;
  if (view === 'unfiled') return doc.mine && doc.folder_id === '';
  return doc.mine && doc.folder_id === view;
}
