"""Score eval results: python3 score.py results.json

Per searcher, over questions with a known target document:
  hit@1  target document is the first result
  hit@3  target document is among the first 3 DISTINCT documents
  MRR    1 / rank of the target document among distinct documents (0 if absent in top 10 results)
  docs@5 distinct documents among the first 5 results (diversity; higher = agent sees more sources)
"""
import json
import sys
from collections import defaultdict


def doc_order(results):
    seen = []
    for r in results[:10]:
        d = r.get('document_id')
        if d and d not in seen:
            seen.append(d)
    return seen


def metrics(rows, key):
    t = [r for r in rows if r.get('target')]
    out = {'n': len(t)}
    if t:
        ranks = []
        for r in t:
            order = doc_order(r[key])
            ranks.append(order.index(r['target']) + 1 if r['target'] in order else None)
        out['hit@1'] = sum(1 for x in ranks if x == 1) / len(t)
        out['hit@3'] = sum(1 for x in ranks if x and x <= 3) / len(t)
        out['MRR'] = sum(1 / x for x in ranks if x) / len(t)
        out['miss'] = sum(1 for x in ranks if x is None)
    out['docs@5'] = sum(len({x.get('document_id') for x in r[key][:5]}) for r in rows) / max(len(rows), 1)
    return out


def fmt(m):
    parts = [f"n={m['n']:>2}"]
    if m['n']:
        parts += [f"hit@1 {m['hit@1']:.0%}", f"hit@3 {m['hit@3']:.0%}", f"MRR {m['MRR']:.2f}", f"miss {m['miss']}"]
    parts.append(f"docs@5 {m['docs@5']:.1f}")
    return '  '.join(parts)


def main():
    rows = json.load(open(sys.argv[1]))
    groups = defaultdict(list)
    for r in rows:
        groups['ALL'].append(r)
        groups['kind: ' + r['kind']].append(r)
        groups['store: ' + r['tenant'].split('-')[0][:18]].append(r)
    for name in sorted(groups, key=lambda g: (g != 'ALL', g)):
        g = groups[name]
        print(f'\n{name}  ({len(g)} questions)')
        print('  current :', fmt(metrics(g, 'current')))
        print('  v2      :', fmt(metrics(g, 'v2')))
    print('\nChanged outcomes (target questions):')
    for r in rows:
        if not r.get('target'):
            continue
        c, v = doc_order(r['current']), doc_order(r['v2'])
        rc = c.index(r['target']) + 1 if r['target'] in c else '-'
        rv = v.index(r['target']) + 1 if r['target'] in v else '-'
        if rc != rv:
            print(f"  [{r['kind'][:5]}] current #{rc} -> v2 #{rv} | {r['query'][:70]}")


if __name__ == '__main__':
    main()
