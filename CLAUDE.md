# CLAUDE.md – Project Overview for AI Agents

This file provides a comprehensive overview of the Wingsuite Console project for AI agents like Claude or Copilot. It outlines the structure, architecture, conventions, and integration points to help AI understand and contribute effectively.

---

## 🧱 Project Summary

**Project Name:** Wingsuite Console
**Framework:** Next.js 15.3.4 (App Router)
**Language:** TypeScript
**Node Version:** 24.0.3
**Package Manager:** npm
**Styling:** Tailwind CSS 3.4.4
**Deployment:** Railway
**Auth:** Session-based JWT via n8n
**Content Storage:** Google Drive API
**Workflow Orchestration:** n8n (workflow.wingsuite.io)
**Testing:** Vitest with @vitest/coverage-v8
**Linting:** ESLint + Prettier + Husky

---

## 🚀 Development Setup

### Prerequisites
- Node.js 24.0.3+
- npm (comes with Node)
- Access to n8n instance
- Environment variables configured

### Installation
```bash
npm install
```

### Environment Variables
Create a `.env.local` file in the root with:

```bash
N8N_BASE_URL=https://workflow.sampledomain.io     # n8n workflow instance URL
CONSOLE_BASE_URL=https://console.sampledomain.io  # This console app URL
JWT_SECRET=changeme                                # Secret for JWT verification
N8N_API_KEY=                                       # Optional: Direct n8n API access
```

### Running Locally
```bash
npm run dev        # Start development server (default: http://localhost:3000)
npm run build      # Build for production
npm start          # Start production server (uses $PORT env var)
npm run lint       # Run ESLint with max-warnings=0
npm test           # Run tests (currently placeholder)
```

### Git Hooks
- Husky is configured for pre-commit hooks
- Run `npm run prepare` after cloning to set up hooks

---

## 🗂️ Complete File Structure

```
console/
├── .husky/                    # Git hooks (pre-commit, etc.)
├── adr/                       # Architecture Decision Records
├── docs/                      # Detailed documentation
│   └── n8n/                   # n8n integration docs
│       ├── README.md          # Integration overview
│       ├── database-schema.md # PostgreSQL table definitions
│       └── workflows.md       # Key n8n workflow documentation
├── app/                       # Next.js 15 App Router
│   ├── (public)/              # Unauthenticated routes
│   │   └── login/             # Login page with branding
│   ├── (protected)/           # Authenticated routes (requires SessionProvider)
│   │   ├── dashboard/         # User home: credits, agents, content tiles
│   │   ├── content/[folder]/  # Google Drive folder view with FolderGrid
│   │   ├── editor/[fileId]/   # Document editor with DocCanvas + ChatPane
│   │   ├── executions/        # Workflow execution history
│   │   │   ├── page.tsx       # List all executions
│   │   │   └── [id]/          # Single execution detail view
│   │   └── create/[type]/     # Legacy workflow creation flow
│   │       ├── page.tsx       # Form iframe embed
│   │       └── progress/      # JourneyCard polling view
│   └── api/                   # API Routes (all proxy to n8n or Drive)
│       ├── auth/
│       │   ├── login/         # POST: authenticate and set session cookie
│       │   └── me/            # GET: validate session, return user info
│       ├── credits/           # GET: fetch usage stats from n8n
│       ├── content-storage/   # GET: fetch Google Drive files by folder
│       ├── content-forms/     # GET: available form types
│       ├── content-writers/   # GET: available content writer agents
│       ├── content-automations/ # GET: available automation agents
│       ├── drive/file/        # GET: fetch single Drive file metadata
│       ├── chat/              # POST: AI chat streaming endpoint (Vercel AI SDK)
│       └── live-executions/
│           ├── route.ts       # GET: list recent executions
│           └── [id]/          # GET: fetch execution trace with customData
├── components/
│   ├── ui/                    # Reusable UI primitives
│   │   ├── button.tsx
│   │   ├── separator.tsx
│   │   ├── textarea.tsx
│   │   └── close-window-button.tsx
│   ├── Agents/                # Agent grid display components
│   │   ├── ContentwriterGrid.tsx
│   │   ├── ContentformGrid.tsx
│   │   └── ContentautomationGrid.tsx
│   ├── editor/                # Editor-specific components
│   │   ├── DocCanvas.tsx      # Markdown renderer with diff preview
│   │   └── ChatPane.tsx       # AI chat sidebar using Vercel AI SDK
│   ├── SessionProvider.tsx    # Client context for auth state (SWR)
│   ├── BrandingProvider.tsx   # Client context for multi-brand theming
│   ├── AuthGate.tsx           # Protected route wrapper
│   ├── Sidebar.tsx            # Main navigation sidebar
│   ├── JourneyCard.tsx        # Animated workflow trace timeline
│   ├── FolderGrid.tsx         # Google Drive thumbnail grid
│   └── RecentExecutions.tsx   # Dashboard widget for recent workflows
├── lib/
│   ├── branding.ts            # Brand detection and config
│   └── utils.ts               # Utility functions (cn for Tailwind merge)
├── public/
│   ├── wingsuite/             # Wingsuite brand assets
│   ├── emotion/               # Emotion AI Motion brand assets
│   └── forms/                 # Static form assets
├── tests/                     # Vitest test files
├── .env.example               # Example environment variables
├── package.json               # Dependencies and scripts
├── tsconfig.json              # TypeScript configuration
├── next.config.js             # Next.js configuration
├── tailwind.config.js         # Tailwind CSS configuration
├── eslint.config.mjs          # ESLint configuration
├── postcss.config.js          # PostCSS configuration
└── CLAUDE.md                  # This file
```

