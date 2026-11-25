/**
 * Deterministic on-the-fly content (reviews, copy, nutrition).
 * Keeping this out of catalog.json keeps the bundle small — every value is a
 * pure function of the product, so it never changes between renders.
 */
import { getCategory, getDepartment } from './catalog.js';

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed) {
  let a = seed || 1;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const AUTHORS = [
  'Sarah M.', 'Jason T.', 'Priya K.', 'Daniel W.', 'Emma R.', 'Michael B.', 'Chloe L.',
  'Nathan H.', 'Olivia P.', 'Josh D.', 'Rebecca S.', 'Tom A.', 'Aisha N.', 'Grace C.',
  'Peter F.', 'Melissa G.', 'Ryan O.', 'Hannah V.', 'Chris E.', 'Layla Z.'
];

const TITLES_HIGH = ['Great value', 'Family favourite', 'Will buy again', 'Excellent quality', 'Perfect every time', 'Better than expected'];
const TITLES_MID = ['Does the job', 'Good for the price', 'Pretty good', 'Solid pick', 'Fine, nothing special'];
const TITLES_LOW = ['Not for me', 'A bit disappointing', 'Expected more', 'Packaging issue'];

const BODY_HIGH = [
  'Picked this up on the weekly shop and it has become a staple in our house. Quality has been consistent every time.',
  'Really happy with this. The size is generous for the price and it arrived in perfect condition.',
  'Bought it for the kids and they loved it. Adding it to the regular order for sure.',
  'Fantastic value, especially with the current special. Stocked up while it is discounted.',
  'Delivery was same day and everything was fresh. This one is a repeat buy for us.'
];

const BODY_MID = [
  'Decent product, matches the description. Nothing wow but no complaints either.',
  'Good enough for the price point. I would probably buy it again if it is on special.',
  'The flavour is fine, though I would prefer a slightly bigger pack size.',
  'Works well. Packaging could be a bit sturdier but the product itself is fine.'
];

const BODY_LOW = [
  'Not quite what I expected from the photo, but it is usable.',
  'A bit smaller than I thought it would be. Still okay for the price.',
  'The quality varied between the two packs I ordered. Hit and miss.'
];

const BODY_BY_DEPT = {
  'fruit-veg': ['Fresh and crisp when it arrived, no bruised pieces in the bag.'],
  'meat-seafood': ['Well trimmed and cooked up beautifully on the barbecue.'],
  bakery: ['Soft the next day too, which is rare for supermarket bakery.'],
  'dairy-eggs': ['Long expiry date and it stayed fresh right through the week.'],
  frozen: ['Freezer to oven in 25 minutes — ideal for a weeknight.'],
  pantry: ['Great pantry staple, I keep two in the cupboard at all times.'],
  drinks: ['Chilled nicely and the family finished it in two days.'],
  household: ['Does the job and the refill size lasts us about a month.'],
  baby: ['Gentle on skin and no reactions, which is the main thing.'],
  pet: ['The dog is obsessed. Bowl is empty in under a minute.'],
  'health-beauty': ['Absorbs quickly and the scent is subtle, not overpowering.'],
  'home-lifestyle': ['Feels sturdier than the price suggests.']
};

export function reviewsFor(product) {
  if (!product) return [];
  const seed = hash(product.id + 'reviews');
  const rand = rng(seed);
  const count = Math.max(3, Math.min(8, 3 + Math.floor(rand() * 6)));
  const out = [];

  for (let i = 0; i < count; i++) {
    const stars = product.rating >= 4.3
      ? (rand() < 0.85 ? 5 : 4)
      : product.rating >= 4
        ? (rand() < 0.6 ? 5 : rand() < 0.8 ? 4 : 3)
        : (rand() < 0.4 ? 4 : rand() < 0.7 ? 3 : 2);

    const titlePool = stars >= 4 ? TITLES_HIGH : stars === 3 ? TITLES_MID : TITLES_LOW;
    const bodyPool = stars >= 4 ? BODY_HIGH : stars === 3 ? BODY_MID : BODY_LOW;
    const deptLine = (BODY_BY_DEPT[product.dept] || [''])[0];

    const day = 1 + Math.floor(rand() * 27);
    const month = 1 + Math.floor(rand() * 10);
    const date = `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/2026`;
    const verified = rand() < 0.8;

    out.push({
      id: `${product.id}-r${i}`,
      author: AUTHORS[Math.floor(rand() * AUTHORS.length)],
      stars,
      title: titlePool[Math.floor(rand() * titlePool.length)],
      body: bodyPool[Math.floor(rand() * bodyPool.length)] + (i === 0 && deptLine ? ' ' + deptLine : ''),
      date,
      verified
    });
  }
  return out;
}

export function ratingBreakdown(product) {
  const reviews = reviewsFor(product);
  const buckets = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  reviews.forEach((r) => { buckets[r.stars] += 1; });
  const total = reviews.length || 1;
  return [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: buckets[star],
    pct: Math.round((buckets[star] / total) * 100)
  }));
}

