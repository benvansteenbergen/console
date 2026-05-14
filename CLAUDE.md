# CLAUDE.md – Project Overview for AI Agents

This file provides a comprehensive overview of the Wingsuite Console project for AI agents like Claude or Copilot. It outlines the structure, architecture, conventions, and integration points to help AI understand and contribute effectively.

---

## Project Summary

**Project Name:** Wingsuite Console
**Framework:** Next.js 15.5.9 (App Router)
**Language:** TypeScript (strict mode enabled)
**Node Version:** 24.0.3
**Package Manager:** pnpm 9.0.0
**Styling:** Tailwind CSS 3.4.4
**Deployment:** Railway
**Auth:** Session-based JWT via n8n + edge middleware
**Content Storage:** Google Drive API
**Knowledge Base:** Weaviate vector database
**Workflow Orchestration:** n8n (workflow.wingsuite.io)
**Testing:** Vitest with @vitest/coverage-v8
**Linting:** ESLint + Prettier + Husky

---

## Development Setup

### Prerequisites
- Node.js 24.0.3+
- pnpm 9.0.0+
- Access to n8n instance
- Environment variables configured

### Installation
```bash
pnpm install
```

### Environment Variables
Create a `.env.local` file in the root with:

```bash
N8N_BASE_URL=https://workflow.sampledomain.io     # n8n workflow instance URL
CONSOLE_BASE_URL=https://console.sampledomain.io  # This console app URL
JWT_SECRET=changeme                                # Secret for JWT verification
N8N_API_KEY=                                       # Optional: Direct n8n API access
WEAVIATE_URL=https://weaviate-instance.up.railway.app/v1  # Weaviate vector DB URL
```

### Running Locally
```bash
pnpm dev             # Start development server (default: http://localhost:3000)
pnpm build           # Build for production
pnpm start           # Start production server (uses $PORT env var)
pnpm lint            # Run ESLint with max-warnings=0
pnpm test            # Run Vitest tests
pnpm test:watch      # Run tests in watch mode
pnpm test:coverage   # Run tests with coverage report
```

### Git Hooks
- Husky is configured for pre-commit hooks
- Run `pnpm prepare` after cloning to set up hooks

---

## File Structure

```
console/
├── .husky/                    # Git hooks (pre-commit, etc.)
├── adr/                       # Architecture Decision Records
├── docs/                      # Detailed documentation
│   ├── OVERVIEW.md            # Project overview
│   ├── RATE_LIMITING.md       # Rate limiting documentation
│   ├── N8N_LIVE_CHAT_INTEGRATION.md  # Chat integration guide
│   └── n8n/                   # n8n integration docs
│       ├── README.md          # Integration overview
│       ├── database-schema.md # PostgreSQL table definitions
│       ├── workflow-mapping.md# Workflow mapping
│       ├── workflows.md       # Key n8n workflow documentation
│       └── scheduler-agent-prompt.md # Scheduler agent system prompt & tool def
├── app/                       # Next.js 15 App Router
│   ├── (public)/              # Unauthenticated routes
│   │   └── login/             # Login page with branding
│   ├── (protected)/           # Authenticated routes (requires SessionProvider)
│   │   ├── dashboard/         # User home: credits, agents, content tiles
│   │   ├── content/[...path]/ # Google Drive folder navigation (nested subfolders)
│   │   ├── editor/[fileId]/   # Document editor with DocCanvas + ChatPane
│   │   ├── live/              # LiveChat AI assistant page
│   │   ├── settings/          # Settings hub
│   │   │   └── agents/        # Agent management (toggle on/off)
│   │   ├── company-private-storage/ # Knowledge base document uploads
│   │   └── create/[type]/     # Workflow creation flow (form → progress)
│   │       ├── page.tsx       # Form iframe embed
│   │       └── progress/      # JourneyCard polling view
│   ├── api/                   # API Routes (~44 endpoints)
│   │   ├── auth/              # login, logout, me
│   │   ├── chat/              # POST: AI chat streaming
│   │   ├── credits/           # GET: usage stats
│   │   ├── content-sessions/  # GET: pending content sessions from scheduler
│   │   ├── content-storage/   # GET: Google Drive files by folder
│   │   ├── content-forms/     # GET: available form types
│   │   ├── content-formats/   # GET: available content formats
│   │   ├── content-writers/   # GET: available writer agents
│   │   ├── content-automations/ # GET: available automation agents
│   │   ├── create-folder/     # POST: create Drive folder
│   │   ├── delete-document/   # POST: delete Drive document
│   │   ├── move-file/         # POST: move file between folders
│   │   ├── drive/             # file (GET), commit (POST)
│   │   ├── datasources/       # LinkedIn & website data extraction (8 routes)
│   │   ├── knowledge-base/    # Weaviate KB: upload, analyze, documents, extract-text, live
│   │   ├── live/              # LiveChat: conversations, messages, brief, archive, production, assistant-profile, unread-count
│   │   ├── live-executions/   # Execution tracking: list, [id] detail
│   │   ├── portal-agents/     # GET: list available agents
│   │   ├── settings/          # GET settings, POST toggle-agent
│   │   └── tone-of-voice/     # GET: tone of voice settings
│   ├── layout.tsx             # Root layout with BrandingProvider
│   ├── error.tsx              # Error boundary
│   └── global-error.tsx       # Global error handler
├── components/
│   ├── ui/                    # Reusable UI primitives
│   │   ├── button.tsx
│   │   ├── separator.tsx
│   │   ├── textarea.tsx
│   │   ├── close-window-button.tsx
│   │   └── PageLoader.tsx     # Full-page loading state
│   ├── Agents/                # Agent grid display components
│   │   ├── ContentwriterGrid.tsx
│   │   ├── ContentformGrid.tsx
│   │   └── ContentautomationGrid.tsx
│   ├── editor/                # Editor-specific components
│   │   ├── DocCanvas.tsx      # Markdown renderer with diff preview
│   │   └── ChatPane.tsx       # AI chat sidebar for document editing
│   ├── SessionProvider.tsx    # Client context for auth state (SWR)
│   ├── BrandingProvider.tsx   # Client context for multi-brand theming
│   ├── AuthGate.tsx           # Protected route wrapper
│   ├── Sidebar.tsx            # Main navigation sidebar with collapsible sections
│   ├── JourneyCard.tsx        # Animated workflow trace timeline
│   ├── ContentSessionBanner.tsx # Dashboard banner for pending content sessions
│   ├── FolderGrid.tsx         # Google Drive thumbnail grid with delete/move/dates
│   ├── LiveChat.tsx           # Full-featured AI chat interface (supports deep-linking)
│   ├── DocumentLibrary.tsx    # Knowledge base document list with cluster organization
│   ├── KnowledgeBaseOverview.tsx # KB quality overview by cluster
│   ├── CreateFolderButton.tsx # Folder creation modal
│   ├── NavigationProgress.tsx # Page transition progress bar
│   ├── ErrorBoundary.tsx      # React error boundary component
│   └── GlassLoader.tsx        # Animated loading overlay
├── lib/
│   ├── branding.ts            # Brand detection and config (wingsuite, emotion)
│   ├── utils.ts               # Utility functions (cn for Tailwind merge)
│   ├── api-utils.ts           # API helpers (safeJsonParse, fetchFromN8n)
│   └── contentFormatQuestions.ts # Content format questionnaire configurations
├── middleware.ts              # Edge middleware for session-based route protection
├── tests/                     # Vitest test files
│   ├── smoke.test.ts
│   ├── api/
│   │   ├── auth-me.test.ts
│   │   ├── credits.test.ts
│   │   └── content-storage.test.ts
│   └── lib/
│       ├── branding.test.ts
│       └── utils.test.ts
├── public/
│   ├── wingsuite/             # Wingsuite brand assets
│   ├── emotion/               # AI Motion brand assets
│   └── forms/                 # Static form assets
├── package.json
├── tsconfig.json              # TypeScript config (strict: true)
├── next.config.js             # Next.js configuration
├── vitest.config.mts          # Vitest configuration
├── tailwind.config.js         # Tailwind CSS configuration
├── eslint.config.mjs          # ESLint configuration
├── postcss.config.js          # PostCSS configuration
└── CLAUDE.md                  # This file
```

