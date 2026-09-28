// knowledge-base-upload / Upload Info
// Runs after the Weaviate insert: which document and tenant to verify.
const items = $input.all();
const meta = (items[0] && items[0].json.metadata) || {};
const user = $('Fetch User').first().json;
const body = $('Webhook').first().json.body || {};
const tenant = body.visibility === 'private' ? 'user_' + user.user_id : 'client_' + user.client;
return [{ json: { document_id: String(meta.document_id || ''), tenant: tenant, inserted: items.length } }];
