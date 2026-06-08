let raw = $input.first().json.output;
const sessionId = $('Build Prompt').first().json.sessionId;
const userId = $('Build Prompt').first().json.userId;
const clientId = $('Build Prompt').first().json.clientId;
const forceClose = $('Build Prompt').first().json.forceClose === true;

const CLOSE_LINE = 'go look for the voices you should be listening to';

let parsed = null;
if (typeof raw === 'object' && raw !== null) {
  parsed = raw;
} else {
  let text = String(raw || '').trim();
  text = text.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?\s*```\s*$/, '').trim();
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try { parsed = JSON.parse(match[0]); } catch (e2) { parsed = null; }
    }
  }
  if (parsed === null) {
    // Could not parse JSON (often a truncated closing payload). Recover the message and detect the close.
    const rawText = String(raw || '');
    const closing = (rawText.indexOf(CLOSE_LINE) >= 0) || forceClose;
    let msg = '';
    const mm = rawText.match(/"message"\s*:\s*"((?:[^"\\]|\\.)*)"/);
    if (mm) { try { msg = JSON.parse('"' + mm[1] + '"'); } catch (e3) { msg = mm[1]; } }
    if (msg === '') msg = rawText.replace(/```[\s\S]*$/, '').replace(/\{[\s\S]*$/, '').trim();
    if (msg === '' || msg.charAt(0) === '{') msg = 'Een moment, ik zet je Radar klaar.';
    parsed = { message: msg, done: closing, priorities: null, sources: [] };
  }
}

let message = parsed.message || String(raw);
let done = parsed.done === true;
const priorities = parsed.priorities || null;
const sources = Array.isArray(parsed.sources) ? parsed.sources : [];

// Safety net: if the close line was emitted, treat as done even if the flag was dropped.
if (done === false && typeof message === 'string' && message.indexOf(CLOSE_LINE) >= 0) {
  done = true;
}

return [{ json: {
  message: message,
  done: done,
  priorities: priorities,
  sources: sources,
  sessionId: sessionId,
  userId: userId,
  clientId: clientId
}}];
