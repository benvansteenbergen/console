# n8n backups & node sources

This folder holds two things for the n8n workflows we edit from the console repo:

1. **Rollback baselines** — `*-<timestamp>.json`: full `GET /api/v1/workflows/{id}` snapshots taken *before* a change. To roll back, `PUT` the JSON back (strip read-only fields first — see CLAUDE.md "n8n Workflow Building"). Current baselines:
   - `radar-scout-20260608-211907.json` — pre-rework Scout
   - `radar-sweep-20260608-213841.json` — pre-rework sweep ingestion
   - `studio-message-20260608-203633.json` — pre-edit Studio prompt

2. **Editable node sources** — `scout/` and `sweep/`: the Code-node JS and the agent system prompt as plain files, plus an `assemble.py`. These are the **source of truth** for what those Code nodes currently run.

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
