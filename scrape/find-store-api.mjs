/** Find the store-locator API used by the live /stores page. */
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const BASE = 'https://www.coles.com.au';

const html = await (await fetch(`${BASE}/stores`, { headers: { 'User-Agent': UA } })).text();
const scripts = [...new Set([...html.matchAll(/<script[^>]+src="([^"]+\.js)"/g)].map((m) => m[1]))];
console.log('scripts:', scripts.length);

const hits = new Map();
for (const src of scripts) {
  const url = src.startsWith('http') ? src : BASE + src;
  try {
    const js = await (await fetch(url, { headers: { 'User-Agent': UA } })).text();
    for (const m of js.matchAll(/["'`](\/api\/[a-zA-Z0-9/_\-{}$.]+)["'`]/g)) {
      hits.set(m[1], (hits.get(m[1]) || 0) + 1);
    }
    for (const m of js.matchAll(/["'`]([a-zA-Z0-9/_\-\/]*store[a-zA-Z0-9/_\-]*)["'`]/gi)) {
      const v = m[1];
      if (v.length > 4 && v.length < 80) hits.set(v, (hits.get(v) || 0) + 1);
    }
  } catch (e) {
    console.log('skip', url.split('/').pop(), e.message);
  }
}

const interesting = [...hits.entries()]
  .filter(([k]) => /store|location|nearby|map/i.test(k))
  .sort((a, b) => b[1] - a[1])
  .slice(0, 40);
console.log(interesting.map(([k, v]) => `${v}× ${k}`).join('\n'));
