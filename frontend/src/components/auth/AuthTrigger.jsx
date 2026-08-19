import { motion } from "motion/react";

export default function AuthTrigger({ onClick }) {
  return (
    <motion.button
      layoutId="auth-panel"
      onClick={onClick}
      className="relative overflow-hidden rounded-2xl border border-cyan-400/25 bg-white/[0.03] px-10 py-5 backdrop-blur-sm"
      whileHover={{ scale: 1.03, borderColor: "rgba(103,232,249,0.55)" }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
    >
      {/* traveling light along the border */}
      <motion.span
        className="pointer-events-none absolute inset-0 rounded-2xl"
        style={{
          background:
            "conic-gradient(from 0deg, transparent 0%, rgba(103,232,249,0.5) 8%, transparent 16%)",
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
      />
      <span className="relative z-10 flex items-center gap-3 text-sm font-medium tracking-[0.25em] text-cyan-50/90">
        <span className="h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_8px_2px_rgba(103,232,249,0.6)]" />
        AUTHENTICATE
      </span>
    </motion.button>
  );
}