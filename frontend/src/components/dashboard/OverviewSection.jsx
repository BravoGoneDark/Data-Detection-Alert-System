// frontend/src/components/dashboard/OverviewSection.jsx
import React, { useRef, useState, useEffect } from 'react';
import { motion, useScroll, useTransform, useSpring, useMotionValueEvent } from 'motion/react';
import { Sparkles, Shield, Activity, Database, KeyRound, ChevronDown, Layers, Terminal, Radio } from 'lucide-react';

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
  const containerRef = useRef(null);
  const [activeStage, setActiveStage] = useState(initialStage);
  const isProgrammaticRef = useRef(false);
  const scrollLockTimerRef = useRef(null);

  const activeThreats = anomalyStats?.active_threats ?? anomalies.filter((a) => a.status === 'ACTIVE').length;
  const quarantinedCount = quarantineStats?.active_quarantines ?? 0;
  const hitRatio = redisStats?.hit_ratio_percent ?? 99.7;

  // 1. Balanced 400vh track for smooth, continuous mousepad/trackpad scrolling overlay
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  // 2. High-speed critically-damped spring physics
  const progress = useSpring(scrollYProgress, {
    stiffness: 160,
    damping: 32,
    mass: 0.2,
    restDelta: 0.0001,
  });

  // Direct jump function that sets the spring immediately to bypass intermediate frames on clicks
  const jumpToFraction = (fraction, stage) => {
    setActiveStage(stage);
    if (onStageChange) onStageChange(stage);
    isProgrammaticRef.current = true;
    clearTimeout(scrollLockTimerRef.current);
    scrollLockTimerRef.current = setTimeout(() => {
      isProgrammaticRef.current = false;
    }, 150);

    // Snap spring value directly to target so intermediate frames are completely skipped!
    if (typeof progress.jump === 'function') {
      progress.jump(fraction);
    } else if (typeof progress.set === 'function') {
      progress.set(fraction);
    }

    if (containerRef.current) {
      const scrollableHeight = containerRef.current.offsetHeight - window.innerHeight;
      const top = containerRef.current.offsetTop + fraction * scrollableHeight;
      window.scrollTo({ top: Math.max(0, top), behavior: 'instant' });
    }
  };

  // Sync with initialStage when coming from sidebar or another view
  useEffect(() => {
    if (initialStage && containerRef.current) {
      const fractions = { 1: 0.0, 2: 0.36, 3: 0.65, 4: 0.95 };
      const frac = fractions[initialStage] ?? 0.0;
      jumpToFraction(frac, initialStage);
    }
  }, [initialStage]);

  // 3. Sync HUD pill highlights in exact lockstep during continuous mouse/trackpad scrolling
  useMotionValueEvent(progress, 'change', (latest) => {
    if (isProgrammaticRef.current) return;
    let nextStage = 1;
    if (latest < 0.23) {
      nextStage = 1;
    } else if (latest >= 0.23 && latest < 0.49) {
      nextStage = 2;
    } else if (latest >= 0.49 && latest < 0.75) {
      nextStage = 3;
    } else {
      nextStage = 4;
    }
    setActiveStage(nextStage);
    if (onStageChange) onStageChange(nextStage);
  });

  // Background Watermark "✦ DDAS SOC"
  const watermarkOpacity = useTransform(progress, [0, 0.4, 0.7, 1], [0.08, 0.15, 0.15, 0.08]);
  const watermarkScale = useTransform(progress, [0, 1], [0.95, 1.08]);

  // --- FRAME 1: HERO ARCHITECTURE SHOWCASE (0.00 -> 0.25) ---
  const f1Opacity = useTransform(progress, [0, 0.16, 0.25], [1, 0.85, 0]);
  const f1Scale = useTransform(progress, [0, 0.25], [1, 0.88]);
  const f1Y = useTransform(progress, [0, 0.25], [0, -60]);
  const f1PointerEvents = useTransform(progress, (p) => (p < 0.21 ? 'auto' : 'none'));

  // --- FRAME 2: 3 FLOATING ANALYTICS CARDS (0.17 -> 0.57) ---
  const f2Opacity = useTransform(progress, [0.17, 0.26, 0.48, 0.57], [0, 1, 1, 0]);
  const f2Scale = useTransform(progress, [0.17, 0.28, 0.48, 0.57], [0.86, 1, 1, 0.88]);
  const f2Y = useTransform(progress, [0.17, 0.28, 0.48, 0.57], [80, 0, 0, -60]);
  const f2PointerEvents = useTransform(progress, (p) => (p >= 0.21 && p <= 0.53 ? 'auto' : 'none'));

  // Frame 2 Floating Micro-Offsets
  const card1Offset = useTransform(progress, [0.21, 0.38], [-18, 0]);
  const card2Offset = useTransform(progress, [0.21, 0.38], [18, 0]);
  const card3Offset = useTransform(progress, [0.21, 0.38], [-18, 0]);

  // --- FRAME 3: REAL-TIME TELEMETRY & LIVE STREAM (0.49 -> 0.82) ---
  const f3Opacity = useTransform(progress, [0.49, 0.58, 0.73, 0.82], [0, 1, 1, 0]);
  const f3Scale = useTransform(progress, [0.49, 0.58, 0.73, 0.82], [0.86, 1, 1, 0.88]);
  const f3Y = useTransform(progress, [0.49, 0.58, 0.73, 0.82], [80, 0, 0, -60]);
  const f3PointerEvents = useTransform(progress, (p) => (p >= 0.50 && p <= 0.79 ? 'auto' : 'none'));

  // --- FRAME 4: CAS REPOSITORY & DATASET INVENTORY (0.74 -> 1.00) ---
  const f4Opacity = useTransform(progress, [0.74, 0.83], [0, 1]);
  const f4Scale = useTransform(progress, [0.74, 0.84], [0.88, 1]);
  const f4Y = useTransform(progress, [0.74, 0.84], [80, 0]);
  const f4PointerEvents = useTransform(progress, (p) => (p >= 0.76 ? 'auto' : 'none'));

  const hudItems = [
    { stage: 1, fraction: 0.0, label: '01 Showcase' },
    { stage: 2, fraction: 0.36, label: '02 Analytics' },
    { stage: 3, fraction: 0.65, label: '03 Telemetry' },
    { stage: 4, fraction: 0.95, label: '04 Inventory' },
  ];

  return (
    <div ref={containerRef} className="relative w-full h-[400vh]">
      
      {/* STATIONARY VIEWPORT STAGE (STICKY AT TOP-20) */}
      <div className="sticky top-20 w-full min-h-[calc(100vh-6rem)] flex flex-col justify-start overflow-hidden px-2 pt-2 pb-6 select-none">
        
        {/* Background Ambient Glowing Watermark */}
        <motion.div
          style={{ opacity: watermarkOpacity, scale: watermarkScale }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none select-none z-0"
        >
          <div className="text-[12vw] font-black tracking-widest text-violet-500/30 drop-shadow-[0_0_100px_rgba(139,92,246,0.4)] whitespace-nowrap">
            ✦ DDAS SOC
          </div>
        </motion.div>

        {/* FLOATING TOP STAGE CONTROLLER HUD */}
        <div className="w-full flex items-center justify-between bg-slate-950/85 backdrop-blur-2xl border border-slate-800/90 rounded-2xl px-4 py-2.5 shadow-2xl mb-4 z-40">
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
                onClick={() => jumpToFraction(item.fraction, item.stage)}
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

        {/* ========================================================
            FRAME 1: HERO ARCHITECTURE SHOWCASE (0% SCROLL)
            ======================================================== */}
        <motion.div
          style={{
            opacity: f1Opacity,
            scale: f1Scale,
            y: f1Y,
            pointerEvents: f1PointerEvents,
          }}
          className="absolute inset-x-2 top-16 bottom-4 flex flex-col justify-center z-30"
        >
          <div className="rounded-3xl bg-slate-950/95 border border-slate-800/90 backdrop-blur-2xl p-6 lg:p-7 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#10b981]" />
                <h2 className="text-xs font-mono font-bold uppercase tracking-widest text-slate-200">
                  Frame 01 • Architecture & Ingestion Defense
                </h2>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2.5 py-0.5 rounded-full">
                <span>SCROLL DOWN TO OVERLAY FRAME 02</span>
                <ChevronDown className="w-3.5 h-3.5 animate-bounce" />
              </div>
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
        </motion.div>


        {/* ========================================================
            FRAME 2: 3 FLOATING ANALYTICS GRAPHS (25-30% OVERLAY)
            ======================================================== */}
        <motion.div
          style={{
            opacity: f2Opacity,
            scale: f2Scale,
            y: f2Y,
            pointerEvents: f2PointerEvents,
          }}
          className="absolute inset-x-2 top-16 bottom-4 flex flex-col justify-center z-30"
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
              <div className="flex items-center gap-1 text-[10px] font-mono text-violet-300 bg-violet-950/60 border border-violet-800/60 px-2.5 py-0.5 rounded-full">
                <span>SCROLL FOR FRAME 03</span>
                <ChevronDown className="w-3.5 h-3.5 animate-bounce" />
              </div>
            </div>

            {/* 3 Floating Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <motion.div style={{ y: card1Offset }}>
                <RiskGauge activeThreats={activeThreats} quarantinedCount={quarantinedCount} />
              </motion.div>
              <motion.div style={{ y: card2Offset }}>
                <ThreatTrendChart anomalies={anomalies} totalDatasets={datasets.length} />
              </motion.div>
              <motion.div style={{ y: card3Offset }}>
                <ClassificationDonut datasets={datasets} />
              </motion.div>
            </div>
          </div>
        </motion.div>


        {/* ========================================================
            FRAME 3: REAL-TIME TELEMETRY & LIVE STREAM (50-60% OVERLAY)
            ======================================================== */}
        <motion.div
          style={{
            opacity: f3Opacity,
            scale: f3Scale,
            y: f3Y,
            pointerEvents: f3PointerEvents,
          }}
          className="absolute inset-x-2 top-16 bottom-4 flex flex-col justify-center z-30"
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
              <div className="flex items-center gap-1 text-[10px] font-mono text-cyan-300 bg-cyan-950/60 border border-cyan-800/60 px-2.5 py-0.5 rounded-full">
                <span>SCROLL FOR FINAL REPOSITORY</span>
                <ChevronDown className="w-3.5 h-3.5 animate-bounce" />
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
                onClick={() => jumpToFraction(0.95, 4)}
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
        </motion.div>


        {/* ========================================================
            FRAME 4: CAS REPOSITORY & DATASET INVENTORY (75-100% OVERLAY)
            ======================================================== */}
        <motion.div
          style={{
            opacity: f4Opacity,
            scale: f4Scale,
            y: f4Y,
            pointerEvents: f4PointerEvents,
          }}
          className="absolute inset-x-2 top-16 bottom-4 flex flex-col justify-start z-30 overflow-y-auto scrollbar-none"
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
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono text-emerald-300 bg-emerald-950/60 border border-emerald-800/60 font-bold">
                {datasets.length} ITEMS
              </span>
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
        </motion.div>

      </div>

    </div>
  );
}
