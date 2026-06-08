# Wingsuite Console: Product Refocus Plan

## Context

Wingsuite has 7 paying customers acquired through agency partner Emotion. Usage is low (max once/week). The current product spreads across too many surfaces: dashboard with grids, form-based content creation, a separate editor, live chat with sandbox/planning modes, knowledge base management, LinkedIn/website data extraction, agent management, and content scheduling. None of these go deep enough to be indispensable. Users can get similar (or better) results by talking to ChatGPT directly.

The core insight: the defensible value is a **persistent company brain** that knows your brand, tone, products, audience, and strategy — and uses all of it automatically when creating content. Today that context is scattered across settings, knowledge base uploads, and tone-of-voice files. The user has to manually connect the dots every time.

**The refocused product has three pillars:**
1. **Company Profile** — AI-led interview that builds a structured identity. The "wow moment."
2. **Content Studio** — Template-guided conversations that produce content. The daily tool.
3. **Content Library** — Simple output browser. The archive.

Everything else gets cut.

---

## Design Principles (applies to every decision)

- Clean over feature-rich. Every element earns its place.
- UI minimalism aimed at perfection. Not empty — intentional.
- The user should smile, be surprised, be taken by the hand.
- They should never be searching, never distracted.
- Clear directions. Don't make me think.
- Not generic, not replaceable.

---

## Phase 1: Company Profile + Simplified Navigation

**Goal:** Build the foundation. New users land on an AI interview that builds their company profile. Simplified sidebar with the 3-pillar structure. Existing features still accessible — nothing breaks.

### 1.1 Database: `company_profiles` table

Create via n8n Postgres node:

```sql
CREATE TABLE company_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id VARCHAR NOT NULL,
  user_id VARCHAR NOT NULL,
  status VARCHAR NOT NULL DEFAULT 'empty',  -- 'empty' | 'interviewing' | 'complete'
  profile JSONB NOT NULL DEFAULT '{}',
  interview_conversation_id UUID,           -- references live_conversations.id
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(client_id, user_id)
);
```

The `profile` JSONB holds structured sections:
```json
{
  "identity": { "name": "", "tagline": "", "industry": "", "description": "" },
  "voice": { "style": "", "dos": [], "donts": [], "examples": [] },
  "audience": { "primary": "", "pain_points": "", "decision_factors": "" },
  "products": [{ "name": "", "description": "", "differentiator": "" }],
  "strategy": { "goals": "", "themes": [], "values": [] },
  "positioning": { "competitors": "", "differentiators": [] }
}
```

Using JSONB so we can iterate on structure without migrations.

### 1.2 n8n: New workflow `company-profile-interview`

**Webhook:** `POST /webhook/company-profile-interview`

**Flow:**
1. Auth (jwt-validation sub-workflow)
2. Load or create conversation (load-conversation sub-workflow)
3. Load current profile from `company_profiles`
4. Load conversation history from `live_messages`
5. AI Agent (GPT-5.2) with interview system prompt
6. Parse response → store message → update profile if `profileUpdate` present
7. If `interviewComplete`, set `company_profiles.status = 'complete'`
8. Respond with `{ content, conversationId, profileUpdate?, interviewComplete? }`

**System prompt:**
```
You are a brand strategist conducting a company profiling session. Your job is to
learn everything important about this company through natural conversation, then
build a structured profile that powers all future content creation.

## Approach
- Start with: "Tell me about your company. What do you do?"
- Follow the thread naturally. Don't present a checklist.
- Cover these areas through conversation (not as a list):
  1. What the company does (products, services, industry)
  2. Who their customers are (audiences, pain points)
  3. How they want to sound (tone, personality, values)
  4. What makes them unique (positioning, differentiators)
  5. What their content goals are (awareness, leads, thought leadership)
- After 8-12 exchanges, summarize what you've learned and confirm
- Maximum 15 exchanges total

## Rules
- Max 2 questions per response
- Max 100 words per response (be concise, not chatty)
- Write in {{language}}
- React to what they say. Be genuinely curious.
- When confirming the summary, present it as structured sections

## Current profile state
{{current_profile_json}}

## Response format (valid JSON)
{
  "content": "Your conversational response",
  "profileUpdate": { ...partial profile fields... } | null,
  "interviewComplete": false,
  "profileSummary": null
}

When interviewComplete is true:
- profileUpdate must contain ALL structured fields
- profileSummary must be a human-readable paragraph
```

