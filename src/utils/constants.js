export const CITIES = {
  pune: {
    id: 'pune', name: 'Pune', center: [18.5204, 73.8567],
    grid: { rows: 50, cols: 50, latMin: 18.30, latMax: 18.75, lonMin: 73.65, lonMax: 74.10 }
  },
  delhi: {
    id: 'delhi', name: 'Delhi', center: [28.6139, 77.2090],
    grid: { rows: 50, cols: 50, latMin: 28.40, latMax: 28.85, lonMin: 76.90, lonMax: 77.40 }
  },
  mumbai: {
    id: 'mumbai', name: 'Mumbai', center: [19.0760, 72.8777],
    grid: { rows: 50, cols: 50, latMin: 18.85, latMax: 19.30, lonMin: 72.70, lonMax: 73.10 }
  },
  bengaluru: {
    id: 'bengaluru', name: 'Bengaluru', center: [12.9716, 77.5946],
    grid: { rows: 50, cols: 50, latMin: 12.75, latMax: 13.20, lonMin: 77.35, lonMax: 77.85 }
  },
  chennai: {
    id: 'chennai', name: 'Chennai', center: [13.0827, 80.2707],
    grid: { rows: 50, cols: 50, latMin: 12.85, latMax: 13.30, lonMin: 80.10, lonMax: 80.40 }
  },
  kolkata: {
    id: 'kolkata', name: 'Kolkata', center: [22.5726, 88.3639],
    grid: { rows: 50, cols: 50, latMin: 22.35, latMax: 22.80, lonMin: 88.15, lonMax: 88.55 }
  },
  hyderabad: {
    id: 'hyderabad', name: 'Hyderabad', center: [17.3850, 78.4867],
    grid: { rows: 50, cols: 50, latMin: 17.15, latMax: 17.65, lonMin: 78.25, lonMax: 78.75 }
  },
  ahmedabad: {
    id: 'ahmedabad', name: 'Ahmedabad', center: [23.0225, 72.5714],
    grid: { rows: 50, cols: 50, latMin: 22.80, latMax: 23.25, lonMin: 72.35, lonMax: 72.80 }
  }
};

export const DEFAULT_CITY = 'pune';

export function getGridConfig(cityConfig) {
  const g = cityConfig.grid;
  return {
    ...g,
    CELL_LAT: (g.latMax - g.latMin) / g.rows,
    CELL_LON: (g.lonMax - g.lonMin) / g.cols,
  };
}

export let ACTIVE_CITY = CITIES[DEFAULT_CITY];
export let GRID = getGridConfig(ACTIVE_CITY);
export let CELL_LAT = GRID.CELL_LAT;
export let CELL_LON = GRID.CELL_LON;
export let CELL_SIZE_M = CELL_LAT * 111_000;
export let PUNE_CONFIG = ACTIVE_CITY; // Aliased for legacy usages

export function setActiveCity(cityId) {
  ACTIVE_CITY = CITIES[cityId] || CITIES[DEFAULT_CITY];
  GRID = getGridConfig(ACTIVE_CITY);
  CELL_LAT = GRID.CELL_LAT;
  CELL_LON = GRID.CELL_LON;
  CELL_SIZE_M = CELL_LAT * 111_000;
  PUNE_CONFIG = ACTIVE_CITY;
}

// ─── AQI Breakpoints (US EPA) ────────────────────────────────────────────────
export const AQI_BREAKPOINTS = {
  PM25: [
    { cLo: 0.0,   cHi: 12.0,  aLo: 0,   aHi: 50,  label: 'Good',                        color: '#00e400' },
    { cLo: 12.1,  cHi: 35.4,  aLo: 51,  aHi: 100, label: 'Moderate',                    color: '#ffff00' },
    { cLo: 35.5,  cHi: 55.4,  aLo: 101, aHi: 150, label: 'Unhealthy (Sensitive)',        color: '#ff7e00' },
    { cLo: 55.5,  cHi: 150.4, aLo: 151, aHi: 200, label: 'Unhealthy',                   color: '#ff0000' },
    { cLo: 150.5, cHi: 250.4, aLo: 201, aHi: 300, label: 'Very Unhealthy',              color: '#99004c' },
    { cLo: 250.5, cHi: 500.4, aLo: 301, aHi: 500, label: 'Hazardous',                   color: '#7e0023' },
  ],
  NO2: [
    { cLo: 0,    cHi: 53,    aLo: 0,   aHi: 50,  label: 'Good',                        color: '#00e400' },
    { cLo: 54,   cHi: 100,   aLo: 51,  aHi: 100, label: 'Moderate',                    color: '#ffff00' },
    { cLo: 101,  cHi: 360,   aLo: 101, aHi: 150, label: 'Unhealthy (Sensitive)',        color: '#ff7e00' },
    { cLo: 361,  cHi: 649,   aLo: 151, aHi: 200, label: 'Unhealthy',                   color: '#ff0000' },
    { cLo: 650,  cHi: 1249,  aLo: 201, aHi: 300, label: 'Very Unhealthy',              color: '#99004c' },
    { cLo: 1250, cHi: 2049,  aLo: 301, aHi: 500, label: 'Hazardous',                   color: '#7e0023' },
  ],
};

