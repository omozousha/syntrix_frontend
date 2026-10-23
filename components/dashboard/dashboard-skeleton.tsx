"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function DashboardSkeleton({
  role = "superadmin",
}: {
  role?: "superadmin" | "adminregion" | "validator";
}) {
  const isValidator = role === "validator";
  const metricCount = isValidator ? 4 : 5;
  const tabCount = isValidator ? 3 : role === "superadmin" ? 5 : 4;

  return (
    <div
      role="status"
      aria-label="Memuat dashboard..."
      className="space-y-4 w-full"
    >
      <span className="sr-only">Memuat dashboard...</span>

      {/* Double-Bezel Dashboard Header Skeleton */}
      <div className="rounded-[2rem] border border-border/40 bg-gradient-to-br from-muted/10 to-muted/5 p-2 shadow-[0_1px_3px_rgba(0,0,0,0.04)] dark:bg-gradient-to-br dark:from-white/[0.02] dark:to-transparent">
        <div className="flex flex-col gap-3 rounded-[calc(2rem-0.5rem)] border border-border/60 bg-background/80 p-3.5 sm:p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-xl dark:bg-background/40 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Skeleton className="h-4 w-20 rounded-full" />
              <Skeleton className="h-4 w-28 rounded-full" />
            </div>
            <Skeleton className="h-6 sm:h-7 w-48 sm:w-64 rounded-md" />
            <Skeleton className="h-3.5 sm:h-4 w-72 sm:w-96 rounded" />
          </div>
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
            <Skeleton className="h-9 w-9 rounded-md shrink-0" />
            {!isValidator ? (
              <Skeleton className="h-9 w-32 sm:w-44 rounded-md shrink-0" />
            ) : null}
            <Skeleton className="h-9 w-28 sm:w-36 rounded-md shrink-0" />
          </div>
        </div>
      </div>

      {/* Tabs Bar Skeleton */}
      <div className={`grid h-auto w-full gap-1 p-1 rounded-xl border border-border/50 bg-muted/20 ${
        isValidator ? "grid-cols-3" : role === "superadmin" ? "grid-cols-2 sm:grid-cols-5" : "grid-cols-2 sm:grid-cols-4"
      }`}>
        {Array.from({ length: tabCount }).map((_, i) => (
          <Skeleton key={`tab-${i}`} className="h-9 w-full rounded-lg" />
        ))}
      </div>

      {/* 5 KPI Metric Cards Skeleton */}
      <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${isValidator ? "xl:grid-cols-4" : "xl:grid-cols-5"}`}>
        {Array.from({ length: metricCount }).map((_, i) => (
          <div
            key={`kpi-${i}`}
            className="rounded-[1.5rem] border border-border/40 bg-muted/10 p-1 shadow-2xs dark:bg-white/[0.01]"
          >
            <div className="rounded-[calc(1.5rem-0.25rem)] border border-border/60 bg-card glass-inset p-3 space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-3 w-20 rounded" />
                  <Skeleton className="h-8 sm:h-9 w-24 rounded-md" />
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <Skeleton className="size-4 rounded-sm" />
                  <Skeleton className="h-4 w-12 rounded-full" />
                </div>
              </div>
              <div className="pt-1 border-t border-border/30">
                <Skeleton className="h-3 w-3/4 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 3 Chart Cards Skeleton */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={`chart-${i}`}
            className="rounded-2xl border border-border/60 bg-card p-4 shadow-xs glass-inset space-y-4"
          >
            <div className="space-y-1.5 border-b border-border/40 pb-3">
              <Skeleton className="h-4 w-36 rounded" />
              <Skeleton className="h-3 w-52 rounded" />
            </div>

            {/* Simulated Chart Graphic (Circle or Bar) */}
            <div className="flex h-48 items-center justify-center">
              {i % 2 === 0 ? (
                // Donut Chart Shape
                <div className="relative flex size-36 items-center justify-center rounded-full border-8 border-muted/70">
                  <div className="size-20 rounded-full border-4 border-muted/50" />
                </div>
              ) : (
                // Bar Chart Shape
                <div className="flex h-36 w-full items-end justify-around gap-2 px-4 pb-2">
                  <Skeleton className="h-16 w-8 rounded-t" />
                  <Skeleton className="h-28 w-8 rounded-t" />
                  <Skeleton className="h-20 w-8 rounded-t" />
                  <Skeleton className="h-32 w-8 rounded-t" />
                  <Skeleton className="h-24 w-8 rounded-t" />
                </div>
              )}
            </div>

            {/* Legend Skeleton */}
            <div className="flex flex-wrap justify-center gap-2 pt-2 border-t border-border/30">
              <Skeleton className="h-4 w-16 rounded-full" />
              <Skeleton className="h-4 w-20 rounded-full" />
              <Skeleton className="h-4 w-16 rounded-full" />
            </div>
          </div>
        ))}
      </div>

      {/* 2 Bottom Cards (Trend Line & Mini-Map) Skeleton */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* Trend Line Card */}
        <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-xs glass-inset space-y-4">
          <div className="space-y-1.5 border-b border-border/40 pb-3">
            <Skeleton className="h-4 w-40 rounded" />
            <Skeleton className="h-3 w-56 rounded" />
          </div>
          <div className="flex h-44 w-full items-end justify-between gap-1 px-2 pb-2">
            {Array.from({ length: 8 }).map((_, j) => (
              <div key={`trend-bar-${j}`} className="flex flex-col items-center gap-1.5 flex-1">
                <Skeleton
                  className="w-full max-w-[24px] rounded-t"
                  style={{ height: `${25 + ((j * 17) % 65)}px` }}
                />
                <Skeleton className="h-2.5 w-6 rounded" />
              </div>
            ))}
          </div>
        </div>

        {/* Mini-Map Card */}
        <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-xs glass-inset space-y-4">
          <div className="space-y-1.5 border-b border-border/40 pb-3">
            <Skeleton className="h-4 w-36 rounded" />
            <Skeleton className="h-3 w-60 rounded" />
          </div>
          <div className="relative flex h-44 w-full items-center justify-center rounded-xl border border-border/40 bg-muted/20">
            <div className="flex flex-col items-center gap-2">
              <div className="size-8 rounded-full border-2 border-primary/40 bg-primary/10 animate-ping" />
              <Skeleton className="h-3 w-28 rounded" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
