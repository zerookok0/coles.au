import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import { money } from '../data/catalog.js';
import { listOrders, useAuth, useToast } from '../state/index.jsx';

export default function Account() {
  const { user, logout } = useAuth();
  const { pushToast } = useToast();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    setOrders(listOrders());
  }, []);

  if (!user) {
    return (
      <div className="container empty">
        <Icon name="user" size={40} />
        <h1>You are not signed in</h1>
        <p>Sign in to see your orders, saved addresses and Flybuys points.</p>
        <div className="empty-actions">
          <Link to="/account/login" className="btn btn-primary">Sign in</Link>
          <Link to="/account/register" className="btn btn-outline">Create an account</Link>
        </div>
      </div>
    );
  }

  function handleLogout() {
    logout();
    pushToast('You have been signed out.');
    navigate('/');
  }

  return (
    <div className="container accountpage">
      <div className="account-head">
        <div>
          <p className="account-eyebrow">My account</p>
          <h1>Hi, {user.name.split(' ')[0]}</h1>
          <p className="account-email">{user.email}</p>
        </div>
        <button type="button" className="btn btn-outline" onClick={handleLogout}>
          Sign out
        </button>
      </div>

      <div className="account-grid">
        <section className="account-card">
          <h2>Recent orders</h2>
          {orders.length === 0 ? (
            <p className="account-empty">No orders yet. Your first shop is a click away.</p>
          ) : (
            <ul className="orderlist">
              {orders.map((o) => (
                <li key={o.order_number}>
                  <div className="orderlist-head">
                    <b>{o.order_number}</b>
                    <span>{new Date(o.createdAt).toLocaleString('en-AU')}</span>
                  </div>
                  <div className="orderlist-body">
                    <span>{o.items.reduce((n, i) => n + i.qty, 0)} items</span>
                    <span>{o.method === 'collect' ? 'Click & Collect' : 'Delivery'}</span>
                    <b>{money(o.total)}</b>
                  </div>
                  <Link to={`/order/${o.order_number}`} className="orderlist-link">
                    View order
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link to="/shop" className="btn btn-primary">Start a new shop</Link>
        </section>

        <aside className="account-side">
          <div className="account-card">
            <h2>Delivery details</h2>
            <p className="account-muted">Default address</p>
            <p>
              {orders[0]?.customer?.addr || '12 Harbour Street'}
              <br />
              {[orders[0]?.customer?.city || 'Sydney', orders[0]?.customer?.state || 'NSW', orders[0]?.customer?.zip || '2000']
                .filter(Boolean)
                .join(' ')}
              <br />
              {orders[0]?.customer?.country || 'AU'}
            </p>
            <p className="account-muted">Contact</p>
            <p>
              {orders[0]?.customer?.phone || 'No phone supplied'}
              <br />
              {orders[0]?.customer?.email || user.email}
            </p>
            <p className="account-muted">Fulfilment</p>
            <p>Delivery over $50 is free · Click &amp; Collect is always free</p>
          </div>

          <div className="account-card">
            <h2>Flybuys</h2>
            <p className="account-muted">Linked card</p>
            <p>6014 •••• •••• 8821</p>
            <p className="account-muted">Points this year</p>
            <p>
              <b>{(orders.length * 137).toLocaleString()} points</b> · worth {money(orders.length * 137 * 0.5)}
            </p>
          </div>

          <div className="account-card account-links">
            <h2>Quick links</h2>
            <Link to="/cart">Your cart</Link>
            <Link to="/returns">Returns &amp; refunds</Link>
            <Link to="/delivery">Delivery information</Link>
            <Link to="/contact">Contact support</Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