---

## Core Concepts

### Authentication & Sessions

#### Session Cookie Flow
1. User logs in via `/api/auth/login` (credentials sent to n8n)
2. n8n validates and returns JWT
3. JWT stored as `session` cookie (HTTP-only, secure)
4. All subsequent requests include cookie automatically
5. Cookie passed to n8n as `auth=<jwt>` header

#### Edge Middleware
- **File:** `middleware.ts`
- Checks for `session` cookie on protected routes
- Redirects to `/login?returnTo={originalPath}` if missing (preserves deep-links)
- **Protected routes:** `/dashboard/*`, `/editor/*`, `/content/*`, `/live/*`, `/settings/*`, `/create/*`, `/company-private-storage/*`

#### Deep-Link Support
- Middleware passes `returnTo` query param to login page when redirecting unauthenticated users
- Login page forwards `returnTo` as hidden form field
- Login API redirects to `returnTo` (validated to start with `/`) instead of hardcoded `/dashboard`
- Enables external links (e.g. WhatsApp notifications) to deep-link into specific pages like `/live?conversation={id}`

#### SessionProvider (Client-Side)
- **File:** `components/SessionProvider.tsx`
- **Technology:** SWR with 5-minute revalidation interval
- **API:** `/api/auth/me` returns `{ email, client, role, valid }`
- **Auto-redirect:** Client-side push to `/login` if unauthenticated

```typescript
interface SessionData {
  email?: string;
  client?: string;
  role?: string;
  valid: 'true' | 'false';
}

// Usage in components
const { loading, unauth, data } = useSession();
```

### LiveChat System

The primary AI interaction surface. Users have conversations with an AI assistant that can access the knowledge base.

- **Component:** `components/LiveChat.tsx`
- **Modes:** `sandbox` (free chat) and `planning` (structured content creation)
- **Planning modes:** `simple` and `advanced` — build a brief before content generation
- **Personality:** Switchable between `general` and `me` (personalized)
- **Persistence:** Conversation ID stored in localStorage
- **Deep-linking:** Supports `?conversation={id}` URL param to open a specific conversation (used by content session banner)
- **Backend:** All messages proxied through n8n via `/api/live/*` routes
- **Conversation statuses:** `pending` (created by scheduler, not yet started), `active` (in progress), `archived`
- **Features:**
  - Streaming responses
  - Knowledge base context sources cited in metadata
  - Assistant profiles with avatar, goals, instructions, language, audience
  - Conversation archive and unread counts
  - Production workflow for generating final content

