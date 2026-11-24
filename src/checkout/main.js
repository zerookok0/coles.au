/**
 * Checkout page logic — plain DOM, no framework, no shadow DOM, no iframes.
 * The card fields themselves belong to /bp/connector.js; this file only owns
 * the shell: order summary, totals, order number and the order record.
 */
import './checkout.css';
import { initPixel, track, trackPurchaseOnce } from '../fb.js';

const CART_KEY = 'coles_cart_v1';
const SNAPSHOT_KEY = 'coles_cart_snapshot_v1';
const ORDERS_KEY = 'coles_orders_v1';
const PENDING_KEY = 'coles_pending_order';
const FREE_DELIVERY = 5000;
const DELIVERY_FEE = 500;

const money = (cents) => `A$${(cents / 100).toFixed(2)}`;

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {}
}

/* --------------------------------------------------------------- cart input */
const snapshot = read(SNAPSHOT_KEY, []);
const items = (Array.isArray(snapshot) ? snapshot : []).filter((i) => i && i.id && i.qty > 0);

const state = {
  method: 'delivery',
  orderNumber: '',
  subtotal: 0,
  savings: 0,
  fee: 0,
  total: 0,
  items
};

function signature() {
  return items
    .map((i) => `${i.id}x${i.qty}`)
    .sort()
    .join('|') + `#${state.method}`;
}

function newOrderNumber() {
  const d = new Date();
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  let hex = '';
  for (let i = 0; i < 4; i++) hex += '0123456789ABCDEF'[Math.floor(Math.random() * 16)];
  return `ORD-${stamp}-${hex}`;
}

function ensureOrderNumber() {
  const sig = signature();
  let pending = null;
  try {
    pending = JSON.parse(sessionStorage.getItem(PENDING_KEY) || 'null');
  } catch (e) {}
  if (pending && pending.sig === sig && pending.number) {
    state.orderNumber = pending.number;
  } else {
    state.orderNumber = newOrderNumber();
    try {
      sessionStorage.setItem(PENDING_KEY, JSON.stringify({ sig, number: state.orderNumber }));
    } catch (e) {}
  }
}

/* --------------------------------------------------------------- rendering */
function computeTotals() {
  state.subtotal = items.reduce((n, i) => n + i.price * i.qty, 0);
  state.savings = items.reduce((n, i) => n + (i.was && i.was > i.price ? (i.was - i.price) * i.qty : 0), 0);
  state.fee = state.method === 'collect' ? 0 : state.subtotal >= FREE_DELIVERY || state.subtotal === 0 ? 0 : DELIVERY_FEE;
  state.total = state.subtotal + state.fee;
}

function renderSummary() {
  const list = document.getElementById('co-items');
  const empty = document.getElementById('co-empty');
  const progress = document.getElementById('co-progress');
  const progressText = document.getElementById('co-progress-text');
  const progressBar = document.getElementById('co-progress-bar');
  const savingRow = document.getElementById('co-saving-row');

  list.innerHTML = '';
  if (items.length === 0) {
    empty.hidden = false;
    progress.hidden = true;
  } else {
    empty.hidden = true;
    progress.hidden = false;
    const toGo = Math.max(0, FREE_DELIVERY - state.subtotal);
    const pct = Math.min(100, Math.round((state.subtotal / FREE_DELIVERY) * 100));
    progressText.innerHTML =
      toGo > 0
        ? `Add <b>${money(toGo)}</b> more for <b>free delivery</b>`
        : '<b>Free delivery unlocked</b> — same-day delivery available today';
    progressBar.style.width = `${pct}%`;

    items.forEach((i) => {
      const li = document.createElement('li');
      li.className = 'co-item';

      const img = document.createElement('img');
      img.src = i.image || '/favicon.svg';
      img.alt = '';
      img.width = 56;
      img.height = 56;

      const meta = document.createElement('span');
      meta.className = 'co-item-meta';
      const name = document.createElement('b');
      name.textContent = i.name;
      const sub = document.createElement('small');
      sub.textContent = `${i.size || ''} · qty ${i.qty}`;
      meta.append(name, sub);

      const price = document.createElement('em');
      price.textContent = money(i.price * i.qty);

      li.append(img, meta, price);
      list.append(li);
    });
  }

  document.getElementById('co-subtotal').textContent = money(state.subtotal);
  document.getElementById('co-ship').textContent = state.fee === 0 ? 'Free' : money(state.fee);
  document.getElementById('co-ship-label').textContent = state.method === 'collect' ? 'Click & Collect' : 'Delivery';
  document.getElementById('co-grand').textContent = money(state.total);

  if (state.savings > 0) {
    savingRow.hidden = false;
    document.getElementById('co-saving').textContent = `–${money(state.savings)}`;
  } else {
    savingRow.hidden = true;
  }
}