---

## 🧠 Core Concepts

### Authentication & Sessions

#### Session Cookie Flow
1. User logs in via `/api/auth/login` (credentials sent to n8n)
2. n8n validates and returns JWT
3. JWT stored as `session` cookie (HTTP-only, secure)
4. All subsequent requests include cookie automatically
5. Cookie passed to n8n as `auth=<jwt>` header

#### SessionProvider (Client-Side)
- **Location:** `components/SessionProvider.tsx`
- **Purpose:** Client-side authentication state management
- **Technology:** SWR with 5-minute revalidation interval
- **API:** `/api/auth/me` returns `{ email, client, role, valid }`
- **Behavior:** Automatically redirects to `/login` if unauthenticated

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

### Credits & Usage Tracking

#### Credits API
- **Endpoint:** `GET /api/credits`
- **Upstream:** n8n `/webhook/portal-usage`
- **Response:**
```typescript
interface CreditsResponse {
  plan: string;              // e.g., "Pro", "Free"
  credits_used: number;      // Credits consumed this period
  plan_credits: number;      // Total credits in plan
  over_limit: boolean;       // Whether user exceeded quota
}
```

### Multi-Brand System

#### Branding Configuration
- **Location:** `lib/branding.ts`
- **Brands Configured:**
  - **wingsuite:** Primary brand (default fallback)
  - **emotion:** Emotion AI Motion white-label

```typescript
interface Branding {
  name: string;          // Display name
  domain: string;        // Hostname for detection
  logo: string;          // Path to logo SVG
  loginImage: string;    // Hero image for login page
  loginBg: string;       // Background color hex
  primaryColor: string;  // Theme primary color hex
}

// Auto-detects brand from hostname
const brand = detectBranding(hostname);
```

#### Adding a New Brand
1. Add assets to `/public/[brand]/` (logo.svg, hero.jpg/png)
2. Register in `lib/branding.ts` BRAND object
3. Optional: Add `/public/brand/[brand].css` for custom styles
4. Deploy with new domain pointing to same Railway instance

---

## 📊 Data Models & Types

### Execution Trace
```typescript
interface TraceStep {
  label: string;      // Step name (e.g., "Start", "Generate Content")
  summary: string;    // Status message or result URL
  ts?: string;        // Optional timestamp
}

interface ExecData {
  id: string;
  status: 'running' | 'success' | 'error';
  startedAt: string;
  stoppedAt?: string;
  trace: TraceStep[];  // Ordered array of workflow steps
}
```

### Google Drive Files
```typescript
interface DriveFile {
  id: string;              // Google Drive file ID
  name: string;            // Display name
  webViewLink: string;     // URL to open in Google Docs
  thumbnailLink: string;   // Preview image URL
  new?: number;            // Unseen file indicator
}

interface FolderStat {
  folder: string;      // Folder name
  unseen: number;      // Count of new files
  items: DriveFile[];  // Array of files in folder
}
```

