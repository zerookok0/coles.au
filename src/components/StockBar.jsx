import React from 'react';

export default function StockBar({ stock, maxStock, label }) {
  const max = maxStock || 100;
  const pct = Math.max(4, Math.min(100, Math.round((stock / max) * 100)));
  const state = stock <= 0 ? 'out' : stock <= 5 ? 'low' : stock <= 20 ? 'medium' : 'high';

  return (
    <div className={`stockbar stockbar-${state}`}>
      <div className="stockbar-head">
        <span>{label || (stock <= 0 ? 'Out of stock' : stock <= 5 ? `Low stock — only ${stock} left` : 'In stock')}</span>
        <span className="stockbar-pct">{pct}%</span>
      </div>
      <div className="stockbar-track">
        <i style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
