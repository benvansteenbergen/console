"""Assemble radar-sweep PUT payload: code-node sources + source-health tracking.

Adds Mark Source Failed / Mark Source OK Postgres nodes that maintain a
health object in radar_sources.notes (JSON text):
  {"health": {"status": "ok|failed", "last_sweep": "...", "consecutive_failures": N, "reason": "..."}}

Rewires:
  Should Fetch[1] (skip)      -> Mark Source Failed -> Loop Sources
  Has Article[0] (fetch fail) -> Mark Source Failed -> Loop Sources
  Process Source Articles[0]  -> Mark Source OK     -> Loop Sources
"""
import json, glob, os

backup = sorted(glob.glob('docs/n8n/backups/radar-sweep-*.json'))[-1]
w = json.load(open(backup))
nodes = {n['name']: n for n in w['nodes']}

get_feed = open('docs/n8n/backups/sweep/get_feed_url.js').read()
parse_articles = open('docs/n8n/backups/sweep/parse_articles.js').read()

for name, txt in [('get_feed', get_feed), ('parse_articles', parse_articles)]:
    assert '\\!' not in txt, f'backslash-bang in {name}'

nodes['Get Feed URL']['parameters']['jsCode'] = get_feed
nodes['Parse Articles']['parameters']['jsCode'] = parse_articles
nodes['Fetch RSS']['parameters'].setdefault('options', {})['timeout'] = 30000

# Has Article now routes fetch failures (true output [0]) to Mark Source Failed
nodes['Has Article']['parameters']['conditions']['conditions'] = [{
    'id': 'has-article-check',
    'leftValue': '={{ $json.__fetch_failed }}',
    'rightValue': 'yes',
    'operator': {'type': 'string', 'operation': 'equals'},
}]

NOTES_JSONB = ("CASE WHEN notes IS NOT NULL AND left(ltrim(notes),1) = '{' "
               "THEN notes::jsonb ELSE '{}'::jsonb END")
STAMP = "to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD\"T\"HH24:MI:SS\"Z\"')"

FAILED_SQL = f"""UPDATE radar_sources SET notes = jsonb_set(
  {NOTES_JSONB},
  '{{health}}',
  jsonb_build_object(
    'status', 'failed',
    'last_sweep', {STAMP},
    'consecutive_failures', COALESCE(({NOTES_JSONB} #>> '{{health,consecutive_failures}}')::int, 0) + 1,
    'reason', '{{{{ $json.fail_reason }}}}'
  )
)::text, updated_at = NOW()
WHERE id = '{{{{ $json.source_id }}}}'::uuid"""

OK_SQL = f"""UPDATE radar_sources SET notes = jsonb_set(
  {NOTES_JSONB},
  '{{health}}',
  jsonb_build_object('status', 'ok', 'last_sweep', {STAMP}, 'consecutive_failures', 0)
)::text, updated_at = NOW()
WHERE id = '{{{{ $('Parse Articles').first().json.source_id }}}}'::uuid"""


def pg(name, query, node_id, pos):
    return {
        'parameters': {'operation': 'executeQuery', 'query': query, 'options': {}},
        'id': node_id, 'name': name, 'type': 'n8n-nodes-base.postgres',
        'typeVersion': 2.6, 'position': pos,
        'alwaysOutputData': True, 'executeOnce': True,
        'onError': 'continueRegularOutput',
        'credentials': {'postgres': {'id': 'HY5nJozYRhfP29Se', 'name': 'Postgres account'}},
    }


w['nodes'].append(pg('Mark Source Failed', FAILED_SQL, 'a1000001-0001-4000-8000-000000000001', [560, 620]))
w['nodes'].append(pg('Mark Source OK', OK_SQL, 'a1000001-0001-4000-8000-000000000002', [1400, 460]))

c = w['connections']
c['Should Fetch']['main'][1] = [{'node': 'Mark Source Failed', 'type': 'main', 'index': 0}]
c['Has Article']['main'][0] = [{'node': 'Mark Source Failed', 'type': 'main', 'index': 0}]
c['Process Source Articles']['main'][0] = [{'node': 'Mark Source OK', 'type': 'main', 'index': 0}]
c['Mark Source Failed'] = {'main': [[{'node': 'Loop Sources', 'type': 'main', 'index': 0}]]}
c['Mark Source OK'] = {'main': [[{'node': 'Loop Sources', 'type': 'main', 'index': 0}]]}

settings = {'executionOrder': (w.get('settings') or {}).get('executionOrder', 'v1')}
if (w.get('settings') or {}).get('timezone'):
    settings['timezone'] = w['settings']['timezone']

payload = {
    'name': w['name'],
    'description': w.get('description') or '',
    'nodes': w['nodes'],
    'connections': w['connections'],
    'settings': settings,
}

out = os.environ['TMPDIR'] + '/radar-sweep-health-put.json'
json.dump(payload, open(out, 'w'))
print('source backup:', backup)
print('wrote', out, os.path.getsize(out), 'bytes')
print('settings:', settings)
print('nodes:', [n['name'] for n in w['nodes']])
