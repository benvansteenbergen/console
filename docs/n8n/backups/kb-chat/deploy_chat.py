"""kb-chat: "Ask your knowledge base" (document chat) on the CURRENT searcher.

  python3 deploy_chat.py --dry-run | deploy

POST /webhook/kb-chat  { message, history[], scope: {mode: all|folders|document, ...} }
  -> { success, answer, sources[] }
Search = the same vectorStoreWeaviate tools Studio uses (Company KB + Private KB), scoped with
options.searchFilterJson (undefined when there is no filter; "{}" and "" break the node).
"""
import copy
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'kb-folders'))
sys.path.insert(0, os.path.join(HERE, '..', 'radar-scouts'))
from deploy_kb import chain, code, fetch_user, link, nid, respond, respond_error, webhook, workflow  # noqa: E402
from n8n_deploy import activate, create, fetch, node, put, reregister  # noqa: E402

IDS_FILE = os.path.join(HERE, 'workflow-ids.json')
STUDIO_ID = 'axdg9OFz7eAMM5dU'
FILTER = ("={{ $('Build Prompt').first().json.kbFilter != null ? "
          "$('Build Prompt').first().json.kbFilter.toJsonString() : undefined }}")


def src(name):
    return open(os.path.join(HERE, name)).read()


def build():
    studio = fetch(STUDIO_ID)
    model = copy.deepcopy(node(studio, 'Anthropic Chat Model'))
    model.update({'id': nid(), 'position': [600, 220]})
    tools = []
    for i, name in enumerate(('Weaviate Vector Company KB', 'Weaviate Vector Private KB')):
        t = copy.deepcopy(node(studio, name))
        t.update({'id': nid(), 'position': [760 + i * 180, 220]})
        t['parameters']['options']['searchFilterJson'] = FILTER
        t['parameters']['topK'] = 12
        tools.append(t)
    embs = []
    for i, name in enumerate(('Embeddings Google Gemini', 'Embeddings Google Gemini1')):
        e = copy.deepcopy(node(studio, name))
        e.update({'id': nid(), 'position': [760 + i * 180, 400]})
        embs.append(e)
    agent = {'parameters': {'promptType': 'define', 'text': "={{ $('Build Prompt').first().json.query }}",
                            'options': {'systemMessage': src('system_message.txt').rstrip('\n')}},
             'id': nid(), 'name': 'AI Agent', 'type': '@n8n/n8n-nodes-langchain.agent', 'typeVersion': 3,
             'position': [700, 0]}
    nodes = [webhook('Webhook', 'kb-chat', 'POST', 0, 0), fetch_user('Fetch User', 200, 0),
             code('Build Prompt', src('build_prompt.js'), 400, 0), agent, model, *tools, *embs,
             code('Parse Answer', src('parse_answer.js'), 1000, 0), respond('Respond', 1200, 0),
             respond_error('Respond Error', 400, 200)]
    conns = {}
    chain(conns, 'Webhook', 'Fetch User', 'Build Prompt', 'AI Agent', 'Parse Answer', 'Respond')
    link(conns, 'Fetch User', 'Respond Error', out=1)
    conns[model['name']] = {'ai_languageModel': [[{'node': 'AI Agent', 'type': 'ai_languageModel', 'index': 0}]]}
    for t, e in zip(tools, embs):
        conns[t['name']] = {'ai_tool': [[{'node': 'AI Agent', 'type': 'ai_tool', 'index': 0}]]}
        conns[e['name']] = {'ai_embedding': [[{'node': t['name'], 'type': 'ai_embedding', 'index': 0}]]}
    return workflow('kb-chat', nodes, conns)


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else '--dry-run'
    wf = build()
    print(f'kb-chat: {len(wf["nodes"])} nodes')
    if mode != 'deploy':
        print('dry run')
        return
    ids = json.load(open(IDS_FILE)) if os.path.exists(IDS_FILE) else {}
    if 'kb-chat' in ids:
        put(ids['kb-chat'], wf)
        reregister(ids['kb-chat'])
    else:
        ids['kb-chat'] = create(wf)['id']
        activate(ids['kb-chat'])
    json.dump(ids, open(IDS_FILE, 'w'), indent=1)
    print(json.dumps(ids))


if __name__ == '__main__':
    main()
