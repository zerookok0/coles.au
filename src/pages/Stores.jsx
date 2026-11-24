import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import { Breadcrumbs } from '../components/Layout.jsx';
import { useStore } from '../state/index.jsx';

const STATES = ['ALL', 'NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'NT', 'ACT'];

function distanceKm(a, b) {
  if (!a || !b) return null;
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export default function Stores() {
  const { store: selected, choose } = useStore();
  const [all, setAll] = useState(null);
  const [q, setQ] = useState('');
  const [stateFilter, setStateFilter] = useState('ALL');
  const [coords, setCoords] = useState(null);
  const [geoMsg, setGeoMsg] = useState('');
  const [visible, setVisible] = useState(60);

  useEffect(() => {
    let alive = true;
    fetch('/data/stores.json', { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => alive && setAll(Array.isArray(data) ? data : []))
      .catch(() => alive && setAll([]));
    return () => {
      alive = false;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!all) return [];
    const term = q.trim().toLowerCase();
    let list = all.filter((s) => (stateFilter === 'ALL' ? true : s.state === stateFilter));
    if (term) {
      list = list.filter((s) =>
        `${s.name} ${s.suburb} ${s.postcode} ${s.street} ${s.state}`.toLowerCase().includes(term)
      );
    }
    if (coords) {
      list = list
        .map((s) => ({ ...s, _km: distanceKm(coords, s) }))
        .sort((a, b) => a._km - b._km);
    }
    return list;
  }, [all, q, stateFilter, coords]);

  useEffect(() => {
    setVisible(60);
  }, [q, stateFilter, coords]);

  function locate() {
    if (!navigator.geolocation) {
      setGeoMsg('This browser does not support location sharing.');
      return;
    }
    setGeoMsg('Locating…');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setGeoMsg('Sorted by distance from your current location.');
      },
      () => setGeoMsg('Location permission denied — search by suburb or postcode instead.'),
      { timeout: 8000 }
    );
  }

  const counts = useMemo(() => {
    if (!all) return {};
    return all.reduce((acc, s) => {
      acc[s.state] = (acc[s.state] || 0) + 1;
      return acc;
    }, {});
  }, [all]);

  return (
    <div className="container storespage">
      <Breadcrumbs items={[{ label: 'Store locator' }]} />

      <header className="stores-head">
        <div>
          <h1>Find a Coles store</h1>
          <p>
            {all ? `${all.length} stores` : 'Loading stores…'} · free Click &amp; Collect in 2 hours · same-day delivery
            in metro areas
          </p>
        </div>
        {selected ? (
          <div className="stores-current">
            <span>Your store</span>
            <b>{selected.name}</b>
            <small>{[selected.suburb, selected.state, selected.postcode].filter(Boolean).join(' · ')}</small>
          </div>
        ) : null}
      </header>

      <div className="stores-controls">
        <label className="stores-search">
          <Icon name="search" size={18} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by suburb, postcode or store name"
            aria-label="Search stores"
          />
        </label>
        <button type="button" className="btn btn-outline" onClick={locate}>
          <Icon name="pin" size={16} />
          Use my location
        </button>
      </div>

      <div className="stores-states" role="tablist" aria-label="Filter by state">
        {STATES.map((s) => (
          <button
            key={s}
            type="button"
            role="tab"
            aria-selected={stateFilter === s}
            className={stateFilter === s ? 'is-active' : ''}
            onClick={() => setStateFilter(s)}
          >
            {s === 'ALL' ? `All states${all ? ` (${all.length})` : ''}` : `${s}${counts[s] ? ` (${counts[s]})` : ''}`}
          </button>
        ))}
      </div>

      {geoMsg ? <p className="stores-geomsg">{geoMsg}</p> : null}

      {all === null ? (
        <p className="stores-loading">Loading store directory…</p>
      ) : filtered.length === 0 ? (
        <div className="empty">
          <Icon name="pin" size={34} />
          <h2>No stores matched</h2>
          <p>Try a different suburb or postcode.</p>
        </div>
      ) : (
        <>
          <ul className="storelist">
            {filtered.slice(0, visible).map((s) => {
              const isCurrent = selected && selected.id === s.id;
              return (
                <li key={s.id} className={`storeitem ${isCurrent ? 'is-current' : ''}`}>
                  <div className="storeitem-main">
                    <b>{s.name}</b>
                    <span className="storeitem-addr">
                      {[s.street, s.suburb, s.state, s.postcode].filter(Boolean).join(', ')}
                    </span>
                    <span className="storeitem-meta">
                      {s._km != null ? `${s._km.toFixed(1)} km away · ` : ''}
                      Click &amp; Collect in 2 hours · same-day delivery
                    </span>
                    {s.hours ? <span className="storeitem-hours">{s.hours}</span> : null}
                  </div>
                  <div className="storeitem-actions">
                    <button
                      type="button"
                      className={`btn ${isCurrent ? 'btn-ghost' : 'btn-primary'} btn-sm`}
                      onClick={() => choose(s)}
                      disabled={isCurrent}
                    >
                      {isCurrent ? 'Current store' : 'Set as my store'}
                    </button>
                    <Link className="storeitem-link" to={`/shop`}>
                      Shop this store
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
          {visible < filtered.length ? (
            <div className="stores-more">
              <button type="button" className="btn btn-outline" onClick={() => setVisible((v) => v + 60)}>
                Show {Math.min(60, filtered.length - visible)} more stores
              </button>
            </div>
          ) : null}
          <p className="stores-foot">
            Showing {Math.min(visible, filtered.length)} of {filtered.length}{' '}
            {filtered.length === 1 ? 'store' : 'stores'}
            {stateFilter !== 'ALL' ? ` in ${stateFilter}` : ''}
            {q ? ` matching “${q}”` : ''}
            {coords ? ' · nearest first' : ' · alphabetical'}. Store data: OpenStreetMap.
          </p>
        </>
      )}
    </div>
  );
}
