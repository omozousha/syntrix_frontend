"use client";

import { useCallback, useSyncExternalStore } from "react";

export type Locale = "id" | "en";

const LOCALE_KEY = "syntrix-locale";
const listeners = new Set<() => void>();

function getStoredLocale(): Locale {
  try {
    const stored = localStorage.getItem(LOCALE_KEY);
    if (stored === "id" || stored === "en") return stored;
  } catch {}
  return "id";
}

function emitChange() {
  listeners.forEach((listener) => listener());
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

function getServerSnapshot(): Locale {
  return "id";
}

export function useLocale() {
  const locale = useSyncExternalStore(subscribe, getStoredLocale, getServerSnapshot);

  const setLocale = useCallback((next: Locale) => {
    try {
      localStorage.setItem(LOCALE_KEY, next);
    } catch {}
    emitChange();
  }, []);

  return { locale, setLocale };
}
