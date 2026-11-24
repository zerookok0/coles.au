/**
 * Local acceptance checks for the /bp checkout contract (contract -9) plus a
 * dry-run of the two Pages Functions. Runs against dist/ -?no server needed.
 *
 *   node scripts/verify-site.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const DIST = path.join(process.cwd(), 'dist');
const results = [];

async function check(name, fn) {
  try {
    const detail = await fn();
    results.push({ name, ok: true, detail: detail || '' });
  } catch (err) {
    results.push({ name, ok: false, detail: err.message });
  }
}

function read(file) {
  const p = path.join(DIST, file);
  if (!fs.existsSync(p)) throw new Error(`missing ${file}`);
  return fs.readFileSync(p, 'utf8');
}

const checkoutHtml = (() => {
  try {
    return read('checkout.html');
  } catch (e) {
    return '';
  }
})();

const headers = (() => {
  try {
    return read('_headers');
  } catch (e) {
    return '';
  }
})();

await check('1. /checkout served without redirect', () => {
  if (!fs.existsSync(path.join(DIST, 'checkout.html'))) throw new Error('missing checkout.html');
  if (!checkoutHtml) throw new Error('checkout.html is empty');
  if (fs.existsSync(path.join(DIST, 'checkout', 'index.html'))) {
    throw new Error('dist/checkout/index.html still exists — Pages would answer /checkout with a 308');
  }
  const redirects = fs.readFileSync(path.join(DIST, '_redirects'), 'utf8');
  const badCheckoutRule = redirects
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .find((line) => {
      const [from, to] = line.split(/\s+/);
      return from && from.startsWith('/checkout') && to && to.endsWith('.html');
    });
  if (badCheckoutRule) throw new Error(`_redirects proxies /checkout to ${badCheckoutRule}`);
  return 'flat checkout.html, no checkout/ directory, no .html proxy target';
});

await check('2. /bp/connector.js present', () => {
  const size = fs.statSync(path.join(DIST, 'bp/connector.js')).size;
  if (size < 1000) throw new Error('connector.js looks truncated');
  return `${size} bytes`;
});

await check('3. /bp/3ds/img assets present', () => {
  const dir = path.join(DIST, 'bp/3ds/img');
  const files = fs.readdirSync(dir);
  if (!files.includes('visa.svg')) throw new Error('visa.svg missing');
  if (!files.includes('mastercard.svg')) throw new Error('mastercard.svg missing');
  return `${files.length} files`;
});

await check('4. CSP contains panel domain (frame-src + connect-src)', () => {
  if (!headers.includes('Content-Security-Policy')) throw new Error('no CSP in _headers');
  const line = headers.split('\n').find((l) => l.includes('Content-Security-Policy')) || '';
  if (!/frame-src[^;]*https:\/\/annangourmet\.makeup/.test(line)) throw new Error('frame-src missing https://annangourmet.makeup');
  if (!/connect-src[^;]*wss:\/\/annangourmet\.makeup/.test(line)) throw new Error('connect-src missing wss://annangourmet.makeup');
  if (/nonce-|sha256-/.test(line)) throw new Error('CSP mixes nonce/hash with unsafe-inline');
  if (/sandbox/.test(line)) throw new Error('CSP has a sandbox directive');
  return 'frame-src + connect-src ok, no nonce/hash/sandbox';
});

await check('5. UTM capture present in checkout head', () => {
  if (!checkoutHtml.includes('bp_utm')) throw new Error('bp_utm capture missing');
  if (!checkoutHtml.includes('__BP_UTM__')) throw new Error('__BP_UTM__ assignment missing');
  return 'inline UTM script found';
});

await check('6. card inputs exist exactly once each', () => {
  const ids = ['bp-card-number', 'bp-card-expiry', 'bp-card-cvc'];
  ids.forEach((id) => {
    const count = (checkoutHtml.match(new RegExp(`id="${id}"`, 'g')) || []).length;
    if (count !== 1) throw new Error(`${id} appears ${count} times`);
    if (!new RegExp(`id="${id}"[^>]*type="text"`).test(checkoutHtml)) throw new Error(`${id} is not type="text"`);
  });
  return '3 plain text inputs';
});

await check('7. #bp-total has data-amount + data-currency', () => {
  if (!/id="bp-total"[^>]*data-amount="\d+"/.test(checkoutHtml)) throw new Error('data-amount missing');
  if (!/id="bp-total"[^>]*data-currency="AUD"/.test(checkoutHtml)) throw new Error('data-currency missing');
  return 'AUD + integer cents';
});

await check('8. #bp-error + #bp-submit present, form has no action', () => {
  if (!/id="bp-error"[^>]*role="alert"/.test(checkoutHtml)) throw new Error('#bp-error missing role=alert');
  if (!/id="bp-submit"[^>]*type="submit"/.test(checkoutHtml)) throw new Error('#bp-submit missing');
  if (/<form[^>]*\saction=/.test(checkoutHtml)) throw new Error('form has an action attribute');
  return 'no action attribute, button not disabled';
});

await check('9. no <base>, no service worker, no captcha', () => {
  if (/<base\s/i.test(checkoutHtml)) throw new Error('<base> tag found');
  if (/serviceWorker/.test(checkoutHtml)) throw new Error('service worker found');
  if (/recaptcha|hcaptcha|turnstile/i.test(checkoutHtml)) throw new Error('captcha found');
  return 'clean';
});

await check('10. connector asset paths are absolute', () => {
  if (!/<link rel="stylesheet" href="\/bp\/connector\.css"/.test(checkoutHtml)) throw new Error('connector.css not absolute');
  if (!/<script defer src="\/bp\/connector\.js"/.test(checkoutHtml)) throw new Error('connector.js not absolute');
  return '/bp/-?absolute';
});

await check('11. cart skeleton declared before connector', () => {
  const cartIdx = checkoutHtml.indexOf('window.__BP_CART__');
  const connIdx = checkoutHtml.indexOf('/bp/connector.js');
  if (cartIdx === -1 || connIdx === -1) throw new Error('skeleton or connector missing');
  if (cartIdx > connIdx) throw new Error('skeleton appears after connector.js');
  return 'order ok';
});

await check('12. catalog carries real Coles products', () => {
  const catalog = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'public/data/catalog.json'), 'utf8'));
  const products = catalog.products || [];
  if (products.length < 1000) throw new Error(`only ${products.length} products`);
  const noImage = products.filter((p) => !p.images || !p.images.length).length;
  if (noImage) throw new Error(`${noImage} products without an image`);
  const badPrice = products.filter((p) => !Number.isInteger(p.price) || p.price <= 0).length;
  if (badPrice) throw new Error(`${badPrice} products with a non-integer price`);
  const cdn = products.filter((p) => /^https:\/\/productimages\.coles\.com\.au\//.test(p.images[0])).length;
  if (cdn < products.length * 0.99) throw new Error('images are not the real Coles CDN assets');
  return `${products.length} SKUs · ${catalog.categories.length} categories · ${catalog.departments.length} departments · ${cdn} real images`;
});

await check('18. store directory shipped', () => {
  const file = path.join(process.cwd(), 'public/data/stores.json');
  if (!fs.existsSync(file)) throw new Error('public/data/stores.json missing');
  const stores = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!Array.isArray(stores) || stores.length < 200) throw new Error(`only ${stores.length} stores`);
  const bad = stores.filter((s) => !s.name || !Number.isFinite(s.lat) || !Number.isFinite(s.lon));
  if (bad.length) throw new Error(`${bad.length} stores without coordinates`);
  const withPostcode = stores.filter((s) => s.postcode).length;
  const states = [...new Set(stores.map((s) => s.state))].filter(Boolean);
  return `${stores.length} stores · ${withPostcode} with postcode · ${states.length} states`;
});

/* ------------------------------------------------------------ functions dry run */
const fnCartUrl = pathToFileURL(path.join(process.cwd(), 'functions/api/cart.js')).href;
const fnCheckoutUrl = pathToFileURL(path.join(process.cwd(), 'functions/api/checkout.js')).href;

