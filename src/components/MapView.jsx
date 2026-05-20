import { useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import { concentrationToColor, aqiToColor } from '../utils/colorScale.js';
import { GRID, CELL_LAT, CELL_LON, POLLUTANTS, ACTIVE_CITY } from '../utils/constants.js';

// Max scale per pollutant for color mapping
const MAX_SCALE = { PM25: 200, PM10: 300, NO2: 400, SO2: 300, CO2: 1000, CO: 50, O3: 300 };

// Custom SVG markers
function makeMarkerHtml(icon, color) {
  return `<div style="
    background:${color};border-radius:50% 50% 50% 0;
    transform:rotate(-45deg);width:30px;height:30px;
    display:flex;align-items:center;justify-content:center;
    box-shadow:0 2px 10px rgba(0,0,0,0.6);border:2px solid rgba(255,255,255,0.3)">
    <span style="transform:rotate(45deg);font-size:13px">${icon}</span>
  </div>`;
}

export default function MapView({ simState, activePollutant, showHeatmap, showWindVectors, placingMode, onMapClick }) {
  const mapRef       = useRef(null);
  const leafletRef   = useRef(null);
  const heatCanvasRef= useRef(null);
  const windLayerRef = useRef(null);
  const markersRef   = useRef([]);
  const heatLayerRef = useRef(null);
  const onMapClickRef= useRef(onMapClick);

  useEffect(() => {
    onMapClickRef.current = onMapClick;
  }, [onMapClick]);

  // Init map
  useEffect(() => {
    if (leafletRef.current) return;
    const map = L.map(mapRef.current, {
      center: ACTIVE_CITY.center,
      zoom: 12,
      zoomControl: true,
      attributionControl: true,
    });

    // Dark tile layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap © CartoDB',
      maxZoom: 18,
    }).addTo(map);

    // Canvas overlay for heatmap
    const canvas = L.canvas({ padding: 0.5 });
    heatLayerRef.current = L.layerGroup().addTo(map);

    // Wind SVG layer
    windLayerRef.current = L.layerGroup().addTo(map);

    map.on('click', e => {
      if (onMapClickRef.current) {
        onMapClickRef.current(e.latlng.lat, e.latlng.lng);
      }
    });

    leafletRef.current = map;

    return () => {
      map.remove();
      leafletRef.current = null;
    };
  }, []);

  // Update map view on city change
  useEffect(() => {
    if (!leafletRef.current || !ACTIVE_CITY) return;
    leafletRef.current.flyTo(ACTIVE_CITY.center, 12, { animate: true, duration: 1.5 });
  }, [ACTIVE_CITY]);

  // Update map cursor when placing
  useEffect(() => {
    if (!leafletRef.current) return;
    leafletRef.current.getContainer().style.cursor = placingMode ? 'crosshair' : '';
  }, [placingMode]);

  // Draw heatmap (canvas overlay using CircleMarkers)
  useEffect(() => {
    if (!leafletRef.current || !simState?.grid || !heatLayerRef.current) return;
    const layer = heatLayerRef.current;
    layer.clearLayers();
    if (!showHeatmap) return;

    const maxVal = MAX_SCALE[activePollutant] || 200;
    const { grid } = simState;

    // Build array of [lat, lon, intensity] and draw as canvas rectangles via ImageOverlay
    // For performance, use a hidden canvas → ImageOverlay approach
    const canvas = document.createElement('canvas');
    canvas.width  = GRID.cols;
    canvas.height = GRID.rows;
    const ctx = canvas.getContext('2d');

    for (const cell of grid) {
      if (!cell.isValid) continue; // Hide cells outside station radius
      const val = cell[activePollutant] || 0;
      if (val < 1 && activePollutant !== 'AQI') continue;
      
      const color = activePollutant === 'AQI' 
        ? aqiToColor(val) 
        : concentrationToColor(val, maxVal, 0.72);
        
      ctx.fillStyle = color;
      ctx.fillRect(cell.c, GRID.rows - 1 - cell.r, 1, 1);
    }

    const bounds = [[GRID.latMin, GRID.lonMin], [GRID.latMax, GRID.lonMax]];
    L.imageOverlay(canvas.toDataURL(), bounds, { opacity: 1, zIndex: 200 }).addTo(layer);

  }, [simState?.grid, activePollutant, showHeatmap]);

  // Draw wind vectors
  useEffect(() => {
    if (!leafletRef.current || !windLayerRef.current) return;
    windLayerRef.current.clearLayers();
    if (!showWindVectors || !simState?.windVectors?.length) return;

    for (const { lat, lon, u, v } of simState.windVectors) {
      const speed  = Math.sqrt(u * u + v * v);
      const angleDeg = Math.atan2(u, v) * 180 / Math.PI;
      const len = Math.min(0.025, speed * 0.006);

      const endLat = lat + Math.cos(angleDeg * Math.PI / 180) * len;
      const endLon = lon + Math.sin(angleDeg * Math.PI / 180) * len;

      L.polyline([[lat, lon], [endLat, endLon]], {
        color: 'rgba(0,212,255,0.6)', weight: 1.5, opacity: 0.7,
      }).addTo(windLayerRef.current);

      // Arrowhead using rotated triangle marker
      L.circleMarker([endLat, endLon], {
        radius: 2, color: 'rgba(0,212,255,0.8)', fillColor: '#00d4ff', fillOpacity: 1, weight: 1,
      }).addTo(windLayerRef.current);
    }
  }, [simState?.windVectors, showWindVectors]);

  // Update source/sink markers
  useEffect(() => {
    if (!leafletRef.current || !simState) return;
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    const colorMap = { coal: '#ff4444', gas: '#ff8c00', solar: '#ffd700', wind: '#00d4ff', factory: '#ff6b35', trees: '#00ff88', forest: '#00cc66', wetland: '#0099ff' };

    for (const src of (simState.sources || [])) {
      const color = colorMap[src.subtype] || colorMap[src.type] || '#aaa';
      const icon  = L.divIcon({ html: makeMarkerHtml(src.icon || '🏭', color), className: '', iconSize: [30, 30], iconAnchor: [15, 30] });
      const m = L.marker([src.lat, src.lon], { icon })
        .bindPopup(`<b>${src.name}</b><br/>CO₂: ${(src.emissions.CO2||0).toFixed(0)} kg/hr<br/>PM₂.₅: ${(src.emissions.PM25||0).toFixed(2)} kg/hr`)
        .addTo(leafletRef.current);
      markersRef.current.push(m);
    }

    for (const sink of (simState.sinks || [])) {
      const color = colorMap[sink.type] || '#00ff88';
      const icon  = L.divIcon({ html: makeMarkerHtml(sink.icon || '🌳', color), className: '', iconSize: [30, 30], iconAnchor: [15, 30] });
      const m = L.marker([sink.lat, sink.lon], { icon })
        .bindPopup(`<b>${sink.name}</b><br/>CO₂ abs: ${(sink.absorption.CO2||0).toFixed(4)} kg/hr`)
        .addTo(leafletRef.current);
      markersRef.current.push(m);
    }

    // Station markers from WAQI
    for (const st of (simState.aqiData?.stations || [])) {
      if (!st.lat || !st.lon) continue;
      const c = L.circleMarker([st.lat, st.lon], {
        radius: 8, fillColor: '#00d4ff', color: '#fff', weight: 1.5,
        fillOpacity: 0.85,
      }).bindPopup(`<b>${st.name}</b><br/>AQI: ${st.aqi}`).addTo(leafletRef.current);
      markersRef.current.push(c);
    }
  }, [simState?.sources, simState?.sinks, simState?.aqiData]);

  const pollutantLabel = POLLUTANTS.find(p => p.key === activePollutant)?.label || activePollutant;

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
      {/* Legend */}
      <div style={{
        position: 'absolute', bottom: 20, left: 12, zIndex: 500,
        background: 'var(--bg-panel)', border: '1px solid var(--border)',
        borderRadius: 8, padding: '8px 12px', backdropFilter: 'blur(12px)',
        fontSize: '0.72rem', color: 'var(--text-secondary)',
      }}>
        <div style={{ fontWeight: 700, marginBottom: 5 }}>{pollutantLabel} Concentration</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 100, height: 8, borderRadius: 4, background: 'linear-gradient(to right, #00e400, #ffff00, #ff7e00, #ff0000, #99004c, #7e0023)' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
          <span>Low</span><span>Hazardous</span>
        </div>
      </div>
    </div>
  );
}
