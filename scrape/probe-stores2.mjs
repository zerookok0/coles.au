/** Second pass: find any reachable source listing all Coles stores. */
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36';

async function probe(label, url, opts = {}) {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 30000);
    const res = await fetch(url, { ...opts, headers: { 'User-Agent': UA, ...(opts.headers || {}) }, signal: ctrl.signal });
    clearTimeout(t);
    const text = await res.text();
    console.log(`${label} -> ${res.status} ${text.length}b :: ${text.slice(0, 150).replace(/\s+/g, ' ')}`);
    return text;
  } catch (e) {
    console.log(`${label} -> ERR ${e.message}`);
    return '';
  }
}

const cdx = (path, extra = '') =>
  `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(path)}&output=json&fl=timestamp,original,statuscode&limit=10${extra}`;

await probe('cdx /store*', cdx('www.coles.com.au/store*'));
await probe('cdx /stores', cdx('www.coles.com.au/stores'));
await probe('cdx /find-a-store', cdx('www.coles.com.au/find-a-store'));
await probe('cdx /store-locator/', cdx('www.coles.com.au/store-locator/', '&matchType=prefix'));
await probe('cdx api store', cdx('www.coles.com.au/api/1/store*'));
await probe('sitemap', 'https://www.coles.com.au/sitemap.xml');
await probe('whereis', 'https://www.whereis.com/search?what=coles&where=sydney');
await probe('yellowpages', 'https://www.yellowpages.com.au/search/listings?clue=coles+supermarket&locationClue=sydney');
await probe('openinghours', 'https://www.openinghours.com.au/coles/');
