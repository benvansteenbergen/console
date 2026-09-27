"""Knowledge base folders: n8n deploy.

  python3 deploy_kb.py --dry-run     build everything in memory, print a summary
  python3 deploy_kb.py new           create + activate knowledge-base-documents / -folders / -move
  python3 deploy_kb.py existing      patch knowledge-base-delete / -upload and studio-message

New endpoints are separate workflows, so the live console keeps using the old
knowledge-base-list until the new console ships. Existing workflows are changed
backwards compatibly. Code-node sources live next to this file (*.js).
Pre-change snapshots: ../kb-folders-pre/.
"""
import copy
import glob
import json
import os
import sys
import uuid

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'radar-scouts'))
from n8n_deploy import activate, create, fetch, node, put, reregister, verify  # noqa: E402

PRE = os.path.join(HERE, '..', 'kb-folders-pre')
WEAVIATE = 'https://lkphk2vdrfegucqmr3mdog.c0.europe-west3.gcp.weaviate.cloud'
WEAVIATE_CRED = {'httpBearerAuth': {'id': 'ZQNh2zCdoMHYMOyC', 'name': 'Bearer Auth account'}}
PG_CRED = {'postgres': {'id': 'HY5nJozYRhfP29Se', 'name': 'Postgres account'}}
IDS_FILE = os.path.join(HERE, 'workflow-ids.json')


def src(name):
    return open(os.path.join(HERE, name)).read()


def backup(name):
    return json.load(open(sorted(glob.glob(os.path.join(PRE, f'{name}-2*.json')))[-1]))


def nid():
    return str(uuid.uuid4())


# ---------- node factories ----------------------------------------------------
TEMPLATE = backup('knowledge-base-list')


def webhook(name, path, method, x, y):
    return {'parameters': {'httpMethod': method, 'path': path, 'responseMode': 'responseNode', 'options': {}},
            'id': nid(), 'name': name, 'type': 'n8n-nodes-base.webhook', 'typeVersion': 2.1,
            'position': [x, y], 'webhookId': nid()}


def fetch_user(name, x, y):
    n = copy.deepcopy(node(TEMPLATE, 'Fetch User'))
    n.update({'id': nid(), 'name': name, 'position': [x, y]})
    return n


def code(name, js, x, y):
    return {'parameters': {'jsCode': js}, 'id': nid(), 'name': name, 'type': 'n8n-nodes-base.code',
            'typeVersion': 2, 'position': [x, y]}


def pg(name, query, x, y):
    return {'parameters': {'operation': 'executeQuery', 'query': query, 'options': {}}, 'id': nid(), 'name': name,
            'type': 'n8n-nodes-base.postgres', 'typeVersion': 2.6, 'position': [x, y],
            'alwaysOutputData': True, 'credentials': PG_CRED}


def weaviate_http(name, method, path, x, y, json_body=None, query=None):
    p = {'method': method, 'url': WEAVIATE + path, 'authentication': 'genericCredentialType',
         'genericAuthType': 'httpBearerAuth',
         'options': {'response': {'response': {'neverError': True}}}}
    if query:
        p.update({'sendQuery': True, 'queryParameters': {'parameters': [{'name': k, 'value': v} for k, v in query]}})
    if json_body:
        p.update({'sendBody': True, 'specifyBody': 'json', 'jsonBody': json_body})
    return {'parameters': p, 'id': nid(), 'name': name, 'type': 'n8n-nodes-base.httpRequest', 'typeVersion': 4.3,
            'position': [x, y], 'credentials': WEAVIATE_CRED}


def respond(name, x, y, body=None):
    p = {'respondWith': 'json', 'responseBody': body, 'options': {}} if body else \
        {'respondWith': 'allIncomingItems', 'options': {}}
    return {'parameters': p, 'id': nid(), 'name': name, 'type': 'n8n-nodes-base.respondToWebhook',
            'typeVersion': 1.4, 'position': [x, y]}


