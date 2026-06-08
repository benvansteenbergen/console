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

# Jina render can take longer than a plain feed fetch — give Fetch RSS more time.
nodes['Fetch RSS']['parameters'].setdefault('options', {})['timeout'] = 30000

payload = {
    'name': w['name'],
    'description': w.get('description') or '',
    'nodes': w['nodes'],
    'connections': w['connections'],
    'settings': {'executionOrder': (w.get('settings') or {}).get('executionOrder', 'v1')},
}

out = os.environ['TMPDIR'] + '/radar-sweep-put.json'
json.dump(payload, open(out, 'w'))
print('source backup:', backup)
print('wrote', out, os.path.getsize(out), 'bytes')
print('Get Feed URL  ! bad:', get_feed.count('\\!'))
print('Parse Articles ! bad:', parse_articles.count('\\!'))
print('Fetch RSS timeout:', nodes['Fetch RSS']['parameters']['options']['timeout'])
