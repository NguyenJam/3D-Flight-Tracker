import React from 'react';
import './ScaleDistance.css';

function niceRound(nm) {
  if (nm >= 5000) return Math.round(nm / 1000) * 1000;
  if (nm >= 1000) return Math.round(nm / 100) * 100;
  if (nm >= 100) return Math.round(nm / 10) * 10;
  if (nm >= 10) return Math.round(nm);
  return Math.round(nm * 10) / 10;
}

export default function ScaleDistance({ nm = null, thresholdNM = 50, inline = false }) {
  if (nm === null || nm === undefined) return null;
  const displayNm = niceRound(nm);
  if (displayNm < thresholdNM) return null;
  const rootClass = inline ? 'scale-distance-root inline' : 'scale-distance-root';
  return (
    <div className={rootClass} aria-hidden>
      <div className="scale-distance-box">{displayNm.toLocaleString()} NM</div>
    </div>
  );
}