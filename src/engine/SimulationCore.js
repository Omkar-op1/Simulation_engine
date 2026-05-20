/**
 * SimulationCore — master orchestrator
 *
 * Lifecycle:
 *   1. init()          — fetch real data, build grid
 *   2. tick()          — advance simulation by one hour
 *   3. addSource()     — user places a power plant / factory
 *   4. addSink()       — user plants trees / forest
 *   5. setTransport()  — user changes EV/transit sliders
 *   6. setEnergy()     — user changes solar/wind/coal sliders
 *   7. getState()      — returns full snapshot for React
 */

import { fetchAllAtmosphericData, refreshWeather } from './AtmosphericFetcher.js';
import { applySource }                             from './GaussianPlume.js';
import { applySinks, cityGreenRoofAbsorption, totalSinkAbsorption } from './CarbonSinks.js';
import { applyTransportToGrid, calcTransportEmissions, fleetSummary } from './TransportModel.js';
import { calcGridEmissions, gridSummary }          from './EnergyModel.js';
import { getStabilityClass, diurnalWindAdjust, inversionFactor, generateWindField } from './WindModel.js';
import { defaultPuneSources, createPowerPlant, createFactory } from './EmissionSources.js';
import { buildGrid, pm25ToAQI, cityMean }          from '../utils/gridUtils.js';
import { PUNE_BASELINE, PUNE_CONFIG, setActiveCity } from '../utils/constants.js';

const TICK_MS  = 60_000;   // 1 real minute = 1 simulated hour
const WEATHER_REFRESH_MS = 10 * 60_000; // refresh API every 10 min

export class SimulationCore {
  constructor() {
    this.cityId        = 'pune';
    this.grid          = [];
    this.sources       = [];
    this.sinks         = [];
    this.weather       = null;
    this.baseWeather   = null;
    this.aqiData       = null;
    this.windVectors   = [];
    this.simHour       = new Date().getHours();
    this.tickCount     = 0;
    this.isMock        = false;
    this.history       = [];   // last 24h city-mean pollutants
    this.transportSettings = { evPct: 5, publicTransitPct: 20, cyclingPct: 5 };
    this.energySettings    = { rooftopSolarPct: 0, solarFarmMW: 0, windFarmMW: 0, retireCoalPct: 0 };
    this.greenRoofPct  = 0;
    this._listeners    = [];
    this._tickTimer    = null;
    this._weatherTimer = null;
  }

  // ─── Init ──────────────────────────────────────────────────────────────────
  async init() {
    setActiveCity(this.cityId);
    const data = await fetchAllAtmosphericData(this.cityId);
    this.baseWeather = data.weather;
    this.aqiData     = data.aqi;
    this.isMock      = data.isMock;
    this.grid        = buildGrid(this.aqiData);
    this.sources     = this.cityId === 'pune' ? defaultPuneSources() : [];
    this.simHour     = new Date().getHours();
    this._updateWeather();
    this._notifyListeners();
    return this;
  }

  async setCity(cityId) {
    this.cityId = cityId;
    setActiveCity(cityId);
    const data = await fetchAllAtmosphericData(cityId);
    this.baseWeather = data.weather;
    this.aqiData     = data.aqi;
    this.isMock      = data.isMock;
    this.grid        = buildGrid(this.aqiData);
    this.sources     = this.cityId === 'pune' ? defaultPuneSources() : [];
    this.sinks       = [];
    this._updateWeather();
    this._notifyListeners();
  }

  // ─── Tick ──────────────────────────────────────────────────────────────────
  tick() {
    this.simHour = (this.simHour + 1) % 24;
    this.tickCount++;
    this._recalculateGrid();
  }