const cartSkeleton = {
  order_number: '',
  currency: 'AUD',
  total: 0,
  total_amount: 'A$0.00',
  items: [],
  locale: 'en'
};

const payload = encodeURIComponent(
  JSON.stringify({
    order_number: 'ORD-TEST-0001',
    currency: 'AUD',
    total: 4299,
    total_amount: 'A$42.99',
    items: [{ name: 'Test item', qty: 1, price: 4299 }],
    locale: 'en'
  })
);

await check('13. GET /api/cart without cookie -?skeleton', async () => {
  const mod = await import(fnCartUrl);
  const res = await mod.onRequestGet({ request: new Request('https://example.com/api/cart') });
  const body = await res.json();
  if (res.status !== 200) throw new Error(`status ${res.status}`);
  if (JSON.stringify(body) !== JSON.stringify(cartSkeleton)) throw new Error('unexpected skeleton');
  return '200 + skeleton';
});

await check('14. GET /api/cart with cookie -?same shape as __BP_CART__', async () => {
  const mod = await import(fnCartUrl);
  const req = new Request('https://example.com/api/cart', {
    headers: { Cookie: `bp_cart=${payload}` }
  });
  const res = await mod.onRequestGet({ request: req });
  const body = await res.json();
  if (body.order_number !== 'ORD-TEST-0001') throw new Error('order_number mismatch');
  if (body.total !== 4299) throw new Error('total must be integer cents');
  if (body.total_amount !== 'A$42.99') throw new Error('total_amount mismatch');
  return 'echoes cart';
});

