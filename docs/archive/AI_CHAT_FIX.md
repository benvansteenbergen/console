# AI Chat & Diff Fix Documentation

## Problem Statement

The AI chat response format was inconsistent, causing the diff comparison in DocCanvas to break. Issues included:
- AI returning JSON wrapped in markdown code blocks (```json ... ```)
- Extra whitespace and formatting
- Invalid JSON structure
- Inconsistent line endings
- Mixed content formats

## Solution Implemented

### 1. **Proper Stream Text Extraction**
```typescript
// Correctly await the full text from streamText
const fullText = await result.text;
```

The Vercel AI SDK requires awaiting `result.text` to get the complete response.

### 2. **Robust JSON Parser with Fallbacks**

Created `parseAIResponse()` function with 3-layer fallback:

**Layer 1:** Direct JSON parsing after cleaning
```typescript
// Remove markdown code blocks
cleaned = cleaned.replace(/^```json\s*/i, "");
cleaned = cleaned.replace(/\s*```$/, "");
const parsed = JSON.parse(cleaned);
```

**Layer 2:** Extract JSON from mixed content
```typescript
const jsonMatch = text.match(/\{[\s\S]*\}/);
const parsed = JSON.parse(jsonMatch[0]);
```

**Layer 3:** Treat entire response as suggested text
```typescript
return {
  assistant_message: "Unable to parse AI response. Showing raw output.",
  suggested_text: normalizeMarkdown(text),
};
```

### 3. **Markdown Normalization**

Created `normalizeMarkdown()` function that ensures consistent formatting:

```typescript
function normalizeMarkdown(text: string): string {
  return text
    // Normalize line endings (CRLF → LF)
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    // Trim whitespace
    .trim()
    // Normalize blank lines (3+ → 2)
    .replace(/\n{3,}/g, "\n\n")
    // Remove trailing spaces
    .replace(/ +$/gm, "")
    // Normalize header spacing (## Title)
    .replace(/^(#{1,6})\s+/gm, "$1 ")
    // Remove code block markers
    .replace(/^```[\w]*\s*/gm, "")
    .replace(/\s*```$/gm, "");
}
```

### 4. **Enhanced DocCanvas Normalization**

Updated `renderDiff()` to use same normalization:

```typescript
const normalize = (text: string) => {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim()
    .replace(/\n{3,}/g, "\n\n")
    .replace(/ +$/gm, "")
    .replace(/^(#{1,6})\s+/gm, "$1 ");
};
```

### 5. **Improved System Prompt**

More explicit instructions to the AI:

```
CRITICAL RULES:
- Return ONLY the JSON object, nothing else
- NO markdown code blocks (no ```json)
- NO extra explanations outside the JSON
- "suggested_text" must contain the COMPLETE document with proper markdown formatting
- Preserve document structure (headings, paragraphs, lists)
- Keep the same markdown style as the original
```

## Expected Response Format

```json
{
  "assistant_message": "Brief explanation of changes made",
  "suggested_text": "Complete updated document with all changes applied"
}
```

## Benefits

1. **Consistent Diff Comparison:** Normalized text ensures reliable diffs
2. **Robust Error Handling:** 3-layer fallback prevents crashes
3. **Clean Highlighting:** Only changed blocks are highlighted in yellow
4. **Better UX:** Users always see meaningful output, even if parsing fails

## Testing Scenarios Handled

✅ Valid JSON response
✅ JSON wrapped in markdown code blocks
✅ Mixed content with JSON embedded
✅ Plain text response (fallback)
✅ Invalid JSON (fallback)
✅ Extra whitespace
✅ CRLF line endings
✅ Inconsistent header spacing
✅ Multiple blank lines

## Files Modified

- `app/api/chat/route.ts` - Added JSON mode, parser, normalizer
- `components/editor/DocCanvas.tsx` - Enhanced normalization in diff
- `AI_CHAT_FIX.md` - This documentation

## Usage

No changes required in client code. ChatPane automatically receives properly formatted responses:

```typescript
const data = await res.json();
// Always guaranteed structure:
// { assistant_message: string, suggested_text: string }

if (data.suggested_text) {
  onPreview(data.suggested_text); // Already normalized
}
```

---

*Last Updated: 2024-10-20*
