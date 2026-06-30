// Always end up with a priorities doc when we curate: prefer the agent's, otherwise fall back to
// the priorities Build Prompt pre-seeded from the company profile. Without it the sweep skips the
// client entirely (Get Active Sources requires a non-empty priorities_markdown).
let priorities = ($json.priorities && String($json.priorities).trim()) ? $json.priorities : '';
if (priorities === '') {
  try {
    const seed = $('Build Prompt').first().json.priorities;
    if (seed && String(seed).trim()) priorities = seed;
  } catch (e) { /* no pre-seed available */ }
}
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

// Guard with jsonb_typeof: new users can have a non-object settings (JSON null), and jsonb_set
// cannot set a path inside a non-object -> it errors and the whole curation chain fails.
const prioritiesQuery = priorities
  ? `UPDATE portal_user SET settings = jsonb_set(jsonb_set(CASE WHEN jsonb_typeof(settings)='object' THEN settings ELSE '{}'::jsonb END, '{radar}', CASE WHEN jsonb_typeof(settings->'radar')='object' THEN settings->'radar' ELSE '{}'::jsonb END), '{radar,priorities_markdown}', to_jsonb('${escapedPriorities}'::text)) WHERE n8n_user_id = '${userId}'::uuid`
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
