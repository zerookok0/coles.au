/**
 * Extract the real Coles homepage model from the archived capture and mirror
 * its creative assets (AEM /content/dam/... images) out of the Wayback Machine.
 *
 * Output:
 *   scrape/raw/home.json        structured model, image paths already localised
 *   public/img/home/<file>      mirrored roundels / banners / tile art
 */
import fs from 'node:fs';
import path from 'node:path';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const RAW = path.join(process.cwd(), 'scrape', 'raw');
const IMG_DIR = path.join(process.cwd(), 'public', 'img', 'home');
const HOME_URL = 'https://web.archive.org/web/2024id_/https://www.coles.com.au/';

fs.mkdirSync(RAW, { recursive: true });
fs.mkdirSync(IMG_DIR, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchText(url, tries = 4) {
  for (let i = 0; i < tries; i++) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 60000);
      const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: ctrl.signal });
      clearTimeout(t);
      if (res.status === 200) return await res.text();
      await sleep(1200 * (i + 1));
    } catch (e) {
      await sleep(1500 * (i + 1));
    }
  }
  return '';
}

/* --------------------------------------------------------------- page model */
const html = await fetchText(HOME_URL);
if (!html) {
  console.error('[home] could not load the archived homepage');
  process.exit(1);
}
const json = JSON.parse(html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i)[1]);

const nodes = [];
(function walk(node) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) return node.forEach(walk);
  if (node[':type']) nodes.push(node);
  for (const k of Object.keys(node)) if (k === ':items' || !k.startsWith(':')) walk(node[k]);
})(json.props.pageProps.data);

const ofType = (suffix) => nodes.filter((n) => n[':type'].endsWith(suffix));

const catExplorer = ofType('categoryexplorer')[0] || null;
const heroBanners = ofType('herobanner');
const heroTiles = ofType('herotile');
const featureRows = ofType('featurerow');
const contentCards = ofType('contentcardtile');
const promos = ofType('promobanner');
const ctaBanners = ofType('ctabanner');
const recipeBlock = ofType('dynamiccontentcard')[0] || null;

/* -------------------------------------------------------------- image mirror */
const mirrored = new Map();

function localName(damPath) {
  const clean = damPath.split('?')[0];
  const base = path.basename(decodeURIComponent(clean)).replace(/[^a-zA-Z0-9._-]+/g, '-');
  const h = [...clean].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7).toString(36);
  return `${h}-${base}`.slice(-90);
}

async function mirror(damPath) {
  if (!damPath || !damPath.startsWith('/content/dam/')) return damPath || '';
  if (mirrored.has(damPath)) return mirrored.get(damPath);

  const file = localName(damPath);
  const dest = path.join(IMG_DIR, file);
  const publicPath = `/img/home/${file}`;
  mirrored.set(damPath, publicPath);

  if (fs.existsSync(dest) && fs.statSync(dest).size > 500) return publicPath;

  const encoded = damPath.split('/').map(encodeURIComponent).join('/');
  const candidates = [
    `https://web.archive.org/web/2024im_/https://www.coles.com.au${encoded}`,
    `https://web.archive.org/web/2024id_/https://www.coles.com.au${encoded}`,
    `https://web.archive.org/web/2im_/https://www.coles.com.au${encoded}`
  ];

  // Ask CDX for whatever timestamp actually captured this asset.
  try {
    const cdxUrl = `https://web.archive.org/cdx/search/cdx?url=www.coles.com.au${encoded}&output=json&fl=timestamp,statuscode,mimetype&filter=statuscode:200&limit=6`;
    const cdxRes = await fetch(cdxUrl, { headers: { 'User-Agent': UA } });
    if (cdxRes.ok) {
      const rows = JSON.parse((await cdxRes.text()) || '[]').slice(1);
      for (const row of rows) {
        const ts = row[0];
        candidates.push(`https://web.archive.org/web/${ts}im_/https://www.coles.com.au${encoded}`);
      }
    }
  } catch (e) {}

  for (const url of candidates) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 45000);
      const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: ctrl.signal });
      clearTimeout(t);
      if (res.status === 200) {
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length > 500 && !/^\s*<(!doctype|html)/i.test(buf.subarray(0, 200).toString())) {
          fs.writeFileSync(dest, buf);
          console.log(`[img] ${file} ${(buf.length / 1024).toFixed(0)} KB`);
          return publicPath;
        }
      }
      await sleep(400);
    } catch (e) {
      await sleep(600);
    }
  }
  console.log(`[img] MISS ${damPath}`);
  return ''; // caller falls back
}

