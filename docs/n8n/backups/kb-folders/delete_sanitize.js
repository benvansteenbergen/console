// knowledge-base-delete / Sanitize Input
// Builds the batch-delete body: all chunks of the document, only if the caller uploaded it.
// Same request is sent to the private and the company store.
const user = $('Fetch User').first().json;
const docId = String($('Webhook').first().json.query.documentId || '');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const valid = UUID.test(docId);
const body = {
  match: {
    class: 'Documents',
    where: {
      operator: 'And',
      operands: [
        { path: ['document_id'], operator: 'Equal', valueText: valid ? docId : '00000000-0000-0000-0000-000000000000' },
        { path: ['uploaded_by'], operator: 'Equal', valueText: user.user_id },
      ],
    },
  },
  output: 'minimal',
  dryRun: false,
};
return [{ json: {
  body: JSON.stringify(body),
  tenant_u: 'user_' + user.user_id,
  tenant_c: 'client_' + user.client,
} }];
