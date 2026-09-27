"""Step 3: scout-aware API workflows + two new ones.

Usage:
  python3 deploy_api.py --dry-run          # patch in memory, print summary
  python3 deploy_api.py existing           # PUT the patched existing workflows
  python3 deploy_api.py new                # create radar-scouts-list + radar-scout-manage

Every caller that omits scout_id keeps today's behaviour (oldest non-archived scout /
no filter), so the deployed console keeps working until the new console ships.
User input never reaches SQL raw: a "Sanitize" Code node right after Fetch User
whitelists actions/statuses and validates UUIDs.
"""
import copy
import json
import os
import sys
import uuid

from n8n_deploy import activate, create, load_backup, node, put, reregister, verify

HERE = os.path.dirname(os.path.abspath(__file__))
SCOUT_DIR = os.path.join(HERE, '..', 'scout')

UUID_JS = r"""const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function validId(v) { return UUID.test(String(v || '')) ? String(v) : ''; }
"""

# A "scout filter" clause for `radar_scouts sc`: explicit id, else the oldest non-archived scout.
SCOUT_FILTER_JS = UUID_JS + r"""function scoutFilter(raw, allowNew) {
  const id = validId(raw.scout_id);
  if (id) return "sc.id = '" + id + "'::uuid";
  if (allowNew && (raw.new_scout === true || raw.new_scout === 'true')) return 'false';
  return 'true';
}
"""

SANITIZE = {
    'radar-scout': SCOUT_FILTER_JS + r"""const body = $('Webhook').item.json.body || {};
return [{ json: { ...$input.first().json, scout_filter: scoutFilter(body, true) } }];""",
    'radar-priorities-get': SCOUT_FILTER_JS + r"""const q = $('Webhook').item.json.query || {};
return [{ json: { ...$input.first().json, scout_filter: scoutFilter(q, false) } }];""",
    'radar-sources-list': UUID_JS + r"""const q = $('Webhook').item.json.query || {};
const statuses = ['proposed', 'followed', 'naylisted', 'dropped'];
const status = statuses.includes(q.status) ? q.status : 'followed';
const scoutId = validId(q.scout_id);
const scoutClause = scoutId
  ? " AND scout_id = '" + scoutId + "'::uuid"
  : " AND (scout_id IS NULL OR scout_id IN (SELECT id FROM radar_scouts WHERE status <> 'archived'))";
return [{ json: { ...$input.first().json, status_safe: status, scout_clause: scoutClause } }];""",
    'radar-concepts-list': UUID_JS + r"""const q = $('Webhook').item.json.query || {};
const statuses = ['active', 'saved', 'dropped'];
const status = statuses.includes(q.status) ? q.status : 'active';
const scoutId = validId(q.scout_id);
return [{ json: {
  ...$input.first().json,
  status_safe: status,
  unseen_clause: q.unseen === 'true' ? ' AND c.banner_seen = false' : '',
  scout_clause: scoutId ? " AND c.scout_id = '" + scoutId + "'::uuid" : ''
} }];""",
    'radar-source-action': UUID_JS + r"""const body = $('Webhook').item.json.body || {};
const actions = ['followed', 'naylisted', 'dropped', 'copy'];
const NIL = '00000000-0000-0000-0000-000000000000';
return [{ json: {
  ...$input.first().json,
  action_safe: actions.includes(body.action) ? body.action : 'none',
  source_id_safe: validId(body.source_id) || NIL,
  target_id_safe: validId(body.target_scout_id) || NIL
} }];""",
}

# ---- radar-scout -----------------------------------------------------------
SCOUT_READ_PRIORITIES = """SELECT s.scout_id, s.scout_name, COALESCE(s.markdown, '') AS markdown,
  (SELECT string_agg(o.name, ', ' ORDER BY o.created_at) FROM radar_scouts o
    WHERE o.user_id = '{{ $json.user_id }}'::uuid AND o.status <> 'archived' AND o.id IS DISTINCT FROM s.scout_id) AS other_scouts
FROM (SELECT 1) AS one
LEFT JOIN LATERAL (
  SELECT sc.id AS scout_id, sc.name AS scout_name, sc.priorities_markdown AS markdown
  FROM radar_scouts sc
  WHERE sc.user_id = '{{ $json.user_id }}'::uuid AND sc.status <> 'archived' AND {{ $json.scout_filter }}
  ORDER BY sc.created_at LIMIT 1
) s ON true"""

