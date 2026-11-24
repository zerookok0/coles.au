/**
 * Cloudflare Workers entry point.
 *
 * The same repository also works on Cloudflare Pages (functions/ + dist/), but
 * the Workers build flow needs a Worker script and a wrangler config. This file
 * bridges the two:
 *
 *   /api/cart           → functions/api/cart.js
 *   /api/checkout       → functions/api/checkout.js
 *   /api/fb/purchase    → functions/api/fb/purchase.js
 *   everything else     → static assets in ./dist (with SPA fallback)
 */
import * as cart from '../functions/api/cart.js';
import * as checkout from '../functions/api/checkout.js';
import * as fbPurchase from '../functions/api/fb/purchase.js';

const JSON_HEADERS = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';

    const waitUntil = (promise) => {
      try {
        ctx.waitUntil(promise);
      } catch (e) {
        /* local dev without ctx.waitUntil support */
      }
    };

    const pageContext = { request, env, waitUntil, next: () => env.ASSETS.fetch(request) };

    if (path === '/api/cart') {
      if (request.method === 'GET') return cart.onRequestGet(pageContext);
      if (request.method === 'OPTIONS' && typeof cart.onRequestOptions === 'function') {
        return cart.onRequestOptions(pageContext);
      }
      return cart.onRequestPost(pageContext);
    }

    if (path === '/api/checkout') {
      if (request.method === 'POST') return checkout.onRequestPost(pageContext);
      return checkout.onRequestGet(pageContext);
    }

    if (path === '/api/fb/purchase') {
      if (request.method === 'POST') return fbPurchase.onRequestPost(pageContext);
      return json({ ok: false, error_code: 'method_not_allowed' }, 405);
    }

    if (path.startsWith('/api/')) {
      return json({ ok: false, error_code: 'not_found' }, 404);
    }

    /* ---------------------------------------------------------- static assets */
    const assetResponse = await env.ASSETS.fetch(request);

    // SPA fallback: /product/<slug>, /order/<num>, /category/<id> … have no file.
    const wantsDocument =
      request.method === 'GET' &&
      (request.headers.get('Accept') || '').includes('text/html') &&
      !/\.[a-z0-9]+$/i.test(url.pathname);

    if (assetResponse.status === 404 && wantsDocument) {
      const shell = new Request(new URL('/index.html', url).toString(), request);
      const fallback = await env.ASSETS.fetch(shell);
      if (fallback.status === 200) return fallback;
    }

    return assetResponse;
  }
};
