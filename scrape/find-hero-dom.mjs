/** Locate the hero markup inside the archived homepage HTML. */
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const res = await fetch('https://web.archive.org/web/2024id_/https://www.coles.com.au/', {
  headers: { 'User-Agent': UA }
});
const html = await res.text();
console.log('bytes', html.length);

const needles = ['Free delivery on your first online shop', 'Shop specials', 'heroBanner', 'cc-hero', 'hero-banner', 'bannerTitle'];
for (const n of needles) {
  const i = html.indexOf(n);
  console.log(`${n}: ${i}`);
}

const i = html.indexOf('Free delivery on your first online shop');
if (i > 0) {
  const start = Math.max(0, i - 2500);
  console.log('\n--- context before ---\n' + html.slice(start, i).replace(/\s+/g, ' ').slice(-1800));
  console.log('\n--- context after ---\n' + html.slice(i, i + 1200).replace(/\s+/g, ' '));
}

/* every class attribute in the document, to spot the naming convention */
const classes = [...new Set([...html.matchAll(/class="([^"]{4,90})"/g)].map((m) => m[1]))];
const heroish = classes.filter((c) => /hero|banner|roundel/i.test(c));
console.log('\nclass attributes:', classes.length, '| heroish:', heroish.length);
console.log(heroish.slice(0, 30).join('\n'));
