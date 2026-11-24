/**
 * Deterministic catalog + product image generator.
 *
 * Output:
 *   src/data/catalog.json      – departments / categories / ~1,180 products
 *   public/img/p/<id>-<n>.svg  – 3 images per product (front / side / detail)
 *   public/img/cat/<id>.svg    – category tiles
 *   public/img/hero/<n>.svg    – home carousel slides
 *
 * Everything is derived from one seeded PRNG, so every `npm run build`
 * produces byte-identical data and images. No network, no external assets.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const OUT_IMG = path.join(ROOT, 'public', 'img');
const OUT_DATA = path.join(ROOT, 'src', 'data');

/* ------------------------------------------------------------------ utils */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(0x5eed2026);
const int = (min, max) => Math.floor(rnd() * (max - min + 1)) + min;
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const chance = (p) => rnd() < p;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/* -------------------------------------------------------------- taxonomy */
const DEPTS = [
  { id: 'fruit-veg', name: 'Fruit & Veg' },
  { id: 'meat-seafood', name: 'Meat & Seafood' },
  { id: 'bakery', name: 'Bakery' },
  { id: 'dairy-eggs', name: 'Dairy & Eggs' },
  { id: 'frozen', name: 'Frozen' },
  { id: 'pantry', name: 'Pantry' },
  { id: 'drinks', name: 'Drinks' },
  { id: 'household', name: 'Household' },
  { id: 'baby', name: 'Baby' },
  { id: 'pet', name: 'Pet' },
  { id: 'health-beauty', name: 'Health & Beauty' },
  { id: 'home-lifestyle', name: 'Home & Lifestyle' }
];

const C = (id, name, dept, type, hue, items, sizes, brands, price, opts = {}) => ({
  id, name, dept, type, hue, items, sizes, brands, price, ...opts
});

