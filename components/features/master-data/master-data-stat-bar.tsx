"use client";

import { BookMarked, Boxes, Network, Workflow } from "lucide-react";

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
    <div className="-mx-1 overflow-x-auto px-1 pb-1">
      <div className="grid min-w-[720px] grid-cols-4 gap-2 sm:min-w-0">
        {STAT_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.key} className="rounded-md border bg-background/85 px-3 py-2 shadow-none">
              <div className="flex items-center justify-between gap-3 text-muted-foreground">
                <span className="truncate text-[11px] font-medium uppercase tracking-wide">{item.label}</span>
                <Icon className="size-4 shrink-0" />
              </div>
              <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">{item.value(props)}</p>
              <p className="truncate text-[11px] text-muted-foreground">{item.hint}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
