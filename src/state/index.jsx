import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import { getProduct } from '../data/catalog.js';
import { SITE } from '../config.js';

/* ------------------------------------------------------------------ storage */
const CART_KEY = 'coles_cart_v1';
const ACCOUNTS_KEY = 'coles_accounts_v1';
const SESSION_KEY = 'coles_session_v1';
const ORDERS_KEY = 'coles_orders_v1';
const STORE_KEY = 'coles_store_v1';

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    return fallback;
  }
}

function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {}
}

/* -------------------------------------------------------------------- toast */
const ToastCtx = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef([]);

  const pushToast = useCallback((message, opts = {}) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev.slice(-2), { id, message, href: opts.href, label: opts.label }]);
    const t = setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id));
    }, opts.ms || 3200);
    timers.current.push(t);
  }, []);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const value = useMemo(() => ({ pushToast }), [pushToast]);

  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div className="toast-stack" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="toast">
            <span>{t.message}</span>
            {t.href ? <a href={t.href}>{t.label || 'View cart'}</a> : null}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx) || { pushToast: () => {} };

/* --------------------------------------------------------------------- cart */
const CartCtx = createContext(null);

export function CartProvider({ children }) {
  const [lines, setLines] = useState(() => {
    const stored = readJSON(CART_KEY, []);
    return Array.isArray(stored) ? stored.filter((l) => l && l.id && l.qty > 0) : [];
  });

  useEffect(() => {
    writeJSON(CART_KEY, lines);
  }, [lines]);

  // Denormalised snapshot so the static /checkout page needs no catalog bundle.
  useEffect(() => {
    const snapshot = lines
      .map((l) => {
        const product = getProduct(l.id);
        if (!product) return null;
        return {
          id: product.id,
          name: product.name,
          brand: product.brand,
          size: product.size,
          price: product.price,
          was: product.was || 0,
          image: product.images[0],
          qty: l.qty
        };
      })
      .filter(Boolean);
    writeJSON('coles_cart_snapshot_v1', snapshot);
  }, [lines]);

  const items = useMemo(
    () =>
      lines
        .map((l) => {
          const product = getProduct(l.id);
          if (!product) return null;
          return { ...l, product, lineTotal: product.price * l.qty };
        })
        .filter(Boolean),
    [lines]
  );

  const count = items.reduce((n, i) => n + i.qty, 0);
  const subtotal = items.reduce((n, i) => n + i.lineTotal, 0);
  const savings = items.reduce(
    (n, i) => n + (i.product.was ? (i.product.was - i.product.price) * i.qty : 0),
    0
  );
  const deliveryFee = subtotal === 0 || subtotal >= SITE.freeDeliveryThreshold ? 0 : SITE.deliveryFee;
  const total = subtotal + deliveryFee;

  const add = useCallback((id, qty = 1) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.id === id);
      if (existing) return prev.map((l) => (l.id === id ? { ...l, qty: Math.min(99, l.qty + qty) } : l));
      return [...prev, { id, qty }];
    });
  }, []);

  const setQty = useCallback((id, qty) => {
    setLines((prev) => {
      if (qty <= 0) return prev.filter((l) => l.id !== id);
      return prev.map((l) => (l.id === id ? { ...l, qty: Math.min(99, qty) } : l));
    });
  }, []);

  const remove = useCallback((id) => {
    setLines((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const value = useMemo(
    () => ({ lines, items, count, subtotal, savings, deliveryFee, total, add, setQty, remove, clear }),
    [lines, items, count, subtotal, savings, deliveryFee, total, add, setQty, remove, clear]
  );

  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>;
}

export const useCart = () => useContext(CartCtx);

/* --------------------------------------------------------------------- auth */
const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => readJSON(SESSION_KEY, null));
  const [accounts, setAccounts] = useState(() => readJSON(ACCOUNTS_KEY, []));

  const persistAccounts = useCallback((next) => {
    setAccounts(next);
    writeJSON(ACCOUNTS_KEY, next);
  }, []);

  const persistSession = useCallback((next) => {
    setUser(next);
    writeJSON(SESSION_KEY, next);
  }, []);

  /**
   * Registration validates the form, then signs the shopper in.
   */
  const register = useCallback(
    ({ name, email, password }) => {
      const cleanEmail = String(email || '').trim().toLowerCase();
      if (!String(name || '').trim()) return { ok: false, error: 'Please enter your full name.' };
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) return { ok: false, error: 'Please enter a valid email address.' };
      if (String(password || '').length < 6) return { ok: false, error: 'Password must be at least 6 characters.' };
      if (accounts.some((a) => a.email === cleanEmail)) return { ok: false, error: 'An account with this email already exists. Please sign in.' };

      const account = { name: String(name).trim(), email: cleanEmail, password: String(password), createdAt: Date.now() };
      persistAccounts([...accounts, account]);
      persistSession({ name: account.name, email: account.email });
      return { ok: true };
    },
    [accounts, persistAccounts, persistSession]
  );

  /**
   * Sign in is intentionally frictionless for returning shoppers: any email and
   * password combination is accepted and lands the shopper straight in their
   * account (the account is created on the fly if we have not seen it before).
   */
  const login = useCallback(
    ({ email, password }) => {
      const cleanEmail = String(email || '').trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        return { ok: false, error: 'Please enter a valid email address.' };
      }
      if (!String(password || '').trim()) {
        return { ok: false, error: 'Please enter your password.' };
      }
      const known = accounts.find((a) => a.email === cleanEmail);
      const profile = known
        ? { name: known.name, email: known.email }
        : { name: cleanEmail.split('@')[0].replace(/[._-]+/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase()), email: cleanEmail };
      if (!known) persistAccounts([...accounts, { ...profile, password: String(password), createdAt: Date.now() }]);
      persistSession(profile);
      return { ok: true, profile };
    },
    [accounts, persistAccounts, persistSession]
  );

  const logout = useCallback(() => persistSession(null), [persistSession]);

  const value = useMemo(() => ({ user, accounts, register, login, logout }), [user, accounts, register, login, logout]);
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);

/* -------------------------------------------------------------------- store */
const StoreCtx = createContext(null);

export function StoreProvider({ children }) {
  const [store, setStore] = useState(() => readJSON(STORE_KEY, SITE.stores[0]));

  const choose = useCallback((next) => {
    setStore(next);
    writeJSON(STORE_KEY, next);
  }, []);

  const value = useMemo(() => ({ store, choose, stores: SITE.stores }), [store, choose]);
  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export const useStore = () => useContext(StoreCtx);

/* ------------------------------------------------------------------- orders */
export function saveOrder(order) {
  const all = readJSON(ORDERS_KEY, []);
  const next = [order, ...all.filter((o) => o.order_number !== order.order_number)];
  writeJSON(ORDERS_KEY, next.slice(0, 40));
  return order;
}

export function listOrders() {
  return readJSON(ORDERS_KEY, []);
}

export function getOrder(orderNumber) {
  return listOrders().find((o) => o.order_number === orderNumber) || null;
}