const CATS = [
  C('fruit', 'Fruit', 'fruit-veg', 'fresh', 14,
    ['Gala Apples', 'Bananas', 'Navel Oranges', 'Seedless Green Grapes', 'Strawberries', 'Blueberries',
      'Hass Avocados', 'Mangoes', 'Watermelon', 'Pineapple', 'Lemons', 'Kiwi Fruit', 'Peaches', 'Pears'],
    ['1kg bag', '500g punnet', 'each', 'approx. 1kg'],
    ['Coles', 'Perfection Fresh', 'Fresh Select'], [180, 1290], { brandPrefix: false, unit: 'kg' }),

  C('vegetables', 'Vegetables', 'fruit-veg', 'fresh', 88,
    ['Baby Spinach', 'Brown Onions', 'Washed Potatoes', 'Carrots', 'Broccoli', 'Capsicum', 'Cucumber',
      'Cherry Tomatoes', 'Zucchini', 'Sweet Potato', 'Corn Cobs', 'Mushrooms', 'Snow Peas', 'Pumpkin'],
    ['250g', '1kg bag', 'each', '500g'], ['Coles', 'Perfection Fresh'], [150, 990], { brandPrefix: false, unit: 'kg' }),

  C('salad-herbs', 'Salad & Herbs', 'fruit-veg', 'fresh', 100,
    ['Mixed Salad Leaves', 'Baby Rocket', 'Cos Lettuce', 'Continental Parsley', 'Coriander', 'Basil',
      'Mint', 'Thyme', 'Spring Onion', 'Celery', 'Coleslaw Mix', 'Garden Salad Bowl'],
    ['120g', '200g', 'bunch', 'each'], ['Coles', 'Perfection Fresh', 'Sunbeam'], [200, 690], { brandPrefix: false }),

  C('organic-produce', 'Organic Fruit & Veg', 'fruit-veg', 'fresh', 120,
    ['Organic Bananas', 'Organic Carrots', 'Organic Baby Kale', 'Organic Sweet Potato', 'Organic Avocado',
      'Organic Blueberries', 'Organic Tomatoes', 'Organic Apples', 'Organic Beetroot', 'Organic Ginger'],
    ['500g', '1kg bag', 'each', '250g'], ['Coles Organic', 'Community Co'], [250, 1590], { brandPrefix: true, organic: true }),

  C('beef', 'Beef', 'meat-seafood', 'fresh', 356,
    ['Beef Mince', 'Scotch Fillet Steak', 'Beef Rump Steak', 'Beef Stir Fry Strips', 'Beef Sausages',
      'Beef Roast', 'Beef Mince Lean', 'Beef Burger Patties', 'Beef Ribs', 'Beef Brisket'],
    ['500g', '1kg', '400g', 'per kg'], ['Coles', 'Coles Graze', 'Riverine'], [550, 3490], { brandPrefix: true, unit: 'kg' }),

  C('chicken', 'Chicken', 'meat-seafood', 'fresh', 30,
    ['Chicken Breast Fillets', 'Chicken Thigh Fillets', 'Whole Chicken', 'Chicken Drumsticks',
      'Chicken Wings', 'Chicken Mince', 'Chicken Tenderloins', 'Chicken Sausages', 'Chicken Kebabs'],
    ['500g', '1kg', 'per kg', '600g'], ['Coles', 'Steggles', 'Ingham\'s'], [500, 1890], { brandPrefix: true }),

  C('pork-lamb', 'Pork & Lamb', 'meat-seafood', 'fresh', 340,
    ['Pork Belly', 'Pork Loin Chops', 'Pork Mince', 'Lamb Loin Chops', 'Lamb Cutlets', 'Lamb Mince',
      'Lamb Shoulder Roast', 'Pork Sausages', 'Lamb Shanks', 'Pork Ribs'],
    ['500g', '1kg', 'per kg', '400g'], ['Coles', 'Coles Graze', 'Lamb Western'], [600, 3290], { brandPrefix: true }),

  C('seafood', 'Seafood', 'meat-seafood', 'fresh', 200,
    ['Australian Prawns', 'Salmon Fillets', 'Barramundi Fillets', 'Flathead Fillets', 'Oysters',
      'Mussels', 'Squid Rings', 'Tuna Steaks', 'Crab Meat', 'Smoked Salmon'],
    ['500g', '250g', '1kg', 'each'], ['Coles', 'Coles Deli', 'Sydney Fresh'], [450, 3990], { brandPrefix: true }),

  C('deli', 'Deli & Chilled', 'meat-seafood', 'pack', 8,
    ['Shaved Ham', 'Salami', 'Chicken Breast Slices', 'Bacon Short Cut', 'Prosciutto', 'Feta Stuffed Olives',
      'Hummus', 'Dips', 'Antipasto Mix', 'Roast Beef Slices'],
    ['100g', '200g', '250g', 'each'], ['Coles Deli', 'Don', 'Hellers'], [250, 1690], { brandPrefix: true }),

  C('bread', 'Bread & Bakery', 'bakery', 'fresh', 34,
    ['White Sandwich Bread', 'Wholemeal Bread', 'Sourdough Loaf', 'Multigrain Bread', 'Turkish Bread',
      'Hot Dog Rolls', 'Burger Buns', 'Wraps', 'Baguette', 'Fruit Loaf'],
    ['650g', 'each', '6 pack', '400g'], ['Coles', 'Tip Top', 'Bakers Delight'], [250, 890], { brandPrefix: true }),

  C('bakery-treats', 'Bakery Treats', 'bakery', 'pack', 24,
    ['Croissants', 'Pain au Chocolat', 'Apple Scroll', 'Cinnamon Donuts', 'Chocolate Muffins', 'Lamingtons',
      'Custard Tart', 'Sausage Rolls', 'Meat Pies', 'Vanilla Slice'],
    ['4 pack', '6 pack', 'each', '2 pack'], ['Coles Bakery', 'Mrs Mac\'s', 'Balfours'], [200, 1290], { brandPrefix: true }),

  C('cakes', 'Cakes & Desserts', 'bakery', 'pack', 320,
    ['Mud Cake', 'Cheesecake', 'Tiramisu', 'Chocolate Birthday Cake', 'Pavlova', 'Trifle', 'Apple Pie',
      'Profiteroles', 'Brownie Slab', 'Ice Cream Cake'],
    ['each', '600g', '8 pack', '1kg'], ['Coles Bakery', 'Sara Lee', 'Bulla'], [350, 2490], { brandPrefix: true }),

  C('milk', 'Milk', 'dairy-eggs', 'bottle', 210,
    ['Full Cream Milk', 'Lite Milk', 'Skim Milk', 'A2 Protein Milk', 'Soy Milk', 'Almond Milk',
      'Oat Milk', 'Lactose Free Milk', 'Goat Milk', 'Flavoured Milk'],
    ['1L', '2L', '3L', '6 pack'], ['Coles', 'a2', 'Vitasoy'], [130, 690], { brandPrefix: true }),

  C('cheese', 'Cheese', 'dairy-eggs', 'pack', 45,
    ['Tasty Cheese Block', 'Shredded Mozzarella', 'Parmesan Wedge', 'Brie', 'Camembert', 'Feta',
      'Cheddar Slices', 'Cream Cheese', 'Haloumi', 'Blue Vein'],
    ['250g', '500g', '200g', 'each'], ['Coles', 'Bega', 'Mainland'], [300, 1590], { brandPrefix: true }),

  C('yoghurt', 'Yoghurt', 'dairy-eggs', 'pack', 320,
    ['Greek Yoghurt', 'Natural Yoghurt', 'Vanilla Yoghurt', 'Strawberry Yoghurt', 'Kids Yoghurt Pouch',
      'High Protein Yoghurt', 'Coconut Yoghurt', 'Blueberry Yoghurt', 'Drinking Yoghurt'],
    ['500g', '1kg', '4 pack', '160g'], ['Coles', 'Chobani', 'YoPRO'], [180, 890], { brandPrefix: true }),

  C('eggs', 'Eggs', 'dairy-eggs', 'pack', 40,
    ['Free Range Eggs', 'Cage Free Eggs', 'Extra Large Eggs', 'Organic Eggs', 'Barn Laid Eggs', 'Quail Eggs'],
    ['12 pack', '6 pack', '18 pack', 'each'], ['Coles', 'Sunny Queen', 'Manning Valley'], [380, 1190], { brandPrefix: true }),

  C('butter-cream', 'Butter & Cream', 'dairy-eggs', 'pack', 48,
    ['Salted Butter', 'Unsalted Butter', 'Thickened Cream', 'Sour Cream', 'Cream Cheese Spread',
      'Whipped Cream', 'Ghee', 'Cooking Cream'],
    ['250g', '500g', '300ml', 'each'], ['Coles', 'Western Star', 'Bulla'], [250, 990], { brandPrefix: true }),

  C('frozen-meals', 'Frozen Meals', 'frozen', 'box', 205,
    ['Beef Lasagne', 'Chicken Curry', 'Butter Chicken', 'Shepherds Pie', 'Pad Thai', 'Sausage Rolls',
      'Fish Pie', 'Vegetable Risotto', 'Beef Pie', 'Chicken Parma'],
    ['350g', '400g', 'each', '2 pack'], ['Coles', 'Lean Cuisine', 'On the Menu'], [400, 990], { brandPrefix: true }),

  C('frozen-veg', 'Frozen Veg', 'frozen', 'pack', 110,
    ['Frozen Peas', 'Corn Kernels', 'Mixed Vegetables', 'Stir Fry Mix', 'Broccoli Florets', 'Spinach',
      'Chips', 'Wedges', 'Hash Browns', 'Edamame'],
    ['500g', '1kg', '750g', 'each'], ['Coles', 'Birds Eye', 'McCain'], [200, 790], { brandPrefix: true }),

  C('ice-cream', 'Ice Cream', 'frozen', 'pack', 330,
    ['Vanilla Ice Cream', 'Chocolate Ice Cream', 'Cookies & Cream', 'Mango Sorbet', 'Ice Cream Tub',
      'Ice Cream Sticks', 'Frozen Yoghurt', 'Gelato', 'Cones', 'Sundae'],
    ['1L', '2L', '6 pack', '475ml'], ['Coles', 'Bulla', 'Streets'], [350, 1290], { brandPrefix: true }),

  C('frozen-snacks', 'Frozen Snacks', 'frozen', 'pack', 18,
    ['Party Pies', 'Sausage Rolls', 'Spring Rolls', 'Dim Sims', 'Chicken Nuggets', 'Fish Fingers',
      'Pizza', 'Garlic Bread', 'Potato Gems'],
    ['12 pack', '1kg', 'each', '500g'], ['Coles', 'Patties', 'Birds Eye'], [300, 1190], { brandPrefix: true }),

  C('pasta-rice', 'Pasta & Rice', 'pantry', 'pack', 38,
    ['Spaghetti', 'Penne', 'Fusilli', 'Instant Noodles', 'Basmati Rice', 'Jasmine Rice', 'Brown Rice',
      'Rice Cups', 'Lasagne Sheets', 'Macaroni'],
    ['500g', '1kg', '5 pack', '250g'], ['Coles', 'San Remo', 'SunRice'], [120, 890], { brandPrefix: true }),

  C('canned', 'Canned & Packaged', 'pantry', 'can', 190,
    ['Diced Tomatoes', 'Baked Beans', 'Tuna in Springwater', 'Corn Kernels', 'Chickpeas', 'Coconut Milk',
      'Tomato Soup', 'Beetroot Slices', 'Canned Peaches', 'Spam'],
    ['400g', '4 pack', '425g', 'each'], ['Coles', 'Heinz', 'Sirena'], [90, 590], { brandPrefix: true }),

  C('sauces', 'Sauces & Spreads', 'pantry', 'bottle', 4,
    ['Tomato Sauce', 'BBQ Sauce', 'Mayonnaise', 'Sweet Chilli Sauce', 'Soy Sauce', 'Peanut Butter',
      'Vegemite', 'Jam', 'Honey', 'Pasta Sauce'],
    ['500ml', '380g', '250g', '1kg'], ['Coles', 'MasterFoods', 'Heinz'], [150, 890], { brandPrefix: true }),

  C('cereal', 'Breakfast Cereals', 'pantry', 'box', 28,
    ['Corn Flakes', 'Weet-Bix', 'Nutri-Grain', 'Muesli', 'Oat Clusters', 'Rice Bubbles', 'Porridge Oats',
      'Granola', 'Crunchy Nut', 'Fruit & Fibre'],
    ['375g', '1.2kg', '500g', 'each'], ['Kellogg\'s', 'Sanitarium', 'Uncle Tobys'], [250, 990], { brandPrefix: true }),

  C('baking', 'Baking', 'pantry', 'pack', 32,
    ['Plain Flour', 'Self Raising Flour', 'Caster Sugar', 'Brown Sugar', 'Baking Powder', 'Cocoa Powder',
      'Choc Chips', 'Vanilla Essence', 'Cake Mix', 'Yeast'],
    ['1kg', '500g', '2kg', 'each'], ['Coles', 'White Wings', 'CSR'], [120, 890], { brandPrefix: true }),

  C('oils', 'Oils & Vinegar', 'pantry', 'bottle', 48,
    ['Extra Virgin Olive Oil', 'Canola Oil', 'Vegetable Oil', 'Balsamic Vinegar', 'White Vinegar',
      'Sesame Oil', 'Coconut Oil', 'Apple Cider Vinegar'],
    ['500ml', '1L', '2L', '250ml'], ['Coles', 'Cobram Estate', 'Crisco'], [250, 1690], { brandPrefix: true }),

  C('snacks', 'Snacks & Confectionery', 'pantry', 'pack', 8,
    ['Potato Chips', 'Corn Chips', 'Salted Crackers', 'Chocolate Block', 'Chocolate Biscuits', 'Lollies',
      'Mixed Nuts', 'Pretzels', 'Muesli Bars', 'Popcorn'],
    ['150g', '200g', '180g', '6 pack'], ['Coles', 'Smith\'s', 'Cadbury'], [150, 890], { brandPrefix: true }),

  C('soft-drinks', 'Soft Drinks', 'drinks', 'bottle', 350,
    ['Cola', 'Lemonade', 'Orange Fizz', 'Creaming Soda', 'Ginger Ale', 'Energy Drink', 'Sports Drink',
      'Kombucha', 'Tonic Water', 'Diet Cola'],
    ['1.25L', '2L', '375ml', '10 pack'], ['Coca-Cola', 'Schweppes', 'Coles'], [120, 890], { brandPrefix: true }),

  C('juice', 'Juice', 'drinks', 'bottle', 26,
    ['Orange Juice', 'Apple Juice', 'Mango Juice', 'Tropical Juice', 'Tomato Juice', 'Coconut Water',
      'Lemonade Cordial', 'Breakfast Juice'],
    ['1L', '2L', '250ml', '6 pack'], ['Coles', 'Daily Juice', 'Nudie'], [180, 890], { brandPrefix: true }),

  C('water', 'Water', 'drinks', 'bottle', 195,
    ['Still Water', 'Sparkling Water', 'Spring Water', 'Mineral Water', 'Flavoured Water', 'Sports Water'],
    ['1.5L', '600ml', '10 pack', '2L'], ['Coles', 'Mount Franklin', 'Pump'], [90, 690], { brandPrefix: true }),

  C('coffee-tea', 'Coffee & Tea', 'drinks', 'pack', 22,
    ['Ground Coffee', 'Coffee Beans', 'Instant Coffee', 'Coffee Capsules', 'Black Tea', 'Green Tea',
      'Herbal Tea', 'Chai Latte', 'Hot Chocolate', 'Drinking Chocolate'],
    ['200g', '1kg', '10 pack', '250g'], ['Coles', 'Nescafe', 'Lavazza'], [250, 2490], { brandPrefix: true }),

  C('beer-wine', 'Beer, Wine & Spirits', 'drinks', 'bottle', 300,
    ['Lager', 'Pale Ale', 'Shiraz', 'Sauvignon Blanc', 'Chardonnay', 'Prosecco', 'Rose', 'Vodka',
      'Gin', 'Cider'],
    ['6 pack', '750ml', '375ml', '4 pack'], ['Coles Liquor', 'Tooheys', 'Wolf Blass'], [700, 4990], { brandPrefix: true }),

  C('cleaning', 'Cleaning', 'household', 'bottle', 168,
    ['Surface Spray', 'Bathroom Cleaner', 'Dishwashing Liquid', 'Dishwasher Tablets', 'Bleach',
      'Glass Cleaner', 'Floor Cleaner', 'Mould Remover', 'Sponges', 'Rubber Gloves'],
    ['500ml', '1L', '30 pack', 'each'], ['Coles', 'Ajax', 'Dettol'], [200, 1490], { brandPrefix: true }),

  C('laundry', 'Laundry', 'household', 'bottle', 205,
    ['Laundry Liquid', 'Laundry Powder', 'Fabric Softener', 'Stain Remover', 'Laundry Capsules',
      'Bleach', 'Dryer Sheets', 'Wool Wash'],
    ['1L', '2L', '1kg', '24 pack'], ['Coles', 'OMO', 'Cold Power'], [350, 2490], { brandPrefix: true }),

  C('paper', 'Paper & Packaging', 'household', 'pack', 40,
    ['Toilet Tissue', 'Paper Towel', 'Facial Tissues', 'Baking Paper', 'Cling Wrap', 'Aluminium Foil',
      'Freezer Bags', 'Garbage Bags', 'Paper Plates', 'Napkins'],
    ['12 pack', '6 pack', '24 pack', 'each'], ['Coles', 'Quilton', 'Sorbent'], [200, 1690], { brandPrefix: true }),

  C('baby-food', 'Baby Food', 'baby', 'pack', 26,
    ['Baby Puree Pouch', 'Baby Rice Cereal', 'Toddler Snacks', 'Baby Yogurt', 'Infant Formula',
      'Follow On Formula', 'Baby Juice', 'Finger Food Puffs'],
    ['120g', '6 pack', '250g', 'each'], ['Coles Baby', 'Rafferty\'s Garden', 'Heinz'], [150, 3490], { brandPrefix: true }),

  C('nappies', 'Nappies & Wipes', 'baby', 'pack', 190,
    ['Nappies Crawler', 'Nappies Walker', 'Nappies Newborn', 'Baby Wipes', 'Nappy Pants', 'Swim Nappies',
      'Change Mat', 'Nappy Bin Refills'],
    ['32 pack', '48 pack', '72 pack', 'each'], ['Coles', 'Huggies', 'BabyLove'], [700, 3990], { brandPrefix: true }),

  C('baby-care', 'Baby Care', 'baby', 'bottle', 300,
    ['Baby Shampoo', 'Baby Lotion', 'Baby Bath', 'Nappy Rash Cream', 'Baby Oil', 'Teething Gel',
      'Baby Sunscreen', 'Bottle Wash'],
    ['200ml', '400ml', '100g', 'each'], ['Coles Baby', 'Johnson\'s', 'Curash'], [250, 1890], { brandPrefix: true }),

  C('dog', 'Dog Food', 'pet', 'pack', 24,
    ['Dry Dog Food', 'Wet Dog Food', 'Puppy Food', 'Senior Dog Food', 'Dog Roll', 'Grain Free Dog Food'],
    ['3kg', '700g', '12 pack', '1.5kg'], ['Coles', 'Pedigree', 'Advance'], [350, 4990], { brandPrefix: true }),

  C('cat', 'Cat Food', 'pet', 'pack', 190,
    ['Dry Cat Food', 'Wet Cat Food', 'Kitten Food', 'Senior Cat Food', 'Cat Litter', 'Cat Treats Pouch'],
    ['1.5kg', '85g', '12 pack', '2kg'], ['Coles', 'Whiskas', 'Fancy Feast'], [200, 3490], { brandPrefix: true }),

  C('pet-treats', 'Pet Treats', 'pet', 'pack', 30,
    ['Dog Treats', 'Dental Chews', 'Cat Treats', 'Puppy Chews', 'Pet Biscuits', 'Training Treats'],
    ['200g', '500g', '7 pack', 'each'], ['Coles', 'Schmackos', 'Temptations'], [200, 1490], { brandPrefix: true }),

  C('skincare', 'Skincare', 'health-beauty', 'bottle', 320,
    ['Face Cleanser', 'Moisturiser', 'Sunscreen SPF50+', 'Body Lotion', 'Face Serum', 'Micellar Water',
      'Sheet Mask', 'Lip Balm'],
    ['150ml', '200ml', '75ml', 'each'], ['Coles', 'Nivea', 'Cetaphil'], [350, 3490], { brandPrefix: true }),

  C('hair', 'Hair Care', 'health-beauty', 'bottle', 200,
    ['Shampoo', 'Conditioner', '2 in 1 Shampoo', 'Hair Treatment', 'Dry Shampoo', 'Hair Spray',
      'Hair Oil', 'Colour Care Shampoo'],
    ['400ml', '900ml', '200ml', 'each'], ['Coles', 'Head & Shoulders', 'Pantene'], [300, 2490], { brandPrefix: true }),

  C('vitamins', 'Vitamins & Supplements', 'health-beauty', 'bottle', 40,
    ['Vitamin C', 'Multivitamin', 'Fish Oil', 'Magnesium', 'Vitamin D', 'Probiotics', 'Zinc',
      'Iron Tablets', 'Collagen Powder'],
    ['60 pack', '100 pack', '200ml', 'each'], ['Coles', 'Blackmores', 'Swisse'], [500, 3990], { brandPrefix: true }),

  C('personal-care', 'Personal Care', 'health-beauty', 'bottle', 190,
    ['Toothpaste', 'Toothbrush', 'Deodorant', 'Body Wash', 'Sanitary Pads', 'Shaving Cream',
      'Razor Blades', 'Cotton Buds'],
    ['110g', '2 pack', '400ml', 'each'], ['Coles', 'Colgate', 'Rexona'], [150, 1690], { brandPrefix: true }),

  C('kitchen', 'Kitchen & Dining', 'home-lifestyle', 'pack', 30,
    ['Food Storage Containers', 'Baking Tray', 'Frying Pan', 'Knife Set', 'Chopping Board', 'Cling Film Dispenser',
      'Measuring Cups', 'Kettle Descaler'],
    ['each', '3 pack', 'set', '2 pack'], ['Coles', 'House & Home', 'Baccarat'], [300, 3990], { brandPrefix: true }),

  C('storage', 'Storage & Organisation', 'home-lifestyle', 'pack', 205,
    ['Laundry Basket', 'Storage Tub', 'Coat Hangers', 'Shoe Rack', 'Drawer Organiser', 'Vacuum Bags',
      'Shelf Liner', 'Pegs'],
    ['each', '10 pack', '3 pack', 'set'], ['Coles', 'House & Home', 'Decor'], [200, 2990], { brandPrefix: true }),

  C('garden', 'Garden & Outdoor', 'home-lifestyle', 'pack', 120,
    ['Potting Mix', 'Plant Food', 'Garden Gloves', 'Watering Can', 'BBQ Lighter', 'Citronella Candle',
      'Bug Spray', 'Sunscreen Lotion'],
    ['10L', '500g', 'each', '2 pack'], ['Coles', 'Yates', 'Brunnings'], [250, 2490], { brandPrefix: true })
];

