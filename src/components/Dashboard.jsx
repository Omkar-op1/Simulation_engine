import { useState, useEffect } from 'react';
import { Activity, MapPin, Factory, ChevronRight } from 'lucide-react';
import { cn } from '../utils/cn.js';
import { aqiToColor, aqiToLabel } from '../utils/colorScale.js';
import TimelineChart from './TimelineChart.jsx';
import WindRose from './WindRose.jsx';

const AQI_GRADES = [
  { label: 'Good', color: 'bg-emerald-500' },
  { label: 'Moderate', color: 'bg-yellow-500' },
  { label: 'Unhealthy (Sens.)', color: 'bg-orange-500' },
  { label: 'Unhealthy', color: 'bg-red-500' },
  { label: 'Very Unhealthy', color: 'bg-purple-500' },
  { label: 'Hazardous', color: 'bg-rose-950' }
];

function getAqiIndex(aqi) {
  if (aqi <= 50) return 0;
  if (aqi <= 100) return 1;
  if (aqi <= 150) return 2;
  if (aqi <= 200) return 3;
  if (aqi <= 300) return 4;
  return 5;
}

export default function Dashboard({ simState, activePollutant, selectedPoint, setSelectedPoint }) {
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(c => (c <= 1 ? 10 : c - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!simState) {
    return (
      <div className="w-[400px] h-full bg-neutral-900 border-l border-white/5 flex flex-col font-mono text-neutral-400">
        <div className="p-6 border-b border-white/5 bg-neutral-950/50 flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-emerald-500"></div>
        </div>
      </div>
    );
  }

  const { grid, weather, history, sinkTotals, aqiData } = simState;

  const getSelectedCellData = () => {
    if (!selectedPoint || !grid?.length) return null;
    
    let closestCell = null;
    let minDistance = Infinity;
    for (const cell of grid) {
      const d = Math.hypot(cell.lat - selectedPoint.lat, cell.lon - selectedPoint.lon);
      if (d < minDistance) {
        minDistance = d;
        closestCell = cell;
      }
    }

    if (!closestCell || minDistance > 0.3) return null;

    const usAqi = Math.round(closestCell.AQI);
    const aqiIdx = getAqiIndex(usAqi);

    return {
      name: selectedPoint.name || null,
      lat: selectedPoint.lat,
      lon: selectedPoint.lon,
      aqi: aqiIdx + 1,
      usAqi,
      pollutants: {
        'PM2.5': closestCell.PM25,
        'PM10': closestCell.PM10,
        'NO2': closestCell.NO2,
        'SO2': closestCell.SO2,
        'CO2': closestCell.CO2,
        'CO': closestCell.CO,
        'O3': closestCell.O3,
      },
      attribution: aqiData?.attribution || 'Simulated Uplink'
    };
  };

  const data = getSelectedCellData();

  const FACTORY_HUBS = (simState.sources || [])
    .filter(s => s.enabled)
    .map(s => {
      const carbonOutput = Math.round((s.emissions?.CO2 || 0) * 8.76);
      return {
        id: s.id,
        name: s.name,
        lat: s.lat,
        lon: s.lon,
        carbonOutput,
        type: s.subtype ? s.subtype.toUpperCase() : s.type.toUpperCase(),
      };
    });

  const onSelectHub = (hub) => {
    setSelectedPoint({ lat: hub.lat, lon: hub.lon, name: hub.name });
  };

  return (
    <div className="w-[400px] h-full bg-neutral-900 border-l border-white/5 flex flex-col font-mono select-none text-neutral-300">
      
      <div className="p-6 border-b border-white/5 bg-neutral-950/50">
        <div className="flex items-center gap-2 mb-1">
          <Activity size={16} className="text-emerald-500 animate-pulse" />
          <h1 className="text-xs font-bold uppercase tracking-[0.2em] text-neutral-400">System Monitoring</h1>
        </div>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-medium tracking-tight text-white">EcoWatch Terminal</h2>
          {aqiData?.attribution && (
            <span className={cn(
              "text-[8px] px-1.5 py-0.5 rounded border font-bold uppercase",
              aqiData.attribution.includes("Demo") ? "text-yellow-500 border-yellow-500/30 bg-yellow-500/5" : "text-emerald-500 border-emerald-500/30 bg-emerald-500/5"
            )}>
              {aqiData.attribution}
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-white/5">
        
        <div className="p-6">
          {data ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider text-neutral-500">Live Telemetry</span>
                <span className="text-[10px] uppercase text-emerald-500 font-bold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                  Active Uplink
                </span>
              </div>
              <div className="flex items-start justify-between">
                <h3 className="text-base font-semibold text-white">
                  {data.name || `${data.lat.toFixed(4)}°N, ${data.lon.toFixed(4)}°E`}
                </h3>
                <button 
                  onClick={() => setSelectedPoint(null)}
                  className="text-[9px] uppercase tracking-widest text-neutral-500 hover:text-white border border-white/10 hover:border-white/30 rounded px-1.5 py-0.5 transition-all"
                >
                  Reset
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg border border-white/5 bg-neutral-800/20 flex flex-col gap-1">
                  <span className="text-[10px] uppercase text-neutral-500">US AQI Value</span>
                  <span className="text-2xl font-bold text-white tracking-tighter">
                    {data.usAqi}
                  </span>
                  <span className="text-[10px] uppercase font-bold text-neutral-400">0 - 500 Scale</span>
                </div>
                
                <div className={cn(
                  "p-4 rounded-lg border flex flex-col gap-1 bg-neutral-800/20",
                  AQI_GRADES[data.aqi - 1].color.replace("bg-", "border-").replace("500", "500/30")
                )}>
                  <span className="text-[10px] uppercase text-neutral-500">Status</span>
                  <span className={cn("text-2xl font-bold", AQI_GRADES[data.aqi - 1].color.replace("bg-", "text-"))}>
                    {AQI_GRADES[data.aqi - 1].label}
                  </span>
                  <span className="text-[10px] uppercase font-bold opacity-50 text-neutral-400">Level {data.aqi}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-6 gap-y-3 pt-3 border-t border-white/5">
                {Object.entries(data.pollutants).map(([key, val]) => (
                  <div key={key} className="flex justify-between items-end border-b border-white/5 pb-1">
                    <span className="text-[10px] uppercase text-neutral-500">{key}</span>
                    <span className="text-xs font-bold text-neutral-200">
                      {typeof val === 'number' ? val.toFixed(2) : val}
                      <span className="text-[8px] text-neutral-600 ml-1">μg/m³</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-8 text-center flex flex-col items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center border border-white/10 animate-pulse">
                <MapPin size={22} className="text-neutral-500" />
              </div>
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-widest text-neutral-300 font-bold">Awaiting Telemetry Uplink</p>
                <p className="text-[10px] text-neutral-500 max-w-[250px] mx-auto leading-relaxed">
                  Select a grid coordinate on the map to bind connection and stream live localized atmospheric sensors.
                </p>
              </div>
            </div>
          )}
        </div>

        {weather && (
          <div className="p-6 space-y-4">
            <h3 className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold">Atmospheric Sensors</h3>
            
            <div className="bg-neutral-800/10 border border-white/5 rounded-lg p-3 flex flex-col items-center justify-center">
              <WindRose windDir={weather.windDir} windSpeed={weather.windSpeed} />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 rounded border border-white/5 bg-neutral-800/10 flex flex-col gap-0.5">
                <span className="text-[9px] uppercase text-neutral-500">Air Temperature</span>
                <span className="text-sm font-bold text-neutral-200">{weather.temp?.toFixed(1)} °C</span>
              </div>
              <div className="p-3 rounded border border-white/5 bg-neutral-800/10 flex flex-col gap-0.5">
                <span className="text-[9px] uppercase text-neutral-500">Relative Humidity</span>
                <span className="text-sm font-bold text-neutral-200">{weather.humidity?.toFixed(0)} %</span>
              </div>
              <div className="p-3 rounded border border-white/5 bg-neutral-800/10 flex flex-col gap-0.5">
                <span className="text-[9px] uppercase text-neutral-500">Cloud Cover</span>
                <span className="text-sm font-bold text-neutral-200">{weather.clouds?.toFixed(0)} %</span>
              </div>
              <div className="p-3 rounded border border-white/5 bg-neutral-800/10 flex flex-col gap-0.5">
                <span className="text-[9px] uppercase text-neutral-500">Wind Velocity</span>
                <span className="text-sm font-bold text-neutral-200">{weather.windSpeed?.toFixed(1)} m/s</span>
              </div>
            </div>
          </div>
        )}

        <div className="p-6 space-y-4">
          <h3 className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold">Analytical Trends</h3>
          
          {sinkTotals && (
            <div className="p-3 bg-neutral-800/10 border border-white/5 rounded-lg space-y-2">
              <span className="text-[9px] uppercase text-neutral-400 font-bold block border-b border-white/5 pb-1 mb-1">Active Carbon Capture Sinks</span>
              <div className="flex justify-between text-xs">
                <span className="text-neutral-500">CO₂ Absorption Rate</span>
                <span className="font-bold text-emerald-400">{sinkTotals.CO2.toFixed(2)} kg/hr</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-neutral-500">PM₂.₅ Sequestration</span>
                <span className="font-bold text-emerald-400">{(sinkTotals.PM25 * 1000).toFixed(2)} g/hr</span>
              </div>
            </div>
          )}

          <div className="p-3 bg-neutral-800/10 border border-white/5 rounded-lg">
            <span className="text-[9px] uppercase text-neutral-400 font-bold block mb-2">24h City AQI History</span>
            <TimelineChart history={history} />
          </div>
        </div>

        {FACTORY_HUBS.length > 0 && (
          <div className="p-6 space-y-4">
            <h3 className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold">Industrial Hotspots</h3>
            <div className="space-y-2 max-h-[220px] overflow-y-auto custom-scrollbar pr-1">
              {FACTORY_HUBS.map((hub) => (
                <button
                  key={hub.id}
                  onClick={() => onSelectHub(hub)}
                  className="w-full text-left p-3 bg-neutral-800/10 border border-white/5 rounded-lg hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all group"
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-xs font-bold text-neutral-300 group-hover:text-emerald-400 transition-colors whitespace-nowrap overflow-hidden text-ellipsis mr-2">
                      {hub.name}
                    </span>
                    <span className="text-[9px] font-mono font-bold text-red-500 bg-red-500/10 px-1 border border-red-500/20 whitespace-nowrap">
                      -{hub.carbonOutput} t/y CO₂
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t border-white/5 pt-2 mt-2">
                     <div className="flex items-center gap-2">
                        <Factory size={10} className="text-neutral-500" />
                        <span className="text-[9px] uppercase tracking-wider text-neutral-500">{hub.type}</span>
                     </div>
                     <ChevronRight size={12} className="text-neutral-600 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="p-4 bg-neutral-950 border-t border-white/5 grid grid-cols-2 gap-2">
         <div className="flex items-center gap-2 text-[9px] text-emerald-500/80 bg-emerald-500/5 px-2 py-1.5 border border-emerald-500/10 rounded">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            NODE_01: NOMINAL
         </div>
         <div className="flex items-center gap-2 text-[9px] text-blue-500/80 bg-blue-500/5 px-2 py-1.5 border border-blue-500/10 rounded">
            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
            ENV: PRODUCTION
         </div>
         <div className="col-span-2 flex items-center justify-center gap-2 text-[8px] text-neutral-500 pt-1 font-mono uppercase tracking-wider">
            <Activity size={8} className="text-neutral-500 animate-pulse" />
            Next telemetry sync in: {countdown}s
         </div>
      </div>
    </div>
  );
}
