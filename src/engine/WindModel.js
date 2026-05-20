/**
 * WindModel — derives atmospheric stability and diurnal wind pattern
 */
import { stabilityClass } from './GaussianPlume.js';

/**
 * Determine stability class from current weather.
 */
export function getStabilityClass(weather) {
  return stabilityClass(weather.windSpeed, weather.isDay, weather.clouds);
}

/**
 * Apply diurnal variation to wind (sea-breeze / valley-wind effect for Pune).
 * Pune sits ~560m near the Western Ghats; wind tends to come from W/SW in evenings.
 */
export function diurnalWindAdjust(baseWeather, simHour) {
  const h = simHour % 24;
  let speedFactor = 1.0;
  let dirDelta = 0;

  // Morning (6–10 h): light winds, slight easterly drift
  if (h >= 6 && h < 10)  { speedFactor = 0.7; dirDelta = 20; }
  // Afternoon (11–16 h): stronger WSW, peak mixing
  if (h >= 11 && h < 16) { speedFactor = 1.3; dirDelta = -15; }
  // Evening (17–20 h): calming, backing southerly
  if (h >= 17 && h < 20) { speedFactor = 0.9; dirDelta = 10; }
  // Night (20–6 h): calm, stable, light NE (land breeze)
  if (h >= 20 || h < 6)  { speedFactor = 0.5; dirDelta = 60; }

  return {
    ...baseWeather,
    windSpeed: Math.max(0.3, baseWeather.windSpeed * speedFactor),
    windDir:   (baseWeather.windDir + dirDelta + 360) % 360,
    isDay:     h >= 6 && h < 19,
  };
}

/**
 * Night-time temperature inversion: traps pollutants below ~200m.
 * Returns a multiplier for vertical mixing (0.2 = severe inversion).
 */
export function inversionFactor(weather, simHour) {
  const h = simHour % 24;
  if (h >= 20 || h < 7) {
    // Night: low wind → strong inversion
    const u = weather.windSpeed;
    return Math.max(0.15, Math.min(1, u / 4));
  }
  if (h >= 11 && h < 16) return 1.0; // strong mixing afternoon
  return 0.6;
}

/**
 * Generate wind vector field for map display.
 * Returns array of { lat, lon, u, v } (m/s components).
 */
export function generateWindField(weather, rows = 8, cols = 8, bounds = { latMin: 18.30, latMax: 18.75, lonMin: 73.65, lonMax: 74.10 }) {
  const { windSpeed, windDir } = weather;
  const theta = (windDir * Math.PI) / 180;
  // meteorological → math convention (wind blows TO direction)
  const u = windSpeed * Math.sin((windDir + 180) * Math.PI / 180);
  const v = windSpeed * Math.cos((windDir + 180) * Math.PI / 180);
  const vectors = [];
  const dLat = (bounds.latMax - bounds.latMin) / rows;
  const dLon = (bounds.lonMax - bounds.lonMin) / cols;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const lat = bounds.latMin + (r + 0.5) * dLat;
      const lon = bounds.lonMin + (c + 0.5) * dLon;
      // Add slight turbulence noise
      const noise = (Math.random() - 0.5) * 0.3;
      vectors.push({ lat, lon, u: u + noise, v: v + noise });
    }
  }
  return vectors;
}
