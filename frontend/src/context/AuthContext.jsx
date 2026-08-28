import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { API_URL } from "../constants/classifications";

const AuthContext = createContext(null);

function decodeToken(tok) {
  if (!tok || typeof tok !== 'string') return null;
  try {
    const parts = tok.split('.');
    if (parts.length < 2) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const parsed = JSON.parse(jsonPayload);
    let username = parsed.username || 'User';
    if (username.includes('@')) {
      username = username.split('@')[0];
    }
    const role = (parsed.role || 'STUDENT').toUpperCase();
    return {
      id: parsed.sub ? Number(parsed.sub) : 0,
      username: username,
      email: parsed.email || `${username.toLowerCase()}@ddas.sec`,
      role: role,
      permissions: parsed.permissions || [],
      ...parsed,
    };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("ddas_token"));
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem("ddas_user");
      if (savedUser) return JSON.parse(savedUser);
      const savedToken = localStorage.getItem("ddas_token");
      if (savedToken) return decodeToken(savedToken);
      return null;
    } catch {
      return null;
    }
  });

  const fetchProfile = useCallback(async (authToken) => {
    if (!authToken) {
      setUser(null);
      localStorage.removeItem("ddas_user");
      return;
    }
    try {
      const res = await fetch(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        localStorage.setItem("ddas_user", JSON.stringify(data));
      } else {
        const fallback = decodeToken(authToken);
        if (fallback) setUser(fallback);
      }
    } catch (err) {
      console.error("Failed to fetch user profile:", err);
      const fallback = decodeToken(authToken);
      if (fallback) setUser(fallback);
    }
  }, []);

  const login = useCallback((newToken, userData = null) => {
    localStorage.setItem("ddas_token", newToken);
    setToken(newToken);
    const initialUser = userData || decodeToken(newToken);
    if (initialUser) {
      setUser(initialUser);
      localStorage.setItem("ddas_user", JSON.stringify(initialUser));
    }
    fetchProfile(newToken);
  }, [fetchProfile]);

  const logout = useCallback(() => {
    localStorage.removeItem("ddas_token");
    localStorage.removeItem("ddas_user");
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    if (token) {
      fetchProfile(token);
    }
  }, [token, fetchProfile]);

  const value = {
    token,
    user,
    isAuthenticated: !!token,
    login,
    logout,
    refreshProfile: () => fetchProfile(token),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}