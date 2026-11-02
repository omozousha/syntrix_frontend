"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { OdpPopSummary } from "@/lib/types/odp-summary";
import { formatValidationRate, isUnassignedPOP, UNASSIGNED_POP_LABEL } from "@/lib/formatters/odp-stats";
import { cn } from "@/lib/utils";
import { useTranslate } from "@/lib/use-locale";

interface OdpPopDistributionPanelProps {
  pops: OdpPopSummary[];
  activePopId?: string | null;
  totalOdpCount?: number;
  deviceLabel?: string;
  deviceTypeKey?: string;
  onPopSelect?: (popId: string | null) => void;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export function OdpPopDistributionPanel({
  pops,
  activePopId,
  deviceLabel,
  deviceTypeKey = "ODP",
  onPopSelect,
  loading,
  error,
  onRetry,
}: OdpPopDistributionPanelProps) {
  const { t } = useTranslate();
  const normalizedType = deviceTypeKey.toUpperCase();
  const unitLabel = deviceLabel || t("deviceList.popPanel.odp");
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollState();
    const observer = new ResizeObserver(updateScrollState);
    observer.observe(el);
    return () => observer.disconnect();
  }, [pops.length, loading, updateScrollState]);

  const scrollByAmount = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const step = Math.max(220, Math.round(el.clientWidth * 0.65));
    el.scrollBy({ left: direction === "left" ? -step : step, behavior: "smooth" });
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card p-2 shadow-xs glass-inset">
        <div className="rounded-[calc(1rem-0.25rem)] border border-border/60 bg-background/80 p-3 backdrop-blur-xl dark:bg-background/40 glass-inset">
          <Skeleton className="h-3 w-24" />
          <div className="mt-2 grid grid-flow-col auto-cols-[minmax(11rem,1fr)] grid-rows-2 gap-2 overflow-hidden">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card p-2 shadow-xs glass-inset">
        <div className="rounded-[calc(1rem-0.25rem)] border border-border/60 bg-background/80 px-4 py-6 text-center backdrop-blur-xl dark:bg-background/40 glass-inset">
          <p className="text-sm text-destructive">{error}</p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-2 rounded-full border border-border/60 bg-background px-3 py-1 font-mono text-[10px] uppercase tracking-[0.12em] shadow-xs transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-muted/30 active:scale-[0.98]"
            >
              {t("common.retry")}
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!pops.length) {
    return null;
  }

  const useTwoRows = pops.length > 6;
  const hasOverflow = canScrollLeft || canScrollRight;

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-2 shadow-xs glass-inset">
      <div className="rounded-[calc(1rem-0.25rem)] border border-border/60 bg-background/80 p-3 backdrop-blur-xl dark:bg-background/40 glass-inset">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
            {t("deviceList.popPanel.title")}
          </h3>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[9px] uppercase tracking-[0.12em] tabular-nums text-muted-foreground/70">
              {t("deviceList.popPanel.popCount", { count: pops.length })}
            </span>
            {hasOverflow ? (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => scrollByAmount("left")}
                  disabled={!canScrollLeft}
                  aria-label="Scroll left"
                  className="inline-flex size-6 items-center justify-center rounded-full border border-border/60 bg-background/80 text-foreground shadow-2xs transition-all duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-muted/40 active:scale-[0.95] disabled:pointer-events-none disabled:opacity-35"
                >
                  <ChevronLeft className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollByAmount("right")}
                  disabled={!canScrollRight}
                  aria-label="Scroll right"
                  className="inline-flex size-6 items-center justify-center rounded-full border border-border/60 bg-background/80 text-foreground shadow-2xs transition-all duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-muted/40 active:scale-[0.95] disabled:pointer-events-none disabled:opacity-35"
                >
                  <ChevronRight className="size-3.5" />
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <div
          ref={scrollRef}
          onScroll={updateScrollState}
          onWheel={(e) => {
            const el = scrollRef.current;
            if (!el || el.scrollWidth <= el.clientWidth) return;
            if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
              el.scrollLeft += e.deltaY;
            }
          }}
          className="overflow-x-auto pb-1.5 scroll-smooth [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border/60 hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/50"
        >
          <div
            className={cn(
              "grid grid-flow-col auto-cols-[minmax(11rem,1fr)] gap-2 min-w-full",
              useTwoRows ? "grid-rows-2" : "grid-rows-1"
            )}
          >
            {pops.map((pop, index) => {
              const unassigned = isUnassignedPOP(pop.popId);
              const isSelected = unassigned
                ? activePopId === "__unassigned__"
                : activePopId === pop.popId;
              const validationStats = formatValidationRate(pop.validated, pop.total);

              return (
                <button
                  key={pop.popId ? `pop-${pop.popId}` : `unassigned-${index}`}
                  type="button"
                  onClick={() => onPopSelect?.(pop.popId)}
                  className={cn(
                    "group flex min-w-44 flex-col gap-1.5 rounded-xl border p-2.5 text-left transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
                    "hover:border-primary/40 hover:bg-muted/15 active:scale-[0.97]",
                    isSelected
                      ? "border-primary/60 bg-primary/5 shadow-xs"
                      : "border-border/60 bg-background/80 dark:bg-background/50 shadow-2xs",
                    unassigned && !isSelected && "border-amber-300/60 bg-amber-50/30 dark:border-amber-900/40 dark:bg-amber-950/30"
                  )}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="truncate text-xs font-medium text-foreground">
                      {unassigned ? UNASSIGNED_POP_LABEL : pop.label}
                    </span>
                    {unassigned && (
                      <span className="shrink-0 rounded border border-amber-300 bg-amber-50 px-1 py-0.5 font-mono text-[8px] uppercase tracking-[0.1em] text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-400">
                        !
                      </span>
                    )}
                  </div>

                  <div className="flex items-baseline gap-1">
                    <span className="font-mono text-lg font-semibold tabular-nums text-foreground">
                      {pop.total}
                    </span>
                    <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                      {unitLabel}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span className="font-mono tabular-nums">
                      {["ODC", "OTB", "JC"].includes(normalizedType) && ((pop.totalCores ?? 0) > 0 || pop.totalPorts === 0)
                        ? t("deviceList.popPanel.coreUsage", { used: pop.usedCores ?? 0, total: pop.totalCores ?? 0 })
                        : normalizedType === "CABLE"
                          ? t("deviceList.popPanel.cableUsage", { length: Math.round(pop.cableLengthM ?? 0) })
                          : ["ONT", "RACK", "RECTIFIER"].includes(normalizedType) && pop.totalPorts === 0
                            ? `${pop.validated}/${pop.total}`
                            : t("deviceList.popPanel.portUsage", { used: pop.usedPorts, total: pop.totalPorts })}
                    </span>
                    {validationStats.rate ? (
                      <span
                        className={cn(
                          "font-mono tabular-nums font-semibold",
                          validationStats.isHigh ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
                        )}
                      >
                        {validationStats.rate}
                      </span>
                    ) : (
                      <span className="font-mono text-muted-foreground/50">--</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} />;
}
