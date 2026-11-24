import React from 'react';
import Icon from './Icon.jsx';

export default function QtyStepper({ value, onChange, min = 1, max = 99, size = 'md', label = 'Quantity' }) {
  const dec = () => onChange(Math.max(min, value - 1));
  const inc = () => onChange(Math.min(max, value + 1));

  return (
    <div className={`stepper stepper-${size}`} role="group" aria-label={label}>
      <button type="button" onClick={dec} disabled={value <= min} aria-label="Decrease quantity">
        <Icon name="minus" size={16} />
      </button>
      <input
        type="text"
        inputMode="numeric"
        value={value}
        aria-label={label}
        onChange={(e) => {
          const next = parseInt(e.target.value.replace(/\D/g, ''), 10);
          if (!Number.isNaN(next)) onChange(Math.max(min, Math.min(max, next)));
          else if (e.target.value === '') onChange(min);
        }}
      />
      <button type="button" onClick={inc} disabled={value >= max} aria-label="Increase quantity">
        <Icon name="plus" size={16} />
      </button>
    </div>
  );
}
