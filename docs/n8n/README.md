# n8n Integration

The Wingsuite Console integrates with n8n for workflow orchestration, user management, and backend processing.

## Architecture Overview

```
┌─────────────────────┐         ┌─────────────────────┐
│   Wingsuite Console │         │        n8n          │
│   (Next.js)         │         │   (workflow.*)      │
├─────────────────────┤         ├─────────────────────┤
│                     │         │                     │
│  /api/auth/login ───┼────────►│ /webhook/portal-*   │
│  /api/credits    ───┼────────►│                     │
│  /api/content-*  ───┼────────►│ PostgreSQL DB       │
│                     │         │  - n8n tables       │
│                     │         │  - portal_* tables  │
│                     │         │  - chat_hub_*       │
└─────────────────────┘         └─────────────────────┘
```

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `N8N_BASE_URL` | n8n instance URL | `https://workflow.wingsuite.io` |
| `N8N_API_KEY` | API key for n8n REST API | `n8n_api_...` |
| `JWT_SECRET` | Shared secret for JWT verification | (keep secret) |

## Authentication Flow

1. User submits credentials to `/api/auth/login`
2. Console proxies to n8n webhook `/webhook/portal-login`
3. n8n validates credentials, returns JWT
4. Console sets `session` cookie (HTTP-only)
5. Subsequent requests include cookie
6. Console passes JWT to n8n as `cookie: auth=<jwt>;` header

## Webhooks

The console calls these n8n webhooks:

| Webhook | Method | Purpose | Auth |
|---------|--------|---------|------|
| `/webhook/portal-login` | POST | Authenticate user | None |
| `/webhook/portal-userinfo` | GET | Validate session, get user info | JWT |
| `/webhook/portal-usage` | GET | Get credit usage stats | JWT |
| `/webhook/content-storage` | GET | List Google Drive files | JWT |
| `/webhook/content-forms` | GET | Available form types | JWT |
| `/webhook/content-writers` | GET | Available writer agents | JWT |
| `/webhook/content-automations` | GET | Available automations | JWT |

## n8n REST API

For administrative operations, the console uses n8n's REST API directly:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/users` | POST | Create new user (invite) |
| `/rest/executions/{id}` | GET | Get workflow execution details |

**Authentication:** `X-N8N-API-KEY: <api_key>` header

## User Creation Flow

See the "Register New User" workflow in n8n for the complete implementation.

1. **Form input:** email, name, company (new or existing), plan, domain
2. **Create n8n user:** POST to `/api/v1/users`
3. **Get projectId:** Query `project_relation` for `project:personalOwner`
4. **Create client (if new):** Insert into `portal_client`
5. **Create portal user:** Insert into `portal_user`
6. **Copy credentials:** From template project `5wB8K4Dwm33EnlQ1`
7. **Return invite URL:** User sets their own password

## Template Project

Project ID: `5wB8K4Dwm33EnlQ1`

This project contains shared credentials that are copied to all new users:
- Google Drive service account
- OpenAI API key
- Other default integrations

When a new user is created, their personal project gets `credential:user` access to these credentials.

## Plans

| Plan | Description |
|------|-------------|
| `starter` | Basic tier |
| `growth` | Mid tier |
| `pro` | Full access |

Credit limits and features per plan are configured in n8n workflows.

## Related Documentation

- [Database Schema](./database-schema.md) - Complete table definitions
- [Workflows](./workflows.md) - Webhook reference and response formats
- [Workflow Mapping](./workflow-mapping.md) - Console API → Webhook → Workflow name mapping
