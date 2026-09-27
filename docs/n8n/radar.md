# Radar — Content Discovery Pipeline

Radar watches a user-curated set of news / blog / social sources, filters what's new against the user's strategic priorities, and surfaces a single editorial concept (with a fact-check) when something clears the bar. The user can then deep-link into LiveChat (Ghost-writer) to draft from it. Everything else is silence.

> **Source of truth for "what Radar is":** `../../radar-wingsuite/` and `../../tryout-flow/` (sibling repos, not part of the console build). This doc describes **what is actually deployed**.

---

## The loop

```
Scout (chat + curation)  ──►  proposes sources (radar_sources, status='proposed')
        │ user follows
radar-sweep (cron 2×/day) ──►  fetch each followed source, extract new articles, relevance-filter
        │ pass
radar-concepter ──► editorial concept ──► radar-researcher (web-search fact-check + verdict)
        │
radar_concepts (status='active') ──► Feed + dashboard banner
```

## Agents / workflows (deployed)

| Workflow | ID | Trigger | Role |
|----------|----|---------|------|
| `radar-scout` | `C4ClYsTCFsShycCm` | `POST /webhook/radar-scout` | Discovery chat + source curation |
| `radar-sweep` | `0dGrOJHxBJZnmEK5` | Cron `0 0 9,12,17 * * *` (daily 09:00/12:00/17:00, workflow TZ Europe/Amsterdam) | Fetch each followed source of every active scout |
| `radar-sweep-articles` | `BzDPtmgKdIvstt64` | sub-workflow (called per source by `radar-sweep`) | Per article: dedupe (per scout), relevance filter, call concepter |
| `radar-concepter` | `xXNTbqWtzRTWSRs9` | sub-workflow | Editorial concept (one committed angle) |
| `radar-researcher` | `ZfpkY2M0dMdhA5Le` | sub-workflow | Web-search fact-check + verdict |
| `radar-nightly-cleanup` | `ynuHcxIFiHzLExqB` | Cron nightly | Drop concepts older than 14 days |
| `radar-weekly-digest` | `T9KSWpREmoFZal0i` | Cron `0 0 10 * * 1` (Monday 10:00, Europe/Amsterdam) | Weekly "What's on your Radar" email digest |
| `radar-digest-pref` | `J6l3k9c7jriY5cco` | `GET`/`POST /webhook/radar-digest-pref` | Read/write the weekly digest opt-out flag |
| `radar-scouts-list` | `ptpGArBVb6SoepAz` | `GET /webhook/radar-scouts-list` | The user's scouts (non-archived) + counts |
| `radar-scout-manage` | `EucvLcyWLtZYyfbd` | `POST /webhook/radar-scout-manage` | rename / pause / resume / archive a scout |
| `radar-sources-list` | `0LLMN61MBi2aToI1` | `GET /webhook/radar-sources-list` | List sources by status (optional `scout_id`) |
| `radar-source-action` | `f1sm4nyTxMkiT85E` | `POST /webhook/radar-source-action` | follow / drop / naylist a source, or `copy` it to another scout |
| `radar-concepts-list` | `yenAuwcHBBIuxbBg` | `GET /webhook/radar-concepts-list` | List concepts (optional `scout_id`, returns `scout_name`) |
| `radar-concept-action` | `aEpbAMHQzCXYf6Wz` | `POST /webhook/radar-concept-action` | save / drop / mark-seen a concept |
| `radar-priorities-get` / `-set` | `JBmGUrGc9anyPLNQ` / `TUOIEQbwAOJ3idNm` | `/webhook/radar-priorities` | Read/write a scout's priorities doc (optional `scout_id`) |

**Data:** `radar_scouts`, `radar_sources` and `radar_concepts` tables (see below). Everything is user-scoped (`user_id`), and sources + concepts also carry `scout_id`. The weekly-digest opt-out stays in `portal_user.settings.radar.weekly_digest`. The old per-user `settings.radar.priorities_markdown` is no longer read (kept for rollback only).

---

## Scouts (multiple topics per user) — since 2026-09

A user runs several **scouts**. Each scout watches one named topic and has its **own priorities doc and its own sources**. All finds land in one feed, filterable by topic.

**Tables** (migration `docs/n8n/migrations/2026-09-radar-scouts.sql`, run by the DB owner `railway`, since the `n8n` user has no DDL rights):
- `radar_scouts (id, user_id, client_id, name, priorities_markdown, status active|paused|archived, created_at, updated_at)`
- `radar_sources.scout_id`, `radar_concepts.scout_id` (FK to `radar_scouts`). Existing data was backfilled into one "My Radar" scout per user.
- Dedupe is **per scout**: unique index `radar_concepts (scout_id, article_hash)` replaced the old `(user_id, article_hash)`. The same article can become a find in two topics, each judged against its own priorities.

