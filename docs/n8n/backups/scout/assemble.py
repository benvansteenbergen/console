import json, glob, os

backup = sorted(glob.glob('docs/n8n/backups/radar-scout-*.json'))[-1]
w = json.load(open(backup))
nodes = {n['name']: n for n in w['nodes']}

build_prompt = open('docs/n8n/backups/scout/build_prompt.js').read()
system_message = open('docs/n8n/backups/scout/system_message.txt').read().rstrip('\n')
parse_output = open('docs/n8n/backups/scout/parse_output.js').read()
prepare_curation = open('docs/n8n/backups/scout/prepare_curation.js').read()

# Sanity: no backslash-bang anywhere we are inserting
for name, txt in [('build_prompt', build_prompt), ('system_message', system_message), ('parse_output', parse_output), ('prepare_curation', prepare_curation)]:
    assert '\\!' not in txt, f'backslash-bang in {name}'

nodes['Build Prompt']['parameters']['jsCode'] = build_prompt
nodes['Parse Output']['parameters']['jsCode'] = parse_output
nodes['Prepare Curation']['parameters']['jsCode'] = prepare_curation
nodes['Scout Agent']['parameters']['options']['systemMessage'] = system_message

# The closing turn emits a large JSON (priorities doc + many sources). Without an explicit
# token budget the node default truncates it, producing broken JSON and a dead chat.
am = nodes['Anthropic Chat Model']['parameters'].setdefault('options', {})
am['maxTokensToSample'] = 8192

# A failed DB write must never break the chat response — let the workflow still respond.
for nm in ['Write Priorities', 'Insert Sources']:
    nodes[nm]['onError'] = 'continueRegularOutput'

payload = {
    'name': w['name'],
    'description': w.get('description') or '',
    'nodes': w['nodes'],
    'connections': w['connections'],
    'settings': {'executionOrder': (w.get('settings') or {}).get('executionOrder', 'v1')},
}

out = os.environ['TMPDIR'] + '/radar-scout-put.json'
json.dump(payload, open(out, 'w'))
print('source backup:', backup)
print('wrote', out, os.path.getsize(out), 'bytes')
print('Build Prompt  ! good/bad:', build_prompt.count('!') - build_prompt.count('\\!'), '/', build_prompt.count('\\!'))
print('Parse Output  ! good/bad:', parse_output.count('!') - parse_output.count('\\!'), '/', parse_output.count('\\!'))
print('systemMessage starts with "=":', system_message.startswith('='))
