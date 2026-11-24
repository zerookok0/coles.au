/**
 * Harvest real Coles product data from Wayback Machine captures.
 *
 * Coles blocks this network at the WAF, so we replay archived /browse/ pages:
 * each capture embeds __NEXT_DATA__ with searchResults.results[] — real SKUs
 * with id, name, brand, size, pricing and image URIs.
 *
 * Output (resumable):
 *   scrape/raw/products.json   { [id]: product }
 *   scrape/raw/pages.jsonl     one line per processed capture
 *   scrape/raw/urls.json       the CDX URL list actually used
 */
import fs from 'node:fs';
import path from 'node:path';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const RAW = path.join(process.cwd(), 'scrape', 'raw');
const PRODUCTS_FILE = path.join(RAW, 'products.json');
const PAGES_FILE = path.join(RAW, 'pages.jsonl');
const URLS_FILE = path.join(RAW, 'urls.json');

const CONCURRENCY = 3;
const MAX_PAGES = Number(process.env.MAX_PAGES || 400);

fs.mkdirSync(RAW, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchText(url, tries = 5, timeout = 60000) {
  for (let i = 0; i < tries; i++) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), timeout);
      const res = await fetch(url, {
        signal: ctrl.signal,
        headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml' }
      });
      clearTimeout(timer);
      if (res.status === 200) return await res.text();
      if (res.status === 404) return '';
      await sleep(1200 * (i + 1));
    } catch (e) {
      await sleep(1500 * (i + 1));
    }
  }
  return '';
}

/* ------------------------------------------------------------------ CDX list */
async function cdx(query, limit) {
  const url =
    `https://web.archive.org/cdx/search/cdx?${query}` +
    `&output=json&fl=timestamp,original&filter=statuscode:200&filter=mimetype:text/html` +
    `&collapse=urlkey&limit=${limit}`;
  const text = await fetchText(url, 6, 90000);
  if (!text.trim()) return [];
  try {
    const rows = JSON.parse(text);
    return rows.slice(1).map((r) => ({ ts: r[0], url: r[1] }));
  } catch (e) {
    return [];
  }
}

let urls = [];
if (fs.existsSync(URLS_FILE)) {
  urls = JSON.parse(fs.readFileSync(URLS_FILE, 'utf8'));
} else {
  const groups = [
    ['browse', 'url=www.coles.com.au%2Fbrowse%2F&matchType=prefix', 900],
    ['search', 'url=www.coles.com.au%2Fsearch%2Fproducts&matchType=prefix', 300],
    ['on-special', 'url=www.coles.com.au%2Fon-special&matchType=prefix', 120]
  ];
  for (const [label, q, limit] of groups) {
    const got = await cdx(q, limit);
    console.log(`[cdx] ${label}: ${got.length} captures`);
    urls.push(...got.map((g) => ({ ...g, group: label })));
    await sleep(800);
  }
  // de-duplicate by URL, keep the newest timestamp
  const byUrl = new Map();
  for (const u of urls) {
    const key = u.url.split('#')[0];
    const prev = byUrl.get(key);
    if (!prev || Number(u.ts) > Number(prev.ts)) byUrl.set(key, { ...u, url: key });
  }
  urls = [...byUrl.values()].filter((u) => !/\.(jpg|png|pdf|css|js)$/i.test(u.url));
  fs.writeFileSync(URLS_FILE, JSON.stringify(urls, null, 1));
}

console.log(`[cdx] total unique pages: ${urls.length}`);

