/** Dump the BFF/AEM API config from the find-stores page data. */
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const BUILD = '20261111.8-840ebb1e3234c72b3bfd337d7f6bb776e5cb3564';

const res = await fetch(`https://www.coles.com.au/_next/data/${BUILD}/find-stores.json`, {
  headers: { 'User-Agent': UA }
});
const json = await res.json();
const state = json.pageProps.initialState;

for (const key of ['bffApi', 'aemApi', 'content', 'shoppingMethod', 'list']) {
  if (!state[key]) continue;
  const s = JSON.stringify(state[key]);
  console.log(`\n=== ${key} (${s.length}b) ===\n${s.slice(0, 2200)}`);
}
