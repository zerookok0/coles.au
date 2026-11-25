/** Does the hero model carry a mobile-specific image? */
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const html = await (await fetch('https://web.archive.org/web/2024id_/https://www.coles.com.au/', { headers: { 'User-Agent': UA } })).text();
const json = JSON.parse(html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i)[1]);
const blob = JSON.stringify(json.props.pageProps.data);

const keys = [...new Set([...blob.matchAll(/"([A-Za-z]*[Mm]obile[A-Za-z]*)"/g)].map((m) => m[1]))];
console.log('mobile-related keys:', keys);

const hero = json.props.pageProps.data[':items'].root[':items'].responsivegrid[':items'];
const carousel = Object.values(hero).find((v) => v && v[':type'] && v[':type'].endsWith('carouselContainer'));
if (carousel) {
  const banners = Object.values(carousel[':items'] || {}).filter((b) => b && b[':type'] && b[':type'].endsWith('herobanner'));
  console.log('banners:', banners.length);
  for (const b of banners.slice(0, 2)) {
    console.log(Object.keys(b).filter((k) => !k.startsWith(':')).join(', '));
    console.log(JSON.stringify({ title: b.bannerTitle, desktop: b.backgroundImgDesktopSrc, mobile: b.backgroundImgMobileSrc, alt: b.backgroundImgAlt, roundel: b.centerImage, roundelPlacement: b.roundelPlacement, roundelSize: b.roundelSize }, null, 1));
  }
} else {
  console.log('carousel not found in this path; keys:', Object.keys(hero).slice(0, 12));
}
