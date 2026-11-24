/**
 * GET /api/cart — contract §5.2 (double insurance).
 *
 * The storefront already exposes `window.__BP_CART__`; the connector only falls
 * back to this endpoint when the global is missing. We keep the same shape and
 * read the small `bp_cart` cookie the checkout page writes.
 */
const SKELETON = {
  order_number: '',
  currency: 'AUD',
  total: 0,
  total_amount: 'A$0.00',
  items: [],
  locale: 'en'
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store, must-revalidate'
    }
  });
}

function cookieValue(header, name) {
  const raw = header || '';
  const parts = raw.split(';');
  for (const part of parts) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() === name) return part.slice(idx + 1).trim();
  }
  return '';
}

export async function onRequestGet({ request }) {
  const cookie = cookieValue(request.headers.get('Cookie'), 'bp_cart');
  let payload = null;

  if (cookie) {
    try {
      payload = JSON.parse(decodeURIComponent(cookie));
    } catch (e) {
      payload = null;
    }
  }

  if (!payload || typeof payload !== 'object') return json(SKELETON);

  return json({
    order_number: String(payload.order_number || ''),
    currency: String(payload.currency || 'AUD'),
    total: Number.isFinite(Number(payload.total)) ? Number(payload.total) : 0,
    total_amount: String(payload.total_amount || 'A$0.00'),
    items: Array.isArray(payload.items)
      ? payload.items.map((i) => ({ name: String(i.name || ''), qty: Number(i.qty) || 0, price: Number(i.price) || 0 }))
      : [],
    locale: String(payload.locale || 'en')
  });
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: { Allow: 'GET, OPTIONS', 'Cache-Control': 'no-store' }
  });
}

export async function onRequestPost() {
  return json({ ok: false, error_code: 'method_not_allowed', message: 'Use GET /api/cart' });
}
