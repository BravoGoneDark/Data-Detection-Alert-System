import React from 'react';
import { motion } from 'motion/react';
import {
  Sparkles,
  User,
  Plus,
  Fingerprint,
  Activity,
  Database,
  Radio,
  Calendar,
  MessageSquare,
  FileText,
  BarChart2,
} from 'lucide-react';

export default function ShowcaseDashboard({
  topPillOpacity,
  topPillY,
  dashOpacity,
  dashScale,
  dashY,
  dashPointerEvents,
  overlaysOpacity,
  leftPillsX,
  rightWidgetX,
  leftPanelX,
  rightPanelX,
  onOpenAuth,
}) {
  return (
    <div className="relative w-full max-w-5xl mx-auto flex flex-col items-center justify-center">
      {/* Top Floating Pill Badge */}
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

      {/* Main Detailed Dashboard Window */}
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
            { name: 'Dashboard', active: true },
            { name: 'Datasets', active: false },
            { name: 'SHA-256 Engine', active: false },
            { name: 'Anomaly Radar', active: false },
            { name: 'RBAC Matrix', active: false },
            { name: 'Audit Trail', active: false },
            { name: 'Reports', active: false },
          ].map((tab) => (
            <button
              key={tab.name}
              className={`px-3 py-1 rounded-md whitespace-nowrap transition-colors ${
                tab.active
                  ? 'bg-cyan-500/15 text-cyan-300 font-semibold border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200'
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

      {/* Floating Overlays */}
      <motion.div
        style={{ opacity: overlaysOpacity, x: leftPillsX }}
        className="absolute -left-4 sm:-left-8 top-1/4 -translate-y-1/2 z-30 hidden lg:flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-slate-900/90 border border-cyan-500/30 text-xs font-mono text-cyan-300 shadow-[0_0_25px_rgba(0,240,255,0.25)] backdrop-blur-xl pointer-events-auto"
      >
        <Calendar className="w-3.5 h-3.5 text-cyan-400" />
        <span>Audit Ledger</span>
      </motion.div>

      <motion.div
        style={{ opacity: overlaysOpacity, x: leftPillsX }}
        className="absolute -left-4 sm:-left-8 top-1/2 -translate-y-1/2 z-30 hidden lg:flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-slate-900/90 border border-indigo-500/30 text-xs font-mono text-indigo-300 shadow-[0_0_25px_rgba(99,102,241,0.25)] backdrop-blur-xl pointer-events-auto"
      >
        <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
        <span>Security Alerts</span>
      </motion.div>

      <motion.div
        style={{ opacity: overlaysOpacity, x: rightWidgetX }}
        className="absolute -right-4 sm:-right-8 top-12 z-30 hidden lg:block w-64 p-4 rounded-2xl bg-slate-950/90 border border-cyan-500/40 shadow-[0_0_35px_rgba(0,240,255,0.3)] backdrop-blur-xl font-mono text-xs pointer-events-auto"
      >
        <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
          <span>NEW SCAN</span>
          <span className="text-cyan-400">● REAL-TIME</span>
        </div>
        <div className="font-bold text-slate-100 text-sm mb-1">Anomaly & DLP Sentinel</div>
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
  );
}
