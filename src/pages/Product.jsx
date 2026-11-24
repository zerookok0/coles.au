import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Breadcrumbs } from '../components/Layout.jsx';
import ProductCard from '../components/ProductCard.jsx';
import QtyStepper from '../components/QtyStepper.jsx';
import Rating from '../components/Rating.jsx';
import StockBar from '../components/StockBar.jsx';
import Icon from '../components/Icon.jsx';
import {
  getCategory,
  getDepartment,
  getProductBySlug,
  money,
  relatedProducts
} from '../data/catalog.js';
import {
  descriptionFor,
  ingredientsFor,
  nutritionFor,
  ratingBreakdown,
  reviewsFor
} from '../data/content.js';
import { useCart, useToast } from '../state/index.jsx';
import { track } from '../fb.js';

const TABS = ['Description', 'Ingredients', 'Nutrition', 'Reviews'];

export default function Product() {
  const { slug } = useParams();
  const product = getProductBySlug(slug);
  const { add } = useCart();
  const { pushToast } = useToast();

  const [qty, setQty] = useState(1);
  const [imageIndex, setImageIndex] = useState(0);
  const [tab, setTab] = useState('Description');
  const [fulfilment, setFulfilment] = useState('delivery');
  const [reviewText, setReviewText] = useState('');
  const [reviewStars, setReviewStars] = useState(5);
  const [myReviews, setMyReviews] = useState([]);

  useEffect(() => {
    setImageIndex(0);
    setQty(1);
    setTab('Description');
    if (product) {
      track('ViewContent', {
        content_ids: [product.id],
        content_name: product.name,
        content_type: 'product',
        value: product.price / 100,
        currency: 'AUD'
      });
    }
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [slug, product]);

  if (!product) {
    return (
      <div className="container empty">
        <h1>Product not found</h1>
        <p>That product is no longer in this week&apos;s range.</p>
        <Link to="/shop" className="btn btn-primary">Browse all products</Link>
      </div>
    );
  }

  const category = getCategory(product.cat);
  const department = getDepartment(product.dept);
  const reviews = useMemo(() => [...myReviews, ...reviewsFor(product)], [product, myReviews]);
  const breakdown = useMemo(() => ratingBreakdown(product), [product]);
  const related = useMemo(() => relatedProducts(product, 10), [product]);
  const saving = product.was ? product.was - product.price : 0;
  const outOfStock = product.stock <= 0;
  const description = descriptionFor(product);
  const nutrition = nutritionFor(product);

  // Real Coles catalogues expose one hero photo per SKU, so the gallery shows
  // that photo at three magnifications (front / detail / close-up) instead of
  // inventing shots that do not exist.
  const views = useMemo(() => {
    const src = product.images[0];
    return [
      { src, mode: 'front', label: 'Front of pack' },
      { src, mode: 'zoom', label: 'Detail' },
      { src, mode: 'close', label: 'Close-up' }
    ];
  }, [product]);

  const fallback = (e) => {
    if (!e.currentTarget.dataset.fallback) {
      e.currentTarget.dataset.fallback = '1';
      e.currentTarget.src = '/img/placeholder.svg';
    }
  };

  function handleAdd() {
    if (outOfStock) return;
    add(product.id, qty);
    pushToast(`${qty} × ${product.name} added to cart`, { href: '/cart', label: 'View cart' });
    track('AddToCart', {
      value: (product.price * qty) / 100,
      currency: 'AUD',
      content_ids: [product.id],
      content_name: product.name,
      content_type: 'product',
      num_items: qty
    });
  }

  function submitReview(e) {
    e.preventDefault();
    if (!reviewText.trim()) return;
    setMyReviews((prev) => [
      {
        id: `local-${Date.now()}`,
        author: 'You',
        stars: reviewStars,
        title: 'Verified purchase',
        body: reviewText.trim(),
        date: new Date().toLocaleDateString('en-AU'),
        verified: true
      },
      ...prev
    ]);
    setReviewText('');
    pushToast('Thanks — your review has been published.');
  }

  return (
    <div className="container pdp">
      <Breadcrumbs
        items={[
          { label: 'Shop', to: '/shop' },
          department ? { label: department.name, to: `/shop?dept=${department.id}` } : null,
          category ? { label: category.name, to: `/category/${category.id}` } : null,
          { label: product.name }
        ].filter(Boolean)}
      />

      <div className="pdp-top">
        <div className="pdp-gallery">
          <div className="pdp-main-image">
            <img
              src={views[imageIndex].src}
              alt={`${product.name} — ${views[imageIndex].label}`}
              width="600"
              height="600"
              className={`pdp-shot is-${views[imageIndex].mode}`}
              onError={fallback}
            />
            {product.badge ? <span className="pdp-badge">{product.badge}</span> : null}
            {saving > 0 ? <span className="pdp-save">Save {money(saving)}</span> : null}
          </div>
          <div className="pdp-thumbs">
            {views.map((view, i) => (
              <button
                key={view.mode}
                type="button"
                className={i === imageIndex ? 'is-active' : ''}
                onClick={() => setImageIndex(i)}
                aria-label={view.label}
                title={view.label}
              >
                <img src={view.src} alt="" width="600" height="600" className={`pdp-shot is-${view.mode}`} onError={fallback} />
              </button>
            ))}
          </div>
        </div>

        <div className="pdp-info">
          <span className="pdp-brand">{product.brand}</span>
          <h1>{product.name}</h1>
          <p className="pdp-size">
            {product.size} · SKU {product.sku}
            {product.organic ? ' · Certified organic' : ''}
          </p>

          <a className="pdp-rating" href="#reviews">
            <Rating value={product.rating} count={product.reviewCount} size={16} />
            <span>Read {product.reviewCount.toLocaleString()} reviews</span>
          </a>

          <div className="pdp-price">
            <span className="pdp-price-now">{money(product.price)}</span>
            {product.was ? (
              <>
                <span className="pdp-price-was">{money(product.was)}</span>
                <span className="pdp-price-save">Save {money(saving)}</span>
              </>
            ) : null}
          </div>
          <span className="pdp-unit">{product.unit}</span>

          <StockBar stock={product.stock} maxStock={product.maxStock} />

          <div className="pdp-fulfil">
            <button
              type="button"
              className={fulfilment === 'delivery' ? 'is-active' : ''}
              onClick={() => setFulfilment('delivery')}
            >
              <Icon name="truck" size={20} />
              <span>
                <b>Delivery</b>
                <small>Today 4pm–7pm · free over $50</small>
              </span>
            </button>
            <button
              type="button"
              className={fulfilment === 'collect' ? 'is-active' : ''}
              onClick={() => setFulfilment('collect')}
            >
              <Icon name="store" size={20} />
              <span>
                <b>Click &amp; Collect</b>
                <small>Ready in 2 hours · free</small>
              </span>
            </button>
          </div>

          <div className="pdp-buy">
            <QtyStepper value={qty} onChange={setQty} max={Math.max(1, product.stock)} label="Quantity" />
            <button type="button" className="btn btn-primary btn-lg" onClick={handleAdd} disabled={outOfStock}>
              <Icon name="cart" size={20} />
              {outOfStock ? 'Out of stock' : 'Add to cart'}
            </button>
          </div>

          <div className="pdp-promo">
            <div className="pdp-promo-head">
              <b>Spend $100, save $10</b>
              <span>{money(product.price * qty)} of $100.00</span>
            </div>
            <div className="pdp-promo-track">
              <i style={{ width: `${Math.min(100, Math.round(((product.price * qty) / 10000) * 100))}%` }} />
            </div>
          </div>

          <ul className="pdp-points">
            <li><Icon name="truck" size={18} />Free delivery on orders over $50</li>
            <li><Icon name="clock" size={18} />Same-day delivery when you order before 2pm</li>
            <li><Icon name="store" size={18} />Free Click &amp; Collect from 800+ stores</li>
            <li><Icon name="refresh" size={18} />Freshness guarantee — refund or replace within 48 hours</li>
          </ul>
        </div>
      </div>

      <div className="pdp-tabs" id="reviews">
        <div className="tabbar" role="tablist">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              className={tab === t ? 'is-active' : ''}
              onClick={() => setTab(t)}
            >
              {t}
              {t === 'Reviews' ? <span className="tabcount">{reviews.length}</span> : null}
            </button>
          ))}
        </div>

        <div className="tabpanel">
          {tab === 'Description' ? (
            <div className="pdp-copy">
              {description.map((line, i) => (
                <p key={i}>{line}</p>
              ))}
              <h3>Why shoppers pick it</h3>
              <ul>
                <li>Great value at {money(product.price)} for {product.size}</li>
                <li>{product.unit}</li>
                <li>Rated {product.rating.toFixed(1)} by {product.reviewCount.toLocaleString()} shoppers</li>
                <li>Available for delivery today or collection in two hours</li>
              </ul>
            </div>
          ) : null}

          {tab === 'Ingredients' ? (
            <div className="pdp-copy">
              <h3>Ingredients</h3>
              <p>{ingredientsFor(product)}</p>
              <h3>Storage</h3>
              <p>Store in a cool, dry place away from direct sunlight. Once opened, refrigerate and use within 5 days.</p>
              <h3>Country of origin</h3>
              <p>Made in Australia from at least 90% Australian ingredients.</p>
            </div>
          ) : null}

          {tab === 'Nutrition' ? (
            <div className="pdp-copy">
              <h3>Nutrition information</h3>
              <table className="nutri">
                <tbody>
                  {nutrition.map((row) => (
                    <tr key={row.key}>
                      <th scope="row">{row.key}</th>
                      <td>{row.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="pdp-note">Quantities are averages per serve. Values may vary slightly by batch.</p>
            </div>
          ) : null}

          {tab === 'Reviews' ? (
            <div className="reviews">
              <div className="reviews-summary">
                <div className="reviews-score">
                  <b>{product.rating.toFixed(1)}</b>
                  <Rating value={product.rating} count={0} size={16} showCount={false} />
                  <span>{product.reviewCount.toLocaleString()} reviews</span>
                </div>
                <ul className="reviews-bars">
                  {breakdown.map((b) => (
                    <li key={b.star}>
                      <span>{b.star} star</span>
                      <div className="bar"><i style={{ width: `${b.pct}%` }} /></div>
                      <em>{b.pct}%</em>
                    </li>
                  ))}
                </ul>
              </div>

              <form className="review-form" onSubmit={submitReview}>
                <p className="review-form-title">Write a review</p>
                <div className="review-stars">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      className={n <= reviewStars ? 'is-on' : ''}
                      onClick={() => setReviewStars(n)}
                      aria-label={`${n} star`}
                    >
                      ★
                    </button>
                  ))}
                </div>
                <textarea
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder={`What did you think of ${product.name}?`}
                  rows={3}
                />
                <button type="submit" className="btn btn-outline">Publish review</button>
              </form>

              <ul className="reviews-list">
                {reviews.map((r) => (
                  <li key={r.id}>
                    <div className="review-head">
                      <b>{r.author}</b>
                      {r.verified ? <span className="review-verified">Verified purchase</span> : null}
                      <span className="review-date">{r.date}</span>
                    </div>
                    <Rating value={r.stars} count={0} size={13} showCount={false} />
                    <p className="review-title">{r.title}</p>
                    <p>{r.body}</p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>

      <section className="rail pdp-related">
        <div className="rail-head">
          <div>
            <h2>You may also like</h2>
            <p>More from {category ? category.name : 'this range'}</p>
          </div>
          <Link to={`/category/${product.cat}`} className="rail-more">
            View all
            <Icon name="chevron" size={14} />
          </Link>
        </div>
        <div className="rail-track">
          {related.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>
    </div>
  );
}
