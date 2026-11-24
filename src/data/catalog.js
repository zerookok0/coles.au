/**
 * Catalog access layer.
 *
 * The catalog is a static JSON asset (/data/catalog.json, ~10k real Coles SKUs)
 * fetched before the app renders — see src/main.jsx. Keeping it out of the JS
 * bundle means the shell stays ~200 KB while the catalog streams as JSON that
 * Cloudflare compresses to roughly 500 KB.
 */

const DATA =
  (typeof window !== 'undefined' && window.__CATALOG__) || {
    departments: [],
    categories: [],
    products: [],
    heroes: []
  };

export const PRODUCTS = DATA.products || [];
export const CATEGORIES = DATA.categories || [];
export const DEPARTMENTS = DATA.departments || [];
export const HEROES = DATA.heroes || [];
export const HOME = DATA.home || null;

const productById = new Map(PRODUCTS.map((p) => [p.id, p]));
const productBySlug = new Map(PRODUCTS.map((p) => [p.slug, p]));
const categoryById = new Map(CATEGORIES.map((c) => [c.id, c]));
const departmentById = new Map(DEPARTMENTS.map((d) => [d.id, d]));

export const getProduct = (id) => productById.get(id) || null;
export const getProductBySlug = (slug) => productBySlug.get(slug) || null;
export const getCategory = (id) => categoryById.get(id) || null;
export const getDepartment = (id) => departmentById.get(id) || null;

export const money = (cents) => `A$${(cents / 100).toFixed(2)}`;

const byCategory = new Map();
const byDepartment = new Map();
for (const p of PRODUCTS) {
  if (!byCategory.has(p.cat)) byCategory.set(p.cat, []);
  byCategory.get(p.cat).push(p);
  if (!byDepartment.has(p.dept)) byDepartment.set(p.dept, []);
  byDepartment.get(p.dept).push(p);
}

export const productsInCategory = (categoryId) => byCategory.get(categoryId) || [];
export const productsInDepartment = (deptId) => byDepartment.get(deptId) || [];

export const SPECIALS = PRODUCTS.filter((p) => p.was && p.was > p.price);
export const BESTSELLERS = PRODUCTS.filter((p) => p.badge === 'Bestseller');

export const POPULAR_SEARCHES = [
  'milk',
  'bread',
  'bananas',
  'chicken breast',
  'eggs',
  'coffee',
  'ice cream',
  'toilet tissue',
  'dog food',
  'pasta'
];

/** Score-and-filter search over the real catalog (name, brand, category, department). */
export function searchProducts(query, { limit = 60 } = {}) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return [];
  const terms = q.split(/\s+/).filter(Boolean);
  const scored = [];

  for (const p of PRODUCTS) {
    const cat = categoryById.get(p.cat);
    const dept = departmentById.get(p.dept);
    const name = p.name.toLowerCase();
    const haystack = `${name} ${p.brand.toLowerCase()} ${p.size.toLowerCase()} ${
      cat ? cat.name.toLowerCase() : ''
    } ${dept ? dept.name.toLowerCase() : ''}`;

    let score = 0;
    let matchedAll = true;

    for (const t of terms) {
      if (!haystack.includes(t)) {
        matchedAll = false;
        break;
      }
      score += name.includes(t) ? 12 : 0;
      score += p.brand.toLowerCase().includes(t) ? 6 : 0;
      if (name.startsWith(t)) score += 10;
      if (cat && cat.name.toLowerCase().includes(t)) score += 3;
    }

    if (!matchedAll) continue;
    if (p.badge === 'Bestseller') score += 2;
    if (p.was) score += 1;
    scored.push({ p, score });
  }

  scored.sort((a, b) => b.score - a.score || b.p.reviewCount - a.p.reviewCount);
  return scored.slice(0, limit).map((s) => s.p);
}

/** Cheap "you may also like" — same category first, then same department. */
export function relatedProducts(product, limit = 8) {
  if (!product) return [];
  const sameCat = (byCategory.get(product.cat) || []).filter((p) => p.id !== product.id);
  const sameDept = (byDepartment.get(product.dept) || []).filter((p) => p.cat !== product.cat);
  return [...sameCat.slice(0, limit), ...sameDept].slice(0, limit);
}

export const CATALOG_SIZE = PRODUCTS.length;