### Content Scheduling

Automated content scheduling cycle powered by an n8n planner agent.

- **Flow:** Schedule triggers → n8n creates conversation (status=`pending`, mode=`planning`, pre-filled brief + first message) → console shows banner → user clicks → gathering agent takes over
- **Dashboard banner:** `components/ContentSessionBanner.tsx` — polls `/api/content-sessions` every 60s, shows cards for pending sessions
- **API:** `GET /api/content-sessions` → proxies to n8n `/webhook/content-sessions` (queries `live_conversations WHERE status = 'pending'`)
- **Scheduler agent:** See `docs/n8n/scheduler-agent-prompt.md` for system prompt and `create_session` tool definition
- **Database:** Uses `live_conversations` table (status column) and `live_messages` table

### Knowledge Base (Weaviate)

Document-powered context for AI conversations and content generation.

- **Storage:** Weaviate vector database
- **Upload:** PDF, DOCX text extraction via `mammoth`, `pdf-parse`
- **Organization:** Predefined clusters (general_company_info, product_sheets, pricing_sales, documentation, marketing_materials, case_studies, technical_specs, training_materials)
- **Quality tiers:** Based on chunk count per cluster (0 = unavailable, <51 = limited, <201 = good, 201+ = excellent)
- **Components:** `DocumentLibrary.tsx` (list/manage), `KnowledgeBaseOverview.tsx` (quality dashboard)

### Credits & Usage Tracking

- **Endpoint:** `GET /api/credits`
- **Upstream:** n8n `/webhook/portal-usage`

```typescript
interface CreditsResponse {
  plan: string;              // e.g., "Pro", "Free"
  credits_used: number;
  plan_credits: number;
  over_limit: boolean;
}
```

### Multi-Brand System

- **File:** `lib/branding.ts`
- **Brands:**
  - **wingsuite:** Primary brand (default fallback) — `console.wingsuite.io`
  - **emotion:** AI Motion white-label — `ai.emotion.nl`
- **Detection:** Hostname matching at runtime via `detectBranding(hostname)`
- **Context:** `useBranding()` hook from `BrandingProvider.tsx`

```typescript
interface Branding {
  name: string;          // Display name
  domain: string;        // Hostname for detection
  logo: string;          // Path to logo SVG
  loginImage: string;    // Hero image for login page
  loginBg: string;       // Background color hex
  primaryColor: string;  // Theme primary color hex
}
```

### Data Sources

LinkedIn and website data extraction for AI personalization.

- **LinkedIn:** Profile capture, company page capture, AI-powered analysis
- **Website:** Content extraction via `@mozilla/readability` and `cheerio`
- **Routes:** 8 endpoints under `/api/datasources/`

---

## API Endpoints Reference

### Authentication
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/auth/login` | POST | Authenticate user, set session cookie |
| `/api/auth/logout` | POST | Clear session cookie |
| `/api/auth/me` | GET | Validate session, return user info |

### Content Sessions & Scheduling
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/content-sessions` | GET | List pending content sessions (from scheduler) |

### Content & Storage
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/content-storage` | GET | List Drive files by folder |
| `/api/content-forms` | GET | Available form types |
| `/api/content-formats` | GET | Available content formats |
| `/api/content-writers` | GET | Available writer agents |
| `/api/content-automations` | GET | Available automation agents |
| `/api/create-folder` | POST | Create new Drive folder |
| `/api/delete-document` | POST | Delete Drive document |
| `/api/move-file` | POST | Move file between folders |
| `/api/drive/file` | GET | Fetch single Drive file metadata |
| `/api/drive/commit` | POST | Commit document changes |

### LiveChat
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/live/conversations` | GET | List conversations |
| `/api/live/messages` | GET, POST | Get/send chat messages |
| `/api/live/mark-read` | POST | Mark messages as read |
| `/api/live/archive` | POST | Archive conversation |
| `/api/live/unread-count` | GET | Get unread message count |
| `/api/live/brief` | GET, POST | Conversation briefs for planning |
| `/api/live/assistant-profile` | GET, POST | Manage assistant personality/settings |
| `/api/live/production` | POST | Trigger production content generation |

### Knowledge Base
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/knowledge-base/upload` | POST | Upload documents to Weaviate |
| `/api/knowledge-base/analyze` | POST | Analyze uploaded documents |
| `/api/knowledge-base/extract-text` | POST | Extract text from PDF/DOCX |
| `/api/knowledge-base/documents` | GET | List knowledge base documents |
| `/api/knowledge-base/documents/[id]` | DELETE | Delete specific document |
| `/api/knowledge-base/live` | POST | Live knowledge base operations |

### Data Sources
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/datasources/linkedin-profile` | GET | Get LinkedIn profile data |
| `/api/datasources/linkedin-profile-analyse` | POST | Analyze LinkedIn profile |
| `/api/datasources/linkedin-personal` | POST | Fetch personal LinkedIn data |
| `/api/datasources/linkedin-company` | POST | Fetch LinkedIn company data |
| `/api/datasources/linkedin-company-analyse` | POST | Analyze company data |
| `/api/datasources/linkedin-company-profile` | GET | Get company profile |
| `/api/datasources/linkedin-validate` | POST | Validate LinkedIn credentials |
| `/api/datasources/website` | POST | Extract website content |

