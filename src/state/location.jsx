import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import { useStore, useToast } from './index.jsx';

/* --------------------------------------------------------------- data cache */
let storeCache = null;
let storePromise = null;

export function loadStores() {
  if (storeCache) return Promise.resolve(storeCache);
  if (storePromise) return storePromise;
  storePromise = fetch('/data/stores.json', { cache: 'no-cache' })
    .then((r) => (r.ok ? r.json() : []))
    .then((list) => {
      storeCache = Array.isArray(list) ? list : [];
      return storeCache;
    })
    .catch(() => {
      storeCache = [];
      return storeCache;
    });
  return storePromise;
}

export function distanceKm(a, b) {
  if (!a || !b) return null;
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Same-day delivery is offered inside the metro ring; outside it, next-day. */
export const SAME_DAY_RADIUS_KM = 25;

export function fulfilmentFor(store, coords) {
  if (!store) return null;
  const km = coords ? distanceKm(coords, store) : null;
  const sameDay = km != null ? km <= SAME_DAY_RADIUS_KM : true;
  return {
    km,
    sameDay,
    deliveryLabel: sameDay ? 'Same-day delivery · order before 2pm' : 'Next-day delivery',
    collectLabel: 'Click & Collect in 2 hours'
  };
}

/** Nearest stores to a postcode, using the store directory as the postcode map. */
export function storesNearPostcode(stores, postcode, limit = 5) {
  const pc = String(postcode || '').replace(/\D/g, '').slice(0, 4);
  if (pc.length < 3) return [];
  const exact = stores.filter((s) => s.postcode === pc);
  if (exact.length) return exact.slice(0, limit);

  const prefix = pc.slice(0, 2);
  const sameRegion = stores
    .filter((s) => s.postcode && s.postcode.slice(0, 2) === prefix)
    .sort((a, b) => Math.abs(Number(a.postcode) - Number(pc)) - Math.abs(Number(b.postcode) - Number(pc)));
  if (sameRegion.length) return sameRegion.slice(0, limit);

  return [...stores]
    .filter((s) => s.postcode)
    .sort((a, b) => Math.abs(Number(a.postcode) - Number(pc)) - Math.abs(Number(b.postcode) - Number(pc)))
    .slice(0, limit);
}

/* ------------------------------------------------------------------ context */
const LocationCtx = createContext(null);

export function LocationProvider({ children }) {
  const [open, setOpen] = useState(false);
  const [postcode, setPostcode] = useState('');
  const [coords, setCoords] = useState(null);
  const [stores, setStores] = useState(null);
  const [geoMsg, setGeoMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const { store, choose } = useStore();
  const { pushToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    loadStores().then(setStores);
  }, []);

  /* first visit in this session: ask for a location instead of silently
     defaulting to a Sydney store */
  useEffect(() => {
    if (store) return undefined;
    let seen = false;
    try {
      seen = sessionStorage.getItem('coles_loc_prompted') === '1';
    } catch (e) {}
    if (seen) return undefined;
    const t = setTimeout(() => {
      setOpen(true);
      try {
        sessionStorage.setItem('coles_loc_prompted', '1');
      } catch (e) {}
    }, 1200);
    return () => clearTimeout(t);
  }, [store]);

  const openPicker = useCallback(() => {
    setOpen(true);
    setGeoMsg('');
  }, []);

  const closePicker = useCallback(() => {
    setOpen(false);
    try {
      sessionStorage.setItem('coles_loc_prompted', '1');
    } catch (e) {}
  }, []);

  const pick = useCallback(
    (picked, fromPostcode) => {
      choose(picked);
      const km = coords ? distanceKm(coords, picked) : null;
      const label = km != null ? `${picked.name} · ${km.toFixed(1)} km away` : picked.name;
      pushToast(`Store set: ${label}`, { href: '/stores', label: 'Change' });
      closePicker();
      setPostcode('');
      if (fromPostcode) {
        try {
          localStorage.setItem('coles_postcode', fromPostcode);
        } catch (e) {}
      }
      // choosing a store is a shopping decision: drop the shopper back on the
      // homepage so prices/stock/promos are shown in the new store context
      if (location.pathname !== '/') navigate('/');
    },
    [choose, coords, pushToast, closePicker, navigate, location.pathname]
  );

  const locate = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoMsg('This browser cannot share your location — enter your postcode instead.');
      return;
    }
    setBusy(true);
    setGeoMsg('Locating…');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        setCoords(c);
        setBusy(false);
        setGeoMsg('Sorted by distance from your current location.');
      },
      () => {
        setBusy(false);
        setGeoMsg('Location permission denied — enter your postcode instead.');
      },
      { timeout: 8000 }
    );
  }, []);

  const value = useMemo(
    () => ({ open: openPicker, close: closePicker, isOpen: open, store, stores }),
    [openPicker, closePicker, open, store, stores]
  );

  return (
    <LocationCtx.Provider value={value}>
      {children}
      {open ? (
        <LocationModal
          stores={stores}
          postcode={postcode}
          setPostcode={setPostcode}
          coords={coords}
          busy={busy}
          geoMsg={geoMsg}
          onLocate={locate}
          onPick={pick}
          onClose={closePicker}
        />
      ) : null}
    </LocationCtx.Provider>
  );
}

