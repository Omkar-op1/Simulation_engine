// Maps a concentration value to an RGBA color string for heatmap rendering
// Uses the AQI standard color scale: green → yellow → orange → red → purple → maroon

const COLOR_STOPS = [
  { pct: 0.00, r: 0,   g: 228, b: 0   },  // Good        — green
  { pct: 0.20, r: 255, g: 255, b: 0   },  // Moderate    — yellow
  { pct: 0.40, r: 255, g: 126, b: 0   },  // USG         — orange
  { pct: 0.60, r: 255, g: 0,   b: 0   },  // Unhealthy   — red
  { pct: 0.80, r: 153, g: 0,   b: 76  },  // Very Unhlth — purple
  { pct: 1.00, r: 126, g: 0,   b: 35  },  // Hazardous   — maroon
];

function lerp(a, b, t) { return a + (b - a) * t; }

/**
 * @param {number} value  - pollutant concentration
 * @param {number} maxVal - concentration that maps to 100% (hazardous)
 * @param {number} alpha  - 0-1 opacity
 * @returns {string} rgba(...)
 */
export function concentrationToColor(value, maxVal = 200, alpha = 0.75) {
  const pct = Math.min(1, Math.max(0, value / maxVal));
  let lo = COLOR_STOPS[0], hi = COLOR_STOPS[COLOR_STOPS.length - 1];
  for (let i = 0; i < COLOR_STOPS.length - 1; i++) {
    if (pct <= COLOR_STOPS[i + 1].pct) {
      lo = COLOR_STOPS[i];
      hi = COLOR_STOPS[i + 1];
      break;
    }
  }
  const t = (pct - lo.pct) / (hi.pct - lo.pct || 1);
  const r = Math.round(lerp(lo.r, hi.r, t));
  const g = Math.round(lerp(lo.g, hi.g, t));
  const b = Math.round(lerp(lo.b, hi.b, t));
  return `rgba(${r},${g},${b},${alpha})`;
}

/** Returns hex color for AQI value 0-500 */
export function aqiToColor(aqi) {
  if (aqi <= 50)  return '#00e400';
  if (aqi <= 100) return '#ffff00';
  if (aqi <= 150) return '#ff7e00';
  if (aqi <= 200) return '#ff0000';
  if (aqi <= 300) return '#99004c';
  return '#7e0023';
}

/** Returns text label for AQI */
export function aqiToLabel(aqi) {
  if (aqi <= 50)  return 'Good';
  if (aqi <= 100) return 'Moderate';
  if (aqi <= 150) return 'Unhealthy for Sensitive Groups';
  if (aqi <= 200) return 'Unhealthy';
  if (aqi <= 300) return 'Very Unhealthy';
  return 'Hazardous';
}

/** Emoji for AQI */
export function aqiToEmoji(aqi) {
  if (aqi <= 50)  return '😊';
  if (aqi <= 100) return '😐';
  if (aqi <= 150) return '😷';
  if (aqi <= 200) return '🤧';
  if (aqi <= 300) return '😰';
  return '☠️';
}

/** Gradient CSS string for AQI bar */
export const AQI_GRADIENT = `linear-gradient(to right,
  #00e400 0%, #ffff00 20%, #ff7e00 40%, #ff0000 60%, #99004c 80%, #7e0023 100%)`;
