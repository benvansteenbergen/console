# Update — 2026-06-08 — Radar Scout rework + ingestion overhaul + Studio save fix

Session summary of what changed, why, and where. Console changes are in the working tree; n8n changes are **live in production** (no staging). Rollback baselines: `docs/n8n/backups/radar-scout-20260608-211907.json`, `radar-sweep-20260608-213841.json`, `studio-message-20260608-203633.json`.

## Content Studio — save fix (console)
`components/ContentStudio.tsx`: the freeform "Write freely" draft couldn't be saved in a visible way — `handleSave` opened the result with `window.open` **after `await`** (popup-blocked) and swallowed errors. Now it shows an inline **"Saved to Google Drive — Open in Drive"** link and surfaces save errors. (The n8n `studio-save` workflow already had a `Freeform` folder fallback, so missing `format` was never the blocker.)

## studio-message prompt (n8n)
Added guidance so the Studio AI produces a `===DRAFT===` when the user signals they're done / says "just write it", with a question cap — so freeform conversations actually reach a saveable draft.

## Radar Scout (`radar-scout`, n8n + console) — the main work
The Scout interview "went on forever" and the curation moment was weak. Root causes and fixes:

- **Profile-seeded.** Console already piped `profile_context` (commit `4469158`, predecessor) but n8n ignored it. `Build Prompt` now injects identity/audience/tone/`website_scan.recommendations` and pre-seeds the priorities doc. Scout no longer re-interviews.
- **Bounded + deterministic close.** Turn cap (≤2) + "just go" escape hatch → `forceClose`. `Parse Output` recovers `done` + the `message` even from truncated/broken JSON. No more infinite loop, no more silent stop.
- **`maxTokensToSample: 8192`** on the Anthropic node — the closing JSON (priorities + many sources) was being truncated at the node default, which is why the chat died on the closing turn.
- **Non-fatal DB writes** (`onError: continueRegularOutput` on the two Postgres nodes).
- **Vendor penalty refined:** resellers + sales/marketing agencies penalised; the **primary maker/lab (OpenAI, Anthropic) is allowed** as a direct source.
- **URL-based dedupe** in `Prepare Curation` — only identical URLs collapse; same name + different URL (business/consumer, two products) is kept.
- **No em/en-dashes** anywhere in the prompt + an explicit rule so the AI stops emitting them.

Console (`app/(protected)/radar/`): identity-aware Dutch welcome, one-click "Ga maar" chip, status line instead of the 3 dots **only on the curation turn**, `ScoutHabitatPane` rewritten to a static "Wat Scout van je weet" card + proposed-sources reveal (the old "Updating live…" was fake — the backend is batch, not streaming tool-calls), 60 s fetch timeout, graceful empty-response handling. `page.tsx` fixed the latent bug where the profile was read at the wrong nesting (`profile_summary`).

`components/RadarSuggestionStrip.tsx`: redesigned from a long blue-purple-gradient horizontal scroll to a compact, brand-coloured, 2-column list that collapses to 6 with "show all", dedupes by URL, shows the category chip, and removes rows optimistically.

## Radar ingestion (`radar-sweep`, n8n) — Phase 1
"Sources didn't output much / were hard to read." The old parser was regex RSS-2.0 `<item>` only (Atom feeds yielded **zero**), no JS support, no social.

- `Get Feed URL`: RSS/Atom autodiscovery, else **Jina Reader** fallback for JS / no-RSS / blocked pages.
- `Parse Articles`: robust **RSS 2.0 + Atom + RDF + sitemap**, plus Jina-markdown link extraction (same-site, nav denylist, section/slug heuristic). Capped at 20.
- `Fetch RSS` reused as the generic fetcher; timeout bumped to 30 s.

Validated against live HN (RSS), Dan Abramov (Atom), and a Jina render — RSS/Atom are clean; Jina handles the messy long tail (marketing megasites still leak some product links, but those are vendor sites Scout avoids anyway).

## Decisions locked with Ben
JS-render ingestion via **Jina Reader keyless** (Firecrawl as a paid upgrade if needed); slim Scout (no live habitat); sweep **twice daily**; Scout refines 1–2 turns unless the user says "just go"; tell-the-user-what-it's-doing only when relevant.

## Open / next
- Per-source health + auto-pause (needs 2 DB columns or `notes` JSON).
- Social ingestion (the real frontier).
- No-dash rule in Concepter / Researcher / Studio prompts too.
- One-time cleanup of any existing duplicate-URL `radar_sources` rows.
- Group suggestions by category + Dutch labels.
- Phase 3: Concepter idea modes (news / vision-repost / mix).
