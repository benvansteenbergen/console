const body = $('Webhook').item.json.body;
const profile = $('Load Profile').item.json;
const userMessage = body.message;
const contentFormat = body.contentFormat || null;

// Flags from frontend (default true if not provided)
const useKnowledgeBase = body.useKnowledgeBase !== false;
const usePersonalVoice = body.usePersonalVoice !== false;

// Knowledge base scope from the Studio picker: { mode: 'all' | 'folders' | 'off', folderIds, folderNames }.
// Older callers only send useKnowledgeBase. The filter is applied to both KB search tools
// (options.searchFilterJson), so 'folders' and 'off' are enforced, not just asked of the model.
const kbIn = body.knowledgeBase && typeof body.knowledgeBase === 'object' ? body.knowledgeBase : null;
const KB_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SHARED = '__shared__';
let kbMode = useKnowledgeBase ? 'all' : 'off';
let kbFolderIds = [];
let kbIncludeShared = false;
if (kbIn !== null) {
  if (kbIn.mode === 'off') kbMode = 'off';
  else if (kbIn.mode === 'folders') {
    const raw = Array.isArray(kbIn.folderIds) ? kbIn.folderIds.map(String) : [];
    kbIncludeShared = raw.includes(SHARED);
    kbFolderIds = raw.filter(function (x) { return KB_UUID.test(x); }).slice(0, 50);
    kbMode = (kbFolderIds.length > 0 || kbIncludeShared) ? 'folders' : 'all';
  } else kbMode = 'all';
}
const kbFolderNames = kbIn !== null && Array.isArray(kbIn.folderNames)
  ? kbIn.folderNames.map(function (n) { return String(n).slice(0, 60); }).slice(0, 50) : [];

let kbFilter = null;
if (kbMode === 'off') {
  kbFilter = { path: ['folder_id'], operator: 'Equal', valueString: '__off__' };
} else if (kbMode === 'folders') {
  const parts = kbFolderIds.map(function (id) { return { path: ['folder_id'], operator: 'Equal', valueString: id }; });
  if (kbIncludeShared) {
    parts.push({ path: ['uploaded_by'], operator: 'NotEqual', valueString: $('Fetch User').item.json.user_id });
  }
  kbFilter = parts.length === 1 ? parts[0] : { OR: parts };
}
const kbScopeNote = kbMode === 'folders'
  ? '\n- The user limited the knowledge base to these folders: ' + (kbFolderNames.length > 0 ? kbFolderNames.join(', ') : 'a selection') + '. The search tools only return documents from them.'
  : '';

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
    const res = await helpers.httpRequest({ method: 'GET', url: 'https://r.jina.ai/' + sourceUrl, timeout: 8000, headers: { 'User-Agent': 'Mozilla/5.0 (compatible; StudioBot/1.0)' } });
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
    'press-release': 'Press Release',
    'linkedin-post': 'LinkedIn Post',
    'instagram-post': 'Instagram Post'
  };
  formatContext = '\n## Content Format\nThe user wants to create: ' + (formatLabels[contentFormat] || contentFormat) + '\nStay on this exact format and platform for the entire conversation. Never deliver the piece for a different platform or format unless the user explicitly asks you to switch.\n';
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

function sqlEscapeMsg(str) {
  if (str == null || str === '') return '';
  return String(str).replace(/'/g, "''");
}

return [{
  json: {
    userMessageSafe: sqlEscapeMsg(userMessage),
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
    useKnowledgeBase: kbMode !== 'off',
    usePersonalVoice,
    kbMode,
    kbFilter,
    kbScopeNote
  }
}];