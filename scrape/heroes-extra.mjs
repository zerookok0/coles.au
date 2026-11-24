/**
 * Collect hero banners from several archived homepage captures and mirror the
 * banner artwork that Wayback actually stored (the current capture only had two).
 */
import fs from 'node:fs';
import path from 'node:path';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const RAW = path.join(process.cwd(), 'scrape', 'raw');
const IMG_DIR = path.join(process.cwd(), 'public', 'img', 'home');
fs.mkdirSync(IMG_DIR, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getText(url, tries = 3, ms = 60000) {
  for (let i = 0; i < tries; i++) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), ms);
      const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: ctrl.signal });
      clearTimeout(t);
      if (res.status === 200) return await res.text();
      await sleep(1200 * (i + 1));
    } catch (e) {
      await sleep(1200 * (i + 1));
    }
  }
  return '';
}

async function mirror(damPath) {
  if (!damPath || !damPath.startsWith('/content/dam/')) return '';
  const clean = damPath.split('?')[0];
  const base = path.basename(decodeURIComponent(clean)).replace(/[^a-zA-Z0-9._-]+/g, '-');
  const h = [...clean].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7).toString(36);
  const file = `${h}-${base}`.slice(-90);
  const dest = path.join(IMG_DIR, file);
  if (fs.existsSync(dest) && fs.statSync(dest).size > 500) return `/img/home/${file}`;

  const encoded = damPath.split('/').map(encodeURIComponent).join('/');
  const cands = [`https://web.archive.org/web/2im_/https://www.coles.com.au${encoded}`];
  try {
    const cdx = await getText(
      `https://web.archive.org/cdx/search/cdx?url=www.coles.com.au${encoded}&output=json&fl=timestamp,statuscode&filter=statuscode:200&limit=5`,
      2,
      30000
    );
    for (const row of JSON.parse(cdx || '[]').slice(1)) {
      cands.push(`https://web.archive.org/web/${row[0]}im_/https://www.coles.com.au${encoded}`);
    }
  } catch (e) {}

  for (const url of cands) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 45000);
      const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: ctrl.signal });
      clearTimeout(t);
      if (res.status === 200) {
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length > 2000 && !/^\s*<(!doctype|html)/i.test(buf.subarray(0, 120).toString())) {
          fs.writeFileSync(dest, buf);
          return `/img/home/${file}`;
        }
      }
    } catch (e) {}
    await sleep(300);
  }
  return '';
}

/* timestamps of homepage captures */
const cdx = await getText(
  'https://web.archive.org/cdx/search/cdx?url=www.coles.com.au&output=json&fl=timestamp&filter=statuscode:200&filter=mimetype:text/html&collapse=timestamp:6&limit=60'
);
const stamps = JSON.parse(cdx || '[]').slice(1).map((r) => r[0]);
console.log('captures:', stamps.length);

const heroes = [];
const seenTitles = new Set();

for (const ts of stamps.slice(-14)) {
  const html = await getText(`https://web.archive.org/web/${ts}id_/https://www.coles.com.au/`);
  if (!html) continue;
  let json;
  try {
    json = JSON.parse(html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i)[1]);
  } catch (e) {
    continue;
  }
  const nodes = [];
  (function walk(n) {
    if (!n || typeof n !== 'object') return;
    if (Array.isArray(n)) return n.forEach(walk);
    if (n[':type'] && n[':type'].endsWith('herobanner')) nodes.push(n);
    for (const k of Object.keys(n)) if (k === ':items' || !k.startsWith(':')) walk(n[k]);
  })(json.props.pageProps.data);

  for (const h of nodes) {
    const title = String(h.bannerTitle || '').trim();
    if (!title || seenTitles.has(title)) continue;
    const bg = await mirror(h.backgroundImgDesktopSrc);
    if (!bg) continue;
    seenTitles.add(title);
    heroes.push({
      title,
      description: String(h.description || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
      bg: h.backgroundColor || '#E01A22',
      ctaLabel: h.primaryCTALabel || 'Shop now',
      ctaHref: h.primaryCTAHref || 'https://www.coles.com.au/on-special',
      bgImage: bg,
      ts
    });
    console.log(`[hero] ${title.slice(0, 60)} -> ${bg}`);
  }
  if (heroes.length >= 6) break;
  await sleep(800);
}

fs.writeFileSync(path.join(RAW, 'heroes-extra.json'), JSON.stringify(heroes, null, 1));
console.log(`[heroes] ${heroes.length} banners with real artwork`);