/* ----------------------------------------------------------- price helpers */
function parseSize(size) {
  const s = String(size).toLowerCase();
  const m = s.match(/(\d+(?:\.\d+)?)\s*(kg|g|l|ml)/);
  if (m) {
    const n = parseFloat(m[1]);
    const unit = m[2];
    if (unit === 'kg') return n * 1000;
    if (unit === 'g') return n;
    if (unit === 'l') return n * 1000;
    if (unit === 'ml') return n;
  }
  return null;
}

function unitLabel(cents, size, mathsBase) {
  const qty = parseSize(size);
  if (!qty) return `$${(cents / 100).toFixed(2)} / ea`;
  const lower = String(size).toLowerCase();
  const per100 = (cents / qty) * 100;
  if (lower.includes('ml')) return `$${(per100 / 100).toFixed(2)} / 100mL`;
  return `$${(per100 / 100).toFixed(2)} / 100g`;
}

/* ---------------------------------------------------------------- images */
function roundRect(x, y, w, h, r) {
  return `M${x + r},${y}h${w - 2 * r}a${r},${r} 0 0 1 ${r},${r}v${h - 2 * r}a${r},${r} 0 0 1 ${-r},${r}h${-(w - 2 * r)}a${r},${r} 0 0 1 ${-r},${-r}v${-(h - 2 * r)}a${r},${r} 0 0 1 ${r},${-r}z`;
}

