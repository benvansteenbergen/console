# n8n Database Schema

This document describes the database tables used by the Wingsuite Console and n8n integration. The database is PostgreSQL.

## Portal Tables

These tables are custom tables for the Wingsuite portal, stored in the same database as n8n.

### portal_client

Stores client/company information. Each client can have multiple users.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `key` | varchar | NOT NULL | - | **Primary key**. URL-safe slug (e.g., "wingsuite", "emotion") |
| `name` | varchar | NOT NULL | - | Display name (e.g., "Wingsuite", "Emotion") |
| `domain` | varchar | NULL | - | Associated console domain (e.g., "console.wingsuite.io", "ai.emotion.nl") |
| `projectId` | varchar | NULL | - | References n8n `project.id` for this client |
| `settings` | jsonb | NULL | `{}` | Client-specific settings |
| `linkedin_company_profile` | jsonb | NULL | `{}` | LinkedIn company data for content generation |
| `created_at` | timestamp | NULL | `now()` | |
| `updated_at` | timestamp | NULL | `now()` | |

### portal_user

Stores portal user information, linking n8n users to clients.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `n8n_user_id` | uuid | NOT NULL | - | **Primary key**. References n8n `user.id` |
| `client` | text | NOT NULL | - | **DEPRECATED** - use `client_key` instead |
| `client_key` | varchar | NULL | - | **Foreign key** to `portal_client.key` |
| `role` | text | NULL | `'editor'` | User role: `editor`, `admin`, etc. |
| `plan` | text | NULL | - | Subscription plan: `starter`, `growth`, `pro` |
| `instance_id` | text | NULL | - | Reserved for multi-n8n-instance support (future) |
| `settings` | jsonb | NULL | `{}` | User-specific settings |
| `linkedin_profile` | jsonb | NULL | `{}` | LinkedIn profile data for content personalization |

## n8n Core Tables

These are standard n8n tables that the portal interacts with.

### user

n8n's built-in user table.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NOT NULL | `gen_random_uuid()` | **Primary key** |
| `email` | varchar | NULL | - | User email (login) |
| `firstName` | varchar | NULL | - | |
| `lastName` | varchar | NULL | - | |
| `password` | varchar | NULL | - | Bcrypt-hashed password |
| `disabled` | boolean | NOT NULL | `false` | |
| `roleSlug` | varchar | NOT NULL | `'global:member'` | n8n role (e.g., `global:admin`, `global:member`) |
| `createdAt` | timestamp | NOT NULL | `CURRENT_TIMESTAMP(3)` | |
| `updatedAt` | timestamp | NOT NULL | `CURRENT_TIMESTAMP(3)` | |

### project

n8n projects for organizing workflows and credentials.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | varchar | NOT NULL | - | **Primary key** |
| `name` | varchar | NOT NULL | - | Project name |
| `type` | varchar | NOT NULL | - | `personal` or `team` |
| `icon` | json | NULL | - | |
| `description` | varchar | NULL | - | |
| `createdAt` | timestamp | NOT NULL | `CURRENT_TIMESTAMP(3)` | |
| `updatedAt` | timestamp | NOT NULL | `CURRENT_TIMESTAMP(3)` | |

### project_relation

Links users to projects with roles.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `projectId` | varchar | NOT NULL | - | References `project.id` |
| `userId` | uuid | NOT NULL | - | References `user.id` |
| `role` | varchar | NOT NULL | - | e.g., `project:personalOwner`, `project:editor` |
| `createdAt` | timestamp | NOT NULL | `CURRENT_TIMESTAMP(3)` | |
| `updatedAt` | timestamp | NOT NULL | `CURRENT_TIMESTAMP(3)` | |

**Primary key:** (`projectId`, `userId`)

**Common query:** Find a user's personal project:
```sql
SELECT "projectId" FROM project_relation
WHERE "userId" = $1 AND role = 'project:personalOwner'
```

### shared_credentials

Links credentials to projects, enabling credential sharing.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `credentialsId` | varchar | NOT NULL | - | References credential entity |
| `projectId` | varchar | NOT NULL | - | References `project.id` |
| `role` | text | NOT NULL | - | `credential:owner` or `credential:user` |
| `createdAt` | timestamp | NOT NULL | `CURRENT_TIMESTAMP(3)` | |
| `updatedAt` | timestamp | NOT NULL | `CURRENT_TIMESTAMP(3)` | |

**Primary key:** (`credentialsId`, `projectId`)

**Template project for default credentials:** `5wB8K4Dwm33EnlQ1`

When creating a new user, copy credentials from the template project:
```sql
INSERT INTO shared_credentials ("credentialsId", "projectId", role, "createdAt", "updatedAt")
SELECT "credentialsId", $1, 'credential:user', NOW(), NOW()
FROM shared_credentials
WHERE "projectId" = '5wB8K4Dwm33EnlQ1'
ON CONFLICT ("credentialsId", "projectId") DO NOTHING
```

## Chat Hub Tables

Tables for the AI chat functionality in the console.

