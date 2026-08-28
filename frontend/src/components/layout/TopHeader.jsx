// frontend/src/components/layout/TopHeader.jsx
import React from 'react';

export default function TopHeader({
  user,
  onOpenWatchdog,
  onOpenWebhooks,
  activeThreats = 0,
}) {
  const effectiveUsername = user?.username || 'Pratyush';
  const isAdmin = user?.role === 'ADMIN' || ['pratyush', 'admin', 'carnage'].includes(effectiveUsername.toLowerCase());

  return (
    <header className="h-16 border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-xl px-6 flex items-center justify-between gap-4 sticky top-0 z-20">
      
      {/* 1. GREETING & STATUS */}
      <div className="flex items-center gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-base font-bold text-white tracking-tight">
              Welcome! <span className="text-violet-400 font-mono">{effectiveUsername}</span>
            </h2>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider font-mono ${
              isAdmin
                ? 'bg-violet-950/80 text-violet-300 border-violet-600/60 shadow-[0_0_10px_rgba(139,92,246,0.3)]'
                : 'bg-cyan-950/80 text-cyan-300 border-cyan-600/60'
            }`}>
              {isAdmin ? '👑 SOC Administrator' : `🛡️ ${user?.role || 'Member'}`}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 hidden sm:block">
            Security is a continuous process • Zero-trust forensic integrity active
          </p>
        </div>
      </div>

      {/* 2. CLUSTER STATUS & SOC QUICK ACTIONS */}
      <div className="flex items-center gap-3">
        {/* Cluster Telemetry Chip */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 text-[11px] font-mono text-slate-300">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#10b981]" />
          <span>Valkey Cluster Online</span>
        </div>

        {/* SOC Webhook Dispatcher Quick Button */}
        {onOpenWebhooks && (
          <button
            onClick={onOpenWebhooks}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-violet-500/50 hover:bg-violet-950/30 transition-all text-xs font-semibold cursor-pointer"
            title="SOC Webhook Dispatcher"
          >
            <span className="text-sm">🔔</span>
            <span className="hidden md:inline">Webhooks</span>
          </button>
        )}

        {/* Threat Alert Bell */}
        <button
          onClick={onOpenWatchdog}
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-colors relative cursor-pointer"
          title="Incident Watchdog"
        >
          <span>🛡️</span>
          {activeThreats > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-600 text-white font-bold text-[9px] flex items-center justify-center animate-bounce">
              {activeThreats}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
