"use client";

import { useEffect } from "react";

export function ThemeSync() {
  useEffect(() => {
    try {
      const theme = window.localStorage.getItem("syntrix-theme");
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const isDark = theme === "dark" || (theme !== "light" && prefersDark);
      document.documentElement.classList.toggle("dark", isDark);
    } catch {}
  }, []);

  return null;
}
