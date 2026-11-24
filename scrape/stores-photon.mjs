/**
 * Build the full Coles store directory from OpenStreetMap via the Photon
 * geocoder (Overpass is unreachable / at capacity from this network, Photon is
 * fast and returns name, street, suburb, postcode, state and coordinates).
 *
 * Strategy: adaptive quadtree over Australia. A tile that returns fewer than 50
 * results is considered exhausted; a saturated tile (50 hits) is split into four
 * and re-queried, so dense metro areas get the resolution they need.
 *
 * Output: scrape/raw/stores.json
 */
import fs from 'node:fs';
import path from 'node:path';

const RAW = path.join(process.cwd(), 'scrape', 'raw');
fs.mkdirSync(RAW, { recursive: true });

const UA = 'coles-store-directory/1.0 (local build script)';
const LIMIT = 50;
const MAX_REQUESTS = 1200;
const CONCURRENCY = 2;

const ROOT = { minLon: 112.0, minLat: -44.0, maxLon: 154.5, maxLat: -10.0 };
const MIN_SPAN = 0.18; // stop splitting below this many degrees

const stores = new Map();
let requests = 0;
const queue = [{ ...ROOT, depth: 0 }];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function saturated(tile) {
  return (tile.maxLon - tile.minLon) > MIN_SPAN && (tile.maxLat - tile.minLat) > MIN_SPAN;
}

async function query(tile) {
  const bbox = `${tile.minLon},${tile.minLat},${tile.maxLon},${tile.maxLat}`;
  const url = `https://photon.komoot.io/api/?q=coles&limit=${LIMIT}&bbox=${bbox}&lang=en`;
  for (let attempt = 0; attempt < 3; attempt++) {
    requests += 1;
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 20000);
      const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: ctrl.signal });
      clearTimeout(t);
      if (res.status === 200) return (await res.json()).features || [];
      if (res.status === 429) {
        await sleep(2000 * (attempt + 1));
        continue;
      }
      await sleep(400);
    } catch (e) {
      await sleep(600 * (attempt + 1));
    }
  }
  return null;
}

function storeName(props) {
  const place = props.district || props.locality || props.city || props.suburb || props.name;
  return place ? `Coles ${place}` : 'Coles';
}

function absorb(features) {
  let added = 0;
  for (const f of features) {
    const p = f.properties || {};
    if (p.countrycode !== 'AU') continue;
    if (p.osm_value !== 'supermarket') continue;
    if (/express/i.test(p.name || '')) continue;
    if (!/^coles/i.test(p.name || '')) continue;

    const key = `${p.osm_type}${p.osm_id}`;
    if (stores.has(key)) continue;

    const [lon, lat] = f.geometry.coordinates;
    stores.set(key, {
      id: `s${stores.size + 1}`,
      osm: key,
      name: storeName(p),
      street: [p.housenumber, p.street].filter(Boolean).join(' '),
      suburb: p.district || p.locality || p.city || '',
      postcode: p.postcode || '',
      state: (p.state || '').replace(/^Victoria$/, 'VIC').replace(/^New South Wales$/, 'NSW').replace(/^Queensland$/, 'QLD').replace(/^Western Australia$/, 'WA').replace(/^South Australia$/, 'SA').replace(/^Tasmania$/, 'TAS').replace(/^Northern Territory$/, 'NT').replace(/^Australian Capital Territory$/, 'ACT'),
      lat: Number(lat.toFixed(6)),
      lon: Number(lon.toFixed(6))
    });
    added += 1;
  }
  return added;
}

function split(tile) {
  const midLon = (tile.minLon + tile.maxLon) / 2;
  const midLat = (tile.minLat + tile.maxLat) / 2;
  const d = tile.depth + 1;
  return [
    { minLon: tile.minLon, minLat: tile.minLat, maxLon: midLon, maxLat: midLat, depth: d },
    { minLon: midLon, minLat: tile.minLat, maxLon: tile.maxLon, maxLat: midLat, depth: d },
    { minLon: tile.minLon, minLat: midLat, maxLon: midLon, maxLat: tile.maxLat, depth: d },
    { minLon: midLon, minLat: midLat, maxLon: tile.maxLon, maxLat: tile.maxLat, depth: d }
  ];
}

async function worker() {
  while (queue.length && requests < MAX_REQUESTS) {
    const tile = queue.shift();
    if (!tile) break;
    const features = await query(tile);
    if (features === null) continue;
    absorb(features);

    if (features.length >= LIMIT && saturated(tile)) {
      queue.push(...split(tile));
    }
    await sleep(220);
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, worker));

const list = [...stores.values()].sort(
  (a, b) => a.state.localeCompare(b.state) || a.suburb.localeCompare(b.suburb) || a.name.localeCompare(b.name)
);
fs.writeFileSync(path.join(RAW, 'stores.json'), JSON.stringify(list, null, 1));

const byState = list.reduce((acc, s) => {
  acc[s.state || '?'] = (acc[s.state || '?'] || 0) + 1;
  return acc;
}, {});

console.log(`[photon] ${requests} requests · ${list.length} Coles supermarkets`);
console.log('[photon] by state:', JSON.stringify(byState));
console.log('[photon] with postcode:', list.filter((s) => s.postcode).length);
