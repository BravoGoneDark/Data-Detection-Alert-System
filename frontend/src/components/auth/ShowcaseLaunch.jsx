import React from 'react';
import { motion } from 'motion/react';
import { Lock, KeyRound, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function ShowcaseLaunch({
  launchOpacity,
  launchScale,
  launchY,
  launchPointerEvents,
  onOpenAuth,
}) {
  return (
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
            transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
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
  );
}
