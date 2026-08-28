// frontend/src/components/dashboard/RiskGauge.jsx
import React from 'react';

export default function RiskGauge({ activeThreats = 0, quarantinedCount = 0 }) {
  // Score from 0 (Critical) to 1000 (Safe). Lower threats = Higher security posture score.
  const penalty = (activeThreats * 120) + (quarantinedCount * 80);
  const rawScore = Math.max(120, 1000 - penalty);
  const score = Math.min(1000, rawScore);

  let statusLabel = 'Optimal';
  let statusColor = 'text-emerald-400';
  let badgeBg = 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300';
  let strokeGradient = ['#10b981', '#06b6d4'];

  if (score < 450) {
    statusLabel = 'Critical';
    statusColor = 'text-rose-400';
    badgeBg = 'bg-rose-500/20 border-rose-500/40 text-rose-300';
    strokeGradient = ['#f43f5e', '#fb7185'];
  } else if (score < 750) {
    statusLabel = 'Elevated';
    statusColor = 'text-amber-400';
    badgeBg = 'bg-amber-500/20 border-amber-500/40 text-amber-300';
    strokeGradient = ['#f59e0b', '#fbbf24'];
  }

  // Semi-circle SVG math
  const radius = 68;
  const circumference = Math.PI * radius; // 180 deg
  const percent = score / 1000;
  const strokeDashoffset = circumference - percent * circumference;

  return (
    <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 p-5 backdrop-blur-xl shadow-xl flex flex-col justify-between relative overflow-hidden group hover:border-slate-700 transition-all">
      {/* Background ambient glow */}
      <div
        className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl pointer-events-none opacity-20"
        style={{ background: strokeGradient[0] }}
      />

      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-200 tracking-wide">Security Posture Score</h3>
          <p className="text-[11px] text-slate-400">Zero-trust aggregate health</p>
        </div>
        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${badgeBg}`}>
          {statusLabel}
        </span>
      </div>

      {/* Radial Gauge SVG */}
      <div className="flex flex-col items-center justify-center my-3 relative">
        <svg width="180" height="105" viewBox="0 0 180 105" className="overflow-visible">
          <defs>
            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={strokeGradient[0]} />
              <stop offset="100%" stopColor={strokeGradient[1]} />
            </linearGradient>
          </defs>

          {/* Background Track */}
          <path
            d="M 20 95 A 70 70 0 0 1 160 95"
            fill="none"
            stroke="#1e293b"
            strokeWidth="14"
            strokeLinecap="round"
          />

          {/* Active Colored Arc */}
          <path
            d="M 20 95 A 70 70 0 0 1 160 95"
            fill="none"
            stroke="url(#gaugeGradient)"
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: 'stroke-dashoffset 1.2s ease-out' }}
          />
        </svg>

        {/* Center Score Readout */}
        <div className="absolute top-12 flex flex-col items-center">
          <span className={`text-3xl font-black tracking-tight ${statusColor} font-mono`}>
            {score}
          </span>
          <span className="text-[10px] text-slate-400 font-medium">out of 1000</span>
        </div>
      </div>

      {/* Bottom Range Footer */}
      <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono pt-1 border-t border-slate-800/60">
        <span>0 Critical</span>
        <span className="text-slate-400 font-semibold">{percent >= 0.8 ? '🛡️ Shield Active' : '⚠ Caution'}</span>
        <span>1000 Optimal</span>
      </div>
    </div>
  );
}
