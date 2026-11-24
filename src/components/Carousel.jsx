import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { HEROES } from '../data/catalog.js';
import Icon from './Icon.jsx';

export default function Carousel({ onBrowse }) {
  const [index, setIndex] = useState(0);
  const timer = useRef(null);
  const paused = useRef(false);

  const count = HEROES.length;

  useEffect(() => {
    timer.current = setInterval(() => {
      if (!paused.current) setIndex((i) => (i + 1) % count);
    }, 6000);
    return () => clearInterval(timer.current);
  }, [count]);

  const go = (next) => setIndex(((next % count) + count) % count);
  const slide = HEROES[index];

  return (
    <section
      className="hero"
      aria-roledescription="carousel"
      aria-label="Featured offers"
      onMouseEnter={() => { paused.current = true; }}
      onMouseLeave={() => { paused.current = false; }}
    >
      <div className="hero-track">
        {HEROES.map((h, i) => (
          <div key={h.id} className={`hero-slide ${i === index ? 'is-active' : ''}`} aria-hidden={i !== index}>
            <img src={h.image} alt={h.headline} width="1600" height="620" loading={i === 0 ? 'eager' : 'lazy'} />
          </div>
        ))}
      </div>

      <div className="hero-copy">
        <span className="hero-kicker">{slide.kicker}</span>
        <h2>{slide.headline}</h2>
        <p>{slide.sub}</p>
        <div className="hero-actions">
          <button type="button" className="btn btn-primary" onClick={onBrowse}>
            {slide.cta}
          </button>
          <Link to="/click-collect" className="btn btn-ghost">
            Click &amp; Collect in 2 hours
          </Link>
        </div>
      </div>

      <button type="button" className="hero-arrow hero-prev" onClick={() => go(index - 1)} aria-label="Previous slide">
        <Icon name="chevron" size={26} />
      </button>
      <button type="button" className="hero-arrow hero-next" onClick={() => go(index + 1)} aria-label="Next slide">
        <Icon name="chevron" size={26} />
      </button>

      <div className="hero-dots" role="tablist" aria-label="Slides">
        {HEROES.map((h, i) => (
          <button
            key={h.id}
            type="button"
            role="tab"
            aria-selected={i === index}
            aria-label={`Slide ${i + 1}`}
            className={i === index ? 'is-active' : ''}
            onClick={() => go(i)}
          />
        ))}
      </div>
    </section>
  );
}
