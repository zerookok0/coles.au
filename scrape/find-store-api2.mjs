/** Hunt for the store list: Next data route + candidate endpoints. */
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const BASE = 'https://www.coles.com.au';
const BUILD = '20261111.8-840ebb1e3234c72b3bfd337d7f6bb776e5cb3564';

async function get(path) {
  try {
    const res = await fetch(BASE + path, {
      headers: { 'User-Agent': UA, Accept: 'application/json,text/html;q=0.9,*/*;q=0.8' }
    });
    const text = await res.text();
    return { status: res.status, ct: res.headers.get('content-type') || '', text };
  } catch (e) {
    return { status: 0, ct: '', text: 'ERR ' + e.message };
  }
}

/* 1. Next data route for the find-stores page */
const nd = await get(`/_next/data/${BUILD}/find-stores.json`);
console.log('next-data:', nd.status, nd.ct, nd.text.length + 'b');
if (nd.status === 200 && nd.text.trim().startsWith('{')) {
  try {
    const j = JSON.parse(nd.text);
    const pp = (j.pageProps) || {};
    console.log('  pageProps keys:', Object.keys(pp));
    const state = pp.initialState || {};
    console.log('  initialState keys:', Object.keys(state));
    for (const k of Object.keys(state)) {
      const s = JSON.stringify(state[k]);
      if (/suburb|postcode|latitude/.test(s)) console.log(`  * ${k}: ${s.slice(0, 300)}`);
    }
  } catch (e) {
    console.log('  parse err', e.message);
  }
}

/* 2. candidate REST endpoints */
const cands = [
  '/api/1/storelocations?latitude=-33.8688&longitude=151.2093&limit=200',
  '/api/1/store-locations?latitude=-33.8688&longitude=151.2093',
  '/api/1/stores?latitude=-33.8688&longitude=151.2093',
  '/api/1/store/search?q=2000',
  '/api/1/storelocator?postcode=2000',
  '/api/1/store-finder?postcode=2000',
  '/api/1/checkout/stores?postcode=2000',
  '/api/store-locator/stores?postcode=2000',
  '/api/1/store?postcode=2000',
  '/api/1/stores/search?postcode=2000'
];

for (const c of cands) {
  const r = await get(c);
  const isJson = r.ct.includes('json');
  console.log(`${c} -> ${r.status} ${r.ct} ${r.text.length}b ${isJson ? ':: ' + r.text.slice(0, 160).replace(/\s+/g, ' ') : ''}`);
}