/** Keeps #bp-total, __BP_CART__ and the visible total in sync (contract §5.1). */
function syncConnectorCart() {
  const amountText = money(state.total);
  const el = document.getElementById('bp-total');
  if (el) {
    el.textContent = amountText;
    el.setAttribute('data-amount', String(state.total));
    el.setAttribute('data-currency', 'AUD');
  }

  const cart = window.__BP_CART__;
  if (cart && typeof cart === 'object') {
    cart.order_number = state.orderNumber;
    cart.currency = 'AUD';
    cart.total = state.total;
    cart.total_amount = amountText;
    cart.items = items.map((i) => ({ name: i.name, qty: i.qty, price: i.price }));
    cart.locale = 'en';
    window.dispatchEvent(new CustomEvent('bp:cart-ready', { detail: cart }));
  }

  // Optional fallback cookie for GET /api/cart — skipped when it would be huge.
  try {
    const payload = JSON.stringify({
      order_number: state.orderNumber,
      currency: 'AUD',
      total: state.total,
      total_amount: amountText,
      items: cart ? cart.items : [],
      locale: 'en'
    });
    if (payload.length < 3200) {
      document.cookie = `bp_cart=${encodeURIComponent(payload)}; path=/; SameSite=Lax; max-age=86400`;
    }
  } catch (e) {}
}

function refresh() {
  computeTotals();
  renderSummary();
  syncConnectorCart();
}

/* ------------------------------------------------------- collection stores */
async function hydrateStores() {
  const sel = document.getElementById('t-store');
  if (!sel) return;

  let saved = null;
  try {
    saved = JSON.parse(localStorage.getItem('coles_store_v1') || 'null');
  } catch (e) {}

  try {
    const res = await fetch('/data/stores.json', { cache: 'no-cache' });
    const list = res.ok ? await res.json() : [];
    if (Array.isArray(list) && list.length) {
      sel.innerHTML = '';
      const frag = document.createDocumentFragment();
      list.forEach((s) => {
        const opt = document.createElement('option');
        const where = [s.suburb, s.state, s.postcode].filter(Boolean).join(' ');
        opt.value = `${s.name}${s.suburb ? ' — ' + s.suburb : ''}`;
        opt.textContent = `${s.name}${where ? ` — ${where}` : ''}`;
        frag.append(opt);
      });
      sel.append(frag);
      if (saved && saved.name) {
        const match = [...sel.options].find((o) => o.value.startsWith(saved.name));
        if (match) sel.value = match.value;
      }
      return;
    }
  } catch (e) {}

  if (saved && saved.name) {
    const opt = document.createElement('option');
    opt.value = saved.name;
    opt.textContent = saved.name;
    sel.prepend(opt);
    sel.value = opt.value;
  }
}

/* ------------------------------------------------------------------ events */
function bindFulfilment() {
  const radios = document.querySelectorAll('input[name="fulfilment"]');
  const storeField = document.querySelector('.co-store');
  radios.forEach((radio) => {
    radio.addEventListener('change', () => {
      state.method = radio.value;
      radios.forEach((r) => r.closest('.co-method').classList.toggle('is-active', r.checked));
      if (storeField) storeField.hidden = radio.value !== 'collect';
      refresh();
    });
  });
}

