/** Find the HeroBanner styled-component rules (incl. mobile media queries). */
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

async function get(url, ms = 40000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: ctrl.signal });
    return res.status === 200 ? await res.text() : '';
  } catch (e) {
    return '';
  } finally {
    clearTimeout(t);
  }
}

const html = await get('https://web.archive.org/web/2024id_/https://www.coles.com.au/');
console.log('html', html.length);

const scripts = [...new Set([...html.matchAll(/<script[^>]+src="([^"]+\.js)"/g)].map((m) => m[1]))];
console.log('scripts', scripts.length);

const hits = [];
for (const src of scripts) {
  const url = `https://web.archive.org/web/2024id_/https://www.coles.com.au${src}`;
  const js = await get(url);
  if (!js) continue;
  if (/[Hh]eroBanner/.test(js)) {
    console.log('hero chunk:', src, js.length, 'bytes');
    hits.push({ src, js });
    if (hits.length >= 2) break;
  }
}

for (const { src, js } of hits) {
  const media = [...js.matchAll(/@media[^{]{0,80}\{[^}]{0,400}\}/g)].map((m) => m[0]);
  const heroMedia = media.filter((m) => /hero|banner/i.test(m)).slice(0, 20);
  console.log(`\n=== ${src} · media blocks ${media.length} · hero-related ${heroMedia.length} ===`);
  for (const m of heroMedia) console.log(m.replace(/\s+/g, ' ').slice(0, 300));

  const styled = [...js.matchAll(/\.sc-[a-z0-9-]+[^{]{0,120}\{[^}]{0,300}\}/g)].map((m) => m[0]);
  const heroStyled = styled.filter((s) => /height|aspect-ratio|object-fit/.test(s)).slice(0, 15);
  console.log('--- layout rules sample ---');
  for (const s of heroStyled) console.log(s.replace(/\s+/g, ' ').slice(0, 240));
}
