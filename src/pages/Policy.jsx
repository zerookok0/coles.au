import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { Breadcrumbs } from '../components/Layout.jsx';
import { POLICY_PAGES } from '../data/content.js';

export function Policy({ slug }) {
  const page = POLICY_PAGES[slug] || POLICY_PAGES.terms;

  return (
    <div className="container policy">
      <Breadcrumbs items={[{ label: page.title }]} />
      <h1>{page.title}</h1>
      <p className="policy-updated">Last updated {page.updated}</p>

      <div className="policy-body">
        {page.sections.map(([heading, body], i) => (
          <section key={heading}>
            <h2>
              {i + 1}. {heading}
            </h2>
            <p>{body}</p>
          </section>
        ))}
      </div>

      <div className="policy-foot">
        <p>
          Questions about this policy? <Link to="/contact">Contact customer service</Link> or call 1800 061 562, 7am –
          11pm AEDT, seven days a week.
        </p>
        <div className="policy-links">
          <Link to="/terms">Terms</Link>
          <Link to="/privacy">Privacy</Link>
          <Link to="/cookies">Cookies</Link>
          <Link to="/returns">Refunds</Link>
          <Link to="/delivery">Delivery</Link>
          <Link to="/click-collect">Click &amp; Collect</Link>
          <Link to="/flybuys">Flybuys</Link>
          <Link to="/accessibility">Accessibility</Link>
        </div>
      </div>
    </div>
  );
}

export function NotFound() {
  return (
    <div className="container empty notfound">
      <h1>Page not found</h1>
      <p>The page you were looking for has moved or no longer exists.</p>
      <div className="empty-actions">
        <Link to="/" className="btn btn-primary">Back to home</Link>
        <Link to="/shop" className="btn btn-outline">Browse products</Link>
      </div>
    </div>
  );
}

export default Policy;