### Settings & Agents
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/settings` | GET | Get user settings |
| `/api/settings/toggle-agent` | POST | Toggle agent on/off |
| `/api/portal-agents` | GET | List available agents |
| `/api/tone-of-voice` | GET | Get tone of voice settings |

### Other
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/credits` | GET | Fetch credit usage stats |
| `/api/chat` | POST | AI chat streaming (editor) |
| `/api/live-executions` | GET | List recent executions |
| `/api/live-executions/[id]` | GET | Get execution trace with customData |

---

## Key Components

### ContentSessionBanner
- **File:** `components/ContentSessionBanner.tsx`
- **Purpose:** Dashboard banner for pending content gathering sessions
- **Features:**
  - SWR polling every 60s from `/api/content-sessions`
  - Renders card per pending session with content type, message preview
  - Links to `/live?conversation={id}` for deep-linking
  - Returns `null` when no sessions (graceful degradation)

### LiveChat
- **File:** `components/LiveChat.tsx`
- **Purpose:** Full-featured AI conversation interface
- **Features:**
  - Sandbox and planning conversation modes
  - Simple/advanced planning with brief building
  - Personality switching (general/me)
  - Knowledge base context with source citations
  - Assistant profile management (avatar, goals, language, audience)
  - Conversation history, archive, unread counts
  - Deep-linking via `?conversation={id}` URL parameter
  - Streaming responses with ReactMarkdown rendering

### DocCanvas
- **File:** `components/editor/DocCanvas.tsx`
- **Purpose:** Markdown document viewer with diff preview
- **Features:**
  - Renders markdown with `react-markdown`
  - Block-level diff highlighting using `diff-match-patch`
  - Preview mode for suggested edits (yellow highlights)
  - Loading overlay with spinner

### ChatPane
- **File:** `components/editor/ChatPane.tsx`
- **Purpose:** AI-powered document editing assistant
- **Features:**
  - Edit and feedback modes
  - Persona selection
  - Preview/accept/discard workflow for suggested changes
  - Conversation persistence via localStorage

### FolderGrid
- **File:** `components/FolderGrid.tsx`
- **Purpose:** Google Drive thumbnail gallery
- **Features:**
  - Auto-refresh every 5 seconds via SWR
  - Hover overlay with actions: Review, Open, Download (PDF/DOCX/TXT)
  - "NEW" badge for unseen files
  - Relative date labels (Today, Yesterday, This week, This month, Last month, +1 month) via `createdTime`
  - Subfolder navigation support (folderId + parentFolderId)
  - Delete and move file operations

### JourneyCard
- **File:** `components/JourneyCard.tsx`
- **Purpose:** Animated workflow execution timeline
- **Features:**
  - Polls `/api/live-executions/[id]` every 2s while running
  - Typewriter effect for each new step
  - Reorders steps: "Start" first, "Finished" last
  - Auto-links URLs in summaries

### Sidebar
- **File:** `components/Sidebar.tsx`
- **Purpose:** Main navigation with collapsible sections
- **Features:**
  - SWR-driven: forms, folders, unread count (30s refresh)
  - Heroicons throughout
  - Branding-aware (logo, colors)
  - Navigation progress integration

### DocumentLibrary & KnowledgeBaseOverview
- **Files:** `components/DocumentLibrary.tsx`, `components/KnowledgeBaseOverview.tsx`
- **Purpose:** Knowledge base document management and quality dashboard
- **Features:**
  - Cluster-based organization with predefined labels
  - Chunk-based quality scoring per cluster
  - Document upload, delete operations

---

## Dependencies Overview

### Core Framework
- **next** (15.5.9) – React framework with App Router
- **react** (18.3.1) + **react-dom** – UI library
- **typescript** – Type safety (strict mode)

### UI & Styling
- **tailwindcss** (3.4.4) – Utility-first CSS
- **@tailwindcss/typography** – Prose styling for markdown
- **clsx** + **tailwind-merge** – Conditional class merging
- **framer-motion** – Animation library
- **@heroicons/react** – Icon library

### Data Fetching & State
- **swr** – Client-side data fetching with cache
- No global state library (Context API + SWR suffices)

### Content Processing
- **react-markdown** – Markdown to React
- **diff-match-patch** – Text diffing for DocCanvas
- **mammoth** – DOCX text extraction
- **pdf-parse** – PDF text extraction
- **@mozilla/readability** + **cheerio** + **jsdom** – Web content extraction

### Knowledge Base
- **weaviate-ts-client** – Weaviate vector database client

### Authentication
- **jsonwebtoken** – JWT parsing (server-side)
- **cookie** – Cookie parsing helpers

### Development Tools
- **vitest** + **@vitest/coverage-v8** – Test runner with coverage
- **eslint** + plugins – Linting
- **prettier** – Code formatting
- **husky** – Git hooks
- **turbo** – Monorepo task runner (optional)

---

## Configuration

