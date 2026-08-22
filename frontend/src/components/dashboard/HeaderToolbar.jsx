import React from 'react';

export default function HeaderToolbar({ onOpenAudit, onOpenLsh, onLogout }) {
  return (
    <header className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-5 gap-4">
      <div>
        <div className="flex items-center gap-3">
          <span className="h-3 w-3 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_12px_rgba(0,194,222,0.8)]" />
          <h1 className="text-2xl font-bold tracking-tight text-white">DDAS Platform</h1>
          <span className="text-xs px-2.5 py-0.5 rounded-full border border-rose-500/40 bg-rose-950/40 text-rose-300 font-mono">
            Stage 10: Security Audit Logging & Compliance Ledger
          </span>
        </div>
        <p className="text-slate-400 text-sm mt-1">
          Secure Data Download Duplication & Anomaly Detection System
        </p>
      </div>
      <div className="flex items-center gap-2.5">
        <button
          onClick={onOpenAudit}
          className="text-xs px-3 py-2 rounded-lg bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-700/60 transition-colors flex items-center gap-1.5 shadow-[0_0_10px_rgba(244,63,94,0.2)] font-medium"
        >
          <span>🛡️</span> Security Ledger
        </button>
        <button
          onClick={onOpenLsh}
          className="text-xs px-3 py-2 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-300 border border-cyan-700/60 transition-colors flex items-center gap-1.5"
        >
          <span>⚡</span> LSH Architecture
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
