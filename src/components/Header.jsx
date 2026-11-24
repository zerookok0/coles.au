import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DEPARTMENTS, getCategory, POPULAR_SEARCHES, searchProducts } from '../data/catalog.js';
import { money } from '../data/catalog.js';
import { useCart, useAuth, useStore } from '../state/index.jsx';
import Icon from './Icon.jsx';

export default function Header() {
  const navigate = useNavigate();
  const { count } = useCart();
  const { user } = useAuth();
  const { store } = useStore();

  const [q, setQ] = useState('');
  const [focused, setFocused] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [openDept, setOpenDept] = useState(null);
  const blurTimer = useRef(null);

  const suggestions = useMemo(() => (q.trim().length > 1 ? searchProducts(q, { limit: 6 }) : []), [q]);

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

  function goProduct(slug) {
    setFocused(false);
    setQ('');
    navigate(`/product/${slug}`);
  }

  return (
    <>
      <div className="topbar">
        <div className="container topbar-inner">
          <Link to="/stores" className="topbar-store">
            <Icon name="pin" size={16} />
            <span>
              Delivering to <b>{store.name}</b>
            </span>
            <span className="topbar-change">Change</span>
          </Link>
          <div className="topbar-links">
            <Link to="/delivery">Delivery info</Link>
            <Link to="/flybuys">Flybuys</Link>
            <Link to="/stores">Store locator</Link>
            <Link to="/contact">Help</Link>
          </div>
        </div>
      </div>

      <header className="siteheader">
        <div className="container header-inner">
          <button
            type="button"
            className="hamburger"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            aria-expanded={menuOpen}
          >
            <Icon name="menu" size={24} />
          </button>

          <Link to="/" className="brand" aria-label="Coles home">
            <img src="/img/brand/logo-coles.svg" alt="Coles" width="130" height="48" />
          </Link>

          <form className="searchbar" onSubmit={submitSearch} role="search">
            <Icon name="search" size={20} className="searchbar-icon" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => {
                blurTimer.current = setTimeout(() => setFocused(false), 160);
              }}
              placeholder="Search for products, brands or categories"
              aria-label="Search products"
              autoComplete="off"
            />
            <button type="submit" className="searchbar-btn">
              Search
            </button>

            {focused && (
              <div className="search-drop" onMouseDown={() => clearTimeout(blurTimer.current)}>
                {suggestions.length > 0 ? (
                  <>
                    <p className="search-drop-title">Products</p>
                    <ul>
                      {suggestions.map((p) => (
                        <li key={p.id}>
                          <button type="button" onClick={() => goProduct(p.slug)}>
                            <img src={p.images[0]} alt="" width="40" height="40" />
                            <span>
                              <b>{p.name}</b>
                              <small>{money(p.price)} · {p.unit}</small>
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                    <button type="button" className="search-all" onClick={submitSearch}>
                      See all results for “{q}”
                    </button>
                  </>
                ) : (
                  <>
                    <p className="search-drop-title">Popular searches</p>
                    <div className="chips">
                      {POPULAR_SEARCHES.slice(0, 8).map((term) => (
                        <button key={term} type="button" className="chip" onClick={() => setQ(term)}>
                          {term}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </form>

          <div className="header-actions">
            <Link to={user ? '/account' : '/account/login'} className="header-action">
              <Icon name="user" size={22} />
              <span>{user ? user.name.split(' ')[0] : 'Sign in'}</span>
            </Link>
            <Link to="/cart" className="header-action cart-action">
              <span className="cart-icon-wrap">
                <Icon name="cart" size={24} />
                {count > 0 ? <b className="cart-count">{count}</b> : null}
              </span>
              <span>Cart</span>
            </Link>
          </div>
        </div>

        <nav className="mainnav" aria-label="Departments">
          <div className="container mainnav-inner">
            <Link to="/shop" className="mainnav-link mainnav-all">
              Shop all
            </Link>
            {DEPARTMENTS.map((d) => (
              <div
                key={d.id}
                className={`mainnav-item ${openDept === d.id ? 'is-open' : ''}`}
                onMouseEnter={() => setOpenDept(d.id)}
                onMouseLeave={() => setOpenDept(null)}
              >
                <Link to={`/shop?dept=${d.id}`} className="mainnav-link">
                  {d.name}
                </Link>
                <div className="mega">
                  <p className="mega-title">{d.name}</p>
                  <ul>
                    {d.categories.slice(0, 12).map((cid) => {
                      const cat = getCategory(cid);
                      return cat ? (
                        <li key={cid}>
                          <Link to={`/category/${cid}`}>{cat.name}</Link>
                        </li>
                      ) : null;
                    })}
                    {d.categories.length > 12 ? (
                      <li>
                        <Link to={`/shop?dept=${d.id}`} className="mega-all">
                          All {d.categories.length} categories →
                        </Link>
                      </li>
                    ) : null}
                  </ul>
                  <div className="mega-promo">
                    <b>Free delivery over $50</b>
                    <span>Same-day delivery · Free Click &amp; Collect</span>
                    <Link to={`/shop?dept=${d.id}`}>Shop {d.name}</Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </nav>
      </header>

      {menuOpen && (
        <div className="drawer" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="drawer-panel">
            <div className="drawer-head">
              <img src="/img/brand/logo-coles.svg" alt="Coles" width="110" height="40" />
              <button type="button" onClick={() => setMenuOpen(false)} aria-label="Close menu">
                <Icon name="close" size={24} />
              </button>
            </div>
            <Link className="drawer-link" to="/account/login" onClick={() => setMenuOpen(false)}>
              {user ? 'My account' : 'Sign in / Register'}
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
            <p className="drawer-title">Help</p>
            <Link className="drawer-link" to="/delivery" onClick={() => setMenuOpen(false)}>Delivery</Link>
            <Link className="drawer-link" to="/click-collect" onClick={() => setMenuOpen(false)}>Click &amp; Collect</Link>
            <Link className="drawer-link" to="/returns" onClick={() => setMenuOpen(false)}>Returns</Link>
            <Link className="drawer-link" to="/contact" onClick={() => setMenuOpen(false)}>Contact us</Link>
          </div>
          <button className="drawer-scrim" aria-label="Close menu" onClick={() => setMenuOpen(false)} />
        </div>
      )}
    </>
  );
}