function wrap(text, maxChars) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let cur = '';
  for (const w of words) {
    if (!cur.length) cur = w;
    else if ((cur + ' ' + w).length <= maxChars) cur += ' ' + w;
    else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  return lines;
}

function textLines(lines, x, y, size, lh, opts = {}) {
  const { fill = '#1b1b1b', weight = 700, anchor = 'middle', family = "'Inter','Segoe UI',Roboto,Arial,sans-serif" } = opts;
  return lines
    .map((l, i) => `<text x="${x}" y="${y + i * lh}" font-family="${family}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}">${esc(l)}</text>`)
    .join('');
}

function artFresh(h, rand) {
  const c1 = `hsl(${h} 72% 55%)`;
  const c2 = `hsl(${h} 62% 42%)`;
  const c3 = `hsl(${(h + 18) % 360} 78% 62%)`;
  const blobs = [];
  const count = 3 + Math.floor(rand() * 3);
  for (let i = 0; i < count; i++) {
    const cx = 210 + Math.round(rand() * 180);
    const cy = 230 + Math.round(rand() * 120);
    const r = 52 + Math.round(rand() * 40);
    const fill = [c1, c2, c3][i % 3];
    blobs.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"/>`);
    blobs.push(
      `<ellipse cx="${cx - Math.round(r * 0.34)}" cy="${cy - Math.round(r * 0.42)}" rx="${Math.round(r * 0.3)}" ry="${Math.round(r * 0.18)}" fill="rgba(255,255,255,0.34)" transform="rotate(-22 ${cx} ${cy})"/>`
    );
  }
  const leafRot = -18 + Math.round(rand() * 36);
  return `
    <ellipse cx="300" cy="372" rx="${150 + Math.round(rand() * 30)}" ry="24" fill="hsla(${h},40%,30%,0.14)"/>
    ${blobs.join('')}
    <g transform="rotate(${leafRot} 300 180)">
      <path d="M300 176c22-34 56-44 84-40-6 30-30 54-64 58z" fill="hsl(96 52% 46%)"/>
      <path d="M300 176c-18-30-48-40-74-36 6 28 28 48 58 52z" fill="hsl(96 46% 38%)"/>
    </g>`;
}

