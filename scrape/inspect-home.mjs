/** Dump the archived Coles homepage structure (nav, icon rail, hero, tiles). */
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const url = 'https://web.archive.org/web/2024id_/https://www.coles.com.au/';
const res = await fetch(url, { headers: { 'User-Agent': UA } });
const html = await res.text();
console.log('bytes', html.length);

const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
const json = JSON.parse(m[1]);
const pp = json.props.pageProps;
console.log('page:', json.page, 'buildId:', json.buildId);
console.log('pageProps keys:', Object.keys(pp));

const data = pp.data || {};
console.log('data keys:', Object.keys(data));
console.log('resolvedUrl:', pp.resolvedUrl, 'storeId:', pp.initStoreId);

/* try to shrink-walk the AEM payload */
function walk(node, depth, path) {
  if (depth > 3 || !node || typeof node !== 'object') return;
  const keys = Array.isArray(node) ? `[${node.length}]` : Object.keys(node).slice(0, 12).join(',');
  console.log('  '.repeat(depth) + path + ' ' + keys);
  if (Array.isArray(node)) node.slice(0, 3).forEach((v, i) => walk(v, depth + 1, `[${i}]`));
  else for (const k of Object.keys(node).slice(0, 12)) walk(node[k], depth + 1, k);
}
walk(data, 0, 'data');

/* header nav: anchor texts from the top region of the document */
const headerSlice = html.slice(0, html.indexOf('__NEXT_DATA__'));
const anchors = [...headerSlice.matchAll(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]{0,120}?)<\/a>/gi)]
  .map((a) => ({
    href: a[1],
    text: a[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  }))
  .filter((a) => a.text && a.text.length < 50);
console.log('\nheader anchors:', anchors.length);
console.log(anchors.slice(0, 40));

/* images referenced in the header region */
const imgs = [...headerSlice.matchAll(/<img[^>]+src="([^"]+)"/gi)].map((x) => x[1]).slice(0, 25);
console.log('\nheader imgs:', imgs);
