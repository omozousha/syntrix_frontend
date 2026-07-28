"use client";

import { BookMarked, Boxes, Network, Workflow } from "lucide-react";
import { Card } from "@/components/ui/card";

type MasterDataStatBarProps = {
  totalCategories: number;
  totalItems: number;
};

const STAT_ITEMS = [
  {
    key: "catalogs",
    label: "Total Master Data",
    hint: "Jenis referensi",
    icon: Workflow,
    value: (props: MasterDataStatBarProps) => props.totalCategories,
  },
  {
    key: "items",
    label: "Total Data",
    hint: "Seluruh item master",
    icon: Boxes,
    value: (props: MasterDataStatBarProps) => props.totalItems,
  },
  {
    key: "groups",
    label: "Kelompok Data",
    hint: "Topologi, perangkat, vendor, lokasi",
    icon: Network,
    value: () => 4,
  },
  {
    key: "access",
    label: "Akses Kelola",
    hint: "Hak perubahan data",
    icon: BookMarked,
    value: () => "Admin",
  },
];

export function MasterDataStatBar(props: MasterDataStatBarProps) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {STAT_ITEMS.map((item) => {
        const Icon = item.icon;
        return (
          <Card key={item.key} className="p-3 shadow-none">
            <div className="flex items-center justify-between gap-2 text-muted-foreground">
              <span className="truncate text-[10px] font-semibold uppercase tracking-wide sm:text-[11px]">{item.label}</span>
              <Icon className="size-3.5 shrink-0 sm:size-4" />
            </div>
            <p className="mt-1 text-xl font-bold tabular-nums sm:text-2xl">{item.value(props)}</p>
            <p className="truncate text-[10px] text-muted-foreground sm:text-[11px]">{item.hint}</p>
          </Card>
        );
      })}
    </div>
  );
}
