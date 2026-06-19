import React from 'react';

/**
 * Tiny dependency-free SVG charts. Responsive via viewBox; styling via CSS vars.
 */

export function LineChart({ data = [], height = 160, stroke = 'var(--accent-primary)', fill = 'var(--accent-primary-glow)', unit = '' }) {
  if (!data || data.length === 0) {
    return <div className="chart-empty">No data yet</div>;
  }
  const W = 320;
  const H = height;
  const padX = 6;
  const padY = 12;
  const values = data.map(d => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const n = data.length;

  const x = (i) => padX + (n === 1 ? (W - 2 * padX) / 2 : (i / (n - 1)) * (W - 2 * padX));
  const y = (v) => padY + (1 - (v - min) / range) * (H - 2 * padY);

  const linePts = data.map((d, i) => `${x(i)},${y(d.value)}`).join(' ');
  const areaPts = `${padX},${H - padY} ${linePts} ${W - padX},${H - padY}`;
  const last = data[data.length - 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" role="img">
      <polyline points={areaPts} fill={fill} stroke="none" />
      <polyline points={linePts} fill="none" stroke={stroke} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      {data.map((d, i) => (
        <circle key={i} cx={x(i)} cy={y(d.value)} r={i === n - 1 ? 3.5 : 2} fill={stroke} />
      ))}
      <text x={W - padX} y={Math.max(12, y(last.value) - 8)} textAnchor="end" fontSize="11" fill="var(--text-secondary)">
        {Math.round(last.value).toLocaleString()}{unit}
      </text>
    </svg>
  );
}

export function BarChart({ data = [], height = 140, color = 'var(--accent-primary)', unit = '' }) {
  if (!data || data.length === 0) {
    return <div className="chart-empty">No data yet</div>;
  }
  const W = 320;
  const H = height;
  const padY = 14;
  const n = data.length;
  const gap = 4;
  const barW = (W / n) - gap;
  const max = Math.max(...data.map(d => d.value)) || 1;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" role="img">
      {data.map((d, i) => {
        const h = (d.value / max) * (H - 2 * padY);
        const xPos = i * (barW + gap) + gap / 2;
        return (
          <g key={i}>
            <rect
              x={xPos}
              y={H - padY - h}
              width={barW}
              height={Math.max(h, d.value > 0 ? 2 : 0)}
              rx="3"
              fill={color}
              opacity={i === n - 1 ? 1 : 0.55}
            />
            {d.label && (
              <text x={xPos + barW / 2} y={H - 3} textAnchor="middle" fontSize="9" fill="var(--text-tertiary)">
                {d.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