**How scout_id flows:** every source belongs to exactly one scout, so the pipeline derives `scout_id` from `source_id` inside SQL (`(SELECT scout_id FROM radar_sources WHERE id = …)`) in `Dedupe Check`, `Insert Dropped` (sweep-articles) and `Insert Concept` (researcher). No Code nodes had to thread it through.

**Pause / remove:** `radar-sweep` / `Get Active Sources` joins `radar_scouts` and only takes `status = 'active'` scouts with a non-empty priorities doc. Paused = skipped. Remove = `archived` (soft delete): skipped, hidden from the overview, but its existing finds stay in the feed (normal 14-day cleanup) and saved finds stay.

**Scout chat:** body `scout_id` = refine that scout; `new_scout: true` = create one. `Read Priorities` always returns one row (the scout, or nulls for a new one) plus `other_scouts` so a new scout avoids overlapping topics. On close, the agent returns `topic_name`; `Prepare Curation` generates the scout uuid, upserts `radar_scouts` (name only on insert, so user renames stick) and inserts proposed sources with `scout_id`, skipping URLs the scout already has. The response carries `scout_id`. Legacy callers without `scout_id` get the user's oldest active scout.

**Copy a source:** `radar-source-action` with `action: 'copy'` + `target_scout_id` inserts a `followed` copy in the target scout (or revives a dropped / nay-listed row there). Response `{copied, already_there}`.

**Input safety:** every radar list/action workflow now has a `Sanitize Input` Code node after `Fetch User` that whitelists `status` / `action` and validates UUIDs, so no raw user input reaches SQL (before, `radar-source-action` wrote `body.action` straight into the status column).

**Console:** `/radar` = feed + topic chips (`?topic=<scout id>`), `/radar/scouts` = overview (rename, pause/resume, remove, adjust, sources), `/radar/scouts/new` = Scout chat for a new topic, `/radar/scouts/[id]` = Sources tab (suggestions, followed with "Copy to…", nay-list) + Refine tab (Scout chat). Deploy scripts + pre-change backups: `docs/n8n/backups/radar-scouts/` and `docs/n8n/backups/radar-scouts-pre/`.

---

## Scout (`radar-scout`) — current behaviour

Console surface: `app/(protected)/radar/scouts/new` and `scouts/[id]?tab=refine` (`components/ScoutChatPane.tsx`, `components/ScoutHabitatPane.tsx`). API route `app/api/radar/scout/route.ts` proxies to `/webhook/radar-scout`. Per-scout behaviour: see "Scouts" above.

Node chain: `Webhook → Fetch User → Read Priorities → Read Sources → Build Prompt → Scout Agent (Anthropic) → Parse Output → Is Done → {Format Not Done | Prepare Curation → Write Priorities → Insert Sources → Format Done} → Respond`.

Key design points (deployed):

- **Stands on the company profile.** The console sends `profile_context` (from `/api/company-profile` → `profile_summary` + `website_scan.recommendations`). `Build Prompt` injects it and **pre-seeds the priorities doc** from it, so Scout does not re-interview the user about identity/audience/tone. (Before: `profile_context` was sent but ignored.)
- **Short + deterministic.** `Build Prompt` counts `[user]` turns from the client-sent `history`, caps at **2 refine turns**, and detects a **"just go"** phrase (Dutch + English) → `forceClose`. The closing message **names what Scout is about to look for** (not a fixed line). `Parse Output` marks done from the agent's `done:true` or, on malformed/truncated JSON, from `forceClose` + a recovered `"message"` field — so the chat can never loop forever or go silent.
- **Anthropic node `maxTokensToSample: 8192`** — the closing JSON (priorities doc + many sources) is large; without a token budget the node default truncated it, which broke the chat. This is the fix for "Scout stops on the closing turn".
- **DB writes are non-fatal** (`onError: continueRegularOutput` on `Write Priorities` + `Insert Sources`) — a failed insert still returns the chat response.
- **Curation:** propose a generous set (aim 8–15), independent-voice biased. **Vendor penalty applies to resellers and sales/marketing agencies, NOT to the primary maker/lab** (OpenAI, Anthropic — their own blog is a valid direct source). Every source needs a literal "Because you mentioned…" quote.
- **URL-based dedupe** (`Prepare Curation`): only true duplicates (same normalised URL) collapse. A site may legitimately appear multiple times with different URLs (business vs consumer section, or two products each with a blog).
- **Voice:** no em-dashes / en-dashes (commas, periods, linking words instead).

