/** Probe: which store-data sources are actually reachable from here? */
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36';

async function probe(label, url, opts = {}) {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 25000);
    const res = await fetch(url, { ...opts, headers: { 'User-Agent': UA, ...(opts.headers || {}) }, signal: ctrl.signal });
    clearTimeout(t);
    const text = await res.text();
    console.log(`${label} -> ${res.status} ${text.length}b :: ${text.slice(0, 120).replace(/\s+/g, ' ')}`);
    return { ok: res.ok, text };
  } catch (e) {
    console.log(`${label} -> ERR ${e.message}${e.cause ? ' / ' + e.cause.message : ''}`);
    return { ok: false, text: '' };
  }
}

const q = '[out:json][timeout:25];node["brand"="Coles"]["shop"="supermarket"](-37.85,144.9,-37.75,145.0);out center tags 2;';

await probe('overpass.de', 'https://overpass-api.de/api/status');
await probe('overpass.kumi', 'https://overpass.kumi.systems/api/status');
await probe('overpass.ch', 'https://overpass.osm.ch/api/status');
await probe('overpass.fr', 'https://overpass.openstreetmap.fr/api/status');
await probe('overpass.ru', 'https://overpass.openstreetmap.ru/api/interpreter', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: 'data=' + encodeURIComponent(q)
});
await probe('nominatim', 'https://nominatim.openstreetmap.org/search?q=Coles+supermarket&countrycodes=au&format=json&limit=3');
await probe('cdx-store-locator', 'https://web.archive.org/cdx/search/cdx?url=www.coles.com.au%2Fstore-locator&output=json&limit=5&fl=timestamp,original,statuscode');
await probe('cdx-store-prefix', 'https://web.archive.org/cdx/search/cdx?url=www.coles.com.au%2Fstores&matchType=prefix&output=json&limit=8&fl=timestamp,original,statuscode');
await probe('cdx-api-store', 'https://web.archive.org/cdx/search/cdx?url=www.coles.com.au%2Fapi%2F1%2Fstores&matchType=prefix&output=json&limit=8&fl=timestamp,original,statuscode');