### 1.3 n8n: New workflows for profile CRUD

**`company-profile-get`** — `GET /webhook/company-profile`
- Auth → query `company_profiles WHERE client_id AND user_id` → return profile + status

**`company-profile-save`** — `PUT /webhook/company-profile`
- Auth → update `company_profiles SET profile = $profile, updated_at = NOW()`

**`company-profile-status`** — `GET /webhook/company-profile-status`
- Auth → return `{ status }` from `company_profiles` (or `'empty'` if no row)

### 1.4 Console: New API routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/company-profile` | GET | Fetch profile + status |
| `/api/company-profile` | PUT | Update profile fields (manual edit) |
| `/api/company-profile/interview` | POST | Send message in interview conversation |

All follow existing pattern: read session cookie → proxy to n8n with `fetchFromN8n`.

### 1.5 Console: New pages and components

**`app/(protected)/profile/page.tsx`**
- Checks profile status via SWR (`/api/company-profile`)
- Routes to `CompanyProfileInterview` (status: empty/interviewing) or `CompanyProfileView` (status: complete)

**`components/CompanyProfileInterview.tsx`** (~300 lines)
- Full-screen conversational interface. Simpler than LiveChat — no panels, no toggles.
- Left: chat messages + input (70%)
- Right: live profile card that fills in as AI extracts data (30%)
  - Sections fade in with framer-motion as profileUpdate data arrives
  - Shows: company name, industry, products, audience, tone, values
  - Empty sections show as subtle placeholder outlines
- On `interviewComplete`: celebration state → profile summary → "Start creating content" CTA
- Patterns to reuse from LiveChat: message rendering, input handling, scroll behavior

**`components/CompanyProfileView.tsx`** (~250 lines)
- Structured display of the complete profile
- Each section is an editable card (click to edit inline, or expand)
- Sections: Identity, Voice, Audience, Products, Strategy, Positioning
- "Re-run interview" button (resets status to 'interviewing', starts new conversation)
- Clean, card-based layout. Each section shows the data, not the field labels.

### 1.6 Console: Simplified Sidebar

Modify `components/Sidebar.tsx`:

**Remove:**
- "Create" collapsible section (forms list)
- "Content Folders" collapsible section
- "Private Storage (beta)" link
- "Radar" link

**New structure:**
```
[Brand Logo]

Company Profile    (UserCircleIcon)     <- red/green dot based on status
Content Studio     (PencilSquareIcon)
Content Library    (DocumentTextIcon)

---
Knowledge Base     (ServerIcon)
Settings           (Cog6ToothIcon)

---
Logout
```

Minimal. Five items + logout. No collapsible sections. No badges except profile status dot.

### 1.7 Console: Dashboard redirect

Modify `app/(protected)/dashboard/page.tsx`:
- Fetch profile status on mount
- If `empty` or `interviewing`: redirect to `/profile`
- If `complete`: show minimal landing page with:
  - Welcome message with company name
  - Profile completeness indicator
  - "Create content" CTA → `/studio`
  - Recent content (3-4 items from content library)
  - Credits summary (compact)

Keep it to one screen. No scrolling. No grids.

### 1.8 Console: Middleware update

Add to `middleware.ts` matcher: `/profile/:path*`, `/studio/:path*`, `/library/:path*`

### Phase 1 files summary

