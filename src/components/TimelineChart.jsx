import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { aqiToColor } from '../utils/colorScale.js';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const aqi = payload[0]?.value;
  return (
    <div style={{
      background: 'rgba(8,20,40,0.95)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 8, padding: '8px 12px',
      fontSize: '0.75rem',
    }}>
      <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>Hour {label}:00</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, fontWeight: 700 }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}
        </div>
      ))}
    </div>
  );
};

export default function TimelineChart({ history = [] }) {
  if (!history.length) {
    return (
      <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
        Accumulating data…
      </div>
    );
  }

  const data = history.map(h => ({
    hour: h.hour,
    AQI: Math.round(h.AQI),
    PM25: parseFloat(h.PM25?.toFixed(1)),
    NO2: parseFloat(h.NO2?.toFixed(1)),
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* AQI line chart */}
      <ResponsiveContainer width="100%" height={110}>
        <LineChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="hour" tick={{ fill: 'rgba(200,225,255,0.4)', fontSize: 10 }}
            tickFormatter={h => `${h}h`} interval="preserveStartEnd" />
          <YAxis tick={{ fill: 'rgba(200,225,255,0.4)', fontSize: 10 }} domain={['auto', 'auto']} />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={100} stroke="#ff7e00" strokeDasharray="4 4" strokeOpacity={0.5} />
          <ReferenceLine y={150} stroke="#ff0000" strokeDasharray="4 4" strokeOpacity={0.5} />
          <Line type="monotone" dataKey="AQI" name="AQI"
            stroke="#00d4ff" strokeWidth={2} dot={false}
            strokeShadowColor="rgba(0,212,255,0.4)" />
        </LineChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 12, fontSize: '0.68rem', color: 'var(--text-muted)', paddingLeft: 4 }}>
        <span style={{ color: '#00d4ff' }}>── AQI</span>
        <span style={{ color: '#ff7e00', opacity: 0.6 }}>- - 100 (Moderate)</span>
        <span style={{ color: '#ff0000', opacity: 0.6 }}>- - 150 (Unhealthy)</span>
      </div>

      {/* PM2.5 + NO2 mini chart */}
      <ResponsiveContainer width="100%" height={80}>
        <LineChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis dataKey="hour" tick={{ fill: 'rgba(200,225,255,0.35)', fontSize: 9 }}
            tickFormatter={h => `${h}h`} interval="preserveStartEnd" />
          <YAxis tick={{ fill: 'rgba(200,225,255,0.35)', fontSize: 9 }} />
          <Tooltip content={<CustomTooltip />} />
          <Line type="monotone" dataKey="PM25" name="PM₂.₅"
            stroke="#ff8c00" strokeWidth={1.5} dot={false} />
          <Line type="monotone" dataKey="NO2" name="NO₂"
            stroke="#ff4444" strokeWidth={1.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>

      <div style={{ display: 'flex', gap: 12, fontSize: '0.68rem', color: 'var(--text-muted)', paddingLeft: 4 }}>
        <span style={{ color: '#ff8c00' }}>── PM₂.₅ (µg/m³)</span>
        <span style={{ color: '#ff4444' }}>── NO₂ (µg/m³)</span>
      </div>
    </div>
  );
}
