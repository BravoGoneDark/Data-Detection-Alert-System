import { useRef, useEffect } from "react";
import { motion } from "motion/react";
import { ShieldCheck, Database, Lock, KeyRound, Radio } from "lucide-react";

/**
 * Interactive Cyber Constellation & Data Stream Canvas
 */
function ComplexCyberCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animationFrameId;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    const nodeCount = Math.min(Math.floor((width * height) / 16000), 50);
    const nodes = [];
    for (let i = 0; i < nodeCount; i++) {
      nodes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        radius: Math.random() * 1.8 + 0.8,
        color: Math.random() > 0.4 ? "rgba(0, 240, 255, " : "rgba(99, 102, 241, ",
        pulse: Math.random() * Math.PI * 2,
      });
    }

    const packets = [];
    for (let i = 0; i < 14; i++) {
      packets.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vy: -(Math.random() * 0.7 + 0.3),
        size: Math.random() * 2 + 1,
        alpha: Math.random() * 0.5 + 0.2,
      });
    }

    let mouseX = -1000;
    let mouseY = -1000;
    const handleMouseMove = (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };
    window.addEventListener("mousemove", handleMouseMove);

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Cyber Grid Pattern
      ctx.strokeStyle = "rgba(0, 240, 255, 0.02)";
      ctx.lineWidth = 1;
      const gridSize = 56;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Draw Packets
      for (let p of packets) {
        p.y += p.vy;
        if (p.y < 0) {
          p.y = height;
          p.x = Math.random() * width;
        }
        ctx.fillStyle = `rgba(0, 240, 255, ${p.alpha})`;
        ctx.fillRect(p.x, p.y, p.size, p.size * 3);
      }

      // Update & Draw Nodes
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        node.x += node.vx;
        node.y += node.vy;
        node.pulse += 0.03;

        if (node.x < 0) node.x = width;
        if (node.x > width) node.x = 0;
        if (node.y < 0) node.y = height;
        if (node.y > height) node.y = 0;

        const dxMouse = node.x - mouseX;
        const dyMouse = node.y - mouseY;
        const distMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);
        if (distMouse < 140) {
          const force = (140 - distMouse) / 140;
          node.x += (dxMouse / distMouse) * force * 1.5;
          node.y += (dyMouse / distMouse) * force * 1.5;
        }

        const alpha = 0.3 + Math.sin(node.pulse) * 0.2;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = `${node.color}${alpha})`;
        ctx.fill();

        for (let j = i + 1; j < nodes.length; j++) {
          const other = nodes[j];
          const dx = node.x - other.x;
          const dy = node.y - other.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 130) {
            const lineAlpha = (1 - dist / 130) * 0.14;
            ctx.beginPath();
            ctx.moveTo(node.x, node.y);
            ctx.lineTo(other.x, other.y);
            ctx.strokeStyle = `rgba(0, 240, 255, ${lineAlpha})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
    />
  );
}

export default function CyberBackground({ modalOpen, onOpenAuth, children }) {
  return (
    <div className="relative min-h-screen w-full bg-[#02050f] text-slate-100 selection:bg-cyan-500/30 selection:text-cyan-200">
      
      {/* ========================================================================= */}
      {/* CINEMATIC VIDEO BACKGROUND: TOP VOLUMETRIC BEAM & BOTTOM CELESTIAL ORB   */}
      {/* ========================================================================= */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        
        {/* Top Volumetric Blue Light Beam (from 00:00 in reference video) */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[550px] bg-gradient-to-b from-cyan-400/25 via-sky-500/10 to-transparent blur-[90px]" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[250px] h-[400px] bg-cyan-300/20 blur-[60px]" />

        {/* Center Pulsing Plasma Orb (from 00:00 - 00:06) */}
        <motion.div
          animate={{
            scale: [1, 1.25, 1],
            opacity: [0.35, 0.65, 0.35],
          }}
          transition={{
            duration: 7,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] md:w-[850px] md:h-[850px] rounded-full bg-gradient-to-tr from-cyan-500/25 via-sky-500/15 to-indigo-600/25 blur-[140px]"
        />

        {/* Bottom Celestial Glowing Arc / Sphere Horizon (from 00:00 in reference video) */}
        <div className="absolute -bottom-[280px] left-1/2 -translate-x-1/2 w-[850px] h-[500px] rounded-[100%] border-t-2 border-cyan-400/60 shadow-[0_-30px_100px_rgba(0,240,255,0.45)] bg-gradient-to-b from-cyan-950/40 to-slate-950/90 blur-[1px]" />
        <div className="absolute -bottom-[320px] left-1/2 -translate-x-1/2 w-[1000px] h-[600px] rounded-[100%] border-t border-indigo-500/30 blur-[20px]" />

        {/* Rotating Concentric Radar Rings */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 45, repeat: Infinity, ease: "linear" }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full border border-dashed border-cyan-500/10 opacity-30"
        />
      </div>

      {/* Interactive Constellation Canvas */}
      <ComplexCyberCanvas />

      {/* ========================================================================= */}
      {/* FIXED TOP ENTERPRISE NAVIGATION BAR                                       */}
      {/* ========================================================================= */}
      <header className="fixed top-0 left-0 right-0 z-40 w-full border-b border-cyan-500/15 bg-slate-950/80 backdrop-blur-2xl px-6 lg:px-12 py-3 flex items-center justify-between shadow-[0_4px_30px_rgba(0,0,0,0.8)]">
        
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500/25 to-indigo-600/30 border border-cyan-400/50 shadow-[0_0_15px_rgba(0,240,255,0.4)]">
            <ShieldCheck className="w-4 h-4 text-cyan-300" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black tracking-widest bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-300 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(0,240,255,0.6)]">
                DDAS
              </span>
              <span className="text-[9px] font-mono font-semibold bg-cyan-950/90 text-cyan-400 px-1.5 py-0.5 rounded border border-cyan-500/30">
                v2.4
              </span>
            </div>
          </div>
        </div>

        {/* Live Status & Quick Action CTA */}
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/90 border border-slate-800 text-slate-300">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-slate-400">DEFENSE:</span>
            <span className="text-emerald-400 font-semibold">ALL SYSTEMS NOMINAL</span>
          </div>

          {/* Quick Sign In CTA Button */}
          <button
            onClick={onOpenAuth}
            className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-cyan-400 via-sky-400 to-cyan-400 text-slate-950 font-bold text-xs tracking-wider uppercase flex items-center gap-1.5 shadow-[0_0_25px_rgba(0,240,255,0.4)] hover:shadow-[0_0_35px_rgba(0,240,255,0.7)] transition-all cursor-pointer"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* MAIN VIEWPORT / SCROLL SHOWCASE STACK                                     */}
      {/* ========================================================================= */}
      <main className="relative z-30 w-full">
        {children}
      </main>

      {/* ========================================================================= */}
      {/* FIXED BOTTOM TELEMETRY FOOTER                                             */}
      {/* ========================================================================= */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 w-full border-t border-cyan-500/10 bg-slate-950/80 backdrop-blur-md px-6 lg:px-12 py-2 flex flex-col sm:flex-row items-center justify-between text-[11px] font-mono text-slate-500 gap-2">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-cyan-400 font-semibold">
            <Radio className="w-3 h-3 text-cyan-400 animate-pulse" />
            TELEMETRY SENTINEL
          </span>
          <span className="hidden sm:inline text-slate-700">•</span>
          <span className="hidden sm:inline text-slate-400">
            Deduplication & Real-Time Threat Radar
          </span>
        </div>

        <div className="flex items-center gap-4 text-[10px] text-slate-400">
          <span>ZERO-TRUST ENCLAVE</span>
          <span>•</span>
          <span className="text-cyan-400/90 font-mono">LATENCY: 12ms</span>
          <span>•</span>
          <span>TLS 1.3</span>
        </div>
      </footer>
    </div>
  );
}