import { useState } from "react";
import { motion } from "motion/react";

export default function FormField({ label, type = "text", value, onChange, showToggle }) {
  const [focused, setFocused] = useState(false);
  const [reveal, setReveal] = useState(false);
  const isPassword = type === "password";

  return (
    <div className="relative">
      <label
        className={`mb-1.5 block text-[11px] font-medium uppercase tracking-[0.18em] transition-colors ${
          focused ? "text-cyan-300" : "text-slate-400"
        }`}
      >
        {label}
      </label>
      <div className="relative">
        <input
          type={isPassword && reveal ? "text" : type}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-slate-100 outline-none transition-all placeholder:text-slate-600 focus:border-cyan-400/50 focus:bg-white/[0.05]"
        />
        <motion.span
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px origin-left bg-cyan-300"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: focused ? 1 : 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
        />
        {isPassword && showToggle && (
          <button
            type="button"
            onClick={() => setReveal((r) => !r)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] tracking-wide text-slate-500 hover:text-cyan-300"
          >
            {reveal ? "HIDE" : "SHOW"}
          </button>
        )}
      </div>
    </div>
  );
}