def respond_error(name, x, y):
    return respond(name, x, y, '{ "valid": "false" }')


def link(conns, a, b, out=0):
    outs = conns.setdefault(a, {'main': []})['main']
    while len(outs) <= out:
        outs.append([])
    outs[out].append({'node': b, 'type': 'main', 'index': 0})


def chain(conns, *names):
    for a, b in zip(names, names[1:]):
        link(conns, a, b)


def workflow(name, nodes, conns):
    return {'name': name, 'description': '', 'nodes': nodes, 'connections': conns,
            'settings': {'executionOrder': 'v1'}}


READ_FOLDERS = ("SELECT COALESCE(settings->'kb'->'folders', '[]'::jsonb) AS folders FROM portal_user "
                "WHERE n8n_user_id = '{{ $('%s').first().json.user_id }}'::uuid")

WRITE_FOLDERS = """UPDATE portal_user SET settings = jsonb_set(
  CASE WHEN jsonb_typeof(settings) = 'object' THEN settings ELSE '{}'::jsonb END,
  '{kb}',
  COALESCE(CASE WHEN jsonb_typeof(settings->'kb') = 'object' THEN settings->'kb' END, '{}'::jsonb)
    || jsonb_build_object('folders', '{{ $json.folders_sql }}'::jsonb)
) WHERE n8n_user_id = '{{ $json.user_id }}'::uuid AND '{{ $json.error }}' = ''"""


# ---------- new workflows -----------------------------------------------------
def wf_documents():
    nodes = [webhook('Webhook', 'knowledge-base-documents', 'GET', 0, 0), fetch_user('Fetch User', 200, 0),
             pg('Read Folders', READ_FOLDERS % 'Fetch User', 400, 0),
             code('Build Query', src('documents_build_query.js'), 600, 0),
             weaviate_http('Query Weaviate', 'POST', '/v1/graphql', 800, 0, json_body='={{ $json.body }}'),
             code('Build List', src('documents_build_list.js'), 1000, 0),
             respond('Respond', 1200, 0), respond_error('Respond Error', 400, 200)]
    conns = {}
    chain(conns, 'Webhook', 'Fetch User', 'Read Folders', 'Build Query', 'Query Weaviate', 'Build List', 'Respond')
    link(conns, 'Fetch User', 'Respond Error', out=1)
    return workflow('knowledge-base-documents', nodes, conns)


def wf_folders():
    get_resp = '={{ JSON.stringify({ success: true, folders: $json.folders }) }}'
    post_resp = ("={{ JSON.stringify({ success: $('Apply Action').first().json.error === '', "
                 "error: $('Apply Action').first().json.error, folder: $('Apply Action').first().json.folder, "
                 "folders: $('Apply Action').first().json.folders }) }}")
    nodes = [webhook('Webhook GET', 'knowledge-base-folders', 'GET', 0, 0), fetch_user('Fetch User GET', 200, 0),
             pg('Read Folders GET', READ_FOLDERS % 'Fetch User GET', 400, 0),
             respond('Respond GET', 600, 0, get_resp), respond_error('Respond Error GET', 400, 150),
             webhook('Webhook POST', 'knowledge-base-folders', 'POST', 0, 350),
             fetch_user('Fetch User POST', 200, 350),
             pg('Read Folders POST', READ_FOLDERS % 'Fetch User POST', 400, 350),
             code('Apply Action', src('folders_apply.js'), 600, 350),
             pg('Write Folders', WRITE_FOLDERS, 800, 350),
             respond('Respond POST', 1000, 350, post_resp), respond_error('Respond Error POST', 400, 500)]
    conns = {}
    chain(conns, 'Webhook GET', 'Fetch User GET', 'Read Folders GET', 'Respond GET')
    link(conns, 'Fetch User GET', 'Respond Error GET', out=1)
    chain(conns, 'Webhook POST', 'Fetch User POST', 'Read Folders POST', 'Apply Action', 'Write Folders',
          'Respond POST')
    link(conns, 'Fetch User POST', 'Respond Error POST', out=1)
    return workflow('knowledge-base-folders', nodes, conns)


