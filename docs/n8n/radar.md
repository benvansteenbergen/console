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
| `radar-sweep` | `0dGrOJHxBJZnmEK5` | Cron `0 0 9,12,17 * * *` (daily 09:00/12:00/17:00, workflow TZ Europe/Amsterdam) | Fetch + relevance filter per article |
| `radar-concepter` | `xXNTbqWtzRTWSRs9` | sub-workflow | Editorial concept (one committed angle) |
| `radar-researcher` | `ZfpkY2M0dMdhA5Le` | sub-workflow | Web-search fact-check + verdict |
| `radar-nightly-cleanup` | `ynuHcxIFiHzLExqB` | Cron nightly | Drop concepts older than 14 days |
| `radar-weekly-digest` | `T9KSWpREmoFZal0i` | Cron `0 0 10 * * 1` (Monday 10:00, Europe/Amsterdam) | Weekly "What's on your Radar" email digest |
| `radar-digest-pref` | `J6l3k9c7jriY5cco` | `GET`/`POST /webhook/radar-digest-pref` | Read/write the weekly digest opt-out flag |
| `radar-sources-list` | `0LLMN61MBi2aToI1` | `GET /webhook/radar-sources-list` | List sources by status |
| `radar-source-action` | `f1sm4nyTxMkiT85E` | `POST /webhook/radar-source-action` | follow / drop / naylist a source |
| `radar-concepts-list` | `yenAuwcHBBIuxbBg` | `GET /webhook/radar-concepts-list` | List concepts |
| `radar-concept-action` | `aEpbAMHQzCXYf6Wz` | `POST /webhook/radar-concept-action` | save / drop / mark-seen a concept |
| `radar-priorities-get` / `-set` | `JBmGUrGc...` / `TUOIEQbw...` | `/webhook/radar-priorities` | Read/write the priorities doc |

**Data:** `radar_sources` and `radar_concepts` tables; the priorities doc lives in `portal_user.settings.radar.priorities_markdown`. Everything is user-scoped (`user_id` + `client_id`).

---

## Scout (`radar-scout`) — current behaviour

Console surface: `app/(protected)/radar/` (`page.tsx` feed/scout toggle, `components/ScoutChatPane.tsx`, `components/ScoutHabitatPane.tsx`). API route `app/api/radar/scout/route.ts` proxies to `/webhook/radar-scout`.

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

Node chain (per followed source, then per article): `Schedule Trigger → Get Active Sources → Filter Timezone → Loop Sources → Fetch Page → Get Feed URL → Should Fetch → Fetch RSS → Parse Articles → Loop Articles → Dedupe Check → Check New → Is New → Build Radar Context → Radar Agent → Parse Decision → Is Pass → {Call Concepter | Insert Dropped}`.

Ingestion strategy (current):

- **`Get Feed URL`** decides the fetch target: the fetched page is already a feed → use it; else RSS/Atom **autodiscovery** in the HTML; else fall back to **Jina Reader** (`https://r.jina.ai/<sourceUrl>`, `fetchMode='jina'`), which renders JS sites, sources without RSS, and pages that blocked the direct fetch.
- **`Fetch RSS`** is reused as a generic fetcher for either a real feed or the Jina URL (timeout 30 s for Jina's render time).
- **`Parse Articles`** parses **RSS 2.0 + Atom + RSS 1.0/RDF + Google-news sitemap**, and for `fetchMode='jina'` extracts article-shaped links from the markdown (same-site, nav denylist, section/slug heuristic, ≥2-hyphen slugs), capped at 20.

**Per-source health (deployed 2026-07-23):** every sweep writes a health object into `radar_sources.notes` (text column, JSON content): `{"health": {"status": "ok"|"failed", "last_sweep": ISO, "consecutive_failures": N, "reason": "..."}}`. Failure paths (`Should Fetch` skip, `Parse Articles` empty/error) route through a `Mark Source Failed` Postgres node; success routes through `Mark Source OK` (resets the counter). Both are `onError: continueRegularOutput` + `alwaysOutputData` so a health write can never break the loop. Crucially, `Parse Articles` now emits a `__fetch_failed` item instead of returning `[]` — a zero-item return **stalled the whole splitInBatches loop**, silently skipping every remaining source (this was why only 1 of 29 AB Enzymes sources produced rows). `radar-sources-list` returns `notes`; the console (`RadarSourcesList.tsx`) shows an amber "Fetch failing (N sweeps)" badge. No auto-pause yet — failing sources keep being retried.

**Cron gotcha (fixed 2026-07-23):** the schedule expression `0 0 9,12,17 * *` (5 fields) means *midnight on the 9th, 12th and 17th of the month*, not 09/12/17 hours — that stalled Radar for all clients between monthly run-days. Correct 6-field form: `0 0 9,12,17 * * *`, with `settings.timezone` set explicitly (instance default is America/New_York).

Still not done (Phase 1 follow-ups): auto-pause of dead sources, full-article enrichment via Jina, and reliable social ingestion (LinkedIn/X/IG — best-effort only; the honest frontier).

---

## `radar-weekly-digest` — Monday email

Node chain: `Every Monday 10:00 → Get Digest Data → Build Email → Send Digest (Gmail)`.

- **One aggregated SQL query** joins `portal_user` + n8n `"user"` + `radar_concepts` (+ `radar_sources` for the source name, `portal_client` for brand domain/name) and `json_agg`s the last 7 days of `active`/`saved` concepts per recipient. Zero concepts → zero rows → no email (silence is a feature). Goes to **all users**; skips anyone with `portal_user.settings.radar.weekly_digest = false` (default on). Links are brand-aware via `COALESCE(portal_client.domain, 'console.wingsuite.io')`.
- **Opt-out:** `radar-digest-pref` (`GET`/`POST /webhook/radar-digest-pref`, jwt-validated) reads/writes the flag; console proxy `app/api/radar/digest/route.ts` (GET/PUT), toggle in Settings ("Email updates" card). The email footer links to `/settings`.
- **Slack-digest style HTML** built in a Code node (no `!` anywhere except the `<!DOCTYPE` string literal, which is safe): grey background, centered wordmark, white rounded card, week date range, per-find linked headline + `alignment_why` + source name, "Open Radar" footer. Subject: `[Radar] Your finds for the week of <date>`.
- **Gmail credential:** `Gmail account` (`krcZdwTx8MGIxuEr`, gmailOAuth2, team project), sender name "Wingsuite Radar", sends from ben@wingsuite.io.
- Payload sources + backups: `docs/n8n/backups/radar-weekly-digest/`.

---

## Editing & deploying the n8n Code nodes

The Code-node and prompt sources for the workflows we edit live as plain files under `docs/n8n/backups/<workflow>/`, with an `assemble.py` that injects them into a fresh backup and writes the PUT payload. See `docs/n8n/backups/README.md`. Always: back up first, edit the source files, `assemble.py`, then PUT via `curl --data-binary @file` (never inline in a double-quoted shell string — that corrupts `!` into `\!`), then verify.
