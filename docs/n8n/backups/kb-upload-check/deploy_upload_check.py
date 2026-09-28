#!/usr/bin/env python3
"""Add the empty-vector check to knowledge-base-upload (qRCuSrjefn0aFmsB).

Weaviate insert -> Upload Info -> Check Vectors (GraphQL) -> Verify Vectors -> IF ok
  true  -> Respond to Webhook (success, unchanged)
  false -> Delete Chunks -> Respond Failed (502)

Usage: python3 deploy_upload_check.py [--dry-run]
"""
import json, os, sys, time, urllib.request, urllib.error

WF_ID = 'qRCuSrjefn0aFmsB'
HERE = os.path.dirname(os.path.abspath(__file__))
ENV = os.path.join(HERE, '../../../../.env')
WEAVIATE = 'https://lkphk2vdrfegucqmr3mdog.c0.europe-west3.gcp.weaviate.cloud'
CRED = {'httpBearerAuth': {'id': 'ZQNh2zCdoMHYMOyC', 'name': 'Bearer Auth account'}}
cfg = dict(l.strip().split('=', 1) for l in open(ENV) if '=' in l and not l.startswith('#'))
KEY = cfg['N8N_API_KEY'].strip('"\'')
BASE = 'https://workflow.wingsuite.io'


def api(method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    for _ in range(5):
        req = urllib.request.Request(BASE + path, data=data, method=method,
                                     headers={'X-N8N-API-KEY': KEY, 'Content-Type': 'application/json'})
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                raw = r.read().decode()
                return json.loads(raw) if raw else {}
        except urllib.error.HTTPError as e:
            msg = e.read().decode()
            if 'Application not found' in msg:
                time.sleep(2)
                continue
            raise SystemExit(f'{method} {path} -> {e.code}: {msg[:500]}')
    raise SystemExit(f'{method} {path} failed')


def js(name):
    return open(os.path.join(HERE, name)).read()


WHERE = '{path: [\\"document_id\\"], operator: Equal, valueText: \\"" + $json.document_id + "\\"}'
CHECK_QUERY = ('={{ JSON.stringify({query: "{ Get { Documents(tenant: \\"" + $json.tenant + "\\", where: '
               + WHERE + ', limit: 10000) { _additional { vector } } } }"}) }}')
DELETE_BODY = ('={{ JSON.stringify({match: {class: "Documents", where: {path: ["document_id"], '
               'operator: "Equal", valueText: $json.document_id}}}) }}')
FAIL_BODY = json.dumps({'success': False, 'error': 'This document could not be processed. Please try again in a minute.'})

NEW = [
    {'parameters': {'jsCode': js('upload_info.js')}, 'name': 'Upload Info',
     'type': 'n8n-nodes-base.code', 'typeVersion': 2, 'position': [160, -160]},
    {'parameters': {'method': 'POST', 'url': WEAVIATE + '/v1/graphql', 'authentication': 'genericCredentialType',
                    'genericAuthType': 'httpBearerAuth', 'sendBody': True, 'specifyBody': 'json',
                    'jsonBody': CHECK_QUERY, 'options': {}},
     'name': 'Check Vectors', 'type': 'n8n-nodes-base.httpRequest', 'typeVersion': 4.3,
     'position': [380, -160], 'credentials': CRED},
    {'parameters': {'jsCode': js('verify_vectors.js')}, 'name': 'Verify Vectors',
     'type': 'n8n-nodes-base.code', 'typeVersion': 2, 'position': [600, -160]},
    {'parameters': {'conditions': {'options': {'caseSensitive': True, 'leftValue': '', 'typeValidation': 'strict'},
                                   'conditions': [{'id': 'vectors-ok', 'leftValue': '={{ $json.ok }}', 'rightValue': True,
                                                   'operator': {'type': 'boolean', 'operation': 'true', 'singleValue': True}}],
                                   'combinator': 'and'}, 'options': {}},
     'name': 'Vectors OK?', 'type': 'n8n-nodes-base.if', 'typeVersion': 2, 'position': [820, -160]},
    {'parameters': {'method': 'DELETE', 'url': '=' + WEAVIATE + '/v1/batch/objects?tenant={{ $json.tenant }}',
                    'authentication': 'genericCredentialType', 'genericAuthType': 'httpBearerAuth',
                    'sendBody': True, 'specifyBody': 'json', 'jsonBody': DELETE_BODY, 'options': {}},
     'name': 'Delete Chunks', 'type': 'n8n-nodes-base.httpRequest', 'typeVersion': 4.3,
     'position': [1040, 0], 'credentials': CRED, 'onError': 'continueRegularOutput'},
    {'parameters': {'respondWith': 'json', 'responseBody': FAIL_BODY, 'options': {'responseCode': 502}},
     'name': 'Respond Failed', 'type': 'n8n-nodes-base.respondToWebhook', 'typeVersion': 1.4, 'position': [1260, 0]},
]

wf = api('GET', f'/api/v1/workflows/{WF_ID}')
names = {n['name'] for n in wf['nodes']}
nodes = [n for n in wf['nodes'] if n['name'] not in {x['name'] for x in NEW}] + NEW
for n in nodes:
    if n['name'] == 'Respond to Webhook':
        n['position'] = [1040, -240]
conn = wf['connections']
conn['Weaviate Vector Store'] = {'main': [[{'node': 'Upload Info', 'type': 'main', 'index': 0}]]}
conn['Upload Info'] = {'main': [[{'node': 'Check Vectors', 'type': 'main', 'index': 0}]]}
conn['Check Vectors'] = {'main': [[{'node': 'Verify Vectors', 'type': 'main', 'index': 0}]]}
conn['Verify Vectors'] = {'main': [[{'node': 'Vectors OK?', 'type': 'main', 'index': 0}]]}
conn['Vectors OK?'] = {'main': [[{'node': 'Respond to Webhook', 'type': 'main', 'index': 0}],
                                [{'node': 'Delete Chunks', 'type': 'main', 'index': 0}]]}
conn['Delete Chunks'] = {'main': [[{'node': 'Respond Failed', 'type': 'main', 'index': 0}]]}

payload = {'name': wf['name'], 'description': wf.get('description') or '', 'nodes': nodes,
           'connections': conn, 'settings': {'executionOrder': 'v1'}}
for n in nodes:
    if n['type'] == 'n8n-nodes-base.code' and '\\!' in n['parameters'].get('jsCode', ''):
        raise SystemExit(f'backslash-! in {n["name"]}')
if '--dry-run' in sys.argv:
    print(json.dumps(payload, indent=1)[:4000])
    print('already had:', sorted(names & {x["name"] for x in NEW}))
    sys.exit()
api('PUT', f'/api/v1/workflows/{WF_ID}', payload)
after = api('GET', f'/api/v1/workflows/{WF_ID}')
print('updated', after['updatedAt'], 'active', after['active'], [n['name'] for n in after['nodes']])
