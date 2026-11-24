/** Read the real homepage markup + CSS so the hero can be copied, not guessed. */
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

async function get(url, ms = 45000) {
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

/* 1. live first, archive as fallback */
let html = '';
const live = await get('https://www.coles.com.au/');
console.log('live / ->', live.status, live.text.length, 'challenge=', /Incapsula|ewelcome/.test(live.text));
if (live.status === 200 && !/Incapsula|ewelcome/.test(live.text) && live.text.length > 50000) {
  html = live.text;
} else {
  const arch = await get('https://web.archive.org/web/2024id_/https://www.coles.com.au/');
  console.log('archive / ->', arch.status, arch.text.length);
  html = arch.text;
}

/* 2. hero markup */
const heroIdx = html.indexOf('herobanner');
const slice = html.slice(Math.max(0, heroIdx - 3000), heroIdx + 4000);
const classHits = [...new Set([...slice.matchAll(/class="([^"]{3,120})"/g)].map((m) => m[1]))];
console.log('\n--- classes near hero ---\n' + classHits.slice(0, 40).join('\n'));

const styleHits = [...new Set([...slice.matchAll(/style="([^"]{3,160})"/g)].map((m) => m[1]))];
console.log('\n--- inline styles ---\n' + styleHits.slice(0, 25).join('\n'));

/* 3. css bundles */
const css = [...new Set([...html.matchAll(/href="([^"]+\.css)"/g)].map((m) => m[1]))];
console.log('\ncss bundles:', css.length);
console.log(css.slice(0, 12).join('\n'));
