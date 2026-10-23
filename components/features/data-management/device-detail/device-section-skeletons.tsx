"use client";

import { Skeleton } from "@/components/ui/skeleton";

// Inline skeleton wireframes for device-detail sub-sections.
// Each mirrors the actual rendered shapes (port cards, check grids,
// metric rows, history cards, tray pills) to avoid layout shift.

function StatusWrap({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div role="status" aria-label={label} className="space-y-2">
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

/** Port card grid — mirrors OdpPortSection / device-port-summary-section port cards. */
export function PortCardGridSkeleton({ count = 4, ariaLabel }: { count?: number; ariaLabel: string }) {
  return (
    <StatusWrap label={ariaLabel}>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">
        {Array.from({ length: count }).map((_, i) => (
          <div key={`port-skel-${i}`} className="rounded-md border bg-background p-3">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1 space-y-1">
                <Skeleton className="h-3.5 w-20 rounded" />
                <Skeleton className="h-3 w-28 rounded" />
              </div>
              <Skeleton className="size-3 shrink-0 rounded-full" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {Array.from({ length: 8 }).map((_, j) => (
                <div key={j} className="rounded-md border bg-muted/20 p-2">
                  <Skeleton className="h-2.5 w-10 rounded" />
                  <Skeleton className="mt-1 h-3 w-14 rounded" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </StatusWrap>
  );
}

/** Chain check grid — mirrors ChainCheck grids (6 tiles) + summary text lines. */
export function ChainCheckGridSkeleton({ checks = 6, metrics = 3, ariaLabel }: { checks?: number; metrics?: number; ariaLabel: string }) {
  return (
    <StatusWrap label={ariaLabel}>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
        {Array.from({ length: checks }).map((_, i) => (
          <div key={`check-skel-${i}`} className="flex items-center gap-2 rounded-md border p-2">
            <Skeleton className="size-3.5 shrink-0 rounded-full" />
            <Skeleton className="h-3 w-16 rounded" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
        {Array.from({ length: metrics }).map((_, i) => (
          <Skeleton key={`metric-skel-${i}`} className="h-3.5 w-full max-w-40 rounded" />
        ))}
      </div>
    </StatusWrap>
  );
}

/** Metric tile row — mirrors PortMetric 4-up grid. */
export function MetricRowSkeleton({ count = 4, ariaLabel }: { count?: number; ariaLabel: string }) {
  return (
    <StatusWrap label={ariaLabel}>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {Array.from({ length: count }).map((_, i) => (
          <div key={`mrow-skel-${i}`} className="rounded-md border bg-muted/20 p-2 text-center">
            <Skeleton className="mx-auto h-6 w-10 rounded" />
            <Skeleton className="mx-auto mt-1 h-2.5 w-12 rounded" />
          </div>
        ))}
      </div>
    </StatusWrap>
  );
}

/** History card stack — mirrors OdpValidationHistoryCard / GenericValidationHistoryCard. */
export function HistoryCardStackSkeleton({ count = 2, ariaLabel }: { count?: number; ariaLabel: string }) {
  return (
    <StatusWrap label={ariaLabel}>
      <div className="space-y-2">
        {Array.from({ length: count }).map((_, i) => (
          <div key={`hist-skel-${i}`} className="rounded-md border bg-background p-3">
            <div className="flex flex-wrap items-center gap-2">
              <Skeleton className="h-5 w-14 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-3.5 w-40 rounded" />
            </div>
            <div className="mt-2 space-y-1.5">
              <Skeleton className="h-3 w-full max-w-72 rounded" />
              <Skeleton className="h-3 w-2/3 rounded" />
            </div>
            <Skeleton className="mt-3 h-7 w-32 rounded-md" />
          </div>
        ))}
      </div>
    </StatusWrap>
  );
}

/** Tray pill rows — mirrors port-tray/OLT/Switch tray layout (row of small port pills per tray). */
export function TrayPillSkeleton({ trays = 2, pillsPerTray = 8, ariaLabel }: { trays?: number; pillsPerTray?: number; ariaLabel: string }) {
  return (
    <StatusWrap label={ariaLabel}>
      <div className="space-y-2">
        {Array.from({ length: trays }).map((_, t) => (
          <div key={`tray-skel-${t}`} className="rounded-md border p-2">
            <Skeleton className="mb-2 h-3 w-24 rounded" />
            <div className="flex flex-wrap gap-1.5">
              {Array.from({ length: pillsPerTray }).map((_, p) => (
                <Skeleton key={p} className="size-9 rounded" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </StatusWrap>
  );
}

/** Simple bordered rows — mirrors cable/connection row lists. */
export function RowListSkeleton({ count = 3, ariaLabel }: { count?: number; ariaLabel: string }) {
  return (
    <StatusWrap label={ariaLabel}>
      <div className="space-y-2">
        {Array.from({ length: count }).map((_, i) => (
          <div key={`row-skel-${i}`} className="flex items-center gap-3 rounded-md border bg-muted/20 p-2">
            <Skeleton className="h-5 w-14 shrink-0 rounded" />
            <Skeleton className="h-3.5 min-w-0 flex-1 rounded" />
            <Skeleton className="h-3.5 w-12 shrink-0 rounded" />
          </div>
        ))}
      </div>
    </StatusWrap>
  );
}
