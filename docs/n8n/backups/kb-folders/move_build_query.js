// knowledge-base-move / Build Query
// Validates input and finds the chunk ids of the user's OWN documents in both stores.
const user = $('Fetch User').first().json;
const body = $('Webhook').first().json.body || {};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ids = (Array.isArray(body.document_ids) ? body.document_ids : [])
  .map(String).filter(function (x) { return UUID.test(x); }).slice(0, 200);
const folderId = UUID.test(String(body.folder_id || '')) ? String(body.folder_id) : '';

const where = '{ operator: And, operands: [' +
  '{ path: ["document_id"], operator: ContainsAny, valueText: ' + JSON.stringify(ids) + ' }, ' +
  '{ path: ["uploaded_by"], operator: Equal, valueText: "' + user.user_id + '" }' +
  '] }';
const query = '{ Get { ' +
  'u: Documents(tenant: "user_' + user.user_id + '", limit: 10000, where: ' + where + ') { _additional { id } } ' +
  'c: Documents(tenant: "client_' + user.client + '", limit: 10000, where: ' + where + ') { _additional { id } } ' +
  '} }';

return [{ json: {
  body: JSON.stringify({ query: query }),
  folder_id: folderId,
  count: ids.length,
  tenant_u: 'user_' + user.user_id,
  tenant_c: 'client_' + user.client,
} }];
