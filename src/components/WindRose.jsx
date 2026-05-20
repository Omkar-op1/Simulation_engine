/**
 * WindRose — SVG compass showing wind direction and speed
 */
export default function WindRose({ windDir = 0, windSpeed = 0 }) {
  // Convert meteorological direction (wind FROM) → arrow tip direction (wind TO)
  const arrowDeg = (windDir + 180) % 360;
  const radians  = (arrowDeg - 90) * (Math.PI / 180);
  const cx = 40, cy = 40, r = 28;
  const tipX = cx + r * Math.cos(radians);
  const tipY = cy + r * Math.sin(radians);
  const tailX = cx - (r * 0.55) * Math.cos(radians);
  const tailY = cy - (r * 0.55) * Math.sin(radians);

  // Arrowhead
  const headLen = 8, headAngle = 0.4;
  const angle = Math.atan2(tipY - tailY, tipX - tailX);
  const ah1x = tipX - headLen * Math.cos(angle - headAngle);
  const ah1y = tipY - headLen * Math.sin(angle - headAngle);
  const ah2x = tipX - headLen * Math.cos(angle + headAngle);
  const ah2y = tipY - headLen * Math.sin(angle + headAngle);

  const cardinals = ['N', 'E', 'S', 'W'];
  const cardPos = [
    { x: cx, y: 8, label: 'N' },
    { x: 73, y: cy + 4, label: 'E' },
    { x: cx, y: 75, label: 'S' },
    { x: 7,  y: cy + 4, label: 'W' },
  ];

  const beaufort = windSpeed < 1 ? 'Calm' : windSpeed < 3 ? 'Light' : windSpeed < 6 ? 'Moderate' : windSpeed < 10 ? 'Fresh' : 'Strong';
  const compassDir = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW']
    [Math.round(windDir / 22.5) % 16];

  return (
    <div className="wind-rose-wrap">
      <svg width="80" height="80" viewBox="0 0 80 80">
        {/* Outer circle */}
        <circle cx={cx} cy={cy} r={r + 4} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={0.5} />

        {/* Cardinal ticks */}
        {[0,90,180,270].map(a => {
          const ra = (a - 90) * Math.PI / 180;
          return <line key={a}
            x1={cx + (r-4) * Math.cos(ra)} y1={cy + (r-4) * Math.sin(ra)}
            x2={cx + (r+4) * Math.cos(ra)} y2={cy + (r+4) * Math.sin(ra)}
            stroke="rgba(255,255,255,0.2)" strokeWidth={1} />;
        })}

        {/* Cardinal labels */}
        {cardPos.map(({ x, y, label }) => (
          <text key={label} x={x} y={y} textAnchor="middle"
            fill={label === 'N' ? '#00d4ff' : 'rgba(200,225,255,0.4)'}
            fontSize="7" fontWeight={label === 'N' ? '700' : '400'}
            fontFamily="Inter,sans-serif">
            {label}
          </text>
        ))}

        {/* Wind arrow shaft */}
        <line x1={tailX} y1={tailY} x2={tipX} y2={tipY}
          stroke="#00d4ff" strokeWidth={2} strokeLinecap="round" />

        {/* Arrowhead */}
        <polygon points={`${tipX},${tipY} ${ah1x},${ah1y} ${ah2x},${ah2y}`}
          fill="#00d4ff" opacity={0.9} />

        {/* Center dot */}
        <circle cx={cx} cy={cy} r={3} fill="#00d4ff" opacity={0.7} />

        {/* Speed ring fill */}
        <circle cx={cx} cy={cy} r={Math.min(r - 2, windSpeed * 2.5)}
          fill="rgba(0,212,255,0.08)" />
      </svg>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>
          {windSpeed.toFixed(1)} m/s
        </div>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
          From <strong style={{ color: 'var(--accent)' }}>{compassDir}</strong> ({windDir}°)
        </div>
        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
          {beaufort} breeze
        </div>
        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
          {windDir >= 315 || windDir < 45 ? '↓ Northerly — disperses S' :
           windDir < 135 ? '← Easterly — disperses W' :
           windDir < 225 ? '↑ Southerly — disperses N' : '→ Westerly — disperses E'}
        </div>
      </div>
    </div>
  );
}