### TypeScript (tsconfig.json)
- **Target:** ES2017
- **Strict mode:** Enabled (`strict: true`)
- **Path alias:** `@/*` maps to `./*`
- **Module resolution:** Node (Next.js plugin enabled)

### Next.js (next.config.js)
- **Remote image patterns:**
  - `lh3.googleusercontent.com/**` (Google Drive thumbnails)
  - `api.dicebear.com/7.x/**` (Avatar generation)

### Tailwind (tailwind.config.js)
- Scans: `app/**/*.{js,ts,jsx,tsx}`, `components/**/*.{js,ts,jsx,tsx}`
- Typography plugin enabled for prose styling

### ESLint (eslint.config.mjs)
- Rules: Next.js, React, TypeScript, Prettier integration
- **Max warnings:** 0 (CI fails on any warnings)

---

## N8N Integration

### API Access (Read + Write)
- **Base URL:** `https://workflow.wingsuite.io`
- **API Key:** Stored in `.env` as `N8N_API_KEY`
- **Access level:** Full read/write access to workflows via REST API
- **List workflows:** `GET /api/v1/workflows`
- **Get workflow:** `GET /api/v1/workflows/{id}`
- **Update workflow:** `PUT /api/v1/workflows/{id}`
- **Auth header:** `X-N8N-API-KEY: {key}`
- **IMPORTANT: Always preserve workflow versions before making changes.** Use the n8n API to fetch the current workflow state before updating, so we can roll back if needed.
- **WARNING: n8n is always production.** There is no staging environment. Changes to workflows immediately affect `console.wingsuite.io` and all active users. The console runs locally for development but n8n does not. Always: (1) save the current workflow state before editing, (2) make changes deliberately, (3) test against production after deploying workflow changes.

> See `docs/n8n/` for comprehensive n8n documentation:
> - `docs/n8n/README.md` - Integration overview
> - `docs/n8n/database-schema.md` - Complete PostgreSQL table definitions
> - `docs/n8n/workflow-mapping.md` - Workflow mapping
> - `docs/n8n/workflows.md` - Key workflow documentation
> - `docs/n8n/scheduler-agent-prompt.md` - Scheduler agent system prompt & tool definition
> - `docs/N8N_LIVE_CHAT_INTEGRATION.md` - LiveChat integration guide

### Authentication Header Pattern
All API routes pass JWT to n8n using the helper in `lib/api-utils.ts`:
```typescript
import { fetchFromN8n, safeJsonParse } from '@/lib/api-utils';

const res = await fetchFromN8n('/webhook/endpoint', jwt);
const data = await safeJsonParse<ResponseType>(res, 'context');
```

Or manually:
```javascript
headers: { cookie: `auth=${jwt};` }
// Some endpoints use `n8n-auth=${jwt};` for direct REST API calls
```

### Key Webhook Endpoints
| n8n Webhook | Purpose |
|-------------|---------|
| `/webhook/portal-userinfo` | Get user session data |
| `/webhook/portal-usage` | Get credit usage |
| `/webhook/content-storage` | List Drive files |
| `/webhook/content-sessions` | List pending content sessions (scheduler) |
| `/webhook/[workflow-name]` | Trigger specific workflow |

### Execution API (REST)
- **Base URL:** `${N8N_BASE_URL}/rest/executions/`
- **Get execution:** `GET /rest/executions/[id]?includeData=true`
- **customData field:** Contains trace steps for `JourneyCard`
- **Authentication:** `cookie: n8n-auth=${jwt};`

### n8n Workflow Building — Hard-Won Lessons

These are specific pitfalls discovered while building workflows via the n8n REST API. **Read this before creating or modifying any workflow.**

#### API Mechanics

- **Creating workflows (`POST /api/v1/workflows`):** The `active` field is **read-only** on creation. Do not include it in the POST body or you get `"request/body/active is read-only"`. Create first, then activate separately via `POST /api/v1/workflows/{id}/activate`.
- **Updating workflows (`PUT /api/v1/workflows/{id}`):** The `settings` object must only contain accepted fields. Fields like `callerPolicy`, `availableInMCP`, `binaryMode` cause `"request/body/settings must NOT have additional properties"`. Safe to send: `{"executionOrder": "v1"}`. Strip all other settings fields.
- **Read-only fields to strip on PUT:** `id`, `createdAt`, `updatedAt`, `versionId`, `activeVersionId`, `versionCounter`, `triggerCount`, `active`, `isArchived`, `homeProject`, `usedCredentials`, `shared`, `tags`, `activeVersion`, `meta`, `staticData`, `pinData`. Also `description` must be a string (not null) — use `""`.
- **Safest PUT payload shape:** Only include `name`, `description` (string), `nodes`, `connections`, `settings`. Strip everything else.
- **Env var loading:** The `.env` file (not `.env.local`) contains `N8N_API_KEY`. Load with `export $(grep N8N_API_KEY .env | xargs)`.

#### Project Ownership & callerPolicy

- **Critical:** The `jwt-validation` sub-workflow (ID: `dbf8RGXgL1Up2KzF`) lives in the **team project** (`5wB8K4Dwm33EnlQ1`, "Wingsuite Root Folder") and has `callerPolicy: "workflowsFromSameOwner"`.
- Any workflow that calls `jwt-validation` via Execute Sub-Workflow **must be in the same team project**. Workflows created via API default to the personal project (`321VasDBaaskkdsDQ`).
- **Transfer workflow to team project:** `PUT /api/v1/workflows/{id}/transfer` with body `{"destinationProjectId": "5wB8K4Dwm33EnlQ1"}`.
- **Always transfer new workflows to the team project immediately after creation.**

