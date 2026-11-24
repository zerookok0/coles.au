import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { money } from '../data/catalog.js';
import { useCart, useToast } from '../state/index.jsx';
import { track } from '../fb.js';
import Icon from './Icon.jsx';
import Rating from './Rating.jsx';

export default function ProductCard({ product, compact = false }) {
  const { add } = useCart();
  const { pushToast } = useToast();
  const [added, setAdded] = useState(false);

  if (!product) return null;

  const saving = product.was ? product.was - product.price : 0;
  const outOfStock = product.stock <= 0;
  const lowStock = product.stock > 0 && product.stock <= 5;

  function handleAdd(e) {
    e.preventDefault();
    e.stopPropagation();
    if (outOfStock) return;
    add(product.id, 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 1400);
    pushToast(`${product.name} added to cart`, { href: '/cart', label: 'View cart' });
    track('AddToCart', {
      value: product.price / 100,
      currency: 'AUD',
      content_ids: [product.id],
      content_name: product.name,
      content_type: 'product'
    });
  }

  return (
    <article className={`card ${compact ? 'card-compact' : ''} ${outOfStock ? 'is-out' : ''}`}>
      <Link to={`/product/${product.slug}`} className="card-media" aria-label={product.name}>
        <img src={product.images[0]} alt={product.name} loading="lazy" width="600" height="600" />
        <span className="card-badges">
          {product.badge ? <span className={`badge badge-${product.badge.replace(/\s+/g, '').toLowerCase()}`}>{product.badge}</span> : null}
          {saving > 0 ? <span className="badge badge-save">Save {money(saving)}</span> : null}
        </span>
      </Link>

      <div className="card-body">
        <span className="card-brand">{product.brand}</span>
        <h3 className="card-title">
          <Link to={`/product/${product.slug}`}>{product.name}</Link>
        </h3>
        <span className="card-size">{product.size}</span>

        {!compact ? <Rating value={product.rating} count={product.reviewCount} size={13} /> : null}

        <div className="card-price-row">
          <span className="price">{money(product.price)}</span>
          {product.was ? <span className="price-was">{money(product.was)}</span> : null}
        </div>
        <span className="card-unit">{product.unit}</span>

        {outOfStock ? (
          <span className="card-stock is-out">Out of stock</span>
        ) : lowStock ? (
          <span className="card-stock is-low">Only {product.stock} left</span>
        ) : null}

        <button
          type="button"
          className={`btn-add ${added ? 'is-added' : ''}`}
          onClick={handleAdd}
          disabled={outOfStock}
          aria-label={`Add ${product.name} to cart`}
        >
          {added ? <Icon name="check" size={18} /> : <Icon name="plus" size={18} />}
          <span>{outOfStock ? 'Unavailable' : added ? 'Added' : 'Add'}</span>
        </button>
      </div>
    </article>
  );
}