def wf_move():
    has_chunks = {'parameters': {'conditions': {
        'options': {'caseSensitive': True, 'leftValue': '', 'typeValidation': 'strict', 'version': 2},
        'conditions': [{'id': nid(), 'leftValue': '={{ $json.skip }}', 'rightValue': '',
                        'operator': {'type': 'boolean', 'operation': 'false', 'singleValue': True}}],
        'combinator': 'and'}, 'options': {}},
        'id': nid(), 'name': 'Has Chunks', 'type': 'n8n-nodes-base.if', 'typeVersion': 2.2, 'position': [1000, 0]}
    summary = ("const moved = $('Split Chunks').all().filter(function (i) { return i.json.skip === false; }).length;\n"
               "return [{ json: { success: true, moved_chunks: moved } }];")
    nodes = [webhook('Webhook', 'knowledge-base-move', 'POST', 0, 0), fetch_user('Fetch User', 200, 0),
             code('Build Query', src('move_build_query.js'), 400, 0),
             weaviate_http('Find Chunks', 'POST', '/v1/graphql', 600, 0, json_body='={{ $json.body }}'),
             code('Split Chunks', src('move_split.js'), 800, 0), has_chunks,
             weaviate_http('Patch Chunk', 'PATCH', '/v1/objects/Documents/{{ $json.id }}', 1200, -100,
                           json_body='={{ $json.patch }}', query=[('tenant', '={{ $json.tenant }}')]),
             code('Summary', summary, 1400, 0), respond('Respond', 1600, 0), respond_error('Respond Error', 400, 200)]
    nodes[6]['parameters']['url'] = '=' + WEAVIATE + '/v1/objects/Documents/{{ $json.id }}'
    conns = {}
    chain(conns, 'Webhook', 'Fetch User', 'Build Query', 'Find Chunks', 'Split Chunks', 'Has Chunks')
    link(conns, 'Has Chunks', 'Patch Chunk', out=0)
    link(conns, 'Has Chunks', 'Summary', out=1)
    chain(conns, 'Patch Chunk', 'Summary', 'Respond')
    link(conns, 'Fetch User', 'Respond Error', out=1)
    return workflow('knowledge-base-move', nodes, conns)


# ---------- existing workflows ------------------------------------------------
def patch_delete():
    wf = backup('knowledge-base-delete')
    keep = {'Webhook', 'Fetch User', 'Respond to Webhook'}
    wf['nodes'] = [n for n in wf['nodes'] if n['name'] in keep]
    summary = """const read = function (name) {
  const r = $(name).first().json || {};
  const res = r.results || {};
  return { matches: Number(res.matches || 0), deleted: Number(res.successful || 0) };
};
const a = read('Delete Private');
const b = read('Delete Company');
return [{ json: { success: (a.matches + b.matches) > 0, deleted: a.deleted + b.deleted } }];"""
    wf['nodes'] += [
        code('Sanitize Input', src('delete_sanitize.js'), 200, -150),
        weaviate_http('Delete Private', 'DELETE', '/v1/batch/objects', 400, -150,
                      json_body='={{ $json.body }}', query=[('tenant', '={{ $json.tenant_u }}')]),
        weaviate_http('Delete Company', 'DELETE', '/v1/batch/objects', 600, -150,
                      json_body="={{ $('Sanitize Input').first().json.body }}",
                      query=[('tenant', "={{ $('Sanitize Input').first().json.tenant_c }}")]),
        code('Summary', summary, 800, -150),
    ]
    node(wf, 'Respond to Webhook')['parameters'] = {'respondWith': 'allIncomingItems', 'options': {'responseCode': 200}}
    conns = {}
    chain(conns, 'Webhook', 'Fetch User', 'Sanitize Input', 'Delete Private', 'Delete Company', 'Summary',
          'Respond to Webhook')
    wf['connections'] = conns
    return wf, {'Sanitize Input': ['uploaded_by'], 'Delete Private': ['batch/objects']}


