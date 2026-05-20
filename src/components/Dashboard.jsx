import { aqiToColor, aqiToLabel, aqiToEmoji, AQI_GRADIENT } from '../utils/colorScale.js';
import { POLLUTANTS } from '../utils/constants.js';
import TimelineChart from './TimelineChart.jsx';
import WindRose from './WindRose.jsx';

function PollutantRow({ label, value, unit, maxVal, color }) {
  const pct = Math.min(100, (value / maxVal) * 100);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
        <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
        <span style={{ fontWeight: 700, color, fontFamily: 'JetBrains Mono, monospace' }}>{typeof value === 'number' ? value.toFixed(1) : value} <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '0.68rem' }}>{unit}</span></span>
      </div>
      <div style={{ height: 5, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3, transition: 'width 0.5s ease', boxShadow: `0 0 6px ${color}` }} />
      </div>
    </div>
  );
}

function SinkCard({ sinkTotals }) {
  if (!sinkTotals) return null;
  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">🌳 Carbon Sinks (Active)</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.78rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-secondary)' }}>CO₂ Absorbed</span>
          <span style={{ color: 'var(--green)', fontWeight: 700 }}>{sinkTotals.CO2.toFixed(2)} kg/hr</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-secondary)' }}>PM₂.₅ Captured</span>
          <span style={{ color: 'var(--green)', fontWeight: 700 }}>{(sinkTotals.PM25 * 1000).toFixed(2)} g/hr</span>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard({ simState, activePollutant }) {
  if (!simState) return <div className="dashboard-panel" />;

  const { cityAQI, cityPM25, grid, weather, history, sinkTotals, aqiData } = simState;
  const aqiColor = aqiToColor(cityAQI);

  // City-mean for each pollutant
  const means = {};
  if (grid?.length) {
    for (const p of POLLUTANTS) {
      means[p.key] = grid.reduce((s, c) => s + (c[p.key] || 0), 0) / grid.length;
    }
  }

  return (
    <div className="dashboard-panel">
      {/* AQI Gauge */}
      <div style={{ padding: '16px 16px 8px', borderBottom: '1px solid var(--border)' }}>
        <h3 style={{ marginBottom: 12 }}>Air Quality Index</h3>
        <div className="aqi-gauge-wrap">
          <div className="aqi-gauge-label">City Average AQI</div>
          <div className="aqi-gauge-value" style={{ color: aqiColor }}>{cityAQI}</div>
          <div className="aqi-gauge-status" style={{ color: aqiColor }}>{aqiToEmoji(cityAQI)} {aqiToLabel(cityAQI)}</div>
          {/* AQI bar */}
          <div style={{ width: '100%', marginTop: 8 }}>
            <div style={{ height: 8, borderRadius: 4, background: AQI_GRADIENT, position: 'relative' }}>
              <div style={{
                position: 'absolute', top: -4, left: `${Math.min(98, cityAQI / 5)}%`,
                width: 16, height: 16, borderRadius: '50%',
                background: aqiColor, border: '2px solid #fff',
                transform: 'translateX(-50%)',
                boxShadow: `0 0 10px ${aqiColor}`,
                transition: 'left 0.5s ease',
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: 4 }}>
              <span>0</span><span>100</span><span>200</span><span>300</span><span>500</span>
            </div>
          </div>
        </div>
      </div>

      {/* Pollutant bars */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
        <h3 style={{ marginBottom: 10 }}>Pollutant Concentrations</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {POLLUTANTS.map(p => (
            <PollutantRow key={p.key}
              label={p.label} unit={p.unit}
              value={means[p.key] || 0}
              maxVal={p.maxScale}
              color={means[p.key] > p.dangerAt ? '#ff4444' : means[p.key] > p.dangerAt * 0.6 ? '#ff8c00' : '#00d4ff'} />
          ))}
        </div>
      </div>

      {/* Sink summary */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
        <SinkCard sinkTotals={sinkTotals} />
      </div>

      {/* Weather & Wind */}
      {weather && (
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ marginBottom: 10 }}>Weather Conditions</h3>
          <WindRose windDir={weather.windDir} windSpeed={weather.windSpeed} />
          <div className="stats-grid" style={{ marginTop: 10 }}>
            <div className="stat-mini">
              <span className="stat-mini-label">🌡 Temperature</span>
              <span className="stat-mini-value">{weather.temp?.toFixed(1)}°C</span>
            </div>
            <div className="stat-mini">
              <span className="stat-mini-label">💧 Humidity</span>
              <span className="stat-mini-value">{weather.humidity?.toFixed(0)}%</span>
            </div>
            <div className="stat-mini">
              <span className="stat-mini-label">💨 Wind</span>
              <span className="stat-mini-value">{weather.windSpeed?.toFixed(1)} m/s</span>
            </div>
            <div className="stat-mini">
              <span className="stat-mini-label">☁️ Cloud Cover</span>
              <span className="stat-mini-value">{weather.clouds?.toFixed(0)}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Monitoring Stations */}
      {aqiData?.stations?.length > 0 && (
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ marginBottom: 10 }}>Monitoring Stations</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {aqiData.stations.slice(0, 6).map((st, i) => {
              const c = aqiToColor(st.aqi);
              return (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>📍 {st.name}</span>
                  <span style={{ fontWeight: 700, color: c, background: c + '22', padding: '2px 8px', borderRadius: 10 }}>
                    AQI {st.aqi}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 24h Timeline chart */}
      <div style={{ padding: '12px 16px' }}>
        <h3 style={{ marginBottom: 10 }}>24h AQI Trend</h3>
        <TimelineChart history={history} />
      </div>
    </div>
  );
}
