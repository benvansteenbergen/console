"""Keep a short fetch history per source so the UI can tell "sometimes fails" from "not fetching".

radar-sweep / Mark Source Failed + Mark Source OK now also maintain
notes.health.recent: the last 10 outcomes, oldest first, e.g. ["ok","fail","ok"].
radar-scouts-list counts only sources that are not fetching at all (3+ failures in a row).

Usage: python3 deploy_health.py [--dry-run]
"""
import sys

from n8n_deploy import fetch, node, put, verify

DRY = '--dry-run' in sys.argv

NOTES = "(CASE WHEN notes IS NOT NULL AND left(ltrim(notes),1) = '{' THEN notes::jsonb ELSE '{}'::jsonb END)"


def recent_with(outcome):
    # Last 9 previous outcomes (oldest first) + this one = at most 10.
    return (
        "(SELECT COALESCE(jsonb_agg(r.v ORDER BY r.i), '[]'::jsonb) FROM ("
        "SELECT t.v, t.i FROM jsonb_array_elements(COALESCE(" + NOTES + " #> '{health,recent}', '[]'::jsonb)) "
        "WITH ORDINALITY AS t(v, i) ORDER BY t.i DESC LIMIT 9) r) || '[\"" + outcome + "\"]'::jsonb"
    )


MARK_FAILED = """UPDATE radar_sources SET notes = jsonb_set(
  """ + NOTES + """,
  '{health}',
  jsonb_build_object(
    'status', 'failed',
    'last_sweep', to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'consecutive_failures', COALESCE((""" + NOTES + """ #>> '{health,consecutive_failures}')::int, 0) + 1,
    'reason', '{{ $json.fail_reason }}',
    'recent', """ + recent_with('fail') + """
  )
)::text, updated_at = NOW()
WHERE id = '{{ $json.source_id }}'::uuid"""

MARK_OK = """UPDATE radar_sources SET notes = jsonb_set(
  """ + NOTES + """,
  '{health}',
  jsonb_build_object(
    'status', 'ok',
    'last_sweep', to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'consecutive_failures', 0,
    'recent', """ + recent_with('ok') + """
  )
)::text, updated_at = NOW()
WHERE id = '{{ $('Parse Articles').first().json.source_id }}'::uuid"""

FAILING_OLD = """(s.notes::jsonb #>> '{health,status}') = 'failed')::int AS sources_failing"""
FAILING_NEW = """(s.notes::jsonb #>> '{health,status}') = 'failed'
     AND COALESCE((s.notes::jsonb #>> '{health,consecutive_failures}')::int, 0) >= 3)::int AS sources_failing"""


def main():
    sweep = fetch('0dGrOJHxBJZnmEK5')
    for n, q, sanity in [('Mark Source Failed', MARK_FAILED, "'failed'"), ('Mark Source OK', MARK_OK, "'ok'")]:
        p = node(sweep, n)['parameters']
        assert sanity in p['query'] and 'recent' not in p['query'], f'{n}: unexpected current SQL'
        p['query'] = q
        print('patched radar-sweep /', n)

    scouts = fetch('ptpGArBVb6SoepAz')
    qp = node(scouts, 'Query')['parameters']
    assert qp['query'].count(FAILING_OLD) == 1, 'scouts-list: unexpected current SQL'
    qp['query'] = qp['query'].replace(FAILING_OLD, FAILING_NEW)
    print('patched radar-scouts-list / Query')

    if DRY:
        print('dry run, nothing deployed')
        return
    put('0dGrOJHxBJZnmEK5', sweep)
    verify('0dGrOJHxBJZnmEK5', {'Mark Source Failed': ['recent'], 'Mark Source OK': ['recent']})
    put('ptpGArBVb6SoepAz', scouts)
    verify('ptpGArBVb6SoepAz', {'Query': ['consecutive_failures']})


if __name__ == '__main__':
    main()
