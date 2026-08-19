import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import FormField from "./FormField";
import { useAuth } from "../../context/AuthContext";

const API_BASE = "http://127.0.0.1:8000";

export default function AuthModal({ onClose }) {
  const { login } = useAuth();
  const [mode, setMode] = useState("login"); // "login" | "signup"
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
        throw new Error(data.detail || "Something went wrong");
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
      layoutId="auth-panel"
      className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#0a1020]/80 p-8 shadow-[0_0_60px_-15px_rgba(56,189,248,0.25)] backdrop-blur-xl"
      transition={{ type: "spring", stiffness: 220, damping: 26 }}
    >
      {/* ambient inner glow */}
      <div className="pointer-events-none absolute -top-24 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-cyan-400/10 blur-3xl" />

      <div className="relative z-10">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-[11px] tracking-[0.3em] text-cyan-400/70">SECURE ACCESS</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-100">
              {mode === "login" ? "Sign in to DDAS" : "Create your account"}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-slate-500 transition-colors hover:text-slate-300"
          >
            ✕
          </button>
        </div>

        <div className="mb-6 flex gap-1 rounded-lg border border-white/10 bg-white/[0.02] p-1">
          {["login", "signup"].map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`relative flex-1 rounded-md py-2 text-xs font-medium tracking-[0.15em] transition-colors ${
                mode === m ? "text-slate-950" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {mode === m && (
                <motion.span
                  layoutId="mode-pill"
                  className="absolute inset-0 rounded-md bg-cyan-300"
                  transition={{ type: "spring", stiffness: 300, damping: 28 }}
                />
              )}
              <span className="relative z-10">{m === "login" ? "LOGIN" : "SIGN UP"}</span>
            </button>
          ))}
        </div>

        <motion.form layout onSubmit={handleSubmit} className="space-y-4">
          <AnimatePresence mode="popLayout" initial={false}>
            {mode === "signup" && (
              <motion.div
                key="email-field"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                <FormField
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </motion.div>
            )}
          </AnimatePresence>

          <FormField
            label={mode === "login" ? "Username or Email" : "Username"}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />

          <FormField
            label="Password"
            type="password"
            showToggle
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          <motion.button
            type="submit"
            disabled={loading}
            whileHover={{ scale: loading ? 1 : 1.01 }}
            whileTap={{ scale: loading ? 1 : 0.98 }}
            className="relative w-full overflow-hidden rounded-lg bg-cyan-300 py-3 text-xs font-semibold tracking-[0.2em] text-slate-950 disabled:opacity-70"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <motion.span
                  className="h-3.5 w-3.5 rounded-full border-2 border-slate-950/30 border-t-slate-950"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.7, repeat: Infinity, ease: "linear" }}
                />
                VERIFYING
              </span>
            ) : mode === "login" ? (
              "SIGN IN"
            ) : (
              "CREATE ACCOUNT"
            )}
          </motion.button>
        </motion.form>
      </div>
    </motion.div>
  );
}