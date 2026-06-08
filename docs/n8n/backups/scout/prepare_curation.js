const priorities = $json.priorities || '';
const rawSources = $json.sources || [];
const userId = $json.userId;
const clientId = $json.clientId;
const sessionId = $json.sessionId;
const message = $json.message;

// Dedupe only true duplicates (same URL). A site may legitimately appear several times with
// different URLs: a business vs consumer section, or two products each with their own blog.
const seen = {};
const sources = [];
for (const s of rawSources) {
  const key = ((s.url || s.name || '') + '').trim().toLowerCase()
    .replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/+$/, '');
  if (key === '' || seen[key] === true) continue;
  seen[key] = true;
  sources.push(s);
}

const escapedPriorities = priorities.replace(/'/g, "''");

const prioritiesQuery = priorities
  ? `UPDATE portal_user SET settings = jsonb_set(jsonb_set(COALESCE(settings, '{}'), '{radar}', COALESCE(settings->'radar', '{}')), '{radar,priorities_markdown}', to_jsonb('${escapedPriorities}'::text)) WHERE n8n_user_id = '${userId}'::uuid`
  : 'SELECT 1';

let sourcesQuery = 'SELECT 1 WHERE false';
if (sources.length > 0) {
  const values = sources.map(s => {
    const esc = v => (v || '').replace(/'/g, "''");
    return `('${userId}'::uuid, '${esc(clientId)}', '${esc(s.url)}', '${esc(s.name)}', '${esc(s.category)}', '${esc(s.tone_tag)}', '${esc(s.because_quote)}', 'proposed', 'unknown')`;
  }).join(', ');
  sourcesQuery = `INSERT INTO radar_sources (user_id, client_id, url, name, category, tone_tag, because_quote, status, viability) VALUES ${values}`;
}

const events = [];
if (priorities) events.push({ type: 'tool_call', name: 'updatePriorities', args: {} });
sources.forEach(s => events.push({ type: 'tool_call', name: 'proposeSource', args: { name: s.name, url: s.url } }));

return [{ json: { prioritiesQuery, sourcesQuery, message, sessionId, events } }];
