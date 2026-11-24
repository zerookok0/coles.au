import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import QtyStepper from '../components/QtyStepper.jsx';
import Icon from '../components/Icon.jsx';
import { money } from '../data/catalog.js';
import { useCart } from '../state/index.jsx';
import { SITE } from '../config.js';

export default function Cart() {
  const { items, count, subtotal, savings, deliveryFee, total, setQty, remove } = useCart();
  const navigate = useNavigate();

  const toFree = Math.max(0, SITE.freeDeliveryThreshold - subtotal);
  const progress = Math.min(100, Math.round((subtotal / SITE.freeDeliveryThreshold) * 100));

  if (items.length === 0) {
    return (
      <div className="container cartpage">
        <h1>Your cart</h1>
        <div className="empty">
          <Icon name="cart" size={40} />
          <h2>Your cart is empty</h2>
          <p>Add a few favourites and we will have them at your door today.</p>
          <Link to="/shop" className="btn btn-primary">Start shopping</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container cartpage">
      <h1>
        Your cart <span className="cartpage-count">{count} {count === 1 ? 'item' : 'items'}</span>
      </h1>

      <div className="cartprog">
        <div className="cartprog-head">
          {toFree > 0 ? (
            <p>
              Add <b>{money(toFree)}</b> more for <b>free delivery</b>
            </p>
          ) : (
            <p>
              <b>Free delivery unlocked</b> &mdash; same-day delivery available today
            </p>
          )}
          <span>{progress}%</span>
        </div>
        <div className="cartprog-track"><i style={{ width: `${progress}%` }} /></div>
      </div>

      <div className="cartgrid">
        <section className="cartitems" aria-label="Cart items">
          <ul>
            {items.map(({ product, qty, lineTotal }) => (
              <li key={product.id} className="cartitem">
                <Link to={`/product/${product.slug}`} className="cartitem-img">
                  <img src={product.images[0]} alt={product.name} width="600" height="600" />
                </Link>
                <div className="cartitem-body">
                  <span className="cartitem-brand">{product.brand}</span>
                  <Link to={`/product/${product.slug}`} className="cartitem-name">
                    {product.name}
                  </Link>
                  <span className="cartitem-meta">{product.size} - {product.unit}</span>
                  {product.was ? (
                    <span className="cartitem-save">Save {money((product.was - product.price) * qty)}</span>
                  ) : null}
                  <div className="cartitem-controls">
                    <QtyStepper
                      value={qty}
                      onChange={(next) => setQty(product.id, next)}
                      max={99}
                      size="sm"
                      label={`Quantity for ${product.name}`}
                    />
                    <button type="button" className="linkbtn" onClick={() => remove(product.id)}>
                      <Icon name="trash" size={16} />
                      Remove
                    </button>
                  </div>
                </div>
                <div className="cartitem-price">
                  <b>{money(lineTotal)}</b>
                  <span>{money(product.price)} each</span>
                </div>
              </li>
            ))}
          </ul>

          <Link to="/shop" className="btn btn-ghost cart-continue">
            Continue shopping
          </Link>
        </section>

        <aside className="cartsummary" aria-label="Order summary">
          <h2>Order summary</h2>
          <dl>
            <div><dt>Subtotal ({count} {count === 1 ? 'item' : 'items'})</dt><dd>{money(subtotal)}</dd></div>
            {savings > 0 ? <div><dt>You save</dt><dd className="is-save">-{money(savings)}</dd></div> : null}
            <div>
              <dt>Delivery</dt>
              <dd>{deliveryFee === 0 ? 'Free' : money(deliveryFee)}</dd>
            </div>
            <div className="grand"><dt>Total</dt><dd>{money(total)}</dd></div>
          </dl>

          <button type="button" className="btn btn-primary btn-lg btn-block" onClick={() => navigate('/checkout')}>
            Go to checkout
          </button>

          <ul className="cartperks">
            <li><Icon name="truck" size={16} />Free delivery over {money(SITE.freeDeliveryThreshold)}</li>
            <li><Icon name="clock" size={16} />Same-day delivery before 2pm</li>
            <li><Icon name="store" size={16} />Free Click &amp; Collect in 2 hours</li>
            <li><Icon name="card" size={16} />Visa, Mastercard and Amex accepted</li>
          </ul>
        </aside>
      </div>
    </div>
  );
}
