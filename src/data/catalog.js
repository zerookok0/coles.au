import raw from './catalog.json';

export const DEPARTMENTS = raw.departments;
export const CATEGORIES = raw.categories;
export const PRODUCTS = raw.products;
export const HEROES = raw.heroes;

const productById = new Map(PRODUCTS.map((p) => [p.id, p]));
const productBySlug = new Map(PRODUCTS.map((p) => [p.slug, p]));
const categoryById = new Map(CATEGORIES.map((c) => [c.id, c]));
const departmentById = new Map(DEPARTMENTS.map((d) => [d.id, d]));

export const getProduct = (id) => productById.get(id) || null;
export const getProductBySlug = (slug) => productBySlug.get(slug) || null;
export const getCategory = (id) => categoryById.get(id) || null;
export const getDepartment = (id) => departmentById.get(id) || null;

export const money = (cents) => `A$${(cents / 100).toFixed(2)}`;

export const productsInCategory = (categoryId) => PRODUCTS.filter((p) => p.cat === categoryId);
export const productsInDepartment = (deptId) => PRODUCTS.filter((p) => p.dept === deptId);

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

/** Score-and-filter search over the local catalog (name, brand, category, department). */
export function searchProducts(query, { limit = 60 } = {}) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return [];
  const terms = q.split(/\s+/).filter(Boolean);
  const scored = [];

  for (const p of PRODUCTS) {
    const cat = categoryById.get(p.cat);
    const dept = departmentById.get(p.dept);
    const haystack = [
      p.name.toLowerCase(),
      p.brand.toLowerCase(),
      p.size.toLowerCase(),
      cat ? cat.name.toLowerCase() : '',
      dept ? dept.name.toLowerCase() : ''
    ].join(' ');

    let score = 0;
    let matchedAll = true;

    for (const t of terms) {
      const inName = p.name.toLowerCase().includes(t);
      const inBrand = p.brand.toLowerCase().includes(t);
      const inCat = cat ? cat.name.toLowerCase().includes(t) : false;
      if (!haystack.includes(t)) { matchedAll = false; break; }
      score += inName ? 12 : 0;
      score += inBrand ? 6 : 0;
      score += inCat ? 3 : 0;
      if (p.name.toLowerCase().startsWith(t)) score += 10;
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
  const sameCat = PRODUCTS.filter((p) => p.cat === product.cat && p.id !== product.id);
  const sameDept = PRODUCTS.filter((p) => p.dept === product.dept && p.cat !== product.cat);
  return [...sameCat.slice(0, limit), ...sameDept].slice(0, limit);
}

export const CATALOG_SIZE = PRODUCTS.length;
