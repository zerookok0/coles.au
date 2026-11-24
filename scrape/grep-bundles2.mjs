/** Fetch the /stores page chunks and report status + API-ish strings. */
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const BASE = 'https://www.coles.com.au';

const html = await (await fetch(`${BASE}/stores`, { headers: { 'User-Agent': UA } })).text();
const scripts = [...new Set([...html.matchAll(/<script[^>]+src="([^"]+\.js)"/g)].map((m) => m[1]))];
console.log('scripts:', scripts.length);

for (const src of scripts) {
  const url = src.startsWith('http') ? src : BASE + src;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    const js = await res.text();
    const api = [...new Set([...js.matchAll(/["'`]([^"'`\s]{0,50}\/api\/[^"'`\s]{0,80})["'`]/g)].map((m) => m[1]))];
    const store = [...new Set([...js.matchAll(/["'`]([^"'`\s]{0,40}(?:storelocator|store-locator|stores?\/|getStores|nearbyStores|searchStores)[^"'`\s]{0,60})["'`]/gi)].map((m) => m[1]))];
    console.log(`${url.split('/').pop()} -> ${res.status} ${js.length}b | api:${api.length} store:${store.length}`);
    if (api.length) console.log('   api:', api.slice(0, 12).join(' , '));
    if (store.length) console.log('   store:', store.slice(0, 12).join(' , '));
  } catch (e) {
    console.log(`${url.split('/').pop()} -> ERR ${e.message}`);
  }
}
