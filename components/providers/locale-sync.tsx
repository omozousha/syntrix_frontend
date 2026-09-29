"use client";

import { useEffect } from "react";
import { useLocale } from "@/lib/use-locale";

export function LocaleSync() {
  const { locale } = useLocale();

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return null;
}