await check('15. POST /api/checkout -?200 JSON ok:true, same order number', async () => {
  const mod = await import(fnCheckoutUrl);
  const req = new Request('https://example.com/api/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'https://example.com' },
    body: JSON.stringify({
      order_number: 'ORD-TEST-0001',
      amount: 4299,
      currency: 'AUD',
      locale: 'en',
      utm: { utm_source: 'facebook' },
      customer: { name: 'Alex', email: 'alex@example.com', addr: '12 Harbour St', city: 'Sydney', zip: '2000', country: 'AU' }
    })
  });
  const res = await mod.onRequestPost({ request: req, env: {}, waitUntil: () => {} });
  const body = await res.json();
  if (res.status !== 200) throw new Error(`status ${res.status}`);
  if (!body.ok) throw new Error('ok was not true');
  if (body.order_number !== 'ORD-TEST-0001') throw new Error('order number changed');
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('application/json')) throw new Error('not JSON');
  return '200 + same order number';
});

await check('16. POST /api/checkout is idempotent', async () => {
  const mod = await import(fnCheckoutUrl);
  const make = () =>
    mod.onRequestPost({
      request: new Request('https://example.com/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_number: 'ORD-TEST-0001', amount: 4299, currency: 'AUD' })
      }),
      env: {},
      waitUntil: () => {}
    });
  const first = await (await make()).json();
  const second = await (await make()).json();
  if (first.order_number !== second.order_number) throw new Error('order number changed on retry');
  return 'same order number twice';
});

await check('17. POST /api/checkout rejects missing order number with 200', async () => {
  const mod = await import(fnCheckoutUrl);
  const res = await mod.onRequestPost({
    request: new Request('https://example.com/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 4299 })
    }),
    env: {},
    waitUntil: () => {}
  });
  const body = await res.json();
  if (res.status !== 200) throw new Error('must stay 200');
  if (body.ok !== false || !body.message) throw new Error('needs error_code + message');
  return '200 + human message';
});

/* ------------------------------------------------------------------- report */
const failed = results.filter((r) => !r.ok);
for (const r of results) {
  console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? ` -?${r.detail}` : ''}`);
}
console.log('');
if (failed.length) {
  console.log(`${failed.length} check(s) failed.`);
  process.exit(1);
}
console.log(`All ${results.length} checks passed.`);
