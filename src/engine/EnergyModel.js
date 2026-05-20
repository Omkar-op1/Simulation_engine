/**
 * EnergyModel — tracks city power generation mix and its emissions.
 *
 * Pune's electricity demand ≈ 3,500 MW peak.
 * Current mix: ~60% coal, ~20% gas, ~12% hydro, ~8% renewables (2024).
 */
import { PLANT_EF } from '../utils/constants.js';

const PUNE_PEAK_DEMAND_MW = 3500;

const BASELINE_MIX = {
  coal:  0.60,
  gas:   0.20,
  hydro: 0.12,  // zero emissions
  solar: 0.05,
  wind:  0.03,
};

/**
 * Compute grid emission intensity (gCO2eq/kWh) and hourly totals.
 *
 * @param {object} settings
 *   rooftopSolarPct  — % of demand met by rooftop solar
 *   solarFarmMW      — additional utility solar capacity
 *   windFarmMW       — additional wind capacity
 *   retireCoalPct    — % of coal capacity retired
 * @returns {{ gridIntensity, CO2_kghr, SO2_kghr, NOx_kghr, PM25_kghr, mix }}
 */
export function calcGridEmissions(settings = {}) {
  const {
    rooftopSolarPct = 0,
    solarFarmMW     = 0,
    windFarmMW      = 0,
    retireCoalPct   = 0,
  } = settings;

  const demand = PUNE_PEAK_DEMAND_MW;

  // Additional clean generation (MW)
  const rooftopMW = demand * (rooftopSolarPct / 100) * 0.18; // ~18% capacity factor for rooftop
  const extraClean = rooftopMW + solarFarmMW * 0.22 + windFarmMW * 0.30;
  const cleanFrac  = Math.min(1, extraClean / demand);

  // Adjusted mix
  const mix = { ...BASELINE_MIX };
  const coalReduction = retireCoalPct / 100 * mix.coal;
  mix.coal  = Math.max(0, mix.coal - coalReduction);
  // Add solar/wind, reduce coal/gas proportionally
  const totalNew = cleanFrac;
  const fossil   = mix.coal + mix.gas;
  if (fossil > 0 && totalNew > 0) {
    const reduction = Math.min(fossil, totalNew);
    mix.coal = Math.max(0, mix.coal - reduction * (mix.coal / fossil));
    mix.gas  = Math.max(0, mix.gas  - reduction * (mix.gas  / fossil));
  }
  mix.solar = (mix.solar || 0) + cleanFrac * 0.6;
  mix.wind  = (mix.wind  || 0) + cleanFrac * 0.4;

  // Normalise
  const total = Object.values(mix).reduce((s, v) => s + v, 0);
  for (const k of Object.keys(mix)) mix[k] /= total;

  // Hourly emissions
  const MWh_hr = demand; // 1 hour
  const em = { CO2: 0, SO2: 0, NO2: 0, PM25: 0, PM10: 0 };
  for (const [src, frac] of Object.entries(mix)) {
    const ef = PLANT_EF[src];
    if (!ef) continue;
    const gen = MWh_hr * frac;
    em.CO2  += ef.CO2  * gen;
    em.SO2  += ef.SO2  * gen;
    em.NO2  += ef.NOx  * gen;
    em.PM25 += ef.PM25 * gen;
    em.PM10 += ef.PM10 * gen;
  }

  // Grid carbon intensity gCO2/kWh
  const gridIntensity = em.CO2 / demand;

  return { gridIntensity, emissions: em, mix };
}

/**
 * Emission factor for EV charging on current grid (gCO2/km).
 * EV efficiency ≈ 0.15 kWh/km.
 */
export function evChargingEmissions(gridIntensity_gCO2_kWh) {
  return 0.15 * gridIntensity_gCO2_kWh; // g/km
}

/** User-friendly summary */
export function gridSummary(settings = {}) {
  const { gridIntensity, mix, emissions } = calcGridEmissions(settings);
  return {
    intensity: gridIntensity.toFixed(0) + ' gCO₂/kWh',
    renewablePct: (((mix.solar || 0) + (mix.wind || 0) + (mix.hydro || 0)) * 100).toFixed(1) + '%',
    CO2_tonne_day: ((emissions.CO2 * 24) / 1000).toFixed(0),
    mix,
  };
}
