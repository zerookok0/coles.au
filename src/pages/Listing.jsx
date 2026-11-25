import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Breadcrumbs } from '../components/Layout.jsx';
import ProductCard from '../components/ProductCard.jsx';
import Icon from '../components/Icon.jsx';
import {
  CATEGORIES,
  DEPARTMENTS,
  PRODUCTS,
  getCategory,
  getDepartment,
  money,
  productsInCategory,
  productsInDepartment,
  searchProducts
} from '../data/catalog.js';

const PAGE_SIZE = 24;

export default function Listing({ mode = 'shop' }) {
  const { slug } = useParams();
  const [params, setParams] = useSearchParams();

  const q = params.get('q') || '';
  const dept = params.get('dept') || '';
  const filter = params.get('filter') || '';

  const [onlySpecial, setOnlySpecial] = useState(filter === 'special');
  const [sort, setSort] = useState('relevance');
  const [maxPrice, setMaxPrice] = useState(0);
  const [brand, setBrand] = useState('all');
  const [visible, setVisible] = useState(PAGE_SIZE);

  const category = mode === 'category' ? getCategory(slug) : null;
  const department = dept ? getDepartment(dept) : null;

  const base = useMemo(() => {
    if (filter === 'super') {
      return PRODUCTS.filter((p) => p.was && (p.was - p.price) / p.was >= 0.5);
    }
    if (mode === 'category' && category) return productsInCategory(category.id);
    if (mode === 'search') return searchProducts(q, { limit: 800 });
    if (department) return productsInDepartment(department.id);
    return PRODUCTS;
  }, [mode, category, q, department, filter]);

  const priceCeiling = useMemo(() => Math.max(500, ...base.map((p) => p.price)), [base]);

  useEffect(() => {
    setOnlySpecial(filter === 'special');
    setMaxPrice(0);
    setBrand('all');
    setVisible(PAGE_SIZE);
    if (filter === 'super') setSort('discount');
  }, [mode, slug, q, dept, filter]);

  const brands = useMemo(() => {
    const set = new Set(base.map((p) => p.brand));
    return Array.from(set).sort();
  }, [base]);

  const filtered = useMemo(() => {
    let list = base.filter((p) => (onlySpecial ? p.was && p.was > p.price : true));
    if (maxPrice > 0) list = list.filter((p) => p.price <= maxPrice);
    if (brand !== 'all') list = list.filter((p) => p.brand === brand);

    const sorted = [...list];
    if (sort === 'price-asc') sorted.sort((a, b) => a.price - b.price);
    else if (sort === 'price-desc') sorted.sort((a, b) => b.price - a.price);
    else if (sort === 'rating') sorted.sort((a, b) => b.rating - a.rating);
    else if (sort === 'name') sorted.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === 'discount') sorted.sort((a, b) => (b.was ? b.was - b.price : 0) - (a.was ? a.was - a.price : 0));
    return sorted;
  }, [base, onlySpecial, maxPrice, brand, sort]);

  const title = category
    ? category.name
    : department
      ? department.name
      : mode === 'search'
        ? `Search results for “${q}”`
        : filter === 'super'
          ? 'Super Specials'
          : filter === 'special'
            ? 'Weekly specials'
            : 'Shop all products';

  const crumbs = [{ label: 'Shop', to: '/shop' }];
  if (department) crumbs.push({ label: department.name, to: `/shop?dept=${department.id}` });
  if (category) {
    const d = getDepartment(category.dept);
    if (d) crumbs.splice(1, 0, { label: d.name, to: `/shop?dept=${d.id}` });
    crumbs.push({ label: category.name });
  }
  if (mode === 'search') crumbs.push({ label: 'Search' });

  const relatedCats = useMemo(() => {
    if (category) return CATEGORIES.filter((c) => c.dept === category.dept && c.id !== category.id).slice(0, 6);
    if (department) return CATEGORIES.filter((c) => c.dept === department.id).slice(0, 8);
    return CATEGORIES.slice(0, 8);
  }, [category, department]);

  return (
    <div className="container listing">
      <Breadcrumbs items={crumbs} />

      <header className="listing-head">
        <div>
          <h1>{title}</h1>
          <p>
            {filtered.length} products
            {onlySpecial ? ' on special' : ''}
            {department ? ` in ${department.name}` : ''}
            {' · '}free delivery over {money(5000)} · same-day delivery · free Click &amp; Collect
          </p>
        </div>
        <div className="listing-sort">
          <label>
            Sort by
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="relevance">Relevance</option>
              <option value="price-asc">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
              <option value="rating">Customer rating</option>
              <option value="discount">Biggest saving</option>
              <option value="name">Name A–Z</option>
            </select>
          </label>
        </div>
      </header>

      <div className="listing-body">
        <aside className="filters" aria-label="Filters">
          <div className="filter-block">
            <p className="filter-title">Departments</p>
            <ul className="filter-list">
              <li>
                <Link className={!dept && mode !== 'category' ? 'is-active' : ''} to="/shop">
                  All products
                </Link>
              </li>
              {DEPARTMENTS.map((d) => (
                <li key={d.id}>
                  <Link className={dept === d.id ? 'is-active' : ''} to={`/shop?dept=${d.id}`}>
                    {d.name}
                    <span>{d.count}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="filter-block">
            <p className="filter-title">Offers</p>
            <label className="filter-check">
              <input type="checkbox" checked={onlySpecial} onChange={(e) => setOnlySpecial(e.target.checked)} />
              On special only
            </label>
          </div>

          <div className="filter-block">
            <p className="filter-title">Max price</p>
            <input
              type="range"
              min="0"
              max={priceCeiling}
              step="50"
              value={maxPrice || priceCeiling}
              onChange={(e) => setMaxPrice(Number(e.target.value) === priceCeiling ? 0 : Number(e.target.value))}
              aria-label="Maximum price"
            />
            <p className="filter-value">Up to {money(maxPrice || priceCeiling)}</p>
          </div>

          <div className="filter-block">
            <p className="filter-title">Brand</p>
            <select value={brand} onChange={(e) => setBrand(e.target.value)} aria-label="Filter by brand">
              <option value="all">All brands</option>
              {brands.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-block">
            <p className="filter-title">Browse categories</p>
            <ul className="filter-list filter-cats">
              {relatedCats.map((c) => (
                <li key={c.id}>
                  <Link to={`/category/${c.id}`}>{c.name}</Link>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <div className="listing-results">
          {filtered.length === 0 ? (
            <div className="empty">
              <Icon name="search" size={34} />
              <h2>No products matched your search</h2>
              <p>Try a different spelling, or browse a department instead.</p>
              <Link to="/shop" className="btn btn-primary">
                Browse all products
              </Link>
            </div>
          ) : (
            <>
              <div className="productgrid">
                {filtered.slice(0, visible).map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>

              {visible < filtered.length ? (
                <div className="loadmore">
                  <button type="button" className="btn btn-outline" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
                    Load {Math.min(PAGE_SIZE, filtered.length - visible)} more products
                  </button>
                  <span>
                    Showing {Math.min(visible, filtered.length)} of {filtered.length}
                  </span>
                </div>
              ) : (
                <p className="listing-end">
                  You have reached the end of this range · {filtered.length} products
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
