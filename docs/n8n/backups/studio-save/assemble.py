import json, glob, os

backup = sorted(glob.glob('docs/n8n/backups/studio-save-*.json'))[-1]
w = json.load(open(backup))
nodes = {n['name']: n for n in w['nodes']}

code = open('docs/n8n/backups/studio-save/resolve_folder_name.js').read()
pick = open('docs/n8n/backups/studio-save/pick_folder.js').read()
for nm, c in [('resolve', code), ('pick', pick)]:
    assert '\\!' not in c, f'backslash-bang in {nm}'
nodes['Resolve Folder Name']['parameters']['jsCode'] = code

# Fix the corrupted `if (\!folderId)` (a real SyntaxError that crashed every save).
nodes['Pick Folder']['parameters']['jsCode'] = pick

# Disable the broken, unconfigured Supabase Vector Store node (no credentials, empty table):
# it blocks publishing and is a runtime error source. Re-enable + configure if Supabase indexing is wanted.
nodes['Supabase Vector Store']['disabled'] = True

# Don't let an empty folder search kill the chain — emit an item so the fallback logic runs.
nodes['Search Client Folder']['alwaysOutputData'] = True
nodes['Search Content Folder']['alwaysOutputData'] = True

# Search "Content" inside the client folder, or the base folder when there is no client folder.
nodes['Search Content Folder']['parameters']['filter']['folderId']['value'] = (
    "={{ $('Search Client Folder').first().json.id || '1YgOEQZwexatBIbpnY0_S22UifbXUXDZ1' }}"
)

payload = {
    'name': w['name'],
    'nodes': w['nodes'],
    'connections': w['connections'],
    'settings': {'executionOrder': (w.get('settings') or {}).get('executionOrder', 'v1')},
}

out = os.environ['TMPDIR'] + '/studio-save-put.json'
json.dump(payload, open(out, 'w'))

# Guard: the whole workflow must keep its real "!" chars (Build Upload <!DOCTYPE, Pick Folder !)
# and gain no corruption.
blob = json.dumps(w)
print('backup:', backup)
print('wrote', out, os.path.getsize(out), 'bytes')
print('backslash-! anywhere:', blob.count('\\\\!'))