SCOUT_READ_SOURCES = """SELECT id, url, name, category, tone_tag, because_quote, status FROM radar_sources
WHERE user_id = '{{ $('Fetch User').item.json.user_id }}'::uuid
  AND ((scout_id = '{{ $('Read Priorities').first().json.scout_id || '00000000-0000-0000-0000-000000000000' }}'::uuid AND status IN ('followed', 'proposed'))
       OR status = 'naylisted')
ORDER BY status, created_at DESC"""

FORMAT_NOT_DONE = """return [{ json: {
  session_id: $json.sessionId,
  scout_id: $('Build Prompt').first().json.scoutId || null,
  message: $json.message,
  done: false,
  events: []
}}];"""

FORMAT_DONE = """const prev = $('Prepare Curation').first().json;
return [{ json: {
  session_id: prev.sessionId,
  scout_id: prev.scoutId,
  is_new_scout: prev.isNewScout,
  topic_name: prev.topicName,
  message: prev.message,
  done: true,
  events: prev.events
}}];"""

# ---- lists / actions -------------------------------------------------------
SOURCES_QUERY = ("SELECT id, url, name, category, tone_tag, because_quote, status, notes, created_at, scout_id "
                 "FROM radar_sources WHERE user_id = '{{ $json.user_id }}'::uuid AND status = '{{ $json.status_safe }}'"
                 "{{ $json.scout_clause }} ORDER BY created_at DESC")

CONCEPTS_QUERY = """SELECT c.id, c.source_id, c.scout_id, sc.name AS scout_name, c.article_url, c.headline, c.concept_body, c.alignment_quote, c.alignment_priority, c.alignment_why, c.verdict, c.verdict_body, c.verdict_writing_note, c.status, c.banner_seen, c.created_at
FROM radar_concepts c LEFT JOIN radar_scouts sc ON sc.id = c.scout_id
WHERE c.user_id = '{{ $json.user_id }}'::uuid AND c.status = '{{ $json.status_safe }}'{{ $json.unseen_clause }}{{ $json.scout_clause }}
ORDER BY c.created_at DESC"""

SOURCE_ACTION_QUERY = """WITH a AS (
  SELECT '{{ $json.action_safe }}'::text AS action,
         '{{ $json.source_id_safe }}'::uuid AS source_id,
         '{{ $json.target_id_safe }}'::uuid AS target_id,
         '{{ $json.user_id }}'::uuid AS user_id
),
upd AS (
  UPDATE radar_sources s SET status = a.action, action_at = now(), updated_at = now()
  FROM a WHERE a.action IN ('followed', 'naylisted', 'dropped') AND s.id = a.source_id AND s.user_id = a.user_id
  RETURNING s.id
),
src AS (
  SELECT s.user_id, s.client_id, s.url, s.name, s.category, s.tone_tag, s.because_quote, t.id AS target_id
  FROM a
  JOIN radar_sources s ON s.id = a.source_id AND s.user_id = a.user_id
  JOIN radar_scouts t ON t.id = a.target_id AND t.user_id = a.user_id AND t.status <> 'archived'
  WHERE a.action = 'copy' AND t.id IS DISTINCT FROM s.scout_id
),
revived AS (
  UPDATE radar_sources x SET status = 'followed', action_at = now(), updated_at = now()
  FROM src WHERE x.scout_id = src.target_id AND lower(x.url) = lower(src.url) AND x.status <> 'followed'
  RETURNING x.id
),
ins AS (
  INSERT INTO radar_sources (user_id, client_id, scout_id, url, name, category, tone_tag, because_quote, status, viability)
  SELECT src.user_id, src.client_id, src.target_id, src.url, src.name, src.category, src.tone_tag, src.because_quote, 'followed', 'unknown'
  FROM src WHERE NOT EXISTS (SELECT 1 FROM radar_sources x WHERE x.scout_id = src.target_id AND lower(x.url) = lower(src.url))
  RETURNING id
)
SELECT (SELECT count(*) FROM upd)::int AS updated,
       ((SELECT count(*) FROM ins) + (SELECT count(*) FROM revived))::int AS copied,
       (SELECT count(*) FROM src)::int AS copy_matched"""

SOURCE_ACTION_RESPONSE = ("={{ JSON.stringify({ success: ($json.updated + $json.copy_matched) > 0, "
                          "updated: $json.updated, copied: $json.copied, "
                          "already_there: ($json.copy_matched > 0 && $json.copied === 0) }) }}")

