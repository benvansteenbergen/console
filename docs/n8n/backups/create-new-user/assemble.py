import json, glob, os

backup = sorted(glob.glob('docs/n8n/backups/create-new-user-*.json'))[-1]
w = json.load(open(backup))
nodes = {n['name']: n for n in w['nodes']}

code = open('docs/n8n/backups/create-new-user/code_js1.js').read()
assert '\\!' not in code, 'backslash-bang in fix'
nodes['Code in JavaScript1']['parameters']['jsCode'] = code

payload = {
    'name': w['name'],
    'nodes': w['nodes'],
    'connections': w['connections'],
    'settings': {'executionOrder': (w.get('settings') or {}).get('executionOrder', 'v1')},
}

out = os.environ['TMPDIR'] + '/create-new-user-put.json'
json.dump(payload, open(out, 'w'))
print('backup:', backup)
print('wrote', out, os.path.getsize(out), 'bytes')
print('fix backslash-! count:', code.count('\\!'))
