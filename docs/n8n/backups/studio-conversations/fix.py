import json, os, glob

backup = sorted(glob.glob('docs/n8n/backups/studio-conversations-*.json'))[-1]
w = json.load(open(backup))
nodes = {n['name']: n for n in w['nodes']}

gc = nodes['Get Conversations']
old = gc['parameters']['query']
# user_id column is text (runtime error: operator does not exist: text = uuid).
# Compare both sides as text so it works regardless of the column type.
new = old.replace("WHERE user_id = '{{ $json.user_id }}'::uuid", "WHERE user_id::text = '{{ $json.user_id }}'")
assert new != old, 'query pattern not found'
gc['parameters']['query'] = new

payload = {
    'name': w['name'],
    'nodes': w['nodes'],
    'connections': w['connections'],
    'settings': {'executionOrder': (w.get('settings') or {}).get('executionOrder', 'v1')},
}
out = os.environ['TMPDIR'] + '/studio-conv-put.json'
json.dump(payload, open(out, 'w'))
print('new query:', new)
print('backslash-bang in query:', new.count(chr(92) + '!'))
print('wrote', out)