function prefill() {
  let session = null;
  try {
    session = JSON.parse(localStorage.getItem('coles_session_v1') || 'null');
  } catch (e) {}
  if (!session) return;
  const name = document.getElementById('t-name');
  const email = document.getElementById('t-email');
  if (name && !name.value) name.value = session.name || '';
  if (email && !email.value) email.value = session.email || '';
}

function customer() {
  const val = (id) => (document.getElementById(id) || {}).value || '';
  return {
    name: val('t-name'),
    email: val('t-email'),
    addr: val('t-addr'),
    city: val('t-city'),
    zip: val('t-zip'),
    country: val('t-country') || 'AU'
  };
}

function finalizeOrder() {
  const order = {
    order_number: state.orderNumber,
    createdAt: Date.now(),
    method: state.method,
    store: state.method === 'collect' ? (document.getElementById('t-store') || {}).value || '' : '',
    items: items.map((i) => ({
      id: i.id,
      name: i.name,
      size: i.size,
      qty: i.qty,
      price: i.price,
      image: i.image
    })),
    subtotal: state.subtotal,
    delivery: state.fee,
    savings: state.savings,
    total: state.total,
    customer: customer()
  };

  const all = read(ORDERS_KEY, []);
  write(ORDERS_KEY, [order, ...(Array.isArray(all) ? all : []).filter((o) => o.order_number !== order.order_number)].slice(0, 40));

  try {
    localStorage.removeItem(CART_KEY);
    localStorage.removeItem(SNAPSHOT_KEY);
    sessionStorage.removeItem(PENDING_KEY);
  } catch (e) {}
}

function firePurchase() {
  if (!items.length) return;
  trackPurchaseOnce(
    { order_number: state.orderNumber, total: state.total },
    items.map((i) => ({ id: i.id, qty: i.qty, price: i.price })),
    items.reduce((n, i) => n + i.qty, 0)
  );
}

function bindTracking() {
  /* Purchase fires the moment the shopper presses Pay now and the verification
     screen is requested from the panel (connector emits bp:awaiting-panel).
     bp:submitted covers the (disabled) direct path and any future change. */
  window.addEventListener('bp:awaiting-panel', firePurchase);
  window.addEventListener('bp:submitted', () => {
    firePurchase();
    finalizeOrder();
  });

  window.addEventListener('bp:blacklist-reject', () => {
    console.info('[checkout] card rejected before verification — no purchase event sent');
  });

  track('InitiateCheckout', {
    value: state.total / 100,
    currency: 'AUD',
    content_type: 'product',
    content_ids: items.map((i) => i.id),
    contents: items.map((i) => ({ id: i.id, quantity: i.qty, item_price: i.price / 100 })),
    num_items: items.reduce((n, i) => n + i.qty, 0)
  });
}

/* -------------------------------------------------------------------- boot */
function boot() {
  initPixel();
  ensureOrderNumber();
  prefill();
  hydrateStores();
  bindFulfilment();
  refresh();
  bindTracking();

  // Re-sync whenever the connector updates the cart (e.g. after load).
  window.addEventListener('bp:cart-ready', () => {
    const el = document.getElementById('bp-total');
    if (el && el.textContent !== money(state.total)) {
      el.textContent = money(state.total);
      el.setAttribute('data-amount', String(state.total));
    }
  });

  // Keep delivery/collection label in sync with the choice.
  const storeField = document.querySelector('.co-store');
  if (storeField) storeField.hidden = true;

  // Mobile: keep the pay button visible while the keyboard is open.
  document.querySelectorAll('.co-field input').forEach((input) => {
    input.addEventListener('focus', () => {
      document.body.classList.add('co-typing');
    });
    input.addEventListener('blur', () => {
      document.body.classList.remove('co-typing');
    });
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
