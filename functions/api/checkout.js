/**
 * POST /api/checkout — contract §6.1.
 *
 * Rules baked in:
 *   • always HTTP 200 + JSON (never 302/303, never HTML)
 *   • the response `order_number` is exactly the one we were given
 *   • idempotent: the same order number always answers ok:true
 *   • no captcha, no one-time nonce, no card data (cards never reach the server)
 *
 * The panel decides *when* this is called (usually after the verification
 * screen), so there is no server-side timeout on the client side.
 */

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store, must-revalidate'
    }
  });
}

function str(value, max = 200) {
  return String(value == null ? '' : value).slice(0, max);
}

async function sha256Hex(value) {
  try {
    const data = new TextEncoder().encode(String(value || '').trim().toLowerCase());
    const digest = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  } catch (e) {
    return '';
  }
}

/** Fire-and-forget mirror to the Conversions API (only when configured). */
async function mirrorToCapi(env, body, orderNumber, amount, currency, request) {
  if (!env || !env.FB_PIXEL_ID || !env.FB_CAPI_TOKEN) return;
  const customer = body.customer || {};
  const userData = {};
  const emailHash = customer.email ? await sha256Hex(customer.email) : '';
  if (emailHash) userData.em = [emailHash];
  if (request.headers.get('CF-Connecting-IP')) userData.client_ip_address = request.headers.get('CF-Connecting-IP');
  if (request.headers.get('User-Agent')) userData.client_user_agent = request.headers.get('User-Agent');

  const contents = (Array.isArray(body.items) ? body.items : []).map((i) => ({
    id: str(i.id || i.name, 120),
    quantity: Number(i.qty) || 1,
    item_price: (Number(i.price) || 0) / 100
  }));

  const payload = {
    data: [
      {
        event_name: 'Purchase',
        event_time: Math.floor(Date.now() / 1000),
        event_id: orderNumber,
        event_source_url: str(body.event_source_url || new URL(request.url).origin + '/checkout', 500),
        action_source: 'website',
        user_data: userData,
        custom_data: {
          currency: currency || 'AUD',
          value: Math.round(amount) / 100,
          order_id: orderNumber,
          contents,
          num_items: contents.reduce((n, c) => n + c.quantity, 0)
        }
      }
    ],
    access_token: env.FB_CAPI_TOKEN
  };

  const res = await fetch(`https://graph.facebook.com/v19.0/${env.FB_PIXEL_ID}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return res.ok;
}

export async function onRequestPost(context) {
  const { request, env, waitUntil } = context;

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return json({
      ok: false,
      error_code: 'invalid_request',
      message: 'We could not read your order details. Please refresh the page and try again.'
    });
  }

  if (!body || typeof body !== 'object') {
    return json({
      ok: false,
      error_code: 'invalid_request',
      message: 'We could not read your order details. Please refresh the page and try again.'
    });
  }

  const orderNumber = str(body.order_number, 80).trim();
  if (!orderNumber) {
    return json({
      ok: false,
      error_code: 'missing_order_number',
      message: 'Your order reference is missing. Please refresh the page and try again.'
    });
  }

  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount < 0) {
    return json({
      ok: false,
      error_code: 'invalid_amount',
      message: 'The order total could not be confirmed. Please refresh and try again.'
    });
  }

  const currency = str(body.currency, 8) || 'AUD';

  /* Same-origin sanity check — logged, never used to reject a real shopper. */
  const origin = request.headers.get('Origin');
  if (origin) {
    try {
      if (new URL(origin).host !== new URL(request.url).host) {
        console.warn('[checkout] cross-origin submit', origin);
      }
    } catch (e) {}
  }

  if (typeof waitUntil === 'function') {
    waitUntil(
      mirrorToCapi(env, body, orderNumber, amount, currency, request).catch((err) =>
        console.warn('[checkout] capi mirror failed', err && err.message)
      )
    );
  }

  return json({
    ok: true,
    order_number: orderNumber,
    amount,
    currency,
    processed_at: new Date().toISOString()
  });
}

export async function onRequestGet() {
  return json({
    ok: false,
    error_code: 'method_not_allowed',
    message: 'Use POST /api/checkout with a JSON body.'
  });
}