| Action | File |
|--------|------|
| Create | `app/(protected)/profile/page.tsx` |
| Create | `app/api/company-profile/route.ts` |
| Create | `app/api/company-profile/interview/route.ts` |
| Create | `components/CompanyProfileInterview.tsx` |
| Create | `components/CompanyProfileView.tsx` |
| Modify | `components/Sidebar.tsx` |
| Modify | `app/(protected)/dashboard/page.tsx` |
| Modify | `middleware.ts` |
| n8n new | `company-profile-interview` workflow |
| n8n new | `company-profile-get` workflow |
| n8n new | `company-profile-save` workflow |
| n8n new | `company-profile-status` workflow |
| DB | Create `company_profiles` table |

---

## Phase 2: Content Studio

**Goal:** Replace the form-based creation flow and LiveChat with a unified conversational content creation experience. This is the core product.

### 2.1 Console: Content Studio page and components

**`app/(protected)/studio/page.tsx`**
- Renders `ContentStudio` component
- Minimal page wrapper (title, branding)

**`components/ContentStudio.tsx`** (~500 lines)
The heart of the new product. Two views:

**View A — Template Picker** (no active conversation)
```
+----------------------------------------------+
|  What do you want to create?                  |
|                                               |
|  +---------+ +---------+ +---------+         |
|  |  Blog   | |  Case   | | Product |         |
|  |  Post   | |  Study  | |  Sheet  |         |
|  +---------+ +---------+ +---------+         |
|  +---------+ +---------+ +---------+         |
|  | Social  | |  Email  | |  Press  |         |
|  |  Media  | |Campaign | | Release |         |
|  +---------+ +---------+ +---------+         |
|                                               |
|  +--------------------------------------+    |
|  |  Or describe what you need...        |    |
|  +--------------------------------------+    |
|                                               |
|  Recent conversations (3 items, clickable)    |
+----------------------------------------------+
```

Each card: icon + name + one-line description from `contentFormatQuestions.ts`. Clean, minimal, inviting.

**View B — Conversation** (after selecting type or describing need)
```
+----------------------------------------------+
|  <- Back to templates    Blog Post            |
|----------------------------------------------|
|                                               |
|  [AI] I'll help you write a blog post for     |
|       {company}. Your audience is typically    |
|       {audience}. What topic are we covering?  |
|                                               |
|  [User] Our new product launch next month      |
|                                               |
|  [AI] Got it. What's the key message...        |
|                                               |
|  +--------------------------------------+    |
|  | DRAFT                                 |    |
|  |                                       |    |
|  | # The Future of Widget Manufacturing  |    |
|  |                                       |    |
|  | In a world where...                   |    |
|  |                                       |    |
|  | [Copy]  [Save to Library]  [Refine]   |    |
|  +--------------------------------------+    |
|                                               |
|----------------------------------------------|
|  [Message input]                        [Send]|
+----------------------------------------------+
```

Key behaviors:
- No side panels. No settings toggles. No mode switches. Just the conversation.
- Company profile is injected automatically into every request (user never sees this)
- Knowledge base is searched automatically (no manual cluster selection)
- When AI produces a draft, it's rendered as a `DraftCard` — visually distinct from chat messages
- DraftCard actions: Copy (clipboard), Save to Library (creates Google Doc), Refine (focuses input with "I'd like to change...")
- Conversation history accessible via slide-out drawer (clock icon in header)
- "Back to templates" returns to picker view

**Sub-components:**