### User Session
```typescript
interface SessionData {
  email?: string;      // User email from n8n
  client?: string;     // Client/organization ID
  role?: string;       // User role (admin, user, etc.)
  valid: 'true' | 'false';  // Session validity flag
}
```

---

## 🔌 API Endpoints Reference

### Authentication
| Endpoint | Method | Purpose | Auth | Response |
|----------|--------|---------|------|----------|
| `/api/auth/login` | POST | Authenticate user, set session cookie | None | JWT cookie |
| `/api/auth/me` | GET | Validate session, get user info | Required | `SessionData` |

### Usage & Credits
| Endpoint | Method | Purpose | Auth | Response |
|----------|--------|---------|------|----------|
| `/api/credits` | GET | Fetch credit usage stats | Required | `CreditsResponse` |

### Content & Storage
| Endpoint | Method | Purpose | Auth | Response |
|----------|--------|---------|------|----------|
| `/api/content-storage` | GET | List Drive files by folder | Required | `FolderStat[]` |
| `/api/drive/file` | GET | Get single Drive file metadata | Required | File metadata |
| `/api/content-forms` | GET | Available form types | Required | Form list |
| `/api/content-writers` | GET | Available writer agents | Required | Writer list |
| `/api/content-automations` | GET | Available automation agents | Required | Automation list |

### Workflow Execution
| Endpoint | Method | Purpose | Auth | Response |
|----------|--------|---------|------|----------|
| `/api/live-executions` | GET | List recent executions | Required | Execution array |
| `/api/live-executions/[id]` | GET | Get execution trace with customData | Required | `ExecData` |

### AI Chat
| Endpoint | Method | Purpose | Auth | Response |
|----------|--------|---------|------|----------|
| `/api/chat` | POST | Stream AI responses (Vercel AI SDK) | Required | SSE stream |

---

## 🔁 Complete Workflow Execution Flow

### Standard Flow (Form → Progress → Editor)
1. **Form Submission**
   - User navigates to `/create/[type]` (e.g., `/create/blog-post`)
   - Embedded n8n form iframe loads
   - User fills form and submits to n8n webhook

2. **Redirect to Progress**
   - n8n processes form and starts workflow execution
   - n8n redirects to `/create/[type]/progress?execution=<id>`
   - Progress page mounts `JourneyCard` component

3. **Live Progress Tracking**
   - `JourneyCard` polls `/api/live-executions/[id]` every 2 seconds
   - Displays animated trace steps with typewriter effect
   - Shows spinner while `status === 'running'`

4. **Completion & Redirect**
   - When `status === 'success'`, polling stops
   - User manually navigates to `/editor/[fileId]` (from trace URL)
   - Or automatic redirect if fileId in execution metadata

5. **Document Editor**
   - `DocCanvas` loads markdown content from Drive
   - `ChatPane` provides AI editing suggestions
   - User can preview diffs and accept changes

### Legacy Direct Execution Flow
- Some workflows skip form and directly POST to n8n
- These redirect immediately to progress or editor

---

## 🧩 Key Components Deep Dive

### SessionProvider
- **File:** `components/SessionProvider.tsx`
- **Purpose:** Global authentication state
- **API:** SWR hook polling `/api/auth/me` every 5 minutes
- **Auto-redirect:** Client-side push to `/login` if `unauth`
- **Context Hook:** `useSession()` → `{ loading, unauth, data }`

### BrandingProvider
- **File:** `components/BrandingProvider.tsx`
- **Purpose:** Multi-tenant theming
- **Server-rendered:** Brand detected in layout via `detectBranding(hostname)`
- **Client context:** `useBranding()` → `Branding` object
- **Used in:** Login page, header logos, theme colors

### DocCanvas
- **File:** `components/editor/DocCanvas.tsx`
- **Purpose:** Markdown document viewer with diff preview
- **Features:**
  - Renders markdown with `react-markdown`
  - Block-level diff highlighting using `diff-match-patch`
  - Preview mode for suggested edits (yellow highlights)
  - Loading overlay with spinner
- **Props:**
  - `content: string` – Original markdown
  - `preview: string | null` – Optional revised version
  - `loading?: boolean` – Shows overlay spinner

