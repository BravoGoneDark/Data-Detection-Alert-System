// frontend/src/components/dashboard/OverviewSection.jsx
import React, { useRef, useState, useEffect } from 'react';
import { Sparkles, Shield, Activity, Database, KeyRound, ChevronDown, ChevronUp, Layers, Terminal, Radio } from 'lucide-react';

import ScrollShowcase from './ScrollShowcase';
import RiskGauge from './RiskGauge';
import ThreatTrendChart from './ThreatTrendChart';
import ClassificationDonut from './ClassificationDonut';
import DatasetInventory from './DatasetInventory';

export default function OverviewSection({
  datasets = [],
  loadingDatasets = false,
  fetchDatasets,
  token,
  myQuarantine,
  anomalies = [],
  anomalyStats,
  quarantineStats,
  redisStats,
  webhooks = [],
  auditLogs = [],
  onOpenUpload,
  onOpenInventory,
  onOpenWatchdog,
  onOpenQuarantine,
  onOpenAudit,
  onOpenUsers,
  onOpenRedis,
  onOpenWebhooks,
  isAdmin = false,
  initialStage = 1,
  onStageChange,
}) {
  const [activeStage, setActiveStage] = useState(initialStage);
  const lastScrollTime = useRef(0);

  const activeThreats = anomalyStats?.active_threats ?? anomalies.filter((a) => a.status === 'ACTIVE').length;
  const quarantinedCount = quarantineStats?.active_quarantines ?? 0;
  const hitRatio = redisStats?.hit_ratio_percent ?? 99.7;

  useEffect(() => {
    if (initialStage && initialStage !== activeStage) {
      setActiveStage(initialStage);
    }
  }, [initialStage]);

  const selectStage = (stage) => {
    setActiveStage(stage);
    if (onStageChange) onStageChange(stage);
  };

  // Smooth mouse-wheel & touchpad card-deck scrolling
  const handleWheel = (e) => {
    const now = Date.now();
    if (now - lastScrollTime.current < 350) return;

    if (e.deltaY > 30 && activeStage < 4) {
      lastScrollTime.current = now;
      selectStage(activeStage + 1);
    } else if (e.deltaY < -30 && activeStage > 1) {
      lastScrollTime.current = now;
      selectStage(activeStage - 1);
    }
  };

  const hudItems = [
    { stage: 1, label: '01 Showcase' },
    { stage: 2, label: '02 Analytics' },
    { stage: 3, label: '03 Telemetry' },
    { stage: 4, label: '04 Inventory' },
  ];

  return (
    <div onWheel={handleWheel} className="relative w-full min-h-[calc(100vh-8rem)] flex flex-col justify-start select-none">
      
      {/* Background Ambient Glowing Watermark */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none select-none z-0">
        <div className="text-[12vw] font-black tracking-widest text-violet-500/10 drop-shadow-[0_0_80px_rgba(139,92,246,0.2)] whitespace-nowrap">
          ✦ DDAS SOC
        </div>
      </div>

      {/* FLOATING TOP STAGE CONTROLLER HUD */}
      <div className="w-full flex items-center justify-between bg-slate-950/90 backdrop-blur-2xl border border-slate-800/90 rounded-2xl px-4 py-2.5 shadow-2xl mb-4 z-40">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-violet-400 animate-ping" />
          <span className="text-xs font-mono font-bold text-white tracking-wider uppercase flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-violet-400" />
            <span>Scroll-Controlled Deck</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          {hudItems.map((item) => (
            <button
              key={item.stage}
              onClick={() => selectStage(item.stage)}
              className={`px-3 py-1 rounded-xl text-xs font-mono font-bold transition-all duration-200 cursor-pointer ${
                activeStage === item.stage
                  ? 'bg-violet-600 text-white shadow-[0_0_18px_rgba(139,92,246,0.6)] scale-105'
                  : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* STACKED DECK CONTAINER */}
      <div className="relative w-full min-h-[620px] flex-1">
        
        {/* ========================================================
            FRAME 1: HERO ARCHITECTURE SHOWCASE
            ======================================================== */}
        <div
          className={`w-full transition-all duration-300 ease-out ${
            activeStage === 1
              ? 'opacity-100 scale-100 translate-y-0 relative z-30 pointer-events-auto block'
              : 'opacity-0 scale-95 translate-y-4 absolute inset-0 z-10 pointer-events-none hidden'
          }`}
        >
          <div className="rounded-3xl bg-slate-950/95 border border-slate-800/90 backdrop-blur-2xl p-6 lg:p-7 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#10b981]" />
                <h2 className="text-xs font-mono font-bold uppercase tracking-widest text-slate-200">
                  Frame 01 • Architecture & Ingestion Defense
                </h2>
              </div>
              <button
                onClick={() => selectStage(2)}
                className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2.5 py-0.5 rounded-full hover:bg-emerald-900/60 transition-colors cursor-pointer"
              >
                <span>NEXT: FRAME 02</span>
                <ChevronDown className="w-3.5 h-3.5 animate-bounce" />
              </button>
            </div>

            <ScrollShowcase
              onOpenUpload={onOpenUpload}
              onOpenWatchdog={onOpenWatchdog}
              onOpenQuarantine={onOpenQuarantine}
              onOpenUsers={onOpenUsers}
              onOpenRedis={onOpenRedis}
              isAdmin={isAdmin}
              totalDatasets={datasets.length}
              activeThreats={activeThreats}
              quarantinedCount={quarantinedCount}
            />
          </div>
        </div>

        {/* ========================================================
            FRAME 2: 3 FLOATING ANALYTICS GRAPHS
            ======================================================== */}
        <div
          className={`w-full transition-all duration-300 ease-out ${
            activeStage === 2
              ? 'opacity-100 scale-100 translate-y-0 relative z-30 pointer-events-auto block'
              : 'opacity-0 scale-95 translate-y-4 absolute inset-0 z-10 pointer-events-none hidden'
          }`}
        >
          <div className="rounded-3xl bg-slate-950/95 border-t-2 border-t-violet-500/60 border border-slate-800/90 backdrop-blur-2xl p-6 lg:p-7 shadow-[0_25px_80px_-15px_rgba(139,92,246,0.35)] space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-violet-400 animate-pulse shadow-[0_0_8px_#8b5cf6]" />
                  <h2 className="text-sm font-mono font-bold uppercase tracking-widest text-slate-200">
                    Frame 02 • Security Posture & Vector Analytics
                  </h2>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Zero-trust health speedometer dial, temporal velocity spline, and classification clearance donut
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => selectStage(1)}
                  className="flex items-center gap-1 text-[10px] font-mono text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-full hover:text-white cursor-pointer"
                >
                  <ChevronUp className="w-3 h-3" />
                  <span>FRAME 01</span>
                </button>
                <button
                  onClick={() => selectStage(3)}
                  className="flex items-center gap-1 text-[10px] font-mono text-violet-300 bg-violet-950/60 border border-violet-800/60 px-2.5 py-0.5 rounded-full hover:bg-violet-900/60 transition-colors cursor-pointer"
                >
                  <span>NEXT: FRAME 03</span>
                  <ChevronDown className="w-3.5 h-3.5 animate-bounce" />
                </button>
              </div>
            </div>

            {/* 3 Floating Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <RiskGauge activeThreats={activeThreats} quarantinedCount={quarantinedCount} />
              </div>
              <div>
                <ThreatTrendChart anomalies={anomalies} totalDatasets={datasets.length} />
              </div>
              <div>
                <ClassificationDonut datasets={datasets} />
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================
            FRAME 3: REAL-TIME TELEMETRY & LIVE STREAM
            ======================================================== */}
        <div
          className={`w-full transition-all duration-300 ease-out ${
            activeStage === 3
              ? 'opacity-100 scale-100 translate-y-0 relative z-30 pointer-events-auto block'
              : 'opacity-0 scale-95 translate-y-4 absolute inset-0 z-10 pointer-events-none hidden'
          }`}
        >
          <div className="rounded-3xl bg-slate-950/95 border-t-2 border-t-cyan-500/60 border border-slate-800/90 backdrop-blur-2xl p-6 lg:p-7 shadow-[0_25px_80px_-15px_rgba(6,182,212,0.35)] space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#06b6d4]" />
                  <h2 className="text-sm font-mono font-bold uppercase tracking-widest text-slate-200">
                    Frame 03 • Real-Time Telemetry & SOC Counters
                  </h2>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Live operational metrics across Redis cluster, containment quarantine, and SIEM event streams
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => selectStage(2)}
                  className="flex items-center gap-1 text-[10px] font-mono text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-full hover:text-white cursor-pointer"
                >
                  <ChevronUp className="w-3 h-3" />
                  <span>FRAME 02</span>
                </button>
                <button
                  onClick={() => selectStage(4)}
                  className="flex items-center gap-1 text-[10px] font-mono text-cyan-300 bg-cyan-950/60 border border-cyan-800/60 px-2.5 py-0.5 rounded-full hover:bg-cyan-900/60 transition-colors cursor-pointer"
                >
                  <span>NEXT: FRAME 04</span>
                  <ChevronDown className="w-3.5 h-3.5 animate-bounce" />
                </button>
              </div>
            </div>

            {/* 5 Top Statfill Metric Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
              <div
                onClick={onOpenWatchdog}
                className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl shadow-lg hover:border-rose-500/50 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="p-1.5 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 text-sm">
                    🛡️
                  </span>
                  <span className="text-[9px] font-mono font-bold text-rose-400 bg-rose-950/60 px-2 py-0.5 rounded border border-rose-800/60">
                    {activeThreats > 0 ? 'ALERT' : 'CLEAR'}
                  </span>
                </div>
                <div className="text-xl font-black text-white font-mono tracking-tight group-hover:text-rose-300 transition-colors">
                  {activeThreats}
                </div>
                <div className="text-[11px] text-slate-400 font-medium">Threat Anomalies</div>
              </div>

              <div
                onClick={onOpenQuarantine}
                className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl shadow-lg hover:border-amber-500/50 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="p-1.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 text-sm">
                    🔒
                  </span>
                  <span className="text-[9px] font-mono font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/60">
                    ISOLATED
                  </span>
                </div>
                <div className="text-xl font-black text-white font-mono tracking-tight group-hover:text-amber-300 transition-colors">
                  {quarantinedCount}
                </div>
                <div className="text-[11px] text-slate-400 font-medium">Quarantined Users</div>
              </div>

              <div
                onClick={() => selectStage(4)}
                className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl shadow-lg hover:border-cyan-500/50 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="p-1.5 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-sm">
                    📁
                  </span>
                  <span className="text-[9px] font-mono font-bold text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/60">
                    CAS REPO
                  </span>
                </div>
                <div className="text-xl font-black text-white font-mono tracking-tight group-hover:text-cyan-300 transition-colors">
                  {datasets.length}
                </div>
                <div className="text-[11px] text-slate-400 font-medium">Ingested Datasets</div>
              </div>

              <div
                onClick={onOpenRedis}
                className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl shadow-lg hover:border-emerald-500/50 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="p-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-sm">
                    ⚡
                  </span>
                  <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
                    CLUSTER
                  </span>
                </div>
                <div className="text-xl font-black text-white font-mono tracking-tight group-hover:text-emerald-300 transition-colors">
                  {hitRatio}%
                </div>
                <div className="text-[11px] text-slate-400 font-medium">Redis Efficiency</div>
              </div>

              <div
                onClick={onOpenWebhooks}
                className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl shadow-lg hover:border-violet-500/50 transition-all cursor-pointer group col-span-2 sm:col-span-1"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="p-1.5 rounded-xl bg-violet-500/20 text-violet-400 border border-violet-500/30 text-sm">
                    🔔
                  </span>
                  <span className="text-[9px] font-mono font-bold text-violet-400 bg-violet-950/60 px-2 py-0.5 rounded border border-violet-800/60">
                    SOC SYNC
                  </span>
                </div>
                <div className="text-xl font-black text-white font-mono tracking-tight group-hover:text-violet-300 transition-colors">
                  {webhooks.length}
                </div>
                <div className="text-[11px] text-slate-400 font-medium">Webhook Dispatchers</div>
              </div>
            </div>

            {/* Live Threat Activity Table */}
            <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 backdrop-blur-xl shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-200 tracking-wide">Live Threat & Audit Stream</h3>
                  <p className="text-[10px] text-slate-400">Continuous SIEM compliance log & exfiltration detection feed</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={onOpenWatchdog}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-slate-200 border border-slate-700 transition-colors cursor-pointer"
                  >
                    🛡️ Watchdog
                  </button>
                  <button
                    onClick={onOpenAudit}
                    className="px-2.5 py-1 rounded-lg bg-violet-600/30 hover:bg-violet-600/50 text-[11px] font-bold text-violet-300 border border-violet-500/40 transition-colors cursor-pointer"
                  >
                    📜 Audit Ledger →
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto max-h-36">
                {anomalies.length === 0 && auditLogs.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-500 font-mono">
                    🟢 No active security threats or anomalies detected. System operating under normal parameters.
                  </div>
                ) : (
                  <table className="w-full text-left text-xs border-collapse font-mono">
                    <thead>
                      <tr className="border-b border-slate-800 text-[10px] text-slate-400 uppercase">
                        <th className="py-1.5 px-2.5">Event / Threat</th>
                        <th className="py-1.5 px-2.5">Severity</th>
                        <th className="py-1.5 px-2.5">Actor</th>
                        <th className="py-1.5 px-2.5">Target Resource</th>
                        <th className="py-1.5 px-2.5">Risk Score</th>
                        <th className="py-1.5 px-2.5 text-right">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300 text-[11px]">
                      {anomalies.slice(0, 4).map((anom) => (
                        <tr key={anom.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-2 px-2.5 font-semibold text-white flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                            {anom.anomaly_type}
                          </td>
                          <td className="py-2 px-2.5">
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                              {anom.severity}
                            </span>
                          </td>
                          <td className="py-2 px-2.5 text-slate-300">{anom.username}</td>
                          <td className="py-2 px-2.5 text-slate-400 max-w-xs truncate">{anom.dataset_filename || 'System Access'}</td>
                          <td className="py-2 px-2.5 font-bold text-rose-400">{anom.risk_score}</td>
                          <td className="py-2 px-2.5 text-right text-slate-400 text-[10px]">
                            {anom.timestamp ? new Date(anom.timestamp).toLocaleTimeString() : 'Recent'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================
            FRAME 4: CAS REPOSITORY & DATASET INVENTORY
            ======================================================== */}
        <div
          className={`w-full transition-all duration-300 ease-out ${
            activeStage === 4
              ? 'opacity-100 scale-100 translate-y-0 relative z-30 pointer-events-auto block'
              : 'opacity-0 scale-95 translate-y-4 absolute inset-0 z-10 pointer-events-none hidden'
          }`}
        >
          <div className="rounded-3xl bg-slate-950/95 border-t-2 border-t-emerald-500/60 border border-slate-800/90 backdrop-blur-2xl p-6 lg:p-7 shadow-[0_25px_80px_-15px_rgba(16,185,129,0.35)] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#10b981]" />
                  <h2 className="text-sm font-mono font-bold uppercase tracking-widest text-slate-200">
                    Frame 04 • Content-Addressable Storage Repository
                  </h2>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Multi-file bulk selection, SHA-256 sharded inventory, and instantaneous dataset downloads
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => selectStage(3)}
                  className="flex items-center gap-1 text-[10px] font-mono text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-full hover:text-white cursor-pointer"
                >
                  <ChevronUp className="w-3 h-3" />
                  <span>FRAME 03</span>
                </button>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono text-emerald-300 bg-emerald-950/60 border border-emerald-800/60 font-bold">
                  {datasets.length} ITEMS
                </span>
              </div>
            </div>

            <DatasetInventory
              datasets={datasets}
              loading={loadingDatasets}
              onRefresh={fetchDatasets}
              token={token}
              isAdmin={isAdmin}
              isQuarantined={myQuarantine?.is_quarantined}
              quarantineRiskScore={myQuarantine?.risk_score}
            />
          </div>
        </div>

      </div>

    </div>
  );
}
