# Design Brief: Company Profile Interview Screen

## The Job of This Screen

This is the first thing a new user sees after login. It's the onboarding. It's the hook. It's where they go from "another SaaS tool" to "oh, this actually gets me." If this screen doesn't make them lean in within 30 seconds, the rest of the product doesn't matter.

The user talks to an AI for 10 minutes. When they're done, the AI knows their company — their brand, their voice, their products, their audience, their strategy. That's the promise. The screen needs to make that promise feel real, immediate, and delightful.

---

## Who Is the User

A marketing employee or business owner at a small-to-medium company. They were handed this tool by their branding agency (Emotion). They didn't seek it out. They're skeptical. They've seen a hundred dashboards. They've filled out a hundred onboarding forms. They expect this to be boring.

**Our job is to prove them wrong in the first interaction.**

---

## The Emotional Arc

This screen has a story. It goes through stages:

### Stage 1: "Oh, this is different" (first 5 seconds)
The user lands here and does NOT see a form. Not a wizard. Not a progress bar with 7 steps. They see a clean, warm, conversational space with a single question waiting for them: *"Tell me about your company. What do you do?"*

The feeling: this is a conversation, not a configuration panel.

### Stage 2: "It's actually listening" (turns 1-4)
The AI responds with genuine follow-up questions. Not generic. It picks up on what they said. The right side of the screen starts to change — their company name appears, then their industry, then a product. Little by little, a profile is forming.

The feeling: something is being built in real-time from what I'm saying. My words matter.

### Stage 3: "It gets me" (turns 5-8)
The profile card is filling up. The AI references things the user said earlier. The conversation feels natural, not scripted. The user starts sharing more freely because they feel understood.

The feeling: this is the first tool that actually learns who we are.

### Stage 4: "That's... actually us" (turns 8-12)
The AI presents a summary. The profile card is complete. The user reads through it and thinks: "yeah, that's right." Maybe they correct one thing. But the core is solid.

The feeling: I just had a 10-minute conversation and this tool now knows my company better than most of my colleagues.

### Stage 5: "Let's go" (completion)
A subtle celebration. Not confetti — that's cheap. Something that communicates: your foundation is set, everything from here builds on this. A clear, inviting CTA to start creating content.

The feeling: I'm ready. I trust this tool. Show me what it can do.

---

## Layout

### Overall Structure
Full viewport height. No scrolling on the page itself — the content areas scroll independently. No sidebar visible during the interview (this is an immersive experience). Minimal chrome — just the brand logo in the top-left corner and nothing else in the header.

### Two Panels

**Left Panel (60-65%) — The Conversation**
This is where the dialogue lives. It should feel like a modern messaging app, but more refined. Not a chatbot widget — a proper conversation space.

- Messages from the AI appear on the left with a subtle brand accent (not a generic avatar — something that feels crafted, like a small logo mark or a warm gradient circle)
- User messages appear on the right, styled simply but distinctly
- The input area at the bottom should feel inviting, not cramped. Generous padding. A subtle placeholder that changes contextually (not always "Type a message...")
- Auto-scroll to latest message with smooth behavior
- When the AI is thinking: a gentle breathing animation or subtle dots. NOT a spinner. NOT "Thinking..." text. Something that feels alive.

Design reference: think iMessage meets a premium consultation tool. Clean. Spacious. Warm.

**Right Panel (35-40%) — The Living Profile**

This is where the magic happens visually. As the conversation progresses, the profile materializes.

The profile card should feel like a living document being written in real-time. Not a form being filled. Not a database being populated. A portrait being painted.

Sections:
1. **Company identity** — name, tagline, industry
2. **Products & Services** — what they offer
3. **Audience** — who they serve, what problems they solve
4. **Voice & Tone** — how they communicate
5. **Strategy** — content goals, brand values
6. **Positioning** — what makes them unique

**How sections appear:**

When the profile is empty (start of interview), the right panel shows a soft, minimal outline — like a sketch waiting to be filled in. Not empty fields. Not "Not set" labels. Something more like faint section headers with a subtle pattern or gradient that suggests "something will appear here."

As the AI extracts information:
- A section header animates in (fade + slight upward motion)
- Content appears with a typing/reveal effect — not instant, not slow. A brief, satisfying moment of materialization.
- Each new section arriving should feel like a small reward
- Previously filled sections remain visible but settle into a quieter visual state
- The most recently updated section has a subtle highlight or glow that fades after 2-3 seconds

The overall effect: watching something take shape. Like watching a polaroid develop.

### Completion State

When the AI declares the interview complete:

1. The conversation shows the summary message
2. The profile card on the right does a subtle full-panel animation — a gentle pulse or brief glow — signaling "it's complete"
3. A completion badge appears at the top of the profile card (not a modal, not a popup — integrated into the profile itself)
4. Below the profile card: a single CTA button — "Start creating content" — that feels like the obvious, natural next step
5. A small secondary link: "Edit your profile" for users who want to fine-tune

