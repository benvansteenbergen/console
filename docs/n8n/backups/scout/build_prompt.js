const body = $('Webhook').item.json.body || {};
const mode = body.mode || 'A';
const message = body.message || '';
const history = body.history || '';
let sessionId = body.session_id;
if (sessionId === undefined || sessionId === null || sessionId === '') {
  sessionId = 'scout-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10);
}
const userId = $('Fetch User').item.json.user_id;
const clientId = $('Fetch User').item.json.client_id;

// --- Company profile the user already gave during the brand interview ---
const pc = body.profile_context || {};
const summary = pc.profile_summary || pc;
function arr(v) { return Array.isArray(v) ? v.filter(Boolean) : (v ? [v] : []); }
const pName = summary.name || '';
const pIndustry = summary.industry || '';
const pTagline = summary.tagline || '';
const pAudience = summary.audience || '';
const pTone = arr(summary.tone_keywords);
const pTypes = arr(summary.content_types);
const recsSrc = pc.recommendations || (pc.website_scan && pc.website_scan.recommendations) || [];
const recs = arr(recsSrc);
const hasProfile = (pName || pIndustry || pAudience) ? true : false;

let profileBlock = 'No company profile on file yet — ask a little more before curating.';
if (hasProfile) {
  const lines = [];
  if (pName) lines.push('Company: ' + pName);
  if (pIndustry) lines.push('Industry: ' + pIndustry);
  if (pTagline) lines.push('Tagline: ' + pTagline);
  if (pAudience) lines.push('Audience: ' + pAudience);
  if (pTone.length) lines.push('Tone: ' + pTone.join(', '));
  if (pTypes.length) lines.push('Content they make: ' + pTypes.join(', '));
  if (recs.length) {
    const r = recs.slice(0, 5).map(function (x) {
      return '- ' + (x.topic || x.format || '') + (x.reason ? ' (' + x.reason + ')' : '');
    }).join('\n');
    lines.push('Ideas already surfaced from their website scan:\n' + r);
  }
  profileBlock = lines.join('\n');
}

// --- Existing radar state ---
let priorities = $('Read Priorities').first().json.markdown || '';
if (priorities === '' && hasProfile) {
  priorities = [
    '## What they do',
    (pName ? pName + ' — ' : '') + (pTagline || pIndustry || ''),
    '',
    '## Who it is for',
    pAudience || '',
    '',
    '## Voice',
    pTone.length ? pTone.join(', ') : '',
    '',
    '## Content they make',
    pTypes.length ? pTypes.join(', ') : ''
  ].join('\n');
}

const allSources = $('Read Sources').all().map(function (i) { return i.json; });
const followed = allSources.filter(function (s) { return s.status === 'followed'; });
const naylisted = allSources.filter(function (s) { return s.status === 'naylisted'; });
const followedStr = followed.length > 0
  ? followed.map(function (s) { return '- ' + s.name + ' (' + s.url + ') [' + (s.category || 'uncategorized') + ']'; }).join('\n')
  : 'None';
const naylistedStr = naylisted.length > 0
  ? naylisted.map(function (s) { return '- ' + s.name + ' (' + s.url + ')'; }).join('\n')
  : 'None';

// --- Turn budget + "just go" escape hatch ---
const priorUserTurns = (history.match(/\[user\]/g) || []).length;
const turnCount = priorUserTurns + 1;
const maxTurns = 2;
const justGo = /(\bjust go\b|\bgo ahead\b|\bfind them\b|\bfind sources\b|ga maar|ga door|begin maar|zoek maar|vind ze|vind bronnen|doe maar|laat maar|\bskip\b|sla over|start maar)/i.test(message);
const forceClose = (justGo || turnCount >= maxTurns) ? true : false;

let closeDirective;
if (forceClose) {
  closeDirective = 'THIS IS THE FINAL TURN. Do not ask another question. Output the exact close line, set done=true, and produce the priorities doc plus a generous set of source suggestions now.';
} else {
  closeDirective = 'You may ask ONE short refining question if it would materially improve the source picks. Otherwise close now. Budget: at most ' + maxTurns + ' user turns; this is turn ' + turnCount + '.';
}

return [{ json: {
  query: message ? message : '(the user opened Scout without typing yet — greet them using what you know and ask your one question)',
  sessionId: sessionId,
  userId: userId,
  clientId: clientId,
  mode: mode,
  profileBlock: profileBlock,
  priorities: priorities,
  followedSources: followedStr,
  naylistedSources: naylistedStr,
  followedCount: followed.length,
  naylistedCount: naylisted.length,
  history: history,
  turnCount: turnCount,
  forceClose: forceClose,
  closeDirective: closeDirective
}}];
