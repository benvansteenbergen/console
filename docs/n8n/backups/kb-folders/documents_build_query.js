// knowledge-base-documents / Build Query
// One GraphQL call for both stores: the user's private tenant and the company tenant.
// limit 10000 = Weaviate's default QUERY_MAXIMUM_RESULTS; Build List flags `truncated` if a store hits it.
const user = $('Fetch User').first().json;
const fields = 'document_id document_title description visibility folder_id file_type uploaded_by _additional { id creationTimeUnix }';
const query = '{ Get { ' +
  'u: Documents(tenant: "user_' + user.user_id + '", limit: 10000) { ' + fields + ' } ' +
  'c: Documents(tenant: "client_' + user.client + '", limit: 10000) { ' + fields + ' } ' +
  '} }';
return [{ json: { body: JSON.stringify({ query: query }) } }];
