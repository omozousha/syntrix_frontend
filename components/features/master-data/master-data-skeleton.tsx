"use client";

import { Skeleton } from "@/components/ui/skeleton";
import type { LucideIcon } from "lucide-react";
import { Boxes, Cable, Globe, HardDrive } from "lucide-react";

type SectionShape = {
  key: string;
  icon: LucideIcon;
  tileCount: number;
};

const SECTION_SHAPES: SectionShape[] = [
  { key: "topology", icon: Globe, tileCount: 5 },
  { key: "device", icon: Boxes, tileCount: 6 },
  { key: "vendorTenant", icon: Cable, tileCount: 7 },
  { key: "location", icon: HardDrive, tileCount: 2 },
];

export function MasterDataSkeleton() {
  return (
    <div
      role="status"
      aria-label="Memuat data master..."
      className="space-y-5 w-full"
    >
      <span className="sr-only">Memuat data master...</span>

      {/* Search Bar Skeleton */}
      <div className="relative">
        <Skeleton className="h-9 w-full rounded-full" />
      </div>

      {/* 4 Section Cards, each with category tile grid */}
      {SECTION_SHAPES.map((section) => (
        <div key={section.key} className="space-y-2.5">
          <div className="flex items-center justify-between px-0.5">
            <div className="flex items-center gap-2">
              {/* Real section icon (static, colored in actual UI) */}
              <section.icon className="size-3.5 text-muted-foreground" />
              <Skeleton className="h-3.5 w-40 rounded" />
            </div>
            <Skeleton className="h-4 w-16 rounded-full" />
          </div>

          <div className="rounded-2xl border border-border/60 bg-card p-3.5 shadow-2xs glass-inset">
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
              {Array.from({ length: section.tileCount }).map((_, i) => (
                <div
                  key={`${section.key}-tile-${i}`}
                  className="flex flex-col items-center justify-between gap-2.5 rounded-2xl border border-border/50 bg-card p-3.5 text-center"
                >
                  <Skeleton className="size-8 rounded-xl" />
                  <Skeleton className="h-3.5 w-14 rounded" />
                  <Skeleton className="h-4 w-10 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