#### Node Parameter Formats

- **Anthropic Chat Model:** The `model` parameter requires **Resource Locator format**, not a plain string:
  ```json
  {
    "model": {
      "__rl": true,
      "mode": "list",
      "value": "claude-sonnet-4-5-20250929",
      "cachedResultName": "Claude Sonnet 4.5"
    }
  }
  ```
  Plain string `"claude-sonnet-4-5-20250929"` causes `"Could not get parameter"`.

- **Execute Sub-Workflow `workflowId`:** Also requires Resource Locator format:
  ```json
  {
    "workflowId": {
      "__rl": true,
      "mode": "list",
      "value": "dbf8RGXgL1Up2KzF",
      "cachedResultName": "jwt-validation"
    }
  }
  ```

#### Code Node Limitations

- **No `crypto` module.** `crypto.randomUUID()` is not available in n8n Code nodes. Use a manual UUID v4 generator:
  ```javascript
  function uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
  ```
- **String escaping / backslash corruption:** When writing Code node JavaScript via the n8n REST API, the `!` character gets corrupted to `\!` (backslash + exclamation) during JSON serialization round-trips. This causes `"Invalid or unexpected token"` at runtime.
  - **Never use `!` (logical NOT) in Code node code deployed via API.** Instead:
    - Replace `!value` with `value === false` or `value === undefined` or `value === null`
    - Replace `if (!x)` with `if (x === null || x === undefined)` or `if (x == null)`
    - Replace `!!x` with `Boolean(x)`
  - If you must fix an existing `\!` in a deployed workflow, use hex-level replacement in Python: `code.replace('\x5c\x21', '\x21')`. Normal string `.replace('\\!', '!')` doesn't reliably work due to Python escape layer confusion.
  - **Root cause:** The n8n API stores jsCode as a JSON string value. When the JSON passes through `JSON.stringify` → API → `JSON.parse` → storage → retrieval → `JSON.stringify` cycles, `!` sometimes picks up a leading backslash. This is an n8n API bug.

#### Data Flow Between Nodes

- **`$json` always refers to the output of the PREVIOUS node in the chain**, not earlier nodes. If your chain is `A → B → C → D`, then in node D, `$json` is C's output.
- **To reference a specific earlier node:** Use `$('NodeName').item.json.fieldName`. Example: `$('Fetch User').item.json.client`.
- **Common mistake:** After a Save/Update node (e.g., Postgres INSERT), `$json` becomes the Postgres result (`{"success": true}`), losing all prior data. Always use explicit node references: `$('Parse Response').item.json.responseJson`.

#### Database Type Mismatches

- **`portal_user.n8n_user_id` is UUID type.** The `company_profiles.user_id` is VARCHAR. JOINs between them require explicit cast: `cp.user_id = pu.n8n_user_id::text`. Without this, Postgres throws `operator does not exist: character varying = uuid`.
- **`portal_user` returns `client` from jwt-validation, not `client_key`.** The jwt-validation sub-workflow's Code node outputs `client`. Always use `$json.client` (or `$('Fetch User').item.json.client`), never `$json.client_key`.

#### SQL Safety in n8n Templates

- **Never embed raw user text directly in SQL templates.** The n8n Postgres `executeQuery` operation does **NOT** support `$1` parameterized queries. Instead, escape single quotes in a Code node before SQL interpolation:
  ```javascript
  // In Code node: escape for SQL
  function sqlEscape(str) { return str ? str.replace(/'/g, "''") : ''; }
  return [{ json: { contentSafe: sqlEscape(content) } }];
  ```
  Then in Postgres node: `INSERT INTO t (col) VALUES ('{{ $json.contentSafe }}')`

- **Postgres validates `::uuid` casts at parse time, not execution time.** Even in AND short-circuit or CASE ELSE branches, `'null'::uuid` fails. Use `NULLIF` to safely handle null-like strings:
  ```sql
  WHERE conversation_id = NULLIF(NULLIF(NULLIF('{{ expr }}', ''), 'null'), 'undefined')::uuid
  ```
  This converts empty, `"null"`, or `"undefined"` strings to SQL NULL before the cast. `NULL::uuid` is valid and returns 0 rows.

- **n8n renders JavaScript `null` as the literal string `"null"` in SQL templates.** When `$json.someField` is null, `'{{ $json.someField }}'` becomes `'null'` (the string), not SQL NULL.

- **Webhook node `httpMethod` should always be set explicitly.** Default may not match expectations. Always add `"httpMethod": "POST"` (or GET) — and deactivate+reactivate the workflow after changing it to re-register the webhook.

- **`live_conversations.mode` has a CHECK constraint:** Only `'sandbox'` and `'planning'` are valid. Using `'studio'` or any other value causes `violates check constraint "valid_mode"`. Studio conversations use mode `'sandbox'`.

- **`live_conversations.user_id` is UUID type.** When querying, cast the string value: `WHERE user_id = '{{ $json.user_id }}'::uuid`. Without the cast: `operator does not exist: text = uuid`.

