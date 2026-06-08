const response = $input.first().json;
const context = $('Loop Sources').first().json;
const sourceUrl = (context.source_url || '').trim();
const rootDomain = (sourceUrl.match(/^https?:\/\/[^\/]+/) || [])[0] || sourceUrl;

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

// 2. RSS / Atom autodiscovery in the HTML <head>
const rssLink = body.match(/<link[^>]*type=["']application\/(?:rss|atom)\+xml["'][^>]*href=["']([^"']+)["']/i)
  || body.match(/<link[^>]*href=["']([^"']+)["'][^>]*type=["']application\/(?:rss|atom)\+xml["']/i);
if (rssLink && rssLink[1]) {
  let feedUrl = rssLink[1].trim();
  if (feedUrl.startsWith('//')) feedUrl = 'https:' + feedUrl;
  else if (feedUrl.startsWith('/')) feedUrl = rootDomain + feedUrl;
  else if (/^https?:/i.test(feedUrl) === false) feedUrl = sourceUrl.replace(/\/+$/, '') + '/' + feedUrl.replace(/^\/+/, '');
  return [{ json: { ...context, feedUrl, fetchMode: 'rss' } }];
}

// 3. No feed found — render the page through Jina Reader.
// Handles JS-rendered sites, sources without RSS, and pages that blocked our direct fetch.
return [{ json: { ...context, feedUrl: 'https://r.jina.ai/' + sourceUrl, fetchMode: 'jina' } }];