function artPack(h, type, brandInk, rand) {
  const body = `hsl(${h} 52% 93%)`;
  const band = brandInk;
  const bandY = 282 + Math.round(rand() * 24);
  const bandH = 84 + Math.round(rand() * 22);
  const stripe = rand() < 0.5;
  if (type === 'bottle') {
    return `
      <ellipse cx="300" cy="470" rx="96" ry="18" fill="hsla(${h},40%,30%,0.14)"/>
      <rect x="268" y="150" width="64" height="58" rx="12" fill="hsl(${h} 30% 88%)"/>
      <rect x="276" y="132" width="48" height="26" rx="8" fill="${band}"/>
      <path d="M232,208h136a34,34 0 0 1 34,34v190a34,34 0 0 1 -34,34h-136a34,34 0 0 1 -34,-34v-190a34,34 0 0 1 34,-34z" fill="${body}" stroke="hsl(${h} 30% 78%)" stroke-width="3"/>
      <rect x="204" y="${bandY}" width="192" height="${bandH}" rx="10" fill="${band}"/>
      ${stripe ? `<rect x="204" y="${bandY + bandH + 12}" width="192" height="12" fill="hsl(${h} 66% 52%)" opacity="0.8"/>` : ''}
      <rect x="220" y="398" width="160" height="10" rx="5" fill="hsl(${h} 30% 72%)"/>
      <rect x="220" y="418" width="120" height="10" rx="5" fill="hsl(${h} 30% 78%)"/>`;
  }
  if (type === 'can') {
    return `
      <ellipse cx="300" cy="470" rx="104" ry="18" fill="hsla(${h},40%,30%,0.14)"/>
      <rect x="196" y="188" width="208" height="256" rx="26" fill="${body}" stroke="hsl(${h} 30% 78%)" stroke-width="3"/>
      <ellipse cx="300" cy="188" rx="104" ry="26" fill="hsl(${h} 22% 82%)"/>
      <ellipse cx="300" cy="188" rx="84" ry="18" fill="hsl(${h} 22% 90%)"/>
      <rect x="196" y="${bandY}" width="208" height="${bandH}" fill="${band}"/>
      <ellipse cx="300" cy="444" rx="104" ry="24" fill="hsl(${h} 22% 86%)"/>`;
  }
  if (type === 'box') {
    return `
      <ellipse cx="300" cy="474" rx="112" ry="18" fill="hsla(${h},40%,30%,0.14)"/>
      <path d="M196,214l104,-40 104,40 -104,32z" fill="hsl(${h} 45% 88%)" stroke="hsl(${h} 30% 76%)" stroke-width="3"/>
      <path d="M196,214v212l104,32V246z" fill="hsl(${h} 42% 90%)" stroke="hsl(${h} 30% 78%)" stroke-width="3"/>
      <path d="M404,214v212l-104,32V246z" fill="hsl(${h} 46% 86%)" stroke="hsl(${h} 30% 78%)" stroke-width="3"/>
      <rect x="212" y="${bandY}" width="80" height="${bandH + 36}" rx="8" fill="${band}" opacity="0.92"/>`;
  }
  // pouch / pack
  return `
    <ellipse cx="300" cy="474" rx="110" ry="18" fill="hsla(${h},40%,30%,0.14)"/>
    <path d="M198,224h204a20,20 0 0 1 20,20v196a20,20 0 0 1 -20,20h-204a20,20 0 0 1 -20,-20v-196a20,20 0 0 1 20,-20z" fill="${body}" stroke="hsl(${h} 30% 78%)" stroke-width="3"/>
    <path d="M198,224h204l14,-26h-232z" fill="hsl(${h} 40% 84%)" stroke="hsl(${h} 30% 76%)" stroke-width="3"/>
    <rect x="178" y="${bandY}" width="244" height="${bandH}" fill="${band}"/>
    ${stripe ? `<rect x="178" y="${bandY + bandH + 10}" width="244" height="12" fill="hsl(${h} 66% 54%)" opacity="0.75"/>` : ''}
    <rect x="206" y="416" width="188" height="9" rx="4.5" fill="hsl(${h} 28% 74%)"/>
    <rect x="206" y="434" width="132" height="9" rx="4.5" fill="hsl(${h} 28% 80%)"/>`;
}

