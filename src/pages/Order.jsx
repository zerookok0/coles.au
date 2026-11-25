import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import { money } from '../data/catalog.js';
import { getOrder } from '../state/index.jsx';

export default function Order() {
  const { num } = useParams();
  const [order, setOrder] = useState(null);

  useEffect(() => {
    setOrder(getOrder(num));
    window.scrollTo({ top: 0 });
  }, [num]);

  return (
    <div className="container orderpage">
      <div className="orderhero">
        <span className="ordercheck"><Icon name="check" size={30} /></span>
        <h1>Thank you for your order</h1>
        <p>
          Order <b>{num}</b> is confirmed. We have emailed your receipt and will text you when your shopper starts
          packing.
        </p>
      </div>

      {order ? (
        <>
          <div className="ordersummary-grid">
            <section className="account-card">
              <h2>Order details</h2>
              <dl className="orderdl">
                <div><dt>Order number</dt><dd>{order.order_number}</dd></div>
                <div><dt>Placed</dt><dd>{new Date(order.createdAt).toLocaleString('en-AU')}</dd></div>
                <div><dt>Fulfilment</dt><dd>{order.method === 'collect' ? `Click & Collect · ${order.store}` : 'Delivery today, 4pm – 7pm'}</dd></div>
                <div><dt>Payment</dt><dd>Card · paid in full</dd></div>
                <div className="grand"><dt>Total paid</dt><dd>{money(order.total)}</dd></div>
              </dl>

              <h2 className="order-sub">Items</h2>
              <ul className="orderitems">
                {order.items.map((i) => (
                  <li key={i.id}>
                    <img src={i.image} alt="" width="600" height="600" />
                    <span>
                      <b>{i.name}</b>
                      <small>{i.size} · qty {i.qty}</small>
                    </span>
                    <em>{money(i.price * i.qty)}</em>
                  </li>
                ))}
              </ul>
            </section>

            <aside className="account-side">
              <div className="account-card">
                <h2>Delivering to</h2>
                <p>
                  {order.customer?.name}
                  <br />
                  {order.customer?.addr}
                  <br />
                  {[order.customer?.city, order.customer?.state, order.customer?.zip].filter(Boolean).join(' ')}
                  <br />
                  {order.customer?.country}
                </p>
                <p className="account-muted">Contact</p>
                <p>
                  {order.customer?.phone || 'Not provided'}
                  <br />
                  {order.customer?.email}
                </p>
                {order.customer?.notes ? (
                  <>
                    <p className="account-muted">Delivery instructions</p>
                    <p>{order.customer.notes}</p>
                  </>
                ) : null}
              </div>

              <div className="account-card">
                <h2>What happens next</h2>
                <ol className="ordersteps">
                  <li><b>Packing</b><span>We pick your order within 30 minutes</span></li>
                  <li><b>On the way</b><span>Driver SMS with a live tracking link</span></li>
                  <li><b>Delivered</b><span>Left at your door or handed over</span></li>
                </ol>
              </div>

              <div className="account-card account-links">
                <Link to="/shop">Continue shopping</Link>
                <Link to="/account">View my orders</Link>
                <Link to="/returns">Something wrong? Refunds</Link>
              </div>
            </aside>
          </div>
        </>
      ) : (
        <div className="ordersummary-grid">
          <section className="account-card">
            <h2>Order summary</h2>
            <p className="account-muted">
              This order was placed in another browser session, so the item list is not available here. Your confirmation
              email contains the full receipt.
            </p>
          </section>
          <aside className="account-side">
            <div className="account-card account-links">
              <Link to="/shop">Continue shopping</Link>
              <Link to="/account">View my orders</Link>
              <Link to="/contact">Contact support</Link>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
