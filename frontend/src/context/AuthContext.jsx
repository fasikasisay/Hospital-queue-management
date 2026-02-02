import React, { createContext, useContext, useState, useEffect } from "react";
import { getMe, login as apiLogin, logout as apiLogout } from "../api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("staffToken");
    const cached = localStorage.getItem("staffUser");
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      if (cached) setUser(JSON.parse(cached));
    } catch (_) {}
    getMe()
      .then((u) => {
        setUser(u || null);
        if (!u) {
          localStorage.removeItem("staffToken");
          localStorage.removeItem("staffUser");
        } else {
          localStorage.setItem("staffUser", JSON.stringify(u));
        }
      })
      .catch(() => {
        localStorage.removeItem("staffToken");
        localStorage.removeItem("staffUser");
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (username, password) => {
    const { token, user: u } = await apiLogin(username, password);
    localStorage.setItem("staffToken", token);
    localStorage.setItem("staffUser", JSON.stringify(u));
    setUser(u);
    return u;
  };

  const logout = () => {
    apiLogout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
