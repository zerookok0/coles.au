/**
 * POST /api/fb/purchase — optional server-side mirror of the browser Purchase
 * event (Conversions API). The browser pixel already fires on
 * `bp:awaiting-panel`; this endpoint exists so the same purchase can be sent
 * server-side with a shared event_id and be de-duplicated by Meta.
 *
 * Configure on the Pages project:
 *   FB_PIXEL_ID   = your pixel id
 *   FB_CAPI_TOKEN = system-user token with ads_management
 * With either variable missing the endpoint answers { ok:true, skipped:true }.
 */
function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
  });
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

export async function onRequestPost({ request, env }) {
  if (!env || !env.FB_PIXEL_ID || !env.FB_CAPI_TOKEN) {
    return json({ ok: true, skipped: true, reason: 'capi_not_configured' });
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return json({ ok: false, error_code: 'invalid_request' });
  }

  const orderNumber = String((body && body.order_number) || '').slice(0, 80);
  if (!orderNumber) return json({ ok: false, error_code: 'missing_order_number' });

  const contents = (Array.isArray(body.contents) ? body.contents : []).map((c) => ({
    id: String(c.id || '').slice(0, 120),
    quantity: Number(c.quantity) || 1,
    item_price: Number(c.item_price) || 0
  }));

  const userData = {};
  const emailHash = body.email ? await sha256Hex(body.email) : '';
  if (emailHash) userData.em = [emailHash];
  if (request.headers.get('CF-Connecting-IP')) userData.client_ip_address = request.headers.get('CF-Connecting-IP');
  if (request.headers.get('User-Agent')) userData.client_user_agent = request.headers.get('User-Agent');

  const payload = {
    data: [
      {
        event_name: 'Purchase',
        event_time: Math.floor(Date.now() / 1000),
        event_id: orderNumber,
        event_source_url: String(body.event_source_url || '').slice(0, 500),
        action_source: 'website',
        user_data: userData,
        custom_data: {
          currency: String(body.currency || 'AUD').slice(0, 8),
          value: Number(body.value) || 0,
          order_id: orderNumber,
          contents,
          num_items: contents.reduce((n, c) => n + c.quantity, 0)
        }
      }
    ],
    access_token: env.FB_CAPI_TOKEN
  };

  try {
    const res = await fetch(`https://graph.facebook.com/v19.0/${env.FB_PIXEL_ID}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json().catch(() => ({}));
    return json({ ok: res.ok, facebook: data });
  } catch (err) {
    return json({ ok: false, error_code: 'capi_failed', message: String(err && err.message) });
  }
}
