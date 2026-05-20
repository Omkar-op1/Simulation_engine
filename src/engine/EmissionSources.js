/**
 * EmissionSources — creates point / area source descriptors from user interventions
 */
import { PLANT_EF, FACTORY_EF } from '../utils/constants.js';

let _idCounter = 1;
const uid = () => `src_${_idCounter++}`;

// ─── Power Plants ─────────────────────────────────────────────────────────────
/**
 * @param {number} capacityMW
 * @param {number} lat
 * @param {number} lon
 * @param {'coal'|'gas'|'solar'|'wind'} type
 */
export function createPowerPlant(capacityMW, lat, lon, type = 'coal', name = '') {
  const ef = PLANT_EF[type];
  // Hourly emissions = factor (kg/MWh) × capacity (MW) × capacity_factor (75%)
  const CF = type === 'coal' || type === 'gas' ? 0.75 : 0;
  const MWh_per_hr = capacityMW * CF;
  return {
    id: uid(),
    type: 'powerPlant',
    subtype: type,
    name: name || `${capacityMW}MW ${type.toUpperCase()} Plant`,
    lat, lon,
    capacityMW,
    enabled: true,
    stackH: ef.stackH, exitV: ef.exitV, exitD: ef.exitD, exitT: ef.exitT,
    emissions: {
      CO2:  ef.CO2  * MWh_per_hr,
      SO2:  ef.SO2  * MWh_per_hr,
      NO2:  ef.NOx  * MWh_per_hr,
      PM25: ef.PM25 * MWh_per_hr,
      PM10: ef.PM10 * MWh_per_hr,
      CO:   ef.CO   * MWh_per_hr,
    },
    icon: type === 'coal' ? '🏭' : type === 'gas' ? '⚡' : type === 'solar' ? '☀️' : '💨',
  };
}

// ─── Factories ────────────────────────────────────────────────────────────────
/**
 * @param {'heavy'|'light'|'cement'} subtype
 * @param {number} count  number of factories
 */
export function createFactory(lat, lon, subtype = 'heavy', count = 1, name = '') {
  const ef = FACTORY_EF[subtype];
  return {
    id: uid(),
    type: 'factory',
    subtype,
    name: name || `${count}× ${subtype} factory`,
    lat, lon,
    count,
    enabled: true,
    stackH: ef.stackH, exitV: ef.exitV, exitD: ef.exitD, exitT: ef.exitT,
    emissions: {
      CO2:  ef.CO2  * count,
      SO2:  ef.SO2  * count,
      NO2:  ef.NOx  * count,
      PM25: ef.PM25 * count,
      PM10: ef.PM10 * count,
      CO:   ef.CO   * count,
    },
    icon: '🏭',
  };
}

// ─── Presets for Pune's real industrial areas ─────────────────────────────────
export function defaultPuneSources() {
  return [
    // Pimpri-Chinchwad industrial belt
    createFactory(18.6279, 73.7997, 'heavy', 8, 'Pimpri Industrial Zone'),
    // Hadapsar IT + light industry
    createFactory(18.5089, 73.9260, 'light', 4, 'Hadapsar Industrial Estate'),
    // Chakan auto cluster
    createFactory(18.7606, 73.8610, 'heavy', 6, 'Chakan Auto Cluster'),
    // MSEDCL gas plant (representative)
    createPowerPlant(550, 18.5700, 73.7800, 'gas', 'Pune Gas Station'),
  ];
}

/**
 * Re-scale emissions of a source (e.g. after capacity factor change).
 */
export function scaleSourceEmissions(source, factor) {
  const scaled = { ...source, emissions: {} };
  for (const [p, v] of Object.entries(source.emissions)) {
    scaled.emissions[p] = v * factor;
  }
  return scaled;
}
