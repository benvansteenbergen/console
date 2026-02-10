# n8n Workflow Mapping

This document maps console API routes → n8n webhooks → n8n workflow names, providing full visibility into both sides of the integration.

## Console API → Webhook → Workflow

### Authentication & User

| Console Route | Webhook | Workflow Name | Key Nodes |
|---------------|---------|---------------|-----------|
| `/api/auth/me` | `portal-userinfo` | portal-userinfo | webhook, executeWorkflow, respondToWebhook |
| `/api/credits` | `portal-usage` | portal-usage | webhook, postgres, respondToWebhook |
| `/api/settings` | `portal-settings` | portal-settings | webhook, postgres, respondToWebhook |

### Agents & Content Types

| Console Route | Webhook | Workflow Name | Key Nodes |
|---------------|---------|---------------|-----------|
| `/api/content-writers` | `portal-agents` | portal-agents | webhook, postgres, respondToWebhook |
| `/api/content-forms` | `portal-agents` | portal-agents | (same workflow, filtered by type) |
| `/api/portal-agents` | `portal-agents` | portal-agents | webhook, postgres, respondToWebhook |
| `/api/content-automations` | `portal-automations` | portal-automations | webhook, postgres, respondToWebhook |
| `/api/content-formats` | `content-formats` | content-formats | webhook, googleDrive, code, respondToWebhook |
| `/api/admin/toggle-agent` | `toggle-agent-enabled` | toggle-agent | webhook, postgres, respondToWebhook |

### Google Drive Operations

| Console Route | Webhook | Workflow Name | Key Nodes |
|---------------|---------|---------------|-----------|
| `/api/content-storage` | `content-storage` | content-storage | webhook, googleDrive, code, merge, respondToWebhook |
| `/api/drive/file` | `load-document` | load-document | webhook, httpRequest, code, respondToWebhook |
| `/api/drive/commit` | `save-document` | save-document | webhook, httpRequest, markdown, code, respondToWebhook |
| `/api/move-file` | `move-file` | move-file | webhook, googleDrive, respondToWebhook |
| `/api/create-folder` | `create-folder` | create-folder | webhook, googleDrive, respondToWebhook |
| `/api/delete-document` | `delete-document` | delete-document | webhook, googleDrive, respondToWebhook |

### Live Chat / Conversations

| Console Route | Webhook | Workflow Name | Key Nodes |
|---------------|---------|---------------|-----------|
| `/api/live/conversations` | `live-conversations` | live-conversations | webhook, postgres, respondToWebhook |
| `/api/live/messages` (GET) | `live-messages` | live-messages | webhook, postgres, if, respondToWebhook |
| `/api/live/messages` (POST) | `live-message` | live-message | webhook, postgres, agent, lmChatAnthropic, respondToWebhook |
| `/api/live/unread-count` | `live-unread-count` | live-unread-count | webhook, postgres, respondToWebhook |
| `/api/live/mark-read` | `live-mark-read` | live-mark-read | webhook, postgres, if, respondToWebhook |
| `/api/live/archive` | `live-archive` | live-archive | webhook, postgres, if, respondToWebhook |
| `/api/live/brief` | `live-brief` | (see live-message) | handled within live-message workflow |
| `/api/live/production` | `live-production` | live-production | webhook, postgres, agent, vectorStoreWeaviate, respondToWebhook |
| `/api/live/assistant-profile` (GET) | `live-assistant-profile` | live-assistant-profile | webhook, postgres, respondToWebhook |
| `/api/live/assistant-profile` (POST) | `live-assistant-profile` | live-assistant-profile-save | webhook, postgres, code, respondToWebhook |
| `/api/chat` | `review-chat` | review-agent | webhook, agent, lmChatOpenAi, memoryBufferWindow, respondToWebhook |

### Knowledge Base

| Console Route | Webhook | Workflow Name | Key Nodes |
|---------------|---------|---------------|-----------|
| `/api/knowledge-base/documents` | `knowledge-base-list` | knowledge-base-list | webhook, httpRequest, code, merge, respondToWebhook |
| `/api/knowledge-base/upload` | `knowledge-base-upload` | knowledge-base-upload | webhook, documentDefaultDataLoader, embeddingsGoogleGemini, vectorStoreWeaviate, respondToWebhook |
| `/api/knowledge-base/documents/[id]` | `knowledge-base-delete` | knowledge-base-delete | webhook, httpRequest, code, if, respondToWebhook |
| `/api/knowledge-base/analyze` | `knowledge-base-analyze` | knowledge-base-analyze | webhook, agent, lmChatOpenAi, respondToWebhook |
| `/api/knowledge-base/extract-text` | `knowledge-base-extract-text` | knowledge-base-extract-text | webhook, extractFromFile, respondToWebhook |
| `/api/knowledge-base/live` | `knowledge-base-live` | knowledge-base-live | webhook, agent, vectorStoreWeaviate, lmChatAnthropic, respondToWebhook |

### Data Sources