  _recalculateGrid() {
    if (!this.baseWeather || !this.aqiData) return;

    // Rebuild grid from baseline each tick (avoids accumulation drift)
    this.grid = buildGrid(this.aqiData);

    // Apply current weather with diurnal adjustment
    const weather = diurnalWindAdjust(this.baseWeather, this.simHour);
    this.weather  = weather;
    const cls     = getStabilityClass(weather);
    const inv     = inversionFactor(weather, this.simHour);

    // 1. Apply point/area emission sources (Gaussian plume per source)
    for (const src of this.sources) {
      if (!src.enabled) continue;
      // Scale emissions by inversion (night traps pollution near ground)
      const scaledSrc = {
        ...src,
        emissions: Object.fromEntries(
          Object.entries(src.emissions).map(([k, v]) => [k, v * (inv < 0.5 ? 1 + (1 - inv) : 1)])
        ),
      };
      applySource(this.grid, scaledSrc, { speed: weather.windSpeed, dir: weather.windDir }, cls);
    }

    // 2. Apply distributed transport emissions
    applyTransportToGrid(this.grid, this.transportSettings);

    // 3. Apply grid-level energy emissions (spread city-wide background)
    const { emissions: gridEm } = calcGridEmissions(this.energySettings);
    const n = this.grid.length;
    const cellAreaM2 = 1_000_000, mixH = 30, vol = cellAreaM2 * mixH;
    for (const cell of this.grid) {
      cell.CO2  = (cell.CO2  || 0) + (gridEm.CO2  * 1e9) / (n * vol * 3600);
      cell.SO2  = (cell.SO2  || 0) + (gridEm.SO2  * 1e9) / (n * vol * 3600);
      cell.NO2  = (cell.NO2  || 0) + (gridEm.NO2  * 1e9) / (n * vol * 3600);
      cell.PM25 = (cell.PM25 || 0) + (gridEm.PM25 * 1e9) / (n * vol * 3600);
    }

    // 4. Apply sinks
    const greenRoofAbs = cityGreenRoofAbsorption(this.greenRoofPct);
    applySinks(this.grid, this.sinks, greenRoofAbs);

    // 5. Recompute AQI per cell
    for (const cell of this.grid) {
      cell.AQI = pm25ToAQI(cell.PM25);
    }

    // 6. Record history
    const snapshot = {
      hour: this.simHour,
      AQI:  cityMean(this.grid, 'AQI'),
      PM25: cityMean(this.grid, 'PM25'),
      NO2:  cityMean(this.grid, 'NO2'),
      SO2:  cityMean(this.grid, 'SO2'),
      CO2:  cityMean(this.grid, 'CO2'),
    };
    this.history.push(snapshot);
    if (this.history.length > 48) this.history.shift();

    // 7. Update wind vectors
    this.windVectors = generateWindField(weather);

    this._notifyListeners();
  }

  // ─── Controls ─────────────────────────────────────────────────────────────
  start() {
    if (this._tickTimer) return;
    this._tickTimer    = setInterval(() => this.tick(), TICK_MS);
    this._weatherTimer = setInterval(async () => {
      this.baseWeather = await refreshWeather();
    }, WEATHER_REFRESH_MS);
  }

  stop()  {
    clearInterval(this._tickTimer);
    clearInterval(this._weatherTimer);
    this._tickTimer = this._weatherTimer = null;
  }

  stepOnce() { this.tick(); }

  // ─── Mutation API ──────────────────────────────────────────────────────────
  addSource(src)  { this.sources = [...this.sources, src]; this._recalculateGrid(); }
  removeSource(id){ this.sources = this.sources.filter(s => s.id !== id); this._recalculateGrid(); }
  addSink(sink)   { this.sinks = [...this.sinks, sink]; this._recalculateGrid(); }
  removeSink(id)  { this.sinks = this.sinks.filter(s => s.id !== id); this._recalculateGrid(); }

  setTransport(settings) { this.transportSettings = { ...this.transportSettings, ...settings }; this._recalculateGrid(); }
  setEnergy(settings)    { this.energySettings    = { ...this.energySettings,    ...settings }; this._recalculateGrid(); }
  setGreenRoof(pct)      { this.greenRoofPct = pct; this._recalculateGrid(); }

  // ─── State Snapshot ────────────────────────────────────────────────────────
  getState() {
    const cityAQI   = cityMean(this.grid, 'AQI');
    const cityPM25  = cityMean(this.grid, 'PM25');
    const energySummary = gridSummary(this.energySettings);
    const fleetSum  = fleetSummary(this.transportSettings);
    const sinkTotals = totalSinkAbsorption(this.sinks, cityGreenRoofAbsorption(this.greenRoofPct));
    return {
      cityId: this.cityId,
      grid: this.grid,
      sources: this.sources,
      sinks: this.sinks,
      weather: this.weather || this.baseWeather,
      aqiData: this.aqiData,
      windVectors: this.windVectors,
      simHour: this.simHour,
      tickCount: this.tickCount,
      isMock: this.isMock,
      history: this.history,
      cityAQI: Math.round(cityAQI),
      cityPM25: cityPM25.toFixed(1),
      energySummary,
      fleetSummary: fleetSum,
      sinkTotals,
      stabilityClass: this.weather ? getStabilityClass(this.weather) : 'D',
      transportSettings: this.transportSettings,
      energySettings: this.energySettings,
      greenRoofPct: this.greenRoofPct,
    };
  }

  // ─── Listener pattern (for React integration) ─────────────────────────────
  subscribe(fn)   { this._listeners.push(fn); return () => this._listeners = this._listeners.filter(l => l !== fn); }
  _notifyListeners() { const s = this.getState(); this._listeners.forEach(fn => fn(s)); }
  _updateWeather() {
    const w = diurnalWindAdjust(this.baseWeather, this.simHour);
    this.weather = w;
    this.windVectors = generateWindField(w);
  }
}

// Singleton
export const engine = new SimulationCore();
