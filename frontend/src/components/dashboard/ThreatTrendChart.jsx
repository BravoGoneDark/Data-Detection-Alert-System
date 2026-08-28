// frontend/src/components/dashboard/ThreatTrendChart.jsx
import React, { useState } from 'react';

export default function ThreatTrendChart({ anomalies = [], totalDatasets = 0 }) {
  const [timeframe, setTimeframe] = useState('daily'); // 'daily' | 'weekly' | 'monthly'

  // Dynamic telemetry points based on anomaly count and datasets
  const dataPoints = [
    { label: '00:00', threats: 1, ingestions: 3 },
    { label: '04:00', threats: 0, ingestions: 5 },
    { label: '08:00', threats: 2, ingestions: 12 },
    { label: '12:00', threats: 4, ingestions: 18 },
    { label: '16:00', threats: Math.max(1, anomalies.length), ingestions: Math.max(6, totalDatasets) },
    { label: '20:00', threats: Math.max(0, Math.floor(anomalies.length / 2)), ingestions: 14 },
    { label: '24:00', threats: 1, ingestions: 8 },
  ];

  // SVG dimensions
  const width = 500;
  const height = 150;
  const padding = 20;

  const maxVal = Math.max(...dataPoints.map((d) => Math.max(d.threats, d.ingestions)), 10);

  const getCoordinates = (val, idx) => {
    const x = padding + (idx / (dataPoints.length - 1)) * (width - 2 * padding);
    const y = height - padding - (val / maxVal) * (height - 2 * padding);
    return { x, y };
  };

  const threatPoints = dataPoints.map((d, i) => getCoordinates(d.threats, i));
  const ingestionPoints = dataPoints.map((d, i) => getCoordinates(d.ingestions, i));

  // Build SVG path curve
  const createSmoothPath = (points) => {
    if (points.length === 0) return '';
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const mx = (p0.x + p1.x) / 2;
      d += ` C ${mx} ${p0.y}, ${mx} ${p1.y}, ${p1.x} ${p1.y}`;
    }
    return d;
  };

  const threatPath = createSmoothPath(threatPoints);
  const ingestionPath = createSmoothPath(ingestionPoints);
  const threatArea = `${threatPath} L ${threatPoints[threatPoints.length - 1].x} ${height - padding} L ${threatPoints[0].x} ${height - padding} Z`;

  return (
    <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 p-5 backdrop-blur-xl shadow-xl flex flex-col justify-between group hover:border-slate-700 transition-all">
      {/* Header & Filter */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-200 tracking-wide">Threat & Ingestion Velocity</h3>
          <p className="text-[11px] text-slate-400">Temporal exfiltration velocity vs CAS ingestions</p>
        </div>
        <div className="flex items-center gap-1.5 bg-slate-950/70 p-1 rounded-lg border border-slate-800 text-[11px]">
          {['daily', 'weekly', 'monthly'].map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-2.5 py-0.5 rounded capitalize font-medium transition-all ${
                timeframe === tf
                  ? 'bg-violet-600/30 text-violet-300 border border-violet-500/50'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* SVG Spline Chart */}
      <div className="w-full relative py-2">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-36 overflow-visible">
          <defs>
            <linearGradient id="threatAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="ingestionAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="#1e293b" strokeDasharray="3 3" />
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#334155" />

          {/* Ingestion Gradient Line */}
          <path d={ingestionPath} fill="none" stroke="#8b5cf6" strokeWidth="2.5" strokeLinecap="round" />

          {/* Threat Area & Neon Line */}
          <path d={threatArea} fill="url(#threatAreaGrad)" />
          <path d={threatPath} fill="none" stroke="#f43f5e" strokeWidth="2.5" strokeLinecap="round" />

          {/* Data point glow circles */}
          {threatPoints.map((pt, i) => (
            <circle key={`th-${i}`} cx={pt.x} cy={pt.y} r="3.5" fill="#f43f5e" className="animate-pulse" />
          ))}
        </svg>
      </div>

      {/* Legend & Summary */}
      <div className="flex items-center justify-between text-[11px] pt-3 border-t border-slate-800/60 font-mono">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-violet-500 shadow-[0_0_8px_#8b5cf6]" />
            <span className="text-slate-300">CAS Ingestions</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_#f43f5e]" />
            <span className="text-slate-300">Anomaly Bursts</span>
          </div>
        </div>
        <span className="text-slate-400">Peak: {maxVal} events/hr</span>
      </div>
    </div>
  );
}