#### Useful Node Settings

- **`onError: "continueErrorOutput"`** on Execute Sub-Workflow nodes (e.g., Fetch User calling jwt-validation). Routes auth failures to a second output for graceful error responses.
- **`alwaysOutputData: true`** on Postgres nodes that may return 0 rows (e.g., profile lookups with LEFT JOIN). Without this, downstream nodes don't execute when there are no results.

#### Google Drive Upload Pattern (Styled Google Docs)

The standard n8n Google Docs `create` + `update/insert` nodes produce **unstyled plain text documents**. To create Google Docs with proper heading/paragraph styling from markdown:

1. **Markdown node** (`markdownToHtml`): Convert markdown to HTML
2. **Code node** (Build Upload): Wrap HTML in CSS styles + build multipart request body:
   ```javascript
   const boundary = 'divider';
   const folderId = $('SomeNode').first().json.folderId;
   const htmlContent = $('Markdown').first().json.data;
   const metadata = JSON.stringify({
     name: docTitle,
     mimeType: "application/vnd.google-apps.document",
     parents: [folderId]
   });
   const htmlWithStyles = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
     p, ul, ol, table, h1, h2, h3, h4, h5, h6 { margin-bottom: 10pt; }
     h2 { margin-top: 20pt; }
     li { margin-bottom: 2pt; }
   </style></head><body>${htmlContent}</body></html>`;
   // Build multipart body with metadata + HTML
   let body = `--${boundary}\r\n`;
   body += `Content-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`;
   body += `--${boundary}\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n${htmlWithStyles}\r\n`;
   body += `--${boundary}--\r\n`;
   return { rawData: body };
   ```
3. **HTTP Request node**: POST to `https://www.googleapis.com/upload/drive/v3/files` with `uploadType=multipart`, `supportsAllDrives=true`, content type `multipart/related; boundary=divider`, authentication `predefinedCredentialType` using `googleDriveOAuth2Api`.

**Google Drive folder structure:** `Wingsuite Projecten/{client}/Content/{contentType}/`. Studio-save searches by client name in the root folder (`1YgOEQZwexatBIbpnY0_S22UifbXUXDZ1`), then for `Content` subfolder, then for the content-type subfolder. If the content-type folder doesn't exist, it auto-creates it.

**Google Docs `get` operation** returns the document body in `body.content` as structured JSON (paragraphs with textRun elements), not plain text. To extract text, iterate: `body.content[].paragraph.elements[].textRun.content`.

#### AI Response Marker Patterns

The studio AI uses text markers in its output that the frontend parses and renders as UI elements:

- **Drafts:** `===DRAFT===\n{content}\n===DRAFT===` → Rendered as a DraftCard with Save/Refine actions
- **Choices:** `===CHOICES===\n{Option A | Option B | Option C}\n===CHOICES===` → Rendered as clickable buttons

**Important:** Choices use `|` (pipe) as delimiter, NOT newlines. Newlines get stripped during n8n JSON serialization round-trips. The frontend parses `|` first, falls back to `\n`.

#### Credentials

| Credential | ID | Name |
|------------|----|------|
| Postgres | `HY5nJozYRhfP29Se` | Postgres account |
| Anthropic | `zvfIJSmp6pElXMtZ` | Anthropic account |
| Google Docs | `DBvurnNrV4xJDryL` | Google Docs account |
| Google Drive | `rH9X3hwyo6ibVgIA` | Google Drive account |

**Note:** The Postgres user does NOT have DDL permissions (CREATE TABLE, ALTER TABLE). Tables must be created manually by the database owner.

#### Active Workflow Registry

| Workflow | ID | Webhook Path | Purpose |
|----------|----|-------------|---------|
| `company-profile-get` | `hHIn6idNJjYd2yNb` | `GET /webhook/company-profile` | Fetch profile summary + status |
| `company-profile-save` | `JsivULkKnvI2qv9A` | `PUT /webhook/company-profile` | Upsert profile summary |
| `company-profile-interview` | `lfalPWh23p5CB3aa` | `POST /webhook/company-profile-interview` | AI brand interview |
| `studio-formats` | `kERg1TmQKPS6i9hI` | `GET /webhook/studio-formats` | Return content format templates |
| `studio-conversations` | `77dmirdd3mV1uE2I` | `GET /webhook/studio-conversations` | List studio conversations |
| `studio-message` | `axdg9OFz7eAMM5dU` | `POST /webhook/studio-message` | AI content creation chat |
| `studio-save` | `qhWScWiAyoKpgZKX` | `POST /webhook/studio-save` | Save content to Google Drive |
| `jwt-validation` | `dbf8RGXgL1Up2KzF` | (sub-workflow) | Validate JWT, return user info |

---

## Common Development Tasks

### Creating a New API Route
1. Create file: `app/api/[name]/route.ts`
2. Use the shared helpers from `lib/api-utils.ts`:
   ```typescript
   import { cookies } from 'next/headers';
   import { NextResponse } from 'next/server';
   import { fetchFromN8n, safeJsonParse } from '@/lib/api-utils';

   export async function GET() {
     const cookieStore = await cookies();
     const jwt = cookieStore.get('session')?.value;

     if (!jwt) {
       return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
     }

     const res = await fetchFromN8n('/webhook/my-endpoint', jwt);
     const data = await safeJsonParse(res, 'my-endpoint');

     if (!data) {
       return NextResponse.json({ error: 'upstream error' }, { status: 502 });
     }

     return NextResponse.json(data);
   }
   ```

