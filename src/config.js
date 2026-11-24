export const SITE = {
  name: 'Coles Online',
  tagline: 'Fresh food and everyday needs, delivered or collected.',
  currency: 'AUD',
  currencySymbol: 'A$',
  freeDeliveryThreshold: 5000, // cents
  deliveryFee: 500, // cents
  pickupFee: 0,
  sameDayCutoffHour: 14,
  supportPhone: '1800 061 562',
  stores: [
    { id: 'syd-cbd', name: 'Coles Sydney CBD', address: '388 George St, Sydney NSW 2000' },
    { id: 'bondi', name: 'Coles Bondi Junction', address: '500 Oxford St, Bondi Junction NSW 2022' },
    { id: 'mel-cbd', name: 'Coles Melbourne Central', address: '211 La Trobe St, Melbourne VIC 3000' },
    { id: 'bne-cbd', name: 'Coles Brisbane CBD', address: '300 Adelaide St, Brisbane QLD 4000' }
  ]
};

export const PROMO = {
  headline: 'Half-price favourites + free delivery over $50',
  sub: 'Same-day delivery on orders before 2pm · Free Click & Collect in 2 hours · 1,000+ weekly specials',
  bullets: [
    'Free delivery on every order over $50',
    'Same-day delivery in metro areas',
    'Free Click & Collect from 800+ stores',
    'Down Down prices locked for the season'
  ],
  cta: 'Shop the specials',
  countdownMinutes: 60
};
