import React from 'react';

export default function Rating({ value = 4.5, count = 0, size = 14, showCount = true, className = '' }) {
  const rounded = Math.round(value * 2) / 2;
  const stars = [1, 2, 3, 4, 5].map((i) => {
    const fill = rounded >= i ? 1 : rounded >= i - 0.5 ? 0.5 : 0;
    return <Star key={i} fill={fill} size={size} />;
  });

  return (
    <span className={`rating ${className}`} aria-label={`Rated ${value} out of 5`}>
      <span className="rating-stars">{stars}</span>
      <span className="rating-value">{value.toFixed(1)}</span>
      {showCount ? <span className="rating-count">({count.toLocaleString()})</span> : null}
    </span>
  );
}

function Star({ fill, size }) {
  const id = `g${Math.random().toString(36).slice(2, 8)}`;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="rating-star">
      <defs>
        <linearGradient id={id}>
          <stop offset={`${fill * 100}%`} stopColor="#F5A623" />
          <stop offset={`${fill * 100}%`} stopColor="#d8d8d8" />
        </linearGradient>
      </defs>
      <path
        d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.7l5.9-.9L12 3.5Z"
        fill={`url(#${id})`}
        stroke="#F5A623"
        strokeWidth="0.6"
      />
    </svg>
  );
}
