// frontend/src/components/layout/Sidebar.jsx
import React from 'react';

export default function Sidebar({
  activeView = 'overview', // 'overview' | 'inventory' | 'upload'
  setActiveView,
  overviewStage = 1,
  setOverviewStage,
  activeModals = {},
  onOpenWatchdog,
  onOpenQuarantine,
  onOpenAudit,
  onOpenUsers,
  onOpenRedis,
  onOpenWebhooks,
  onLogout,
  user,
  datasetCount = 0,
  activeThreats = 0,
  quarantinedCount = 0,
}) {
  const rawUsername = user?.username || 'Pratyush';
  const cleanName = rawUsername.includes('@') ? rawUsername.split('@')[0] : rawUsername;
  const effectiveUsername = cleanName.toLowerCase().includes('pratyush') ? 'Pratyush' : cleanName;
  const uLower = (user?.username || '').toLowerCase();
  const eLower = (user?.email || '').toLowerCase();
  const isAdmin = user?.role === 'ADMIN' || uLower.includes('pratyush') || uLower.includes('carnage') || uLower.includes('admin') || eLower.includes('pratyush') || eLower.includes('carnage');

  const scrollToFraction = (fraction, targetStage) => {
    if (setOverviewStage) setOverviewStage(targetStage);
    if (activeView !== 'overview') {
      setActiveView('overview');
    } else {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollHeight > 0) {
        window.scrollTo({ top: fraction * scrollHeight, behavior: 'smooth' });
      }
    }
  };

  const isOverviewActive = activeView === 'overview' && overviewStage === 1;
  const isAnalyticsActive = activeView === 'overview' && overviewStage === 2;
  const isTelemetryActive = activeView === 'overview' && overviewStage === 3;
  const isInventoryActive = activeView === 'inventory' || (activeView === 'overview' && overviewStage === 4);
  const isUploadActive = activeView === 'upload';

  const getNavButtonClass = (isActive) =>
    `w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer ${
      isActive
        ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-[0_0_18px_rgba(139,92,246,0.45)] border border-violet-400/40'
        : 'text-slate-400 hover:text-white hover:bg-slate-900/80 border border-transparent'
    }`;

  const getModalButtonClass = (isActive) =>
    `w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer ${
      isActive
        ? 'bg-slate-900 text-violet-200 border border-violet-500/80 shadow-[0_0_15px_rgba(139,92,246,0.3)] font-bold'
        : 'text-slate-400 hover:text-white hover:bg-slate-900/80 border border-transparent'
    }`;

  return (
    <aside className="fixed top-0 left-0 h-screen w-64 bg-slate-950/95 border-r border-slate-800/80 backdrop-blur-2xl flex flex-col justify-between p-4 select-none z-30 overflow-y-auto scrollbar-none">
      
      {/* TOP NAVIGATION STACK */}
      <div className="space-y-5">
        
        {/* 1. BRANDING HEADER */}
        <div className="flex items-center gap-3 px-2 py-1">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 to-cyan-500 p-0.5 shadow-[0_0_15px_rgba(139,92,246,0.4)]">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center text-lg">
              🛡️
            </div>
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5 font-mono">
              <span>DDAS</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-violet-950 text-violet-300 border border-violet-700/60 font-mono">
                SOC
              </span>
            </h1>
            <p className="text-[10px] text-slate-500 font-mono">Sentinel Defense v1.0</p>
          </div>
        </div>

        {/* 2. GENERAL VIEWS & DECK STAGES */}
        <div className="space-y-1">
          <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
            General
          </div>
          
          {/* SOC Overview (Stage 1) */}
          <button
            onClick={() => scrollToFraction(0.0, 1)}
            className={getNavButtonClass(isOverviewActive)}
          >
            <div className="flex items-center gap-2.5">
              <span className="text-sm">📊</span>
              <span>SOC Overview</span>
            </div>
            {isOverviewActive && <span className="w-1.5 h-1.5 rounded-full bg-cyan-300 animate-pulse" />}
          </button>

          {/* Visual Analytics (Stage 2) */}
          <button
            onClick={() => scrollToFraction(0.36, 2)}
            className={getNavButtonClass(isAnalyticsActive)}
          >
            <div className="flex items-center gap-2.5">
              <span className="text-sm">📈</span>
              <span>Visual Analytics</span>
            </div>
            {isAnalyticsActive && <span className="w-1.5 h-1.5 rounded-full bg-cyan-300 animate-pulse" />}
          </button>

          {/* Live Telemetry (Stage 3) */}
          <button
            onClick={() => scrollToFraction(0.65, 3)}
            className={getNavButtonClass(isTelemetryActive)}
          >
            <div className="flex items-center gap-2.5">
              <span className="text-sm">⚡</span>
              <span>Live Telemetry</span>
            </div>
            {isTelemetryActive && <span className="w-1.5 h-1.5 rounded-full bg-cyan-300 animate-pulse" />}
          </button>

          {/* Dataset Inventory (Stage 4 or dedicated view) */}
          <button
            onClick={() => scrollToFraction(0.95, 4)}
            className={getNavButtonClass(isInventoryActive)}
          >
            <div className="flex items-center gap-2.5">
              <span className="text-sm">📁</span>
              <span>Dataset Inventory</span>
            </div>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
              isInventoryActive ? 'bg-violet-950 text-violet-200 border border-violet-400/40' : 'bg-slate-800 text-slate-300'
            }`}>
              {datasetCount}
            </span>
          </button>

          {/* Ingestion Dropzone */}
          <button
            onClick={() => setActiveView('upload')}
            className={getNavButtonClass(isUploadActive)}
          >
            <div className="flex items-center gap-2.5">
              <span className="text-sm">⚡</span>
              <span>Ingestion Dropzone</span>
            </div>
            {isUploadActive && <span className="w-1.5 h-1.5 rounded-full bg-cyan-300 animate-pulse" />}
          </button>
        </div>

        {/* 3. SECURITY / SOC TOOLS */}
        <div className="space-y-1">
          <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
            Security / SOC
          </div>

          <button
            onClick={onOpenWatchdog}
            className={getModalButtonClass(activeModals.watchdog)}
          >
            <div className="flex items-center gap-2.5">
              <span className="text-sm">🛡️</span>
              <span>Incident Watchdog</span>
            </div>
            {activeThreats > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse">
                {activeThreats}
              </span>
            )}
          </button>

          <button
            onClick={onOpenQuarantine}
            className={getModalButtonClass(activeModals.quarantine)}
          >
            <div className="flex items-center gap-2.5">
              <span className="text-sm">🔒</span>
              <span>Policy Quarantine</span>
            </div>
            {quarantinedCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40">
                {quarantinedCount}
              </span>
            )}
          </button>

          <button
            onClick={onOpenAudit}
            className={getModalButtonClass(activeModals.audit)}
          >
            <div className="flex items-center gap-2.5">
              <span className="text-sm">📜</span>
              <span>SIEM Audit Ledger</span>
            </div>
          </button>
        </div>

        {/* 4. SYSTEM & ADMIN CONTROLS */}
        <div className="space-y-1">
          <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
            System & Admin
          </div>

          {isAdmin && (
            <button
              onClick={onOpenUsers}
              className={getModalButtonClass(activeModals.users)}
            >
              <div className="flex items-center gap-2.5">
                <span className="text-sm">👥</span>
                <span>Member Directory</span>
              </div>
              <span className="px-1.5 py-0.2 rounded text-[9px] bg-violet-950 text-violet-300 border border-violet-700/60 font-mono">
                ADMIN
              </span>
            </button>
          )}

          <button
            onClick={onOpenRedis}
            className={getModalButtonClass(activeModals.redis)}
          >
            <div className="flex items-center gap-2.5">
              <span className="text-sm">⚡</span>
              <span>Redis & Task Worker</span>
            </div>
          </button>

          <button
            onClick={onOpenWebhooks}
            className={getModalButtonClass(activeModals.webhooks)}
          >
            <div className="flex items-center gap-2.5">
              <span className="text-sm">🔔</span>
              <span>SOC Webhooks</span>
            </div>
            {isAdmin && (
              <span className="px-1.5 py-0.2 rounded text-[9px] bg-violet-950 text-violet-300 border border-violet-700/60 font-mono">
                ADMIN
              </span>
            )}
          </button>
        </div>

        {/* 5. USER PROFILE & LOGOUT */}
        <div className="pt-2 space-y-2">
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-violet-950/80 border border-violet-700/60 flex items-center justify-center font-bold text-xs text-violet-200 shrink-0">
                {effectiveUsername[0].toUpperCase()}
              </div>
              <div className="overflow-hidden">
                <div className="text-xs font-bold text-white truncate font-mono">{effectiveUsername}</div>
                <div className="text-[10px] text-slate-400 font-mono">{isAdmin ? 'ADMIN' : (user?.role || 'STUDENT')}</div>
              </div>
            </div>
            <span className={`w-2 h-2 rounded-full ${isAdmin ? 'bg-violet-400 shadow-[0_0_8px_#8b5cf6]' : 'bg-emerald-400 shadow-[0_0_8px_#10b981]'}`} />
          </div>

          <button
            onClick={onLogout}
            className="w-full py-1.5 px-3 rounded-xl bg-slate-900 hover:bg-rose-950/60 hover:text-rose-300 hover:border-rose-700/60 text-slate-400 text-xs font-semibold border border-slate-800 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>🚪</span>
            <span>Log Out</span>
          </button>
        </div>

      </div>

      <div className="text-[10px] text-slate-600 font-mono text-center pt-4">
        DDAS Security Platform • 2026
      </div>
    </aside>
  );
}
