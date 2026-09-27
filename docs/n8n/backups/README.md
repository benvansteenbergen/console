# n8n backups & node sources

This folder holds two things for the n8n workflows we edit from the console repo:

1. **Rollback baselines** — `*-<timestamp>.json`: full `GET /api/v1/workflows/{id}` snapshots taken *before* a change. To roll back, `PUT` the JSON back (strip read-only fields first — see CLAUDE.md "n8n Workflow Building"). Current baselines:
   - `radar-scout-20260608-211907.json` — pre-rework Scout
   - `radar-sweep-20260608-213841.json` — pre-rework sweep ingestion
   - `studio-message-20260608-203633.json` — pre-edit Studio prompt
   - `sweep/radar-sweep-backup-2026-09-08.json` — sweep snapshot 2026-09-08

2. **Editable node sources** — `scout/` and `sweep/`: the Code-node JS and the agent system prompt as plain files, plus an `assemble.py`. These are the **source of truth** for what those Code nodes currently run. Since the multi-scout change, deploy `scout/` through `radar-scouts/deploy_api.py` (it also sets the scout-aware SQL and the `Sanitize Input` node). `scout/assemble.py` builds on the older pre-scout backup and would undo that; don't use it for the scout workflow anymore.

3. **`radar-weekly-digest/`** — full PUT payloads (not extracted sources) for the weekly digest + opt-out endpoint, in deployment order:
   - `create-payload.json` — initial POST body (single recipient, article links)
   - `put-attach-gmail.json` — + Gmail credential attached
   - `put-v2-console-links.json` — headline → console deep-link, source link per item
   - `put-v3-all-users.json` — **current production state**: all users, opt-out, brand-aware
   - `put-test-webhook.json` / `put-v3-test-fire.json` — test-fire variants (temporary webhook trigger; v3 variant also restricts the query to one recipient — see radar.md)
   - `pref-create-payload.json` — `radar-digest-pref` opt-out endpoint (POST body)
   - `radar-weekly-digest-2026*.json` — GET snapshots after create/activate
   To change the digest: edit a copy of `put-v3-all-users.json`, PUT it (file-based, see below), deactivate+reactivate to re-register the cron, verify. There is no assemble.py here; the payloads are small enough to edit directly.

4. **`radar-scouts/` + `radar-scouts-pre/`** — the multi-scout change (2026-09). `radar-scouts-pre/` holds GET snapshots of all 10 touched workflows taken right before (rollback: PUT them back). `radar-scouts/n8n_deploy.py` is a small shared helper (backup load, safe PUT payload, re-register, verify); `deploy_pipeline.py` patches the sweep chain SQL, `deploy_api.py` patches the list/action/priorities/scout workflows (uses `scout/*.js` + `system_message.txt`) and creates `radar-scouts-list` + `radar-scout-manage`. Both support `--dry-run`. The DB migration is `../migrations/2026-09-radar-scouts.sql`.

5. **`kb-folders/` + `kb-folders-pre/`** — knowledge base folders (2026-09). `kb-folders-pre/` holds snapshots of the KB workflows + studio-message taken before the change. `kb-folders/*.js` are the Code-node sources, `deploy_kb.py` builds/deploys (`--dry-run`, `new` for the three new workflows, `existing` for upload/delete/studio-message), and `workflow-ids.json` records the new workflow ids. Details: `../knowledge-base.md`.

## Deploy workflow (how to edit a Code node safely)

```bash
export $(grep N8N_API_KEY ../../.env | xargs)   # run from docs/n8n/backups/ ... or use absolute paths
# 1. fresh backup
curl -s -H "X-N8N-API-KEY: $N8N_API_KEY" "$N8N_BASE_URL/api/v1/workflows/<id>" -o radar-scout-$(date +%Y%m%d-%H%M%S).json
# 2. edit the source files in scout/ or sweep/
# 3. assemble the PUT payload (injects the source files into the latest backup, strips read-only fields)
python3 scout/assemble.py            # writes $TMPDIR/radar-scout-put.json
# 4. deploy — file-based, NEVER inline JSON in a double-quoted shell string
curl -s -X PUT -H "X-N8N-API-KEY: $N8N_API_KEY" -H "Content-Type: application/json" \
  --data-binary "@$TMPDIR/radar-scout-put.json" "$N8N_BASE_URL/api/v1/workflows/<id>"
# 5. re-fetch and verify the change landed and no `!` became `\!`
```

### Why file-based PUT
Writing Code-node JS inline in a double-quoted bash string corrupts `!` → `\!` (bash history expansion / JSON round-trips), which throws `Invalid or unexpected token` at runtime. Building the payload in Python and uploading with `--data-binary @file` avoids all shell interpolation. Every assemble step asserts there is no `\!` in the inserted code, and we re-verify after each PUT.

`assemble.py` only sets the specific nodes it manages and copies everything else from the backup, so unrelated nodes are never touched. n8n is production (no staging) — always back up first and verify after.
