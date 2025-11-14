import React from 'react';
import { countryToAlpha2 } from './countryToAlpha2';

export function SVGFlag({ country, size = 20, style = {}, className = '' }) {
  const code = countryToAlpha2(country);
  if (!code) return <span style={{ ...style, width: size, display: 'inline-block' }} className={className}>🌐</span>;
  return (
    <span
      className={`fi fi-${code.toLowerCase()} ${className}`}
      title={country}
      style={{ width: size * 1.333, height: size, display: 'inline-block', ...style }}
    />
  );
}
