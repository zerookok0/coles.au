/** Read the real hero CSS at mobile breakpoints (live first, archive fallback). */
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const MOBILE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';

async function get(url, ua = UA, ms = 45000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { headers: { 'User-Agent': ua, Accept: 'text/html,*/*' }, signal: ctrl.signal });
    return { status: res.status, text: await res.text() };
  } catch (e) {
    return { status: 0, text: '' };
  } finally {
    clearTimeout(t);
  }
}

const live = await get('https://www.coles.com.au/');
console.log('live / ->', live.status, live.text.length, 'challenge=', /Incapsula|ewelcome/.test(live.text));

const archive = await get('https://web.archive.org/web/2024id_/https://www.coles.com.au/');
console.log('archive / ->', archive.status, archive.text.length);

const html = live.status === 200 && !/Incapsula|ewelcome/.test(live.text) ? live.text : archive.text;

const css = [...new Set([...html.matchAll(/href="([^"]+\.css)"/g)].map((m) => m[1]))];
console.log('css files:', css.length, css.slice(0, 6));

for (const href of css.slice(0, 6)) {
  const url = href.startsWith('http') ? href : 'https://www.coles.com.au' + href;
  const r = await get(url);
  if (r.status !== 200) {
    console.log('skip', href, r.status);
    continue;
  }
  const rules = r.text.split('}').map((x) => x + '}');
  const heroish = rules.filter((x) => /hero|banner|carousel/i.test(x)).map((x) => x.replace(/\s+/g, ' ').trim());
  console.log(`\n=== ${href} (${r.text.length}b, hero rules ${heroish.length}) ===`);
  for (const rule of heroish.slice(0, 40)) console.log(rule.slice(0, 320));
}
