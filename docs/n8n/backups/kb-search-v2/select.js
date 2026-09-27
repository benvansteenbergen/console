// kb-search-v2 / Select
// 1. merge the hybrid candidates of all tenants (relativeScoreFusion scores are 0..1 per tenant)
// 2. recency: up to +15% for fresh documents, fading over ~4 months
// 3. diversity: Maximal Marginal Relevance on the chunk vectors (lambda 0.7), max 3 chunks per document
// Weaviate 1.39 has MMR + Boost natively, but only over gRPC; n8n speaks GraphQL, so we do it here.
const cfg = $('Build Query').first().json;
const res = $input.first().json || {};
const get = (res.data && res.data.Get) || {};
const LAMBDA = 0.7;
const PER_DOC = 3;
const now = Date.now();

const pool = [];
Object.keys(get).forEach(function (alias) {
  const tenant = cfg.tenants[Number(alias.slice(1))] || '';
  (Array.isArray(get[alias]) ? get[alias] : []).forEach(function (o) {
    const extra = o._additional || {};
    const created = Number(extra.creationTimeUnix || 0);
    const ageDays = created > 0 ? Math.max((now - created) / 86400000, 0) : 3650;
    const score = Number(extra.score || 0);
    pool.push({
      id: extra.id,
      tenant: tenant,
      document_id: o.document_id,
      document_title: o.document_title || '',
      description: o.description || '',
      folder_id: o.folder_id || '',
      text: o.text || '',
      score: score,
      adjusted: score * (1 + 0.15 * Math.exp(-ageDays / 120)),
      vector: Array.isArray(extra.vector) ? extra.vector : null,
    });
  });
});

function cosine(a, b) {
  if (a === null || b === null) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

pool.sort(function (a, b) { return b.adjusted - a.adjusted; });
const top = pool.length ? pool[0].adjusted : 1;
const selected = [];
const perDoc = {};
while (selected.length < cfg.limit) {
  let best = -1, bestValue = -Infinity;
  for (let i = 0; i < pool.length; i++) {
    const c = pool[i];
    if (c === null || (perDoc[c.document_id] || 0) >= PER_DOC) continue;
    let maxSim = 0;
    for (const s of selected) maxSim = Math.max(maxSim, cosine(c.vector, s.vector));
    const value = LAMBDA * (c.adjusted / top) - (1 - LAMBDA) * maxSim;
    if (value > bestValue) { bestValue = value; best = i; }
  }
  if (best < 0) break;
  const pick = pool[best];
  pool[best] = null;
  perDoc[pick.document_id] = (perDoc[pick.document_id] || 0) + 1;
  selected.push(pick);
}

return selected.map(function (c, i) {
  return { json: {
    rank: i + 1,
    document_id: c.document_id,
    document_title: c.document_title,
    description: c.description,
    folder_id: c.folder_id,
    tenant: c.tenant,
    score: Math.round(c.adjusted * 1000) / 1000,
    text: c.text,
  } };
});
