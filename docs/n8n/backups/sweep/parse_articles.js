const response = $input.first().json;
const context = $('Get Feed URL').first().json;
const fetchMode = context.fetchMode || 'rss';

let body = '';
if (typeof response === 'string') body = response;
else if (response.data) body = String(response.data);
else if (response.body) body = String(response.body);

if (body === '' || body.length < 30) return [];

function clean(s) {
  return (s || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&#0?39;/g, "'").replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ').trim();
}

const MAX = 20;
const articles = [];
let m;
const looksXml = /<rss[\s>]|<feed[\s>]|<rdf|<item[\s>]|<entry[\s>]|<url>/i.test(body);

if (fetchMode === 'jina' || looksXml === false) {
  // Jina Reader markdown (or any non-feed text): pull plausible article links from the rendered page.
  const host = rootDomainHost(context.source_url);
  const srcPath = (context.source_url || '').replace(/^https?:\/\/[^\/]+/, '').replace(/\/+$/, '');
  const navWords = /^(pricing|contact|about|career|careers|jobs|login|signin|sign-in|signup|sign-up|register|terms|privacy|legal|cookie|cookies|support|help|docs|documentation|demo|sales|enterprise|customer|customers|partner|partners|security|status|download|downloads|developer|developers|api|newsletter|subscribe|rss|sitemap|search|home|index)$/i;
  const seen = {};
  const linkRe = /\[([^\]]{6,180})\]\((https?:\/\/[^)\s]+)\)/g;
  while ((m = linkRe.exec(body)) !== null) {
    const title = clean(m[1]);
    let url = m[2].split('#')[0].replace(/[).,]+$/, '');
    if (title.length < 8) continue;
    if (host !== '' && url.indexOf(host) === -1) continue;             // same site only
    if (/\.(png|jpg|jpeg|gif|svg|webp|css|js|pdf|zip|mp4|mp3)(\?|$)/i.test(url)) continue;
    const path = url.replace(/^https?:\/\/[^\/]+/, '').split('?')[0];
    if (path.length < 10) continue;                                   // skip homepage / short nav links
    const segs = path.split('/').filter(function (x) { return x !== ''; });
    const lastSeg = segs.length ? segs[segs.length - 1] : '';
    if (navWords.test(lastSeg)) continue;                             // drop obvious nav/utility pages
    // Drop utility / section-index pages (a section dir, or utility words in the slug).
    if (/\/(privacy|policy|policies|cookies?|terms|legal|disclaimer|about|contact|sitemap|subscribe|newsletter|register|sign-?in|log-?in|advertis\w*|members?|membership|services?|resources?|topics?|categor\w+|tags?|authors?|jobs|careers?)\//i.test(path + '/')) continue;
    if (/(privacy|policy|cookie|terms|sitemap|subscribe|newsletter|\bmember|benefits|peer-review|withdrawal|advertis|disclaimer)/i.test(lastSeg)) continue;
    // Middle ground (not RSS-only): accept article-shaped links, reject section/category indexes.
    // Real articles carry a date, a numeric story id, or an all-lowercase multi-word slug;
    // section indexes like /News/Business/ or /Resources/Cultures-enzymes-yeast/ are Title-cased -> rejected.
    const hasDate = /\/20\d\d(\/|-|$)/.test(path) || /(^|[^0-9])20\d\d([^0-9]|$)/.test(lastSeg);
    const hasId = /\/\d{5,}(\/|$|\.)/.test(path) || /\d{6,}/.test(lastSeg);
    const lowerSlug = lastSeg === lastSeg.toLowerCase() && lastSeg.indexOf('-') >= 0 && lastSeg.length >= 10;
    if (hasDate === false && hasId === false && lowerSlug === false) continue;
    if (seen[url] === true) continue;
    seen[url] = true;
    articles.push({ article_title: title, article_url: url, article_text: title, article_hash: url });
    if (articles.length >= MAX) break;
  }
} else {
  // RSS 2.0 (and RSS 1.0/RDF items, which also carry a <link> child)
  const rssRe = /<item[\s>]([\s\S]*?)<\/item>/gi;
  while ((m = rssRe.exec(body)) !== null) {
    const xml = m[1];
    const title = clean((xml.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/) || [])[1]);
    let link = ((xml.match(/<link[^>]*>([\s\S]*?)<\/link>/) || [])[1] || '').trim();
    if (link === '') link = ((xml.match(/<link[^>]*href=["']([^"']+)["']/) || [])[1] || '').trim();
    if (link === '') link = ((xml.match(/rdf:about=["']([^"']+)["']/) || [])[1] || '').trim();
    if (link === '') link = ((xml.match(/<guid[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/guid>/) || [])[1] || '').trim();
    const desc = (xml.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/) || [])[1] || '';
    const content = (xml.match(/<content:encoded>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/content:encoded>/) || [])[1] || '';
    if (/^https?:/i.test(link)) {
      articles.push({ article_title: title, article_url: link, article_text: clean(content || desc).substring(0, 3000), article_hash: link });
    }
  }
  // Atom
  if (articles.length === 0) {
    const atomRe = /<entry[\s>]([\s\S]*?)<\/entry>/gi;
    while ((m = atomRe.exec(body)) !== null) {
      const xml = m[1];
      const title = clean((xml.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/) || [])[1]);
      let link = ((xml.match(/<link[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["']/i) || [])[1] || '').trim();
      if (link === '') link = ((xml.match(/<link[^>]*href=["']([^"']+)["']/i) || [])[1] || '').trim();
      const content = (xml.match(/<(?:content|summary)[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/(?:content|summary)>/) || [])[1] || '';
      if (/^https?:/i.test(link)) {
        articles.push({ article_title: title, article_url: link, article_text: clean(content).substring(0, 3000), article_hash: link });
      }
    }
  }
  // Google News / sitemap
  if (articles.length === 0) {
    const urlRe = /<url>([\s\S]*?)<\/url>/gi;
    while ((m = urlRe.exec(body)) !== null) {
      const xml = m[1];
      const loc = ((xml.match(/<loc>([^<]*)<\/loc>/) || [])[1] || '').trim();
      const title = clean((xml.match(/<news:title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/news:title>/) || [])[1]
        || (xml.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/) || [])[1]);
      if (loc !== '' && title !== '') {
        articles.push({ article_title: title, article_url: loc, article_text: title, article_hash: loc });
      }
    }
  }
}

function rootDomainHost(u) {
  const mm = (u || '').match(/^https?:\/\/([^\/]+)/);
  return mm ? mm[1] : '';
}

if (articles.length === 0) return [];
const recent = articles.slice(0, MAX);

return recent.map(function (a) {
  return { json: {
    article_title: a.article_title,
    article_url: a.article_url,
    article_text: a.article_text,
    article_hash: a.article_hash,
    user_id: context.user_id,
    source_id: context.source_id,
    source_name: context.source_name,
    source_url: context.source_url,
    priorities: context.priorities
  } };
});
