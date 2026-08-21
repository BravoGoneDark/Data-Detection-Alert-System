import { useState } from "react";
import { motion } from "motion/react";
import { Eye, EyeOff } from "lucide-react";

export default function FormField({
  label,
  type = "text",
  value,
  onChange,
  showToggle,
  placeholder,
  icon: Icon,
  required = true,
  autoComplete,
}) {
  const [focused, setFocused] = useState(false);
  const [reveal, setReveal] = useState(false);
  const isPassword = type === "password";

  return (
    <div className="relative space-y-1.5 text-left">
      <div className="flex items-center justify-between">
        <label
          className={`text-[11px] font-semibold tracking-[0.15em] uppercase transition-colors duration-200 ${
            focused ? "text-cyan-400" : "text-slate-400"
          }`}
        >
          {label}
        </label>
        {isPassword && showToggle && (
          <button
            type="button"
            onClick={() => setReveal((r) => !r)}
            className="flex items-center gap-1 text-[11px] font-mono text-slate-500 hover:text-cyan-400 transition-colors focus:outline-none"
          >
            {reveal ? (
              <>
                <EyeOff className="w-3.5 h-3.5" />
                <span>HIDE</span>
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5" />
                <span>SHOW</span>
              </>
            )}
          </button>
        )}
      </div>

      <div
        className={`relative flex items-center rounded-xl bg-slate-950/80 border transition-all duration-200 ${
          focused
            ? "border-cyan-400/80 shadow-[0_0_20px_rgba(0,194,222,0.25)] ring-1 ring-cyan-400/30"
            : "border-slate-800/80 hover:border-slate-700"
        }`}
      >
        {Icon && (
          <div className="pl-3.5 text-slate-500 flex items-center justify-center pointer-events-none">
            <Icon
              className={`w-4 h-4 transition-colors duration-200 ${
                focused ? "text-cyan-400" : "text-slate-500"
              }`}
            />
          </div>
        )}

        <input
          type={isPassword && reveal ? "text" : type}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          required={required}
          autoComplete={autoComplete}
          className={`w-full bg-transparent py-3 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none font-normal ${
            Icon ? "px-3" : "px-4"
          }`}
        />

        {/* Active bottom glow accent */}
        <motion.div
          className="absolute bottom-0 left-2 right-2 h-[2px] bg-gradient-to-r from-cyan-500 via-sky-400 to-indigo-500 rounded-full"
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: focused ? 1 : 0, opacity: focused ? 1 : 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}