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
| `radar-sweep` | `0dGrOJHxBJZnmEK5` | Cron (per-user TZ, 08:00 + 13:00) | Fetch + relevance filter per article |
| `radar-concepter` | `xXNTbqWtzRTWSRs9` | sub-workflow | Editorial concept (one committed angle) |
| `radar-researcher` | `ZfpkY2M0dMdhA5Le` | sub-workflow | Web-search fact-check + verdict |
| `radar-nightly-cleanup` | `ynuHcxIFiHzLExqB` | Cron nightly | Drop concepts older than 14 days |
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

Not yet done (Phase 1 follow-ups): per-source health / auto-pause of dead sources (needs `last_fetched_at` + `consecutive_failures` columns — the n8n Postgres user has **no DDL**, so a DB owner must add them, or stash in the existing `notes` JSON), full-article enrichment via Jina, and reliable social ingestion (LinkedIn/X/IG — best-effort only; the honest frontier).

---

## Editing & deploying the n8n Code nodes

The Code-node and prompt sources for the workflows we edit live as plain files under `docs/n8n/backups/<workflow>/`, with an `assemble.py` that injects them into a fresh backup and writes the PUT payload. See `docs/n8n/backups/README.md`. Always: back up first, edit the source files, `assemble.py`, then PUT via `curl --data-binary @file` (never inline in a double-quoted shell string — that corrupts `!` into `\!`), then verify.
