# Knowledge base (KB)

Documents users upload so Content Studio can use company facts. Since 2026-09 users organise their own documents in **folders**, and Studio searches **all**, **selected folders**, or **nothing**.

## Storage

- **Weaviate** (WCD, `lkphk2vdrfegucqmr3mdog.c0.europe-west3.gcp.weaviate.cloud`, v1.39), class **`Documents`**, multi-tenant (auto tenant creation on).
  - `user_<n8n user id>`: private documents (visibility `private`).
  - `client_<client key>`: company documents shared with the team (visibility `shared`).
- Each document is split into **chunks**. Every chunk carries the document metadata:
  `document_id` (uuid), `document_title`, `description`, `visibility`, `uploaded_by` (uuid), `cluster` (legacy), `tags`, **`folder_id`** (text, `''` = Unfiled), **`file_type`** (`pdf` | `docx` | `doc`).
  `folder_id` and `file_type` were added to the schema on 2026-09-27; older chunks have no value (treated as Unfiled / pdf).
- **Folders** are per user, in Postgres: `portal_user.settings.kb.folders = [{id, name, created_at}]`. No table, no migration. Renaming touches settings only; deleting a folder removes it from settings and its documents show as Unfiled (their chunks keep the old id, which the list ignores).
- Embeddings: Google Gemini `models/gemini-embedding-001` (3072 dims) at upload; the Studio search tools use the node default, which matches (verified on live executions).
- There is **no Postgres registry** of documents; Weaviate is the source of truth.

## Workflows

| Workflow | ID | Webhook | What it does |
|---|---|---|---|
| `knowledge-base-upload` | `qRCuSrjefn0aFmsB` | `POST /webhook/knowledge-base-upload` | multipart `file, title, description, visibility, folder_id, file_type`. Default Data Loader (`loader: auto`, by MIME: PDF or text) → Gemini embeddings → Weaviate insert in `user_`/`client_` tenant. |
| `knowledge-base-documents` | `PSAF03N894oBvzMe` | `GET /webhook/knowledge-base-documents` | One GraphQL `Get` over both tenants (limit 10000 each) → grouped per `document_id` → `{documents, folders, truncated}`. Colleagues' shared docs come back with `mine: false` and no folder. |
| `knowledge-base-folders` | `IL7fZQ9Qu10ANyKB` | `GET`/`POST /webhook/knowledge-base-folders` | List, or `{action: create|rename|delete, folder_id?, name?}` on the settings JSON. Errors: `name_required`, `name_exists`, `not_found`. |
| `knowledge-base-move` | `T8e744RM9KSHH6hh` | `POST /webhook/knowledge-base-move` | `{document_ids[], folder_id}`: finds the caller's OWN chunks (`document_id ContainsAny` + `uploaded_by`) in both tenants and PATCHes `folder_id` on each (PATCH keeps the vector). |
| `knowledge-base-delete` | `agPyJPSNovI8lfLO` | `DELETE /webhook/knowledge-base-delete?documentId=` | `DELETE /v1/batch/objects` per tenant, `where document_id = X AND uploaded_by = caller`. Deletes all chunks (no 250 limit) and only the caller's own documents. |
| `knowledge-base-extract-text` | `hmMoelKHvso4LOBb` | `POST` | PDF text for the description helper (first 5 pages). Word files never reach it. |
| `knowledge-base-analyze` | `hogzRDcvgDYhf6C5` | `POST` | Suggests a description (and a legacy cluster) from an excerpt. |
| `knowledge-base-list` | `WcVFtGTpHFPiIWWZ` | `GET` | **Legacy**, still used by `/api/knowledge-base/documents` for the old LiveChat. 250-chunk limit per tenant. |

**Word files:** n8n cannot read .docx/.doc. The console (`lib/kbFiles.ts`) extracts the text (`mammoth` for .docx, `word-extractor` for .doc) and sends it to the upload webhook as a `text/plain` `<name>.txt` file with `file_type` set. The same helper answers `/api/knowledge-base/extract-text` for Word files.