### JourneyCard
- **File:** `components/JourneyCard.tsx`
- **Purpose:** Animated workflow execution timeline
- **Features:**
  - Polls `/api/live-executions/[id]` every 2s while running
  - Typewriter effect for each new step (16ms per char)
  - Reorders steps: "Start" first, "Finished" last
  - Auto-links URLs in summaries
  - Stops polling when `status !== 'running'`
- **Props:** `execId: string`

### FolderGrid
- **File:** `components/FolderGrid.tsx`
- **Purpose:** Google Drive thumbnail gallery
- **Features:**
  - Auto-refresh every 5 seconds via SWR
  - Hover overlay with actions: Review, Open, Download (PDF/DOCX/TXT)
  - "NEW" badge for unseen files
  - Responsive grid layout (auto-fill, 160px min)
- **Props:**
  - `folder: string` – Folder name to filter
  - `initialItems: DriveFile[]` – SSR fallback data

### ChatPane
- **File:** `components/editor/ChatPane.tsx`
- **Purpose:** AI-powered document editing assistant
- **Technology:** Vercel AI SDK (`useChat` hook)
- **Features:**
  - Streams responses from `/api/chat`
  - Can preview suggested edits in DocCanvas
  - Message history persisted in component state

---

## 🔧 Dependencies Overview

### Core Framework
- **next** (15.3.4) – React framework with App Router
- **react** (18.3.1) + **react-dom** – UI library
- **typescript** – Type safety

### UI & Styling
- **tailwindcss** (3.4.4) – Utility-first CSS
- **@tailwindcss/typography** – Prose styling for markdown
- **clsx** + **tailwind-merge** – Conditional class merging
- **framer-motion** (12.23.24) – Animation library

### Data Fetching & State
- **swr** (2.3.4) – Client-side data fetching with cache
- No global state library (Context API + SWR suffices)

### AI & Streaming
- **ai** (5.0.72) – Vercel AI SDK for streaming chat
- **@ai-sdk/openai** (2.0.52) – OpenAI integration
- **openai** (6.3.0) – OpenAI Node SDK

### Content Rendering
- **react-markdown** (10.1.0) – Markdown to React
- **diff-match-patch** (1.0.5) – Text diffing for DocCanvas

### Authentication
- **jsonwebtoken** (9.0.2) – JWT parsing (server-side)
- **cookie** (1.0.2) – Cookie parsing helpers

### Development Tools
- **vitest** (3.2.4) – Test runner
- **@vitest/coverage-v8** – Test coverage
- **eslint** + plugins – Linting
- **prettier** (3.5.3) – Code formatting
- **husky** (8.0.0) – Git hooks
- **turbo** – Monorepo task runner (optional)

---

## ⚙️ Configuration Files

### TypeScript (tsconfig.json)
- **Target:** ES2017
- **Strict mode:** Disabled (`strict: false`)
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

## 🔗 N8N Integration Details

> **📚 Detailed Documentation:** See `docs/n8n/` for comprehensive n8n documentation:
> - `docs/n8n/README.md` - Integration overview
> - `docs/n8n/database-schema.md` - Complete PostgreSQL table definitions
> - `docs/n8n/workflows.md` - Key workflow documentation

### Authentication Header Pattern
All API routes pass JWT to n8n as:
```javascript
headers: { cookie: `auth=${jwt};` }
// Some endpoints use `n8n-auth=${jwt};` for direct REST API calls
```

### Webhook Endpoints Used
| n8n Webhook | Purpose | Response Shape |
|-------------|---------|----------------|
| `/webhook/portal-userinfo` | Get user session data | `{ email, client, role }` |
| `/webhook/portal-usage` | Get credit usage | `{ plan, credits_used, plan_credits, over_limit }` |
| `/webhook/content-storage` | List Drive files | `[{ folder, newFiles, items: [] }]` |
| `/webhook/[workflow-name]` | Trigger specific workflow | Varies by workflow |

### Execution API (REST)
- **Base URL:** `${N8N_BASE_URL}/rest/executions/`
- **Get execution:** `GET /rest/executions/[id]?includeData=true`
- **customData field:** Contains trace steps for `JourneyCard`
- **Authentication:** `cookie: n8n-auth=${jwt};`