/* ------------------------------------------------------------------- collect */
const stripTags = (s) => String(s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

const catRail = [];
for (const item of (catExplorer && catExplorer.categoryItems) || []) {
  catRail.push({
    title: item.title,
    href: item.linkUrl,
    image: await mirror(item.imagePath)
  });
}

const heroes = [];
for (const h of heroBanners) {
  heroes.push({
    title: stripTags(h.bannerTitle),
    description: stripTags(h.description),
    bg: h.backgroundColor || '#E01A22',
    theme: h.bannerTheme || 'light',
    ctaLabel: h.primaryCTALabel || '',
    ctaHref: h.primaryCTAHref || '',
    bgImage: await mirror(h.backgroundImgDesktopSrc),
    centerImage: await mirror(h.centerImage),
    roundelPlacement: h.roundelPlacement || 'right',
    terms: stripTags(h.termsAndConditionsCopy)
  });
}

const quadTiles = [];
for (const t of heroTiles) {
  quadTiles.push({
    heading: t.heading,
    description: stripTags(t.description),
    ctaLabel: t.primaryCtaLabel,
    ctaHref: t.primaryCtaHref,
    bg: await mirror(t.imageUrl),
    roundel: await mirror(t.floatingImageUrl)
  });
}

const rows = featureRows.map((r) => ({
  heading: r.heading,
  subheading: stripTags((r[':items'] && Object.values(r[':items'])[0] && Object.values(r[':items'])[0].description) || ''),
  ctaLabel: r.ctaLabel,
  ctaHref: r.ctaUrl,
  productIds: ((r.campaigns && r.campaigns[0] && r.campaigns[0].products) || []).map(String)
}));

const cards = [];
for (const c of contentCards) {
  cards.push({
    title: c.tileTitle,
    href: c.url,
    image: await mirror(c.image),
    roundel: c.roundel || '',
    savePercentage: c.savePercentage || ''
  });
}

const promo = promos[0]
  ? {
      heading: promos[0].heading,
      description: stripTags(promos[0].description),
      ctaLabel: promos[0].ctaLabel,
      href: promos[0].linkUrl,
      bg: promos[0].backgroundColour || '#E00A12',
      image: await mirror(promos[0].backgroundImagePath)
    }
  : null;

const appBanner = ctaBanners[0]
  ? {
      heading: ctaBanners[0].bannerTitle,
      description: stripTags(ctaBanners[0].description),
      bg: ctaBanners[0].backgroundColor || '#E01A22',
      image: await mirror(ctaBanners[0].backgroundImageDesktop),
      ctaLabel: 'Download',
      href: ctaBanners[0].linkUrl
    }
  : null;

const recipes = recipeBlock
  ? {
      heading: 'Recipes & inspiration',
      href: recipeBlock.linkUrl,
      cards: (recipeBlock.cards || []).slice(0, 8).map((c) => ({
        title: c.tileTitle,
        href: c.url,
        imagePath: c.image,
        meta: [c.tileServing ? `Serves ${c.tileServing}` : '', c.tilePrepTime || '', c.tileDietaryTag || '']
          .filter(Boolean)
          .join(' · ')
      }))
    }
  : null;

const home = {
  source: 'https://www.coles.com.au/ (archived 2024 capture)',
  nav: [
    { label: 'Shop products', href: '/shop' },
    { label: 'Specials & catalogues', href: '/shop?filter=special' },
    { label: 'Bought before', href: '/shop' },
    { label: 'Recipes & inspiration', href: '/recipes' },
    { label: 'Ways to shop', href: '/delivery' },
    { label: 'Help', href: '/contact' }
  ],
  lines: ['Shop products', 'Specials & catalogues', 'Bought before', 'Recipes & inspiration', 'Ways to shop', 'Help'],
  catRail,
  heroes,
  quadTiles,
  rows,
  cards,
  promo,
  appBanner,
  recipes
};

fs.writeFileSync(path.join(RAW, 'home.json'), JSON.stringify(home, null, 1));

console.log(
  `[home] rail ${catRail.length} · heroes ${heroes.length} · quad ${quadTiles.length} · rows ${rows.length} · cards ${cards.length} · mirrored ${mirrored.size}`
);
