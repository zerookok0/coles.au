/**
 * Refinement pass: dense 0.25° grid over the metro areas (Photon is rate
 * limited, so throttle hard and retry on connection resets).
 * Merges into the existing scrape/raw/stores.json.
 */
import fs from 'node:fs';
import path from 'node:path';

const RAW = path.join(process.cwd(), 'scrape', 'raw');
const FILE = path.join(RAW, 'stores.json');
const UA = 'coles-store-directory/1.0 (local build script)';

const existing = fs.existsSync(FILE) ? JSON.parse(fs.readFileSync(FILE, 'utf8')) : [];
const stores = new Map(existing.map((s) => [s.osm || `${s.name}@${s.lat},${s.lon}`, s]));

const METROS = [
  ['Sydney', 150.4, -34.2, 151.4, -33.4],
  ['Melbourne', 144.4, -38.3, 145.6, -37.4],
  ['Brisbane', 152.6, -27.8, 153.5, -26.9],
  ['Perth', 115.6, -32.4, 116.3, -31.5],
  ['Adelaide', 138.3, -35.3, 138.9, -34.6],
  ['GoldCoast', 153.1, -28.3, 153.6, -27.7],
  ['Newcastle', 151.4, -33.2, 152.0, -32.7],
  ['Canberra', 148.8, -35.6, 149.4, -35.0],
  ['Wollongong', 150.6, -34.7, 151.0, -34.1],
  ['SunshineCoast', 152.8, -26.9, 153.3, -26.4],
  ['Hobart', 147.0, -43.2, 147.5, -42.7],
  ['Darwin', 130.7, -12.7, 131.1, -12.2],
  ['Geelong', 144.1, -38.4, 144.6, -37.9],
  ['CentralCoast', 151.1, -33.6, 151.6, -33.2],
  ['Cairns', 145.6, -17.1, 145.9, -16.8],
  ['Townsville', 146.6, -19.4, 146.9, -19.1],
  ['Toowoomba', 151.8, -27.7, 152.1, -27.4],
  ['Ballarat', 143.7, -37.7, 144.0, -37.4],
  ['Bendigo', 144.2, -36.9, 144.5, -36.6],
  ['Launceston', 147.0, -41.6, 147.3, -41.3],
  ['Albury', 146.8, -36.2, 147.1, -35.9],
  ['WaggaWagga', 147.2, -35.3, 147.5, -35.0],
  ['Mackay', 149.1, -21.3, 149.4, -21.0],
  ['Rockhampton', 150.4, -23.5, 150.7, -23.2],
  ['Bunbury', 115.5, -33.4, 115.8, -33.2],
  ['Mandurah', 115.6, -32.7, 115.9, -32.4],
  ['Geraldton', 114.5, -28.9, 114.8, -28.6]
];

const STEP = 0.25;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function nameOf(p) {
  const place = p.district || p.locality || p.city || p.suburb || p.name;
  return place ? `Coles ${place}` : 'Coles';
}

const STATE_MAP = {
  Victoria: 'VIC',
  'New South Wales': 'NSW',
  Queensland: 'QLD',
  'Western Australia': 'WA',
  'South Australia': 'SA',
  Tasmania: 'TAS',
  'Northern Territory': 'NT',
  'Australian Capital Territory': 'ACT'
};

let requests = 0;
let added = 0;

async function queryCell(minLon, minLat, maxLon, maxLat) {
  const url = `https://photon.komoot.io/api/?q=coles&limit=50&bbox=${minLon},${minLat},${maxLon},${maxLat}&lang=en`;
  for (let attempt = 0; attempt < 4; attempt++) {
    requests += 1;
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 20000);
      const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: ctrl.signal });
      clearTimeout(t);
      if (res.status === 200) return (await res.json()).features || [];
      if (res.status === 429) {
        await sleep(4000 * (attempt + 1));
        continue;
      }
      await sleep(1500);
    } catch (e) {
      await sleep(2500 * (attempt + 1));
    }
  }
  return null;
}

function absorb(features) {
  let n = 0;
  for (const f of features) {
    const p = f.properties || {};
    if (p.countrycode !== 'AU' || p.osm_value !== 'supermarket') continue;
    if (!/^coles/i.test(p.name || '') || /express/i.test(p.name || '')) continue;

    const key = `${p.osm_type}${p.osm_id}`;
    if (stores.has(key)) continue;
    const [lon, lat] = f.geometry.coordinates;
    stores.set(key, {
      id: `s${stores.size + 1}`,
      osm: key,
      name: nameOf(p),
      street: [p.housenumber, p.street].filter(Boolean).join(' '),
      suburb: p.district || p.locality || p.city || '',
      postcode: p.postcode || '',
      state: STATE_MAP[p.state] || p.state || '',
      lat: Number(lat.toFixed(6)),
      lon: Number(lon.toFixed(6))
    });
    n += 1;
  }
  return n;
}

for (const [label, minLon, minLat, maxLon, maxLat] of METROS) {
  const cols = Math.ceil((maxLon - minLon) / STEP);
  const rows = Math.ceil((maxLat - minLat) / STEP);
  let metroAdded = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const a = minLon + c * STEP;
      const b = minLat + r * STEP;
      const features = await queryCell(a.toFixed(3), b.toFixed(3), (a + STEP).toFixed(3), (b + STEP).toFixed(3));
      if (features) metroAdded += absorb(features);
      await sleep(1100);
    }
  }
  added += metroAdded;
  console.log(`[refine] ${label}: +${metroAdded} (total ${stores.size}, ${requests} req)`);
}

const list = [...stores.values()]
  .filter((s) => s.name && Number.isFinite(s.lat))
  .sort((a, b) => a.state.localeCompare(b.state) || a.suburb.localeCompare(b.suburb) || a.name.localeCompare(b.name));

fs.writeFileSync(FILE, JSON.stringify(list, null, 1));
console.log(`[refine] done: ${list.length} stores · +${added} this pass · ${requests} requests`);