## Studio (`studio-message`, `axdg9OFz7eAMM5dU`)

The body carries `knowledgeBase: {mode: 'all' | 'folders' | 'off', folderIds[], folderNames[]}` (older callers only send `useKnowledgeBase`). `Build Prompt` turns it into `kbFilter`, which both KB tools (`Weaviate Vector Company KB` / `Private KB`) get as `options.searchFilterJson` (n8n's own filter format: a single condition or `{ OR: [...] }` with `valueString`):

- `all` → no filter. The expression must evaluate to `undefined`: `"{}"` crashes the node and `''` fails validation (tested 2026-09-27).
- `folders` → `folder_id = <id>` for each folder, OR `visibility = shared` when "Shared with your team" (`__shared__`) is picked. (n8n's Weaviate node supports no `NotEqual`.)
- `off` → `folder_id = "__off__"`, which matches nothing. Search is really off, not just "please don't".

`kbScopeNote` tells the agent which folders were chosen. Sources: `backups/kb-folders/studio_build_prompt.js`.

## Ask your knowledge base (`kb-chat`, `loC7ZytBXIwLpuDe`)

`POST /webhook/kb-chat` `{message, history[], scope: {mode: all | folders | document, folderIds, folderNames, documentId, documentTitle}}` → `{success, answer, sources[]}`. Console: `components/knowledge-base/AskPanel.tsx` (slide-over on the KB page; "Ask" button scoped to the open folder, and "Ask about this document" in each row menu), route `/api/knowledge-base/chat`.

Agent (Claude Sonnet 4.5) with the **current** searcher: the same two `vectorStoreWeaviate` tools as Studio (topK 12), scoped via `searchFilterJson` (`document_id = X` for one document, `folder_id` OR for folders). The prompt forces search-before-answer, answers only from the documents, and a `Sources:` block that `Parse Answer` turns into chips. Sources: `backups/kb-chat/`.

## Search v2 (`kb-search-v2`, `OurcbqOHrgNAE0F5`), kept as backup

A sub-workflow next to the current searcher; nothing uses it in production. **Evaluation 2026-09-27** (57 questions, 48 with a known target document, 6 stores): right document at #1 94% (current) vs 98% (v2), top-3 100% vs 98%; exact-name questions 100% for both, paraphrases 88% vs 96% at #1; 3 of 48 outcomes differed (2 better, 1 worse). Both are near the ceiling because the knowledge bases are small (max 18 documents), so Studio stays on the current searcher. Re-run `eval.py` + `score.py` once knowledge bases grow.

1. Query embedding via the Gemini REST API (`gemini-embedding-001`, `RETRIEVAL_QUERY`).
2. **Hybrid** search per tenant (GraphQL): BM25 over `text`, `document_title^3`, `description^2`, fused with the vector (`alpha 0.5`, `relativeScoreFusion`), 40 candidates with vectors.
3. In a Code node: a recency boost (up to +15%, fading over ~4 months), then **MMR** diversity (lambda 0.7) with at most 3 chunks per document.

Weaviate 1.39 has MMR and Boost natively, but only over gRPC; n8n only speaks REST/GraphQL, so steps 3 are ours. `kb-search-eval` (`ND8UbWo0mfKG9u7S`, inactive; secret webhook path kept outside the repo) runs one query through both searchers; `eval.py` + `score.py` + `questions.json` in `backups/kb-search-v2/` reproduce the comparison.

## Editing & deploying

Code-node sources live in `docs/n8n/backups/kb-folders/*.js`; `deploy_kb.py` builds and deploys (`--dry-run`, `new`, `existing`). Pre-change snapshots: `backups/kb-folders-pre/`. The Weaviate API key only exists as n8n credentials (`Bearer Auth account` `ZQNh2zCdoMHYMOyC` for REST, `Weaviate Credentials (document-store)` `lI7IxbqgzQDQr8Tv` for the vector-store nodes), so schema changes go through an n8n HTTP node.