PRIORITIES_GET_QUERY = """SELECT sc.id AS scout_id, COALESCE(sc.priorities_markdown, '') AS markdown FROM radar_scouts sc
WHERE sc.user_id = '{{ $json.user_id }}'::uuid AND sc.status <> 'archived' AND {{ $json.scout_filter }}
ORDER BY sc.created_at LIMIT 1"""

PRIORITIES_GET_FORMAT = """const row = $input.first().json;
return [{ json: { success: true, scout_id: row.scout_id || null, markdown: row.markdown || '' } }];"""

PRIORITIES_SET_ESCAPE = SCOUT_FILTER_JS + r"""const body = $('Webhook').item.json.body || {};
const markdown = body.markdown || '';
const escaped = markdown.replace(/'/g, "''");
return [{ json: { ...$input.first().json, escaped_markdown: escaped, scout_filter: scoutFilter(body, false) } }];"""

PRIORITIES_SET_QUERY = """UPDATE radar_scouts SET priorities_markdown = '{{ $json.escaped_markdown }}', updated_at = now()
WHERE id = (SELECT sc.id FROM radar_scouts sc WHERE sc.user_id = '{{ $json.user_id }}'::uuid AND sc.status <> 'archived' AND {{ $json.scout_filter }} ORDER BY sc.created_at LIMIT 1)"""

# ---- new workflows ----------------------------------------------------------
SCOUTS_LIST_QUERY = """SELECT sc.id, sc.name, sc.status, sc.created_at, sc.updated_at,
  (sc.priorities_markdown <> '') AS has_priorities,
  (SELECT count(*) FROM radar_sources s WHERE s.scout_id = sc.id AND s.status = 'followed')::int AS sources_followed,
  (SELECT count(*) FROM radar_sources s WHERE s.scout_id = sc.id AND s.status = 'proposed')::int AS sources_proposed,
  (SELECT count(*) FROM radar_sources s WHERE s.scout_id = sc.id AND s.status = 'followed'
     AND left(ltrim(COALESCE(s.notes, '')), 1) = '{' AND (s.notes::jsonb #>> '{health,status}') = 'failed')::int AS sources_failing,
  (SELECT count(*) FROM radar_concepts c WHERE c.scout_id = sc.id AND c.status IN ('active', 'saved')
     AND c.created_at > now() - interval '7 days')::int AS finds_week,
  (SELECT max(c.created_at) FROM radar_concepts c WHERE c.scout_id = sc.id AND c.status IN ('active', 'saved')) AS last_find_at
FROM radar_scouts sc
WHERE sc.user_id = '{{ $json.user_id }}'::uuid AND sc.status <> 'archived'
ORDER BY sc.created_at"""

SCOUTS_LIST_FORMAT = """const scouts = $input.all().map(function (i) { return i.json; }).filter(function (s) { return s.id; });
return [{ json: { success: true, scouts: scouts } }];"""

SCOUT_MANAGE_SANITIZE = UUID_JS + r"""const body = $('Webhook').item.json.body || {};
const actions = ['rename', 'pause', 'resume', 'archive'];
const name = String(body.name || '').replace(/\s+/g, ' ').trim().slice(0, 60).replace(/'/g, "''");
return [{ json: {
  ...$input.first().json,
  action_safe: actions.includes(body.action) ? body.action : 'none',
  scout_id_safe: validId(body.scout_id) || '00000000-0000-0000-0000-000000000000',
  name_safe: name
} }];"""

SCOUT_MANAGE_QUERY = """UPDATE radar_scouts SET
  name = CASE WHEN '{{ $json.action_safe }}' = 'rename' AND '{{ $json.name_safe }}' <> '' THEN '{{ $json.name_safe }}' ELSE name END,
  status = CASE '{{ $json.action_safe }}' WHEN 'pause' THEN 'paused' WHEN 'resume' THEN 'active' WHEN 'archive' THEN 'archived' ELSE status END,
  updated_at = now()
WHERE id = '{{ $json.scout_id_safe }}'::uuid AND user_id = '{{ $json.user_id }}'::uuid
  AND status <> 'archived' AND '{{ $json.action_safe }}' <> 'none'
RETURNING id, name, status"""

SCOUT_MANAGE_RESPONSE = ("={{ JSON.stringify({ success: Boolean($json.id), "
                         "scout: $json.id ? { id: $json.id, name: $json.name, status: $json.status } : null }) }}")


