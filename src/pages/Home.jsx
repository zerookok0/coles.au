import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard.jsx';
import Icon from '../components/Icon.jsx';
import { HOME, PRODUCTS, CATALOG_SIZE, getProduct, money } from '../data/catalog.js';
import { SITE } from '../config.js';

const IMG_FALLBACK = (e) => {
  if (!e.currentTarget.dataset.fallback) {
    e.currentTarget.dataset.fallback = '1';
    e.currentTarget.src = '/img/placeholder.svg';
  }
};

function Rail({ items }) {
  if (!items || !items.length) return null;
  return (
    <section className="railnav" aria-label="Shortcuts">
      <div className="railnav-track">
        {items.map((item) => (
          <Link key={item.title} to={item.href} className="railnav-item">
            <span className="railnav-circle">
              <img src={item.image} alt="" loading="lazy" onError={IMG_FALLBACK} />
            </span>
            <span className="railnav-label">{item.title}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function HeroBanner({ items }) {
  const [index, setIndex] = React.useState(0);
  const [paused, setPaused] = React.useState(false);

  React.useEffect(() => {
    if (!items || items.length < 2 || paused) return undefined;
    const t = setInterval(() => setIndex((i) => (i + 1) % items.length), 7000);
    return () => clearInterval(t);
  }, [items, paused]);

  if (!items || !items.length) return null;
  const hero = items[index];

  return (
    <section
      className={`bighero ${hero.bgImage ? 'has-photo' : ''}`}
      style={{ background: hero.bg }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
    >
      {hero.bgImage ? (
        <>
          <img className="bighero-bg" src={hero.bgImage} alt="" onError={IMG_FALLBACK} />
          <span className="bighero-scrim" aria-hidden="true" />
        </>
      ) : null}

      <div className="bighero-copy">
        <h2>{hero.title}</h2>
        {hero.description ? <p>{hero.description}</p> : null}
        <Link to={hero.ctaHref} className="bighero-cta">
          {hero.ctaLabel}
        </Link>
      </div>

      {!hero.bgImage ? (
        <div className="bighero-art" aria-hidden="true">
          {hero.products.slice(0, 3).map((src, i) => (
            <img key={src} src={src} alt="" className={`bighero-shot shot-${i + 1}`} loading="lazy" onError={IMG_FALLBACK} />
          ))}
        </div>
      ) : null}

      <div className="bighero-controls">
        <button type="button" aria-label="Pause" onClick={() => setPaused((p) => !p)}>
          {paused ? '▶' : '❙❙'}
        </button>
        <span className="bighero-dots">
          {items.map((h, i) => (
            <button
              key={h.title}
              type="button"
              aria-label={`Slide ${i + 1}`}
              className={i === index ? 'is-active' : ''}
              onClick={() => setIndex(i)}
            />
          ))}
        </span>
        <button type="button" aria-label="Next slide" onClick={() => setIndex((i) => (i + 1) % items.length)}>
          ›
        </button>
      </div>
    </section>
  );
}

export default function Home() {
  const home = HOME || {};
  const rows = home.rows || [];
  const quad = home.quadTiles || [];
  const cards = home.cards || [];

  const rowProducts = useMemo(() => {
    const ids = rows[0] ? rows[0].productIds : [];
    const resolved = ids.map((id) => getProduct(id)).filter(Boolean);
    return resolved.length ? resolved : PRODUCTS.filter((p) => p.was).slice(0, 12);
  }, [rows]);

  // Spread the "popular" rail across the whole catalogue instead of one aisle.
  const moreProducts = useMemo(() => {
    const step = Math.max(1, Math.floor(PRODUCTS.length / 14));
    const out = [];
    for (let i = 0; i < PRODUCTS.length && out.length < 14; i += step) out.push(PRODUCTS[i]);
    return out;
  }, []);

  return (
    <div className="home2">
      <div className="container">
        <Rail items={home.catRail} />
        <HeroBanner items={home.heroes} />

        <section className="qtiles" aria-label="More ways to save">
          {quad.map((q) => (
            <Link key={q.heading} to={q.href} className="qtile">
              {q.roundel ? <img className="qtile-roundel" src={q.roundel} alt="" loading="lazy" onError={IMG_FALLBACK} /> : null}
              <h3>{q.heading}</h3>
              <p>{q.description}</p>
              <span className="qtile-cta">{q.ctaLabel}</span>
              <img className="qtile-photo" src={q.photo} alt="" loading="lazy" onError={IMG_FALLBACK} />
            </Link>
          ))}
        </section>

        {rows[0] ? (
          <section className="frow">
            <div className="frow-head">
              <h2>{rows[0].heading}</h2>
              <Link to={rows[0].ctaHref} className="frow-more">
                {rows[0].ctaLabel}
                <Icon name="chevron" size={14} />
              </Link>
            </div>
            <div className="frow-track">
              {rowProducts.slice(0, 14).map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        ) : null}

        <section className="promocards" aria-label="Offers">
          {cards.slice(0, 5).map((c) => (
            <Link key={c.title} to={c.href} className="pcard">
              <div className="pcard-media">
                <img src={c.image} alt="" loading="lazy" onError={IMG_FALLBACK} />
                {c.savePercentage ? (
                  <span className="pcard-roundel">
                    <b>{c.savePercentage}%</b>
                    <small>off</small>
                  </span>
                ) : null}
              </div>
              <p className="pcard-title">{c.title}</p>
            </Link>
          ))}
        </section>

        {home.promo ? (
          <section
            className="hp-banner"
            style={{
              background: home.promo.image ? '#E00A12' : home.promo.bg || '#E00A12',
              backgroundImage: home.promo.image ? `url(${home.promo.image})` : undefined
            }}
          >
            <div className="hp-banner-copy">
              <h2>{home.promo.heading}</h2>
              <p>{home.promo.description}</p>
              <Link to={home.promo.href} className="hp-banner-cta">
                {home.promo.ctaLabel}
              </Link>
            </div>
          </section>
        ) : null}

        <section className="frow">
          <div className="frow-head">
            <h2>Popular this week</h2>
            <Link to="/shop" className="frow-more">
              View all
              <Icon name="chevron" size={14} />
            </Link>
          </div>
          <div className="frow-track">
            {moreProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>

        {home.recipes ? (
          <section className="recipes">
            <div className="frow-head">
              <h2>{home.recipes.heading}</h2>
              <Link to="/shop" className="frow-more">
                View all
                <Icon name="chevron" size={14} />
              </Link>
            </div>
            <div className="recipes-grid">
              {home.recipes.cards.map((r) => (
                <Link key={r.title} to="/shop" className="recipe">
                  <img src={r.image} alt="" loading="lazy" onError={IMG_FALLBACK} />
                  <b>{r.title}</b>
                  <span>{r.meta}</span>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {home.appBanner ? (
          <section className="appbanner">
            <div>
              <h2>{home.appBanner.heading}</h2>
              <p>{home.appBanner.description}</p>
              <Link to={home.appBanner.href} className="appbanner-cta">
                Get the app
              </Link>
            </div>
            {home.appBanner.image ? <img src={home.appBanner.image} alt="" loading="lazy" onError={IMG_FALLBACK} /> : null}
          </section>
        ) : null}

        <section className="benefits">
          <div>
            <Icon name="truck" size={30} />
            <b>Free delivery over {money(SITE.freeDeliveryThreshold)}</b>
            <p>Flat $5 delivery under the threshold. No membership needed.</p>
          </div>
          <div>
            <Icon name="clock" size={30} />
            <b>Same-day delivery</b>
            <p>Order before 2pm and choose an evening window.</p>
          </div>
          <div>
            <Icon name="store" size={30} />
            <b>Free Click &amp; Collect</b>
            <p>Ready in two hours at 800+ stores.</p>
          </div>
          <div>
            <Icon name="shield" size={30} />
            <b>{CATALOG_SIZE.toLocaleString()} products</b>
            <p>Live Coles range with this week&apos;s prices.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
