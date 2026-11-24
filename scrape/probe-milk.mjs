/** Probe the milk product: image URL pattern + live product page. */
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

for (const u of [
  'https://productimages.coles.com.au/productimages/8/8150288.jpg',
  'https://productimages.coles.com.au/productimages/7/7758634.jpg'
]) {
  try {
    const r = await fetch(u, { method: 'HEAD', headers: { 'User-Agent': UA } });
    console.log(u.split('/').pop(), r.status, r.headers.get('content-length'));
  } catch (e) {
    console.log('ERR', e.message);
  }
}

try {
  const r = await fetch('https://www.coles.com.au/product/coles-full-cream-milk-3l-8150288', {
    headers: { 'User-Agent': UA }
  });
  const t = await r.text();
  console.log('product page:', r.status, t.length, 'challenge=', /Incapsula|ewelcome/.test(t));
  const m = t.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (m) {
    const j = JSON.parse(m[1]);
    const pp = j.props.pageProps || {};
    const blob = JSON.stringify(pp);
    console.log('pageProps keys:', Object.keys(pp));
    const name = blob.match(/"name":"([^"]{3,90})"/);
    const size = blob.match(/"size":"([^"]{1,40})"/);
    const price = blob.match(/"now":([\d.]+)/);
    const was = blob.match(/"was":([\d.]+)/);
    const uri = blob.match(/"uri":"(\/[0-9]+\/[0-9]+\.jpg)"/);
    console.log({ name: name && name[1], size: size && size[1], price: price && price[1], was: was && was[1], uri: uri && uri[1] });
  }
} catch (e) {
  console.log('page ERR', e.message);
}
