/**
 * Open the real Coles homepage in a clean, non-automation Chrome at a phone
 * viewport and dump the carousel structure/styles + screenshots.
 */
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUT = path.join(process.cwd(), 'scrape', 'shots');
fs.mkdirSync(OUT, { recursive: true });

const MOBILE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: false,
  defaultViewport: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  args: [
    '--disable-blink-features=AutomationControlled',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-features=Translate,AutomationControlled',
    '--window-size=420,900',
    '--lang=en-AU'
  ],
  userDataDir: path.join(process.cwd(), '.tmp', 'chrome-mobile-profile')
});

const page = await browser.newPage();
await page.setUserAgent(MOBILE_UA);
await page.evaluateOnNewDocument(() => {
  Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  Object.defineProperty(navigator, 'languages', { get: () => ['en-AU', 'en'] });
  Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
});

console.log('opening coles.com.au …');
await page.goto('https://www.coles.com.au/', { waitUntil: 'domcontentloaded', timeout: 90000 }).catch((e) => console.log('goto:', e.message));

let ok = false;
for (let i = 0; i < 10; i++) {
  await new Promise((r) => setTimeout(r, 4000));
  const info = await page.evaluate(() => ({
    len: document.documentElement.outerHTML.length,
    text: document.body.innerText.length,
    imgs: document.querySelectorAll('img').length,
    title: document.title
  }));
  console.log(`  t+${(i + 1) * 4}s len=${info.len} text=${info.text} imgs=${info.imgs} title="${info.title}"`);
  if (info.text > 500 && info.imgs > 3) {
    ok = true;
    break;
  }
}

if (!ok) {
  await page.screenshot({ path: path.join(OUT, 'blocked.png') });
  console.log('still blocked — screenshot saved');
  await browser.close();
  process.exit(2);
}

await new Promise((r) => setTimeout(r, 3000));
await page.screenshot({ path: path.join(OUT, 'home-mobile.png') });

const shot = await page.evaluate(() => {
  const pick = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return {
      sel,
      cls: String(el.className).slice(0, 70),
      w: Math.round(r.width),
      h: Math.round(r.height),
      top: Math.round(r.top + window.scrollY),
      display: cs.display,
      position: cs.position,
      bg: cs.backgroundColor,
      pad: cs.padding,
      radius: cs.borderRadius,
      font: cs.fontSize,
      weight: cs.fontWeight,
      color: cs.color,
      aspect: cs.aspectRatio,
      objFit: cs.objectFit,
      overflow: cs.overflow
    };
  };
  return {
    vw: window.innerWidth,
    bodyFont: getComputedStyle(document.body).fontSize,
    hero: pick('[class*="HeroBanner"]'),
    heroImg: pick('[class*="HeroBanner"] img') || pick('[class*="Banner"] img'),
    heroTitle: pick('[class*="BannerTitle"]') || pick('[class*="HeroBanner"] h1') || pick('[class*="HeroBanner"] h2'),
    heroCopy: pick('[class*="BannerText"]') || pick('[class*="bannerCopy"]'),
    heroCta: pick('[class*="HeroBanner"] a[class*="Button"], [class*="HeroBanner"] button'),
    heroDots: pick('[class*="Dots"], [class*="Indicator"]'),
    heroCarousel: pick('[class*="Carousel"]')
  };
});

fs.writeFileSync(path.join(OUT, 'hero-mobile.json'), JSON.stringify(shot, null, 1));
console.log(JSON.stringify(shot, null, 1).slice(0, 3000));

await browser.close();
