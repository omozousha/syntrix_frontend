"use client";

import { BookMarked, Boxes, Building2, MapPinned, Network } from "lucide-react";

type MasterDataStatBarProps = {
  totalItems: number;
  sectionTotals: { label: string; icon: React.ComponentType<{ className?: string }>; count: number }[];
};

export function MasterDataStatBar({ totalItems, sectionTotals }: MasterDataStatBarProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <div className="inline-flex items-center gap-1.5 rounded-md border bg-primary/5 px-2.5 py-1.5 text-xs shadow-none">
        <Boxes className="size-3.5 shrink-0 text-primary" />
        <span className="font-semibold tabular-nums">{totalItems}</span>
        <span className="text-muted-foreground">Total Item</span>
      </div>
      {sectionTotals.map((s) => {
        const Icon = s.icon;
        return (
          <div key={s.label} className="inline-flex items-center gap-1.5 rounded-md border bg-card px-2.5 py-1.5 text-xs shadow-none">
            <Icon className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="font-semibold tabular-nums">{s.count}</span>
            <span className="text-muted-foreground">{s.label}</span>
          </div>
        );
      })}
      <div className="inline-flex items-center gap-1.5 rounded-md border bg-card px-2.5 py-1.5 text-xs shadow-none">
        <BookMarked className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="font-semibold tabular-nums">Admin</span>
        <span className="text-muted-foreground">Akses</span>
      </div>
    </div>
  );
}