export const useLocationPicker = () => useContext(LocationCtx) || { open: () => {}, close: () => {}, isOpen: false };

/* -------------------------------------------------------------------- modal */
function LocationModal({ stores, postcode, setPostcode, coords, busy, geoMsg, onLocate, onPick, onClose }) {
  const results = useMemo(() => {
    if (!stores) return [];
    if (coords) {
      return [...stores]
        .map((s) => ({ ...s, _km: distanceKm(coords, s) }))
        .sort((a, b) => a._km - b._km)
        .slice(0, 5);
    }
    return storesNearPostcode(stores, postcode, 5).map((s) => ({ ...s, _km: null }));
  }, [stores, coords, postcode]);

  const postcodeValid = /^\d{3,4}$/.test(String(postcode || '').trim());

  return (
    <div className="loc-overlay" role="dialog" aria-modal="true" aria-labelledby="loc-title">
      <div className="loc-card">
        <button type="button" className="loc-close" onClick={onClose} aria-label="Close">
          <Icon name="close" size={20} />
        </button>

        <div className="loc-head">
          <span className="loc-pin">
            <Icon name="pin" size={22} />
          </span>
          <div>
            <h2 id="loc-title">Set your location</h2>
            <p>Enter your postcode so we can show delivery times, stores and prices for your area.</p>
          </div>
        </div>

        <form
          className="loc-form"
          onSubmit={(e) => {
            e.preventDefault();
            const first = results[0];
            if (first) onPick(first, String(postcode).trim());
          }}
        >
          <label className="loc-field">
            <span>Postcode</span>
            <input
              value={postcode}
              onChange={(e) => setPostcode(e.target.value.replace(/\D/g, '').slice(0, 4))}
              inputMode="numeric"
              placeholder="2000"
              autoComplete="postal-code"
              aria-label="Postcode"
            />
          </label>
          <button type="submit" className="btn btn-primary" disabled={!postcodeValid || !results.length}>
            Find stores
          </button>
        </form>

        <button type="button" className="loc-locate" onClick={onLocate} disabled={busy}>
          <Icon name="pin" size={16} />
          {busy ? 'Locating…' : 'Use my current location'}
        </button>

        {geoMsg ? <p className="loc-msg">{geoMsg}</p> : null}

        <p className="loc-label">{coords ? 'Nearest stores' : postcodeValid ? `Stores near ${postcode}` : 'Popular stores'}</p>

        <ul className="loc-results">
          {!stores ? (
            <li className="loc-empty">Loading stores…</li>
          ) : results.length === 0 ? (
            <li className="loc-empty">No store matched that postcode — try the store list.</li>
          ) : (
            results.map((s) => {
              const f = fulfilmentFor(s, coords);
              return (
                <li key={s.id}>
                  <button type="button" className="loc-option" onClick={() => onPick(s, String(postcode).trim())}>
                    <span>
                      <b>{s.name}</b>
                      <small>{[s.street, s.suburb, s.state, s.postcode].filter(Boolean).join(', ')}</small>
                      <em>
                        {f && f.km != null ? `${f.km.toFixed(1)} km · ` : ''}
                        {f ? f.deliveryLabel : ''}
                      </em>
                    </span>
                    <span className="loc-option-cta">Choose</span>
                  </button>
                </li>
              );
            })
          )}
        </ul>

        <a className="loc-all" href="/stores" onClick={onClose}>
          Browse all {stores ? stores.length : ''} stores
        </a>
      </div>
      <button type="button" className="loc-scrim" aria-label="Close" onClick={onClose} />
    </div>
  );
}
