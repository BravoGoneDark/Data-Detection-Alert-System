import React from 'react';

export default function HeaderToolbar({
  onOpenAudit,
  onOpenLsh,
  onOpenAnomaly,
  onOpenQuarantine,
  onOpenWebhooks,
  onOpenRedis,
  activeThreatsCount = 0,
  activeQuarantinesCount = 0,
  activeTasksCount = 0,
  onLogout,
}) {
  return (
    <header className="flex flex-col lg:flex-row lg:items-center justify-between border-b border-slate-800 pb-5 gap-4">
      <div>
        <div className="flex items-center gap-3">
          <span className="h-3 w-3 rounded-full bg-amber-400 animate-pulse shadow-[0_0_12px_rgba(245,158,11,0.8)]" />
          <h1 className="text-2xl font-bold tracking-tight text-white">DDAS Platform</h1>
          <span className="text-xs px-2.5 py-0.5 rounded-full border border-amber-500/40 bg-amber-950/40 text-amber-300 font-mono">
            Stage 13: Distributed Redis Caching & Async Task Queue
          </span>
        </div>
        <p className="text-slate-400 text-sm mt-1">
          Sub-Millisecond Read Caching, Sliding-Window Burst Limiting & Background Worker Queue
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={onOpenRedis}
          className="text-xs px-3 py-2 rounded-lg bg-amber-950/70 hover:bg-amber-900/80 text-amber-300 border border-amber-500/60 transition-colors flex items-center gap-1.5 shadow-[0_0_10px_rgba(245,158,11,0.3)] font-semibold"
        >
          <span>⚡</span> Redis & Tasks
          {activeTasksCount > 0 && (
            <span className="ml-1 px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 text-[10px] font-extrabold animate-pulse">
              {activeTasksCount}
            </span>
          )}
        </button>
        <button
          onClick={onOpenQuarantine}
          className="text-xs px-3 py-2 rounded-lg bg-rose-950/70 hover:bg-rose-900/80 text-rose-300 border border-rose-600/60 transition-colors flex items-center gap-1.5 shadow-[0_0_10px_rgba(244,63,94,0.3)] font-medium"
        >
          <span>🔒</span> Quarantine
          {activeQuarantinesCount > 0 && (
            <span className="ml-1 px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[10px] font-bold animate-pulse">
              {activeQuarantinesCount}
            </span>
          )}
        </button>
        <button
          onClick={onOpenWebhooks}
          className="text-xs px-3 py-2 rounded-lg bg-indigo-950/60 hover:bg-indigo-900/60 text-indigo-300 border border-indigo-700/60 transition-colors flex items-center gap-1.5 shadow-[0_0_10px_rgba(99,102,241,0.2)] font-medium"
        >
          <span>📡</span> Webhooks
        </button>
        <button
          onClick={onOpenAnomaly}
          className="text-xs px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-700/60 transition-colors flex items-center gap-1.5 font-medium"
        >
          <span>⚡</span> Watchdog
          {activeThreatsCount > 0 && (
            <span className="ml-1 px-1.5 py-0.2 rounded-full bg-amber-600 text-white text-[10px] font-bold animate-pulse">
              {activeThreatsCount}
            </span>
          )}
        </button>
        <button
          onClick={onOpenAudit}
          className="text-xs px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700/60 transition-colors flex items-center gap-1.5 font-medium"
        >
          <span>🛡️</span> Ledger
        </button>
        <button
          onClick={onOpenLsh}
          className="text-xs px-3 py-2 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-300 border border-cyan-700/60 transition-colors flex items-center gap-1.5"
        >
          <span>⚡</span> LSH
        </button>
        <button
          onClick={onLogout}
          className="text-xs px-4 py-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
        >
          Logout
        </button>
      </div>
    </header>
  );
}

