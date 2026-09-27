// knowledge-base-folders / Apply Action (POST)
// Folders live in portal_user.settings.kb.folders = [{id, name, created_at}], per user.
// Deleting a folder only removes it here: its documents' chunks keep the old folder_id, and
// knowledge-base-documents shows any unknown folder_id as Unfiled.
const user = $('Fetch User POST').first().json;
const body = $('Webhook POST').first().json.body || {};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

let folders = [];
try {
  const raw = $('Read Folders POST').first().json.folders;
  folders = Array.isArray(raw) ? raw : (typeof raw === 'string' ? JSON.parse(raw) : []);
} catch (e) {
  folders = [];
}

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

const action = String(body.action || '');
const name = String(body.name || '').replace(/\s+/g, ' ').trim().slice(0, 60);
const folderId = UUID.test(String(body.folder_id || '')) ? String(body.folder_id) : '';
const sameName = function (f) { return String(f.name).toLowerCase() === name.toLowerCase(); };

let error = '';
let folder = null;
if (action === 'create') {
  if (name === '') error = 'name_required';
  else if (folders.some(sameName)) error = 'name_exists';
  else {
    folder = { id: uuid(), name: name, created_at: new Date().toISOString() };
    folders = folders.concat([folder]);
  }
} else if (action === 'rename') {
  const target = folders.find(function (f) { return f.id === folderId; });
  if (target === undefined) error = 'not_found';
  else if (name === '') error = 'name_required';
  else if (folders.some(function (f) { return f.id !== folderId && sameName(f); })) error = 'name_exists';
  else {
    folders = folders.map(function (f) { return f.id === folderId ? Object.assign({}, f, { name: name }) : f; });
    folder = folders.find(function (f) { return f.id === folderId; });
  }
} else if (action === 'delete') {
  if (folders.some(function (f) { return f.id === folderId; }) === false) error = 'not_found';
  else folders = folders.filter(function (f) { return f.id !== folderId; });
} else {
  error = 'invalid_action';
}

return [{ json: {
  user_id: user.user_id,
  error: error,
  folder: folder,
  folders: folders,
  folders_sql: JSON.stringify(folders).replace(/'/g, "''"),
} }];