### Adding a New Protected Page
1. Create page in `app/(protected)/[route]/page.tsx`
2. Route is automatically protected by middleware (add to `middleware.ts` matcher if needed)
3. Page inherits `SessionProvider` from layout
4. Use `useSession()` hook for user data:
   ```typescript
   'use client';
   import { useSession } from '@/components/SessionProvider';

   export default function MyPage() {
     const { loading, data } = useSession();
     if (loading) return <div>Loading...</div>;
     return <div>Hello {data?.email}</div>;
   }
   ```

### Adding a New Brand
1. Create brand assets directory: `public/newbrand/` (add logo.svg and hero.jpg/png)
2. Register in `lib/branding.ts` BRAND object
3. Optional: Add custom CSS at `public/brand/newbrand.css`
4. Deploy and configure DNS to point to Railway instance

---

## Design Philosophy

**"Don't make me think."**

- **Clean over feature-rich.** Every element earns its place. If it doesn't serve the current task, it doesn't exist.
- **UI minimalism, aimed at perfection.** Not empty — intentional. Every pixel, every interaction, every word is deliberate.
- **Delight over utility.** The user should smile. The user should be surprised. The experience should feel crafted, not assembled.
- **Guided, not searchable.** The user is taken by the hand. They should never be looking for something. Clear directions, obvious next steps, zero dead ends.
- **Zero distraction.** No competing elements, no settings panels that don't matter right now, no cognitive overhead. One thing at a time, done well.
- **Not generic, not replaceable.** This is not a default template with a logo swap. The interface should feel like it was built for exactly this purpose and nothing else.

---

## Code Conventions

### File Naming
- **React components:** PascalCase (e.g., `SessionProvider.tsx`)
- **Pages:** lowercase with hyphens (e.g., `dashboard/page.tsx`)
- **API routes:** lowercase (e.g., `app/api/credits/route.ts`)
- **Utilities:** camelCase (e.g., `lib/utils.ts`)

### Import Order
1. React and Next.js imports
2. Third-party libraries
3. Local components (`@/components/...`)
4. Local utilities (`@/lib/...`)
5. Types and interfaces

### TypeScript
- **Strict mode:** Enabled project-wide (`strict: true`)
- **Prefer interfaces** over types for object shapes
- **Export types** from component files when shared
- **Use path alias:** Always prefer `@/` over relative imports

### Component Patterns
- **'use client'** directive required for hooks, event handlers, browser APIs
- **Server components by default** (no 'use client')
- **Extract reusable UI** to `components/ui/`
- **SWR** for client-side data fetching (used extensively)

### Styling
- **Tailwind utility classes** for all styling
- **Use `cn()` helper** for conditional classes:
  ```typescript
  import { cn } from '@/lib/utils';

  <div className={cn("base-class", isActive && "active-class")} />
  ```
- **Prose classes** for markdown content:
  ```typescript
  <article className="prose prose-docs max-w-none">
    <ReactMarkdown>{content}</ReactMarkdown>
  </article>
  ```

### Error Handling
- **API routes:** Return proper HTTP status codes (401, 404, 502, 500)
- **Client components:** Show loading states and error messages
- **Use `safeJsonParse`** from `lib/api-utils.ts` for n8n responses
- Error boundaries at global level (`error.tsx`, `global-error.tsx`) + `ErrorBoundary` component

---

## Testing

### Current State
- **Framework:** Vitest with @vitest/coverage-v8
- **Config:** `vitest.config.mts`
- **Tests implemented:**
  - `tests/smoke.test.ts` – Basic smoke tests
  - `tests/api/auth-me.test.ts` – Session validation
  - `tests/api/credits.test.ts` – Credits endpoint
  - `tests/api/content-storage.test.ts` – Content storage endpoint
  - `tests/lib/branding.test.ts` – Brand detection
  - `tests/lib/utils.test.ts` – Utility functions

### Running Tests
```bash
pnpm test              # Run all tests
pnpm test:watch        # Run in watch mode
pnpm test:coverage     # Generate coverage report
```

---

## Deployment

### Railway Configuration
- **Build command:** `pnpm build`
- **Start command:** `pnpm start` (uses `$PORT` env var)
- **Environment variables:** Set in Railway dashboard

### Domain Configuration
- Each brand domain (wingsuite, emotion) points to same Railway deployment
- Brand detection happens at runtime via hostname
- No separate deployments needed per brand

---

## Additional Resources

### Internal Documentation
- **ADR folder:** `/adr/` contains Architecture Decision Records
- **Docs folder:** `/docs/` contains integration guides and schema docs
- **Package.json:** See `scripts` section for available commands

### External Links
- **Next.js Docs:** https://nextjs.org/docs
- **Tailwind CSS:** https://tailwindcss.com/docs
- **Weaviate Docs:** https://weaviate.io/developers/weaviate
- **n8n Documentation:** https://docs.n8n.io

---

**This file is for machine agents to understand the project architecture and contribute safely.**
*Last updated: 2026-02-16*
