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
    label: "Jenis Referensi",
    icon: Workflow,
    value: (props: MasterDataStatBarProps) => props.totalCategories,
  },
  {
    key: "items",
    label: "Total Item",
    icon: Boxes,
    value: (props: MasterDataStatBarProps) => props.totalItems,
  },
  {
    key: "groups",
    label: "Kelompok",
    icon: Network,
    value: () => 4,
  },
  {
    key: "access",
    label: "Akses",
    icon: BookMarked,
    value: () => "Admin",
  },
];

export function MasterDataStatBar(props: MasterDataStatBarProps) {
  return (
    <div className="grid grid-cols-4 gap-2 sm:gap-3">
      {STAT_ITEMS.map((item) => {
        const Icon = item.icon;
        return (
          <Card key={item.key} className="flex items-center gap-1.5 p-2 shadow-none sm:gap-2 sm:p-2.5">
            <div className="rounded-md bg-muted p-1.5">
              <Icon className="size-3.5 text-muted-foreground sm:size-4" />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-semibold tabular-nums leading-none sm:text-xl">{item.value(props)}</p>
              <p className="truncate text-[10px] text-muted-foreground sm:text-[11px]">{item.label}</p>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
