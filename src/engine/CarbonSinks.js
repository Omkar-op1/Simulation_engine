/**
 * CarbonSinks — trees, forests, green roofs
 * Subtracts CO2 and PM2.5 from grid cells within sink coverage areas.
 */
import { SINK_RATES } from '../utils/constants.js';
import { cellsInRadius, cellsInBounds } from '../utils/gridUtils.js';

let _sid = 1;
const uid = () => `sink_${_sid++}`;

// ─── Sink Descriptors ─────────────────────────────────────────────────────────
export function createTreeSink(lat, lon, count, radiusKm = 0.5) {
  const r = SINK_RATES.tree;
  return {
    id: uid(), type: 'trees', lat, lon,
    count, radiusKm, enabled: true,
    name: `${count.toLocaleString()} Trees`,
    icon: '🌳',
    absorption: { CO2: r.CO2 * count, PM25: r.PM25 * count },
  };
}

export function createForestSink(lat, lon, areaHa, radiusKm) {
  const r = SINK_RATES.forest_ha;
  const radius = radiusKm ?? Math.sqrt(areaHa / Math.PI) / 10;
  return {
    id: uid(), type: 'forest', lat, lon,
    areaHa, radiusKm: radius, enabled: true,
    name: `${areaHa} ha Forest`,
    icon: '🌲',
    absorption: { CO2: r.CO2 * areaHa, PM25: r.PM25 * areaHa },
  };
}

export function createGreenRoofSink(lat, lon, coverageM2, radiusKm = 1.0) {
  const r = SINK_RATES.green_roof_m2;
  return {
    id: uid(), type: 'greenRoof', lat, lon,
    coverageM2, radiusKm, enabled: true,
    name: `Green Roof ${coverageM2}m²`,
    icon: '🏡',
    absorption: { CO2: r.CO2 * coverageM2, PM25: r.PM25 * coverageM2 },
  };
}

export function createWetlandSink(lat, lon, areaHa, radiusKm) {
  const r = SINK_RATES.wetland_ha;
  const radius = radiusKm ?? Math.sqrt(areaHa / Math.PI) / 10;
  return {
    id: uid(), type: 'wetland', lat, lon,
    areaHa, radiusKm: radius, enabled: true,
    name: `${areaHa} ha Wetland`,
    icon: '🌿',
    absorption: { CO2: r.CO2 * areaHa, PM25: r.PM25 * areaHa * 0.5 },
  };
}

// ─── City-wide green roof from a percentage ───────────────────────────────────
/**
 * Distribute green roof absorption uniformly across the whole grid.
 * pct: 0–100 percent of city rooftops covered.
 * Pune has ~100M m² of roof area (rough estimate).
 */
export function cityGreenRoofAbsorption(pct) {
  const totalM2 = 100_000_000 * (pct / 100);
  const r = SINK_RATES.green_roof_m2;
  return {
    CO2:  r.CO2  * totalM2,
    PM25: r.PM25 * totalM2,
  };
}

// ─── Apply sinks to grid ──────────────────────────────────────────────────────
/**
 * Subtract sink absorption from each affected grid cell.
 * Absorption is spread evenly across cells in the sink radius.
 */
export function applySinks(grid, sinks, globalGreenRoof = { CO2: 0, PM25: 0 }) {
  // Apply global green roof uniformly
  for (const cell of grid) {
    const n = grid.length;
    cell.CO2  = Math.max(350, cell.CO2  - globalGreenRoof.CO2  / n);
    cell.PM25 = Math.max(0,   cell.PM25 - globalGreenRoof.PM25 / n);
  }

  for (const sink of sinks) {
    if (!sink.enabled) continue;
    const affected = cellsInRadius(grid, sink.lat, sink.lon, sink.radiusKm);
    if (!affected.length) continue;
    const perCell = {};
    for (const [p, v] of Object.entries(sink.absorption)) {
      perCell[p] = v / affected.length;
    }
    for (const cell of affected) {
      for (const [p, v] of Object.entries(perCell)) {
        cell[p] = Math.max(0, (cell[p] || 0) - v);
      }
    }
  }
}

// ─── Summary stats ────────────────────────────────────────────────────────────
export function totalSinkAbsorption(sinks, greenRoofAbsorption) {
  let CO2 = greenRoofAbsorption.CO2 || 0;
  let PM25 = greenRoofAbsorption.PM25 || 0;
  for (const s of sinks) {
    if (!s.enabled) continue;
    CO2  += s.absorption.CO2  || 0;
    PM25 += s.absorption.PM25 || 0;
  }
  return { CO2, PM25 };
}