### CustomData Trace Format
N8N workflows should add trace steps via:
```json
{
  "customData": {
    "Step Name": "Status message or result URL",
    "Generate Content": "Content generated successfully",
    "Upload to Drive": "https://docs.google.com/document/d/abc123"
  }
}
```

---

## 🛠️ Common Development Tasks

### Adding a New Brand
1. Create brand assets directory:
   ```bash
   mkdir -p public/newbrand
   # Add logo.svg and hero.jpg/png
   ```

2. Register in `lib/branding.ts`:
   ```typescript
   newbrand: {
     domain: "console.newbrand.io",
     name: "New Brand",
     logo: "/newbrand/logo.svg",
     loginImage: "/newbrand/hero.jpg",
     loginBg: "#ffffff",
     primaryColor: "#0c1d40",
   }
   ```

3. Optional: Add custom CSS at `public/brand/newbrand.css`

4. Deploy and configure DNS to point to Railway instance

### Creating a New API Route
1. Create file: `app/api/[name]/route.ts`
2. Implement handler:
   ```typescript
   import { cookies } from 'next/headers';
   import { NextResponse } from 'next/server';

   export async function GET() {
     const cookieStore = await cookies();
     const jwt = cookieStore.get('session')?.value;

     if (!jwt) {
       return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
     }

     // Proxy to n8n or implement logic
     const res = await fetch(`${process.env.N8N_BASE_URL}/webhook/...`, {
       headers: { cookie: `auth=${jwt};` },
     });

     return NextResponse.json(await res.json());
   }
   ```

### Adding a New Protected Page
1. Create page in `app/(protected)/[route]/page.tsx`
2. Page automatically inherits `SessionProvider` from layout
3. Use `useSession()` hook for user data:
   ```typescript
   'use client';
   import { useSession } from '@/components/SessionProvider';

   export default function MyPage() {
     const { loading, data } = useSession();

     if (loading) return <div>Loading...</div>;

     return <div>Hello {data?.email}</div>;
   }
   ```

### Creating a New Agent Grid
1. Copy `components/Agents/ContentwriterGrid.tsx` as template
2. Update API endpoint and data shape
3. Add to dashboard: `app/(protected)/dashboard/page.tsx`

---

## 🐛 Troubleshooting

### Session Issues
**Symptom:** Constant redirects to `/login`

**Possible Causes:**
- JWT secret mismatch between n8n and console
- Cookie not being set (check HTTPS in production)
- n8n `/webhook/portal-userinfo` returning `valid: 'false'`

**Debug:**
1. Check browser DevTools → Application → Cookies
2. Verify `session` cookie exists and has value
3. Test `/api/auth/me` directly in browser
4. Check n8n logs for webhook errors

### N8N Connection Errors
**Symptom:** 502 upstream errors in API routes

**Possible Causes:**
- `N8N_BASE_URL` incorrect in `.env.local`
- n8n instance down or unreachable
- Webhook not enabled in n8n workflow
- CORS issues (should not affect server-side calls)

**Debug:**
1. Verify `N8N_BASE_URL` matches actual n8n domain
2. Test webhook directly: `curl https://workflow.domain.io/webhook/portal-userinfo`
3. Check Railway logs for network errors

### Google Drive Permissions
**Symptom:** No files appear in `FolderGrid`, or 403 errors

**Possible Causes:**
- Service account not shared on Drive folder
- n8n Drive integration misconfigured
- Folder name mismatch (case-sensitive)

**Debug:**
1. Verify folder shared with n8n service account email
2. Test `/api/content-storage?folder=FolderName` directly
3. Check n8n workflow for Drive API errors

### Credits Not Updating
**Symptom:** Dashboard shows stale credit counts

**Possible Causes:**
- n8n `/webhook/portal-usage` not updating database
- Client-side cache not invalidating
- User session mapped to wrong client ID

**Debug:**
1. Test `/api/credits` in browser to see raw response
2. Check n8n workflow logs for database update steps
3. Verify `client` field in session matches usage records

### Build Errors
**Symptom:** `npm run build` fails with type errors

**Possible Causes:**
- TypeScript strict mode issues (currently `strict: false`)
- Missing type definitions
- Import path errors with `@/*` alias

**Debug:**
1. Run `npm run lint` to see ESLint issues
2. Check `tsconfig.json` paths configuration
3. Clear `.next` folder: `rm -rf .next && npm run build`

---

