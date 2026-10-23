"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function RegionCardSkeleton() {
  return (
    <div className="flex min-h-52 flex-col rounded-2xl border border-border/60 bg-card shadow-2xs glass-inset">
      {/* Header: Region Name, Code & Last Updated */}
      <div className="space-y-1.5 px-4 pb-2 pt-4 border-b border-border/30">
        <div className="flex items-start justify-between gap-2">
          <Skeleton className="h-5 w-32 rounded-md" />
          <Skeleton className="h-4 w-14 rounded-md" />
        </div>
        <Skeleton className="h-3 w-28 rounded" />
      </div>

      {/* Content: 5 Metric Tiles in 2 Columns */}
      <div className="grid flex-1 grid-cols-2 gap-2.5 px-4 py-3">
        {/* Metric 1: POP */}
        <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/5 px-2.5 py-2 glass-inset">
          <Skeleton className="size-4 shrink-0 rounded" />
          <div className="space-y-1 min-w-0 flex-1">
            <Skeleton className="h-2.5 w-10 rounded" />
            <Skeleton className="h-4 w-8 rounded" />
          </div>
        </div>

        {/* Metric 2: Device */}
        <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/5 px-2.5 py-2 glass-inset">
          <Skeleton className="size-4 shrink-0 rounded" />
          <div className="space-y-1 min-w-0 flex-1">
            <Skeleton className="h-2.5 w-12 rounded" />
            <Skeleton className="h-4 w-10 rounded" />
          </div>
        </div>

        {/* Metric 3: Route */}
        <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/5 px-2.5 py-2 glass-inset">
          <Skeleton className="size-4 shrink-0 rounded" />
          <div className="space-y-1 min-w-0 flex-1">
            <Skeleton className="h-2.5 w-10 rounded" />
            <Skeleton className="h-4 w-14 rounded" />
          </div>
        </div>

        {/* Metric 4: Cable on Route */}
        <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/5 px-2.5 py-2 glass-inset">
          <Skeleton className="size-4 shrink-0 rounded" />
          <div className="space-y-1 min-w-0 flex-1">
            <Skeleton className="h-2.5 w-14 rounded" />
            <Skeleton className="h-4 w-8 rounded" />
          </div>
        </div>

        {/* Metric 5: Customer (Spans 2 columns) */}
        <div className="col-span-2 flex items-center gap-2 rounded-xl border border-border/60 bg-muted/5 px-2.5 py-2 glass-inset">
          <Skeleton className="size-4 shrink-0 rounded" />
          <div className="space-y-1 min-w-0 flex-1">
            <Skeleton className="h-2.5 w-16 rounded" />
            <Skeleton className="h-4 w-12 rounded" />
          </div>
        </div>
      </div>

      {/* Footer: View POP Button */}
      <div className="px-4 pb-4 pt-1">
        <Skeleton className="h-9 w-full rounded-full" />
      </div>
    </div>
  );
}

export function RegionCardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div
      role="status"
      aria-label="Memuat daftar region..."
      className="space-y-4 w-full"
    >
      <span className="sr-only">Memuat daftar region...</span>

      {/* Filter / Search Bar Skeleton */}
      <div className="flex flex-col gap-2 rounded-2xl border border-border/60 bg-card p-3 shadow-xs glass-inset sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-9 w-full sm:w-64 rounded-xl" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-20 rounded-full" />
          <Skeleton className="h-8 w-20 rounded-full" />
        </div>
      </div>

      {/* Responsive 12-column Region Grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {Array.from({ length: count }).map((_, index) => (
          <RegionCardSkeleton key={`region-skel-${index}`} />
        ))}
      </div>
    </div>
  );
}

export function FocusedRegionSkeleton() {
  return (
    <div
      role="status"
      aria-label="Memuat region aktif..."
      className="space-y-3 w-full"
    >
      <span className="sr-only">Memuat region aktif...</span>

      {/* Section Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-4 w-36 rounded" />
        <Skeleton className="h-9 w-full sm:w-80 rounded-xl" />
      </div>

      {/* Region Identity Bar */}
      <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-card p-3 shadow-2xs glass-inset">
        <div className="flex items-center gap-2">
          <Skeleton className="size-7 rounded-xl" />
          <div className="space-y-1">
            <Skeleton className="h-4 w-40 rounded" />
            <Skeleton className="h-3 w-28 rounded" />
          </div>
        </div>
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>

      {/* Quick Actions Card */}
      <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-xs glass-inset space-y-3">
        <Skeleton className="h-4 w-28 rounded" />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
      </div>

      {/* Category Grid */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={`cat-skel-${i}`}
            className="flex flex-col gap-2 rounded-2xl border border-border/60 bg-card p-3 shadow-2xs glass-inset"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="size-6 rounded-lg" />
              <Skeleton className="h-4 w-8 rounded-full" />
            </div>
            <Skeleton className="h-4 w-20 rounded" />
            <Skeleton className="h-3 w-14 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

