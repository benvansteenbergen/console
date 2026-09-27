# N8N Live Chat Integration Guide

This document outlines how to integrate the console's Live Chat feature with n8n workflows for intelligent, multi-agent content generation.

## Overview

The Live Chat feature supports two modes:
1. **Regular Chat Mode**: Simple RAG-based Q&A (no content format selected)
2. **Content Generation Mode**: Structured content creation with format-specific questions (content format selected)

## Webhook Endpoint

**URL**: `${N8N_BASE_URL}/webhook/knowledge-base-live`
**Method**: POST
**Authentication**: JWT via `auth` cookie header

## Request Payload

```json
{
  "sessionId": "session-1703012345678-abc123",
  "query": "Write a blog post about our AI features",
  "selectedClusters": ["product_sheets", "documentation"],
  "excludedDocuments": ["doc-id-to-exclude"],
  "contentFormat": "blog-post",
  "toneOfVoice": "professional"
}
```

### Payload Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `sessionId` | string | Yes | Unique session identifier for conversation continuity |
| `query` | string | Yes | User's question or content request |
| `selectedClusters` | string[] | No | Knowledge base clusters to search (empty = search all) |
| `excludedDocuments` | string[] | No | Document IDs to exclude from search |
| `contentFormat` | string \| null | No | Content format type (see formats below) |
| `toneOfVoice` | string \| null | No | Desired tone (see tones below) |

### Content Formats

- `""` (empty) - Regular chat mode
- `"blog-post"` - Blog Post
- `"case-study"` - Case Study
- `"product-sheet"` - Product Sheet
- `"social-media"` - Social Media Post
- `"email-campaign"` - Email Campaign
- `"press-release"` - Press Release

### Tone of Voice Options

- `""` (empty) - No specific tone
- `"vitriwand-tov"` - Vitriwand brand tone (requires brand guidelines in knowledge base)
- `"professional"` - Professional tone
- `"casual"` - Casual/conversational tone
- `"technical"` - Technical/detailed tone

## Response Format

```json
{
  "success": true,
  "content": "Generated content here...",
  "context": [
    {
      "document_id": "doc-123",
      "title": "Product Features Overview",
      "snippet": "Relevant snippet from the document...",
      "cluster": "product_sheets"
    }
  ]
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Whether the request succeeded |
| `content` | string | Generated content or error message |
| `context` | array | Array of source documents used (optional) |

## Multi-Agent Workflow Architecture

### Flow Overview

```
User Query
    ↓
[Orchestrator Agent] ← You are here in the Live Chat webhook
    ↓
    ├─→ Regular Chat Mode (no contentFormat)
    │   ├─→ [RAG Search] Search Weaviate with filters
    │   ├─→ [AI Agent] Generate answer using retrieved context
    │   └─→ Return response
    │
    └─→ Content Generation Mode (contentFormat provided)
        ├─→ [Ask Clarifying Questions] (skippable)
        ├─→ [Content Writer Agent] Generate structured content
        ├─→ [Proofreader Agent] Review and polish (if user requests iteration)
        └─→ Return final content
```

### Agent Roles

#### 1. Orchestrator Agent (Live Chat Webhook)

**Responsibility**: Route requests and manage conversation flow

**Logic**:
```javascript
// Pseudo-code for n8n orchestrator
if (!contentFormat) {
  // Regular chat mode
  return await handleRegularChat(query, selectedClusters, excludedDocuments);
} else {
  // Content generation mode
  return await handleContentGeneration(
    sessionId,
    query,
    contentFormat,
    toneOfVoice,
    selectedClusters,
    excludedDocuments
  );
}
```

#### 2. Content Writer Agent

**Responsibility**: Generate format-specific content

**System Message**:
```
You are a professional content writer agent specializing in creating high-quality,
format-specific content.

Your task is to:
1. Review the user's request and any clarifying answers provided
2. Search the knowledge base for relevant information using the Weaviate tool
3. Generate content in the requested format following best practices
4. Apply the specified tone of voice consistently
5. Cite sources when appropriate

Format: {contentFormat}
Tone: {toneOfVoice}

Always ensure the content is:
- Accurate based on the knowledge base
- Well-structured for the format
- Engaging and valuable to readers
- Free of grammatical errors
```

#### 3. Proofreader Agent

**Responsibility**: Review and polish content based on user feedback

**System Message**:
```
You are a professional proofreader and editor.

Your task is to review and improve content based on user feedback.

The user has provided this feedback:
{userFeedback}

Original content:
{originalContent}

Please:
1. Address all points in the user's feedback
2. Maintain the original tone and format
3. Ensure factual accuracy with the knowledge base
4. Improve clarity and readability
5. Return only the revised content
```

## Session Management

### Session Storage

Use n8n's built-in session storage or a database to track:

```json
{
  "sessionId": "session-123",
  "conversationHistory": [
    {
      "role": "user",
      "content": "Write a blog post about AI",
      "timestamp": "2024-01-01T10:00:00Z"
    },
    {
      "role": "agent",
      "content": "What is the target audience?",
      "timestamp": "2024-01-01T10:00:01Z"
    },
    {
      "role": "user",
      "content": "Marketing professionals",
      "timestamp": "2024-01-01T10:00:30Z"
    }
  ],
  "currentPhase": "collecting_info",
  "collectedAnswers": {
    "target_audience": "Marketing professionals",
    "key_message": "",
    "word_count": "",
    "cta": ""
  },
  "contentFormat": "blog-post",
  "toneOfVoice": "professional",
  "generatedContent": null
}
```

### Session Phases

1. **collecting_info**: Agent is asking clarifying questions
2. **generating**: Content is being generated
3. **reviewing**: User is reviewing and may request changes
4. **completed**: Content is finalized

## Clarifying Questions Flow

### Implementation

```javascript
// Pseudo-code for question flow
const formatQuestions = getQuestionsForFormat(contentFormat);
const unansweredQuestions = formatQuestions.filter(
  q => !session.collectedAnswers[q.id]
);