`components/studio/TemplatePicker.tsx` — Content type grid + freeform input + recent conversations
`components/studio/DraftCard.tsx` — Styled content draft with actions
`components/studio/StudioHistory.tsx` — Slide-out conversation list (simplified from LiveChat's history drawer)

### 2.2 n8n: Modify `live-message` workflow

This is a production workflow — save current state before any changes.

**Strategy:** Add a conditional branch early in the workflow. If the request includes `studioMode: true`, use the new system prompt path. Otherwise, existing behavior is unchanged. This way existing LiveChat conversations continue working during the transition.

**New branch additions:**
1. After `load-conversation`, check for `studioMode` flag from webhook body
2. If studio mode: load company profile from `company_profiles` table
3. Inject company profile + content format config into new system prompt
4. Auto-search all Weaviate KB clusters (no filter, no skipSearch)

**New studio system prompt:**
```
You are a content creation assistant working for {{company_name}}.

## Company Profile
Name: {{profile.identity.name}}
Industry: {{profile.identity.industry}}
What they do: {{profile.identity.description}}
Tone: {{profile.voice.style}}
Words to use: {{profile.voice.dos}}
Words to avoid: {{profile.voice.donts}}
Primary audience: {{profile.audience.primary}}
Products: {{formatted products list}}
Content goals: {{profile.strategy.goals}}

## Content Type: {{contentFormat}}
{{format-specific guidance from contentFormatQuestions}}

## Your Job
1. You already know this company from the profile above. Don't ask who they are.
2. Ask 2-3 focused questions specific to THIS piece of content.
3. After gathering context, confirm: "Here's what I'll create: [summary]. Ready?"
4. On confirmation, produce the full draft.
5. After draft, ask: "Want to refine anything, or shall we save it?"

## Rules
- Write in {{language}}
- Use the company's tone of voice as described above
- Search the knowledge base for relevant facts, examples, data
- Max 2 questions per response
- When drafting, give the COMPLETE content — full length, fully polished
- Wrap draft content in markers: ---DRAFT--- content here ---/DRAFT---

## Response format (valid JSON)
{
  "content": "Your conversational response including any draft",
  "contentType": "blog-post" | null,
  "hasDraft": true | false
}
```

The `---DRAFT---` markers let the frontend extract draft content and render it in a `DraftCard` instead of as regular markdown.

### 2.3 n8n: New workflow `studio-save`

**Webhook:** `POST /webhook/studio-save`

**Flow:**
1. Auth
2. Receive: `{ content, title, format, conversationId }`
3. Determine target Google Drive folder based on format
4. Create Google Doc with content (reuse existing Google Docs integration patterns)
5. Return `{ success, fileId, webViewLink, folderName }`

### 2.4 Console: New API routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/studio/message` | POST | Send message in studio conversation |
| `/api/studio/save` | POST | Save draft to Google Drive |
| `/api/studio/conversations` | GET | List studio conversations |

`/api/studio/message` proxies to the same `/webhook/live-message` but adds `studioMode: true` and `contentFormat` to the body.

### Phase 2 files summary

| Action | File |
|--------|------|
| Create | `app/(protected)/studio/page.tsx` |
| Create | `components/ContentStudio.tsx` |
| Create | `components/studio/TemplatePicker.tsx` |
| Create | `components/studio/DraftCard.tsx` |
| Create | `components/studio/StudioHistory.tsx` |
| Create | `app/api/studio/message/route.ts` |
| Create | `app/api/studio/save/route.ts` |
| Create | `app/api/studio/conversations/route.ts` |
| Modify | `lib/contentFormatQuestions.ts` (add prompt fragments) |
| n8n modify | `live-message` (add studio branch + new system prompt) |
| n8n new | `studio-save` workflow |

---

## Phase 3: Content Library + Settings Cleanup

**Goal:** Simple content browser. Stripped settings. Knowledge Base stays as standalone page.

### 3.1 Console: Content Library page

**`app/(protected)/library/page.tsx`**
- Renders `LibraryView` component

**`components/LibraryView.tsx`** (~300 lines)
- Fetches from existing `/api/content-storage`
- Filter bar: All types | Blog Posts | Case Studies | Social Media | ...
- Sort: Newest first (default)
- Grid of content cards:
  - Thumbnail (Google Drive)
  - Title
  - Format badge
  - Relative date
  - Hover: View | Download | Delete
- Click opens `ContentPreview` slide-over
- Reuse existing download/delete infrastructure from `FolderGrid.tsx`

**`components/library/ContentPreview.tsx`** (~150 lines)
- Slide-over panel
- Fetches content via `/api/drive/file`
- Renders with ReactMarkdown
- Actions: Copy | Download (PDF/DOCX) | Open in Google Docs
- Clean, focused reading experience

### 3.2 Console: Simplified Settings

Rewrite `app/(protected)/settings/page.tsx`:

**Keep:**
- Account info (email, client, role)
- Plan + credits display
- Default language selector

**Cut:**
- LinkedIn personal profile capture
- LinkedIn company profile capture
- Website connector
- Tone of voice file selector (replaced by Company Profile)
- Agent management link

Target: ~150 lines instead of ~800.

### 3.3 Knowledge Base

Keep `app/(protected)/company-private-storage/page.tsx` as-is but rename the sidebar link to "Knowledge Base". This page still works and serves the product well — users upload documents that feed the Weaviate KB.

### Phase 3 files summary

| Action | File |
|--------|------|
| Create | `app/(protected)/library/page.tsx` |
| Create | `components/LibraryView.tsx` |
| Create | `components/library/ContentPreview.tsx` |
| Modify | `app/(protected)/settings/page.tsx` (major simplification) |
| Modify | `components/Sidebar.tsx` (link library) |

---

## Phase 4: Cleanup + Redirect Legacy Routes

**Goal:** Remove deprecated code. Set up redirects so bookmarks don't break. Final polish.

### 4.1 Route redirects

In `middleware.ts` or via Next.js rewrites in `next.config.js`:
- `/live` -> `/studio`
- `/create/*` -> `/studio`
- `/editor/*` -> `/library`
- `/content/*` -> `/library`
- `/settings/agents` -> `/settings`

### 4.2 Delete files

**Pages:**
- `app/(protected)/create/` (entire directory)
- `app/(protected)/editor/` (entire directory)
- `app/(protected)/settings/agents/` (entire directory)
- `app/(protected)/live/page.tsx`

**Components:**
- `components/LiveChat.tsx`
- `components/Agents/` (entire directory)
- `components/ContentSessionBanner.tsx`
- `components/RadarBanner.tsx`
- `components/editor/DocCanvas.tsx`
- `components/editor/ChatPane.tsx`
- `components/JourneyCard.tsx`
- `components/CreateFolderButton.tsx`

**API routes to delete:**
- `app/api/content-forms/`
- `app/api/content-formats/`
- `app/api/content-writers/`
- `app/api/content-automations/`
- `app/api/content-sessions/`
- `app/api/chat/`
- `app/api/live-executions/`
- `app/api/portal-agents/`
- `app/api/settings/toggle-agent/`
- `app/api/datasources/` (entire directory — all 8 routes)
- `app/api/tone-of-voice/`

**API routes to KEEP:**
- `app/api/auth/*`
- `app/api/credits/`
- `app/api/content-storage/`
- `app/api/drive/*`
- `app/api/create-folder/`
- `app/api/delete-document/`
- `app/api/move-file/`
- `app/api/knowledge-base/*`
- `app/api/live/*` (still used by studio under the hood)
- `app/api/settings/route.ts`
- `app/api/company-profile/*` (new)
- `app/api/studio/*` (new)

### 4.3 n8n workflow cleanup

Deactivate (don't delete — keep for reference):
- All `*-form` workflows (blogpost-form, instagrampost-form, etc.)
- Content writer workflows (per-client writers)
- `content-auditor`
- `create-session-tool`
- `planning-negotiator`

Keep active:
- `live-message` (powers studio)
- `live-production` (may still be useful, keep for now)
- `load-conversation`
- `jwt-validation`
- `company-profile-*` (new)
- `studio-save` (new)
- `content-storage`
- `knowledge-base-*`
- `portal-usage`
- `portal-userinfo`

### 4.4 Update CLAUDE.md

Rewrite to reflect the new 3-pillar architecture, removed features, and updated file structure.

---

## Migration Strategy (Existing Users)

1. **No data loss.** No tables dropped, no rows deleted.
2. **Phase 1-3:** Old and new routes coexist. Users with bookmarks to `/live` or `/create/*` still reach those pages.
3. **Phase 4:** Redirects ensure old URLs point to new equivalents.
4. **Company profiles:** Created with `status: 'empty'` for all existing users. On first visit to dashboard, they get directed to the interview.
5. **Existing knowledge base:** Untouched. Weaviate documents continue to work. The new studio uses the same dual-tenant KB architecture.
6. **Existing Google Drive content:** Accessible through the new Content Library (same `/api/content-storage` backend).
7. **Existing conversations:** Remain in the database. Not shown in studio history (different `type` field), but data is preserved.

---

## n8n Safety Protocol

For every n8n workflow change:
1. **Before:** `GET /api/v1/workflows/{id}` -> save response to `/tmp/claude/n8n-backup-{id}-{timestamp}.json`
2. **Change:** Apply modifications via `PUT /api/v1/workflows/{id}`
3. **After:** Test the webhook endpoint against production
4. **If broken:** Restore from backup via `PUT`

New workflows are safe — they don't affect existing functionality until the console starts calling them.

---

## Verification Plan

### Phase 1 verification
- [ ] Navigate to `/profile` — interview starts, AI asks first question
- [ ] Complete 8-12 turns — profile card on right fills in progressively
- [ ] Interview completes — profile summary shown, status becomes 'complete'
- [ ] Navigate to `/profile` again — sees editable profile view
- [ ] Edit a field, save — profile updates persist
- [ ] Sidebar shows correct 3-pillar navigation with profile status dot
- [ ] Dashboard redirects based on profile status
- [ ] Existing `/live` page still works (no regression)

### Phase 2 verification
- [ ] Navigate to `/studio` — template picker shown
- [ ] Click "Blog Post" — conversation starts, AI references company profile
- [ ] AI asks 2-3 focused questions (not generic, uses profile context)
- [ ] After answering, AI produces full draft in DraftCard
- [ ] "Copy" copies to clipboard
- [ ] "Save to Library" creates Google Doc, shows success
- [ ] "Refine" lets user request changes, AI produces updated draft
- [ ] Conversation history shows previous studio conversations
- [ ] Freeform input ("I need a LinkedIn post about...") works without template selection

### Phase 3 verification
- [ ] Navigate to `/library` — shows all Google Drive content
- [ ] Filter by content type works
- [ ] Click item — preview panel opens with full content
- [ ] Download as PDF/DOCX works
- [ ] Delete works
- [ ] Settings page shows only account/credits/language

### Phase 4 verification
- [ ] `/live` redirects to `/studio`
- [ ] `/create/blogpost` redirects to `/studio`
- [ ] `/editor/abc123` redirects to `/library`
- [ ] No dead links in the application
- [ ] `pnpm lint` passes with zero warnings
- [ ] `pnpm build` succeeds
- [ ] `pnpm test` passes

---

## Key Architecture Decisions

1. **JSONB for profile storage** — flexibility to iterate on profile structure without migrations
2. **Separate interview workflow** — keeps the interview AI focused on one job, not overloaded like the current live-message prompt
3. **Studio mode as a branch in live-message** — preserves existing behavior during transition, avoids duplicating the full workflow
4. **Draft markers in AI response** — `---DRAFT---` tags let frontend distinguish conversational text from deliverable content
5. **No streaming** — current n8n setup returns complete JSON responses. Streaming can be added later but isn't required for the core experience.
6. **Google Drive stays** — it works, users know it, and it provides real document management (export, sharing) for free

---

*Created: 2026-05-09*
*Status: Awaiting approval for Phase 1 execution*
