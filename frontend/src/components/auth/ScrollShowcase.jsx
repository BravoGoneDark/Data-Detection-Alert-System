import React, { useRef } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'motion/react';
import { Sparkles, KeyRound, ArrowRight, ChevronDown } from 'lucide-react';
import ShowcaseDashboard from './ShowcaseDashboard';
import ShowcaseLaunch from './ShowcaseLaunch';

export default function ScrollShowcase({ onOpenAuth }) {
  const containerRef = useRef(null);

  // Smooth scroll tracking across the 380vh track
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  // Buttery, cinematic spring smoothing curve (eliminates all jitter)
  const progress = useSpring(scrollYProgress, {
    stiffness: 60,
    damping: 24,
    mass: 0.6,
    restDelta: 0.0001,
  });

  // Frame 1: Intro Hero & Big Glowing Logo (0.00 -> 0.22)
  const heroOpacity = useTransform(progress, [0, 0.14, 0.22], [1, 0.8, 0]);
  const heroScale = useTransform(progress, [0, 0.22], [1, 0.88]);
  const heroY = useTransform(progress, [0, 0.22], [0, -50]);
  const heroPointerEvents = useTransform(progress, (p) => (p < 0.18 ? 'auto' : 'none'));

  // Frame 2 & 3: Detailed Smart Dashboard (Enters 0.14, Stays 0.24 -> 0.82)
  const dashOpacity = useTransform(progress, [0.12, 0.24, 0.84, 0.92], [0, 1, 1, 0]);
  const dashScale = useTransform(progress, [0.14, 0.26, 0.52, 0.68], [0.86, 1, 1, 0.88]);
  const dashY = useTransform(progress, [0.14, 0.26, 0.84, 0.92], [70, 0, 0, -40]);
  const dashPointerEvents = useTransform(progress, (p) => (p >= 0.16 && p <= 0.86 ? 'auto' : 'none'));

  // Top Glowing Pill Badge
  const topPillOpacity = useTransform(progress, [0.14, 0.24, 0.84, 0.92], [0, 1, 1, 0]);
  const topPillY = useTransform(progress, [0.14, 0.24], [-15, 0]);

  // Background Watermark "✦ DDAS"
  const watermarkOpacity = useTransform(progress, [0.42, 0.56, 0.84, 0.92], [0, 0.18, 0.18, 0]);
  const watermarkScale = useTransform(progress, [0.42, 0.7], [0.92, 1.05]);

  // Frame 3: Surrounding Floating Cards & HUD Overlays
  const overlaysOpacity = useTransform(progress, [0.46, 0.58, 0.82, 0.90], [0, 1, 1, 0]);
  const leftPillsX = useTransform(progress, [0.46, 0.58], [-50, 0]);
  const rightWidgetX = useTransform(progress, [0.46, 0.58], [50, 0]);
  const leftPanelX = useTransform(progress, [0.52, 0.64], [-60, 0]);
  const rightPanelX = useTransform(progress, [0.52, 0.64], [60, 0]);

  // Frame 4: Final Launch Gateway (Enters 0.82 -> 1.00)
  const launchOpacity = useTransform(progress, [0.82, 0.92], [0, 1]);
  const launchScale = useTransform(progress, [0.82, 0.92], [0.9, 1]);
  const launchY = useTransform(progress, [0.82, 0.92], [50, 0]);
  const launchPointerEvents = useTransform(progress, (p) => (p >= 0.85 ? 'auto' : 'none'));

  return (
    <div ref={containerRef} className="relative w-full h-[380vh]">
      {/* Stationary Viewport Container */}
      <div className="fixed inset-0 z-30 flex items-center justify-center pointer-events-none px-4 pt-12 pb-6 overflow-hidden">
        
        {/* Background Watermark */}
        <motion.div
          style={{ opacity: watermarkOpacity, scale: watermarkScale }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none select-none z-0"
        >
          <div className="text-[13vw] font-black tracking-widest text-cyan-400/40 drop-shadow-[0_0_90px_rgba(0,240,255,0.3)] whitespace-nowrap">
            ✦ DDAS
          </div>
        </motion.div>

        {/* Frame 1: Hero Logo & Call-to-Action */}
        <motion.div
          style={{
            opacity: heroOpacity,
            scale: heroScale,
            y: heroY,
            pointerEvents: heroPointerEvents,
          }}
          className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 z-20"
        >
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

        {/* Frame 2 & 3: Detailed Dashboard & Overlays */}
        <ShowcaseDashboard
          topPillOpacity={topPillOpacity}
          topPillY={topPillY}
          dashOpacity={dashOpacity}
          dashScale={dashScale}
          dashY={dashY}
          dashPointerEvents={dashPointerEvents}
          overlaysOpacity={overlaysOpacity}
          leftPillsX={leftPillsX}
          rightWidgetX={rightWidgetX}
          leftPanelX={leftPanelX}
          rightPanelX={rightPanelX}
          onOpenAuth={onOpenAuth}
        />

        {/* Frame 4: Launch Gateway */}
        <ShowcaseLaunch
          launchOpacity={launchOpacity}
          launchScale={launchScale}
          launchY={launchY}
          launchPointerEvents={launchPointerEvents}
          onOpenAuth={onOpenAuth}
        />

      </div>
    </div>
  );
}