def patch_upload():
    wf = backup('knowledge-base-upload')
    loader = node(wf, 'Default Data Loader')['parameters']
    loader['loader'] = 'auto'
    meta = loader['options']['metadata']['metadataValues']
    assert all(m['name'] not in ('folder_id', 'file_type') for m in meta)
    meta.append({'name': 'folder_id', 'value':
                 "={{ String($('Webhook').item.json.body.folder_id ?? '').replace(/[^0-9a-fA-F-]/g, '').slice(0, 36) }}"})
    meta.append({'name': 'file_type', 'value':
                 "={{ ['pdf', 'docx', 'doc'].includes($('Webhook').item.json.body.file_type) "
                 "? $('Webhook').item.json.body.file_type : 'pdf' }}"})
    return wf, {'Default Data Loader': ['folder_id', 'file_type', '"auto"']}


def patch_studio():
    wf = backup('studio-message')
    node(wf, 'Build Prompt')['parameters']['jsCode'] = src('studio_build_prompt.js')
    flt = ("={{ $('Build Prompt').first().json.kbFilter != null ? "
           "$('Build Prompt').first().json.kbFilter.toJsonString() : {}.toJsonString() }}")
    for tool in ('Weaviate Vector Company KB', 'Weaviate Vector Private KB'):
        node(wf, tool)['parameters']['options']['searchFilterJson'] = flt
    agent = node(wf, 'AI Agent')['parameters']['options']
    sm = agent['systemMessage']
    old = "(Company KB and Private KB).\\n- BEFORE"
    assert sm.count(old) == 1, 'system message anchor'
    sm = sm.replace(old, "(Company KB and Private KB).' + $('Build Prompt').first().json.kbScopeNote + '\\n- BEFORE")
    old_off = 'tell them to enable the knowledge base toggle.'
    assert sm.count(old_off) == 1
    sm = sm.replace(old_off, 'tell them they can switch the knowledge base back on in the picker below the chat.')
    agent['systemMessage'] = sm
    return wf, {'Build Prompt': ['kbFilter'], 'Weaviate Vector Company KB': ['searchFilterJson'],
                'Weaviate Vector Private KB': ['searchFilterJson'], 'AI Agent': ['kbScopeNote']}


EXISTING = {
    'agPyJPSNovI8lfLO': patch_delete,
    'qRCuSrjefn0aFmsB': patch_upload,
    'axdg9OFz7eAMM5dU': patch_studio,
}


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else '--dry-run'
    new = [wf_documents(), wf_folders(), wf_move()]
    existing = {wid: fn() for wid, fn in EXISTING.items()}
    for wf in new:
        print(f'new {wf["name"]}: {len(wf["nodes"])} nodes')
    for wid, (wf, _) in existing.items():
        print(f'patched {wf["name"]}: {len(wf["nodes"])} nodes')
    if mode == 'new':
        ids = json.load(open(IDS_FILE)) if os.path.exists(IDS_FILE) else {}
        for wf in new:
            if wf['name'] in ids:
                print(f'{wf["name"]} exists ({ids[wf["name"]]}), updating in place')
                put(ids[wf['name']], wf)
                reregister(ids[wf['name']])
                continue
            created = create(wf)
            activate(created['id'])
            ids[wf['name']] = created['id']
            print(f'created {wf["name"]} -> {created["id"]}')
        json.dump(ids, open(IDS_FILE, 'w'), indent=1)
    elif mode == 'existing':
        for wid, (wf, checks) in existing.items():
            put(wid, wf)
            reregister(wid)
            verify(wid, checks)
    else:
        print('dry run, nothing deployed')


if __name__ == '__main__':
    main()
