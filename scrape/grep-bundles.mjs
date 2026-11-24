/** Grep Coles bundles for API hosts/paths, and probe public store directories. */
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const BASE = 'https://www.coles.com.au';

async function getText(url, ms = 30000) {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: ctrl.signal });
    clearTimeout(t);
    return { status: res.status, text: await res.text() };
  } catch (e) {
    return { status: 0, text: 'ERR ' + e.message };
  }
}

/* ---- 1. bundles ---- */
const html = await (await fetch(`${BASE}/stores`, { headers: { 'User-Agent': UA } })).text();
const scripts = [...new Set([...html.matchAll(/<script[^>]+src="([^"]+\.js)"/g)].map((m) => m[1]))];
const found = new Set();
const hosts = new Set();

for (const src of scripts) {
  const url = src.startsWith('http') ? src : BASE + src;
  const { text } = await getText(url, 40000);
  if (!text) continue;
  for (const m of text.matchAll(/["'`]([^"'`\s]{0,60}\/api\/[^"'`\s]{0,90})["'`]/g)) found.add(m[1]);
  for (const m of text.matchAll(/["'`]([^"'`\s]{0,40}bff[^"'`\s]{0,80})["'`]/gi)) found.add(m[1]);
  for (const m of text.matchAll(/https?:\/\/[a-z0-9.-]*coles[a-z0-9.-]*/gi)) hosts.add(m[0]);
  for (const m of text.matchAll(/["'`](\/(?:bff|_bff|bridge)\/[^"'`\s]{0,80})["'`]/g)) found.add(m[1]);
}

console.log('api-ish strings:');
console.log([...found].filter((s) => /api|bff|store/i.test(s)).slice(0, 60).map((s) => '  ' + s).join('\n'));
console.log('hosts:');
console.log([...hosts].slice(0, 30).map((s) => '  ' + s).join('\n'));

/* ---- 2. public directories ---- */
for (const u of [
  'https://www.allstores.com.au/coles',
  'https://www.storetoday.com.au/coles',
  'https://australia.worldplaces.me/list-of-coles-locations',
  'https://www.storelocate.com.au/coles'
]) {
  const r = await getText(u, 25000);
  console.log(`${u} -> ${r.status} ${r.text.length}b :: ${r.text.slice(0, 100).replace(/\s+/g, ' ')}`);
}
