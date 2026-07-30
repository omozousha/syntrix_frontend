"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

type Theme = "light" | "dark" | "system";

function getStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem("syntrix-theme");
    if (stored === "light" || stored === "dark" || stored === "system") return stored;
  } catch {}
  return "system";
}

function setStoredTheme(theme: Theme) {
  try {
    localStorage.setItem("syntrix-theme", theme);
  } catch {}
}

function applyTheme(theme: Theme) {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const isDark = theme === "dark" || (theme === "system" && prefersDark);
  document.documentElement.classList.toggle("dark", isDark);
}

function subscribeToSystemTheme(callback: () => void) {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

function getSnapshot(): Theme {
  return getStoredTheme();
}

function getServerSnapshot(): Theme {
  return "system";
}

export function useTheme() {
  const storedTheme = useSyncExternalStore(subscribeToSystemTheme, getSnapshot, getServerSnapshot);

  const setTheme = useCallback((theme: Theme) => {
    setStoredTheme(theme);
    applyTheme(theme);
  }, []);

  useEffect(() => {
    applyTheme(storedTheme);
  }, [storedTheme]);

  const resolvedTheme: "light" | "dark" =
    storedTheme === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : storedTheme;

  return { theme: storedTheme, resolvedTheme, setTheme };
}
