import { useState } from 'react';

const SECTION = ({ title }) => <div className="panel-section-title">{title}</div>;

const Slider = ({ label, icon, value, min, max, step = 1, unit = '%', onChange }) => (
  <div className="control-row">
    <div className="control-label">
      <span className="control-label-text">{icon} {label}</span>
      <span className="control-label-value">{value}{unit}</span>
    </div>
    <input type="range" min={min} max={max} step={step} value={value}
      onChange={e => onChange(Number(e.target.value))} />
  </div>
);

const InterventionItem = ({ item, onRemove }) => (
  <div className="intervention-item">
    <span className="icon">{item.icon}</span>
    <span className="name">{item.name}</span>
    <button className="remove-btn" onClick={() => onRemove(item.id)}>✕</button>
  </div>
);

export default function ControlPanel({
  simState, placingMode, onSetPlacingMode,
  onTransportChange, onEnergyChange, onGreenRoof,
  onRemoveSource, onRemoveSink,
}) {
  const [tab, setTab] = useState('green');
  const [newPlant, setNewPlant]     = useState({ type: 'coal', cap: 500 });
  const [newFactory, setNewFactory] = useState({ type: 'heavy', count: 2 });
  const [newTrees, setNewTrees]     = useState({ count: 5000, radius: 1 });
  const [newForest, setNewForest]   = useState({ area: 50 });
  const [newWetland, setNewWetland] = useState({ area: 20 });

  const ts = simState?.transportSettings || {};
  const es = simState?.energySettings    || {};
  const grp = simState?.greenRoofPct || 0;

  const userSources = (simState?.sources || []).filter(s => !['Pimpri Industrial Zone','Hadapsar Industrial Estate','Chakan Auto Cluster','Pune Gas Station'].includes(s.name));
  const userSinks   = simState?.sinks || [];

  return (
    <aside className="sidebar">
      <div className="panel-header">
        <h2>🎛 Interventions</h2>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
          Click a category, configure, then click map to place.
        </div>
      </div>

      {/* Tabs */}
      <div style={{ padding: '10px 12px 0', flexShrink: 0 }}>
        <div className="mode-tabs">
          {[['green','🌳 Green'],['industry','🏭 Industry'],['transport','🚗 Transport'],['energy','⚡ Energy']].map(([id,label]) => (
            <button key={id} className={`mode-tab ${tab===id?'active':''}`} onClick={() => setTab(id)}>{label}</button>
          ))}
        </div>
      </div>

      <div className="panel-body">

        {/* ── GREEN TAB ─────────────────────────────── */}
        {tab === 'green' && <>
          <SECTION title="🌳 Plant Trees" />
          <div className="control-row">
            <div className="control-label">
              <span className="control-label-text">🌳 Tree count</span>
              <span className="control-label-value">{newTrees.count.toLocaleString()}</span>
            </div>
            <input type="range" min={100} max={100000} step={100} value={newTrees.count}
              onChange={e => setNewTrees(p => ({ ...p, count: +e.target.value }))} />
          </div>
          <div className="control-row">
            <div className="control-label">
              <span className="control-label-text">📍 Radius</span>
              <span className="control-label-value">{newTrees.radius} km</span>
            </div>
            <input type="range" min={0.2} max={5} step={0.1} value={newTrees.radius}
              onChange={e => setNewTrees(p => ({ ...p, radius: +e.target.value }))} />
          </div>
          <button className="btn btn-green" style={{ width: '100%' }}
            onClick={() => onSetPlacingMode({ type: 'trees', subtype: 'trees', params: { count: newTrees.count, radiusKm: newTrees.radius, name: `${newTrees.count.toLocaleString()} Trees` } })}>
            📍 Place Trees on Map
          </button>

          <SECTION title="🌲 Build Forest" />
          <div className="control-row">
            <div className="control-label">
              <span className="control-label-text">🌲 Area (hectares)</span>
              <span className="control-label-value">{newForest.area} ha</span>
            </div>
            <input type="range" min={5} max={500} step={5} value={newForest.area}
              onChange={e => setNewForest({ area: +e.target.value })} />
          </div>
          <button className="btn btn-green" style={{ width: '100%' }}
            onClick={() => onSetPlacingMode({ type: 'forest', subtype: 'forest', params: { areaHa: newForest.area, name: `${newForest.area}ha Forest` } })}>
            📍 Place Forest on Map
          </button>

          <SECTION title="🌿 Wetland / Water Body" />
          <div className="control-row">
            <div className="control-label">
              <span className="control-label-text">💧 Area (hectares)</span>
              <span className="control-label-value">{newWetland.area} ha</span>
            </div>
            <input type="range" min={5} max={200} step={5} value={newWetland.area}
              onChange={e => setNewWetland({ area: +e.target.value })} />
          </div>
          <button className="btn btn-green" style={{ width: '100%' }}
            onClick={() => onSetPlacingMode({ type: 'wetland', subtype: 'wetland', params: { areaHa: newWetland.area, name: `${newWetland.area}ha Wetland` } })}>
            📍 Place Wetland on Map
          </button>

          <SECTION title="🏡 Green Rooftops (City-Wide)" />
          <Slider label="Rooftop Coverage" icon="🏡" value={grp} min={0} max={80} unit="%" onChange={onGreenRoof} />
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', padding: '0 4px' }}>
            Absorbs ~{(grp * 0.02).toFixed(2)} tonne CO₂/hr city-wide
          </div>
        </>}

        {/* ── INDUSTRY TAB ──────────────────────────── */}
        {tab === 'industry' && <>
          <SECTION title="⚡ Power Plant" />
          <div className="control-row">
            <div className="control-label">
              <span className="control-label-text">Type</span>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[['coal','🏭 Coal'],['gas','⚡ Gas'],['solar','☀️ Solar'],['wind','💨 Wind']].map(([t,l]) => (
                <button key={t} className={`btn btn-sm ${newPlant.type===t?'btn-primary':'btn-danger'}`} style={{ flex: 1 }}
                  onClick={() => setNewPlant(p => ({ ...p, type: t }))}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div className="control-row">
            <div className="control-label">
              <span className="control-label-text">⚡ Capacity</span>
              <span className="control-label-value">{newPlant.cap} MW</span>
            </div>
            <input type="range" min={50} max={2000} step={50} value={newPlant.cap}
              onChange={e => setNewPlant(p => ({ ...p, cap: +e.target.value }))} />
          </div>
          <button className="btn btn-primary" style={{ width: '100%' }}
            onClick={() => onSetPlacingMode({ type: 'powerPlant', subtype: newPlant.type, params: { capacityMW: newPlant.cap, name: `${newPlant.cap}MW ${newPlant.type} plant` } })}>
            📍 Place Plant on Map
          </button>

          <SECTION title="🏭 Factory / Industry" />
          <div className="control-row">
            <div className="control-label"><span className="control-label-text">Factory Type</span></div>
            <div style={{ display: 'flex', gap: 6 }}>
              {[['light','Light'],['heavy','Heavy'],['cement','Cement']].map(([t,l]) => (
                <button key={t} className={`btn btn-sm ${newFactory.type===t?'btn-primary':''}`} style={{ flex: 1, border: '1px solid var(--border)' }}
                  onClick={() => setNewFactory(p => ({ ...p, type: t }))}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div className="control-row">
            <div className="control-label">
              <span className="control-label-text">Count</span>
              <span className="control-label-value">{newFactory.count}</span>
            </div>
            <input type="range" min={1} max={20} value={newFactory.count}
              onChange={e => setNewFactory(p => ({ ...p, count: +e.target.value }))} />
          </div>
          <button className="btn btn-danger" style={{ width: '100%' }}
            onClick={() => onSetPlacingMode({ type: 'factory', subtype: newFactory.type, params: { count: newFactory.count, name: `${newFactory.count}× ${newFactory.type} factory` } })}>
            📍 Place Factory on Map
          </button>
        </>}

        {/* ── TRANSPORT TAB ─────────────────────────── */}
        {tab === 'transport' && <>
          <SECTION title="🚗 Vehicle Fleet" />
          <Slider label="EV Adoption" icon="⚡" value={ts.evPct ?? 5} min={0} max={100} unit="%" onChange={v => onTransportChange({ evPct: v })} />
          <Slider label="Public Transit Use" icon="🚌" value={ts.publicTransitPct ?? 20} min={0} max={100} unit="%" onChange={v => onTransportChange({ publicTransitPct: v })} />
          <Slider label="Cycling Trips" icon="🚲" value={ts.cyclingPct ?? 5} min={0} max={50} unit="%" onChange={v => onTransportChange({ cyclingPct: v })} />
          <div className="card" style={{ marginTop: 8 }}>
            <div className="card-title">Fleet Emission Reduction</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 6 }}>
              <div>EV saves: <strong style={{ color: 'var(--green)' }}>{((ts.evPct||0) * 0.8).toFixed(0)}%</strong> of road CO₂</div>
              <div>Transit saves: <strong style={{ color: 'var(--green)' }}>{((ts.publicTransitPct||0) * 0.6).toFixed(0)}%</strong> of car trips</div>
              <div>Cycling saves: <strong style={{ color: 'var(--green)' }}>{((ts.cyclingPct||0) * 0.5).toFixed(0)}%</strong> of 2W trips</div>
            </div>
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', padding: '4px' }}>
            Daily fleet CO₂: <strong>{simState?.fleetSummary?.CO2_tonne_day ?? '—'} t</strong> &nbsp;|&nbsp;
            PM₂.₅: <strong>{simState?.fleetSummary?.PM25_kg_day ?? '—'} kg</strong>
          </div>
        </>}

        {/* ── ENERGY TAB ────────────────────────────── */}
        {tab === 'energy' && <>
          <SECTION title="⚡ Grid Decarbonization" />
          <Slider label="Rooftop Solar" icon="☀️" value={es.rooftopSolarPct ?? 0} min={0} max={80} unit="%" onChange={v => onEnergyChange({ rooftopSolarPct: v })} />
          <Slider label="Solar Farm" icon="🌞" value={es.solarFarmMW ?? 0} min={0} max={2000} step={50} unit=" MW" onChange={v => onEnergyChange({ solarFarmMW: v })} />
          <Slider label="Wind Farm" icon="💨" value={es.windFarmMW ?? 0} min={0} max={1000} step={50} unit=" MW" onChange={v => onEnergyChange({ windFarmMW: v })} />
          <Slider label="Retire Coal Plants" icon="🚫" value={es.retireCoalPct ?? 0} min={0} max={100} unit="%" onChange={v => onEnergyChange({ retireCoalPct: v })} />
          {simState?.energySummary && (
            <div className="card" style={{ marginTop: 8 }}>
              <div className="card-title">Grid Status</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div>Intensity: <strong style={{ color: 'var(--accent)' }}>{simState.energySummary.intensity}</strong></div>
                <div>Renewables: <strong style={{ color: 'var(--green)' }}>{simState.energySummary.renewablePct}</strong></div>
                <div>CO₂/day: <strong style={{ color: 'var(--orange)' }}>{simState.energySummary.CO2_tonne_day} t</strong></div>
              </div>
              {/* Energy mix bar */}
              <div className="energy-bar" style={{ marginTop: 8 }}>
                {Object.entries(simState.energySummary.mix || {}).map(([src, frac]) => {
                  const colors = { coal: '#555', gas: '#ff8c00', solar: '#ffd700', wind: '#00d4ff', hydro: '#0099ff' };
                  return <div key={src} className="energy-seg" style={{ width: `${frac*100}%`, background: colors[src]||'#888' }} title={`${src}: ${(frac*100).toFixed(1)}%`} />;
                })}
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 5 }}>
                {Object.entries(simState.energySummary.mix || {}).map(([src, frac]) => {
                  const colors = { coal: '#888', gas: '#ff8c00', solar: '#ffd700', wind: '#00d4ff', hydro: '#0099ff' };
                  return <span key={src} style={{ fontSize: '0.65rem', color: colors[src]||'#888' }}>■ {src} {(frac*100).toFixed(0)}%</span>;
                })}
              </div>
            </div>
          )}
        </>}

        {/* ── Active Interventions ───────────────────── */}
        {(userSources.length > 0 || userSinks.length > 0) && <>
          <SECTION title="📌 Active User Interventions" />
          {userSources.map(s => <InterventionItem key={s.id} item={s} onRemove={onRemoveSource} />)}
          {userSinks.map(s   => <InterventionItem key={s.id} item={s} onRemove={onRemoveSink}   />)}
        </>}

        {/* ── Default Sources Note ────────────────────── */}
        <SECTION title="🏙 Pune Baseline Sources" />
        {(simState?.sources || []).filter(s => ['Pimpri Industrial Zone','Hadapsar Industrial Estate','Chakan Auto Cluster','Pune Gas Station'].includes(s.name))
          .map(s => (
            <div key={s.id} className="intervention-item" style={{ opacity: 0.6 }}>
              <span className="icon">{s.icon}</span>
              <span className="name" style={{ fontSize: '0.72rem' }}>{s.name}</span>
            </div>
          ))
        }
      </div>
    </aside>
  );
}
