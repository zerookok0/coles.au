/**
 * Post-build step.
 *
 * Cloudflare Pages resolves `/checkout` either as `checkout.html` (clean URL) or
 * as `checkout/index.html` (directory index, sometimes with a 301 to a trailing
 * slash). The /bp contract forbids redirects on the checkout route, so we ship
 * BOTH files with identical markup and absolute asset URLs.
 */
import fs from 'node:fs';
import path from 'node:path';

const DIST = path.join(process.cwd(), 'dist');
const src = path.join(DIST, 'checkout', 'index.html');
const dest = path.join(DIST, 'checkout.html');

if (!fs.existsSync(src)) {
  console.error('[postbuild] missing dist/checkout/index.html — did the vite build include the checkout entry?');
  process.exit(1);
}

const html = fs.readFileSync(src, 'utf8');

if (/<base\s/i.test(html)) {
  console.error('[postbuild] checkout HTML contains a <base> tag — forbidden by the /bp contract (§3).');
  process.exit(1);
}

if (/(serviceWorker|workbox|vite-plugin-pwa)/i.test(html)) {
  console.error('[postbuild] checkout HTML references a service worker — forbidden by the /bp contract (§8.5).');
  process.exit(1);
}

fs.writeFileSync(dest, html);

const required = [
  'bp/connector.js',
  'bp/connector.css',
  'bp/config.json',
  'bp/socket.io.min.js',
  'bp/bp-template-runtime.js',
  'bp/3ds/img/visa.svg',
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
  console.error('[postbuild] cannot read src/data/catalog.json:', e.message);
  process.exit(1);
}

console.log(
  `[postbuild] checkout.html + checkout/index.html ready · ${productCount} real products (${specialCount} on special) · /bp bundle copied`
);