/* --------------------------------------------------------------- accumulator */
const products = fs.existsSync(PRODUCTS_FILE) ? JSON.parse(fs.readFileSync(PRODUCTS_FILE, 'utf8')) : {};
const done = new Set();
if (fs.existsSync(PAGES_FILE)) {
  for (const line of fs.readFileSync(PAGES_FILE, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try {
      const rec = JSON.parse(line);
      if (rec.url) done.add(rec.url);
    } catch (e) {}
  }
}

const pending = urls.filter((u) => !done.has(u.url)).slice(0, MAX_PAGES);
console.log(`[plan] pending ${pending.length} pages (already done: ${done.size}, products: ${Object.keys(products).length})`);

function extractNextData(html) {
  const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
  if (!m) return null;
  try {
    return JSON.parse(m[1]);
  } catch (e) {
    return null;
  }
}

function normaliseProduct(p, ctx) {
  const pricing = p.pricing || {};
  const heirs = Array.isArray(p.onlineHeirs) && p.onlineHeirs.length ? p.onlineHeirs[0] : null;
  const images = (p.imageUris || p.image || [])
    .filter((i) => i && i.uri)
    .map((i) => ({ uri: i.uri, type: i.type || 'default' }));
  if (!images.length) return null;

  return {
    id: String(p.id),
    name: String(p.name || '').trim(),
    brand: String(p.brand || '').trim(),
    description: String(p.description || '').trim(),
    size: String(p.size || '').trim(),
    availability: p.availability !== false,
    availabilityType: p.availabilityType || '',
    aisle: heirs ? heirs.aisle : (p.locations && p.locations[0] && p.locations[0].aisle) || '',
    category: heirs ? heirs.category : (p.merchandiseHeir && p.merchandiseHeir.category) || '',
    department: heirs ? heirs.subCategory : (p.merchandiseHeir && p.merchandiseHeir.subCategory) || '',
    categoryId: heirs ? heirs.categoryId : '',
    aisleId: heirs ? heirs.aisleId : '',
    departmentId: heirs ? heirs.subCategoryId : '',
    price: Math.round((Number(pricing.now) || 0) * 100),
    was: Math.round((Number(pricing.was) || 0) * 100),
    special: !!pricing.onlineSpecial,
    comparable: pricing.comparable || '',
    unit: pricing.unit || null,
    images,
    restricted: !!(p.restrictions && (p.restrictions.liquorAgeRestrictionFlag || p.restrictions.tobaccoAgeRestrictionFlag)),
    source: ctx
  };
}

let processed = 0;
let newProducts = 0;

async function handle(entry) {
  const capture = `https://web.archive.org/web/${entry.ts}id_/${entry.url}`;
  const html = await fetchText(capture);
  let added = 0;
  let count = 0;

  if (html && html.length > 5000) {
    const json = extractNextData(html);
    const sr = json && json.props && json.props.pageProps && json.props.pageProps.searchResults;
    const results = (sr && sr.results) || [];

    for (const item of results) {
      if (!item || item._type !== 'PRODUCT') continue;
      count += 1;
      const norm = normaliseProduct(item, entry.url);
      if (!norm || !norm.name) continue;
      if (!products[norm.id]) {
        products[norm.id] = norm;
        added += 1;
      }
    }
  }

  newProducts += added;
  processed += 1;
  fs.appendFileSync(
    PAGES_FILE,
    JSON.stringify({ url: entry.url, ts: entry.ts, group: entry.group, count, added }) + '\n'
  );

  if (processed % 10 === 0) {
    fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products));
    console.log(`[run] ${processed}/${pending.length} pages · +${newProducts} new · total ${Object.keys(products).length}`);
  }
}

/* ------------------------------------------------------------------- workers */
let cursor = 0;
async function worker() {
  while (cursor < pending.length) {
    const entry = pending[cursor];
    cursor += 1;
    try {
      await handle(entry);
    } catch (e) {
      console.log(`[warn] ${entry.url}: ${e.message}`);
    }
    await sleep(120);
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, worker));
fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products));

const withSpecial = Object.values(products).filter((p) => p.was > p.price).length;
console.log(
  `[done] ${processed} pages · products ${Object.keys(products).length} · on special ${withSpecial} · departments ${new Set(Object.values(products).map((p) => p.department)).size}`
);