// ─── Emission Factors ─────────────────────────────────────────────────────────
// Power plants: kg per MWh of electricity generated
export const PLANT_EF = {
  coal: { CO2: 1000, SO2: 9.5,  NOx: 3.0,  PM25: 0.10, PM10: 0.20, CO: 0.30, stackH: 200, exitV: 15, exitD: 10, exitT: 400 },
  gas:  { CO2: 490,  SO2: 0.10, NOx: 1.0,  PM25: 0.005,PM10: 0.01, CO: 0.05, stackH: 80,  exitV: 20, exitD: 5,  exitT: 350 },
  solar:{ CO2: 0,    SO2: 0,    NOx: 0,    PM25: 0,    PM10: 0,    CO: 0,    stackH: 0,   exitV: 0,  exitD: 0,  exitT: 0   },
  wind: { CO2: 0,    SO2: 0,    NOx: 0,    PM25: 0,    PM10: 0,    CO: 0,    stackH: 0,   exitV: 0,  exitD: 0,  exitT: 0   },
};

// Factory: kg per hour (baseline heavy)
export const FACTORY_EF = {
  heavy: { CO2: 5000, SO2: 50,  NOx: 30,  PM25: 5.0,  PM10: 15,  CO: 20,  stackH: 50, exitV: 8, exitD: 2, exitT: 350 },
  light: { CO2: 500,  SO2: 5,   NOx: 3,   PM25: 0.5,  PM10: 1.5, CO: 2,   stackH: 20, exitV: 5, exitD: 1, exitT: 310 },
  cement:{ CO2: 8000, SO2: 100, NOx: 50,  PM25: 20,   PM10: 80,  CO: 10,  stackH: 100,exitV: 12,exitD: 4, exitT: 380 },
};

// Vehicles: g per km per vehicle
export const VEHICLE_EF = {
  petrol_car:  { CO2: 150,  PM25: 0.005, NOx: 0.06, CO: 1.5 },
  diesel_car:  { CO2: 120,  PM25: 0.030, NOx: 0.40, CO: 0.5 },
  diesel_bus:  { CO2: 800,  PM25: 0.150, NOx: 4.50, CO: 6.0 },
  two_wheeler: { CO2: 80,   PM25: 0.010, NOx: 0.10, CO: 3.0 },
  ev_car:      { CO2: 0,    PM25: 0,     NOx: 0,    CO: 0   },
  ev_bus:      { CO2: 0,    PM25: 0,     NOx: 0,    CO: 0   },
  ev_2w:       { CO2: 0,    PM25: 0,     NOx: 0,    CO: 0   },
};

// ─── Carbon Sink Rates (kg/hr) ────────────────────────────────────────────────
export const SINK_RATES = {
  tree:          { CO2: 21 / 8760,        PM25: 0.000003  }, // per tree
  forest_ha:     { CO2: 6000 / 8760,      PM25: 0.01      }, // per hectare
  green_roof_m2: { CO2: 0.2 / 8760,       PM25: 0.000001  }, // per m²
  wetland_ha:    { CO2: 2000 / 8760,      PM25: 0.005     }, // per hectare
};

// ─── Pasquill-Gifford Urban Sigma Coefficients (Briggs) ──────────────────────
// σy = a·x·(1 + b·x)^-0.5,  σz = a·x·(1 + b·x)^c
export const PG_SIGMA = {
  A: { y: { a: 0.32, b: 0.0004 }, z: { a: 0.24, b: 0.001,   c: 0.5  } },
  B: { y: { a: 0.32, b: 0.0004 }, z: { a: 0.24, b: 0.001,   c: 0.5  } },
  C: { y: { a: 0.22, b: 0.0004 }, z: { a: 0.20, b: 0,       c: 0    } },
  D: { y: { a: 0.16, b: 0.0004 }, z: { a: 0.14, b: 0.0003,  c: 0.5  } },
  E: { y: { a: 0.11, b: 0.0004 }, z: { a: 0.08, b: 0.00015, c: 0.5  } },
  F: { y: { a: 0.11, b: 0.0004 }, z: { a: 0.08, b: 0.00015, c: 0.5  } },
};

// ─── Pollutant display config ─────────────────────────────────────────────────
export const POLLUTANTS = [
  { key: 'PM25', label: 'PM₂.₅', unit: 'µg/m³', dangerAt: 35.5,  maxScale: 200  },
  { key: 'PM10', label: 'PM₁₀',  unit: 'µg/m³', dangerAt: 54,    maxScale: 300  },
  { key: 'NO2',  label: 'NO₂',   unit: 'µg/m³', dangerAt: 101,   maxScale: 400  },
  { key: 'SO2',  label: 'SO₂',   unit: 'µg/m³', dangerAt: 76,    maxScale: 300  },
  { key: 'CO2',  label: 'CO₂',   unit: 'ppm',   dangerAt: 450,   maxScale: 1000 },
  { key: 'CO',   label: 'CO',    unit: 'mg/m³', dangerAt: 10,    maxScale: 50   },
  { key: 'O3',   label: 'O₃',    unit: 'µg/m³', dangerAt: 101,   maxScale: 300  },
];

// ─── Pune baseline (typical annual average) ───────────────────────────────────
export const PUNE_BASELINE = {
  PM25: 38, PM10: 68, NO2: 42, SO2: 18, CO2: 415, CO: 2.1, O3: 55,
};
