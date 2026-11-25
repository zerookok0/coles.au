/**
 * Headful Chrome, mobile viewport, kept open until the Imperva check passes.
 * The operator can solve the image puzzle in the window; this script then dumps
 * the hero carousel geometry + a screenshot and exits.
 */
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PROFILE = path.join(process.cwd(), '.tmp', 'chrome-mobile-profile2');
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
    '--window-size=430,940',
    '--window-position=60,40',
    '--lang=en-AU'
  ],
  userDataDir: PROFILE
});

const page = (await browser.pages())[0] || (await browser.newPage());
await page.setUserAgent(MOBILE_UA);
await page.evaluateOnNewDocument(() => {
  Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  Object.defineProperty(navigator, 'languages', { get: () => ['en-AU', 'en'] });
});
await page.goto('https://www.coles.com.au/', { waitUntil: 'domcontentloaded', timeout: 90000 }).catch(() => {});

console.log('[wait] 浏览器已打开，若出现图片验证码请在里面点完 → Verify');

let ready = false;
for (let i = 0; i < 110; i++) {
  await new Promise((r) => setTimeout(r, 3000));
  let state = { text: 0, imgs: 0, hero: 0, captcha: false };
  try {
    state = await page.evaluate(() => ({
      text: document.body.innerText.length,
      imgs: document.querySelectorAll('img').length,
      hero: document.querySelectorAll('[class*="HeroBanner"], [class*="heroBanner"]').length,
      captcha: /security check is required|Verify/i.test(document.body.innerText)
    }));
  } catch (e) {}
  if (i % 5 === 0) console.log(`[wait] t+${(i + 1) * 3}s text=${state.text} imgs=${state.imgs} hero=${state.hero} captcha=${state.captcha}`);
  if (state.hero > 0 && state.text > 400) {
    ready = true;
    break;
  }
}

if (!ready) {
  await page.screenshot({ path: path.join(OUT, 'mobile-wait.png') });
  console.log('[wait] 仍未通过验证，截图见 scrape/shots/mobile-wait.png');
  await browser.close();
  process.exit(2);
}

await new Promise((r) => setTimeout(r, 2500));
await page.screenshot({ path: path.join(OUT, 'mobile-home.png') });

const data = await page.evaluate(() => {
  const rect = (el) => {
    const r = el.getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top + window.scrollY) };
  };
  const heroEl = document.querySelector('[class*="HeroBanner"]');
  const out = { vw: window.innerWidth, vh: window.innerHeight, hero: null };
  if (!heroEl) return out;

  const cs = getComputedStyle(heroEl);
  out.hero = {
    cls: String(heroEl.className).slice(0, 90),
    ...rect(heroEl),
    bg: cs.backgroundColor,
    overflow: cs.overflow
  };

  const img = heroEl.querySelector('img');
  if (img) {
    const ics = getComputedStyle(img);
    out.hero.image = { ...rect(img), objFit: ics.objectFit, aspect: ics.aspectRatio, src: img.currentSrc.split('/').pop().slice(0, 60) };
  }

  const texts = [...heroEl.querySelectorAll('h1,h2,h3,p,a,button')]
    .map((n) => {
      const t = getComputedStyle(n);
      const r = n.getBoundingClientRect();
      return {
        tag: n.tagName.toLowerCase(),
        text: (n.textContent || '').trim().slice(0, 46),
        size: t.fontSize,
        weight: t.fontWeight,
        color: t.color,
        bg: t.backgroundColor,
        y: Math.round(r.top + window.scrollY),
        x: Math.round(r.left),
        w: Math.round(r.width),
        h: Math.round(r.height)
      };
    })
    .filter((n) => n.text)
    .slice(0, 14);
  out.hero.items = texts;

  const section = heroEl.parentElement;
  out.section = section ? { cls: String(section.className).slice(0, 80), ...rect(section) } : null;
  return out;
});

fs.writeFileSync(path.join(OUT, 'mobile-hero.json'), JSON.stringify(data, null, 1));
console.log(JSON.stringify(data, null, 1).slice(0, 4000));

await browser.close();