| Console Route | Webhook | Workflow Name | Key Nodes |
|---------------|---------|---------------|-----------|
| `/api/datasources/linkedin-validate` | `datasource-linkedin-validate` | linkedin-profile-validate | webhook, agent, lmChatOpenAi, if, respondToWebhook |
| `/api/datasources/linkedin-profile` | `datasource-linkedin-profile` | linkedin-profile | webhook, postgres, respondToWebhook |
| `/api/datasources/linkedin-profile-analyse` | `datasource-linkedin-profile-analyse` | linkedin-profile-analyse | webhook, agent, lmChatOpenAi, postgres, respondToWebhook |
| `/api/datasources/linkedin-personal` | `datasource-linkedin-personal` | (see linkedin-profile) | handled within linkedin-profile workflow |
| `/api/datasources/linkedin-company` | `datasource-linkedin-company` | linkedin-company | webhook, postgres, if, respondToWebhook |
| `/api/datasources/linkedin-company-profile` | `datasource-linkedin-company-profile` | linkedin-company-profile | webhook, postgres, respondToWebhook |
| `/api/datasources/linkedin-company-analyse` | `datasource-linkedin-company-analyse` | linkedin-company-analyse | webhook, agent, lmChatOpenAi, postgres, respondToWebhook |
| `/api/datasources/website` | `datasource-website` | website / company | webhook, postgres, if, respondToWebhook |
| `/api/tone-of-voice` | `tone-of-voice` | tone-of-voice | webhook, googleDrive, code, respondToWebhook |

---

## Form Workflows (Content Creation)

These workflows are triggered by form submissions embedded in the console, not by API calls.

### Blog Posts

| Form Path | Workflow Name | Client | Key Nodes |
|-----------|---------------|--------|-----------|
| `blogpost-hpr` | blogpost-form | Harper & Yve | formTrigger, n8n, form, executeWorkflow, markdown, httpRequest |
| `blogpost-stn` | blogpost-form | The Stone | formTrigger, n8n, form, executeWorkflow, markdown, httpRequest |
| `blogpost-wdk` | blogpost-form | Wadinko | formTrigger, n8n, form, executeWorkflow, markdown, httpRequest |
| `blogpost-emo` | blogpost-form | Emotion | formTrigger, n8n, form, executeWorkflow, markdown, httpRequest |
| `blogpost-vtw` | blogpost-form | Vitriwand | formTrigger, n8n, form, executeWorkflow, markdown, httpRequest |
| `blogpost-demo` | blogpost-form | Demo | formTrigger, n8n, form, executeWorkflow, markdown, httpRequest |
| `blogpost-demo-emotion` | blogpost-form-emotionportal | Demo Emotion | formTrigger, n8n, form, executeWorkflow, markdown, httpRequest |

### Social Media Posts

| Form Path | Workflow Name | Client | Platform |
|-----------|---------------|--------|----------|
| `linkedin-emo` | linkedinpost-form | Emotion | LinkedIn |
| `linkedin-vtw` | linkedinpost-form | Vitriwand | LinkedIn |
| `linkedin-wdk` | linkedinpost-form | Wadinko | LinkedIn |
| `instagram-hpr` | instagrampost-form | Harper & Yve | Instagram |
| `instagram-stn` | instagrampost-form | The Stone | Instagram |
| `facebook-drk` | facebookpost-form | Drakenboot | Facebook |

### Newsletters

| Form Path | Workflow Name | Client |
|-----------|---------------|--------|
| `newsletter-stn` | newsletter-form | The Stone |
| `newsletter-hpr` | newsletter-form | Harper & Yve |
| `newsletter-drk` | newsletter-form | Drakenboot |

### Other Content Types

| Form Path | Workflow Name | Client | Content Type |
|-----------|---------------|--------|--------------|
| `lineup-drk` | lineup-post | Drakenboot | Artist lineup announcement |
| `interview-wdk` | interview-form | Wadinko | Interview |
| `category-text` | category-seo-form | (generic) | Category SEO text |
| `category-text-stn` | categoryseo-form | The Stone | Category SEO text |
| `projectcase-vtw` | projectcase-form | Vitriwand | Project case study |
| `websitecase-emo` | websitecase-form | Emotion | Website case study |

---

## Workflow Patterns

### Standard Webhook Pattern

Most webhook workflows follow this pattern:

```
Webhook Trigger
    │
    ▼
Execute Workflow (sub-workflow for auth/validation)
    │
    ▼
[Business Logic - Postgres/Google Drive/AI Agent]
    │
    ▼
Respond to Webhook (JSON response)
```

### Standard Form Pattern

Content creation forms follow this pattern:

```
Form Trigger (multi-page form)
    │
    ▼
Get Available Agents (n8n API)
    │
    ▼
Code: Build dropdown options
    │
    ▼
Form: Agent selection page
    │
    ▼
Execute Workflow (call selected agent)
    │
    ▼
Markdown: Convert output to HTML
    │
    ▼
HTTP Request: Upload to Google Drive
    │
    ▼
Form: Redirect to progress page
```

### AI-Powered Workflows

Workflows with AI capabilities use these node combinations:

| Feature | Nodes Used |
|---------|------------|
| Chat/Completion | `lmChatOpenAi` or `lmChatAnthropic` |
| Agent reasoning | `agent` + LM node |
| Knowledge retrieval | `vectorStoreWeaviate` + `embeddingsGoogleGemini` |
| Document processing | `documentDefaultDataLoader` + `extractFromFile` |
| Memory | `memoryBufferWindow` |

---

## Sub-Workflows

These workflows are called by other workflows via `executeWorkflow` node:

| Workflow | Purpose | Called By |
|----------|---------|-----------|
| Auth validation | Validate JWT and get user info | Most webhook workflows |
| Content writer agents | Generate content with specific persona | Form workflows |
| Content auditor | Review and improve content | Form workflows |

---

## Adding New Workflows

When creating a new workflow:

1. **Webhook workflows:**
   - Add Webhook trigger with meaningful path
   - Call auth sub-workflow first
   - End with Respond to Webhook
   - Create matching API route in console
   - Document in this file

2. **Form workflows:**
   - Use Form Trigger with styled form
   - Follow established pattern for agent selection
   - Save output to Google Drive
   - Redirect to progress page
   - Tag workflow appropriately for portal-agents listing