function productSvg(p, view) {
  const h = p.hue;
  const brandInk = `hsl(${h} 64% 38%)`;
  const rand = mulberry32(
    Array.from(p.id).reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) | 0, view * 7919)
  );
  const nameLines = wrap(p.name, 19).slice(0, 2);
  const brandLabel = p.brand.length > 18 ? p.brand.slice(0, 17) + '.' : p.brand;
  const showLabel = view === 1;
  const zoom = view === 3;

  let pack = p.art === 'fresh' ? artFresh(h, rand) : artPack(h, p.art, brandInk, rand);

  let inner = pack;
  if (view === 2) {
    inner = `<g transform="translate(300 340) scale(0.9) rotate(-7) translate(-300 -340)">${pack}</g>`;
  }
  if (zoom) {
    inner = `<g transform="translate(300 320) scale(1.5) translate(-300 -300)">${pack}</g>`;
  }

  const labelBlock = showLabel
    ? `
    <g>
      <rect x="70" y="452" width="460" height="124" rx="16" fill="#ffffff" opacity="0.95"/>
      <text x="300" y="486" font-family="'Inter','Segoe UI',Roboto,Arial,sans-serif" font-size="17" font-weight="700" fill="#7a7a7a" text-anchor="middle" letter-spacing="1.2">${esc(brandLabel.toUpperCase())}</text>
      ${textLines(nameLines, 300, 518, 23, 25)}
      <text x="300" y="566" font-family="'Inter','Segoe UI',Roboto,Arial,sans-serif" font-size="16" font-weight="600" fill="#9a9a9a" text-anchor="middle">${esc(p.size)}</text>
    </g>`
    : zoom
      ? `<g>
          <rect x="70" y="446" width="460" height="130" rx="18" fill="#ffffff" opacity="0.95"/>
          <text x="300" y="492" font-family="'Inter','Segoe UI',Roboto,Arial,sans-serif" font-size="24" font-weight="800" fill="#1b1b1b" text-anchor="middle">${esc(brandLabel)}</text>
          <text x="300" y="528" font-family="'Inter','Segoe UI',Roboto,Arial,sans-serif" font-size="18" font-weight="600" fill="#767676" text-anchor="middle">${esc(p.size)} · detail view</text>
          <text x="300" y="556" font-family="'Inter','Segoe UI',Roboto,Arial,sans-serif" font-size="14" font-weight="600" fill="#a5a5a5" text-anchor="middle">${esc(p.sku)}</text>
        </g>`
      : `<g>
          <rect x="96" y="446" width="408" height="140" rx="14" fill="#ffffff" opacity="0.96"/>
          ${textLines(wrap(p.name, 22).slice(0, 2), 300, 482, 21, 24)}
          <text x="300" y="528" font-family="'Inter','Segoe UI',Roboto,Arial,sans-serif" font-size="15" font-weight="700" fill="#8a8a8a" text-anchor="middle">Nutrition information</text>
          <rect x="164" y="540" width="272" height="7" rx="3.5" fill="#e6e6e6"/>
          <rect x="164" y="554" width="196" height="7" rx="3.5" fill="#ececec"/>
          <rect x="164" y="568" width="120" height="7" rx="3.5" fill="#f1f1f1"/>
        </g>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600" role="img" aria-label="${esc(p.name)}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="hsl(${h} 60% 96%)"/>
      <stop offset="1" stop-color="hsl(${h} 40% 85%)"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.3" cy="0.25" r="0.75">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.85"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="600" height="600" fill="url(#bg)"/>
  <rect width="600" height="600" fill="url(#glow)"/>
  <circle cx="512" cy="96" r="118" fill="hsl(${(h + 24) % 360} 70% 78%)" opacity="0.35"/>
  <circle cx="86" cy="520" r="140" fill="hsl(${h} 55% 82%)" opacity="0.45"/>
  ${inner}
  ${labelBlock}
  <text x="566" y="588" font-family="'Inter','Segoe UI',Roboto,Arial,sans-serif" font-size="15" font-weight="700" fill="hsl(${h} 30% 60%)" text-anchor="end" opacity="0.75">coles</text>
</svg>`;
}

