/**
 * Build the store directory from OpenStreetMap.
 *
 * Coles' own store locator is behind the same Imperva wall as the rest of the
 * site, so the shop list comes from OSM (brand=Coles, shop=supermarket), which
 * carries name, street address, suburb, postcode, state, phone, opening hours
 * and coordinates — everything a customer-facing store finder needs.
 *
 * Output: scrape/raw/stores.json
 */
import fs from 'node:fs';
import path from 'node:path';

const RAW = path.join(process.cwd(), 'scrape', 'raw');
fs.mkdirSync(RAW, { recursive: true });

const UA = 'coles-store-directory/1.0 (local build script)';
const ENDPOINTS = [
  'https://z.overpass-api.de/api/interpreter',
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter'
];

const AREAS = [
  ['NSW', -37.6, 140.9, -28.1, 153.7],
  ['VIC', -39.2, 140.9, -33.9, 150.2],
  ['QLD', -29.2, 138.0, -9.9, 153.6],
  ['SA', -38.1, 129.0, -25.9, 141.1],
  ['WA', -35.2, 112.9, -13.6, 129.1],
  ['TAS', -43.7, 143.8, -39.5, 148.4],
  ['NT', -26.0, 129.0, -10.9, 138.1],
  ['ACT', -35.95, 148.75, -35.1, 149.4]
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function overpass(query) {
  for (const ep of ENDPOINTS) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 240000);
        const res = await fetch(ep, {
          method: 'POST',
          headers: { 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded' },
          body: 'data=' + encodeURIComponent(query),
          signal: ctrl.signal
        });
        clearTimeout(timer);
        if (res.status === 200) {
          const text = await res.text();
          try {
            return JSON.parse(text);
          } catch (e) {
            console.log(`[warn] ${ep} returned non-JSON (${text.slice(0, 80)})`);
          }
        } else {
          console.log(`[warn] ${ep} -> ${res.status}`);
        }
      } catch (e) {
        console.log(`[warn] ${ep} ${e.message}`);
      }
      await sleep(3000 * (attempt + 1));
    }
  }
  return null;
}

const stores = new Map();

for (const [state, s, w, n, e] of AREAS) {
  const bbox = `${s},${w},${n},${e}`;
  const query = `[out:json][timeout:180];
(
  nwr["brand"="Coles"]["shop"="supermarket"](${bbox});
  nwr["name"~"^Coles ",i]["shop"="supermarket"](${bbox});
);
out center tags;`;

  console.log(`[osm] ${state} …`);
  const data = await overpass(query);
  if (!data || !data.elements) {
    console.log(`[osm] ${state} failed`);
    continue;
  }

  let added = 0;
  for (const el of data.elements) {
    const t = el.tags || {};
    const name = (t.name || 'Coles').trim();
    if (!/^coles/i.test(name)) continue;
    if (/coles express/i.test(name)) continue; // fuel/convenience, not a supermarket

    const lat = el.lat != null ? el.lat : el.center && el.center.lat;
    const lon = el.lon != null ? el.lon : el.center && el.center.lon;
    if (lat == null || lon == null) continue;

    const key = `${name.toLowerCase()}|${lat.toFixed(3)}|${lon.toFixed(3)}`;
    if (stores.has(key)) continue;

    stores.set(key, {
      id: `s${stores.size + 1}`,
      name,
      street: [t['addr:housenumber'], t['addr:street']].filter(Boolean).join(' '),
      suburb: t['addr:suburb'] || t['addr:city'] || '',
      postcode: t['addr:postcode'] || '',
      state: (t['addr:state'] || state).toUpperCase().slice(0, 3),
      phone: t.phone || t['contact:phone'] || '',
      hours: t.opening_hours || '',
      lat: Number(lat.toFixed(6)),
      lon: Number(lon.toFixed(6))
    });
    added += 1;
  }
  console.log(`[osm] ${state}: +${added} (total ${stores.size})`);
  await sleep(1500);
}

const list = [...stores.values()].sort((a, b) => a.state.localeCompare(b.state) || a.suburb.localeCompare(b.suburb) || a.name.localeCompare(b.name));
fs.writeFileSync(path.join(RAW, 'stores.json'), JSON.stringify(list, null, 1));

const withPostcode = list.filter((s) => s.postcode).length;
console.log(`[osm] done: ${list.length} stores · ${withPostcode} with postcode · states: ${[...new Set(list.map((s) => s.state))].join(',')}`);
