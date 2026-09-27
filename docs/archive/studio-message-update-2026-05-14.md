# n8n Workflow Update: studio-message

**Workflow ID:** axdg9OFz7eAMM5dU
**Workflow Name:** studio-message
**Final Version:** 128
**Status:** Active
**Date:** 2026-05-14

---

## Changes Applied

### 1. Build Prompt Node (id: `sm-prompt`)

Added two new toggle flags that default to `true` when not provided:

```javascript
// Flags from frontend (default true if not provided)
const useKnowledgeBase = body.useKnowledgeBase !== false;
const usePersonalVoice = body.usePersonalVoice !== false;

const genericStyle = 'Write in a professional, clear, and approachable tone. Use active voice. Be concise but thorough. Avoid jargon unless the audience expects it. Structure content with clear headings and short paragraphs.';
```

**Voice Toggle Logic:**
- When `usePersonalVoice` is `true`: Uses the full brand voice document from Google Drive
- When `usePersonalVoice` is `false`: Falls back to `genericStyle` (professional, neutral tone)

**Return Object Updates:**
```javascript
return [{
  json: {
    // ... existing fields ...
    personaDocText: usePersonalVoice ? personaDocText.trim() : genericStyle,
    // ... existing fields ...
    useKnowledgeBase,
    usePersonalVoice
  }
}];
```

### 2. AI Agent Node (id: `sm-agent`)

Updated the system message to make knowledge base access conditional:

**Knowledge Base Section:**
```
## Knowledge Base
{{ $json.useKnowledgeBase ? 'You have access to two knowledge base search tools (Company KB and Private KB).
- BEFORE making factual claims about the company, its products, services, or policies, search the knowledge base.
- Always search BOTH stores for complete coverage.
- If information is not found in the knowledge base, say so honestly. Do not fabricate facts.
- Cite sources at the end of your response using: Sources:
- [Document Title]' : 'Knowledge base search is DISABLED for this conversation. Do not use the search tools. If the user asks something that requires company-specific facts, tell them to enable the knowledge base toggle.' }}
```

**Your Approach - Step 3:**
```
3. When you have enough info, {{ $json.useKnowledgeBase ? 'search the knowledge base for relevant facts, then ' : '' }}produce COMPLETE content.
```

---

## Workflow Behavior

### Frontend Integration

The workflow now accepts two boolean flags in the POST body:

```typescript
POST /webhook/studio-message

{
  "message": "...",
  "conversationId": "...",  // optional
  "contentFormat": "...",    // optional
  "useKnowledgeBase": true,  // optional, defaults to true
  "usePersonalVoice": true   // optional, defaults to true
}
```

### Default Behavior (Both Flags True)

- AI uses the full brand voice document
- AI searches both knowledge base stores before making factual claims
- Full personalization and fact-checking enabled

### usePersonalVoice = false

- AI uses generic professional tone instead of brand voice
- Suitable for users who want neutral, non-branded content
- Still searches knowledge base (if that flag is true)

### useKnowledgeBase = false

- AI does NOT search the knowledge base
- Faster responses (no vector search overhead)
- AI explicitly tells user if they ask for company-specific facts
- Still uses brand voice (if that flag is true)

### Both Flags False

- Generic professional tone
- No knowledge base access
- Fastest responses, minimal context

---

## Technical Notes

### n8n API Bug Handling

The n8n REST API has a known bug where `!` characters in Code node jsCode get corrupted to `\!` during JSON round-trips. This was fixed using the hex-level replacement method documented in CLAUDE.md:

```python
code.replace('\x5c\x21', '\x21')  # Replace backslash-! with just !
```

### Backup Files

- Original workflow state (version 111) backed up at `/tmp/claude/studio-message-backup.json`
- Final verified state (version 128) at `/tmp/claude/workflow-final.json`

### Verification Results

- useKnowledgeBase flag present in Build Prompt node
- usePersonalVoice flag present in Build Prompt node
- genericStyle constant defined
- Voice toggle logic applied to personaDocText
- Both flags added to return object
- Knowledge base toggle in AI Agent system message
- Step 3 conditional search instruction updated
- No backslash corruption detected in final code
- Workflow active and webhook registered

---

## Next Steps for Frontend

The frontend should pass these flags when calling the webhook:

```typescript
const response = await fetch('/api/studio/message', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: userInput,
    conversationId: currentConversation?.id,
    contentFormat: selectedFormat,
    useKnowledgeBase: knowledgeBaseToggle,  // Add this
    usePersonalVoice: personalVoiceToggle   // Add this
  })
});
```

The API route should proxy these flags to the n8n webhook unchanged.

---

**Update completed successfully on 2026-05-14**
