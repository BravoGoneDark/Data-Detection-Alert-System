import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import FormField from "./FormField";
import { useAuth } from "../../context/AuthContext";

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
      key="auth-modal"
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: 20 }}
      transition={{ type: "spring", stiffness: 280, damping: 22 }}
      className="relative z-50 w-[70vw] h-[81vh] rounded-3xl bg-[#000000]/60 backdrop-blur-xl border border-[#00c2de]/20 shadow-[0_0_80px_-20px_rgba(0,194,222,0.4)] flex flex-row"
    >
      {/* HARDWARE EDGE TAB */}
      <div className="absolute top-12 -left-[2px] w-1.5 h-16 bg-[#00c2de] rounded-r-md shadow-[0_0_15px_rgba(0,194,222,0.9)] z-50" />

      {/* TACTILE MATTE TEXTURE OVERLAY */}
      <div className="absolute inset-0 pointer-events-none rounded-3xl overflow-hidden z-0">
        <div 
          className="absolute inset-0 opacity-20 mix-blend-screen"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='4.5' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
          }}
        />
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(0, 194, 222, 1) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 194, 222, 1) 1px, transparent 1px)`,
            backgroundSize: "4px 4px"
          }}
        />
        <div className="absolute -top-20 -left-20 w-96 h-96 bg-[#00c2de]/20 blur-[100px] rounded-full" />
      </div>

      {/* LEFT SIDE: 3D Asset & Animations - Now exactly 40% width */}
      <div className="relative w-[40%] h-full flex items-center justify-center overflow-hidden z-10">
        <motion.div
          className="absolute w-[60%] h-[60%] bg-[#00c2de]/15 rounded-full blur-[80px]"
          animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />

        <motion.img
          src={SUBJECT_IMAGE}
          alt="Security Lock"
          className="relative z-20 w-[70%] max-h-[75%] object-contain drop-shadow-[0_0_30px_rgba(0,194,222,0.4)] cursor-pointer"
          animate={{ y: [-10, 10, -10] }}
          transition={{ y: { duration: 4, repeat: Infinity, ease: "easeInOut" } }}
          whileHover={{
            scale: 1.1,
            filter: "drop-shadow(0px 0px 50px rgba(0,194,222,0.8))",
          }}
        />
      </div>

      {/* RIGHT SIDE: Form Logic - Now exactly 60% width */}
      <div className="relative w-[60%] h-full bg-[#000000]/80 p-12 lg:p-16 flex flex-col justify-center z-10 border-l border-[#00c2de]/20 shadow-[-20px_0_50px_rgba(0,0,0,0.8)] rounded-r-3xl">
        
        <div className="mb-10 flex items-center justify-between">
          <div>
            <p className="text-xs tracking-[0.3em] text-[#00c2de]/90">
              SECURE ACCESS
            </p>
            <h2 className="mt-2 text-3xl font-bold text-slate-100">
              {mode === "login" ? "Sign in to DDAS" : "Create your account"}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-slate-500 transition-colors hover:text-[#00c2de]"
          >
            ✕
          </button>
        </div>

        <div className="mb-10 flex gap-1 rounded-lg bg-[#000000] p-1 border border-[#00c2de]/20 shadow-[inset_0_0_20px_rgba(0,0,0,1)]">
          {["login", "signup"].map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`relative flex-1 rounded-md py-3 text-sm font-medium tracking-[0.15em] transition-colors ${
                mode === m ? "text-[#000000]" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {mode === m && (
                <motion.span
                  layoutId="mode-pill"
                  className="absolute inset-0 rounded-md bg-[#00c2de] shadow-[0_0_15px_rgba(0,194,222,0.5)]"
                  transition={{ type: "spring", stiffness: 300, damping: 28 }}
                />
              )}
              <span className="relative z-10">{m === "login" ? "LOGIN" : "SIGN UP"}</span>
            </button>
          ))}
        </div>

        <motion.form layout onSubmit={handleSubmit} className="space-y-6">
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
                className="rounded-md bg-red-950/50 px-4 py-3 text-sm text-red-300 border border-red-500/20"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          <motion.button
            type="submit"
            disabled={loading}
            whileHover={{ scale: loading ? 1 : 1.02 }}
            whileTap={{ scale: loading ? 1 : 0.98 }}
            className="relative w-full overflow-hidden rounded-lg bg-[#00c2de] py-4 mt-4 text-sm font-bold tracking-[0.2em] text-[#000000] disabled:opacity-70 border-0 shadow-[0_0_20px_rgba(0,194,222,0.3)]"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <motion.span
                  className="h-4 w-4 rounded-full border-2 border-[#000000]/30 border-t-[#000000]"
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