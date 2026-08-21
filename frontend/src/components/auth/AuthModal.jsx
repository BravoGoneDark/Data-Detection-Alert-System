import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import FormField from "./FormField";
import { useAuth } from "../../context/AuthContext";
import { 
  ShieldCheck, 
  User, 
  Mail, 
  Lock, 
  X, 
  AlertTriangle, 
  KeyRound, 
  ArrowRight,
  Shield,
  Cpu,
  CheckCircle2
} from "lucide-react";

const API_BASE = "http://127.0.0.1:8000";
const SUBJECT_IMAGE = "/login.png";

export default function AuthModal({ onClose }) {
  const { login } = useAuth();
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const path = mode === "login" ? "/auth/login" : "/auth/signup";
      const body =
        mode === "login"
          ? { identifier: username, password }
          : { username, email, password };

      const res = await fetch(`${API_BASE}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Authentication verification failed");
      }

      login(data.access_token);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      key="auth-modal"
      initial={{ opacity: 0, scale: 0.92, y: 15 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92, y: 15 }}
      transition={{ type: "spring", stiffness: 320, damping: 26 }}
      className="relative z-50 w-[92vw] max-w-4xl min-h-[580px] rounded-3xl bg-[#060a14]/95 border border-cyan-500/30 shadow-[0_0_80px_-15px_rgba(0,194,222,0.35)] backdrop-blur-2xl flex flex-col md:flex-row overflow-hidden"
    >
      {/* Decorative Hardware Edge Light */}
      <div className="absolute top-8 left-0 w-1.5 h-20 bg-gradient-to-b from-cyan-400 via-sky-300 to-indigo-500 rounded-r-md shadow-[0_0_20px_rgba(0,194,222,0.9)] z-50 hidden md:block" />

      {/* Subtle Background Textures */}
      <div className="absolute inset-0 pointer-events-none opacity-30 cyber-grid-pattern z-0" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 blur-[120px] rounded-full pointer-events-none z-0" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none z-0" />

      {/* Close Button */}
      <button
        onClick={onClose}
        aria-label="Close"
        className="absolute top-6 right-6 z-50 w-9 h-9 rounded-xl bg-slate-900/80 border border-slate-700/60 text-slate-400 hover:text-cyan-300 hover:border-cyan-400/50 flex items-center justify-center transition-all duration-200 cursor-pointer shadow-lg group"
      >
        <X className="w-4 h-4 transition-transform group-hover:rotate-90" />
      </button>

      {/* LEFT SIDE: Visual Crypto Enclave (42%) */}
      <div className="relative w-full md:w-[42%] bg-gradient-to-b from-slate-950/80 via-[#070d1a]/90 to-[#040810] p-8 flex flex-col justify-between items-center text-center border-b md:border-b-0 md:border-r border-cyan-500/20 z-10">
        
        {/* Enclave Status Header */}
        <div className="w-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400"></span>
            </span>
            <span className="text-[11px] font-mono font-semibold tracking-wider text-cyan-400 uppercase">
              ENCLAVE ARMED
            </span>
          </div>
          <span className="text-[10px] font-mono text-slate-500 bg-slate-900/90 px-2 py-0.5 rounded border border-slate-800">
            TLS 1.3
          </span>
        </div>

        {/* 3D Visual Asset Container */}
        <div className="relative my-4 flex items-center justify-center">
          {/* Pulsing Aura */}
          <motion.div
            className="absolute w-44 h-44 rounded-full bg-cyan-500/15 blur-[50px]"
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* Holographic Concentric Rings */}
          <motion.div
            className="absolute w-48 h-48 rounded-full border border-dashed border-cyan-500/20"
            animate={{ rotate: 360 }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          />

          <motion.img
            src={SUBJECT_IMAGE}
            alt="Security Asset"
            className="relative z-20 w-36 h-36 md:w-44 md:h-44 object-contain drop-shadow-[0_0_35px_rgba(0,194,222,0.4)]"
            animate={{ y: [-5, 5, -5] }}
            transition={{ y: { duration: 4, repeat: Infinity, ease: "easeInOut" } }}
          />
        </div>

        {/* Cryptographic Specifications Readout */}
        <div className="w-full rounded-xl bg-slate-950/80 border border-cyan-500/20 p-3.5 space-y-2 text-left text-[11px] font-mono text-slate-400">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
            <span className="text-slate-500">AUTH CORE</span>
            <span className="text-cyan-300 font-semibold">Argon2id v13</span>
          </div>
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
            <span className="text-slate-500">TOKEN CLAIM</span>
            <span className="text-sky-300 font-semibold">256-Bit JWT</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">INTEGRITY GUARD</span>
            <span className="text-indigo-300 font-semibold">SHA-256 Engine</span>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE: Credentials Terminal (58%) */}
      <div className="relative w-full md:w-[58%] p-8 md:p-10 flex flex-col justify-center z-10">
        
        {/* Terminal Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1.5">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <p className="text-[11px] font-mono tracking-[0.25em] text-cyan-400 font-semibold uppercase">
              SECURE CREDENTIALS TERMINAL
            </p>
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-100 tracking-tight">
            {mode === "login" ? "Sign In to DDAS" : "Create Security Profile"}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {mode === "login"
              ? "Enter your identifier to authenticate your session."
              : "Register a new profile to access the data verification station."}
          </p>
        </div>

        {/* Mode Pill Switcher */}
        <div className="mb-6 flex gap-1 rounded-xl bg-slate-950 p-1.5 border border-slate-800/90 shadow-inner">
          {["login", "signup"].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m);
                setError("");
              }}
              className={`relative flex-1 rounded-lg py-2.5 text-xs font-semibold tracking-wider transition-colors cursor-pointer ${
                mode === m ? "text-slate-950 font-bold" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {mode === m && (
                <motion.span
                  layoutId="auth-mode-pill"
                  className="absolute inset-0 rounded-lg bg-gradient-to-r from-cyan-400 to-sky-400 shadow-[0_0_20px_rgba(0,194,222,0.5)]"
                  transition={{ type: "spring", stiffness: 350, damping: 28 }}
                />
              )}
              <span className="relative z-10 flex items-center justify-center gap-1.5">
                {m === "login" ? <KeyRound className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                {m === "login" ? "SIGN IN" : "REGISTER"}
              </span>
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <AnimatePresence mode="popLayout" initial={false}>
            {mode === "signup" && (
              <motion.div
                key="email-field"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
              >
                <FormField
                  label="Email Address"
                  type="email"
                  placeholder="name@domain.com"
                  icon={Mail}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </motion.div>
            )}
          </AnimatePresence>

          <FormField
            label={mode === "login" ? "Username or Email" : "Username"}
            placeholder={mode === "login" ? "Enter username or email" : "Choose a unique username"}
            icon={User}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
          />

          <FormField
            label="Password"
            type="password"
            placeholder="Enter secure password"
            icon={Lock}
            showToggle
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
          />

          {mode === "signup" && (
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono bg-cyan-950/20 border border-cyan-500/20 rounded-lg p-2.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span>Default role: <strong>STUDENT</strong> (Elevations granted by Faculty/Admin).</span>
            </div>
          )}

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-start gap-2.5 rounded-xl bg-red-950/60 border border-red-500/30 p-3 text-xs text-red-200 shadow-[0_0_15px_rgba(239,68,68,0.15)]"
              >
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            type="submit"
            disabled={loading}
            whileHover={{ scale: loading ? 1 : 1.01 }}
            whileTap={{ scale: loading ? 1 : 0.98 }}
            className="w-full mt-2 py-3.5 rounded-xl bg-gradient-to-r from-cyan-400 via-sky-400 to-cyan-400 text-slate-950 font-bold text-xs tracking-[0.18em] uppercase flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(0,194,222,0.35)] hover:shadow-[0_0_35px_rgba(0,194,222,0.6)] transition-all duration-200 disabled:opacity-60 cursor-pointer"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <motion.span
                  className="h-4 w-4 rounded-full border-2 border-slate-950/40 border-t-slate-950"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.7, repeat: Infinity, ease: "linear" }}
                />
                VERIFYING CREDENTIALS...
              </span>
            ) : mode === "login" ? (
              <>
                <KeyRound className="w-4 h-4" />
                <span>AUTHENTICATE SESSION</span>
                <ArrowRight className="w-4 h-4" />
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>INITIALIZE PROFILE</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </motion.button>
        </form>

        {/* Security Compliance Footer */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500 font-mono">
          <span className="flex items-center gap-1">
            <Shield className="w-3 h-3 text-cyan-500/70" />
            256-BIT ENCLAVE
          </span>
          <span>DDAS SECURITY CORE v2.4</span>
        </div>
      </div>
    </motion.div>
  );
}