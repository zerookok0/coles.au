import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import Carousel from '../components/Carousel.jsx';
import ProductCard from '../components/ProductCard.jsx';
import { ProductRail } from '../components/Layout.jsx';
import Icon from '../components/Icon.jsx';
import {
  BESTSELLERS,
  CATEGORIES,
  CATALOG_SIZE,
  DEPARTMENTS,
  PRODUCTS,
  SPECIALS,
  getDepartment,
  money,
  productsInDepartment
} from '../data/catalog.js';
import { SITE, PROMO } from '../config.js';

const FRESH_DEPTS = ['fruit-veg', 'meat-seafood', 'bakery', 'dairy-eggs', 'frozen', 'drinks'];

export default function Home() {
  const specialsRail = useMemo(() => SPECIALS.slice(0, 14), []);
  const popular = useMemo(() => [...PRODUCTS].sort((a, b) => b.reviewCount - a.reviewCount).slice(0, 14), []);

  const fresh = useMemo(() => {
    return FRESH_DEPTS.map((id) => {
      const dept = getDepartment(id);
      const items = productsInDepartment(id).slice(0, 4);
      if (!dept || items.length === 0) return null;
      return {
        dept,
        items,
        count: dept.count,
        from: Math.min(...items.map((p) => p.price))
      };
    }).filter(Boolean);
  }, []);

  const promoPicks = useMemo(() => {
    const pantry = PRODUCTS.find((p) => p.dept === 'pantry' && p.images && p.images.length);
    const fruit = PRODUCTS.find((p) => p.dept === 'fruit-veg' && p.images && p.images.length);
    return { pantry, fruit };
  }, []);

  const missionArt = useMemo(() => PRODUCTS.slice(0, 3), []);
  const promoProgress = 0;
  const toGo = 10000;

  return (
    <div className="home">
      <div className="container">
        <Carousel onBrowse={() => { window.location.href = '/shop?filter=special'; }} />

        <section className="quicktiles" aria-label="Service highlights">
          <Link to="/delivery" className="quicktile">
            <Icon name="truck" size={26} />
            <b>Free delivery</b>
            <span>on orders over $50</span>
          </Link>
          <Link to="/delivery" className="quicktile">
            <Icon name="clock" size={26} />
            <b>Same-day delivery</b>
            <span>order before 2pm</span>
          </Link>
          <Link to="/click-collect" className="quicktile">
            <Icon name="store" size={26} />
            <b>Click &amp; Collect</b>
            <span>ready in 2 hours</span>
          </Link>
          <Link to="/shop?filter=special" className="quicktile">
            <Icon name="tag" size={26} />
            <b>{SPECIALS.length.toLocaleString()} specials</b>
            <span>this week only</span>
          </Link>
        </section>

        <section className="catgrid" aria-label="Shop by department">
          <div className="section-head">
            <h2>Shop by department</h2>
            <Link to="/shop" className="section-link">
              All {CATEGORIES.length} categories
              <Icon name="chevron" size={14} />
            </Link>
          </div>
          <div className="catgrid-inner">
            {DEPARTMENTS.map((d) => (
              <Link key={d.id} to={`/shop?dept=${d.id}`} className="cattile">
                <img
                  src={d.image}
                  alt=""
                  width="400"
                  height="400"
                  loading="lazy"
                  onError={(e) => {
                    if (!e.currentTarget.dataset.fallback) {
                      e.currentTarget.dataset.fallback = '1';
                      e.currentTarget.src = '/img/placeholder.svg';
                    }
                  }}
                />
                <span>
                  <b>{d.name}</b>
                  <small>{d.count.toLocaleString()} products</small>
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className="mission" aria-label="Weekly reward">
          <div className="mission-copy">
            <span className="mission-kicker">Weekly reward</span>
            <h2>Spend $100 and get $10 off your next shop</h2>
            <p>
              Add <b>{money(toGo)}</b> to your cart to unlock the $10 reward — it applies automatically at checkout.
            </p>
            <div className="mission-bar">
              <i style={{ width: `${promoProgress}%` }} />
            </div>
            <div className="mission-meta">
              <span>{promoProgress}% complete</span>
              <span>Free delivery over {money(SITE.freeDeliveryThreshold)}</span>
            </div>
            <Link to="/shop" className="btn btn-primary">
              Keep shopping
            </Link>
          </div>
          <div className="mission-art">
            {missionArt.map((p) => (
              <img
                key={p.id}
                src={p.image}
                alt=""
                width="600"
                height="600"
                loading="lazy"
                onError={(e) => {
                  if (!e.currentTarget.dataset.fallback) {
                    e.currentTarget.dataset.fallback = '1';
                    e.currentTarget.src = '/img/placeholder.svg';
                  }
                }}
              />
            ))}
          </div>
        </section>

        <ProductRail
          title="Down Down — prices locked"
          subtitle="Hundreds of everyday items at permanently lower prices"
          viewAllTo="/shop?filter=special"
          products={specialsRail}
          renderCard={(p) => <ProductCard key={p.id} product={p} />}
        />

        <section className="duo">
          <Link to="/shop?dept=pantry" className="duo-card duo-red">
            <div>
              <span className="duo-kicker">Pantry stock up</span>
              <h3>Save up to 40% on big brands</h3>
              <p>Pasta, cereal, sauces and snacks — all in one shop.</p>
              <span className="duo-cta">Shop pantry →</span>
            </div>
            {promoPicks.pantry ? <img src={promoPicks.pantry.image} alt="" loading="lazy" /> : null}
          </Link>

          <Link to="/shop?dept=fruit-veg" className="duo-card duo-green">
            <div>
              <span className="duo-kicker">Fresh &amp; local</span>
              <h3>Fruit and veg picked this week</h3>
              <p>Australian grown, delivered fresh or ready to collect.</p>
              <span className="duo-cta">Shop fresh →</span>
            </div>
            {promoPicks.fruit ? <img src={promoPicks.fruit.image} alt="" loading="lazy" /> : null}
          </Link>
        </section>

        <ProductRail
          title="Most popular this week"
          subtitle={`Loved by shoppers across ${CATALOG_SIZE.toLocaleString()} products in store`}
          viewAllTo="/shop"
          products={popular}
          renderCard={(p) => <ProductCard key={p.id} product={p} />}
        />

        <section className="freshrow" aria-label="Fresh categories">
          {fresh.map(({ dept, items, count, from }) => (
            <Link key={dept.id} to={`/shop?dept=${dept.id}`} className="freshcard">
              <div className="freshcard-media">
                {items.slice(0, 3).map((p) => (
                  <img key={p.id} src={p.image} alt="" loading="lazy" />
                ))}
              </div>
              <b>{dept.name}</b>
              <span>
                {count.toLocaleString()} products from {money(from)}
              </span>
            </Link>
          ))}
        </section>

        <ProductRail
          title="Bestsellers you can trust"
          subtitle="Top rated by thousands of Coles shoppers"
          viewAllTo="/shop"
          products={BESTSELLERS.slice(0, 14)}
          renderCard={(p) => <ProductCard key={p.id} product={p} />}
        />

        <section className="promo-strip">
          <div>
            <h2>{PROMO.headline}</h2>
            <p>
              Free delivery over {money(SITE.freeDeliveryThreshold)} · Same-day delivery · Free Click &amp; Collect in 2
              hours
            </p>
          </div>
          <Link to="/shop?filter=special" className="btn btn-light">
            Shop the specials
          </Link>
        </section>

        <section className="benefits">
          <div>
            <Icon name="truck" size={30} />
            <b>Free delivery over {money(SITE.freeDeliveryThreshold)}</b>
            <p>Flat $5 delivery under the threshold. No membership, no minimum basket tricks.</p>
          </div>
          <div>
            <Icon name="clock" size={30} />
            <b>Same-day delivery</b>
            <p>Order before 2pm and choose an evening window. We text you when the driver is close.</p>
          </div>
          <div>
            <Icon name="store" size={30} />
            <b>Free Click &amp; Collect</b>
            <p>Ready in two hours at 800+ stores, with chilled and frozen items kept cold until pickup.</p>
          </div>
          <div>
            <Icon name="shield" size={30} />
            <b>Secure card payment</b>
            <p>Card details are encrypted end to end. No cash on delivery, no stored card numbers.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
