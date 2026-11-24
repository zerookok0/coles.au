/** Dump one archived browse page's product object so we know every field. */
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const res = await fetch('https://web.archive.org/web/2024id_/https://www.coles.com.au/browse/fruit-vegetables', {
  headers: { 'User-Agent': UA }
});
const html = await res.text();
const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
const json = JSON.parse(m[1]);
const pp = json.props.pageProps;
const sr = pp.searchResults;

console.log('searchResults keys:', Object.keys(sr));
console.log('meta:', JSON.stringify({
  page: sr.page,
  totalResults: sr.totalResults,
  pageSize: sr.pageSize,
  searchTerm: sr.searchTerm,
  sortBy: sr.sortBy,
  categories: sr.categories && sr.categories.slice ? sr.categories.slice(0, 3) : sr.categories,
  additionalInfo: sr.additionalInfo
}).slice(0, 1200));

console.log('\nproduct keys:', Object.keys(sr.results[0]));
console.log('\nfull product:', JSON.stringify(sr.results[0], null, 2).slice(0, 3000));
console.log('\nsecond product (has special?):');
const special = sr.results.find((p) => p.pricing && p.pricing.was > p.pricing.now);
console.log(JSON.stringify(special || sr.results[1], null, 2).slice(0, 2500));

console.log('\nimage host check:');
for (const id of [sr.results[0].id, sr.results[0].image[0].uri]) {
  console.log(' -', id);
}
