/** Second look: exact mobile hero typography/geometry + carousel chrome. */
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PROFILE = path.join(process.cwd(), '.tmp', 'chrome-mobile-profile2');
const OUT = path.join(process.cwd(), 'scrape', 'shots');
const MOBILE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: false,
  defaultViewport: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  args: ['--disable-blink-features=AutomationControlled', '--window-size=430,940', '--window-position=60,40', '--lang=en-AU'],
  userDataDir: PROFILE
});
const page = (await browser.pages())[0] || (await browser.newPage());
await page.setUserAgent(MOBILE_UA);
await page.goto('https://www.coles.com.au/', { waitUntil: 'domcontentloaded', timeout: 90000 }).catch(() => {});

let heroOk = false;
for (let i = 0; i < 40; i++) {
  await new Promise((r) => setTimeout(r, 2500));
  const n = await page.evaluate(() => document.querySelectorAll('[class*="HeroBanner"]').length).catch(() => 0);
  if (n > 0) {
    heroOk = true;
    break;
  }
}
if (!heroOk) {
  console.log('hero not found; page text:', (await page.evaluate(() => document.body.innerText.slice(0, 200))).slice(0, 200));
  await browser.close();
  process.exit(2);
}

await new Promise((r) => setTimeout(r, 2000));

const data = await page.evaluate(() => {
  const box = (el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      w: Math.round(r.width),
      h: Math.round(r.height),
      y: Math.round(r.top + window.scrollY),
      x: Math.round(r.left),
      display: cs.display,
      pos: cs.position,
      bg: cs.backgroundColor,
      color: cs.color,
      font: cs.fontSize,
      lh: cs.lineHeight,
      weight: cs.fontWeight,
      align: cs.textAlign,
      pad: cs.padding,
      margin: cs.margin,
      radius: cs.borderRadius,
      gap: cs.gap
    };
  };

  const hero = document.querySelector('[class*="HeroBannerListHeroBannerHeroBannerWrapper"]') || document.querySelector('[class*="HeroBanner"]');
  const out = { vw: window.innerWidth, hero: box(hero) };

  const inner = hero.querySelector('div');
  if (inner) out.innerFirst = { cls: String(inner.className).slice(0, 60), ...box(inner) };

  const img = hero.querySelector('img');
  if (img) out.image = { ...box(img), fit: getComputedStyle(img).objectFit, src: img.currentSrc.slice(0, 80) };

  const textNodes = [...hero.querySelectorAll('h2,h3,p,a,button,span')]
    .filter((n) => n.textContent.trim() && n.children.length === 0)
    .slice(0, 12)
    .map((n) => ({ tag: n.tagName.toLowerCase(), text: n.textContent.trim().slice(0, 40), ...box(n) }));
  out.texts = textNodes;

  // carousel chrome: dots / arrows / slide count
  const list = hero.parentElement;
  out.list = list ? { cls: String(list.className).slice(0, 60), kids: list.children.length, ...box(list) } : null;
  const dots = [...document.querySelectorAll('[class*="Dot"],[class*="Indicator"],[class*="Pagination"]')].slice(0, 4).map((d) => ({
    cls: String(d.className).slice(0, 50),
    ...box(d)
  }));
  out.dots = dots;

  // header for reference
  const hdr = document.querySelector('header');
  if (hdr) out.header = { ...box(hdr) };
  return out;
});

fs.writeFileSync(path.join(OUT, 'mobile-hero-detail.json'), JSON.stringify(data, null, 1));
await page.screenshot({ path: path.join(OUT, 'mobile-home-2.png') });
console.log(JSON.stringify(data, null, 1).slice(0, 5000));
await browser.close();
