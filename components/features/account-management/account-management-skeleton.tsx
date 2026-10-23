"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";

export function AccountManagementSkeleton() {
  return (
    <div
      role="status"
      aria-label="Memuat manajemen akun..."
      className="space-y-4 w-full"
    >
      <span className="sr-only">Memuat manajemen akun...</span>

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-32 rounded" />
          <Skeleton className="h-7 w-52 rounded-md" />
          <Skeleton className="h-4 w-72 rounded" />
        </div>
        <Skeleton className="h-9 w-28 rounded-full shrink-0" />
      </div>

      {/* 4 Stat KPI Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={`account-stat-${i}`}
            className="rounded-2xl border border-border/60 bg-card p-3 shadow-xs glass-inset space-y-2"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-2.5 w-16 rounded" />
              <Skeleton className="size-4 rounded-sm" />
            </div>
            <Skeleton className="h-7 w-16 rounded-md font-mono" />
          </div>
        ))}
      </div>

      {/* Card Container for Filter & Table */}
      <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-xs glass-inset space-y-4">
        <div className="space-y-1 border-b border-border/40 pb-3">
          <Skeleton className="h-5 w-32 rounded" />
          <Skeleton className="h-3.5 w-64 rounded" />
        </div>

        {/* Filter Bar Skeleton */}
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-9 w-full rounded-md" />
          <Skeleton className="h-9 w-full rounded-md" />
          <Skeleton className="h-9 w-full rounded-md" />
          <Skeleton className="h-9 w-20 rounded-md" />
        </div>

        {/* 6-Column Account Table Skeleton */}
        <DataTableSkeleton
          columnCount={6}
          columnWidths={["w-40", "w-28", "w-32", "w-24", "w-20", "w-24"]}
          rowCount={5}
          showCheckbox={false}
          ariaLabel="Memuat daftar akun pengguna..."
        />
      </div>
    </div>
  );
}
