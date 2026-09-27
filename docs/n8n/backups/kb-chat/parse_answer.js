// kb-chat / Parse Answer
// Splits the agent's "Sources:" block off the answer so the console can show sources as chips.
const raw = String($('AI Agent').first().json.output || '').trim();
let answer = raw;
let sources = [];
const m = raw.match(/\n\s*\**\s*(Sources|Bronnen)\s*:?\s*\**\s*\n([\s\S]*)$/i);
if (m) {
  answer = raw.slice(0, m.index).trim();
  sources = m[2].split('\n')
    .map(function (l) { return l.replace(/^[\s\-*•\d.]+/, '').replace(/^\[|\]$/g, '').trim(); })
    .filter(function (l) { return l.length > 0 && l.length < 300; });
}
const seen = {};
sources = sources.filter(function (s) { if (seen[s]) return false; seen[s] = true; return true; }).slice(0, 10);
return [{ json: {
  success: true,
  answer: answer || 'I could not put an answer together. Please try again.',
  sources: sources,
} }];
