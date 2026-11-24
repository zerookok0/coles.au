import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { PROMO, SITE } from '../config.js';
import Icon from './Icon.jsx';

const DEADLINE_KEY = 'coles_promo_deadline';
const SEEN_KEY = 'coles_promo_seen';

function readDeadline() {
  try {
    const raw = localStorage.getItem(DEADLINE_KEY);
    if (raw) return Number(raw);
    const next = Date.now() + PROMO.countdownMinutes * 60 * 1000;
    localStorage.setItem(DEADLINE_KEY, String(next));
    return next;
  } catch (e) {
    return Date.now() + PROMO.countdownMinutes * 60 * 1000;
  }
}

function formatParts(msLeft) {
  const total = Math.max(0, Math.floor(msLeft / 1000));
  return {
    h: String(Math.floor(total / 3600)).padStart(2, '0'),
    m: String(Math.floor((total % 3600) / 60)).padStart(2, '0'),
    s: String(total % 60).padStart(2, '0')
  };
}

export default function PromoPopup() {
  const location = useLocation();
  const [deadline] = useState(readDeadline);
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(Date.now());

  const suppressed = location.pathname.startsWith('/checkout');

  useEffect(() => {
    if (suppressed) return undefined;
    let seen = false;
    try {
      seen = sessionStorage.getItem(SEEN_KEY) === '1';
    } catch (e) {}
    if (seen || deadline <= Date.now()) return undefined;

    const t = setTimeout(() => setOpen(true), 1200);
    return () => clearTimeout(t);
  }, [suppressed, deadline]);

  useEffect(() => {
    if (!open) return undefined;
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, [open]);

  const left = deadline - now;
  const parts = useMemo(() => formatParts(left), [left]);

  useEffect(() => {
    if (open && left <= 0) close();
  }, [left, open]);

  function close() {
    setOpen(false);
    try {
      sessionStorage.setItem(SEEN_KEY, '1');
    } catch (e) {}
  }

  if (!open || left <= 0) return null;

  return (
    <div className="promo-overlay" role="dialog" aria-modal="true" aria-labelledby="promo-title">
      <div className="promo-card">
        <button type="button" className="promo-close" onClick={close} aria-label="Close offer">
          <Icon name="close" size={20} />
        </button>

        <div className="promo-art" aria-hidden="true">
          <span className="promo-sticker">WEEKLY SPECIALS</span>
          <span className="promo-save">
            <b>50%</b>
            <small>off selected favourites</small>
          </span>
          <span className="promo-stamp">+ free delivery over $50</span>
        </div>

        <div className="promo-body">
          <p className="promo-eyebrow">Ends soon · {SITE.name}</p>
          <h2 id="promo-title">{PROMO.headline}</h2>
          <p className="promo-sub">{PROMO.sub}</p>

          <ul className="promo-bullets">
            {PROMO.bullets.map((b) => (
              <li key={b}>
                <Icon name="check" size={16} />
                {b}
              </li>
            ))}
          </ul>

          <div className="promo-countdown" aria-label="Offer countdown">
            <div><b>{parts.h}</b><span>hrs</span></div>
            <i>:</i>
            <div><b>{parts.m}</b><span>min</span></div>
            <i>:</i>
            <div><b>{parts.s}</b><span>sec</span></div>
          </div>

          <div className="promo-actions">
            <Link to="/shop?filter=special" className="btn btn-primary btn-block" onClick={close}>
              {PROMO.cta}
            </Link>
            <button type="button" className="promo-skip" onClick={close}>
              No thanks, keep browsing
            </button>
          </div>
        </div>
      </div>
      <button type="button" className="promo-scrim" aria-label="Close offer" onClick={close} />
    </div>
  );
}
