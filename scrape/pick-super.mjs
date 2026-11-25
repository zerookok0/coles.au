/** Pick candidate staples for the Super Specials block (read-only). */
import fs from 'node:fs';

const catalog = JSON.parse(fs.readFileSync('public/data/catalog.json', 'utf8'));
const products = catalog.products;

function probe(label, re, dept) {
  const rx = re instanceof RegExp ? re : new RegExp(re, 'i');
  const hits = products
    .filter((p) => rx.test(p.name) && p.image && p.stock > 0 && (!dept || p.dept === dept))
    .slice(0, 4);
  console.log(
    `[${label}] ` +
      (hits.length
        ? hits
            .map(
              (p) =>
                `${p.id} $${(p.price / 100).toFixed(2)} ${p.name.slice(0, 42)} (${p.dept}, stock ${p.stock})`
            )
            .join(' || ')
        : 'none')
  );
}

probe('Weet-Bix', /weet-?bix/i);
probe('Bread', /white sandwich bread|tip top|soft white|white bread/i);
probe('Eggs', /free range eggs/i);
probe('Ice cream', /vanilla ice cream|ice cream tub/i);
probe('Coffee', /instant coffee|ground coffee/i);
probe('Laundry', /laundry liquid|laundry powder/i);
probe('Dishwash', /dishwashing tablets|dishwasher tablets/i);
probe('Chocolate', /chocolate block/i);
probe('Cola', /cola/i, 'drinks');
probe('Chips', /potato chips/i);
probe('Nappies', /nappies/i, 'baby');
probe('Tissue', /toilet tissue|facial tissues/i);
probe('Pet food', /cat food/i, 'pet');
probe('Cereal', /corn flakes|nutri-grain/i);
probe('TimTam', /tim tam/i);
probe('Butter', /salted butter/i);
probe('Cheese', /tasty cheese|shredded mozzarella/i);
probe('Bananas', /^bananas$/i);
probe('Chicken', /chicken breast/i);