The celebration should be understated but unmistakable. The user should feel accomplished, not bombarded.

---

## Visual Language

### Color
- The conversation area should be light and clean — white or very subtle warm gray
- AI messages: subtle tinted background (not gray — something that has brand warmth)
- User messages: the brand's primary color, but not harsh. Confident but calm.
- Profile card: white card on a very slightly contrasting background (or a subtle gradient)
- Section highlights: a warm accent color when new data appears (golden, amber, or soft brand accent)
- Avoid: blue-purple gradients everywhere (that's the current LiveChat aesthetic — we're moving away from generic)

### Typography
- The conversation should use the main body font at a comfortable reading size
- Profile card: slightly tighter, more structured. Section headers in a medium weight, content in regular. Not cramped.
- The AI's messages should feel human. Not monospace. Not "assistant-like." Real text.

### Spacing and Rhythm
- Generous whitespace everywhere. The screen should breathe.
- Message spacing should feel conversational — like natural pauses between turns
- Profile card sections should have clear visual separation but not hard dividers. Space, not lines.

### Motion
- All animations should be subtle and purposeful. 200-400ms. Ease-out curves.
- Nothing should bounce, wiggle, or draw attention for attention's sake
- The "thinking" state should feel calm, not anxious
- Section reveals on the profile card should feel organic — like ink spreading on paper
- The completion animation should be a single, understated moment — not a parade

### Icons
- Minimal icon usage. Where used, they should be simple line icons (Heroicons style)
- Each profile section could have a small, subtle icon to aid scanning
- The AI "avatar" should be a small brand mark, not a robot face or generic circle

---

## Interaction Details

### The Input Area
- Single-line text input that expands to multi-line as the user types (like modern messaging)
- Send on Enter, Shift+Enter for newline
- Send button appears only when there's text (or is subtly disabled when empty)
- Placeholder text that contextualizes:
  - Start: "Tell me about your company..."
  - After first response: "Continue the conversation..."
  - Or no placeholder at all — just a clean empty field

### Profile Card Interactions (during interview)
- The profile card is READ-ONLY during the interview. No edit buttons. No forms. Just watching it build.
- Hovering over a section could show a very subtle tooltip: "Extracted from your conversation" — reinforcing that this comes from what they said, not what they filled in
- If a section updates (AI revises based on new info), the old content smoothly transitions to new content

### Profile Card Interactions (after interview)
- Each section becomes editable (click to edit, or an edit icon appears on hover)
- "Re-run interview" button in a secondary position (not prominent — most users won't need it)
- Save changes with an inline save action (not a separate page or modal)

### Error States
- If the AI fails to respond: a calm, helpful message. "Let me try that again." Not a red error box.
- If the connection drops: subtle reconnection attempt with a quiet indicator. Not a modal.

### Responsiveness
- On mobile: the profile card collapses below the conversation (not side-by-side). A tab or swipe gesture lets the user peek at the building profile.
- The conversation is always the primary focus. The profile card is secondary — a delightful companion, not a requirement to see at all times.

---

## What This Screen Is NOT

- It is NOT a form with fields. There are zero form inputs on the profile card side.
- It is NOT a chatbot widget in the corner. It's a full-screen experience.
- It is NOT a wizard with steps and progress bars. There's no "Step 2 of 7."
- It is NOT generic. The brand should be present but subtle — logo, accent colors, the AI's "personality."
- It is NOT overwhelming. At any moment, the user's eye should know where to look and what to do next: read the AI's question, type an answer. That's it.

---

## What Makes the User Smile

1. **The first AI response** — it doesn't say "Thank you for sharing." It picks up on something specific they said and asks a genuinely interesting follow-up. It feels like talking to a person who cares.

2. **Watching the profile build** — the right panel slowly materializing from empty to complete is inherently satisfying. Like filling in a map. Like watching your character stats grow. It's visual progress without a progress bar.

3. **The summary moment** — when the AI says "Here's what I know about you" and it's accurate. That's the "wow." That's the smile. The user didn't fill in 30 fields. They had a conversation. And the tool understood.

4. **The completion** — no fanfare. No "Congratulations!" banner. Just a quiet, confident: "Your profile is ready. Let's create something." The understatement IS the delight. It says: we respect your intelligence.

---

## Reference Points (mood, not copy)

- **Stripe onboarding** — clean, focused, one thing at a time
- **Linear app** — minimal UI that still feels powerful and crafted
- **Apple product pages** — reveal animations that make information feel important
- **Notion's empty states** — inviting, not empty. Suggestive, not demanding.

---

## Deliverable

A high-fidelity wireframe or interactive prototype showing:
1. Empty state (user just landed, first AI message visible, profile card with placeholder outlines)
2. Mid-conversation state (3-4 turns in, 2 profile sections filled, 1 section animating in)
3. Completion state (full profile, summary message, CTA visible)
4. Mobile responsive view (conversation primary, profile as secondary panel)

Each state should demonstrate the emotional arc described above. The prototype should make the reviewer think: "I'd actually enjoy going through this."
