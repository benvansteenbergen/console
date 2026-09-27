// kb-chat / Build Prompt
// Body: { message, history: [{ role, content }], scope: { mode: 'all' | 'folders' | 'document',
//         folderIds, folderNames, documentId, documentTitle } }
// The scope becomes a Weaviate filter on both KB search tools (same format as studio-message).
const body = $('Webhook').first().json.body || {};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const scope = body.scope && typeof body.scope === 'object' ? body.scope : {};
const clip = function (s, n) { return String(s || '').slice(0, n); };

let kbFilter = null;
let scopeNote = 'The user is asking about their whole knowledge base.';
if (scope.mode === 'document' && UUID.test(String(scope.documentId || ''))) {
  kbFilter = { path: ['document_id'], operator: 'Equal', valueString: String(scope.documentId) };
  scopeNote = 'The user is asking about ONE document: "' + clip(scope.documentTitle, 200) +
    '". The search tools only return passages from that document.';
} else if (scope.mode === 'folders') {
  const ids = (Array.isArray(scope.folderIds) ? scope.folderIds : []).map(String)
    .filter(function (x) { return UUID.test(x); }).slice(0, 50);
  if (ids.length > 0) {
    const parts = ids.map(function (id) { return { path: ['folder_id'], operator: 'Equal', valueString: id }; });
    kbFilter = parts.length === 1 ? parts[0] : { OR: parts };
    const names = (Array.isArray(scope.folderNames) ? scope.folderNames : []).map(function (n) { return clip(n, 60); });
    scopeNote = 'The user is asking about the folder(s): ' + (names.length ? names.join(', ') : 'a selection') +
      '. The search tools only return passages from those folders.';
  }
}

const history = (Array.isArray(body.history) ? body.history : []).slice(-10)
  .filter(function (m) { return m && (m.role === 'user' || m.role === 'assistant'); })
  .map(function (m) { return (m.role === 'user' ? 'User' : 'You') + ': ' + clip(m.content, 2000); })
  .join('\n\n');
const message = clip(body.message, 4000);

return [{ json: {
  kbFilter: kbFilter,
  scopeNote: scopeNote,
  query: (history ? '=== EARLIER IN THIS CHAT ===\n' + history + '\n=== END ===\n\n' : '') + 'Question: ' + message,
  message: message,
} }];
