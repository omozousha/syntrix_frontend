"use client";

import { BookMarked, Boxes, Network, Workflow } from "lucide-react";

type MasterDataStatBarProps = {
  totalCategories: number;
  totalItems: number;
};

const ITEMS = [
  { key: "catalogs", label: "Jenis Referensi", icon: Workflow, value: (p: MasterDataStatBarProps) => p.totalCategories },
  { key: "items", label: "Total Item", icon: Boxes, value: (p: MasterDataStatBarProps) => p.totalItems },
  { key: "groups", label: "Kelompok", icon: Network, value: () => 4 },
  { key: "access", label: "Akses", icon: BookMarked, value: () => "Admin" },
];

export function MasterDataStatBar(props: MasterDataStatBarProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {ITEMS.map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.key} className="inline-flex items-center gap-1.5 rounded-md border bg-card px-2.5 py-1.5 text-xs shadow-none">
            <Icon className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="font-semibold tabular-nums">{item.value(props)}</span>
            <span className="text-muted-foreground">{item.label}</span>
          </div>
        );
      })}
    </div>
  );
}
