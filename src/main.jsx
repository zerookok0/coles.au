import React from 'react';
import { createRoot, } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { initPixel } from './fb.js';
import './styles/store.css';

/**
 * Bootstrap order matters:
 *  1. fetch the real catalog (JSON asset, not bundled — keeps the shell small),
 *  2. hand it to the data layer through window.__CATALOG__,
 *  3. only then import the app so src/data/catalog.js sees the data.
 */
async function boot() {
  const root = document.getElementById('root');

  try {
    const res = await fetch('/data/catalog.json', { cache: 'no-cache' });
    window.__CATALOG__ = res.ok ? await res.json() : { products: [], categories: [], departments: [], heroes: [] };
  } catch (e) {
    window.__CATALOG__ = { products: [], categories: [], departments: [], heroes: [] };
  }

  const { default: App } = await import('./App.jsx');

  initPixel();

  createRoot(root).render(
    <React.StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.StrictMode>
  );
}

boot();
