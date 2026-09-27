"""Side-by-side evaluation: current searcher vs kb-search-v2.

  python3 eval.py questions.json results.json

questions.json: [{ "tenant": "client_x", "query": "...", "target": "<document_id>" | null, "kind": "exact|paraphrase|real" }]
Activates kb-search-eval only for the duration of the run, then deactivates it.
"""
import json
import os
import sys
import time
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'radar-scouts'))
from n8n_deploy import BASE, activate, deactivate  # noqa: E402

IDS = json.load(open(os.path.join(HERE, 'workflow-ids.json')))
PATH = open('/Users/benvansteenbergen/NetBeansProjects/console/_scratch/kb_eval_path.txt').read().strip()


def ask(tenant, query):
    body = json.dumps({'tenant': tenant, 'query': query}).encode()
    for attempt in range(3):
        try:
            req = urllib.request.Request(f'{BASE}/webhook/{PATH}', data=body, method='POST',
                                         headers={'Content-Type': 'application/json'})
            with urllib.request.urlopen(req, timeout=120) as r:
                data = json.loads(r.read().decode())
                return data[0] if isinstance(data, list) else data
        except Exception as e:  # flaky proxy
            last = e
            time.sleep(2)
    return {'error': str(last)}


def main():
    questions = json.load(open(sys.argv[1]))
    out_path = sys.argv[2]
    activate(IDS['kb-search-eval'])
    results = []
    try:
        for i, q in enumerate(questions):
            r = ask(q['tenant'], q['query'])
            results.append({**q, 'current': r.get('current', []), 'v2': r.get('v2', []), 'error': r.get('error')})
            print(f"{i + 1}/{len(questions)} {q['tenant']} | {q['query'][:60]} | cur {len(r.get('current', []))} v2 {len(r.get('v2', []))}"
                  + (f" ERROR {r['error'][:80]}" if r.get('error') else ''))
            json.dump(results, open(out_path, 'w'), indent=1)
    finally:
        deactivate(IDS['kb-search-eval'])


if __name__ == '__main__':
    main()