def sanitize_node(code, position):
    return {
        'parameters': {'jsCode': code},
        'id': str(uuid.uuid4()),
        'name': 'Sanitize Input',
        'type': 'n8n-nodes-base.code',
        'position': position,
        'typeVersion': 2,
    }


def insert_after_fetch_user(wf, code):
    """Fetch User (output 0) -> Sanitize Input -> whatever Fetch User fed before."""
    fu = node(wf, 'Fetch User')
    pos = [fu['position'][0] + 100, fu['position'][1] - 120]
    wf['nodes'].append(sanitize_node(code, pos))
    outs = wf['connections']['Fetch User']['main']
    downstream = outs[0]
    outs[0] = [{'node': 'Sanitize Input', 'type': 'main', 'index': 0}]
    wf['connections']['Sanitize Input'] = {'main': [downstream]}


def build_existing():
    out = {}

    # radar-scout
    wf = load_backup('radar-scout')
    insert_after_fetch_user(wf, SANITIZE['radar-scout'])
    node(wf, 'Read Priorities')['parameters']['query'] = SCOUT_READ_PRIORITIES
    node(wf, 'Read Sources')['parameters']['query'] = SCOUT_READ_SOURCES
    for fname, nname in [('build_prompt.js', 'Build Prompt'), ('parse_output.js', 'Parse Output'),
                         ('prepare_curation.js', 'Prepare Curation')]:
        node(wf, nname)['parameters']['jsCode'] = open(os.path.join(SCOUT_DIR, fname)).read()
    node(wf, 'Scout Agent')['parameters']['options']['systemMessage'] = \
        open(os.path.join(SCOUT_DIR, 'system_message.txt')).read().rstrip('\n')
    node(wf, 'Format Not Done')['parameters']['jsCode'] = FORMAT_NOT_DONE
    node(wf, 'Format Done')['parameters']['jsCode'] = FORMAT_DONE
    out['C4ClYsTCFsShycCm'] = (wf, {'Read Priorities': ['scout_filter'], 'Prepare Curation': ['radar_scouts'],
                                    'Sanitize Input': ['scoutFilter']})

    # radar-sources-list
    wf = load_backup('radar-sources-list')
    insert_after_fetch_user(wf, SANITIZE['radar-sources-list'])
    node(wf, 'Query Sources')['parameters']['query'] = SOURCES_QUERY
    out['0LLMN61MBi2aToI1'] = (wf, {'Query Sources': ['scout_clause']})

    # radar-concepts-list
    wf = load_backup('radar-concepts-list')
    insert_after_fetch_user(wf, SANITIZE['radar-concepts-list'])
    node(wf, 'Query Concepts')['parameters']['query'] = CONCEPTS_QUERY
    out['yenAuwcHBBIuxbBg'] = (wf, {'Query Concepts': ['scout_name']})

    # radar-source-action
    wf = load_backup('radar-source-action')
    insert_after_fetch_user(wf, SANITIZE['radar-source-action'])
    upd = node(wf, 'Update Source')
    upd['parameters']['query'] = SOURCE_ACTION_QUERY
    upd['alwaysOutputData'] = True
    resp = node(wf, 'Respond to Webhook (Success)')
    resp['parameters']['responseBody'] = SOURCE_ACTION_RESPONSE
    out['f1sm4nyTxMkiT85E'] = (wf, {'Update Source': ['action_safe', 'copied']})

    # radar-priorities-get
    wf = load_backup('radar-priorities-get')
    insert_after_fetch_user(wf, SANITIZE['radar-priorities-get'])
    rp = node(wf, 'Read Priorities')
    rp['parameters']['query'] = PRIORITIES_GET_QUERY
    rp['alwaysOutputData'] = True
    node(wf, 'Format Response')['parameters']['jsCode'] = PRIORITIES_GET_FORMAT
    out['JBmGUrGc9anyPLNQ'] = (wf, {'Read Priorities': ['radar_scouts']})

    # radar-priorities-set
    wf = load_backup('radar-priorities-set')
    node(wf, 'Escape Input')['parameters']['jsCode'] = PRIORITIES_SET_ESCAPE
    node(wf, 'Write Priorities')['parameters']['query'] = PRIORITIES_SET_QUERY
    out['TUOIEQbwAOJ3idNm'] = (wf, {'Write Priorities': ['radar_scouts']})

    return out


