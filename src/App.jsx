import { useEffect, useState, useCallback, useRef } from 'react';
import { engine } from './engine/SimulationCore.js';
import { createPowerPlant, createFactory } from './engine/EmissionSources.js';
import { createTreeSink, createForestSink, createWetlandSink } from './engine/CarbonSinks.js';
import MapView from './components/MapView.jsx';
import ControlPanel from './components/ControlPanel.jsx';
import Dashboard from './components/Dashboard.jsx';
import { aqiToColor, aqiToLabel, aqiToEmoji } from './utils/colorScale.js';
import { CITIES } from './utils/constants.js';

function App() {
  const [simState, setSimState] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [activePollutant, setActivePollutant] = useState('PM25');
  const [placingMode, setPlacingMode] = useState(null); // { type, subtype, params }
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [showWindVectors, setShowWindVectors] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const isRunning = useRef(false);

  useEffect(() => {
    engine.init().then(() => {
      setSimState(engine.getState());
      const unsub = engine.subscribe(state => setSimState(state));
      engine.start();
      isRunning.current = true;
      setLoading(false);
      return unsub;
    });
    return () => engine.stop();
  }, []);

  const handleMapClick = useCallback((lat, lon) => {
    if (placingMode) {
      const { type, subtype, params } = placingMode;
      if (type === 'powerPlant') {
        engine.addSource(createPowerPlant(params.capacityMW, lat, lon, subtype, params.name));
      } else if (type === 'factory') {
        engine.addSource(createFactory(lat, lon, subtype, params.count, params.name));
      } else if (type === 'trees') {
        engine.addSink(createTreeSink(lat, lon, params.count, params.radiusKm));
      } else if (type === 'forest') {
        engine.addSink(createForestSink(lat, lon, params.areaHa));
      } else if (type === 'wetland') {
        engine.addSink(createWetlandSink(lat, lon, params.areaHa));
      }
      setPlacingMode(null);
    } else {
      setSelectedPoint({ lat, lon });
    }
  }, [placingMode]);

  const handleTransportChange = useCallback(settings => engine.setTransport(settings), []);
  const handleEnergyChange    = useCallback(settings => engine.setEnergy(settings), []);
  const handleGreenRoof       = useCallback(pct => engine.setGreenRoof(pct), []);
  const handleRemoveSource    = useCallback(id => engine.removeSource(id), []);
  const handleRemoveSink      = useCallback(id => engine.removeSink(id), []);
  const handleStep            = useCallback(() => engine.stepOnce(), []);
  
  const handleCityChange = useCallback(async (e) => {
    setLoading(true);
    setSelectedPoint(null);
    await engine.setCity(e.target.value);
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
        <div className="loader" />
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Fetching atmospheric data…</p>
      </div>
    );
  }

  const { cityAQI, weather, simHour, isMock, stabilityClass, cityId } = simState;
  const aqiColor = aqiToColor(cityAQI);

  return (
    <>
      <header className="app-header">
        <div className="header-logo">
          <div>
            <div className="header-title">EcoWatch</div>
            <div className="header-subtitle">
              <select 
                value={cityId}
                onChange={handleCityChange}
                style={{ background: 'transparent', color: 'var(--text-muted)', border: 'none', outline: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit', padding: 0 }}
              >
                {Object.values(CITIES).map(c => (
                  <option key={c.id} value={c.id} style={{ color: '#000' }}>{c.name} Atmospheric Simulation</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="header-divider" />

        <div className="header-badge">
          <span className={`live-dot ${isMock ? 'mock-dot' : ''}`} />
          {isMock ? 'Demo Data' : 'Live Data'}
        </div>

        <div className="header-aqi-pill" style={{ background: aqiColor + '22', borderColor: aqiColor + '66', color: aqiColor }}>
          {aqiToEmoji(cityAQI)} AQI {cityAQI} — {aqiToLabel(cityAQI)}
        </div>

        {weather && (
          <div className="header-badge">
            💨 {weather.windSpeed.toFixed(1)} m/s from {weather.windDir}°
            &nbsp;·&nbsp;
            🌡 {weather.temp?.toFixed(0)}°C
            &nbsp;·&nbsp;
            Stability {stabilityClass}
          </div>
        )}

        <div className="header-sim-time">
          <span>Sim hour: <strong>{String(simHour).padStart(2,'0')}:00</strong></span>
          <button className="header-btn" onClick={handleStep}>⏭ Step</button>
        </div>
      </header>

      <div className="app-body">
        <ControlPanel
          simState={simState}
          placingMode={placingMode}
          onSetPlacingMode={setPlacingMode}
          onTransportChange={handleTransportChange}
          onEnergyChange={handleEnergyChange}
          onGreenRoof={handleGreenRoof}
          onRemoveSource={handleRemoveSource}
          onRemoveSink={handleRemoveSink}
        />

        <div className="map-container">
          <MapView
            simState={simState}
            activePollutant={activePollutant}
            showHeatmap={showHeatmap}
            showWindVectors={showWindVectors}
            placingMode={placingMode}
            onMapClick={handleMapClick}
            selectedPoint={selectedPoint}
          />

          <div className="map-controls">
            {['AQI', 'PM25','PM10','NO2','SO2','CO2','CO','O3'].map(p => (
              <button key={p} className={`map-overlay-btn ${activePollutant === p ? 'active' : ''}`}
                onClick={() => setActivePollutant(p)}>
                {p === 'PM25' ? 'PM₂.₅' : p === 'PM10' ? 'PM₁₀' : p}
              </button>
            ))}
            <div style={{ width: 1, background: 'var(--border)' }} />
            <button className={`map-overlay-btn ${showHeatmap ? 'active' : ''}`} onClick={() => setShowHeatmap(v => !v)}>🌡 Heat</button>
            <button className={`map-overlay-btn ${showWindVectors ? 'active' : ''}`} onClick={() => setShowWindVectors(v => !v)}>💨 Wind</button>
          </div>

          {placingMode && (
            <div className="map-placing-hint">
              📍 Click on the map to place: <strong>{placingMode.params?.name || placingMode.type}</strong>
              &nbsp;&nbsp;
              <button className="btn btn-danger btn-sm" onClick={() => setPlacingMode(null)}>Cancel</button>
            </div>
          )}

          <div className="stability-badge">
            <span style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>ATMO STABILITY</span>
            <span style={{ fontWeight: 700, color: 'var(--accent)', fontSize: '1.1rem' }}>{stabilityClass}</span>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.7rem' }}>
              {stabilityClass === 'A' || stabilityClass === 'B' ? 'Very Unstable' :
               stabilityClass === 'C' ? 'Slightly Unstable' :
               stabilityClass === 'D' ? 'Neutral' :
               stabilityClass === 'E' ? 'Stable' : 'Very Stable'}
            </span>
          </div>
        </div>

        <Dashboard
          simState={simState}
          activePollutant={activePollutant}
          selectedPoint={selectedPoint}
          setSelectedPoint={setSelectedPoint}
        />
      </div>
    </>
  );
}

export default App;
