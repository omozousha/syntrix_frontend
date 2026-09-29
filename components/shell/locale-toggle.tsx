"use client";

import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLocale, useTranslate } from "@/lib/use-locale";
import type { Locale } from "@/lib/use-locale";

const LOCALES: Array<{ value: Locale; label: string; ariaKey: "locale.ariaId" | "locale.ariaEn" }> = [
  { value: "id", label: "ID", ariaKey: "locale.ariaId" },
  { value: "en", label: "EN", ariaKey: "locale.ariaEn" },
];

export function LocaleToggle() {
  const { locale, setLocale } = useLocale();
  const { t } = useTranslate();
  const active = LOCALES.find((l) => l.value === locale) ?? LOCALES[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label={t("locale.select")}
          className="h-7 gap-0.5 rounded-full px-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-muted/60 hover:text-foreground active:scale-[0.98]"
        >
          <span>{active.label}</span>
          <ChevronDown className="size-3 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-28">
        {LOCALES.map(({ value, label, ariaKey }) => (
          <DropdownMenuItem
            key={value}
            aria-label={t(ariaKey)}
            aria-pressed={locale === value}
            onClick={() => setLocale(value)}
            className={`cursor-pointer font-mono text-[10px] uppercase tracking-[0.1em] ${
              locale === value ? "bg-muted/60 font-semibold" : ""
            }`}
          >
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
