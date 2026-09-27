// knowledge-base-documents / Build List
// Groups chunks into documents. Folders are per user: only the user's own documents keep their
// folder_id; colleagues' shared documents are returned with mine=false ("Shared by colleagues").
const me = $('Fetch User').first().json.user_id;
const res = $input.first().json || {};
const get = (res.data && res.data.Get) || {};
const LIMIT = 10000;

let folders = [];
try {
  const raw = $('Read Folders').first().json.folders;
  folders = Array.isArray(raw) ? raw : (typeof raw === 'string' ? JSON.parse(raw) : []);
} catch (e) {
  folders = [];
}
const known = {};
folders.forEach(function (f) { known[f.id] = true; });

const docs = {};
let truncated = false;
[['u', 'private'], ['c', 'company']].forEach(function (pair) {
  const rows = Array.isArray(get[pair[0]]) ? get[pair[0]] : [];
  if (rows.length >= LIMIT) truncated = true;
  rows.forEach(function (o) {
    const id = o.document_id;
    if (id === null || id === undefined || id === '') return;
    const extra = o._additional || {};
    const created = Number(extra.creationTimeUnix || 0);
    let d = docs[id];
    if (d === undefined) {
      const mine = o.uploaded_by === me;
      d = docs[id] = {
        document_id: id,
        title: o.document_title || 'Untitled',
        description: o.description || '',
        visibility: o.visibility || (pair[1] === 'private' ? 'private' : 'shared'),
        store: pair[1],
        folder_id: mine && known[o.folder_id] === true ? o.folder_id : '',
        file_type: o.file_type || 'pdf',
        mine: mine,
        canDelete: mine,
        chunks: 0,
        created_at: created,
      };
    }
    d.chunks += 1;
    if (created > 0 && (d.created_at === 0 || created < d.created_at)) d.created_at = created;
  });
});

const documents = Object.keys(docs).map(function (k) { return docs[k]; })
  .sort(function (a, b) { return b.created_at - a.created_at; });

return [{ json: { success: true, documents: documents, folders: folders, truncated: truncated } }];
