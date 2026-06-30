const response = $input.first().json;
const context = $('Loop Sources').first().json;
const sourceUrl = (context.source_url || '').trim();
const rootDomain = (sourceUrl.match(/^https?:\/\/[^\/]+/) || [])[0] || sourceUrl;
const basePath = sourceUrl.replace(/\/+$/, '');

if (sourceUrl === '') {
  return [{ json: { ...context, feedUrl: '__skip__', fetchMode: 'none' } }];
}

let body = '';
if (typeof response === 'string') body = response;
else if (response.data) body = String(response.data);
else if (response.body) body = String(response.body);

function feedLike(s) { return /<rss[\s>]|<feed[\s>]|<rdf|<item[\s>]|<entry[\s>]/i.test(s || ''); }

// 1. The page we already fetched IS a feed
if (feedLike(body)) {
  return [{ json: { ...context, feedUrl: sourceUrl, fetchMode: 'rss' } }];
}

// 2. RSS / Atom autodiscovery in the HTML <head> (either attribute order)
const discoverRes = [
  /<link[^>]*type=["']application\/(?:rss|atom)\+xml["'][^>]*href=["']([^"']+)["']/i,
  /<link[^>]*href=["']([^"']+)["'][^>]*type=["']application\/(?:rss|atom)\+xml["']/i,
];
function absolutise(u) {
  let f = u.trim();
  if (f.startsWith('//')) return 'https:' + f;
  if (f.startsWith('/')) return rootDomain + f;
  if (/^https?:/i.test(f) === false) return basePath + '/' + f.replace(/^\/+/, '');
  return f;
}
for (const re of discoverRes) {
  const mm = body.match(re);
  if (mm && mm[1]) {
    return [{ json: { ...context, feedUrl: absolutise(mm[1]), fetchMode: 'rss' } }];
  }
}

// 3. Probe a few common feed locations. Many sites publish a feed without advertising it in the
// HTML head we fetched (or the head was JS-rendered / blocked). First hit wins.
const helpers = (typeof this !== 'undefined' && this && this.helpers) ? this.helpers : null;
if (helpers && helpers.httpRequest) {
  const candidates = [];
  const seenC = {};
  const pushC = (u) => { if (u && seenC[u] !== true) { seenC[u] = true; candidates.push(u); } };
  ['/rss', '/feed', '/rss.xml', '/feed.xml', '/atom.xml'].forEach((p) => pushC(rootDomain + p));
  ['/rss', '/feed'].forEach((p) => pushC(basePath + p));
  for (const url of candidates) {
    try {
      const res = await helpers.httpRequest({ method: 'GET', url, timeout: 4000, headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RadarBot/1.0)' } });
      const txt = typeof res === 'string' ? res : (res && (res.body || res.data) ? String(res.body || res.data) : '');
      if (feedLike(txt)) {
        return [{ json: { ...context, feedUrl: url, fetchMode: 'rss' } }];
      }
    } catch (e) { /* try next candidate */ }
  }
}

// 4. No feed found — render the page through Jina Reader (JS sites / no RSS / blocked pages).
return [{ json: { ...context, feedUrl: 'https://r.jina.ai/' + sourceUrl, fetchMode: 'jina' } }];
