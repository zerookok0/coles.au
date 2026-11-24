/** Inspect the live /stores page model (WAF is letting this path through now). */
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const res = await fetch('https://www.coles.com.au/stores', { headers: { 'User-Agent': UA, Accept: 'text/html' } });
const html = await res.text();
console.log('status', res.status, 'bytes', html.length, 'nextdata', /__NEXT_DATA__/.test(html));

const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
if (m) {
  const json = JSON.parse(m[1]);
  console.log('page', json.page, 'buildId', json.buildId);
  const pp = json.props.pageProps || {};
  console.log('pageProps keys:', Object.keys(pp));
  for (const k of Object.keys(pp)) {
    const v = JSON.stringify(pp[k]);
    console.log(`  ${k}: ${String(v).slice(0, 220)}`);
  }
}

console.log('latitude mentions:', (html.match(/latitude/g) || []).length);
console.log('storeId mentions:', (html.match(/storeId/g) || []).length);
const apiHits = [...new Set([...html.matchAll(/\/api\/[a-zA-Z0-9/_-]+/g)].map((x) => x[0]))].slice(0, 25);
console.log('api paths in html:', apiHits);
