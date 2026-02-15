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
│       └── workflows.md       # Key n8n workflow documentation
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
│   ├── FolderGrid.tsx         # Google Drive thumbnail grid with delete/move
│   ├── LiveChat.tsx           # Full-featured AI chat interface
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
- Redirects to `/login` if missing
- **Protected routes:** `/dashboard/*`, `/editor/*`, `/content/*`, `/live/*`, `/settings/*`, `/create/*`, `/company-private-storage/*`

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
- **Backend:** All messages proxied through n8n via `/api/live/*` routes
- **Features:**
  - Streaming responses
  - Knowledge base context sources cited in metadata
  - Assistant profiles with avatar, goals, instructions, language, audience
  - Conversation archive and unread counts
  - Production workflow for generating final content

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

> See `docs/n8n/` for comprehensive n8n documentation:
> - `docs/n8n/README.md` - Integration overview
> - `docs/n8n/database-schema.md` - Complete PostgreSQL table definitions
> - `docs/n8n/workflow-mapping.md` - Workflow mapping
> - `docs/n8n/workflows.md` - Key workflow documentation
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
| `/webhook/[workflow-name]` | Trigger specific workflow |

### Execution API (REST)
- **Base URL:** `${N8N_BASE_URL}/rest/executions/`
- **Get execution:** `GET /rest/executions/[id]?includeData=true`
- **customData field:** Contains trace steps for `JourneyCard`
- **Authentication:** `cookie: n8n-auth=${jwt};`

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
*Last updated: 2026-02-15*
