// kb-search-v2 / Build Query
// Input (from the caller): { query, tenants: ["user_…", "client_…"], filter (n8n-style object or null), limit }
// Hybrid search per tenant: BM25 on text + title (x3) + description (x2), fused with the query vector.
// We fetch a generous candidate pool (with vectors) so Select can apply recency + diversity.
const input = $('When Called').first().json;
const vector = $input.first().json.embedding.values;
const tenants = (Array.isArray(input.tenants) ? input.tenants : []).filter(function (t) {
  return /^(user|client)_[A-Za-z0-9-]+$/.test(String(t));
});
const limit = Math.min(Math.max(Number(input.limit) || 10, 1), 25);
const POOL = 40;

// n8n-style filter ({path, operator, valueString} or {OR:[...]}/{AND:[...]}) -> GraphQL where
function toWhere(f) {
  if (f === null || f === undefined) return null;
  if (Array.isArray(f.OR) || Array.isArray(f.AND)) {
    const op = Array.isArray(f.OR) ? 'Or' : 'And';
    const parts = (f.OR || f.AND).map(toWhere).filter(Boolean);
    return parts.length ? '{ operator: ' + op + ', operands: [' + parts.join(', ') + '] }' : null;
  }
  if (Array.isArray(f.path) && typeof f.operator === 'string' && /^[A-Za-z]+$/.test(f.operator)) {
    const value = f.valueString !== undefined ? f.valueString : f.valueText;
    return '{ path: ' + JSON.stringify(f.path) + ', operator: ' + f.operator + ', valueText: ' + JSON.stringify(String(value)) + ' }';
  }
  return null;
}
let filter = input.filter;
if (typeof filter === 'string' && filter.trim() !== '') {
  try { filter = JSON.parse(filter); } catch (e) { filter = null; }
}
const where = toWhere(filter);

const fields = 'text document_id document_title description folder_id _additional { id score vector creationTimeUnix }';
const hybrid = 'hybrid: { query: ' + JSON.stringify(String(input.query || '')) + ', vector: ' + JSON.stringify(vector) +
  ', alpha: 0.5, fusionType: relativeScoreFusion, properties: ["text", "document_title^3", "description^2"] }';
const parts = tenants.map(function (t, i) {
  return 't' + i + ': Documents(tenant: ' + JSON.stringify(t) + ', limit: ' + POOL + ', ' + hybrid +
    (where ? ', where: ' + where : '') + ') { ' + fields + ' }';
});

return [{ json: {
  body: JSON.stringify({ query: '{ Get { ' + parts.join(' ') + ' } }' }),
  tenants: tenants,
  limit: limit,
} }];
