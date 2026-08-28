// frontend/src/components/dashboard/ClassificationDonut.jsx
import React from 'react';

export default function ClassificationDonut({ datasets = [] }) {
  // Count by classification
  const counts = {
    CONFIDENTIAL: 0,
    RESTRICTED: 0,
    INTERNAL: 0,
    PUBLIC: 0,
  };

  datasets.forEach((d) => {
    const cls = (d.classification || 'INTERNAL').toUpperCase();
    counts[cls] = (counts[cls] || 0) + 1;
  });

  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;

  const tiers = [
    { label: 'CONFIDENTIAL', count: counts.CONFIDENTIAL, color: '#f43f5e', bg: 'bg-rose-500' },
    { label: 'RESTRICTED', count: counts.RESTRICTED, color: '#f59e0b', bg: 'bg-amber-500' },
    { label: 'INTERNAL', count: counts.INTERNAL, color: '#06b6d4', bg: 'bg-cyan-500' },
    { label: 'PUBLIC', count: counts.PUBLIC, color: '#10b981', bg: 'bg-emerald-500' },
  ];

  // SVG Donut calculation
  const size = 130;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercent = 0;

  return (
    <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 p-5 backdrop-blur-xl shadow-xl flex flex-col justify-between group hover:border-slate-700 transition-all">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-sm font-bold text-slate-200 tracking-wide">Data Classification Vectors</h3>
          <p className="text-[11px] text-slate-400">Clearance distribution breakdown</p>
        </div>
        <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/60">
          {datasets.length} Total
        </span>
      </div>

      <div className="flex items-center justify-center gap-6 my-2">
        {/* SVG Donut Chart */}
        <div className="relative flex items-center justify-center">
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
            {/* Background Circle */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="#1e293b"
              strokeWidth={strokeWidth}
            />

            {/* Segments */}
            {tiers.map((tier) => {
              const segmentPercent = tier.count / total;
              const strokeDasharray = `${segmentPercent * circumference} ${circumference}`;
              const strokeDashoffset = -accumulatedPercent * circumference;
              accumulatedPercent += segmentPercent;

              if (tier.count === 0) return null;

              return (
                <circle
                  key={tier.label}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={tier.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  className="transition-all duration-700"
                />
              );
            })}
          </svg>

          {/* Center Label */}
          <div className="absolute flex flex-col items-center">
            <span className="text-xl font-bold font-mono text-white">
              {Math.round((counts.INTERNAL / total) * 100)}%
            </span>
            <span className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold">Internal</span>
          </div>
        </div>

        {/* Legend */}
        <div className="space-y-1.5 flex-1">
          {tiers.map((tier) => (
            <div key={tier.label} className="flex items-center justify-between text-[11px] font-mono">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${tier.bg}`} style={{ boxShadow: `0 0 6px ${tier.color}` }} />
                <span className="text-slate-300 capitalize">{tier.label.toLowerCase()}</span>
              </div>
              <span className="text-slate-400 font-bold">{tier.count}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-800/60 font-mono flex items-center justify-between">
        <span>Policy: NIST-800.53</span>
        <span className="text-emerald-400">✓ Enforced</span>
      </div>
    </div>
  );
}
