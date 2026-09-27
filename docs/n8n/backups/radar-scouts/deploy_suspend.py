"""Auto-suspend a source after 5 failed sweeps in a row.

- radar-sweep / Mark Source Failed: status -> 'suspended' when consecutive_failures reaches 5.
  The sweep only picks status = 'followed', so suspended sources are skipped.
- radar-source-action: resuming (action 'followed') resets health.consecutive_failures to 0,
  otherwise the next failure would suspend it again immediately.
- radar-sources-list: 'suspended' is an allowed status filter.
- radar-scouts-list: adds sources_suspended.

Snapshots of the live workflows are written to ../<name>-<timestamp>.json before patching.
Usage: python3 deploy_suspend.py [--dry-run]
"""
import datetime
import json
import os
import sys

from n8n_deploy import HERE, fetch, node, put, verify

DRY = '--dry-run' in sys.argv
SUSPEND_AFTER = 5

NOTES = "(CASE WHEN notes IS NOT NULL AND left(ltrim(notes),1) = '{' THEN notes::jsonb ELSE '{}'::jsonb END)"
CONSEC_NEXT = "COALESCE((" + NOTES + " #>> '{health,consecutive_failures}')::int, 0) + 1"

SWEEP_OLD = ")::text, updated_at = NOW()\nWHERE id = '{{ $json.source_id }}'::uuid"
SWEEP_NEW = (")::text, updated_at = NOW(),\n"
             "  status = CASE WHEN status = 'followed' AND " + CONSEC_NEXT + " >= " + str(SUSPEND_AFTER) +
             " THEN 'suspended' ELSE status END,\n"
             "  action_at = CASE WHEN status = 'followed' AND " + CONSEC_NEXT + " >= " + str(SUSPEND_AFTER) +
             " THEN now() ELSE action_at END\n"
             "WHERE id = '{{ $json.source_id }}'::uuid")

ACTION_OLD = "  UPDATE radar_sources s SET status = a.action, action_at = now(), updated_at = now()\n"
ACTION_NEW = ("  UPDATE radar_sources s SET status = a.action, action_at = now(), updated_at = now(),\n"
              "    notes = CASE WHEN a.action = 'followed' AND left(ltrim(COALESCE(s.notes, '')), 1) = '{'\n"
              "      THEN jsonb_set(s.notes::jsonb, '{health,consecutive_failures}', '0'::jsonb)::text ELSE s.notes END\n")

LIST_OLD = "const statuses = ['proposed', 'followed', 'naylisted', 'dropped'];"
LIST_NEW = "const statuses = ['proposed', 'followed', 'naylisted', 'dropped', 'suspended'];"

SCOUTS_OLD = "  (SELECT count(*) FROM radar_concepts c WHERE c.scout_id = sc.id AND c.status IN ('active', 'saved')\n     AND c.created_at > now() - interval '7 days')::int AS finds_week,"
SCOUTS_NEW = ("  (SELECT count(*) FROM radar_sources s WHERE s.scout_id = sc.id AND s.status = 'suspended')::int AS sources_suspended,\n"
              + SCOUTS_OLD)

PLAN = [
    ('radar-sweep', '0dGrOJHxBJZnmEK5', 'Mark Source Failed', 'query', SWEEP_OLD, SWEEP_NEW),
    ('radar-source-action', 'f1sm4nyTxMkiT85E', 'Update Source', 'query', ACTION_OLD, ACTION_NEW),
    ('radar-sources-list', '0LLMN61MBi2aToI1', 'Sanitize Input', 'jsCode', LIST_OLD, LIST_NEW),
    ('radar-scouts-list', 'ptpGArBVb6SoepAz', 'Query', 'query', SCOUTS_OLD, SCOUTS_NEW),
]


def main():
    ts = datetime.datetime.now().strftime('%Y%m%d-%H%M%S')
    wfs = {}
    for name, wid, node_name, key, old, new in PLAN:
        if wid not in wfs:
            wfs[wid] = fetch(wid)
            with open(os.path.join(HERE, '..', f'{name}-{ts}.json'), 'w') as f:
                json.dump(wfs[wid], f, indent=1)
        p = node(wfs[wid], node_name)['parameters']
        assert p[key].count(old) == 1, f'{name}/{node_name}: unexpected current content'
        p[key] = p[key].replace(old, new)
        print(f'patched {name} / {node_name}')
    if DRY:
        print('dry run, nothing deployed (snapshots written)')
        return
    checks = {
        '0dGrOJHxBJZnmEK5': {'Mark Source Failed': ['suspended']},
        'f1sm4nyTxMkiT85E': {'Update Source': ['consecutive_failures']},
        '0LLMN61MBi2aToI1': {'Sanitize Input': ['suspended']},
        'ptpGArBVb6SoepAz': {'Query': ['sources_suspended']},
    }
    for wid, wf in wfs.items():
        put(wid, wf)
        verify(wid, checks[wid])


if __name__ == '__main__':
    main()
