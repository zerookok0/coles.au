/** Look for a store list inside archived Coles /stores captures. */
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const targets = [
  ['2020', 'https://web.archive.org/web/20200514155940id_/https://www.coles.com.au/stores'],
  ['2024', 'https://web.archive.org/web/2024id_/https://www.coles.com.au/stores'],
  ['2019', 'https://web.archive.org/web/2019id_/https://www.coles.com.au/stores']
];

for (const [label, url] of targets) {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 60000);
    const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: ctrl.signal });
    clearTimeout(t);
    const html = await res.text();
    const next = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
    let summary = { bytes: html.length, nextData: !!next };
    if (next) {
      const json = JSON.parse(next[1]);
      const pp = json.props.pageProps || {};
      summary.page = json.page;
      summary.pagePropsKeys = Object.keys(pp);
      const blob = JSON.stringify(pp);
      summary.suburbHits = (blob.match(/"suburb"/g) || []).length;
      summary.postcodeHits = (blob.match(/"postcode"/g) || []).length;
      summary.latHits = (blob.match(/"latitude"/g) || []).length;
    }
    console.log(label, JSON.stringify(summary));
  } catch (e) {
    console.log(label, 'ERR', e.message);
  }
}