### chat_hub_sessions

Chat conversation sessions.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NOT NULL | - | **Primary key** |
| `title` | varchar | NOT NULL | - | Conversation title |
| `ownerId` | uuid | NOT NULL | - | References `user.id` |
| `agentId` | varchar | NULL | - | Agent used for this chat |
| `agentName` | varchar | NULL | - | |
| `provider` | varchar | NULL | - | AI provider (e.g., "openai") |
| `model` | varchar | NULL | - | Model name (e.g., "gpt-4") |
| `workflowId` | varchar | NULL | - | Associated n8n workflow |
| `credentialId` | varchar | NULL | - | |
| `tools` | json | NOT NULL | `[]` | Enabled tools |
| `lastMessageAt` | timestamp | NULL | - | |
| `createdAt` | timestamp | NOT NULL | `CURRENT_TIMESTAMP(3)` | |
| `updatedAt` | timestamp | NOT NULL | `CURRENT_TIMESTAMP(3)` | |

### chat_hub_messages

Individual messages in chat sessions.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NOT NULL | - | **Primary key** |
| `sessionId` | uuid | NOT NULL | - | References `chat_hub_sessions.id` |
| `type` | varchar | NOT NULL | - | `user`, `assistant`, `system` |
| `name` | varchar | NOT NULL | - | Sender name |
| `content` | text | NOT NULL | - | Message content |
| `status` | varchar | NOT NULL | `'success'` | Message status |
| `provider` | varchar | NULL | - | AI provider |
| `model` | varchar | NULL | - | Model used |
| `agentId` | varchar | NULL | - | Agent that responded |
| `workflowId` | varchar | NULL | - | |
| `executionId` | integer | NULL | - | n8n execution ID if triggered |
| `attachments` | json | NULL | - | File attachments |
| `previousMessageId` | uuid | NULL | - | For threading |
| `revisionOfMessageId` | uuid | NULL | - | If this is an edit |
| `retryOfMessageId` | uuid | NULL | - | If this is a retry |
| `createdAt` | timestamp | NOT NULL | `CURRENT_TIMESTAMP(3)` | |
| `updatedAt` | timestamp | NOT NULL | `CURRENT_TIMESTAMP(3)` | |

### chat_hub_agents

Custom AI agents for the chat hub.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NOT NULL | - | **Primary key** |
| `name` | varchar | NOT NULL | - | Agent name |
| `description` | varchar | NULL | - | |
| `systemPrompt` | text | NOT NULL | - | System prompt for the agent |
| `ownerId` | uuid | NOT NULL | - | References `user.id` |
| `provider` | varchar | NOT NULL | - | AI provider |
| `model` | varchar | NOT NULL | - | Model to use |
| `credentialId` | varchar | NULL | - | |
| `tools` | json | NOT NULL | `[]` | Available tools |
| `createdAt` | timestamp | NOT NULL | `CURRENT_TIMESTAMP(3)` | |
| `updatedAt` | timestamp | NOT NULL | `CURRENT_TIMESTAMP(3)` | |

## Assistant Profiles

User-specific AI assistant configuration.

### assistant_profiles

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NOT NULL | `gen_random_uuid()` | **Primary key** |
| `user_id` | uuid | NOT NULL | - | References `user.id` |
| `client` | varchar | NOT NULL | - | Client key |
| `name` | varchar | NULL | `'Senior Marketing Assistant'` | Assistant display name |
| `personality` | varchar | NULL | `'professional'` | Tone/style |
| `goals` | text | NULL | - | Assistant goals |
| `instructions` | text | NULL | - | Custom instructions |
| `default_audience` | varchar | NULL | - | Target audience |
| `default_language` | varchar | NULL | `'nl'` | Default output language |
| `is_default` | boolean | NULL | `false` | Is this the default profile |
| `created_at` | timestamp | NULL | `now()` | |
| `updated_at` | timestamp | NULL | `now()` | |

## Relationships Diagram

```
portal_client (key) ─────┐
                         │
                         ├──< portal_user (client_key)
                         │
user (id) ───────────────┼──< portal_user (n8n_user_id)
    │                    │
    ├──< project_relation (userId)
    │         │
    │         └──> project (id)
    │                  │
    │                  └──< shared_credentials (projectId)
    │
    ├──< chat_hub_sessions (ownerId)
    │         │
    │         └──< chat_hub_messages (sessionId)
    │
    ├──< chat_hub_agents (ownerId)
    │
    └──< assistant_profiles (user_id)
```

## Common Operations

### Create a new user (full flow)

1. Create n8n user via API → get `user.id`
2. Query `project_relation` to get user's `projectId`
3. Generate `client_key` slug from company name
4. Insert into `portal_client` (if new company)
5. Insert into `portal_user`
6. Copy credentials from template project to user's project

### Check user session

```sql
SELECT u.id, u.email, pu.client, pu.role, pu.plan
FROM "user" u
JOIN portal_user pu ON u.id = pu.n8n_user_id
WHERE u.id = $1
```
