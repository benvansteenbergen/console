# n8n Workflows

This document describes all n8n webhooks called by the console.

## Webhook Reference

All webhooks called from the Next.js console, organized by category.

### Authentication & User

| Webhook | Method | Console Route | Purpose |
|---------|--------|---------------|---------|
| `/webhook/portal-userinfo` | GET | `/api/auth/me` | Validate session, return user info |
| `/webhook/portal-usage` | GET | `/api/credits` | Get credit usage stats |
| `/webhook/portal-settings` | GET | `/api/settings` | Get user/client settings |

### Agents & Content Types

| Webhook | Method | Console Route | Purpose |
|---------|--------|---------------|---------|
| `/webhook/portal-agents` | GET | `/api/content-writers`, `/api/content-forms`, `/api/portal-agents` | List available agents |
| `/webhook/portal-automations` | GET | `/api/content-automations` | List automation agents |
| `/webhook/content-formats` | GET | `/api/content-formats` | List content format options |
| `/webhook/toggle-agent-enabled` | POST | `/api/admin/toggle-agent` | Enable/disable agent |

### Google Drive Operations

| Webhook | Method | Console Route | Purpose |
|---------|--------|---------------|---------|
| `/webhook/content-storage` | GET | `/api/content-storage`, `content/[...path]` | List files in folder |
| `/webhook/load-document` | GET | `/api/drive/file` | Load document content |
| `/webhook/save-document` | PUT | `/api/drive/commit` | Save document changes |
| `/webhook/move-file` | POST | `/api/move-file` | Move file to folder |
| `/webhook/create-folder` | POST | `/api/create-folder` | Create new folder |
| `/webhook/delete-document` | POST | `/api/delete-document` | Delete document |

### Live Chat / Conversations

| Webhook | Method | Console Route | Purpose |
|---------|--------|---------------|---------|
| `/webhook/live-conversations` | GET | `/api/live/conversations` | List chat conversations |
| `/webhook/live-messages` | GET | `/api/live/messages` | Get messages in conversation |
| `/webhook/live-message` | POST | `/api/live/messages` | Send new message |
| `/webhook/live-unread-count` | GET | `/api/live/unread-count` | Get unread message count |
| `/webhook/live-mark-read` | POST | `/api/live/mark-read` | Mark conversation as read |
| `/webhook/live-archive` | POST | `/api/live/archive` | Archive/unarchive conversation |
| `/webhook/live-brief` | GET/POST | `/api/live/brief` | Get/update conversation brief |
| `/webhook/live-production` | POST | `/api/live/production` | Trigger production workflow |
| `/webhook/live-assistant-profile` | GET/POST | `/api/live/assistant-profile` | Get/update assistant profile |
| `/webhook/review-chat` | POST | `/api/chat` | AI chat for document review |

### Knowledge Base

| Webhook | Method | Console Route | Purpose |
|---------|--------|---------------|---------|
| `/webhook/knowledge-base-list` | GET | `/api/knowledge-base/documents` | List KB documents |
| `/webhook/knowledge-base-upload` | POST | `/api/knowledge-base/upload` | Upload document to KB |
| `/webhook/knowledge-base-delete` | DELETE | `/api/knowledge-base/documents/[id]` | Delete KB document |
| `/webhook/knowledge-base-analyze` | POST | `/api/knowledge-base/analyze` | Analyze document |
| `/webhook/knowledge-base-extract-text` | POST | `/api/knowledge-base/extract-text` | Extract text from file |
| `/webhook/knowledge-base-live` | GET | `/api/knowledge-base/live` | Live KB updates |

### Data Sources (LinkedIn, Website)

