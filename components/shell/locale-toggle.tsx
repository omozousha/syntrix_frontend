"use client";

import { Button } from "@/components/ui/button";
import { useLocale, type Locale } from "@/lib/use-locale";

const LOCALES: Array<{ value: Locale; label: string; ariaLabel: string }> = [
  { value: "id", label: "ID", ariaLabel: "Bahasa Indonesia" },
  { value: "en", label: "EN", ariaLabel: "English" },
];

export function LocaleToggle() {
  const { locale, setLocale } = useLocale();

  return (
    <div
      role="group"
      aria-label="Pilih bahasa"
      className="flex shrink-0 items-center gap-0.5 rounded-full border border-border/50 bg-muted/20 p-0.5"
    >
      {LOCALES.map(({ value, label, ariaLabel }) => (
        <Button
          key={value}
          type="button"
          size="sm"
          aria-label={ariaLabel}
          aria-pressed={locale === value}
          onClick={() => setLocale(value)}
          className={`h-7 rounded-full px-2.5 font-mono text-[10px] font-bold uppercase tracking-[0.1em] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98] ${
            locale === value
              ? "bg-primary text-primary-foreground shadow-2xs hover:bg-primary hover:text-primary-foreground"
              : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
          }`}
        >
          {label}
        </Button>
      ))}
    </div>
  );
}
