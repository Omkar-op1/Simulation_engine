/**
 * TransportModel — calculate city-wide vehicle emissions
 *
 * Pune has ~4M registered vehicles (2024). Road length ~4,000 km.
 * Each vehicle drives ~30 km/day on average → ~12 km active per hour.
 */
import { VEHICLE_EF, PUNE_CONFIG } from '../utils/constants.js';
import { applyAreaSource } from './GaussianPlume.js';

const PUNE_TOTAL_VEHICLES = 4_000_000;
const AVG_KM_PER_HOUR     = 12;      // km travelled per vehicle per hour (peak)
const ROAD_NETWORK_RADIUS = 15;      // km — spread over city road network

// Vehicle fleet mix (baseline Pune estimates)
const BASELINE_MIX = {
  two_wheeler: 0.55,   // dominant in Pune
  petrol_car:  0.20,
  diesel_car:  0.08,
  diesel_bus:  0.02,
  ev_car:      0.03,
  ev_2w:       0.05,
  other:       0.07,   // autorickshaws, trucks
};

/**
 * Compute total hourly fleet emissions (kg/hr) based on user settings.
 *
 * @param {object} settings
 *   evPct          — EV adoption % (applies to cars + 2w)
 *   publicTransitPct — % of trips shifted to public transit (removes car km)
 *   cyclingPct     — % of short trips by cycle (removes 2w km)
 *   totalVehicles  — override default fleet size
 * @returns {{ CO2, PM25, NO2, CO }} kg/hr
 */
export function calcTransportEmissions(settings = {}) {
  const {
    evPct          = 5,
    publicTransitPct = 20,
    cyclingPct     = 5,
    totalVehicles  = PUNE_TOTAL_VEHICLES,
  } = settings;

  const evFrac      = evPct / 100;
  const transitFrac = publicTransitPct / 100;
  const cycleFrac   = cyclingPct / 100;

  // Adjust mix dynamically
  const mix = { ...BASELINE_MIX };

  // EV adoption converts some petrol_car + two_wheelers to EV
  const evCarGain = Math.min(mix.petrol_car + mix.diesel_car, evFrac * 0.6);
  const ev2wGain  = Math.min(mix.two_wheeler, evFrac * 0.4);
  mix.petrol_car  = Math.max(0, mix.petrol_car  - evCarGain * 0.7);
  mix.diesel_car  = Math.max(0, mix.diesel_car  - evCarGain * 0.3);
  mix.ev_car      = (mix.ev_car || 0) + evCarGain;
  mix.two_wheeler = Math.max(0, mix.two_wheeler - ev2wGain);
  mix.ev_2w       = (mix.ev_2w || 0) + ev2wGain;

  // Public transit removes car trips (each bus trip replaces 30 car trips)
  const carRemoval = transitFrac * (mix.petrol_car + mix.diesel_car) * 0.5;
  mix.petrol_car   = Math.max(0, mix.petrol_car - carRemoval * 0.7);
  mix.diesel_car   = Math.max(0, mix.diesel_car - carRemoval * 0.3);

  // Cycling removes short 2W trips
  mix.two_wheeler  = Math.max(0, mix.two_wheeler - cycleFrac * mix.two_wheeler * 0.8);

  // Compute totals
  const emissions  = { CO2: 0, PM25: 0, NO2: 0, CO: 0 };
  const vehicleEFs = {
    petrol_car: VEHICLE_EF.petrol_car,
    diesel_car: VEHICLE_EF.diesel_car,
    diesel_bus: VEHICLE_EF.diesel_bus,
    two_wheeler: VEHICLE_EF.two_wheeler,
    ev_car:     VEHICLE_EF.ev_car,
    ev_bus:     VEHICLE_EF.ev_bus,
    ev_2w:      VEHICLE_EF.ev_2w,
  };

  for (const [vtype, frac] of Object.entries(mix)) {
    const ef = vehicleEFs[vtype];
    if (!ef) continue;
    const n    = totalVehicles * frac;
    const kmHr = n * AVG_KM_PER_HOUR;            // total km/hr for this type
    emissions.CO2  += ef.CO2  * kmHr / 1000;     // g/km → kg/hr
    emissions.PM25 += ef.PM25 * kmHr / 1000;
    emissions.NO2  += ef.NOx  * kmHr / 1000;
    emissions.CO   += ef.CO   * kmHr / 1000;
  }

  return emissions;
}

/**
 * Apply transport emissions as a distributed area source over city roads.
 */
export function applyTransportToGrid(grid, settings, center = PUNE_CONFIG.center) {
  const totals = calcTransportEmissions(settings);
  // Spread per grid cell (cell-level concentration ≈ µg/m³ for ground-level)
  const cells = grid.length;
  const perCell = {};
  for (const [p, kg_hr] of Object.entries(totals)) {
    // Convert kg/hr → µg/m³ per cell assuming 10m mixing height, 1km² cell
    const cellAreaM2 = 1_000_000;
    const mixHeight  = 10; // m
    const vol = cellAreaM2 * mixHeight;
    perCell[p === 'NO2' ? 'NO2' : p] = (kg_hr * 1e9) / (cells * vol * 3600); // µg/m³
  }
  for (const cell of grid) {
    for (const [p, v] of Object.entries(perCell)) {
      if (cell.hasOwnProperty(p)) cell[p] = (cell[p] || 0) + v;
    }
  }
  return totals;
}

/** Human-readable summary of fleet composition */
export function fleetSummary(settings = {}) {
  const em = calcTransportEmissions(settings);
  return {
    CO2_tonne_day:  ((em.CO2  * 24) / 1000).toFixed(1),
    PM25_kg_day:    (em.PM25 * 24).toFixed(1),
    NO2_kg_day:     (em.NO2  * 24).toFixed(1),
  };
}
