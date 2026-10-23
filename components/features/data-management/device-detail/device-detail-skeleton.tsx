"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function DeviceDetailSkeleton({
  categoryLabel = "Device",
  isOdp = true,
}: {
  categoryLabel?: string;
  isOdp?: boolean;
}) {
  return (
    <div
      role="status"
      aria-label={`Memuat detail ${categoryLabel}...`}
      className="space-y-4 w-full"
    >
      <span className="sr-only">Memuat detail {categoryLabel}...</span>

      {/* Double-Bezel Hero Header Skeleton */}
      <div className="rounded-[1.5rem] border border-border/40 bg-muted/10 p-1 shadow-2xs dark:bg-white/[0.01]">
        <div className="rounded-[calc(1.5rem-0.25rem)] border border-border/60 bg-card p-4 shadow-xs glass-inset md:p-5 space-y-4">
          {/* Eyebrow & Breadcrumbs */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-20 rounded-md" />
              <Skeleton className="h-4 w-4 rounded-full" />
              <Skeleton className="h-4 w-32 rounded" />
            </div>
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>

          {/* Title, Identifier & Action Buttons */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <Skeleton className="h-7 sm:h-8 w-56 sm:w-80 rounded-md" />
              <div className="flex flex-wrap items-center gap-2">
                <Skeleton className="h-4 w-36 rounded" />
                <Skeleton className="h-5 w-24 rounded-full" />
              </div>
            </div>

            {/* Actions: Trace, QR, Edit, Delete */}
            <div className="flex flex-wrap items-center gap-2">
              <Skeleton className="h-9 w-24 rounded-full" />
              <Skeleton className="h-9 w-20 rounded-full" />
              <Skeleton className="h-9 w-20 rounded-full" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation Bar Skeleton */}
      <div className="inline-flex h-auto w-full sm:w-auto p-1 rounded-full border border-border/50 bg-muted/20 gap-1">
        <Skeleton className="h-8 w-28 rounded-full" />
        <Skeleton className="h-8 w-28 rounded-full" />
        <Skeleton className="h-8 w-32 rounded-full" />
        <Skeleton className="h-8 w-24 rounded-full" />
      </div>

      {/* Tab Content: Port Matrix & Specs Grid */}
      <div className="space-y-4">
        {/* Technical Specs Cards (Identity & Hardware) */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Spec Card 1 */}
          <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-xs glass-inset space-y-3">
            <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
              <Skeleton className="h-4 w-32 rounded" />
              <Skeleton className="h-4 w-12 rounded-full" />
            </div>
            <div className="grid grid-cols-2 gap-3 pt-1">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={`id-field-${i}`} className="space-y-1">
                  <Skeleton className="h-2.5 w-16 rounded" />
                  <Skeleton className="h-4 w-28 rounded" />
                </div>
              ))}
            </div>
          </div>

          {/* Spec Card 2 */}
          <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-xs glass-inset space-y-3">
            <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
              <Skeleton className="h-4 w-36 rounded" />
              <Skeleton className="h-4 w-16 rounded-full" />
            </div>
            <div className="grid grid-cols-2 gap-3 pt-1">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={`spec-field-${i}`} className="space-y-1">
                  <Skeleton className="h-2.5 w-20 rounded" />
                  <Skeleton className="h-4 w-24 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Port Matrix Card (Simulates ODP/ODC/POP Ports Grid) */}
        {isOdp ? (
          <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-xs glass-inset space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-3">
              <div className="space-y-1">
                <Skeleton className="h-4 w-32 rounded" />
                <Skeleton className="h-3 w-48 rounded" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-5 w-24 rounded-full" />
              </div>
            </div>

            {/* 16 Port Pills Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2.5">
              {Array.from({ length: 16 }).map((_, portIdx) => (
                <div
                  key={`port-pill-${portIdx}`}
                  className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-border/60 bg-muted/10 p-2.5 glass-inset"
                >
                  <Skeleton className="size-3 rounded-full" />
                  <Skeleton className="h-3 w-10 rounded" />
                  <Skeleton className="h-2.5 w-12 rounded" />
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* Attachment / Photo Gallery Placeholder */}
        <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-xs glass-inset space-y-3">
          <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
            <Skeleton className="h-4 w-36 rounded" />
            <Skeleton className="h-4 w-16 rounded-full" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, imgIdx) => (
              <div
                key={`gallery-${imgIdx}`}
                className="flex aspect-video w-full items-center justify-center rounded-xl border border-border/40 bg-muted/20"
              >
                <Skeleton className="size-8 rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
