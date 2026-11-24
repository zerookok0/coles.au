/**
 * Fill gaps in the store directory: dense Photon sweep around each metro core.
 * The first pass used coarse tiles and Photon's 50-result cap hid busy CBDs.
 *
 * Merges into scrape/raw/stores.json.
 */
import fs from 'node:fs';
import path from 'node:path';

const FILE = path.join(process.cwd(), 'scrape', 'raw', 'stores.json');
const UA = 'coles-store-directory/1.0 (local build script)';
const stores = new Map();

for (const s of JSON.parse(fs.readFileSync(FILE, 'utf8'))) {
  stores.set(s.osm || `${s.name}|${s.lat},${s.lon}`, s);
}

// [label, lat, lon, gridSize, step]
const CENTRES = [
  ['Sydney CBD', -33.8688, 151.2093, 3, 0.05],
  ['Parramatta', -33.815, 151.001, 3, 0.05],
  ['Bondi', -33.891, 151.262, 3, 0.04],
  ['Chatswood', -33.797, 151.183, 1, 0.06],
  ['Liverpool', -33.92, 150.924, 1, 0.08],
  ['Penrith', -33.751, 150.694, 1, 0.08],
  ['Melbourne CBD', -37.8136, 144.9631, 3, 0.05],
  ['St Kilda', -37.868, 144.981, 1, 0.06],
  ['Box Hill', -37.819, 145.121, 1, 0.06],
  ['Werribee', -37.9, 144.664, 1, 0.08],
  ['Brisbane CBD', -27.4698, 153.0251, 3, 0.05],
  ['Gold Coast', -28.017, 153.4, 3, 0.06],
  ['Sunshine Coast', -26.65, 153.066, 2, 0.08],
  ['Perth CBD', -31.9523, 115.8613, 3, 0.05],
  ['Fremantle', -32.056, 115.748, 1, 0.06],
  ['Joondalup', -31.745, 115.766, 1, 0.08],
  ['Adelaide CBD', -34.9285, 138.6007, 3, 0.05],
  ['Elizabeth', -34.719, 138.669, 1, 0.08],
  ['Canberra', -35.2809, 149.13, 3, 0.05],
  ['Belconnen', -35.238, 149.066, 1, 0.06],
  ['Hobart', -42.8821, 147.3272, 2, 0.06],
  ['Darwin', -12.4634, 130.8456, 2, 0.06],
  ['Newcastle', -32.9283, 151.7817, 2, 0.06],
  ['Wollongong', -34.4278, 150.8931, 2, 0.06],
  ['Geelong', -38.1499, 144.3617, 1, 0.08],
  ['Cairns', -16.9186, 145.7781, 1, 0.08],
  ['Townsville', -19.259, 146.8169, 1, 0.08],
  ['Toowoomba', -27.5598, 151.9507, 1, 0.08],
  ['Ballarat', -37.5622, 143.8503, 1, 0.08],
  ['Bendigo', -36.757, 144.2794, 1, 0.08],
  ['Launceston', -41.4332, 147.1441, 1, 0.08],
  ['Albury', -36.0737, 146.9135, 1, 0.08],
  ['Wagga Wagga', -35.1082, 147.3598, 1, 0.08],
  ['Mackay', -21.1411, 149.1861, 1, 0.08],
  ['Rockhampton', -23.3791, 150.5100, 1, 0.08],
  ['Bunbury', -33.3271, 115.6413, 1, 0.08],
  ['Mandurah', -32.5367, 115.7427, 1, 0.08],
  ['Geraldton', -28.7774, 114.6149, 1, 0.08],
  ['Port Macquarie', -31.4333, 152.9083, 1, 0.08],
  ['Coffs Harbour', -30.2963, 153.1155, 1, 0.08],
  ['Tamworth', -31.0927, 150.9320, 1, 0.08],
  ['Dubbo', -32.2569, 148.6011, 1, 0.08],
  ['Orange', -33.2839, 149.1000, 1, 0.08],
  ['Mildura', -34.1856, 142.1625, 1, 0.08],
  ['Shepparton', -36.3833, 145.4000, 1, 0.08],
  ['Warrnambool', -38.3833, 142.4833, 1, 0.08],
  ['Devonport', -41.1800, 146.3500, 1, 0.08],
  ['Alice Springs', -23.6980, 133.8807, 1, 0.08]
];

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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let added = 0;
let requests = 0;

function absorb(features) {
  let n = 0;
  for (const f of features) {
    const p = f.properties || {};
    if (p.countrycode !== 'AU' || p.osm_value !== 'supermarket') continue;
    if (!/^coles/i.test(p.name || '') || /express/i.test(p.name || '')) continue;
    const key = `${p.osm_type}${p.osm_id}`;
    if (stores.has(key)) continue;
    const [lon, lat] = f.geometry.coordinates;
    const place = p.district || p.locality || p.city || p.suburb || p.name;
    stores.set(key, {
      id: `s${stores.size + 1}`,
      osm: key,
      name: place ? `Coles ${place}` : 'Coles',
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

async function query(minLon, minLat, maxLon, maxLat) {
  const url = `https://photon.komoot.io/api/?q=coles&limit=50&bbox=${minLon},${minLat},${maxLon},${maxLat}&lang=en`;
  for (let attempt = 0; attempt < 3; attempt++) {
    requests += 1;
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 20000);
      const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: ctrl.signal });
      clearTimeout(t);
      if (res.status === 200) return (await res.json()).features || [];
      await sleep(2500 * (attempt + 1));
    } catch (e) {
      await sleep(2500 * (attempt + 1));
    }
  }
  return null;
}

for (const [label, lat, lon, grid, step] of CENTRES) {
  let got = 0;
  const half = ((grid - 1) / 2) * step;
  for (let r = 0; r < grid; r++) {
    for (let c = 0; c < grid; c++) {
      const clat = lat - half + r * step;
      const clon = lon - half + c * step;
      const features = await query(
        (clon - step / 2).toFixed(4),
        (clat - step / 2).toFixed(4),
        (clon + step / 2).toFixed(4),
        (clat + step / 2).toFixed(4)
      );
      if (features) got += absorb(features);
      await sleep(1300);
    }
  }
  added += got;
  console.log(`[fill] ${label}: +${got} (total ${stores.size})`);
}

const list = [...stores.values()]
  .filter((s) => s.name && Number.isFinite(s.lat))
  .sort((a, b) => a.state.localeCompare(b.state) || a.suburb.localeCompare(b.suburb) || a.name.localeCompare(b.name));

fs.writeFileSync(FILE, JSON.stringify(list, null, 1));
console.log(`[fill] done: ${list.length} stores (+${added}) · ${requests} requests`);
