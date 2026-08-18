"use client";

import type { OdpPopSummary } from "@/lib/types/odp-summary";
import { formatValidationRate, isUnassignedPOP, UNASSIGNED_POP_LABEL } from "@/lib/formatters/odp-stats";
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

export function OdpPopDistributionPanel({
  pops,
  activePopId,
  onPopSelect,
  loading,
  error,
  onRetry,
}: OdpPopDistributionPanelProps) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-border/40 bg-muted/10 p-2 shadow-xs dark:bg-white/[0.02]">
        <div className="rounded-[calc(2rem-0.5rem)] border border-border/60 bg-background/80 p-3 backdrop-blur-xl dark:bg-background/40">
          <Skeleton className="h-3 w-24" />
          <div className="mt-2 grid grid-flow-col grid-rows-2 gap-2 overflow-hidden">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-36 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-border/40 bg-muted/10 p-2 shadow-xs dark:bg-white/[0.02]">
        <div className="rounded-[calc(2rem-0.5rem)] border border-border/60 bg-background/80 px-4 py-6 text-center backdrop-blur-xl dark:bg-background/40">
          <p className="text-sm text-destructive">{error}</p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-2 rounded-full border border-border/60 bg-background px-3 py-1 text-xs shadow-xs transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-muted/30 active:scale-[0.98]"
            >
              Coba Lagi
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!pops.length) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-border/40 bg-muted/10 p-2 shadow-xs dark:bg-white/[0.02]">
      <div className="rounded-[calc(2rem-0.5rem)] border border-border/60 bg-background/80 p-3 backdrop-blur-xl dark:bg-background/40">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
            Distribusi POP
          </h3>
          <span className="font-mono text-[9px] text-muted-foreground/70">
            {pops.length} POP
          </span>
        </div>

        <div className="overflow-x-auto pb-1">
          <div className="grid grid-flow-col grid-rows-2 gap-2 w-max">
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
                    "group flex w-44 shrink-0 flex-col gap-1.5 rounded-lg border p-2.5 text-left transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
                    "hover:border-primary/40 hover:bg-muted/15 active:scale-[0.97]",
                    isSelected
                      ? "border-primary/60 bg-primary/5 shadow-xs"
                      : "border-border/60 bg-card shadow-2xs glass-inset",
                    unassigned && !isSelected && "border-amber-300/60 bg-amber-50/30 dark:border-amber-900/30 dark:bg-amber-950/10"
                  )}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="truncate text-xs font-medium text-foreground">
                      {unassigned ? UNASSIGNED_POP_LABEL : pop.label}
                    </span>
                    {unassigned && (
                      <span className="shrink-0 rounded border border-amber-300 bg-amber-50 px-1 py-0.5 font-mono text-[8px] uppercase tracking-wider text-amber-700 dark:border-amber-900/30 dark:bg-amber-950/20 dark:text-amber-400">
                        !
                      </span>
                    )}
                  </div>

                  <div className="flex items-baseline gap-1">
                    <span className="font-mono text-lg font-semibold tabular-nums text-foreground">
                      {pop.total}
                    </span>
                    <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                      ODP
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span className="font-mono tabular-nums">
                      {pop.usedPorts}/{pop.totalPorts} port
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
