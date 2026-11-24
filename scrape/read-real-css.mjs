/** Pull the real stylesheet and print the hero / rail / nav rules verbatim. */
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const HASH = 'e49c99aeee901034';

async function get(url, ms = 60000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: ctrl.signal });
    return { status: res.status, text: await res.text() };
  } catch (e) {
    return { status: 0, text: '' };
  } finally {
    clearTimeout(t);
  }
}

const candidates = [
  `https://www.coles.com.au/_next/static/css/${HASH}.css`,
  `https://web.archive.org/web/2024id_/https://www.coles.com.au/_next/static/css/${HASH}.css`
];

let css = '';
for (const u of candidates) {
  const r = await get(u);
  console.log(`${u.split('/')[2]} -> ${r.status} ${r.text.length}b`);
  if (r.status === 200 && r.text.length > 10000) {
    css = r.text;
    break;
  }
}
if (!css) process.exit(1);

/* split into rules and keep the ones about hero banners / category rail / header */
const rules = css.split('}').map((r) => r + '}');
const want = /hero|banner|categoryExplorer|catNav|roundel|header|search/i;
const hits = rules
  .filter((r) => want.test(r))
  .map((r) => r.trim())
  .filter((r) => r.length < 600);

console.log('\n--- matching rules:', hits.length, '---');
for (const r of hits.slice(0, 120)) console.log(r.replace(/\s+/g, ' ').slice(0, 400));
