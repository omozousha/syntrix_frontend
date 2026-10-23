"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export interface DataTableSkeletonProps {
  columnCount?: number;
  columnWidths?: string[];
  rowCount?: number;
  showCheckbox?: boolean;
  showMobileCards?: boolean;
  mobileRowCount?: number;
  className?: string;
  ariaLabel?: string;
}

const DEFAULT_WIDTHS = [
  "w-28",
  "w-36",
  "w-24",
  "w-20",
  "w-32",
  "w-24",
  "w-28",
  "w-20",
  "w-16",
];

export function DataTableSkeleton({
  columnCount = 6,
  columnWidths,
  rowCount = 6,
  showCheckbox = true,
  showMobileCards = true,
  mobileRowCount = 4,
  className,
  ariaLabel = "Memuat data tabel...",
}: DataTableSkeletonProps) {
  const widths = columnWidths || DEFAULT_WIDTHS;

  return (
    <div
      role="status"
      aria-label={ariaLabel}
      className={cn("w-full space-y-3", className)}
    >
      <span className="sr-only">{ariaLabel}</span>

      {/* Desktop Table View (>= 768px) */}
      <div className="hidden md:block rounded-[2rem] border border-border/40 bg-muted/10 p-2 shadow-xs dark:bg-white/[0.02]">
        <div className="rounded-[calc(2rem-0.5rem)] border border-border/60 bg-card shadow-xs glass-inset overflow-hidden">
          {/* Table Header Row */}
          <div className="flex items-center gap-4 border-b border-border/40 bg-muted/30 px-4 py-3">
            {showCheckbox ? (
              <Skeleton className="size-4 shrink-0 rounded-sm" />
            ) : null}
            {Array.from({ length: columnCount }).map((_, colIndex) => {
              const widthClass = widths[colIndex % widths.length] || "w-24";
              return (
                <Skeleton
                  key={`th-${colIndex}`}
                  className={cn("h-3.5 rounded", widthClass)}
                />
              );
            })}
          </div>

          {/* Table Body Rows */}
          <div className="divide-y divide-border/30">
            {Array.from({ length: rowCount }).map((_, rowIndex) => (
              <div
                key={`tr-${rowIndex}`}
                className="flex items-center gap-4 px-4 py-3 transition-colors"
              >
                {showCheckbox ? (
                  <Skeleton className="size-4 shrink-0 rounded-sm" />
                ) : null}
                {Array.from({ length: columnCount }).map((_, colIndex) => {
                  const widthClass = widths[colIndex % widths.length] || "w-24";
                  const isStatusOrBadge = colIndex === columnCount - 2;
                  const isActionColumn = colIndex === columnCount - 1;

                  if (isActionColumn) {
                    return (
                      <div
                        key={`td-${rowIndex}-${colIndex}`}
                        className="ml-auto flex items-center justify-end gap-1.5 shrink-0"
                      >
                        <Skeleton className="h-7 w-16 rounded-full" />
                      </div>
                    );
                  }

                  if (isStatusOrBadge) {
                    return (
                      <Skeleton
                        key={`td-${rowIndex}-${colIndex}`}
                        className="h-5 w-20 rounded-full shrink-0"
                      />
                    );
                  }

                  return (
                    <Skeleton
                      key={`td-${rowIndex}-${colIndex}`}
                      className={cn("h-4 rounded", widthClass)}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile Card View (< 768px) */}
      {showMobileCards ? (
        <div className="space-y-2 md:hidden">
          {/* Mobile Select-All Bar Placeholder */}
          <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/40 px-3 py-2 glass-inset">
            <div className="flex items-center gap-2">
              <Skeleton className="size-4 rounded-sm" />
              <Skeleton className="h-3 w-24 rounded" />
            </div>
            <Skeleton className="h-3 w-16 rounded" />
          </div>

          {/* Mobile Cards List */}
          {Array.from({ length: mobileRowCount }).map((_, cardIndex) => (
            <div
              key={`m-card-${cardIndex}`}
              className="rounded-2xl border border-border/60 bg-card p-3 shadow-2xs glass-inset space-y-2.5"
            >
              {/* Card Top: Checkbox, Name, Code & Badge */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-start gap-2.5 flex-1">
                  <Skeleton className="mt-0.5 size-4 shrink-0 rounded-sm" />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-3/4 rounded" />
                    <Skeleton className="h-3 w-1/2 rounded" />
                  </div>
                </div>
                <Skeleton className="h-5 w-16 shrink-0 rounded-full" />
              </div>

              {/* Card Middle: Status & Timestamp */}
              <div className="flex items-center justify-between text-xs pt-1">
                <Skeleton className="h-3 w-20 rounded" />
                <Skeleton className="h-3 w-24 rounded" />
              </div>

              {/* Card Footer: Action Buttons */}
              <div className="flex items-center justify-end gap-2 border-t border-border/40 pt-2">
                <Skeleton className="h-7 w-16 rounded-full" />
                <Skeleton className="h-7 w-16 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
