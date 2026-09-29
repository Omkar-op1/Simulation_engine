import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-neutral-950 border border-white/10 rounded p-2 text-[10px] font-mono text-neutral-300 shadow-xl">
      <div className="text-neutral-500 mb-1">Hour {label}:00</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color }} className="font-bold">
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}
        </div>
      ))}
    </div>
  );
};

export default function TimelineChart({ history = [] }) {
  if (!history.length) {
    return (
      <div className="h-20 flex items-center justify-center text-neutral-600 text-[10px] font-mono">
        Telemetry buffering...
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
    <div className="flex flex-col gap-3 font-mono">
      <ResponsiveContainer width="100%" height={100}>
        <LineChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: -25 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
          <XAxis dataKey="hour" tick={{ fill: '#737373', fontSize: 8, fontFamily: 'monospace' }}
            tickFormatter={h => `${h}h`} interval="preserveStartEnd" stroke="rgba(255,255,255,0.05)" />
          <YAxis tick={{ fill: '#737373', fontSize: 8, fontFamily: 'monospace' }} domain={['auto', 'auto']} stroke="rgba(255,255,255,0.05)" />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={100} stroke="#f97316" strokeDasharray="4 4" strokeOpacity={0.3} />
          <ReferenceLine y={150} stroke="#ef4444" strokeDasharray="4 4" strokeOpacity={0.3} />
          <Line type="monotone" dataKey="AQI" name="AQI"
            stroke="#10b981" strokeWidth={1.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>

      <div className="flex gap-3 text-[8px] text-neutral-500 pl-1">
        <span className="text-emerald-500">── AQI</span>
        <span className="text-orange-500/80">-- 100 MOD</span>
        <span className="text-red-500/80">-- 150 UNH</span>
      </div>

      <ResponsiveContainer width="100%" height={80}>
        <LineChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: -25 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
          <XAxis dataKey="hour" tick={{ fill: '#737373', fontSize: 8, fontFamily: 'monospace' }}
            tickFormatter={h => `${h}h`} interval="preserveStartEnd" stroke="rgba(255,255,255,0.05)" />
          <YAxis tick={{ fill: '#737373', fontSize: 8, fontFamily: 'monospace' }} stroke="rgba(255,255,255,0.05)" />
          <Tooltip content={<CustomTooltip />} />
          <Line type="monotone" dataKey="PM25" name="PM₂.₅"
            stroke="#f97316" strokeWidth={1.2} dot={false} />
          <Line type="monotone" dataKey="NO2" name="NO₂"
            stroke="#ef4444" strokeWidth={1.2} dot={false} />
        </LineChart>
      </ResponsiveContainer>

      <div className="flex gap-3 text-[8px] text-neutral-500 pl-1">
        <span className="text-orange-500">── PM₂.₅</span>
        <span className="text-red-500">── NO₂</span>
      </div>
    </div>
  );
}
