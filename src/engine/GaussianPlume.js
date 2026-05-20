/**
 * Gaussian Plume Dispersion Model
 * ─────────────────────────────────────────────────────────────────────────────
 * Implements the steady-state Gaussian plume equation with:
 *   - Pasquill-Gifford urban stability classes (A–F)
 *   - Briggs urban sigma coefficients
 *   - Briggs plume rise formula
 *   - Ground-level reflection (perfectly reflecting ground)
 *   - Wind-direction rotation
 *
 * Reference: Turner, D.B. (1994). Workbook of Atmospheric Dispersion Estimates.
 */

import { PG_SIGMA } from '../utils/constants.js';
import { toWindFrame } from '../utils/gridUtils.js';

const MIN_WIND = 0.5; // m/s — below this dispersion is very poor

// ─── Atmospheric Stability Class ─────────────────────────────────────────────
/**
 * Determine Pasquill-Gifford stability class.
 * @param {number} windSpeed m/s
 * @param {boolean} isDay
 * @param {number} clouds  0-100 cloud cover %
 * @returns {'A'|'B'|'C'|'D'|'E'|'F'}
 */
export function stabilityClass(windSpeed, isDay, clouds = 30) {
  const u = windSpeed;
  if (!isDay) {
    // Night
    if (u < 2)   return clouds > 50 ? 'D' : 'F';
    if (u < 3)   return clouds > 50 ? 'D' : 'E';
    return 'D';
  }
  // Daytime — insolation proxy from cloud cover
  const strongSun = clouds < 25;
  const moderateSun = clouds < 60;
  if (strongSun) {
    if (u < 2)   return 'A';
    if (u < 3)   return 'A';
    if (u < 4)   return 'B';
    if (u < 6)   return 'C';
    return 'D';
  } else if (moderateSun) {
    if (u < 2)   return 'B';
    if (u < 4)   return 'B';
    if (u < 6)   return 'C';
    return 'D';
  } else {
    if (u < 2)   return 'C';
    if (u < 6)   return 'D';
    return 'D';
  }
}

// ─── Dispersion Coefficients ──────────────────────────────────────────────────
/** σy (m) for downwind distance x (m) using Briggs urban */
export function sigmaY(x, cls) {
  const { a, b } = PG_SIGMA[cls].y;
  return a * x * Math.pow(1 + b * x, -0.5);
}

/** σz (m) for downwind distance x (m) using Briggs urban */
export function sigmaZ(x, cls) {
  const { a, b, c } = PG_SIGMA[cls].z;
  if (b === 0) return a * x;
  return a * x * Math.pow(1 + b * x, c);
}

// ─── Plume Rise (Briggs) ──────────────────────────────────────────────────────
/**
 * Effective stack height = physical height + plume rise.
 * Uses simplified Briggs (1969) buoyancy flux formula.
 */
export function effectiveStackHeight(source, windSpeed) {
  const { stackH = 30, exitV = 8, exitD = 2, exitT = 330 } = source;
  const Ta = 293; // ambient K
  const u  = Math.max(MIN_WIND, windSpeed);
  // Buoyancy flux Fb (m⁴/s³)
  const Fb = 9.81 * exitV * (exitD / 2) ** 2 * (exitT - Ta) / exitT;
  if (Fb <= 0) return stackH;
  // Plume rise (stable/neutral — simplified)
  const deltaH = Fb > 55
    ? 2.6 * Math.pow(Fb / u, 1 / 3) * 4
    : 21.4 * Math.pow(Fb, 3 / 4) / u;
  return stackH + Math.max(0, deltaH);
}

// ─── Core Gaussian Concentration ─────────────────────────────────────────────
/**
 * Ground-level concentration at downwind x, crosswind y.
 * @param {number} Q   emission rate (g/s)
 * @param {number} u   wind speed (m/s)
 * @param {number} x   downwind distance (m) — must be > 0
 * @param {number} y   crosswind distance (m)
 * @param {number} H   effective stack height (m)
 * @param {string} cls stability class
 * @returns {number}   concentration (µg/m³)
 */
export function gaussianConc(Q, u, x, y, H, cls) {
  if (x <= 0) return 0;
  const sy = Math.max(1, sigmaY(x, cls));
  const sz = Math.max(1, sigmaZ(x, cls));
  const C = (Q / (2 * Math.PI * sy * sz * u))
    * Math.exp(-0.5 * (y / sy) ** 2)
    * (Math.exp(-0.5 * ((0 - H) / sz) ** 2) + Math.exp(-0.5 * ((0 + H) / sz) ** 2));
  return Math.max(0, C * 1e6); // convert g/m³ → µg/m³
}

// ─── Apply Single Source to Grid ──────────────────────────────────────────────
/**
 * For each grid cell, compute the downwind/crosswind coords, apply Gaussian
 * plume formula, and add results to the cell concentrations.
 *
 * @param {Array}  grid       - array of cell objects
 * @param {object} source     - { lat, lon, emissions: {PM25,NO2,SO2,CO...} g/s, stackH, exitV, exitD, exitT }
 * @param {object} wind       - { speed m/s, dir degrees (from) }
 * @param {string} cls        - stability class
 * @param {number} dt         - time step (hours) — scales area/volume sources
 */
export function applySource(grid, source, wind, cls) {
  const u   = Math.max(MIN_WIND, wind.speed);
  const H   = effectiveStackHeight(source, u);
  const { emissions } = source;

  for (const cell of grid) {
    const { x, y } = toWindFrame(source.lat, source.lon, cell.lat, cell.lon, wind.dir);
    if (x < 10) continue; // too close or upwind — skip

    for (const [pollutant, Qkg_hr] of Object.entries(emissions)) {
      if (!Qkg_hr || !cell.hasOwnProperty(pollutant)) continue;
      const Q_gs = (Qkg_hr * 1000) / 3600; // kg/hr → g/s
      const conc = gaussianConc(Q_gs, u, x, y, H, cls);
      cell[pollutant] = (cell[pollutant] || 0) + conc;
    }
  }
}

// ─── Area Source (distributed e.g. road network) ─────────────────────────────
/**
 * Applies emissions uniformly across cells within radius_km of center.
 */
export function applyAreaSource(grid, center, radius_km, emissionsPerCell) {
  const R2 = radius_km ** 2;
  for (const cell of grid) {
    const dlat = (cell.lat - center[0]) * 111;
    const dlon = (cell.lon - center[1]) * 111 * Math.cos(center[0] * Math.PI / 180);
    if (dlat * dlat + dlon * dlon > R2) continue;
    for (const [p, v] of Object.entries(emissionsPerCell)) {
      if (cell.hasOwnProperty(p)) cell[p] = (cell[p] || 0) + v;
    }
  }
}
