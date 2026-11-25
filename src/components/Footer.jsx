import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from './Icon.jsx';

const COLUMNS = [
  {
    title: 'Shop',
    links: [
      ['Shop all products', '/shop'],
      ['Weekly specials', '/shop?filter=special'],
      ['Fruit & Veg', '/shop?dept=fruit-veg'],
      ['Meat & Seafood', '/shop?dept=meat-seafood'],
      ['Bakery', '/shop?dept=bakery'],
      ['Household', '/shop?dept=household']
    ]
  },
  {
    title: 'Customer service',
    links: [
      ['Delivery information', '/delivery'],
      ['Click & Collect', '/click-collect'],
      ['Returns & refunds', '/returns'],
      ['Contact us', '/contact'],
      ['Store locator', '/stores'],
      ['Accessibility', '/accessibility']
    ]
  },
  {
    title: 'About Coles',
    links: [
      ['Our ranges', '/shop'],
      ['Flybuys', '/flybuys'],
      ['Weekly catalogue', '/shop?filter=special'],
      ['Careers', '/contact'],
      ['Supplier information', '/contact'],
      ['Media centre', '/contact']
    ]
  },
  {
    title: 'Legal',
    links: [
      ['Terms of Use', '/terms'],
      ['Privacy Policy', '/privacy'],
      ['Cookie Notice', '/cookies'],
      ['Refund Policy', '/returns'],
      ['Delivery terms', '/delivery'],
      ['Recalls', '/contact']
    ]
  }
];

export default function Footer() {
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);

  return (
    <footer className="sitefooter">
      <div className="footer-trust">
        <div className="container footer-trust-inner">
          <div><Icon name="truck" size={26} /><b>Free delivery over $50</b><span>No membership needed</span></div>
          <div><Icon name="clock" size={26} /><b>Same-day delivery</b><span>Order before 2pm</span></div>
          <div><Icon name="store" size={26} /><b>Free Click &amp; Collect</b><span>Ready in 2 hours</span></div>
          <div><Icon name="shield" size={26} /><b>Secure checkout</b><span>256-bit encryption</span></div>
        </div>
      </div>

      <div className="container footer-main">
        <div className="footer-brand">
          <img src="/img/brand/logo.svg" alt="Coles" width="120" height="44" />
          <p>Fresh food, everyday needs and 1,000+ weekly specials — delivered to your door or ready to collect.</p>

          <form
            className="footer-news"
            onSubmit={(e) => {
              e.preventDefault();
              if (email.trim()) setDone(true);
            }}
          >
            <label htmlFor="footer-email">Get weekly specials by email</label>
            <div>
              <input
                id="footer-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                required
              />
              <button type="submit">Sign up</button>
            </div>
            {done ? <small className="footer-news-done">You are on the list. Offers arrive on Wednesdays.</small> : null}
          </form>
        </div>

        <div className="footer-cols">
          {COLUMNS.map((col) => (
            <div key={col.title} className="footer-col">
              <p>{col.title}</p>
              <ul>
                {col.links.map(([label, to]) => (
                  <li key={label + to}>
                    <Link to={to}>{label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="container footer-bottom">
        <div className="payrow" aria-label="Accepted payment methods">
          <span className="pay pay-visa">VISA</span>
          <span className="pay pay-mc"><i /><i /></span>
          <span className="pay pay-amex">AMEX</span>
          <span className="pay pay-apple"> Pay</span>
          <span className="pay pay-paypal">PayPal</span>
        </div>
        <p className="footer-legal">
          © {new Date().getFullYear()} Coles Online · Prices in AUD and include GST · Free delivery on orders over $50 ·
          Same-day delivery available in metro areas · Free Click &amp; Collect at 800+ stores.
        </p>
        <p className="footer-links">
          <Link to="/terms">Terms of Use</Link>
          <Link to="/privacy">Privacy</Link>
          <Link to="/cookies">Cookies</Link>
          <Link to="/returns">Refunds</Link>
          <Link to="/accessibility">Accessibility</Link>
        </p>
      </div>
    </footer>
  );
}
