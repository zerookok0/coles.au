import React, { useEffect } from 'react';
import { Link, Route, Routes, useLocation } from 'react-router-dom';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import PromoPopup from './components/PromoPopup.jsx';
import Icon from './components/Icon.jsx';
import Home from './pages/Home.jsx';
import Listing from './pages/Listing.jsx';
import Product from './pages/Product.jsx';
import Cart from './pages/Cart.jsx';
import { Login, Register } from './pages/Auth.jsx';
import Account from './pages/Account.jsx';
import Order from './pages/Order.jsx';
import { NotFound, Policy } from './pages/Policy.jsx';
import Stores from './pages/Stores.jsx';
import { AuthProvider, CartProvider, StoreProvider, ToastProvider, useCart } from './state/index.jsx';

function ScrollToTop() {
  const { pathname, search } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [pathname, search]);
  return null;
}

/** /checkout is a static, framework-free page — hand the browser over to it. */
function CheckoutHandoff() {
  useEffect(() => {
    window.location.replace(`/checkout${window.location.search}`);
  }, []);
  return (
    <div className="container empty">
      <p>Taking you to secure checkout…</p>
    </div>
  );
}

function MobileTabs() {
  const { count } = useCart();
  const { pathname } = useLocation();
  const isActive = (to) => (to === '/' ? pathname === '/' : pathname.startsWith(to));

  return (
    <nav className="mobiletabs" aria-label="Quick links">
      <Link to="/" className={isActive('/') ? 'is-active' : ''}>
        <Icon name="store" size={22} />
        Home
      </Link>
      <Link to="/shop" className={isActive('/shop') ? 'is-active' : ''}>
        <Icon name="tag" size={22} />
        Shop
      </Link>
      <Link to="/search" className={isActive('/search') ? 'is-active' : ''}>
        <Icon name="search" size={22} />
        Search
      </Link>
      <Link to="/cart" className={isActive('/cart') ? 'is-active' : ''}>
        <span className="mobiletabs-cart">
          <Icon name="cart" size={22} />
          {count > 0 ? <b>{count}</b> : null}
        </span>
        Cart
      </Link>
      <Link to="/account" className={isActive('/account') ? 'is-active' : ''}>
        <Icon name="user" size={22} />
        Account
      </Link>
    </nav>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <StoreProvider>
        <CartProvider>
          <AuthProvider>
            <ScrollToTop />
            <Header />
            <main className="site-main">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/shop" element={<Listing mode="shop" />} />
                <Route path="/category/:slug" element={<Listing mode="category" />} />
                <Route path="/product/:slug" element={<Product />} />
                <Route path="/search" element={<Listing mode="search" />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/checkout" element={<CheckoutHandoff />} />
                <Route path="/order/:num" element={<Order />} />
                <Route path="/account" element={<Account />} />
                <Route path="/account/login" element={<Login />} />
                <Route path="/account/register" element={<Register />} />
                <Route path="/terms" element={<Policy slug="terms" />} />
                <Route path="/privacy" element={<Policy slug="privacy" />} />
                <Route path="/returns" element={<Policy slug="returns" />} />
                <Route path="/delivery" element={<Policy slug="delivery" />} />
                <Route path="/click-collect" element={<Policy slug="click-collect" />} />
                <Route path="/flybuys" element={<Policy slug="flybuys" />} />
                <Route path="/cookies" element={<Policy slug="cookies" />} />
                <Route path="/accessibility" element={<Policy slug="accessibility" />} />
                <Route path="/contact" element={<Policy slug="contact" />} />
                <Route path="/stores" element={<Stores />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </main>
            <Footer />
            <PromoPopup />
            <MobileTabs />
          </AuthProvider>
        </CartProvider>
      </StoreProvider>
    </ToastProvider>
  );
}
