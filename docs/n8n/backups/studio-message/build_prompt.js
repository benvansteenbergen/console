const body = $('Webhook').item.json.body;
const profile = $('Load Profile').item.json;
const userMessage = body.message;
const contentFormat = body.contentFormat || null;

// Flags from frontend (default true if not provided)
const useKnowledgeBase = body.useKnowledgeBase !== false;
const usePersonalVoice = body.usePersonalVoice !== false;

const genericStyle = 'Write in a professional, clear, and approachable tone. Use active voice. Be concise but thorough. Avoid jargon unless the audience expects it. Structure content with clear headings and short paragraphs.';

// Get persona doc content (full brand voice document from Google Drive)
let personaDocText = '';
try {
  const personaDoc = $('Load Persona Doc').first().json;
  if (personaDoc && personaDoc.body && personaDoc.body.content) {
    // Google Docs API returns structured content, extract text
    const content = personaDoc.body.content;
    for (const element of content) {
      if (element.paragraph && element.paragraph.elements) {
        for (const el of element.paragraph.elements) {
          if (el.textRun && el.textRun.content) {
            personaDocText += el.textRun.content;
          }
        }
      }
    }
  } else if (personaDoc && personaDoc.content) {
    // Simpler format - plain text content
    personaDocText = personaDoc.content;
  }
} catch(e) {
  personaDocText = '';
}

// Get persona summary as fallback
let profileSummary = {};
try {
  if (profile && profile.profile_summary) {
    profileSummary = typeof profile.profile_summary === 'string'
      ? JSON.parse(profile.profile_summary)
      : profile.profile_summary;
  }
} catch(e) {
  profileSummary = {};
}

const cleanProfile = { ...profileSummary };
delete cleanProfile._conversation;
delete cleanProfile.completeness;

// Load conversation history
const historyItems = $('Load History').all();
let historyText = '';
if (historyItems && historyItems.length > 0 && historyItems[0].json.role) {
  historyText = '=== CONVERSATION SO FAR ===\n';
  for (const item of historyItems) {
    if (item.json.role === undefined || item.json.role === null) continue;
    const label = item.json.role === 'user' ? 'User' : 'You (assistant)';
    historyText += label + ': ' + item.json.content + '\n\n';
  }
  historyText += '=== END OF HISTORY ===\n\n';
}

// Article handed over from Radar: fetch it once on the first turn so the agent writes from it.
const sourceUrl = (body.sourceUrl || '').trim();
let sourceBlock = '';
const hasHistory = historyItems && historyItems.length > 0 && historyItems[0].json.role ? true : false;
if (sourceUrl.length > 0) {
  let articleText = '';
  try {
    const helpers = this.helpers;
    const res = await helpers.httpRequest({ method: 'GET', url: 'https://r.jina.ai/' + sourceUrl, timeout: 25000, headers: { 'User-Agent': 'Mozilla/5.0 (compatible; StudioBot/1.0)' } });
    articleText = typeof res === 'string' ? res : String((res && (res.body || res.data)) || '');
  } catch (e) {
    articleText = '';
  }
  if (articleText.length > 0) {
    sourceBlock = '=== SOURCE ARTICLE (the user opened this from Radar; THIS is the article they mean) ===\nURL: ' + sourceUrl + '\n' + articleText.slice(0, 6000) + '\n=== END SOURCE ARTICLE ===\nThis SOURCE ARTICLE is the material for this task. When the user refers to "the article" (summarise it, react to it, write something from it), they mean THIS text above; work directly from it and do not invent facts beyond it. Do NOT use the knowledge-base search to find, fetch, or summarise an article; the knowledge base is only for facts about the user OWN company. If the user already gave a clear instruction such as "summarise it", carry it out now using this article instead of asking which article or which channel.\n\n';
  } else {
    sourceBlock = 'The user picked an article from Radar to write about: ' + sourceUrl + '. Treat it as the source for this piece. If you cannot recall its contents, ask them for the key points.\n\n';
  }
}

// Format template info
let formatContext = '';
if (contentFormat) {
  const formatLabels = {
    'blog-post': 'Blog Post',
    'case-study': 'Case Study',
    'product-sheet': 'Product Sheet',
    'social-media': 'Social Media Post',
    'email-campaign': 'Email Campaign',
    'press-release': 'Press Release'
  };
  formatContext = '\n## Content Format\nThe user wants to create: ' + (formatLabels[contentFormat] || contentFormat) + '\n';
}

// Build conversation ID
function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

const conversationId = body.conversationId || uuid();
const isNewConversation = body.conversationId ? false : true;

// Fallback: build voice guidance from profile summary when persona doc is missing
let fallbackVoice = genericStyle;
if (cleanProfile.tone_keywords && cleanProfile.tone_keywords.length > 0) {
  fallbackVoice = 'Write in the following tone and voice: ' + cleanProfile.tone_keywords.join(', ') + '.';
  if (cleanProfile.audience) {
    fallbackVoice += ' Target audience: ' + cleanProfile.audience + '.';
  }
  if (cleanProfile.name) {
    fallbackVoice += ' Company: ' + cleanProfile.name + '.';
  }
  if (cleanProfile.industry) {
    fallbackVoice += ' Industry: ' + cleanProfile.industry + '.';
  }
  fallbackVoice += ' ' + genericStyle;
}

return [{
  json: {
    query: sourceBlock + historyText + 'User says now: ' + userMessage,
    conversationId,
    isNewConversation,
    userMessage,
    contentFormat,
    formatContext,
    personaDocText: usePersonalVoice ? (personaDocText.trim() || fallbackVoice) : genericStyle,
    brandProfile: JSON.stringify(cleanProfile),
    clientKey: $('Fetch User').item.json.client,
    userId: $('Fetch User').item.json.user_id,
    useKnowledgeBase,
    usePersonalVoice
  }
}];