if (unansweredQuestions.length > 0) {
  // Ask next question
  const nextQuestion = unansweredQuestions[0];
  return {
    success: true,
    content: nextQuestion.question + "\n\n(Type 'skip' to skip this question)",
    context: []
  };
} else {
  // All questions answered or skipped, generate content
  return await generateContent(session);
}
```

### Handling User Responses

```javascript
// Check if user is providing an answer or skipping
if (query.toLowerCase() === 'skip' || query.toLowerCase() === 's') {
  // Mark current question as skipped
  session.collectedAnswers[currentQuestionId] = null;
} else if (session.currentPhase === 'collecting_info') {
  // Store the answer
  session.collectedAnswers[currentQuestionId] = query;
} else {
  // User is requesting iteration on generated content
  return await handleIteration(session, query);
}
```

## Weaviate Search Integration

### Building the Filter

Use the same filter logic as in the regular knowledge base search:

```javascript
const filters = [];

// Cluster filtering (include)
if (selectedClusters && selectedClusters.length > 0) {
  filters.push({
    operator: 'Or',
    operands: selectedClusters.map(cluster => ({
      path: ['cluster'],
      operator: 'Equal',
      valueText: cluster
    }))
  });
}

// Document exclusion
if (excludedDocuments && excludedDocuments.length > 0) {
  filters.push({
    operator: 'And',
    operands: excludedDocuments.map(docId => ({
      path: ['document_id'],
      operator: 'NotEqual',
      valueText: docId
    }))
  });
}

// Combine filters
const finalFilter = filters.length === 0 ? null : (
  filters.length === 1 ? filters[0] : {
    operator: 'And',
    operands: filters
  }
);
```

### Search Parameters

```json
{
  "query": "user's query or synthesized search query",
  "limit": 10,
  "certainty": 0.7,
  "alpha": 0.75,
  "properties": ["text", "chunk_index", "document_id", "cluster", "title"],
  "where": finalFilter
}
```

## Format-Specific Questions Reference

See `lib/contentFormatQuestions.ts` for the complete list of questions per format.

### Example: Blog Post Questions

1. Who is the target audience for this blog post?
2. What is the main message or takeaway you want readers to have?
3. What is your preferred word count?
4. What call-to-action should be included at the end?

All questions are **optional** - users can skip any or all of them.

## Error Handling

### Common Error Scenarios

1. **No knowledge base content found**
```json
{
  "success": false,
  "content": "I couldn't find relevant information in the knowledge base for your request. Please try selecting different clusters or rephrasing your question.",
  "context": []
}
```

2. **Invalid session**
```json
{
  "success": false,
  "content": "Session expired. Please start a new chat.",
  "context": []
}
```

3. **Rate limiting**
```json
{
  "success": false,
  "content": "You've reached the maximum number of requests. Please try again in a few minutes.",
  "context": []
}
```

## Testing the Integration

### Test Payloads

**Regular Chat Mode**:
```bash
curl -X POST https://workflow.wingsuite.io/webhook/knowledge-base-live \
  -H "Content-Type: application/json" \
  -H "cookie: auth=YOUR_JWT_TOKEN;" \
  -d '{
    "sessionId": "test-session-1",
    "query": "What are our main product features?",
    "selectedClusters": ["product_sheets"],
    "excludedDocuments": [],
    "contentFormat": null,
    "toneOfVoice": null
  }'
```

**Content Generation Mode**:
```bash
curl -X POST https://workflow.wingsuite.io/webhook/knowledge-base-live \
  -H "Content-Type: application/json" \
  -H "cookie: auth=YOUR_JWT_TOKEN;" \
  -d '{
    "sessionId": "test-session-2",
    "query": "Write a blog post about our AI features",
    "selectedClusters": ["product_sheets", "documentation"],
    "excludedDocuments": [],
    "contentFormat": "blog-post",
    "toneOfVoice": "professional"
  }'
```

## Implementation Checklist

- [ ] Create webhook endpoint `/webhook/knowledge-base-live`
- [ ] Implement session storage (database or n8n memory)
- [ ] Add orchestrator logic to route between modes
- [ ] Implement Weaviate search with filtering
- [ ] Create Content Writer agent with proper system message
- [ ] Create Proofreader agent for iterations
- [ ] Implement clarifying questions flow
- [ ] Add error handling for all scenarios
- [ ] Test regular chat mode
- [ ] Test content generation mode
- [ ] Test iteration/feedback loop
- [ ] Test session persistence across messages
- [ ] Add rate limiting and usage tracking

## Advanced Features (Future)

- **Content Templates**: Pre-defined templates for common content types
- **Multi-language Support**: Generate content in different languages
- **SEO Optimization**: Automatic SEO suggestions for blog posts
- **A/B Testing**: Generate multiple versions for testing
- **Brand Voice Training**: Learn and apply company-specific tone
- **Collaboration**: Multiple users can contribute to same session
- **Export Options**: Export to different formats (Google Docs, PDF, etc.)

---

**Last Updated**: 2024-12-22
**Version**: 1.0
**Maintained By**: Console Development Team
