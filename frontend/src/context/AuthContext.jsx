import { createContext, useContext, useState, useCallback } from "react";

// NOTE: localStorage is a deliberate, temporary choice for development.
// Before deployment, migrate this to in-memory (state-only) storage to
// reduce XSS exposure — tracked as a Stage 10-13 hardening item.

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("ddas_token"));

  const login = useCallback((newToken) => {
    localStorage.setItem("ddas_token", newToken);
    setToken(newToken);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("ddas_token");
    setToken(null);
  }, []);

  const value = {
    token,
    isAuthenticated: !!token,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}