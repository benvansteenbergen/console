// Always end up with a priorities doc when we curate: prefer the agent's, otherwise fall back to
// the priorities Build Prompt pre-seeded from the company profile. Without it the sweep skips the
// scout entirely (Get Active Sources requires a non-empty priorities_markdown).
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

// A new scout gets its id here (no crypto module in Code nodes), so sources can reference it.
function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
const isNewScout = ($json.scoutId || '') === '';
const scoutId = isNewScout ? uuid() : $json.scoutId;
let topicName = String($json.topicName || '').replace(/\s+/g, ' ').trim().slice(0, 60);
if (topicName === '') topicName = 'New topic';

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

const esc = v => String(v || '').replace(/'/g, "''");

// Upsert the scout. The name is only set on insert, so a user's rename is never overwritten.
// An empty priorities doc never wipes an existing one.
const prioritiesQuery = `INSERT INTO radar_scouts (id, user_id, client_id, name, priorities_markdown) VALUES ('${scoutId}'::uuid, '${userId}'::uuid, '${esc(clientId)}', '${esc(topicName)}', '${esc(priorities)}') ON CONFLICT (id) DO UPDATE SET priorities_markdown = CASE WHEN EXCLUDED.priorities_markdown <> '' THEN EXCLUDED.priorities_markdown ELSE radar_scouts.priorities_markdown END, updated_at = now() WHERE radar_scouts.user_id = EXCLUDED.user_id`;

// Skip URLs this scout already has (any status), so re-running Scout never duplicates rows.
let sourcesQuery = 'SELECT 1 WHERE false';
if (sources.length > 0) {
  const values = sources.map(s => {
    return `('${userId}'::uuid, '${esc(clientId)}', '${scoutId}'::uuid, '${esc(s.url)}', '${esc(s.name)}', '${esc(s.category)}', '${esc(s.tone_tag)}', '${esc(s.because_quote)}')`;
  }).join(', ');
  sourcesQuery = `INSERT INTO radar_sources (user_id, client_id, scout_id, url, name, category, tone_tag, because_quote, status, viability) SELECT v.user_id, v.client_id, v.scout_id, v.url, v.name, v.category, v.tone_tag, v.because_quote, 'proposed', 'unknown' FROM (VALUES ${values}) AS v(user_id, client_id, scout_id, url, name, category, tone_tag, because_quote) WHERE NOT EXISTS (SELECT 1 FROM radar_sources x WHERE x.scout_id = v.scout_id AND lower(x.url) = lower(v.url))`;
}

const events = [];
if (priorities) events.push({ type: 'tool_call', name: 'updatePriorities', args: {} });
sources.forEach(s => events.push({ type: 'tool_call', name: 'proposeSource', args: { name: s.name, url: s.url } }));

return [{ json: { prioritiesQuery, sourcesQuery, message, sessionId, scoutId, isNewScout, topicName, events } }];
