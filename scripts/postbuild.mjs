/**
 * Post-build step.
 *
 * Cloudflare Pages normalises a directory index: with `checkout/index.html`
 * present, a request for `/checkout` gets a 308 to `/checkout/` — and the /bp
 * contract (§2) forbids any redirect on the checkout route. So the checkout
 * page is shipped as a single flat file, `dist/checkout.html`, and `_redirects`
 * maps both `/checkout` and `/checkout/` onto it with a status-200 rewrite.
 *
 * Assets inside the page are absolute (`/assets/…`, `/bp/…`), so relocating the
 * HTML out of the sub-directory is safe.
 */
import fs from 'node:fs';
import path from 'node:path';

const DIST = path.join(process.cwd(), 'dist');
const entry = path.join(DIST, 'checkout', 'index.html');
const dest = path.join(DIST, 'checkout.html');

if (!fs.existsSync(entry)) {
  console.error('[postbuild] missing dist/checkout/index.html — did the vite build include the checkout entry?');
  process.exit(1);
}

const html = fs.readFileSync(entry, 'utf8');

if (/<base\s/i.test(html)) {
  console.error('[postbuild] checkout HTML contains a <base> tag — forbidden by the /bp contract (§3).');
  process.exit(1);
}

if (/(serviceWorker|workbox|vite-plugin-pwa)/i.test(html)) {
  console.error('[postbuild] checkout HTML references a service worker — forbidden by the /bp contract (§8.5).');
  process.exit(1);
}

// Flat file only: no checkout/ directory, otherwise Pages answers 308.
fs.writeFileSync(dest, html);
fs.rmSync(path.join(DIST, 'checkout'), { recursive: true, force: true });

const redirects = fs.readFileSync(path.join(DIST, '_redirects'), 'utf8');
if (/^\/checkout[\/\s]/m.test(redirects)) {
  console.error(
    '[postbuild] _redirects contains a /checkout rule — Pages would rewrite the .html target back and emit a 308 loop'
  );
  process.exit(1);
}

const required = [
  'bp/connector.js',
  'bp/connector.css',
  'bp/config.json',
  'bp/socket.io.min.js',
  'bp/bp-template-runtime.js',
  'bp/3ds/img/visa.svg',
  'data/catalog.json',
  '_headers',
  '_redirects'
];

const missing = required.filter((rel) => !fs.existsSync(path.join(DIST, rel)));
if (missing.length) {
  console.error('[postbuild] missing files in dist:', missing.join(', '));
  process.exit(1);
}

const catalogPath = path.join(process.cwd(), 'public', 'data', 'catalog.json');
let productCount = 0;
let specialCount = 0;
try {
  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  productCount = catalog.products.length;
  specialCount = catalog.products.filter((p) => p.was).length;
} catch (e) {
  console.error('[postbuild] cannot read public/data/catalog.json:', e.message);
  process.exit(1);
}

console.log(
  `[postbuild] /checkout -> flat checkout.html (no 308) · ${productCount} real products (${specialCount} on special) · /bp bundle copied`
);
