"""Shared helpers for the radar-scouts n8n changes.

- load_backup(name): latest pre-change snapshot from ../radar-scouts-pre/
- fetch(id) / put(id, wf) / activate / deactivate: n8n public API
- set_param(wf, node, key, value): patch one node parameter, asserting the node exists
- payload(wf): strip to the safe PUT shape (see CLAUDE.md "n8n Workflow Building")
- verify(id, checks): re-fetch and assert strings landed and no `\\!` corruption

All PUTs go through a JSON file on disk (never inline shell strings).
"""
import glob
import json
import os
import tempfile
import time
import urllib.error
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..'))
PRE = os.path.join(HERE, '..', 'radar-scouts-pre')
TEAM_PROJECT = '5wB8K4Dwm33EnlQ1'

_cfg = {}
for _line in open(os.path.join(REPO, '.env')):
    if '=' in _line and not _line.startswith('#'):
        _k, _v = _line.strip().split('=', 1)
        _cfg[_k] = _v.strip().strip('"').strip("'")
BASE = _cfg.get('N8N_BASE_URL', 'https://workflow.wingsuite.io').rstrip('/')
KEY = _cfg['N8N_API_KEY']

SAFE_SETTINGS = ('executionOrder', 'timezone')


def api(method, path, body_file=None, body=None):
    data = None
    if body_file:
        data = open(body_file, 'rb').read()
    elif body is not None:
        data = json.dumps(body).encode()
    last = None
    for _ in range(5):
        req = urllib.request.Request(BASE + path, data=data, method=method,
                                     headers={'X-N8N-API-KEY': KEY, 'Content-Type': 'application/json'})
        try:
            with urllib.request.urlopen(req, timeout=90) as r:
                raw = r.read().decode()
                return json.loads(raw) if raw else {}
        except urllib.error.HTTPError as e:
            raise SystemExit(f'{method} {path} -> {e.code}: {e.read().decode()[:800]}')
        except Exception as e:  # flaky IncompleteRead through the proxy
            last = e
            time.sleep(2)
    raise SystemExit(f'{method} {path} failed: {last}')


def load_backup(name):
    files = sorted(glob.glob(os.path.join(PRE, f'{name}-2*.json')))
    assert files, f'no backup for {name}'
    return json.load(open(files[-1]))


def fetch(wid):
    return api('GET', f'/api/v1/workflows/{wid}')


def node(wf, name):
    for n in wf['nodes']:
        if n['name'] == name:
            return n
    raise AssertionError(f'node {name!r} not found in {wf.get("name")}')


def set_param(wf, node_name, key, value):
    node(wf, node_name)['parameters'][key] = value


def payload(wf):
    settings = {k: v for k, v in (wf.get('settings') or {}).items() if k in SAFE_SETTINGS}
    settings.setdefault('executionOrder', 'v1')
    return {
        'name': wf['name'],
        'description': wf.get('description') or '',
        'nodes': wf['nodes'],
        'connections': wf['connections'],
        'settings': settings,
    }


def put(wid, wf):
    body = payload(wf)
    raw = json.dumps(body)
    assert '\\\\!' not in raw, 'backslash-! corruption in payload'
    fd, path = tempfile.mkstemp(suffix='.json')
    with os.fdopen(fd, 'w') as f:
        f.write(raw)
    try:
        return api('PUT', f'/api/v1/workflows/{wid}', body_file=path)
    finally:
        os.remove(path)


def create(wf):
    """POST a new workflow (inactive) and move it to the team project."""
    body = payload(wf)
    body.pop('description', None)  # POST rejects it ("must NOT have additional properties")
    fd, path = tempfile.mkstemp(suffix='.json')
    with os.fdopen(fd, 'w') as f:
        f.write(json.dumps(body))
    try:
        created = api('POST', '/api/v1/workflows', body_file=path)
    finally:
        os.remove(path)
    api('PUT', f'/api/v1/workflows/{created["id"]}/transfer', body={'destinationProjectId': TEAM_PROJECT})
    return created


def activate(wid):
    return api('POST', f'/api/v1/workflows/{wid}/activate')


def deactivate(wid):
    return api('POST', f'/api/v1/workflows/{wid}/deactivate')


def reregister(wid):
    """Deactivate + activate so webhook/cron triggers pick up changes."""
    deactivate(wid)
    activate(wid)


def verify(wid, checks):
    """checks: {node_name: [substring, ...]} that must appear in that node's params."""
    wf = fetch(wid)
    for node_name, needles in checks.items():
        text = json.dumps(node(wf, node_name)['parameters'])
        for needle in needles:
            assert needle in text, f'{wf["name"]}/{node_name}: missing {needle!r}'
    for n in wf['nodes']:
        code = n['parameters'].get('jsCode', '')
        assert '\\!' not in code, f'{wf["name"]}/{n["name"]}: backslash-! corruption'
    print(f'verified {wf["name"]} (active={wf["active"]})')
    return wf
