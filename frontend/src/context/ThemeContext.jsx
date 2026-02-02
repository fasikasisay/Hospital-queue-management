import React, { createContext, useContext, useState, useEffect } from "react";

const STORAGE_KEY = "hospital-queue-theme";

const ThemeContext = createContext(null);

function getSystemTheme() {
  if (typeof window === "undefined" || !window.matchMedia) return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeProvider({ children }) {
  const [stored, setStored] = useState(() => localStorage.getItem(STORAGE_KEY));
  const [systemTheme, setSystemTheme] = useState(getSystemTheme);
  const effective = stored || systemTheme;

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => setSystemTheme(mq.matches ? "dark" : "light");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", effective);
  }, [effective]);

  const setTheme = (value) => {
    const next = value === "system" ? null : value;
    if (next) localStorage.setItem(STORAGE_KEY, next);
    else localStorage.removeItem(STORAGE_KEY);
    setStored(next);
  };

  const toggleTheme = () => {
    const next = effective === "dark" ? "light" : "dark";
    setTheme(next);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme: effective,
        setTheme,
        toggleTheme,
        isDark: effective === "dark",
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
