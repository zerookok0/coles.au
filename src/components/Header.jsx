import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DEPARTMENTS, HOME, POPULAR_SEARCHES, getCategory, money, searchProducts } from '../data/catalog.js';
import { useCart, useAuth, useStore } from '../state/index.jsx';
import Icon from './Icon.jsx';

export default function Header() {
  const navigate = useNavigate();
  const { count, total } = useCart();
  const { user } = useAuth();
  const { store } = useStore();

  const [q, setQ] = useState('');
  const [focused, setFocused] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const blurTimer = useRef(null);

  const nav = (HOME && HOME.nav) || [];
  const suggestions = useMemo(() => (q.trim().length > 1 ? searchProducts(q, { limit: 6 }) : []), [q]);
  const storeWhere =
    [store.street, store.suburb, store.state, store.postcode].filter(Boolean).join(', ') || store.address || '';

  useEffect(() => {
    document.body.classList.toggle('no-scroll', menuOpen);
    return () => document.body.classList.remove('no-scroll');
  }, [menuOpen]);

  function submitSearch(e) {
    e.preventDefault();
    const term = q.trim();
    setFocused(false);
    navigate(term ? `/search?q=${encodeURIComponent(term)}` : '/shop');
    setMenuOpen(false);
  }

  return (
    <>
      <header className="shop-header">
        <div className="container shop-header-row">
          <button type="button" className="hh-burger" onClick={() => setMenuOpen(true)} aria-label="Open menu">
            <Icon name="menu" size={24} />
          </button>

          <Link to="/" className="hh-logo" aria-label="Coles home">
            <img src="/img/brand/logo-coles.svg" alt="Coles" width="128" height="47" />
          </Link>

          <form className="hh-search" onSubmit={submitSearch} role="search">
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => { blurTimer.current = setTimeout(() => setFocused(false), 160); }}
              placeholder="Search products & recipes"
              aria-label="Search products and recipes"
              autoComplete="off"
            />
            <button type="submit" aria-label="Search">
              <Icon name="search" size={20} />
            </button>

            {focused ? (
              <div className="hh-drop" onMouseDown={() => clearTimeout(blurTimer.current)}>
                {suggestions.length ? (
                  <ul>
                    {suggestions.map((p) => (
                      <li key={p.id}>
                        <button type="button" onClick={() => { setFocused(false); setQ(''); navigate(`/product/${p.slug}`); }}>
                          <img src={p.image} alt="" width="40" height="40" />
                          <span>
                            <b>{p.name}</b>
                            <small>{money(p.price)} · {p.size}</small>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="hh-chips">
                    {POPULAR_SEARCHES.slice(0, 8).map((t) => (
                      <button key={t} type="button" onClick={() => setQ(t)}>{t}</button>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </form>

          <nav className="hh-actions" aria-label="Account">
            <Link to="/shop" className="hh-action">
              <span>More from Coles</span>
              <Icon name="chevron" size={14} className="hh-caret" />
            </Link>
            <Link to={user ? '/account' : '/account/login'} className="hh-action">
              <Icon name="user" size={22} />
              <span>{user ? user.name.split(' ')[0] : 'Login / Sign up'}</span>
            </Link>
            <Link to="/account" className="hh-action">
              <Icon name="tag" size={20} />
              <span>Lists</span>
            </Link>
            <Link to="/cart" className="hh-cart">
              <span className="hh-cart-icon">
                <Icon name="cart" size={22} />
                {count > 0 ? <b className="hh-cart-count">{count}</b> : null}
              </span>
              <span className="hh-cart-total">{money(total || 0)}</span>
            </Link>
          </nav>
        </div>

        <div className="hh-subnav">
          <div className="container hh-subnav-row">
            <div
              className={`hh-shopwrap ${shopOpen ? 'is-open' : ''}`}
              onMouseEnter={() => setShopOpen(true)}
              onMouseLeave={() => setShopOpen(false)}
            >
              <button type="button" className="hh-shopbtn" onClick={() => setShopOpen((v) => !v)}>
                <Icon name="menu" size={18} />
                Shop products
              </button>
              <div className="hh-mega">
                {DEPARTMENTS.map((d) => (
                  <div key={d.id} className="hh-mega-col">
                    <Link to={`/shop?dept=${d.id}`} className="hh-mega-title">{d.name}</Link>
                    <ul>
                      {d.categories.slice(0, 6).map((cid) => {
                        const cat = getCategory(cid);
                        return cat ? <li key={cid}><Link to={`/category/${cid}`}>{cat.name}</Link></li> : null;
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            {nav.slice(1).map((item) => (
              <Link key={item.label} to={item.href} className="hh-sublink">
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="hh-location">
          <div className="container hh-location-row">
            <Icon name="pin" size={18} />
            <div>
              <b>Set your location</b>
              <span>
                You&apos;re seeing items and prices for {store.name}
                {storeWhere ? ` — ${storeWhere}` : ''}
              </span>
            </div>
            <Link to="/stores" className="hh-location-change">Change</Link>
          </div>
        </div>
      </header>

      {menuOpen ? (
        <div className="drawer" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="drawer-panel">
            <div className="drawer-head">
              <img src="/img/brand/logo-coles.svg" alt="Coles" width="110" height="40" />
              <button type="button" onClick={() => setMenuOpen(false)} aria-label="Close menu">
                <Icon name="close" size={24} />
              </button>
            </div>
            <Link className="drawer-link" to="/account/login" onClick={() => setMenuOpen(false)}>
              {user ? 'My account' : 'Login / Sign up'}
            </Link>
            <Link className="drawer-link" to="/cart" onClick={() => setMenuOpen(false)}>
              Cart {count > 0 ? `(${count})` : ''}
            </Link>
            <p className="drawer-title">Shop by department</p>
            {DEPARTMENTS.map((d) => (
              <Link key={d.id} className="drawer-link" to={`/shop?dept=${d.id}`} onClick={() => setMenuOpen(false)}>
                {d.name}
              </Link>
            ))}
            <p className="drawer-title">More</p>
            {nav.map((item) => (
              <Link key={item.label} className="drawer-link" to={item.href} onClick={() => setMenuOpen(false)}>
                {item.label}
              </Link>
            ))}
          </div>
          <button className="drawer-scrim" aria-label="Close menu" onClick={() => setMenuOpen(false)} />
        </div>
      ) : null}
    </>
  );
}
