/**
 * Probe: does the Wayback Machine hold real Coles product JSON?
 *
 * Coles blocks this network at the WAF (every path, robots.txt included, gets
 * the Incapsula challenge), so the only way to real SKU data is an archive.
 * This script checks a handful of archived captures and reports what is inside.
 */
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

async function get(url, tries = 4, timeout = 45000) {
  for (let i = 0; i < tries; i++) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), timeout);
      const res = await fetch(url, {
        signal: ctrl.signal,
        headers: { 'User-Agent': UA, Accept: 'text/html,application/json;q=0.9,*/*;q=0.8' }
      });
      clearTimeout(t);
      if (res.status === 200) return await res.text();
      if (res.status === 404) return '';
      if (res.status === 429 || res.status >= 500) {
        await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
        continue;
      }
      return '';
    } catch (e) {
      await new Promise((r) => setTimeout(r, 1200 * (i + 1)));
    }
  }
  return '';
}

export function extractNextData(html) {
  const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
  if (!m) return null;
  try {
    return JSON.parse(m[1]);
  } catch (e) {
    return null;
  }
}

function summarise(json) {
  if (!json) return null;
  const pp = (json.props && json.props.pageProps) || {};
  const sr = pp.searchResults || pp.searchResult || pp.initialState || null;
  const results = (sr && (sr.results || sr.products)) || pp.results || null;
  const first = Array.isArray(results) && results.length ? results[0] : null;
  return {
    page: json.page,
    buildId: json.buildId,
    pagePropsKeys: Object.keys(pp).slice(0, 14),
    resultCount: Array.isArray(results) ? results.length : 0,
    sample: first
      ? {
          id: first.id,
          name: first.name,
          brand: first.brand,
          size: first.size,
          price: first.pricing || first.price,
          image: first.imageUris || first.image || null
        }
      : null
  };
}

const targets = [
  ['search milk', 'https://web.archive.org/web/2024id_/https://www.coles.com.au/search/products?q=milk&sortBy=Popularity'],
  ['on-special', 'https://web.archive.org/web/2024id_/https://www.coles.com.au/on-special'],
  ['browse fruit', 'https://web.archive.org/web/2024id_/https://www.coles.com.au/browse/fruit-vegetables'],
  ['delivery', 'https://web.archive.org/web/2024id_/https://www.coles.com.au/']
];

const out = [];
for (const [label, url] of targets) {
  const html = await get(url);
  const json = extractNextData(html);
  out.push({
    label,
    bytes: html.length,
    challenged: /_Incapsula_Resource/i.test(html),
    hasNextData: !!json,
    summary: summarise(json)
  });
}

console.log(JSON.stringify(out, null, 2));
