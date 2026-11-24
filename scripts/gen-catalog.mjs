/**
 * Build the storefront catalog from REAL Coles data.
 *
 * Source: scrape/raw/products.json — harvested from archived Coles /browse/
 * captures (__NEXT_DATA__ → searchResults.results). Each record carries the
 * real SKU id, name, brand, pack size, current/was price, comparable unit price
 * and the product image URI on Coles' image CDN.
 *
 * Output:
 *   src/data/catalog.json   departments / categories / heroes / products
 *   public/img/hero/*.svg   marketing slides (generated art, no brand claims)
 *
 * Product images are served straight from the Coles image CDN (verified hotlink
 * friendly: 200 with any referer). Components fall back to /img/placeholder.svg
 * if a single image ever 404s.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const RAW = path.join(ROOT, 'scrape', 'raw', 'products.json');
const OUT_DATA = path.join(ROOT, 'public', 'data');
const OUT_IMG = path.join(ROOT, 'public', 'img');

if (!fs.existsSync(RAW)) {
  console.error('[gen] scrape/raw/products.json missing — run `npm run scrape` first');
  process.exit(1);
}

const raw = JSON.parse(fs.readFileSync(RAW, 'utf8'));
fs.mkdirSync(OUT_DATA, { recursive: true });
fs.mkdirSync(path.join(OUT_IMG, 'hero'), { recursive: true });

const IMAGE_BASE = 'https://productimages.coles.com.au/productimages';

/* ------------------------------------------------------------------ helpers */
const slugify = (s) =>
  String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 70);

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < String(str).length; i++) {
    h ^= String(str).charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed) {
  let a = seed || 1;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SMALL = new Set(['and', 'or', 'the', 'of', 'a', 'to', 'for', 'in', 'on', 'with']);

/** Coles shelf labels arrive in random casing ("Health & beauty", "Dental care"). */
function titleCase(input) {
  const words = String(input || '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ');
  return words
    .map((w, i) => {
      const lower = w.toLowerCase();
      if (lower === '&') return '&';
      if (i > 0 && SMALL.has(lower)) return lower;
      if (/^[A-Z0-9'&]{2,}$/.test(w)) return w;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ');
}

const DEPT_ORDER = [
  'Fruit & Veg',
  'Meat & Seafood',
  'Deli & Chilled',
  'Bakery',
  'Dairy & Eggs',
  'Frozen',
  'Pantry',
  'Drinks',
  'Beer, Wine & Spirits',
  'Household',
  'Baby',
  'Pet',
  'Health & Beauty',
  'Home & Lifestyle'
];

/** Keyword rules over the Coles shelf labels — their own buckets are noisy. */
const DEPT_RULES = [
  [/fruit|vegetab|salad|herb|fresh produce/i, 'Fruit & Veg'],
  [/meat|seafood|poultry|butcher|fish/i, 'Meat & Seafood'],
  [/deli|chilled meat|antipasto/i, 'Deli & Chilled'],
  [/bakery|bread|donut|cake|pastry|dessert/i, 'Bakery'],
  [/dairy|egg|fridge|milk|cheese|yoghurt|yogurt|butter/i, 'Dairy & Eggs'],
  [/frozen|ice cream/i, 'Frozen'],
  [/liquor|wine|beer|spirit|cider/i, 'Beer, Wine & Spirits'],
  [/drink|beverage|juice|water|soft drink|coffee|tea|cordial/i, 'Drinks'],
  [/baby|infant|nappy|toddler|formula|feeding/i, 'Baby'],
  [/pet|dog|cat food|puppy|kitten/i, 'Pet'],
  [/household|clean|laundry|dishwash|air freshener|paper|garbage|storage bag/i, 'Household'],
  [/health|beauty|hair|skin|dental|shav|vitamin|cosmetic|pharmacy|bath|supplement/i, 'Health & Beauty'],
  [/home|garden|kitchen|outdoor|electrical|lunchbox|school|storage|bedding/i, 'Home & Lifestyle'],
  [/snack|chip|chocolate|confection|biscuit|cracker|lolly|nut/i, 'Pantry']
];

const PROMO_BUCKETS = /bonus|down down|big pack|easter|christmas|impulse|reusable|credits|back to school|clearance/i;

function departmentFor(p) {
  for (const [re, dept] of DEPT_RULES) {
    if (re.test(p.category || '') || re.test(p.aisle || '')) return dept;
  }
  for (const [re, dept] of DEPT_RULES) {
    if (re.test(p.department || '')) return dept;
  }
  if (PROMO_BUCKETS.test(p.department || '')) return 'Pantry';
  return 'Pantry';
}

/* --------------------------------------------------------------- normalising */
const drafts = [];

for (const [id, p] of Object.entries(raw)) {
  if (!p || !p.name || !p.images || !p.images.length) continue;
  if (p.restricted) continue; // liquor / tobacco — skipped on purpose
  if (!p.price || p.price <= 0) continue;

  const deptName = departmentFor(p);
  const brand = (p.brand || 'Coles').trim();

  let catName = titleCase(p.category || p.aisle || deptName);
  if (!catName || catName.toLowerCase() === brand.toLowerCase() || catName.length < 3) {
    catName = deptName;
  }

  drafts.push({ id: String(id), p, deptName, catName, brand });
}

/* ------------------------------------------------------------- taxonomy ids */
const deptIdByName = new Map(DEPT_ORDER.map((d) => [d, slugify(d)]));
const catIdByKey = new Map();

for (const d of drafts) {
  const key = d.deptName + '||' + d.catName.toLowerCase();
  if (!catIdByKey.has(key)) {
    catIdByKey.set(key, slugify(d.deptName) + '--' + (slugify(d.catName) || 'range'));
  }
}

/* ------------------------------------------------------------------ products */
const products = [];
const seenSlug = new Set();
const catNames = new Map();

for (const d of drafts) {
  const { id, p, deptName, catName, brand } = d;
  const rand = rng(hash(id));

  const rating = Math.round((3.5 + rand() * 1.4) * 10) / 10;
  const reviewCount = rand() < 0.1 ? Math.floor(rand() * 8) : 6 + Math.floor(rand() * 2400);
  const maxStock = 40 + Math.floor(rand() * 100);
  const outOfStock = p.availability === false || rand() < 0.02;
  const stock = outOfStock ? 0 : rand() < 0.1 ? 1 + Math.floor(rand() * 5) : 10 + Math.floor(rand() * maxStock);

  const was = Number(p.was) > Number(p.price) ? Number(p.was) : 0;
  const badge = was
    ? p.special
      ? 'Special'
      : 'Down Down'
    : rand() < 0.08
      ? 'Bestseller'
      : rand() < 0.04
        ? 'New'
        : '';

  let slug = slugify(p.name) + '-' + id;
  if (seenSlug.has(slug)) slug = slug + '-' + Math.floor(rand() * 9999);
  seenSlug.add(slug);

  const imageUrl = IMAGE_BASE + p.images[0].uri;
  const catId = catIdByKey.get(deptName + '||' + catName.toLowerCase());
  catNames.set(catId, catName);

  products.push({
    id,
    sku: 'COLES-' + id,
    slug,
    name: p.name.trim(),
    brand,
    cat: catId,
    dept: deptIdByName.get(deptName),
    size: (p.size || '').trim(),
    price: Number(p.price),
    was: was || null,
    unit: (p.comparable || '').trim(),
    rating,
    reviewCount,
    stock,
    maxStock,
    badge,
    hue: (hash(deptName) % 300) + 15,
    art: ['Fruit & Veg', 'Meat & Seafood', 'Deli & Chilled', 'Bakery'].includes(deptName) ? 'fresh' : 'pack',
    organic: /organic/i.test(p.name),
    image: imageUrl,
    images: [imageUrl]
  });
}

products.sort((a, b) => a.name.localeCompare(b.name));

/* ------------------------------------------------------- manual overrides */
const OVERRIDES = path.join(ROOT, 'scrape', 'raw', 'overrides.json');
if (fs.existsSync(OVERRIDES)) {
  let list = [];
  try {
    const parsed = JSON.parse(fs.readFileSync(OVERRIDES, 'utf8'));
    list = Array.isArray(parsed) ? parsed : parsed.products || [];
  } catch (e) {
    console.log('[gen] overrides.json is not valid JSON:', e.message);
  }

  const index = new Map(products.map((p) => [p.id, p]));
  let added = 0;
  let patched = 0;

  for (const o of list) {
    if (!o || !o.id) continue;
    const id = String(o.id);
    const deptId = o.dept ? slugify(o.dept) : '';
    const catId = o.cat && deptId ? `${deptId}--${slugify(o.cat)}` : '';
    const image = o.image || '';

    const existing = index.get(id);
    if (existing) {
      if (o.name) {
        existing.name = o.name;
        existing.slug = slugify(o.name) + '-' + id;
      }
      if (o.brand) existing.brand = o.brand;
      if (o.size) existing.size = o.size;
      if (Number.isFinite(o.price)) existing.price = Number(o.price);
      if (o.was != null) existing.was = Number(o.was) || null;
      if (o.unit) existing.unit = o.unit;
      if (o.badge) existing.badge = o.badge;
      if (image) {
        existing.image = image;
        existing.images = Array.isArray(o.images) && o.images.length ? o.images : [image];
      }
      if (deptId) existing.dept = deptId;
      if (catId) {
        existing.cat = catId;
        catNames.set(catId, o.cat);
      }
      patched += 1;
      continue;
    }

    const p = {
      id,
      sku: 'COLES-' + id,
      slug: slugify(o.name || id) + '-' + id,
      name: o.name || id,
      brand: o.brand || 'Coles',
      cat: catId || 'pantry--range',
      dept: deptId || 'pantry',
      size: o.size || '',
      price: Number(o.price) || 0,
      was: Number(o.was) || null,
      unit: o.unit || '',
      rating: Math.round((4.1 + ((hash(id) % 8) / 10)) * 10) / 10,
      reviewCount: 20 + (hash(id) % 900),
      stock: 30 + (hash(id) % 60),
      maxStock: 120,
      badge: o.badge || (Number(o.was) > Number(o.price) ? 'Special' : ''),
      hue: (hash(deptId || 'pantry') % 300) + 15,
      art: ['fruit-veg', 'meat-seafood', 'deli-chilled', 'bakery'].includes(deptId) ? 'fresh' : 'pack',
      organic: /organic/i.test(o.name || ''),
      image,
      images: Array.isArray(o.images) && o.images.length ? o.images : [image]
    };
    if (catId) catNames.set(catId, o.cat);
    products.push(p);
    index.set(id, p);
    added += 1;
  }

  if (added || patched) {
    products.sort((a, b) => a.name.localeCompare(b.name));
    console.log(`[gen] manual overrides: ${patched} patched, ${added} added`);
  }
}

/* ------------------------------------------------------- departments / cats */
const deptAgg = new Map();
const catAgg = new Map();

for (const p of products) {
  if (!deptAgg.has(p.dept)) {
    deptAgg.set(p.dept, {
      id: p.dept,
      name: DEPT_ORDER.find((d) => deptIdByName.get(d) === p.dept) || p.dept,
      categories: new Set(),
      count: 0,
      first: p
    });
  }
  const d = deptAgg.get(p.dept);
  d.count += 1;
  d.categories.add(p.cat);

  if (!catAgg.has(p.cat)) {
    catAgg.set(p.cat, { id: p.cat, name: catNames.get(p.cat) || p.cat, dept: p.dept, hue: p.hue, count: 0, first: p });
  }
  catAgg.get(p.cat).count += 1;
}

const departments = [...deptAgg.values()]
  .map((d) => ({
    id: d.id,
    name: d.name,
    image: d.first.image,
    categories: [...d.categories],
    count: d.count
  }))
  .sort((a, b) => DEPT_ORDER.indexOf(a.name) - DEPT_ORDER.indexOf(b.name));

const categories = [...catAgg.values()]
  .map((c) => ({ id: c.id, name: c.name, dept: c.dept, hue: c.hue, count: c.count, image: c.first.image }))
  .sort((a, b) => b.count - a.count);

/* --------------------------------------------------------------- hero slides */
function heroSvg(n, hue, art) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 620" width="1600" height="620" role="img" aria-label="Promotion">
  <defs>
    <linearGradient id="g${n}" x1="0" y1="0" x2="1" y2="0.6">
      <stop offset="0" stop-color="hsl(${hue} 78% 42%)"/>
      <stop offset="0.55" stop-color="hsl(${(hue + 14) % 360} 72% 34%)"/>
      <stop offset="1" stop-color="hsl(${(hue + 26) % 360} 64% 26%)"/>
    </linearGradient>
    <radialGradient id="r${n}" cx="0.75" cy="0.25" r="0.85">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.35"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1600" height="620" fill="url(#g${n})"/>
  <rect width="1600" height="620" fill="url(#r${n})"/>
  ${art}
</svg>`;
}

const HEROES = [
  {
    hue: 352,
    kicker: 'WEEKLY SPECIALS',
    headline: 'Half price favourites, every week.',
    sub: 'Hundreds of Down Down prices across the store. Save more on the brands you already buy.',
    cta: 'Shop specials',
    art: '<circle cx="1250" cy="330" r="150" fill="#ffffff" opacity="0.16"/><circle cx="1390" cy="250" r="90" fill="#FFD100" opacity="0.5"/><circle cx="1160" cy="470" r="70" fill="#ffffff" opacity="0.2"/>'
  },
  {
    hue: 205,
    kicker: 'FREE DELIVERY',
    headline: 'Free delivery on orders over $50.',
    sub: 'Same-day delivery in metro areas when you order before 2pm. No membership needed.',
    cta: 'Start shopping',
    art: '<rect x="1120" y="240" width="360" height="200" rx="26" fill="#ffffff" opacity="0.16"/><circle cx="1210" cy="400" r="34" fill="#ffffff" opacity="0.55"/><circle cx="1390" cy="400" r="34" fill="#ffffff" opacity="0.55"/>'
  },
  {
    hue: 28,
    kicker: 'CLICK & COLLECT',
    headline: 'Order online, collect in 2 hours.',
    sub: 'Free store pickup at 800+ Coles supermarkets. We will text you when it is ready.',
    cta: 'Find a store',
    art: '<rect x="1150" y="220" width="300" height="230" rx="24" fill="#ffffff" opacity="0.18"/><path d="M1150 300h300" stroke="#ffffff" stroke-width="8" opacity="0.5"/><circle cx="1300" cy="382" r="26" fill="#FFD100" opacity="0.75"/>'
  },
  {
    hue: 140,
    kicker: 'FRESH & LOCAL',
    headline: 'Fresh produce, picked at its best.',
    sub: 'Australian grown fruit and veg, delivered fresh or ready to collect today.',
    cta: 'Shop fresh',
    art: '<circle cx="1290" cy="300" r="120" fill="hsl(96 60% 55%)" opacity="0.55"/><circle cx="1400" cy="390" r="80" fill="hsl(60 70% 60%)" opacity="0.5"/>'
  },
  {
    hue: 268,
    kicker: 'FLYBUYS',
    headline: 'Collect points on every shop.',
    sub: 'Link your Flybuys card and turn everyday groceries into rewards and savings.',
    cta: 'Link my card',
    art: '<rect x="1180" y="230" width="330" height="210" rx="22" fill="#ffffff" opacity="0.18"/><rect x="1180" y="276" width="330" height="26" fill="#FFD100" opacity="0.7"/>'
  },
  {
    hue: 320,
    kicker: 'SAME-DAY DELIVERY',
    headline: 'Dinner sorted in under an hour.',
    sub: 'Ready meals, fresh pasta and bakery treats delivered to your door today.',
    cta: 'Shop ready meals',
    art: '<circle cx="1300" cy="320" r="140" fill="#ffffff" opacity="0.14"/><circle cx="1300" cy="320" r="88" fill="#FFD100" opacity="0.55"/>'
  }
];

HEROES.forEach((h, i) => {
  fs.writeFileSync(path.join(OUT_IMG, 'hero', i + 1 + '.svg'), heroSvg(i + 1, h.hue, h.art));
});

/* --------------------------------------------------------------- home page */
const HOME_SRC = path.join(ROOT, 'scrape', 'raw', 'home.json');
let homeRaw = null;
try {
  homeRaw = JSON.parse(fs.readFileSync(HOME_SRC, 'utf8'));
} catch (e) {
  homeRaw = null;
}

const byId = new Map(products.map((p) => [p.id, p]));
const withImage = products.filter((p) => p.image);

function pickFromCategory(...keywords) {
  for (const kw of keywords) {
    const hit = withImage.find((p) => p.cat.includes(kw) || p.dept.includes(kw));
    if (hit) return hit;
  }
  return withImage[0];
}

/** Deterministic pick so every rail label gets its own photo. */
function photoFromDept(dept, seedText) {
  const pool = withImage.filter((p) => p.dept === dept);
  if (!pool.length) return withImage[0].image;
  return pool[hash(seedText) % pool.length].image;
}

/** Map a Coles rail label ("Meat & Seafood", "Bonus Credit Products") to a photo. */
function railPhoto(title) {
  const t = String(title || '').toLowerCase();
  const map = [
    [/meat|seafood/, 'meat-seafood'],
    [/fresh special|fruit|veg/, 'fruit-veg'],
    [/bakery/, 'bakery'],
    [/dairy|egg/, 'dairy-eggs'],
    [/deli/, 'deli-chilled'],
    [/frozen/, 'frozen'],
    [/pantry/, 'pantry'],
    [/drink/, 'drinks'],
    [/household|clean/, 'household'],
    [/baby/, 'baby'],
    [/pet/, 'pet'],
    [/health|beauty/, 'health-beauty'],
    [/liquor/, 'beer-wine-spirits'],
    [/specials/, 'pantry'],
    [/down down/, 'snacks'],
    [/new year|christmas/, 'drinks'],
    [/bought before/, 'dairy-eggs']
  ];
  for (const [re, dept] of map) {
    if (re.test(t)) return photoFromDept(dept, 'rail:' + t);
  }
  return photoFromDept('pantry', 'rail:' + t);
}

/** Map a content-card title to a product photo (brand token match, else a pool pick). */
function cardPhoto(title) {
  const t = String(title || '').toLowerCase();
  const words = t.split(/[^a-z0-9]+/).filter((w) => w.length > 3);
  const brandHit =
    withImage.find((p) => p.brand && words.includes(p.brand.toLowerCase())) ||
    withImage.find((p) => {
      if (!p.brand) return false;
      const brandWords = p.brand.toLowerCase().split(/\s+/);
      return brandWords.some((bw) => bw.length > 3 && words.includes(bw));
    });
  if (brandHit) return brandHit.image;
  return photoFromDept('pantry', 'card:' + t);
}

/** Pick hero collage shots that match the banner copy. */
function heroShots(title, i) {
  const t = String(title || '').toLowerCase();
  const map = [
    [/sausage|burger|meat|beef|chicken|lamb|bacon/, 'meat-seafood'],
    [/pet|vita/, 'pet'],
    [/knife|kitchen|cook|appliance|credit/, 'home-lifestyle'],
    [/delivery|shop|special/, 'fruit-veg']
  ];
  let dept = null;
  for (const [re, d] of map) {
    if (re.test(t)) {
      dept = d;
      break;
    }
  }
  const pool = dept ? withImage.filter((p) => p.dept === dept) : withImage;
  if (!pool.length) return [];
  const start = (i * 37) % Math.max(1, pool.length - 3);
  return pool.slice(start, start + 3).map((p) => p.image);
}

/* ------------------------------------------------------- category rail art */
const RAIL_BADGES = {
  'bought before': { bg: '#12263F', lines: ['BB'], size: 64 },
  specials: { bg: '#E01A22', lines: ['SPECIALS'], size: 26 },
  "new year's": { bg: '#C8102E', lines: ['NEW', "YEAR'S"], size: 34 },
  'new years': { bg: '#C8102E', lines: ['NEW', "YEAR'S"], size: 34 },
  'down down': { bg: '#FFD100', fg: '#1b1b1b', lines: ['DOWN', 'DOWN'], size: 32 },
  liquorland: { bg: '#141414', lines: ['LIQUOR', 'LAND'], size: 32 },
  liquor: { bg: '#141414', lines: ['LIQUOR', 'LAND'], size: 30 },
  tobacco: { bg: '#3a3a3a', lines: ['TOBACCO'], size: 26 },
  tobaccoandliquor: { bg: '#3a3a3a', lines: ['TOBACCO'], size: 26 },
  'bonus credit products': { bg: '#E8720C', lines: ['BONUS', 'CREDIT'], size: 30 },
  'fresh specials': { bg: '#E01A22', lines: ['FRESH', 'SPECIALS'], size: 26 },
  'my offers': { bg: '#E01A22', lines: ['MY', 'OFFERS'], size: 34 }
};

function railBadgeSvg(spec) {
  const fg = spec.fg || '#ffffff';
  const lines = spec.lines;
  const size = spec.size || 30;
  const lineHeight = size * 1.08;
  const startY = 120 - ((lines.length - 1) * lineHeight) / 2;
  const text = lines
    .map(
      (l, i) =>
        `<text x="120" y="${startY + i * lineHeight}" font-family="'Inter','Segoe UI',Roboto,Arial,sans-serif" font-size="${size}" font-weight="900" fill="${fg}" text-anchor="middle" letter-spacing="0.5">${l}</text>`
    )
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="240" height="240" role="img" aria-label="${lines.join(' ')}">
  <circle cx="120" cy="120" r="120" fill="${spec.bg}"/>
  <circle cx="120" cy="120" r="104" fill="none" stroke="${fg}" stroke-opacity="0.25" stroke-width="2"/>
  ${text}
</svg>`;
}

function railImage(item) {
  const key = String(item.title || '').toLowerCase().trim();
  const spec = RAIL_BADGES[key];
  if (spec) {
    const file = slugify(item.title) + '.svg';
    fs.mkdirSync(path.join(OUT_IMG, 'rail'), { recursive: true });
    fs.writeFileSync(path.join(OUT_IMG, 'rail', file), railBadgeSvg(spec));
    return { image: `/img/rail/${file}`, kind: 'badge', tint: '' };
  }
  const hue = (hash(key) % 320) + 20;
  return {
    image: item.image || railPhoto(item.title),
    kind: 'photo',
    tint: `hsl(${hue} 55% 94%)`
  };
}

/** Relative luminance of a #rrggbb colour, to pick black or white copy. */
function isLight(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
  if (!m) return false;
  const n = parseInt(m[1], 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const lin = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b) > 0.55;
}

const home = homeRaw
  ? {
      source: homeRaw.source,
      nav: homeRaw.nav,
      catRail: (homeRaw.catRail || []).map((c) => {
        const art = railImage(c);
        return { title: c.title, href: '/shop', image: art.image, kind: art.kind, tint: art.tint };
      }),
      heroes: (homeRaw.heroes || []).map((h, i) => {
        const light = isLight(h.bg);
        return {
          title: h.title,
          description: h.description,
          bg: h.bg || '#E01A22',
          light,
          ctaLabel: h.ctaLabel || 'Shop now',
          ctaHref: '/shop?filter=special',
          bgImage: h.bgImage || '',
          centerImage: h.centerImage || '',
          products: heroShots(h.title, i)
        };
      }),
      quadTiles: (homeRaw.quadTiles || []).map((q) => ({
        heading: q.heading,
        description: q.description,
        ctaLabel: q.ctaLabel || 'Shop now',
        href: '/shop?filter=special',
        bg: q.bg || '',
        roundel: q.roundel || '',
        photo: cardPhoto(q.heading)
      })),
      rows: (homeRaw.rows || []).map((r) => ({
        heading: r.heading,
        subheading: r.subheading,
        ctaLabel: r.ctaLabel || 'View all',
        ctaHref: '/shop?filter=special',
        productIds: (r.productIds || []).map(String).filter((id) => byId.has(id))
      })),
      cards: (homeRaw.cards || []).map((c) => ({
        title: c.title,
        href: '/shop?filter=special',
        image: c.image || cardPhoto(c.title),
        savePercentage: c.savePercentage || ''
      })),
      promo: homeRaw.promo
        ? { heading: homeRaw.promo.heading, description: homeRaw.promo.description, ctaLabel: homeRaw.promo.ctaLabel, href: '/delivery', bg: homeRaw.promo.image ? '' : homeRaw.promo.bg, image: homeRaw.promo.image || '' }
        : null,
      appBanner: homeRaw.appBanner
        ? { heading: homeRaw.appBanner.heading, description: homeRaw.appBanner.description, image: homeRaw.appBanner.image || '', href: '/contact' }
        : null,
      recipes: homeRaw.recipes
        ? {
            heading: homeRaw.recipes.heading,
            cards: (homeRaw.recipes.cards || []).slice(0, 6).map((c, i) => ({
              title: c.title,
              meta: c.meta,
              image: withImage[(i * 97) % withImage.length].image
            }))
          }
        : null
    }
  : null;

const catalog = {
  generatedAt: new Date().toISOString().slice(0, 10),
  currency: 'AUD',
  source: 'coles.com.au (archived captures)',
  home,
  departments,
  categories,
  heroes: HEROES.map((h, i) => ({
    id: i + 1,
    image: '/img/hero/' + (i + 1) + '.svg',
    kicker: h.kicker,
    headline: h.headline,
    sub: h.sub,
    cta: h.cta
  })),
  products
};

fs.writeFileSync(path.join(OUT_DATA, 'catalog.json'), JSON.stringify(catalog));

/* ----------------------------------------------------------- store directory */
const STORES_SRC = path.join(ROOT, 'scrape', 'raw', 'stores.json');
let storeCount = 0;
try {
  const stores = JSON.parse(fs.readFileSync(STORES_SRC, 'utf8'));
  const seen = new Set();
  const cleaned = [];
  for (const s of stores) {
    if (!s || !s.name || !Number.isFinite(s.lat) || !Number.isFinite(s.lon)) continue;
    // node/way duplicates for the same physical store
    const key = `${s.name.toLowerCase()}|${s.postcode}|${s.lat.toFixed(2)}|${s.lon.toFixed(2)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    cleaned.push({
      id: s.id || `s${cleaned.length + 1}`,
      name: s.name,
      street: s.street || '',
      suburb: s.suburb || '',
      postcode: s.postcode || '',
      state: s.state || '',
      lat: s.lat,
      lon: s.lon
    });
  }
  fs.writeFileSync(path.join(OUT_DATA, 'stores.json'), JSON.stringify(cleaned));
  storeCount = cleaned.length;
} catch (e) {
  console.log('[gen] no store directory yet (scrape/raw/stores.json missing)');
}

console.log(
  '[gen] REAL data: ' +
    products.length +
    ' products · ' +
    categories.length +
    ' categories · ' +
    departments.length +
    ' departments · ' +
    products.filter((p) => p.was).length +
    ' on special'
);
console.log('[gen] departments: ' + departments.map((d) => d.name + '(' + d.count + ')').join(' · '));
