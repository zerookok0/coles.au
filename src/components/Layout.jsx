import React from 'react';
import { Link } from 'react-router-dom';
import Icon from './Icon.jsx';

export function Breadcrumbs({ items = [] }) {
  return (
    <nav className="crumbs" aria-label="Breadcrumb">
      <Link to="/">Home</Link>
      {items.map((item, i) => (
        <span key={`${item.label}-${i}`}>
          <Icon name="chevron" size={12} />
          {item.to ? <Link to={item.to}>{item.label}</Link> : <b>{item.label}</b>}
        </span>
      ))}
    </nav>
  );
}

export function ProductRail({ title, subtitle, products, viewAllTo, renderCard }) {
  return (
    <section className="rail">
      <div className="rail-head">
        <div>
          <h2>{title}</h2>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        {viewAllTo ? (
          <Link to={viewAllTo} className="rail-more">
            View all
            <Icon name="chevron" size={14} />
          </Link>
        ) : null}
      </div>
      <div className="rail-track">{products.map((p) => renderCard(p))}</div>
    </section>
  );
}
