"""Step 2: make the sweep pipeline scout-aware (SQL-only, no Code-node edits).

Every source belongs to exactly one scout, so scout_id is derived from
source_id inside SQL instead of being threaded through concepter/researcher.

Usage: python3 deploy_pipeline.py [--dry-run]
Requires the 2026-09-radar-scouts.sql migration to be applied first.
"""
import sys

from n8n_deploy import load_backup, put, verify

DRY = '--dry-run' in sys.argv

SCOUT_OF_SOURCE = "(SELECT scout_id FROM radar_sources WHERE id = '{{ $json.source_id }}'::uuid)"

# radar-sweep: priorities + pause/archive come from the scout, not the user.
GET_ACTIVE_SOURCES = (
    "SELECT * FROM (SELECT DISTINCT u.n8n_user_id as user_id, s.id as source_id, s.url as source_url, "
    "s.name as source_name, s.scout_id, sc.priorities_markdown as priorities, "
    "COALESCE(u.settings->>'timezone', 'Europe/Amsterdam') as timezone "
    "FROM radar_sources s "
    "JOIN radar_scouts sc ON sc.id = s.scout_id "
    "JOIN portal_user u ON u.n8n_user_id = s.user_id "
    "WHERE s.status = 'followed' AND sc.status = 'active' AND sc.priorities_markdown <> '') t "
    "ORDER BY random() LIMIT 50"
)

# radar-sweep-articles: dedupe per scout (IS NOT DISTINCT FROM keeps NULL-scout rows deduped too).
DEDUPE_CHECK = (
    "SELECT id FROM radar_concepts WHERE article_hash = '{{ $json.article_url }}' "
    "AND user_id = '{{ $json.user_id }}'::uuid "
    "AND scout_id IS NOT DISTINCT FROM " + SCOUT_OF_SOURCE + " LIMIT 1"
)

INSERT_DROPPED = (
    "INSERT INTO radar_concepts (user_id, source_id, scout_id, article_url, article_hash, headline, concept_body, "
    "alignment_quote, alignment_priority, alignment_why, status) VALUES ('{{ $json.user_id }}'::uuid, "
    "'{{ $json.source_id }}'::uuid, " + SCOUT_OF_SOURCE + ", '{{ $json.article_url }}', '{{ $json.article_hash }}', "
    "'{{ $json.article_title.replace(/'/g, \"''\") }}', '', '', '', '', 'dropped') ON CONFLICT DO NOTHING"
)

INSERT_CONCEPT = """INSERT INTO radar_concepts (user_id, source_id, scout_id, article_url, article_hash, headline, concept_body, alignment_quote, alignment_priority, alignment_why, verdict, verdict_body, verdict_writing_note, verdict_sources, status, banner_seen)
VALUES (
  '{{ $json.user_id }}'::uuid,
  '{{ $json.source_id }}'::uuid,
  (SELECT scout_id FROM radar_sources WHERE id = '{{ $json.source_id }}'::uuid),
  '{{ $json.article_url }}',
  '{{ $json.article_hash }}',
  '{{ $json.headline }}',
  '{{ $json.concept_body }}',
  '{{ $json.alignment_quote }}',
  '{{ $json.alignment_priority }}',
  '{{ $json.alignment_why }}',
  '{{ $json.verdict }}',
  '{{ $json.body }}',
  '{{ $json.writing_note }}',
  '{{ $json.sources_checked_json }}'::jsonb,
  'active',
  false
)"""

PLAN = [
    # (backup name, workflow id, node, new query, must-contain-before)
    ('radar-sweep', '0dGrOJHxBJZnmEK5', 'Get Active Sources', GET_ACTIVE_SOURCES, "priorities_markdown"),
    ('radar-sweep-articles', 'BzDPtmgKdIvstt64', 'Dedupe Check', DEDUPE_CHECK, "article_hash ="),
    ('radar-sweep-articles', 'BzDPtmgKdIvstt64', 'Insert Dropped', INSERT_DROPPED, "'dropped'"),
    ('radar-researcher', 'ZfpkY2M0dMdhA5Le', 'Insert Concept', INSERT_CONCEPT, "banner_seen"),
]


def main():
    by_wf = {}
    for name, wid, node_name, query, sanity in PLAN:
        wf = by_wf.setdefault(wid, load_backup(name))
        n = next(x for x in wf['nodes'] if x['name'] == node_name)
        assert sanity in n['parameters']['query'], f'{name}/{node_name}: unexpected current SQL'
        n['parameters']['query'] = query
        print(f'patched {name} / {node_name}')
    if DRY:
        print('dry run, nothing deployed')
        return
    for wid, wf in by_wf.items():
        put(wid, wf)
        checks = {n: ['scout_id'] for (_, w, n, _, _) in PLAN if w == wid}
        verify(wid, checks)


if __name__ == '__main__':
    main()
