"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, ChevronUp } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import type { OdpPopSummary } from "@/lib/types/odp-summary";
import {
  formatValidationRate,
  calculateAvailablePorts,
  isUnassignedPOP,
  UNASSIGNED_POP_LABEL,
  VALIDATION_STATUS_COLORS,
} from "@/lib/formatters/odp-stats";
import { ValidationStatus } from "@/lib/types/odp-summary";
import { cn } from "@/lib/utils";

interface OdpPopDistributionPanelProps {
  pops: OdpPopSummary[];
  activePopId?: string | null;
  totalOdpCount?: number;
  onPopSelect?: (popId: string | null) => void;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

type SortField = "total" | "unvalidated" | "validationRate";

export function OdpPopDistributionPanel({
  pops,
  activePopId,
  totalOdpCount = 0,
  onPopSelect,
  loading,
  error,
  onRetry,
}: OdpPopDistributionPanelProps) {
  const [sortField, setSortField] = useState<SortField>("total");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const sortedPops = useMemo(() => {
    const next = [...pops];

    // Always keep Unassigned first
    const unassignedItems: OdpPopSummary[] = [];
    const regularItems: OdpPopSummary[] = [];

    next.forEach((item) => {
      if (isUnassignedPOP(item.popId)) {
        unassignedItems.push(item);
      } else {
        regularItems.push(item);
      }
    });

    // Sort regular items by the selected field
    regularItems.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case "total":
          comparison = a.total - b.total;
          break;
        case "unvalidated":
          comparison = a.unvalidated - b.unvalidated;
          break;
        case "validationRate": {
          const aRate = a.validationRate ?? -1;
          const bRate = b.validationRate ?? -1;
          comparison = aRate - bRate;
          break;
        }
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

    return [...unassignedItems, ...regularItems];
  }, [pops, sortField, sortDirection]);

  const renderSortIndicator = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-1 inline size-3 opacity-40" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="ml-1 inline size-3 text-primary" />
    ) : (
      <ArrowDown className="ml-1 inline size-3 text-primary" />
    );
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-border/40 bg-muted/10 p-1.5 shadow-xs dark:bg-white/[0.02]">
        <div className="rounded-[calc(2rem-0.5rem)] border border-border/60 bg-background/80 p-4 backdrop-blur-xl dark:bg-background/40">
          <div className="mb-3 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-64" />
          </div>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-4 rounded-xl border border-border/40 bg-card p-3 shadow-2xs"
              >
                <div className="flex items-center gap-3">
                  <Skeleton className="h-6 w-20 rounded-md" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <div className="flex items-center gap-4">
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-14" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-border/40 bg-muted/10 p-1.5 shadow-xs dark:bg-white/[0.02]">
        <div className="rounded-[calc(2rem-0.5rem)] border border-border/60 bg-background/80 px-4 py-8 text-center backdrop-blur-xl dark:bg-background/40">
          <p className="text-sm font-medium text-destructive">{error || "Gagal memuat distribusi POP"}</p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-3 inline-flex items-center justify-center rounded-full border border-border/60 bg-background px-4 py-1.5 text-xs font-medium shadow-xs transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-muted/30 active:scale-[0.98]"
            >
              Coba Lagi
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!pops.length) {
    return (
      <div className="rounded-2xl border border-border/40 bg-muted/10 p-1.5 shadow-xs dark:bg-white/[0.02]">
        <div className="rounded-[calc(2rem-0.5rem)] border border-border/60 bg-background/80 px-4 py-8 text-center backdrop-blur-xl dark:bg-background/40">
          <p className="text-sm text-muted-foreground">Tidak ada distribusi POP yang ditemukan.</p>
        </div>
      </div>
    );
  }

  const isScrollable = sortedPops.length > 10;

  const content = (
    <div className="space-y-1.5">
      {sortedPops.map((pop) => {
        const isSelected = activePopId === pop.popId;
        const unassigned = isUnassignedPOP(pop.popId);
        const validationStats = formatValidationRate(pop.validated, pop.total);
        const availablePorts = calculateAvailablePorts(pop.totalPorts, pop.usedPorts);

        return (
          <button
            key={pop.popId ?? "unassigned"}
            type="button"
            onClick={() => onPopSelect?.(pop.popId)}
            className={cn(
              "group relative flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
              "hover:border-primary/45 hover:bg-muted/15 active:scale-[0.98]",
              isSelected
                ? "border-primary/60 bg-primary/10 shadow-xs"
                : "border-border/60 bg-card shadow-2xs glass-inset"
            )}
          >
            {/* Active Highlight Marker */}
            {isSelected && (
              <div className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-primary" />
            )}

            {/* Left Info: POP Name / Label */}
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <span
                className={cn(
                  "inline-flex shrink-0 items-center rounded-md border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em]",
                  unassigned
                    ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-900/30 dark:bg-amber-950/20 dark:text-amber-400"
                    : "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-900/30 dark:bg-blue-950/20 dark:text-blue-400"
                )}
              >
                {unassigned ? UNASSIGNED_POP_LABEL : pop.label}
              </span>
              {!unassigned && (
                <span className="truncate text-xs font-medium text-muted-foreground">
                  {pop.label}
                </span>
              )}
            </div>

            {/* Right Metrics */}
            <div className="flex items-center gap-4 text-xs">
              {/* Total ODP */}
              <div className="text-right">
                <span className="font-mono tabular-nums font-semibold text-foreground">
                  {pop.total}
                </span>
                <span className="ml-1 text-[10px] text-muted-foreground">ODP</span>
              </div>

              {/* Validation Split */}
              <div className="hidden sm:block text-right">
                <span className="font-mono tabular-nums text-muted-foreground">
                  {pop.validated}/{pop.total}
                </span>
              </div>

              {/* Validation Rate Badge */}
              <div className="min-w-[50px] text-right">
                {validationStats.rate ? (
                  <span
                    className={cn(
                      "inline-flex items-center rounded border px-1.5 py-0.5 font-mono text-[10px] tabular-nums font-semibold",
                      validationStats.isHigh
                        ? VALIDATION_STATUS_COLORS[ValidationStatus.VALIDATED]
                        : "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-900/30 dark:bg-amber-950/20 dark:text-amber-400"
                    )}
                  >
                    {validationStats.rate}
                  </span>
                ) : (
                  <span className="font-mono text-[10px] text-muted-foreground">--</span>
                )}
              </div>

              {/* Port Usage */}
              <div className="hidden md:block text-right font-mono tabular-nums text-muted-foreground">
                <span>{pop.usedPorts}/{pop.totalPorts}</span>
                <span className="ml-1 text-[10px] text-muted-foreground/80">({availablePorts} avail)</span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="rounded-2xl border border-border/40 bg-muted/10 p-1.5 shadow-xs dark:bg-white/[0.02]">
      <div className="rounded-[calc(2rem-0.5rem)] border border-border/60 bg-background/80 p-4 backdrop-blur-xl dark:bg-background/40">
        {/* Panel Header & Sorters */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-3">
          <div>
            <h3 className="font-mono text-xs font-semibold uppercase tracking-[0.15em] text-foreground">
              Distribusi POP
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Ringkasan persebaran ODP dan validasi per POP
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground mr-1">
              Urutkan:
            </span>
            <button
              type="button"
              onClick={() => handleSort("total")}
              className={cn(
                "h-6 rounded-full px-2 font-mono text-[9px] uppercase tracking-[0.1em] transition-all duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]",
                sortField === "total"
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "border border-border/60 bg-background text-muted-foreground hover:bg-muted/30"
              )}
            >
              Total {renderSortIndicator("total")}
            </button>
            <button
              type="button"
              onClick={() => handleSort("unvalidated")}
              className={cn(
                "h-6 rounded-full px-2 font-mono text-[9px] uppercase tracking-[0.1em] transition-all duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]",
                sortField === "unvalidated"
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "border border-border/60 bg-background text-muted-foreground hover:bg-muted/30"
              )}
            >
              Belum Valid {renderSortIndicator("unvalidated")}
            </button>
            <button
              type="button"
              onClick={() => handleSort("validationRate")}
              className={cn(
                "h-6 rounded-full px-2 font-mono text-[9px] uppercase tracking-[0.1em] transition-all duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]",
                sortField === "validationRate"
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "border border-border/60 bg-background text-muted-foreground hover:bg-muted/30"
              )}
            >
              % Valid {renderSortIndicator("validationRate")}
            </button>
          </div>
        </div>

        {/* List Content */}
        {isScrollable ? (
          <ScrollArea className="max-h-[380px] pr-2">
            {content}
          </ScrollArea>
        ) : (
          content
        )}
      </div>
    </div>
  );
}
