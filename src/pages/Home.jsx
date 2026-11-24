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
  getCategory,
  money,
  productsInCategory
} from '../data/catalog.js';
import { SITE, PROMO } from '../config.js';
import { useCart } from '../state/index.jsx';

export default function Home() {
  const { subtotal, count } = useCart();

  const specialsRail = useMemo(() => SPECIALS.slice(0, 14), []);
  const popular = useMemo(
    () => [...PRODUCTS].sort((a, b) => b.reviewCount - a.reviewCount).slice(0, 14),
    []
  );
  const fresh = useMemo(() => {
    const ids = ['fruit', 'vegetables', 'beef', 'seafood', 'bread', 'milk'];
    return ids.map((id) => ({ cat: getCategory(id), items: productsInCategory(id).slice(0, 4) })).filter((x) => x.cat);
  }, []);

  const promoProgress = Math.min(100, Math.round((subtotal / 10000) * 100));
  const toGo = Math.max(0, 10000 - subtotal);

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
            <b>{SPECIALS.length} specials</b>
            <span>this week only</span>
          </Link>
        </section>

        <section className="catgrid" aria-label="Shop by category">
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
                <img src={d.image} alt="" width="400" height="400" loading="lazy" />
                <span>
                  <b>{d.name}</b>
                  <small>{d.count} products</small>
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className="mission" aria-label="Weekly savings progress">
          <div className="mission-copy">
            <span className="mission-kicker">Weekly reward</span>
            <h2>Spend $100 and get $10 off your next shop</h2>
            <p>
              You have spent <b>{money(subtotal)}</b>
              {toGo > 0 ? (
                <> — add <b>{money(toGo)}</b> to unlock the $10 reward.</>
              ) : (
                <> — reward unlocked. It will apply automatically at checkout.</>
              )}
            </p>
            <div className="mission-bar">
              <i style={{ width: `${promoProgress}%` }} />
            </div>
            <div className="mission-meta">
              <span>{promoProgress}% complete</span>
              <span>{count} items in cart</span>
            </div>
            <Link to="/shop" className="btn btn-primary">
              Keep shopping
            </Link>
          </div>
          <div className="mission-art">
            <img src={PRODUCTS[0].images[0]} alt="" width="600" height="600" />
            <img src={PRODUCTS[40].images[0]} alt="" width="600" height="600" />
            <img src={PRODUCTS[120].images[0]} alt="" width="600" height="600" />
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
            <img src={PRODUCTS.find((p) => p.cat === 'snacks').images[0]} alt="" loading="lazy" />
          </Link>

          <Link to="/shop?dept=fruit-veg" className="duo-card duo-green">
            <div>
              <span className="duo-kicker">Fresh &amp; local</span>
              <h3>Fruit and veg picked this week</h3>
              <p>Australian grown, delivered fresh or ready to collect.</p>
              <span className="duo-cta">Shop fresh →</span>
            </div>
            <img src={PRODUCTS.find((p) => p.cat === 'fruit').images[0]} alt="" loading="lazy" />
          </Link>
        </section>

        <ProductRail
          title="Most popular this week"
          subtitle={`Loved by shoppers across ${CATALOG_SIZE} products in store`}
          viewAllTo="/shop"
          products={popular}
          renderCard={(p) => <ProductCard key={p.id} product={p} />}
        />

        <section className="freshrow" aria-label="Fresh categories">
          {fresh.map(({ cat, items }) => (
            <Link key={cat.id} to={`/category/${cat.id}`} className="freshcard">
              <div className="freshcard-media">
                {items.slice(0, 3).map((p) => (
                  <img key={p.id} src={p.images[0]} alt="" loading="lazy" />
                ))}
              </div>
              <b>{cat.name}</b>
              <span>{items.length * 6} products from {money(Math.min(...items.map((p) => p.price)))}</span>
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