## 📝 Code Conventions

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
6. Styles (if any)

### TypeScript
- **Strict mode:** Disabled project-wide (`strict: false`)
- **Prefer interfaces** over types for object shapes
- **Export types** from component files when shared
- **Use path alias:** Always prefer `@/` over relative imports

### Component Patterns
- **'use client'** directive required for:
  - Hooks (useState, useEffect, useContext)
  - Event handlers (onClick, onChange)
  - Browser APIs (window, localStorage)
- **Server components by default** (no 'use client')
- **Extract reusable UI** to `components/ui/`
- **Keep business logic** in page components or API routes

### Styling
- **Tailwind utility classes** for all styling
- **Use `cn()` helper** for conditional classes:
  ```typescript
  import { cn } from '@/lib/utils';

  <div className={cn(
    "base-class",
    isActive && "active-class",
    isPrimary ? "primary" : "secondary"
  )} />
  ```
- **Prose classes** for markdown content:
  ```typescript
  <article className="prose prose-docs max-w-none">
    <ReactMarkdown>{content}</ReactMarkdown>
  </article>
  ```

### Error Handling
- **API routes:** Return proper HTTP status codes
  - `401` for unauthorized
  - `404` for not found
  - `502` for upstream errors
  - `500` for internal errors
- **Client components:** Show loading states and error messages
- **Use try-catch** sparingly (let Next.js error boundaries handle)

---

## 🧪 Testing Strategy

### Current State
- **Framework:** Vitest configured with coverage-v8
- **Status:** Placeholder tests (`npm test` echoes "no tests yet"`)
- **Coverage:** Not yet implemented

### Recommended Testing Approach

#### Unit Tests
- Test utility functions in `lib/`
- Test pure components (especially `ui/` components)
- Mock `useSession()` and `useBranding()` for isolated tests

#### Integration Tests
- Test API routes with mocked n8n responses
- Test component interactions (forms, buttons, state changes)

#### E2E Tests (Future)
- Full authentication flow
- Workflow creation and progress tracking
- Document editing and AI chat

### Running Tests
```bash
npm test              # Run all tests
npm run test:coverage # Generate coverage report
```

---

## 🚀 Deployment & Environment

### Railway Configuration
- **Build command:** `npm run build`
- **Start command:** `npm start`
- **Environment variables:** Set in Railway dashboard
- **Port:** Automatically assigned via `$PORT` env var

### Environment-Specific Behavior
- **Development:** Hot reload, verbose errors, source maps
- **Production:** Optimized build, error boundaries, no console logs

### Domain Configuration
- Each brand domain (wingsuite, emotion) points to same Railway deployment
- Brand detection happens at runtime via hostname
- No separate deployments needed per brand

---

## 🛠 Recommended Next Steps for Agents

### High Priority
1. **Implement actual tests** – Replace placeholder in `npm test`
2. **Add error boundaries** – Graceful fallbacks for component errors
3. **History/revisions view** – Track document changes over time
4. **Search & filtering** – Add to `FolderGrid` by file metadata
5. **Mobile responsiveness** – Test and fix layout on mobile devices

### Medium Priority
6. **Rate limiting** – Protect API routes from abuse
7. **Request caching** – Expand beyond current 30s TTL in `/api/content-storage`
8. **Optimistic UI updates** – Immediate feedback before API confirms
9. **Keyboard shortcuts** – Power-user features in editor
10. **Export functionality** – Bulk download documents

### Low Priority
11. **Dark mode support** – Toggle via BrandingProvider
12. **Analytics integration** – Track usage patterns
13. **User preferences** – Persist settings in n8n database
14. **Notification system** – Toast messages for async actions
15. **Accessibility audit** – WCAG compliance checks

---

## 📚 Additional Resources

### Internal Documentation
- **ADR folder:** `/adr/` contains Architecture Decision Records
- **README.md:** Basic project description
- **Package.json:** See `scripts` section for available commands

### External Links
- **Next.js Docs:** https://nextjs.org/docs
- **Tailwind CSS:** https://tailwindcss.com/docs
- **Vercel AI SDK:** https://sdk.vercel.ai/docs
- **n8n Documentation:** https://docs.n8n.io

---

**This file is for machine agents to understand the project architecture and contribute safely.**
*Last updated: 2024-10-20*