function heroSvg(n, hue, kicker, headline, sub, cta, art) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 620" width="1600" height="620" role="img" aria-label="${esc(headline)}">
  <defs>
    <linearGradient id="g${n}" x1="0" y1="0" x2="1" y2="0.6">
      <stop offset="0" stop-color="hsl(${hue} 78% 42%)"/>
      <stop offset="0.55" stop-color="hsl(${(hue + 14) % 360} 72% 34%)"/>
      <stop offset="1" stop-color="hsl(${(hue + 26) % 360} 64% 26%)"/>
    </linearGradient>
    <radialGradient id="r${n}" cx="0.75" cy="0.25" r="0.85">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.35"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1600" height="620" fill="url(#g${n})"/>
  <rect width="1600" height="620" fill="url(#r${n})"/>
  <circle cx="1330" cy="200" r="250" fill="#ffffff" opacity="0.10"/>
  <circle cx="1450" cy="470" r="170" fill="#ffffff" opacity="0.08"/>
  <circle cx="180" cy="540" r="210" fill="#000000" opacity="0.08"/>
  ${art}
</svg>`;
}

function catTileSvg(cat) {
  const h = cat.hue;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400" role="img" aria-label="${esc(cat.name)}">
  <defs><linearGradient id="t" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="hsl(${h} 72% 94%)"/><stop offset="1" stop-color="hsl(${h} 48% 82%)"/>
  </linearGradient></defs>
  <rect width="400" height="400" fill="url(#t)"/>
  <circle cx="150" cy="150" r="84" fill="hsl(${h} 64% 62%)" opacity="0.9"/>
  <circle cx="248" cy="206" r="66" fill="hsl(${(h + 26) % 360} 68% 68%)" opacity="0.85"/>
  <ellipse cx="196" cy="272" rx="98" ry="42" fill="hsl(${h} 55% 72%)" opacity="0.7"/>
  <ellipse cx="126" cy="122" rx="24" ry="15" fill="#ffffff" opacity="0.5" transform="rotate(-22 126 122)"/>
  <circle cx="272" cy="180" r="13" fill="#ffffff" opacity="0.45"/>
  <path d="M300 92c22-16 44-14 56-6-8 22-28 32-50 28z" fill="hsl(96 48% 50%)" opacity="0.8"/>
</svg>`;
}

function deptTileSvg(dept, hue) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400" role="img" aria-label="${esc(dept.name)}">
  <defs><linearGradient id="d" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="hsl(${hue} 70% 93%)"/><stop offset="1" stop-color="hsl(${hue} 42% 78%)"/>
  </linearGradient></defs>
  <rect width="400" height="400" fill="url(#d)"/>
  <rect x="110" y="150" width="180" height="150" rx="26" fill="hsl(${hue} 58% 58%)" opacity="0.9"/>
  <rect x="134" y="118" width="132" height="34" rx="17" fill="hsl(${hue} 52% 46%)" opacity="0.85"/>
  <circle cx="200" cy="224" r="38" fill="#ffffff" opacity="0.5"/>
  <circle cx="300" cy="120" r="32" fill="hsl(${(hue + 30) % 360} 70% 70%)" opacity="0.8"/>
  <circle cx="96" cy="286" r="22" fill="hsl(${(hue + 330) % 360} 65% 74%)" opacity="0.7"/>
