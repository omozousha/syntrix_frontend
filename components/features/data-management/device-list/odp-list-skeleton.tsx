"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function OdpListSkeleton() {
  return (
    <div className="space-y-4">
      {/* Header Skeleton */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2 shadow-xs">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-5 w-20 rounded" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-24 rounded-full" />
          <Skeleton className="h-8 w-20 rounded-md" />
        </div>
      </div>

      {/* Summary KPI Strip Skeleton */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-2xl border border-border/60 bg-card p-3 shadow-xs">
            <div className="flex items-center gap-3">
              <Skeleton className="size-9 shrink-0 rounded-md" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-5 w-12" />
                <Skeleton className="h-3 w-28" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* POP Distribution Panel Skeleton */}
      <div className="rounded-2xl border border-border/40 bg-muted/10 p-1.5 shadow-xs dark:bg-white/[0.02]">
        <div className="rounded-[calc(2rem-0.5rem)] border border-border/60 bg-background/80 p-4 backdrop-blur-xl dark:bg-background/40">
          <div className="mb-3 flex items-center justify-between border-b border-border/40 pb-3">
            <div className="space-y-1">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-3 w-48" />
            </div>
            <div className="flex gap-1.5">
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          </div>
          <div className="space-y-1.5">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center justify-between rounded-xl border border-border/60 bg-card p-3 shadow-2xs">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-5 w-24 rounded-md" />
                  <Skeleton className="h-3.5 w-32" />
                </div>
                <div className="flex items-center gap-4">
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-5 w-12 rounded" />
                  <Skeleton className="h-3.5 w-24" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Table Container Skeleton */}
      <div className="rounded-[2rem] border border-border/40 bg-muted/10 p-2 shadow-xs dark:bg-white/[0.02]">
        <div className="rounded-[calc(2rem-0.5rem)] border border-border/60 bg-card p-4 shadow-xs glass-inset space-y-4">
          <div className="space-y-1 border-b border-border/40 pb-3">
            <Skeleton className="h-3 w-20 rounded-full" />
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3 w-64" />
          </div>

          {/* Filter Bar Skeleton */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5 xl:grid-cols-6">
            <Skeleton className="h-9 rounded-md" />
            <Skeleton className="h-9 rounded-md" />
            <Skeleton className="h-9 rounded-md" />
            <Skeleton className="h-9 rounded-md" />
            <Skeleton className="h-9 rounded-md" />
            <Skeleton className="h-9 rounded-md" />
          </div>

          {/* Table Rows Skeleton */}
          <div className="space-y-2">
            <div className="flex items-center gap-4 border-b bg-muted/60 px-4 py-3 rounded-t-lg">
              <Skeleton className="size-4 rounded-sm" />
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-3.5 w-16" />
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-3.5 w-28" />
            </div>
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 border-b px-4 py-3 last:border-b-0">
                <Skeleton className="size-4 rounded-sm" />
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-3.5 w-32" />
                <Skeleton className="h-3.5 w-16" />
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-3.5 w-20" />
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-3.5 w-28" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