Frontend Scout extras: identity-aware welcome, a one-click **"Ga maar"** chip, a status line (instead of the 3 dots) **only on the curation turn**, the right pane shows **"Wat Scout van je weet"** (static, honest) and reveals proposed sources on completion, a 60 s fetch timeout, and graceful empty-response handling.

The Suggestion strip (`components/RadarSuggestionStrip.tsx`) also dedupes by URL client-side, shows the category chip to distinguish sections, collapses to 6 with "show all", and removes a row optimistically on Follow/Skip.

---

## `radar-sweep` — ingestion

Node chain, `radar-sweep` (per followed source): `Schedule Trigger → Get Active Sources → Filter Timezone → Loop Sources → Fetch Page → Get Feed URL → Should Fetch → Fetch RSS → Parse Articles → Has Article → {Mark Source Failed | Process Source Articles → Mark Source OK}`. `Process Source Articles` calls **`radar-sweep-articles`** (per article): `When Called → Loop Articles → Dedupe Check → Check New → Is New → Build Radar Context → Radar Agent → Parse Decision → Is Pass → {Call Concepter | Insert Dropped}`. The priorities doc used by the Radar Agent / Concepter is the scout's, joined in `Get Active Sources`.

Ingestion strategy (current):

- **`Get Feed URL`** decides the fetch target: the fetched page is already a feed → use it; else RSS/Atom **autodiscovery** in the HTML; else fall back to **Jina Reader** (`https://r.jina.ai/<sourceUrl>`, `fetchMode='jina'`), which renders JS sites, sources without RSS, and pages that blocked the direct fetch.
- **`Fetch RSS`** is reused as a generic fetcher for either a real feed or the Jina URL (timeout 30 s for Jina's render time).
- **`Parse Articles`** parses **RSS 2.0 + Atom + RSS 1.0/RDF + Google-news sitemap**, and for `fetchMode='jina'` extracts article-shaped links from the markdown (same-site, nav denylist, section/slug heuristic, ≥2-hyphen slugs), capped at 20.

**Per-source health (deployed 2026-07-23):** every sweep writes a health object into `radar_sources.notes` (text column, JSON content): `{"health": {"status": "ok"|"failed", "last_sweep": ISO, "consecutive_failures": N, "reason": "..."}}`. Failure paths (`Should Fetch` skip, `Parse Articles` empty/error) route through a `Mark Source Failed` Postgres node; success routes through `Mark Source OK` (resets the counter). Both are `onError: continueRegularOutput` + `alwaysOutputData` so a health write can never break the loop. Crucially, `Parse Articles` now emits a `__fetch_failed` item instead of returning `[]` — a zero-item return **stalled the whole splitInBatches loop**, silently skipping every remaining source (this was why only 1 of 29 AB Enzymes sources produced rows). `radar-sources-list` returns `notes`. Since 2026-09-27 the health object also keeps `recent`: the last 10 outcomes, oldest first (`["ok","fail",…]`). The console (`RadarSourcesList.tsx`) shows **"Not fetching · N sweeps in a row"** (amber) at 3+ consecutive failures, and **"Sometimes fails · X of last N"** (grey) when the recent history has failures but not continuously. `radar-scouts-list` counts only the not-fetching ones (`sources_failing`). Deploy script: `backups/radar-scouts/deploy_health.py`. **Auto-suspend (since 2026-09-27):** `Mark Source Failed` sets `status = 'suspended'` when a followed source reaches **5 failures in a row**; the sweep only reads `followed`, so it stops being fetched. The Sources tab lists them under "Suspended (N)" with Resume (back to `followed`; `radar-source-action` resets `consecutive_failures` to 0 so it gets a fresh chance) and Drop. The 43 sources that were already past 5 were suspended once by hand; list in `backups/radar-scouts/suspended-existing-2026-09-27.json`. Deploy script: `backups/radar-scouts/deploy_suspend.py`.

**Cron gotcha (fixed 2026-07-23):** the schedule expression `0 0 9,12,17 * *` (5 fields) means *midnight on the 9th, 12th and 17th of the month*, not 09/12/17 hours — that stalled Radar for all clients between monthly run-days. Correct 6-field form: `0 0 9,12,17 * * *`, with `settings.timezone` set explicitly (instance default is America/New_York).

Still not done (Phase 1 follow-ups): full-article enrichment via Jina, and reliable social ingestion (LinkedIn/X/IG — best-effort only; the honest frontier).

---

## `radar-weekly-digest` — Monday email

Node chain: `Every Monday 10:00 → Get Digest Data → Build Email → Send Digest (Gmail)`. Cron `0 0 10 * * 1`, workflow timezone `Europe/Amsterdam`. Deployed 2026-08-24, live for all users.

**Who gets it (all enforced in one SQL query, `Get Digest Data`):**

- All portal users, via `portal_user` INNER JOIN `radar_concepts` on the last 7 days (`created_at > now() - interval '7 days'`, status `active` or `saved`). The INNER JOIN is the "silence is a feature" mechanism: zero finds that week → zero rows → the workflow ends, no email node ever runs. Users who never set up Radar never match either.
- Opt-out: `AND COALESCE(pu.settings->'radar'->>'weekly_digest', 'true') <> 'false'` — default is on, no migration needed.
- The weekly windows tile exactly (same run moment each week), so every concept appears in exactly one digest, no gaps, no repeats. Only an off-schedule manual fire can duplicate; the cron cannot.
- Brand-aware: LEFT JOIN `portal_client` supplies `domain` + `name`; links use `https://<domain>/...` and the wordmark shows `<brand> radar`. Fallback: `console.wingsuite.io` / Wingsuite.

**Email anatomy (`Build Email` Code node):** Slack-digest style — grey background, centered brand wordmark, white rounded card, week date range ("Monday, August 17 to Sunday, August 23"). Per find: **headline links to `https://<domain>/radar?concept=<id>`** (Radar's take in the console, NOT the raw article), then the `alignment_why` line, then a small grey `Source: <name>` link to the original `article_url` (hostname fallback when the source has no name). Footer: "Open Radar to draft from a find" + "Turn it off in Settings" (`/settings`). Subject: `[Radar] Your finds for the week of <date>`. The JS contains no `!` operators (API corruption rule); the only `!` is inside the `<!DOCTYPE` string literal, which is safe even if escaped.

**Console deep-link:** `app/(protected)/radar/page.tsx` handles `?concept=<id>` (and legacy `#concept=`): once concepts load it opens `RadarConceptOverlay`; if the id is not in the active feed it falls back to fetching `status=saved` (the digest links both). Handled once per page load (ref guard) so closing the overlay does not reopen it. Works through the login redirect because middleware preserves `returnTo` with query.

**Opt-out plumbing:** `radar-digest-pref` (`J6l3k9c7jriY5cco`, team project) — `GET`/`POST /webhook/radar-digest-pref`, both chains jwt-validated with an error branch returning `{"valid":"false"}`. POST writes `portal_user.settings.radar.weekly_digest` with the nested-safe merge `settings || jsonb_build_object('radar', COALESCE(settings->'radar','{}'::jsonb) || jsonb_build_object('weekly_digest', <bool>))` (plain `jsonb_set` silently no-ops when the `radar` key is missing). Console: `app/api/radar/digest/route.ts` (GET/PUT proxy) + "Email updates" toggle card in `app/(protected)/settings/page.tsx` (SWR, optimistic flip).

**Sending:** Gmail node, credential `Gmail account` (`krcZdwTx8MGIxuEr`, gmailOAuth2, team project — credentials must live in the team project like the workflows), sender name "Wingsuite Radar", sends from ben@wingsuite.io. Known limitation: the *sender* is not brand-aware; when white-label volume grows, move to a transactional provider with per-brand sender domains.

**Test-fire procedure (no manual-run API exists):** deploy `put-v3-test-fire.json` — it adds a temporary `GET /webhook/radar-digest-test-fire` trigger AND restricts the query to one recipient (**never test-fire the all-users query; it emails every user off-schedule and duplicates their Monday digest**). Deactivate+reactivate to register the webhook, `curl` it, inspect the execution via `GET /api/v1/executions/<id>?includeData=true`, then restore `put-v3-all-users.json` and deactivate+reactivate again. Verify the test webhook 404s afterwards.

Payload history + rollback baselines: `docs/n8n/backups/radar-weekly-digest/` (see `../backups/README.md`).

---

## Editing & deploying the n8n Code nodes

The Code-node and prompt sources for the workflows we edit live as plain files under `docs/n8n/backups/<workflow>/`, with an `assemble.py` that injects them into a fresh backup and writes the PUT payload. See `docs/n8n/backups/README.md`. Always: back up first, edit the source files, `assemble.py`, then PUT via `curl --data-binary @file` (never inline in a double-quoted shell string — that corrupts `!` into `\!`), then verify.
