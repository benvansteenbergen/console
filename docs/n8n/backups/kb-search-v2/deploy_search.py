"""kb-search-v2 (the "best-in-class" searcher) + kb-search-eval (side-by-side test harness).

  python3 deploy_search.py --dry-run
  python3 deploy_search.py deploy        create/update both workflows (eval stays INACTIVE)

kb-search-v2 is a sub-workflow (Execute Workflow Trigger, passthrough input):
  { query, tenants: ["user_<id>", "client_<client>"], filter: n8n-style filter or null, limit }
  -> items { rank, document_id, document_title, description, folder_id, tenant, score, text }

kb-search-eval: webhook (secret path, only active while running eval.py) that sends one query
through the CURRENT searcher (the exact vectorStoreWeaviate node Studio uses) and kb-search-v2.
"""
import json
import os
import secrets
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'kb-folders'))
sys.path.insert(0, os.path.join(HERE, '..', 'radar-scouts'))
from deploy_kb import WEAVIATE, chain, code, nid, respond, weaviate_http, webhook, workflow  # noqa: E402
from n8n_deploy import create, put  # noqa: E402

IDS_FILE = os.path.join(HERE, 'workflow-ids.json')
# The eval webhook path is a secret: kept outside the repo.
EVAL_PATH_FILE = '/Users/benvansteenbergen/NetBeansProjects/console/_scratch/kb_eval_path.txt'
GEMINI_CRED = {'googlePalmApi': {'id': 'eunCJWxYZJuIkFYL', 'name': 'Google Gemini(PaLM) Api account'}}
WEAVIATE_STORE_CRED = {'weaviateApi': {'id': 'lI7IxbqgzQDQr8Tv', 'name': 'Weaviate Credentials (document-store)'}}


def src(name):
    return open(os.path.join(HERE, name)).read()


PREPARE = """const q = String($('When Called').first().json.query || '').slice(0, 2000);
return [{ json: { body: JSON.stringify({
  model: 'models/gemini-embedding-001',
  content: { parts: [{ text: q }] },
  taskType: 'RETRIEVAL_QUERY',
}) } }];"""


def wf_search():
    trigger = {'parameters': {'inputSource': 'passthrough'}, 'id': nid(), 'name': 'When Called',
               'type': 'n8n-nodes-base.executeWorkflowTrigger', 'typeVersion': 1.1, 'position': [0, 0]}
    embed = {'parameters': {
        'method': 'POST',
        'url': 'https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent',
        'authentication': 'predefinedCredentialType', 'nodeCredentialType': 'googlePalmApi',
        'sendBody': True, 'specifyBody': 'json', 'jsonBody': '={{ $json.body }}', 'options': {}},
        'id': nid(), 'name': 'Embed Query', 'type': 'n8n-nodes-base.httpRequest', 'typeVersion': 4.3,
        'position': [400, 0], 'credentials': GEMINI_CRED}
    search = weaviate_http('Hybrid Search', 'POST', '/v1/graphql', 800, 0, json_body='={{ $json.body }}')
    nodes = [trigger, code('Prepare Embedding', PREPARE, 200, 0), embed,
             code('Build Query', src('build_query.js'), 600, 0), search, code('Select', src('select.js'), 1000, 0)]
    conns = {}
    chain(conns, 'When Called', 'Prepare Embedding', 'Embed Query', 'Build Query', 'Hybrid Search', 'Select')
    wf = workflow('kb-search-v2', nodes, conns)
    return wf


def wf_eval(search_id, path):
    current = {'parameters': {
        'mode': 'load',
        'weaviateCollection': {'__rl': True, 'value': 'Documents', 'mode': 'list', 'cachedResultName': 'Documents'},
        'prompt': "={{ $('Webhook').first().json.body.query }}", 'topK': 10,
        'options': {'tenant': "={{ $('Webhook').first().json.body.tenant }}"}},
        'id': nid(), 'name': 'Current Search', 'type': '@n8n/n8n-nodes-langchain.vectorStoreWeaviate',
        'typeVersion': 1.3, 'position': [200, 0], 'credentials': WEAVIATE_STORE_CRED, 'alwaysOutputData': True}
    # Same embeddings node config as studio-message (empty params = node default model).
    emb = {'parameters': {}, 'id': nid(), 'name': 'Current Embeddings',
           'type': '@n8n/n8n-nodes-langchain.embeddingsGoogleGemini', 'typeVersion': 1, 'position': [200, 200],
           'credentials': GEMINI_CRED}
    collect = """const rows = $input.all().map(function (i, n) {
  const d = i.json.document || {};
  const m = d.metadata || {};
  return { rank: n + 1, document_id: m.document_id, document_title: m.document_title, score: i.json.score, text: d.pageContent };
}).filter(function (r) { return r.document_id; });
const body = $('Webhook').first().json.body;
return [{ json: { current: rows, query: body.query, tenants: [body.tenant], filter: null, limit: 10 } }];"""
    call_v2 = {'parameters': {
        'workflowId': {'__rl': True, 'mode': 'id', 'value': search_id},
        'workflowInputs': {'mappingMode': 'defineBelow', 'value': {}, 'matchingColumns': [], 'schema': [],
                           'attemptToConvertTypes': False, 'convertFieldsToString': True},
        'options': {'waitForSubWorkflow': True}},
        'id': nid(), 'name': 'New Search', 'type': 'n8n-nodes-base.executeWorkflow', 'typeVersion': 1.2,
        'position': [600, 0], 'alwaysOutputData': True}
    combine = """return [{ json: {
  query: $('Collect Current').first().json.query,
  current: $('Collect Current').first().json.current,
  v2: $input.all().map(function (i) { return i.json; }).filter(function (r) { return r.document_id; }),
} }];"""
    nodes = [webhook('Webhook', path, 'POST', 0, 0), current, emb,
             code('Collect Current', collect, 400, 0), call_v2, code('Combine', combine, 800, 0),
             respond('Respond', 1000, 0)]
    conns = {'Current Embeddings': {'ai_embedding': [[{'node': 'Current Search', 'type': 'ai_embedding', 'index': 0}]]}}
    chain(conns, 'Webhook', 'Current Search', 'Collect Current', 'New Search', 'Combine', 'Respond')
    return workflow('kb-search-eval', nodes, conns)


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else '--dry-run'
    ids = json.load(open(IDS_FILE)) if os.path.exists(IDS_FILE) else {}
    search = wf_search()
    print(f'kb-search-v2: {len(search["nodes"])} nodes')
    if mode != 'deploy':
        print('dry run')
        return
    if 'kb-search-v2' in ids:
        put(ids['kb-search-v2'], search)
    else:
        ids['kb-search-v2'] = create(search)['id']
    path = open(EVAL_PATH_FILE).read().strip() if os.path.exists(EVAL_PATH_FILE) else 'kb-search-eval-' + secrets.token_hex(12)
    ev = wf_eval(ids['kb-search-v2'], path)
    if 'kb-search-eval' in ids:
        put(ids['kb-search-eval'], ev)
    else:
        ids['kb-search-eval'] = create(ev)['id']
    open(EVAL_PATH_FILE, 'w').write(path)
    json.dump(ids, open(IDS_FILE, 'w'), indent=1)
    print(json.dumps(ids))


if __name__ == '__main__':
    main()
