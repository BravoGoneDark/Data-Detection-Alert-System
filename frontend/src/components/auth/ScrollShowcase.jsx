import { useRef } from "react";
import { motion, useScroll, useTransform, useSpring } from "motion/react";
import {
  ShieldCheck,
  Lock,
  ArrowRight,
  Fingerprint,
  Activity,
  Layers,
  Database,
  KeyRound,
  CheckCircle2,
  ChevronDown,
  Cpu,
  FileCheck,
  User,
  Search,
  Plus,
  Radio,
  Sparkles,
  Calendar,
  MessageSquare,
  BarChart2,
  FileText
} from "lucide-react";

export default function ScrollShowcase({ onOpenAuth }) {
  const containerRef = useRef(null);

  // Smooth scroll tracking across the 380vh track
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  // Buttery, cinematic spring smoothing curve (eliminates all jitter)
  const progress = useSpring(scrollYProgress, {
    stiffness: 60,
    damping: 24,
    mass: 0.6,
    restDelta: 0.0001,
  });

  // ===========================================================================
  // FRAME 1: INTRO HERO & BIG GLOWING LOGO (0.00 -> 0.22)
  // ===========================================================================
  const heroOpacity = useTransform(progress, [0, 0.14, 0.22], [1, 0.8, 0]);
  const heroScale = useTransform(progress, [0, 0.22], [1, 0.88]);
  const heroY = useTransform(progress, [0, 0.22], [0, -50]);
  const heroPointerEvents = useTransform(progress, (p) => (p < 0.18 ? "auto" : "none"));

  // ===========================================================================
  // FRAME 2 & 3: DETAILED SMART DASHBOARD (Enters 0.14, Stays 0.24 -> 0.82)
  // ===========================================================================
  const dashOpacity = useTransform(progress, [0.12, 0.24, 0.84, 0.92], [0, 1, 1, 0]);
  const dashScale = useTransform(progress, [0.14, 0.26, 0.52, 0.68], [0.86, 1, 1, 0.88]);
  const dashY = useTransform(progress, [0.14, 0.26, 0.84, 0.92], [70, 0, 0, -40]);
  const dashPointerEvents = useTransform(progress, (p) => (p >= 0.16 && p <= 0.86 ? "auto" : "none"));

  // Top Glowing Pill Badge: "Smart Control Customized Security Dashboard"
  const topPillOpacity = useTransform(progress, [0.14, 0.24, 0.84, 0.92], [0, 1, 1, 0]);
  const topPillY = useTransform(progress, [0.14, 0.24], [-15, 0]);

  // Background Watermark "✦ DDAS" (appears in Stage 3 from 0.44 onwards)
  const watermarkOpacity = useTransform(progress, [0.42, 0.56, 0.84, 0.92], [0, 0.18, 0.18, 0]);
  const watermarkScale = useTransform(progress, [0.42, 0.7], [0.92, 1.05]);

  // ===========================================================================
  // FRAME 3: SURROUNDING FLOATING CARDS & HUD OVERLAYS (Fly in 0.50 -> 0.84)
  // ===========================================================================
  const overlaysOpacity = useTransform(progress, [0.46, 0.58, 0.82, 0.90], [0, 1, 1, 0]);
  
  // Left Pill Buttons (Audit Ledger / Security Alerts)
  const leftPillsX = useTransform(progress, [0.46, 0.58], [-50, 0]);
  
  // Right Floating Widget (New Scan / Anomaly Radar)
  const rightWidgetX = useTransform(progress, [0.46, 0.58], [50, 0]);

  // Left Side Datasets Panel
  const leftPanelX = useTransform(progress, [0.52, 0.64], [-60, 0]);

  // Right Side Analytics Panel
  const rightPanelX = useTransform(progress, [0.52, 0.64], [60, 0]);

  // ===========================================================================
  // FRAME 4: FINAL LAUNCH GATEWAY (Enters 0.82 -> 1.00)
  // ===========================================================================
  const launchOpacity = useTransform(progress, [0.82, 0.92], [0, 1]);
  const launchScale = useTransform(progress, [0.82, 0.92], [0.9, 1]);
  const launchY = useTransform(progress, [0.82, 0.92], [50, 0]);
  const launchPointerEvents = useTransform(progress, (p) => (p >= 0.85 ? "auto" : "none"));

  return (
    <div ref={containerRef} className="relative w-full h-[380vh]">
      
      {/* FIXED VIEWPORT CONTAINER (Completely stationary while scrolling) */}
      <div className="fixed inset-0 z-30 flex items-center justify-center pointer-events-none px-4 pt-12 pb-6 overflow-hidden">
        
        {/* ===================================================================== */}
        {/* GIANT GLOWING BACKGROUND WATERMARK "✦ DDAS"                            */}
        {/* ===================================================================== */}
        <motion.div
          style={{ opacity: watermarkOpacity, scale: watermarkScale }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none select-none z-0"
        >
          <div className="text-[13vw] font-black tracking-widest text-cyan-400/40 drop-shadow-[0_0_90px_rgba(0,240,255,0.3)] whitespace-nowrap">
            ✦ DDAS
          </div>
        </motion.div>

        {/* ===================================================================== */}
        {/* FRAME 1: INTRO HERO & BIG LOGO                                        */}
        {/* ===================================================================== */}
        <motion.div
          style={{
            opacity: heroOpacity,
            scale: heroScale,
            y: heroY,
            pointerEvents: heroPointerEvents,
          }}
          className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 z-20"
        >
          {/* Main Logo & Headline */}
          <div className="flex items-center justify-center gap-3 sm:gap-4 mb-3">
            <Sparkles className="w-10 h-10 sm:w-14 sm:h-14 text-cyan-400 animate-pulse drop-shadow-[0_0_25px_rgba(0,240,255,0.8)]" />
            <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black tracking-widest text-slate-100 drop-shadow-[0_0_45px_rgba(0,240,255,0.6)]">
              DDAS
            </h1>
          </div>

          <p className="text-base sm:text-xl text-cyan-300 font-mono tracking-wider mb-2">
            Data Download Duplication & Anomaly Detection
          </p>

          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto mb-7">
            Cryptographic deduplication, real-time threat radar, and zero-trust access control.
          </p>

          <motion.button
            onClick={onOpenAuth}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.96 }}
            className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-cyan-400 via-sky-400 to-cyan-400 text-slate-950 font-bold text-xs tracking-[0.2em] uppercase flex items-center gap-2.5 shadow-[0_0_35px_rgba(0,240,255,0.45)] hover:shadow-[0_0_50px_rgba(0,240,255,0.75)] transition-all cursor-pointer"
          >
            <KeyRound className="w-4 h-4 text-slate-950" />
            <span>INITIALIZE SECURE SESSION</span>
            <ArrowRight className="w-4 h-4 text-slate-950" />
          </motion.button>

          <div className="mt-8 flex flex-col items-center gap-1 text-[11px] font-mono text-slate-500">
            <span className="text-cyan-400/80 tracking-widest uppercase text-[10px]">SCROLL TO EXPLORE DASHBOARD</span>
            <ChevronDown className="w-4 h-4 text-cyan-400 animate-bounce" />
          </div>
        </motion.div>

        {/* ===================================================================== */}
        {/* FRAME 2 & 3: PREVIOUS DETAILED DASHBOARD (RESTORED & ENHANCED)        */}
        {/* ===================================================================== */}
        <div className="relative w-full max-w-5xl mx-auto flex flex-col items-center justify-center">
          
          {/* Top Floating Pill Badge: "Smart Control Customized Dashboard" */}
          <motion.div
            style={{ opacity: topPillOpacity, y: topPillY }}
            className="mb-3 flex flex-col items-center text-center z-30"
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-b from-cyan-400 to-indigo-600 p-[1px] shadow-[0_0_15px_rgba(0,240,255,0.5)] mb-1 flex items-center justify-center">
              <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
              </div>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-100 tracking-tight">
              Smart Control
            </h2>
            <p className="text-[10px] text-slate-400 font-mono tracking-wider uppercase">
              Customized Security Dashboard
            </p>
          </motion.div>

          {/* Main Detailed Dashboard Window (From the loved previous design) */}
          <motion.div
            style={{
              opacity: dashOpacity,
              scale: dashScale,
              y: dashY,
              pointerEvents: dashPointerEvents,
            }}
            className="w-full rounded-2xl sm:rounded-3xl bg-[#080d1a]/95 border border-cyan-500/30 shadow-[0_25px_80px_-15px_rgba(0,240,255,0.35)] backdrop-blur-2xl overflow-hidden p-5 sm:p-7 z-20"
          >
            {/* Dashboard Top Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-indigo-600/30 border border-cyan-400/50 flex items-center justify-center text-cyan-300 shadow-[0_0_20px_rgba(0,240,255,0.3)]">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                    <span>Hello, Security Analyst</span>
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500/30 text-cyan-400 font-semibold">
                      ENCLAVE ACTIVE
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    DDAS Smart Control Customized Security Dashboard
                  </p>
                </div>
              </div>

              <button
                onClick={onOpenAuth}
                className="self-start sm:self-auto px-3.5 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-300 text-xs font-semibold tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Scan</span>
              </button>
            </div>

            {/* Navigation Tabs Bar */}
            <div className="flex items-center gap-1 py-2.5 border-b border-slate-800/80 overflow-x-auto text-[11px] font-mono">
              {[
                { name: "Dashboard", active: true },
                { name: "Datasets", active: false },
                { name: "SHA-256 Engine", active: false },
                { name: "Anomaly Radar", active: false },
                { name: "RBAC Matrix", active: false },
                { name: "Audit Trail", active: false },
                { name: "Reports", active: false },
              ].map((tab) => (
                <button
                  key={tab.name}
                  className={`px-3 py-1 rounded-md whitespace-nowrap transition-colors ${
                    tab.active
                      ? "bg-cyan-500/15 text-cyan-300 font-semibold border border-cyan-500/30"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {tab.name}
                </button>
              ))}
            </div>

            {/* 3 Core Analytics Cards */}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3.5">
              
              {/* Card 1: Deduplication Rate */}
              <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-4 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Fingerprint className="w-4 h-4 text-cyan-400" />
                    Deduplication
                  </span>
                  <span className="text-emerald-400 font-semibold">+99.98%</span>
                </div>
                <div className="text-xl lg:text-2xl font-black text-slate-100">
                  14.8 TB Saved
                </div>
                <div className="space-y-1">
                  <div className="w-full h-1.5 rounded-full bg-slate-900 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-cyan-400 to-sky-400 rounded-full w-[94%]" />
                  </div>
                </div>
              </div>

              {/* Card 2: Anomaly Sentinel */}
              <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-4 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-sky-400" />
                    DLP Sentinel
                  </span>
                  <span className="text-cyan-400 font-semibold">● ARMED</span>
                </div>
                <div className="text-xl lg:text-2xl font-black text-slate-100">
                  0 Violations
                </div>
                <p className="text-[11px] text-slate-400 font-mono">
                  Continuous threat monitoring active.
                </p>
              </div>

              {/* Card 3: Dataset Ledger */}
              <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-4 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-indigo-400" />
                    SHA-256 Hashes
                  </span>
                  <span className="text-indigo-400 font-semibold">Postgres</span>
                </div>
                <div className="text-xl lg:text-2xl font-black text-slate-100">
                  1,420 Indexed
                </div>
                <p className="text-[11px] text-slate-400 font-mono">
                  Sub-millisecond duplicate checks.
                </p>
              </div>
            </div>

            {/* Live Cryptographic Verification Stream */}
            <div className="mt-3.5 rounded-xl bg-slate-950/90 border border-cyan-500/20 p-3 font-mono text-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] text-cyan-300 font-bold uppercase flex items-center gap-1.5">
                  <Radio className="w-3 h-3 text-cyan-400 animate-pulse" />
                  Live Cryptographic Scan Feed
                </span>
                <span className="text-[10px] text-slate-500">1s LATENCY</span>
              </div>
              <div className="space-y-1.5 text-[11px]">
                <div className="p-2 rounded bg-slate-900/70 border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-200">climate_oceanography_2026.nc (1.4 GB)</span>
                  <span className="text-emerald-400 font-semibold">✓ UNIQUE VERIFIED</span>
                </div>
                <div className="p-2 rounded bg-slate-900/70 border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-200">genomic_sequencing_v3.tar.gz (4.8 GB)</span>
                  <span className="text-amber-400 font-semibold">⚠ DUPLICATE MITIGATED</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* =================================================================== */}
          {/* FLOATING OVERLAYS & SIDE WIDGETS (Stage 3)                         */}
          {/* =================================================================== */}
          
          {/* Floating Pill 1: Audit Log (Left) */}
          <motion.div
            style={{ opacity: overlaysOpacity, x: leftPillsX }}
            className="absolute -left-4 sm:-left-8 top-1/4 -translate-y-1/2 z-30 hidden lg:flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-slate-900/90 border border-cyan-500/30 text-xs font-mono text-cyan-300 shadow-[0_0_25px_rgba(0,240,255,0.25)] backdrop-blur-xl pointer-events-auto"
          >
            <Calendar className="w-3.5 h-3.5 text-cyan-400" />
            <span>Audit Ledger</span>
          </motion.div>

          {/* Floating Pill 2: Chat Alert (Left Bottom) */}
          <motion.div
            style={{ opacity: overlaysOpacity, x: leftPillsX }}
            className="absolute -left-4 sm:-left-8 top-1/2 -translate-y-1/2 z-30 hidden lg:flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-slate-900/90 border border-indigo-500/30 text-xs font-mono text-indigo-300 shadow-[0_0_25px_rgba(99,102,241,0.25)] backdrop-blur-xl pointer-events-auto"
          >
            <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
            <span>Security Alerts</span>
          </motion.div>

          {/* Floating Widget (Top-Right): Anomaly Radar Card */}
          <motion.div
            style={{ opacity: overlaysOpacity, x: rightWidgetX }}
            className="absolute -right-4 sm:-right-8 top-12 z-30 hidden lg:block w-64 p-4 rounded-2xl bg-slate-950/90 border border-cyan-500/40 shadow-[0_0_35px_rgba(0,240,255,0.3)] backdrop-blur-xl font-mono text-xs pointer-events-auto"
          >
            <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
              <span>NEW SCAN</span>
              <span className="text-cyan-400">● REAL-TIME</span>
            </div>
            <div className="font-bold text-slate-100 text-sm mb-1">
              Anomaly & DLP Sentinel
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed mb-2.5">
              Analyze, customize, and verify SHA-256 digests.
            </p>
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>Deduplication Engine</span>
                <span className="text-cyan-400">99.8%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-900 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-cyan-400 to-sky-400 w-[99.8%]" />
              </div>
            </div>
          </motion.div>

          {/* Floating Widget (Left Side): Datasets Indexed */}
          <motion.div
            style={{ opacity: overlaysOpacity, x: leftPanelX }}
            className="absolute -left-10 bottom-2 z-30 hidden xl:block w-56 p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800 shadow-2xl backdrop-blur-xl font-mono text-xs pointer-events-auto"
          >
            <div className="flex items-center gap-2 text-slate-300 font-bold mb-1">
              <FileText className="w-4 h-4 text-cyan-400" />
              <span>Datasets Indexed</span>
            </div>
            <div className="text-lg font-black text-slate-100">1,420 Files</div>
            <div className="text-[10px] text-slate-400">14.8 TB Total Saved</div>
          </motion.div>

          {/* Floating Widget (Right Side): Threat Analytics */}
          <motion.div
            style={{ opacity: overlaysOpacity, x: rightPanelX }}
            className="absolute -right-10 bottom-2 z-30 hidden xl:block w-56 p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800 shadow-2xl backdrop-blur-xl font-mono text-xs pointer-events-auto"
          >
            <div className="flex items-center gap-2 text-slate-300 font-bold mb-1">
              <BarChart2 className="w-4 h-4 text-sky-400" />
              <span>Threat Analytics</span>
            </div>
            <div className="text-lg font-black text-slate-100">0 Violations</div>
            <div className="text-[10px] text-emerald-400">● DLP Shield Armed</div>
          </motion.div>
        </div>

        {/* ===================================================================== */}
        {/* FRAME 4: FINAL LAUNCH GATEWAY                                         */}
        {/* ===================================================================== */}
        <motion.div
          style={{
            opacity: launchOpacity,
            scale: launchScale,
            y: launchY,
            pointerEvents: launchPointerEvents,
          }}
          className="absolute inset-0 flex items-center justify-center p-4 z-40 max-w-3xl mx-auto"
        >
          <div className="w-full rounded-3xl bg-slate-950/95 border border-cyan-500/40 p-8 sm:p-12 shadow-[0_0_100px_-15px_rgba(0,240,255,0.5)] backdrop-blur-2xl text-center relative overflow-hidden">
            
            <div className="relative mb-5 inline-flex items-center justify-center">
              <motion.div
                className="absolute w-24 h-24 rounded-full border border-dashed border-cyan-400/40"
                animate={{ rotate: 360 }}
                transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
              />
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-400/25 to-indigo-600/30 border border-cyan-400/60 flex items-center justify-center text-cyan-300 shadow-[0_0_30px_rgba(0,240,255,0.5)]">
                <Lock className="w-7 h-7" />
              </div>
            </div>

            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-100 tracking-tight">
              Ready to Initialize Data Defense?
            </h2>
            <p className="mt-3 text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
              Authenticate to unlock the dataset upload station, deduplication engine, and anomaly radar.
            </p>

            <div className="mt-7 flex justify-center">
              <motion.button
                onClick={onOpenAuth}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.96 }}
                className="px-10 py-4 rounded-xl bg-gradient-to-r from-cyan-400 via-sky-400 to-cyan-400 text-slate-950 font-bold text-xs tracking-[0.2em] uppercase flex items-center gap-3 shadow-[0_0_35px_rgba(0,240,255,0.45)] hover:shadow-[0_0_55px_rgba(0,240,255,0.8)] transition-all cursor-pointer"
              >
                <KeyRound className="w-4 h-4 text-slate-950" />
                <span>AUTHENTICATE ENCLAVE</span>
                <ArrowRight className="w-4 h-4 text-slate-950" />
              </motion.button>
            </div>

            <div className="mt-5 flex items-center justify-center gap-2 text-xs font-mono text-slate-500">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Zero-Trust Enclave • Argon2id v13 & SHA-256 Engine</span>
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