| Webhook | Method | Console Route | Purpose |
|---------|--------|---------------|---------|
| `/webhook/datasource-linkedin-validate` | POST | `/api/datasources/linkedin-validate` | Validate LinkedIn URL |
| `/webhook/datasource-linkedin-profile` | GET | `/api/datasources/linkedin-profile` | Get stored LinkedIn profile |
| `/webhook/datasource-linkedin-profile-analyse` | POST | `/api/datasources/linkedin-profile-analyse` | Analyze LinkedIn profile |
| `/webhook/datasource-linkedin-personal` | POST | `/api/datasources/linkedin-personal` | Save personal LinkedIn |
| `/webhook/datasource-linkedin-company` | POST | `/api/datasources/linkedin-company` | Save company LinkedIn |
| `/webhook/datasource-linkedin-company-profile` | GET | `/api/datasources/linkedin-company-profile` | Get company LinkedIn profile |
| `/webhook/datasource-linkedin-company-analyse` | POST | `/api/datasources/linkedin-company-analyse` | Analyze company LinkedIn |
| `/webhook/datasource-website` | POST | `/api/datasources/website` | Analyze website |
| `/webhook/tone-of-voice` | POST | `/api/tone-of-voice` | Analyze/set tone of voice |

---

## Admin Workflows

These workflows are not called by the console directly, but are used for administration.

### Register New User

**Purpose:** Create a new user account with all required database entries and credential access.

**Trigger:** Form submission (not webhook)

**Form Fields:**
- Email
- Name
- Client (dropdown: existing clients + "Create new company")
- Company Name (if new)
- Domain (dropdown: ai.emotion.nl, console.wingsuite.io)
- Plan (dropdown: starter, growth, pro)

**Flow:**

```
Form Trigger
    │
    ▼
Postgres: Load existing clients
    │
    ▼
Code: Build dropdown options
    │
    ▼
Form: Select client, enter details
    │
    ▼
IF: New company?
    │
    ├─► TRUE: Generate client_key, INSERT portal_client
    │
    └─► FALSE: Look up client_key from mapping
    │
    ▼ (merge)
    │
HTTP Request: POST /api/v1/users (create n8n user)
    │
    ▼
Postgres: Get projectId from project_relation
    │
    ▼
Postgres: INSERT portal_user
    │
    ▼
Postgres: Copy shared_credentials from template project
    │
    ▼
Form: Display invite URL
```

**Key Queries:**

Get user's projectId:
```sql
SELECT "projectId" FROM project_relation
WHERE "userId" = $1 AND role = 'project:personalOwner'
```

Insert portal_client:
```sql
INSERT INTO portal_client (key, name, domain, created_at, updated_at)
VALUES ($1, $2, $3, NOW(), NOW())
ON CONFLICT (key) DO UPDATE SET updated_at = NOW()
RETURNING key
```

Insert portal_user:
```sql
INSERT INTO portal_user (n8n_user_id, client, role, plan, client_key, settings, linkedin_profile)
VALUES ($1, $2, 'editor', $3, $4, '{}', '{}')
```

Copy credentials:
```sql
INSERT INTO shared_credentials ("credentialsId", "projectId", role, "createdAt", "updatedAt")
SELECT "credentialsId", $1, 'credential:user', NOW(), NOW()
FROM shared_credentials
WHERE "projectId" = '5wB8K4Dwm33EnlQ1'
ON CONFLICT ("credentialsId", "projectId") DO NOTHING
```

---

## Response Formats

### portal-userinfo
```json
{
  "email": "user@example.com",
  "client": "wingsuite",
  "role": "editor",
  "valid": "true"
}
```

### portal-usage
```json
{
  "plan": "pro",
  "credits_used": 150,
  "plan_credits": 1000,
  "over_limit": false
}
```

### content-storage
```json
[
  {
    "folder": "Blog Posts",
    "unseen": 3,
    "items": [
      {
        "id": "1abc...",
        "name": "My Blog Post",
        "webViewLink": "https://docs.google.com/...",
        "thumbnailLink": "https://...",
        "new": 1
      }
    ]
  }
]
```

### live-conversations
```json
[
  {
    "id": "uuid",
    "title": "Conversation title",
    "lastMessageAt": "2024-01-15T10:30:00Z",
    "unread": 2
  }
]
```

---

## Adding New Webhooks

When creating workflows that the console will call:

1. Use a Webhook trigger
2. Accept JWT in `auth` cookie header
3. Validate JWT and extract user info
4. Return JSON response
5. Document the webhook in this file
6. Create corresponding API route in console