export function descriptionFor(product) {
  const cat = getCategory(product.cat);
  const dept = getDepartment(product.dept);
  const catName = cat ? cat.name : 'Groceries';
  const deptName = dept ? dept.name : 'Everyday needs';
  const lines = [
    `${product.name} from ${product.brand}, part of our ${catName} range in ${deptName}.`,
    `Packed in ${product.size} so it fits neatly into the weekly shop. Great for everyday meals, lunchboxes and last-minute dinners.`,
    `Available for same-day delivery and free Click & Collect, with ${product.organic ? 'certified organic ingredients and no synthetic pesticides' : 'no artificial colours or flavours added'}.`
  ];
  return lines;
}

const INGREDIENTS_BY_ART = {
  fresh: 'Single ingredient product. May contain traces of other produce handled in store.',
  pack: 'Contains milk, soy and wheat. May contain traces of nuts, sesame and egg.',
  bottle: 'Filtered water, natural flavours, acidity regulator (330), preservative (202).',
  can: 'Ingredients: tomatoes (99%), salt, firming agent (509).',
  box: 'Contains wheat, milk, soy. May contain egg, sesame and tree nuts.'
};

export function ingredientsFor(product) {
  return INGREDIENTS_BY_ART[product.art] || INGREDIENTS_BY_ART.pack;
}

export function nutritionFor(product) {
  const seed = hash(product.id + 'nutrition');
  const rand = rng(seed);
  const round = (min, max) => (min + rand() * (max - min)).toFixed(1);
  return [
    { key: 'Servings per pack', value: String(1 + Math.floor(rand() * 5)) },
    { key: 'Energy', value: `${Math.round(120 + rand() * 900)} kJ` },
    { key: 'Protein', value: `${round(0.6, 18)} g` },
    { key: 'Fat, total', value: `${round(0.2, 22)} g` },
    { key: '– saturated', value: `${round(0.1, 9)} g` },
    { key: 'Carbohydrate', value: `${round(1, 62)} g` },
    { key: '– sugars', value: `${round(0.2, 26)} g` },
    { key: 'Sodium', value: `${Math.round(5 + rand() * 620)} mg` }
  ];
}

