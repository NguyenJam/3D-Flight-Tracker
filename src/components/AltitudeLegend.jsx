import React from 'react';
import './AltitudeLegend.css';

// Orange (low) -> yellow -> lime -> green -> cyan -> blue -> purple (high)
const COLOR_STOPS = [
	{ altFt: 0, color: '#f36a35' },
	{ altFt: 500, color: '#f4873d' },
	{ altFt: 1000, color: '#f3a446' },
	{ altFt: 2000, color: '#eec24e' },
	{ altFt: 4000, color: '#cfd34b' },
	{ altFt: 6000, color: '#a8d548' },
	{ altFt: 8000, color: '#7ed04c' },
	{ altFt: 10000, color: '#4fc55a' },
	{ altFt: 20000, color: '#31a9ce' },
	{ altFt: 30000, color: '#3c6ed1' },
	{ altFt: 40000, color: '#7b2cd3' },
	{ altFt: 42000, color: '#8a2be2' },
];

// Tick labels
const TICKS = [
	0, 500, 1000, 2000, 4000, 6000, 8000, 10000, 20000, 30000, 40000
];

const SIDEBAR_TICKS = [0, 2000, 4000, 8000, 20000, 30000, 40000];
const SCALE_EXPONENT = 0.72;
const scalePct = (altFt, minFt = 0, maxFt = 40000) => {
	const clamped = Math.max(minFt, Math.min(maxFt, altFt));
	const t = (clamped - minFt) / (maxFt - minFt);
	const s = Math.pow(t, SCALE_EXPONENT);
	return s * 100; // percentage
};

const pctFor = (altFt, minFt = 0, maxFt = 40000) => {
	if (altFt === 500) {
		const p0 = scalePct(0, minFt, maxFt);
		const p1000 = scalePct(1000, minFt, maxFt);
		return (p0 + p1000) / 2;
	}
	return scalePct(altFt, minFt, maxFt);
};

function buildGradientCSS(minFt = 0, maxFt = 40000) {
	const stops = COLOR_STOPS.map(({ altFt, color }) => {
		const pct = pctFor(altFt, minFt, maxFt);
		return `${color} ${pct}%`;
	});
	return `linear-gradient(90deg, ${stops.join(', ')})`;
}

export const altitudeToColor = (altMeters) => {
	// Convert to feet for mapping
	const altFt = Math.max(0, (altMeters || 0) * 3.28084);
	if (altFt <= COLOR_STOPS[0].altFt) return COLOR_STOPS[0].color;
	const last = COLOR_STOPS[COLOR_STOPS.length - 1];
	if (altFt >= last.altFt) return last.color;
	for (let i = 0; i < COLOR_STOPS.length - 1; i++) {
		const a = COLOR_STOPS[i];
		const b = COLOR_STOPS[i + 1];
		if (altFt >= a.altFt && altFt <= b.altFt) {
			const t = (altFt - a.altFt) / (b.altFt - a.altFt);
			// Interpolate colors
			const ca = hexToRgb(a.color);
			const cb = hexToRgb(b.color);
			const r = Math.round(ca.r + (cb.r - ca.r) * t);
			const g = Math.round(ca.g + (cb.g - ca.g) * t);
			const bch = Math.round(ca.b + (cb.b - ca.b) * t);
			return rgbToHex(r, g, bch);
		}
	}
	return last.color;
};

function hexToRgb(hex) {
	const parsed = hex.replace('#', '');
	const bigint = parseInt(parsed, 16);
	return {
		r: (bigint >> 16) & 255,
		g: (bigint >> 8) & 255,
		b: bigint & 255,
	};
}

function rgbToHex(r, g, b) {
	return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');
}

const AltitudeLegend = ({ onAltitudeChange, layout = 'overlay' } = {}) => {
	const minFt = 0;
	const maxFt = 40000;
	const gradient = buildGradientCSS(minFt, maxFt);
	const containerClassName = React.useMemo(() => (
		`alt-legend-container ${layout === 'sidebar' ? 'sidebar' : 'overlay'}`
	), [layout]);

	const barRef = React.useRef(null);
	const [barWidth, setBarWidth] = React.useState(0);
	React.useLayoutEffect(() => {
		const el = barRef.current;
		if (!el) return;
		const update = () => setBarWidth(Math.round(el.clientWidth));
		update();
		const ro = new ResizeObserver(update);
		ro.observe(el);
		window.addEventListener('resize', update);
		return () => {
			ro.disconnect();
			window.removeEventListener('resize', update);
		};
	}, []);

	const effectiveTicks = layout === 'sidebar' ? SIDEBAR_TICKS : TICKS;

	// Precompute tick render info
	let renderTicks = [];
	{
		const usedPx = new Set();
		const duplicateStacks = new Map();
		const lastIndex = effectiveTicks.length - 1;
		renderTicks = effectiveTicks.map((tick, idx) => {
			const pct = pctFor(tick, minFt, maxFt);
			const isLast = idx === lastIndex;
			let leftStyle;
			let showLine = !isLast;
			let stackLevel = 0;
			if (!isLast && barRef.current && barWidth > 0) {
				const exactPx = (pct / 100) * barWidth;
				const roundedPx = Math.round(exactPx);
				if (layout === 'sidebar') {
					stackLevel = duplicateStacks.get(roundedPx) || 0;
					duplicateStacks.set(roundedPx, stackLevel + 1);
					showLine = stackLevel === 0;
					leftStyle = { left: `${exactPx}px` };
				} else {
					if (usedPx.has(roundedPx)) {
						showLine = false;
					} else {
						usedPx.add(roundedPx);
					}
					leftStyle = { left: `${roundedPx}px` };
				}
			} else {
				leftStyle = { left: isLast ? '100%' : `calc(${pct}% - 0.5px)` };
			}
			return { tick, idx, isLast, pct, leftStyle, showLine, stackLevel };
		});
	}

	return (
		<div className={containerClassName}>
			<div className="alt-legend-title">ALTITUDE (ft)</div>
			<div className="alt-legend-bar" ref={barRef}>
				<div className="alt-legend-fill" style={{ background: gradient }} />
				{renderTicks.map(({ tick, idx, isLast, leftStyle, showLine, stackLevel }) => (
					<div
						key={tick}
						className={`alt-legend-tick ${isLast ? 'last' : ''}`}
						style={leftStyle}
						>
						{showLine && <div className="alt-legend-tick-line" />}
						<div className={`alt-legend-tick-label ${idx === 0 ? 'first' : ''} ${isLast ? 'last' : ''} ${(layout === 'sidebar' && stackLevel > 0) ? `stack-${stackLevel}` : ''}`}>
							{tick.toLocaleString('en-US')}{isLast ? '+' : ''}
						</div>
						</div>
				))}
			</div>
		</div>
	);
};

export default AltitudeLegend;