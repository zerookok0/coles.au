import React from 'react';

const P = {
  search: 'M11 4a7 7 0 1 0 4.2 12.6l4.1 4.1 1.4-1.4-4.1-4.1A7 7 0 0 0 11 4Zm0 2a5 5 0 1 1 0 10 5 5 0 0 1 0-10Z',
  user: 'M12 3a4.2 4.2 0 1 0 0 8.4A4.2 4.2 0 0 0 12 3Zm0 2a2.2 2.2 0 1 1 0 4.4A2.2 2.2 0 0 1 12 5Zm0 8c-3.6 0-6.5 2-6.5 4.5V20h13v-2.5C18.5 15 15.6 13 12 13Zm0 2c2.4 0 4.5 1.2 4.5 2.5V18h-9v-.5C7.5 16.2 9.6 15 12 15Z',
  cart: 'M7 4h2l.6 2H21l-2.2 7.3A2 2 0 0 1 16.9 15H9.6a2 2 0 0 1-1.9-1.5L5.9 6H4V4H7Zm2.8 4 1.7 6h6.1l1.8-6H9.8ZM9.5 17a1.8 1.8 0 1 1 0 3.6 1.8 1.8 0 0 1 0-3.6Zm8 0a1.8 1.8 0 1 1 0 3.6 1.8 1.8 0 0 1 0-3.6Z',
  pin: 'M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7Zm0 2a5 5 0 0 1 5 5c0 3.4-3.6 8.5-5 10.3C10.6 17.5 7 12.4 7 9a5 5 0 0 1 5-5Zm0 2.5A2.5 2.5 0 1 0 12 11a2.5 2.5 0 0 0 0-5Z',
  chevron: 'M9.3 5.3 8 6.6l5.4 5.4L8 17.4l1.3 1.3L16 12Z',
  menu: 'M3 6h18v2H3V6Zm0 5h18v2H3v-2Zm0 5h18v2H3v-2Z',
  close: 'M6.4 5 5 6.4l5.6 5.6L5 17.6 6.4 19l5.6-5.6L17.6 19 19 17.6 13.4 12 19 6.4 17.6 5 12 10.6 6.4 5Z',
  plus: 'M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5Z',
  minus: 'M5 11h14v2H5v-2Z',
  truck: 'M3 5h11v9H3V5Zm12 3h3.4l2.6 3.2V14h-6V8ZM7 15a2.2 2.2 0 1 0 0 4.4A2.2 2.2 0 0 0 7 15Zm9.5 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z',
  clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 2a7 7 0 1 1 0 14 7 7 0 0 1 0-14Zm-1 2v5.6l4 2.4 1-1.7-3-1.8V7h-2Z',
  store: 'M4 4h16l1 5a3 3 0 0 1-2 3v8H5v-8a3 3 0 0 1-2-3l1-5Zm3 2-1 3.2a1 1 0 0 0 2 0L9 6H7Zm4 0-1 3.2a1 1 0 0 0 2 0L13 6h-2Zm4 0-1 3.2a1 1 0 0 0 2 0L17 6h-2Zm-8 6v6h10v-6H7Z',
  check: 'M9.5 17.6 4 12.1l1.4-1.4 4.1 4.1L18.6 5.7 20 7.1 9.5 17.6Z',
  trash: 'M6 7h12v13H6V7Zm3-3h6l1 2h4v2H4V6h4l1-2Z',
  star: 'M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.7l5.9-.9L12 3.5Z',
  tag: 'M12 3h7a2 2 0 0 1 2 2v7l-9 9-9-9 9-9Zm4 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z',
  leaf: 'M5 19c8 0 14-5 14-13V4h-2C9 4 5 10 5 17v2Z',
  shield: 'M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3Z',
  card: 'M3 6h18v3H3V6Zm0 5h18v7H3v-7Zm2 2v3h4v-3H5Z',
  refresh: 'M12 6a6 6 0 0 1 5.7 4h-2.2A4 4 0 1 0 16 13h2.4A6.4 6.4 0 1 1 12 6Zm0-4 4 3-4 3V2Z',
  mail: 'M3 6h18v12H3V6Zm2 2v.6l7 4.4 7-4.4V8H5Zm0 3.2V16h14v-4.8l-7 4.4-7-4.4Z'
};

export default function Icon({ name, size = 22, className = '', title }) {
  const d = P[name] || P.check;
  return (
    <svg
      className={`icon ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden={title ? undefined : 'true'}
      role={title ? 'img' : undefined}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      <path d={d} />
    </svg>
  );
}
