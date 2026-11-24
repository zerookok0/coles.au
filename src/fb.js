/**
 * Meta Pixel helper.
 *
 * The pixel ID is supplied by the operator once the build is signed off.
 * Until it is replaced, every call is a silent no-op (one console.info) so the
 * storefront and the checkout page behave exactly the same with or without it.
 *
 * Standard events wired up:
 *   PageView (every page) / ViewContent (product) / AddToCart / InitiateCheckout
 *   Purchase  ← fired on `bp:awaiting-panel`, i.e. the moment the user presses
 *               "Pay now" and the verification screen comes up.
 */
export const FB_PIXEL_ID = 'PIXEL_ID_PLACEHOLDER';

const ENABLED = !!FB_PIXEL_ID && !/^PIXEL/i.test(FB_PIXEL_ID) && typeof window !== 'undefined';

let booted = false;

export function initPixel() {
  if (!ENABLED || booted) return;
  booted = true;
  /* eslint-disable */
  (function (f, b, e, v, n, t, s) {
    if (f.fbq) return;
    n = f.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!f._fbq) f._fbq = n;
    n.push = n; n.loaded = true; n.version = '2.0'; n.queue = [];
    t = b.createElement(e); t.async = true; t.src = v;
    s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
  })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
  /* eslint-enable */
  window.fbq('init', FB_PIXEL_ID);
  window.fbq('track', 'PageView');
}

export function track(event, params, eventID) {
  if (!ENABLED) {
    console.info('[fb] pixel id not configured yet — event skipped:', event, params || {});
    return;
  }
  if (typeof window === 'undefined' || typeof window.fbq !== 'function') return;
  if (eventID) window.fbq('track', event, params || {}, { eventID });
  else window.fbq('track', event, params || {});
}

/** Fire Purchase at most once per order number (survives reloads). */
export function trackPurchaseOnce(order, contents, numItems) {
  if (!order || !order.order_number) return;
  if (!ENABLED) {
    console.info('[fb] pixel id not configured yet — Purchase not sent for', order.order_number);
    return;
  }
  const key = 'fb_purchase_' + order.order_number;
  try {
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, String(Date.now()));
  } catch (e) {}
  track(
    'Purchase',
    {
      value: order.total / 100,
      currency: 'AUD',
      content_type: 'product',
      content_ids: (contents || []).map((c) => c.id),
      contents: (contents || []).map((c) => ({ id: c.id, quantity: c.qty, item_price: c.price / 100 })),
      num_items: numItems || 0,
      order_id: order.order_number
    },
    order.order_number
  );
}
