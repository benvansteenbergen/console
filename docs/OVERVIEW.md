# Wingsuite Console — Overview

## Purpose

Wingsuite Console is a **white-label AI content platform** that enables marketing teams to generate, review, and manage content (blog posts, social media, newsletters) using AI agents. It serves multiple clients (Emotion, Wingsuite, Harper & Yve, etc.) from a single codebase with brand-specific theming.

**Core value:** Non-technical marketers can create professional content by filling out forms, selecting AI "writers" with different personas, and reviewing/editing the output — all stored in Google Drive.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Browser                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Next.js Console (Railway)                     │
│  • Multi-brand theming (ai.emotion.nl / console.wingsuite.io)   │
│  • API routes proxy to n8n                                       │
│  • Editor with AI chat sidebar                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      n8n (workflow.wingsuite.io)                 │
│  • 38 webhook endpoints for console                              │
│  • 20+ form workflows for content creation                       │
│  • AI agents (OpenAI, Anthropic, Gemini embeddings)              │
│  • PostgreSQL for users, sessions, knowledge base                │
│  • Weaviate vector store for RAG                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Google Drive                              │
│  • Content storage per client                                    │
│  • Documents rendered as thumbnails in console                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Authentication

1. User submits email/password to `/api/auth/login`
2. Console proxies to n8n webhook `portal-userinfo`
3. n8n validates credentials, returns JWT
4. JWT stored as HTTP-only `session` cookie
5. All subsequent requests pass JWT to n8n as `cookie: auth=<jwt>`
6. n8n validates JWT and extracts user/client context

**User data lives in two places:**
- `user` table (n8n native): email, password hash, n8n role
- `portal_user` table (custom): client, plan, role, settings

---

## How It Works

**Content Creation Flow:**
1. User selects content type (blog, LinkedIn post, etc.)
2. n8n form loads with client-specific styling
3. User fills form → selects AI writer agent → submits
4. Agent generates content via OpenAI/Anthropic
5. Output saved to Google Drive as document
6. User redirected to editor for review/editing
7. AI chat sidebar available for revisions

**Live Chat (newer feature):**
- Persistent conversations with AI assistant
- Knowledge base with RAG (Weaviate vectors)
- Production workflow to finalize content

---

## How It Extends

**Adding a new client:**
1. Add brand assets to `/public/[brand]/`
2. Register in `lib/branding.ts`
3. Create n8n user + portal records (via Register New User workflow)
4. Copy shared credentials to their project
5. Point DNS to same Railway deployment

**Adding a new content type:**
1. Create form workflow in n8n with formTrigger
2. Tag it appropriately for `portal-agents`
3. It appears automatically in dashboard

**Adding a new API feature:**
1. Create webhook workflow in n8n
2. Create API route in console that proxies to it
3. Document in `docs/n8n/workflows.md`

---

## Content Creation Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  CLIENT-SPECIFIC                                                 │
│  Form inputs vary per client (different context fields)         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  SHARED                                                          │
│  Agent selection → AI writing → Content auditing                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  CLIENT-SPECIFIC                                                 │
│  Storage mapping (folder ID per client/user)                    │
└─────────────────────────────────────────────────────────────────┘
```

The variability is at the **edges** (input forms + storage), the **core** (AI writing) is shared logic.

---

## Known Technical Debt

| Issue | Status |
|-------|--------|
| Form workflows duplicated per client | Planned: extract shared logic into sub-workflow |
| Hardcoded console domain in form redirects | Planned: use `portal_client.domain` dynamically |
| Folder ID mappings hardcoded in workflows | Planned: move to `portal_client.settings` |
| Template project ID hardcoded | Move to env var or database |

## Design Decisions

| Decision | Rationale |
|----------|-----------|
| Auth split across `user` + `portal_user` | Extends n8n's user model without altering core n8n tables |

---

## Documentation Index

- [n8n Integration](./n8n/README.md) - Integration overview
- [Database Schema](./n8n/database-schema.md) - PostgreSQL table definitions
- [Workflows](./n8n/workflows.md) - Webhook reference and response formats
- [Workflow Mapping](./n8n/workflow-mapping.md) - Console API → Webhook → Workflow mapping