</svg>`;
}

/* --------------------------------------------------------------- build it */
fs.mkdirSync(path.join(OUT_IMG, 'p'), { recursive: true });
fs.mkdirSync(path.join(OUT_IMG, 'cat'), { recursive: true });
fs.mkdirSync(path.join(OUT_IMG, 'hero'), { recursive: true });
fs.mkdirSync(OUT_DATA, { recursive: true });

const categories = [];
const products = [];
let seq = 1000;

for (const cat of CATS) {
  const combos = [];
  for (const item of cat.items) {
    for (const size of cat.sizes) {
      combos.push({ item, size });
    }
  }
  // deterministic shuffle
  for (let i = combos.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [combos[i], combos[j]] = [combos[j], combos[i]];
  }
  const target = Math.min(combos.length, 24);
  const usedNames = new Set();
  let made = 0;

  for (const combo of combos) {
    if (made >= target) break;
    const brand = cat.brands[Math.floor(rnd() * cat.brands.length)];
    const name = cat.brandPrefix
      ? `${brand} ${combo.item} ${combo.size}`.replace(/\s+/g, ' ').trim()
      : `${combo.item} ${combo.size}`.replace(/\s+/g, ' ').trim();
    if (usedNames.has(name)) continue;
    usedNames.add(name);

    seq += 1;
    const id = `p${seq}`;
    const [lo, hi] = cat.price;
    let price = int(lo, hi);
    price = Math.round(price / 5) * 5 - 1; // looks like $4.99
    if (price < 50) price = 55;

    const special = chance(0.34);
    const downDown = !special && chance(0.22);
    let was = null;
    if (special || downDown) {
      was = Math.round((price * (1 + (chance(0.5) ? 0.15 : 0.3))) / 5) * 5 - 1;
    }
    const badge = special ? 'Special' : downDown ? 'Down Down' : chance(0.12) ? 'Bestseller' : chance(0.06) ? 'New' : '';

    const rating = Math.round((3.5 + rnd() * 1.4) * 10) / 10;
    const reviewCount = chance(0.12) ? int(0, 6) : int(8, 2400);
    const stockRoll = rnd();
    const maxStock = int(60, 140);
    const stock = stockRoll < 0.03 ? 0 : stockRoll < 0.11 ? int(1, 5) : int(12, maxStock);

    const p = {
      id,
      sku: `${cat.id.toUpperCase()}-${seq}`,
      slug: `${slug(name)}-${id}`,
      name,
      brand,
      cat: cat.id,
      dept: cat.dept,
      size: combo.size,
      price,
      was,
      unit: unitLabel(price, combo.size),
      rating,
      reviewCount,
      stock,
      maxStock,
      badge,
      hue: (cat.hue + int(-8, 8) + 360) % 360,
      art: cat.type,
      organic: !!cat.organic,
      images: [`/img/p/${id}-1.svg`, `/img/p/${id}-2.svg`, `/img/p/${id}-3.svg`]
    };

    products.push(p);
    for (let v = 1; v <= 3; v++) {
      fs.writeFileSync(path.join(OUT_IMG, 'p', `${id}-${v}.svg`), productSvg(p, v));
    }
    made += 1;
  }

  categories.push({
    id: cat.id,
    name: cat.name,
    dept: cat.dept,
    hue: cat.hue,
    image: `/img/cat/${cat.id}.svg`
  });
  fs.writeFileSync(path.join(OUT_IMG, 'cat', `${cat.id}.svg`), catTileSvg(cat));
}

const departments = DEPTS.map((d) => {
  const cats = categories.filter((c) => c.dept === d.id);
  const hue = cats.length ? cats[0].hue : 0;
  fs.mkdirSync(path.join(OUT_IMG, 'dept'), { recursive: true });
  fs.writeFileSync(path.join(OUT_IMG, 'dept', `${d.id}.svg`), deptTileSvg(d, hue));
  return {
    ...d,
    image: `/img/dept/${d.id}.svg`,
    categories: cats.map((c) => c.id),
    count: products.filter((p) => p.dept === d.id).length
  };
});

/* ------------------------------------------------------------ hero slides */
const HEROES = [
  {
    hue: 352, kicker: 'WEEKLY SPECIALS', headline: 'Half price favourites, every week.',
    sub: 'Hundreds of Down Down prices across the store. Save more on the brands you already buy.',
    cta: 'Shop specials',
    art: `<g opacity="0.95"><circle cx="1250" cy="330" r="150" fill="#ffffff" opacity="0.16"/><circle cx="1390" cy="250" r="90" fill="#FFD100" opacity="0.5"/><circle cx="1160" cy="470" r="70" fill="#ffffff" opacity="0.2"/></g>`
  },
  {
    hue: 205, kicker: 'FREE DELIVERY', headline: 'Free delivery on orders over $50.',
    sub: 'Same-day delivery in metro areas when you order before 2pm. No membership needed.',
    cta: 'Start shopping',
    art: `<g opacity="0.9"><rect x="1120" y="240" width="360" height="200" rx="26" fill="#ffffff" opacity="0.16"/><circle cx="1210" cy="400" r="34" fill="#ffffff" opacity="0.55"/><circle cx="1390" cy="400" r="34" fill="#ffffff" opacity="0.55"/></g>`
  },
  {
    hue: 28, kicker: 'CLICK & COLLECT', headline: 'Order online, collect in 2 hours.',
    sub: 'Free store pickup at 800+ Coles supermarkets. We will text you when it is ready.',
    cta: 'Find a store',
    art: `<g opacity="0.92"><rect x="1150" y="220" width="300" height="230" rx="24" fill="#ffffff" opacity="0.18"/><path d="M1150 300h300" stroke="#ffffff" stroke-width="8" opacity="0.5"/><circle cx="1300" cy="382" r="26" fill="#FFD100" opacity="0.75"/></g>`
  },
  {
    hue: 140, kicker: 'FRESH & LOCAL', headline: 'Fresh produce, picked at its best.',
    sub: 'Australian grown fruit and veg, delivered fresh or ready to collect today.',
    cta: 'Shop fresh',
    art: `<g opacity="0.9"><circle cx="1290" cy="300" r="120" fill="hsl(96 60% 55%)" opacity="0.55"/><circle cx="1400" cy="390" r="80" fill="hsl(60 70% 60%)" opacity="0.5"/></g>`
  },
  {
    hue: 268, kicker: 'FLYBUYS', headline: 'Collect points on every shop.',
    sub: 'Link your Flybuys card and turn everyday groceries into rewards and savings.',
    cta: 'Link my card',
    art: `<g opacity="0.9"><rect x="1180" y="230" width="330" height="210" rx="22" fill="#ffffff" opacity="0.18"/><rect x="1180" y="276" width="330" height="26" fill="#FFD100" opacity="0.7"/></g>`
  },
  {
    hue: 320, kicker: 'SAME-DAY DELIVERY', headline: 'Dinner sorted in under an hour.',
    sub: 'Ready meals, fresh pasta and bakery treats delivered to your door today.',
    cta: 'Shop ready meals',
    art: `<g opacity="0.9"><circle cx="1300" cy="320" r="140" fill="#ffffff" opacity="0.14"/><circle cx="1300" cy="320" r="88" fill="#FFD100" opacity="0.55"/></g>`
  }
];

HEROES.forEach((h, i) => {
  fs.writeFileSync(
    path.join(OUT_IMG, 'hero', `${i + 1}.svg`),
    heroSvg(i + 1, h.hue, h.kicker, h.headline, h.sub, h.cta, h.art)
  );
});

const catalog = {
  generatedAt: '2026-11-24',
  currency: 'AUD',
  departments,
  categories,
  heroes: HEROES.map((h, i) => ({
    id: i + 1,
    image: `/img/hero/${i + 1}.svg`,
    kicker: h.kicker,
    headline: h.headline,
    sub: h.sub,
    cta: h.cta
  })),
  products
};

fs.writeFileSync(path.join(OUT_DATA, 'catalog.json'), JSON.stringify(catalog));

const specials = products.filter((p) => p.was).length;
console.log(
  `[gen] ${products.length} products · ${categories.length} categories · ${departments.length} departments · ${specials} on special · ${products.length * 3} product images`
);