def new_workflow(template_name, name, path, method, sanitize_code, query, format_code, response_body):
    """Clone the Webhook / Fetch User / Respond (Error) nodes from an existing radar workflow."""
    tpl = load_backup(template_name)
    webhook = copy.deepcopy(node(tpl, 'Webhook'))
    webhook['parameters'] = {'httpMethod': method, 'path': path, 'responseMode': 'responseNode', 'options': {}}
    webhook['webhookId'] = str(uuid.uuid4())
    webhook['id'] = str(uuid.uuid4())
    fetch_user = copy.deepcopy(node(tpl, 'Fetch User'))
    fetch_user['id'] = str(uuid.uuid4())
    resp_err = copy.deepcopy(node(tpl, 'Respond to Webhook (Error)'))
    resp_err['id'] = str(uuid.uuid4())
    nodes = [webhook, fetch_user, resp_err]
    conns = {
        'Webhook': {'main': [[{'node': 'Fetch User', 'type': 'main', 'index': 0}]]},
        'Fetch User': {'main': [[{'node': 'Sanitize Input' if sanitize_code else 'Query', 'type': 'main', 'index': 0}],
                                [{'node': 'Respond to Webhook (Error)', 'type': 'main', 'index': 0}]]},
    }
    x = 0
    if sanitize_code:
        nodes.append(sanitize_node(sanitize_code, [x, 0]))
        conns['Sanitize Input'] = {'main': [[{'node': 'Query', 'type': 'main', 'index': 0}]]}
    x += 208
    nodes.append({
        'parameters': {'operation': 'executeQuery', 'query': query, 'options': {}},
        'id': str(uuid.uuid4()), 'name': 'Query', 'type': 'n8n-nodes-base.postgres',
        'position': [x, 0], 'typeVersion': 2.6, 'alwaysOutputData': True,
        'credentials': {'postgres': {'id': 'HY5nJozYRhfP29Se', 'name': 'Postgres account'}},
    })
    last = 'Query'
    if format_code:
        x += 208
        nodes.append({'parameters': {'jsCode': format_code}, 'id': str(uuid.uuid4()), 'name': 'Format Response',
                      'type': 'n8n-nodes-base.code', 'position': [x, 0], 'typeVersion': 2})
        conns['Query'] = {'main': [[{'node': 'Format Response', 'type': 'main', 'index': 0}]]}
        last = 'Format Response'
    x += 208
    resp = {'parameters': {'respondWith': 'json', 'responseBody': response_body, 'options': {}}
            if response_body else {'respondWith': 'allIncomingItems', 'options': {}},
            'id': str(uuid.uuid4()), 'name': 'Respond to Webhook (Success)',
            'type': 'n8n-nodes-base.respondToWebhook', 'position': [x, 0], 'typeVersion': 1.4}
    nodes.append(resp)
    conns[last] = {'main': [[{'node': 'Respond to Webhook (Success)', 'type': 'main', 'index': 0}]]}
    return {'name': name, 'description': '', 'nodes': nodes, 'connections': conns,
            'settings': {'executionOrder': 'v1'}}


def build_new():
    return [
        new_workflow('radar-sources-list', 'radar-scouts-list', 'radar-scouts-list', 'GET',
                     None, SCOUTS_LIST_QUERY, SCOUTS_LIST_FORMAT, None),
        new_workflow('radar-source-action', 'radar-scout-manage', 'radar-scout-manage', 'POST',
                     SCOUT_MANAGE_SANITIZE, SCOUT_MANAGE_QUERY, None, SCOUT_MANAGE_RESPONSE),
    ]


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else '--dry-run'
    existing = build_existing()
    new = build_new()
    for wid, (wf, _) in existing.items():
        raw = json.dumps(wf)
        assert '\\\\!' not in raw, wf['name']
        print(f'patched {wf["name"]} ({len(wf["nodes"])} nodes)')
    for wf in new:
        print(f'new {wf["name"]} ({len(wf["nodes"])} nodes)')
    if mode == 'existing':
        for wid, (wf, checks) in existing.items():
            put(wid, wf)
            reregister(wid)
            verify(wid, checks)
    elif mode == 'new':
        for wf in new:
            created = create(wf)
            activate(created['id'])
            print(f'created {wf["name"]} -> {created["id"]}')
    else:
        print('dry run, nothing deployed')


if __name__ == '__main__':
    main()