export const POLICY_PAGES = {
  terms: {
    title: 'Terms of Use',
    updated: '1 November 2026',
    sections: [
      ['About these terms', 'These terms govern your use of the Coles Online website and any order you place through it. By browsing or ordering you accept them.'],
      ['Accounts', 'You are responsible for keeping your login details secure and for all activity on your account. Let us know immediately if you think someone else has access.'],
      ['Pricing', 'All prices are in Australian dollars and include GST. Prices and specials can change without notice; the price shown at checkout is the price that applies to your order.'],
      ['Availability', 'Products are subject to availability and may be substituted where an item is out of stock. You can opt out of substitutions in your account settings.'],
      ['Delivery and collection', 'Delivery windows are estimates. Click & Collect orders are held for 24 hours after the notified ready time.'],
      ['Liability', 'Nothing in these terms limits rights you have under the Australian Consumer Law.'],
      ['Contact', 'Questions about these terms: online.support@coles.com.au or 1800 061 562.']
    ]
  },
  privacy: {
    title: 'Privacy Policy',
    updated: '1 November 2026',
    sections: [
      ['What we collect', 'Contact details, delivery address, order history, device and browser information, and the pages you visit on our site.'],
      ['How we use it', 'To take and deliver your order, to run your Flybuys account, to prevent fraud, and to improve our range and pricing.'],
      ['Cookies and tracking', 'We use first-party cookies for your cart and session, and measurement tags to understand how people find and use the site.'],
      ['Sharing', 'We share data with delivery partners, payment processors and analytics providers strictly as needed to run the service.'],
      ['Your choices', 'You can opt out of marketing at any time from your account or by contacting us.'],
      ['Access and correction', 'You can request a copy of the personal information we hold about you and ask us to correct it.']
    ]
  },
  returns: {
    title: 'Returns & Refunds',
    updated: '1 November 2026',
    sections: [
      ['Freshness guarantee', 'If something is not up to standard, tell us within 48 hours of delivery or collection and we will refund or replace it.'],
      ['Damaged or missing items', 'Report damaged or missing items from your order history and we will refund the item price to your original payment method.'],
      ['Change of mind', 'Unopened non-perishable items can be returned within 30 days with proof of purchase.'],
      ['Refund timing', 'Card refunds usually appear within 3–5 business days, depending on your bank.'],
      ['Australian Consumer Law', 'Our refunds are in addition to your rights under the Australian Consumer Law.']
    ]
  },
  delivery: {
    title: 'Delivery',
    updated: '1 November 2026',
    sections: [
      ['Free delivery', 'Delivery is free on orders over $50. Orders under $50 attract a $5 delivery fee.'],
      ['Same-day delivery', 'Order before 2pm local time in metro areas for same-day delivery.'],
      ['Delivery windows', 'Choose a one-hour window at checkout. We will send an SMS when the driver is on the way.'],
      ['Contactless delivery', 'Drivers will leave your order at the door if you select contactless in your account settings.'],
      ['Coverage', 'Delivery is available within our metro and regional service areas. Enter your postcode at checkout to confirm.']
    ]
  },
  'click-collect': {
    title: 'Click & Collect',
    updated: '1 November 2026',
    sections: [
      ['How it works', 'Order online, choose a collection store, and we will pick and pack your order. Most orders are ready within two hours.'],
      ['Collection point', 'Collect from the Click & Collect desk near the front of store. Bring your order number or the QR code from your confirmation email.'],
      ['Holding time', 'We hold orders for 24 hours after the ready notification.'],
      ['Cold and frozen items', 'Chilled and frozen items are stored in temperature-controlled lockers until you arrive.'],
      ['Cost', 'Click & Collect is free on every order, with no minimum spend.']
    ]
  },
  flybuys: {
    title: 'Flybuys',
    updated: '1 November 2026',
    sections: [
      ['Earning points', 'Link your Flybuys card to your online account to collect 1 point per $1 spent on eligible shops.'],
      ['Using points', '2,000 points = $10 Flybuys dollars, which can be used on a future shop.'],
      ['Bonus offers', 'Activate weekly offers in the Flybuys app before you shop to earn bonus points on selected ranges.'],
      ['One card per account', 'Only one Flybuys card can be linked to an online account at a time.']
    ]
  },
  cookies: {
    title: 'Cookie Notice',
    updated: '1 November 2026',
    sections: [
      ['Essential cookies', 'Used to keep your cart, session and checkout working. These cannot be turned off.'],
      ['Analytics cookies', 'Help us understand which pages and products are popular so we can improve the store.'],
      ['Marketing cookies', 'Used to measure advertising performance and to show relevant offers on other sites.'],
      ['Managing cookies', 'You can clear or block cookies in your browser settings. Blocking essential cookies will break checkout.']
    ]
  },
  accessibility: {
    title: 'Accessibility',
    updated: '1 November 2026',
    sections: [
      ['Our commitment', 'We aim to meet WCAG 2.1 AA across the storefront, including keyboard navigation and screen reader support.'],
      ['Known limitations', 'Some third-party payment screens are outside our control and may not meet the same standard.'],
      ['Feedback', 'If you hit an accessibility barrier, contact accessibility@coles.com.au and we will respond within five business days.']
    ]
  },
  contact: {
    title: 'Contact us',
    updated: '1 November 2026',
    sections: [
      ['Customer service', 'Call 1800 061 562, 7am – 11pm AEDT, seven days a week.'],
      ['Online orders', 'Use the help link in your order confirmation email and include your order number.'],
      ['Store enquiries', 'Contact your local store directly for stock checks and Click & Collect questions.'],
      ['Feedback', 'We read every piece of feedback sent through the contact form.']
    ]
  },
  stores: {
    title: 'Store locator',
    updated: '1 November 2026',
    sections: [
      ['800+ stores', 'Coles operates more than 800 supermarkets across Australia, all offering free Click & Collect.'],
      ['Opening hours', 'Most stores trade 7am – 10pm daily, with selected stores open 24 hours.'],
      ['Sydney CBD', '388 George St, Sydney NSW 2000 — 7am to 11pm daily.'],
      ['Melbourne Central', '211 La Trobe St, Melbourne VIC 3000 — 7am to 10pm daily.'],
      ['Brisbane CBD', '300 Adelaide St, Brisbane QLD 4000 — 7am to 9pm daily.']
    ]
  }
};
