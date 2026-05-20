import { GRID, CELL_LAT, CELL_LON, PUNE_CONFIG } from './constants.js';

const LAT_PER_KM = 1 / 111;           // degrees lat per km
const LON_PER_KM = 1 / (111 * Math.cos(PUNE_CONFIG.center[0] * Math.PI / 180));

/** Build the initial empty concentration grid (rows × cols) using IDW */
export function buildGrid(aqiData = {}) {
  const cells = [];
  const stations = aqiData.stations || [];
  
  for (let r = 0; r < GRID.rows; r++) {
    for (let c = 0; c < GRID.cols; c++) {
      const lat = GRID.latMin + (r + 0.5) * CELL_LAT;
      const lon = GRID.lonMin + (c + 0.5) * CELL_LON;
      let minStationDist = Infinity;
      for (const st of stations) {
        const d = distanceKm(lat, lon, st.lat, st.lon);
        if (d < minStationDist) minStationDist = d;
      }
      
      const baseCell = {
        r, c, lat, lon,
        CO2: aqiData.CO2 ?? 415,
        AQI: 100,
        isValid: minStationDist <= 4.5,
      };

      const pollutants = ['PM25', 'PM10', 'NO2', 'SO2', 'CO', 'O3'];
      
      if (stations.length === 0) {
        pollutants.forEach(p => baseCell[p] = aqiData[p] || 0);
        baseCell.isValid = true; // Fallback to show whole map if no stations
      } else {
        pollutants.forEach(p => {
          let weightedSum = 0;
          let weightSum = 0;
          let exactMatch = false;

          for (const st of stations) {
            const dist = distanceKm(lat, lon, st.lat, st.lon);
            const val = st[p];
            if (val === undefined || val === null) continue;

            if (dist < 0.1) {
              baseCell[p] = val;
              exactMatch = true;
              break;
            }
            
            const w = 1 / (dist * dist);
            weightedSum += val * w;
            weightSum += w;
          }
          
          if (!exactMatch) {
            baseCell[p] = weightSum > 0 ? weightedSum / weightSum : (aqiData[p] || 0);
          }
        });
      }
      
      baseCell.AQI = pm25ToAQI(baseCell.PM25);
      cells.push(baseCell);
    }
  }
  return cells;
}

/** Row-major index of grid cell at (r, c) */
export function cellIndex(r, c) { return r * GRID.cols + c; }

/** Find the grid cell row & col for a (lat, lon) point */
export function latLonToCell(lat, lon) {
  const r = Math.floor((lat - GRID.latMin) / CELL_LAT);
  const c = Math.floor((lon - GRID.lonMin) / CELL_LON);
  if (r < 0 || r >= GRID.rows || c < 0 || c >= GRID.cols) return null;
  return { r, c };
}

/**
 * Compute displacement in meters from source to target,
 * then rotate into the wind-aligned coordinate frame.
 * @param {number} srcLat @param {number} srcLon
 * @param {number} dstLat @param {number} dstLon
 * @param {number} windDirDeg — meteorological convention (wind blows FROM this direction)
 * @returns {{ x: number, y: number }} x=downwind (m), y=crosswind (m)
 */
export function toWindFrame(srcLat, srcLon, dstLat, dstLon, windDirDeg) {
  const dy = (dstLat - srcLat) * 111_000;                          // north
  const dx = (dstLon - srcLon) * 111_000 * Math.cos(srcLat * Math.PI / 180); // east

  // Wind travels TO direction = windDir + 180
  const theta = ((windDirDeg + 180) % 360) * Math.PI / 180;
  const xDown = dx * Math.sin(theta) + dy * Math.cos(theta);  // downwind
  const yCross = dx * Math.cos(theta) - dy * Math.sin(theta); // crosswind
  return { x: xDown, y: yCross };
}

/**
 * All grid cells within radius_km of (lat, lon)
 */
export function cellsInRadius(grid, lat, lon, radius_km) {
  return grid.filter(cell => {
    const dlat = (cell.lat - lat) * 111;
    const dlon = (cell.lon - lon) * 111 * Math.cos(lat * Math.PI / 180);
    return Math.sqrt(dlat * dlat + dlon * dlon) <= radius_km;
  });
}

/**
 * All grid cells inside a rectangular bounding box
 */
export function cellsInBounds(grid, latMin, latMax, lonMin, lonMax) {
  return grid.filter(c =>
    c.lat >= latMin && c.lat <= latMax &&
    c.lon >= lonMin && c.lon <= lonMax
  );
}

/** City-wide mean for a pollutant */
export function cityMean(grid, pollutant) {
  return grid.reduce((s, c) => s + c[pollutant], 0) / grid.length;
}

/** Compute AQI from PM2.5 concentration (µg/m³) */
export function pm25ToAQI(c) {
  const bp = [
    [0,    12.0,   0,   50],
    [12.1, 35.4,  51,  100],
    [35.5, 55.4, 101,  150],
    [55.5, 150.4,151,  200],
    [150.5,250.4, 201, 300],
    [250.5,500.4, 301, 500],
  ];
  for (const [cLo, cHi, aLo, aHi] of bp) {
    if (c <= cHi) {
      return Math.round(((aHi - aLo) / (cHi - cLo)) * (c - cLo) + aLo);
    }
  }
  return 500;
}

/** km distance between two lat/lon points */
export function distanceKm(lat1, lon1, lat2, lon2) {
  const dlat = (lat2 - lat1) * 111;
  const dlon = (lon2 - lon1) * 111 * Math.cos(lat1 * Math.PI / 180);
  return Math.sqrt(dlat * dlat + dlon * dlon);
}
