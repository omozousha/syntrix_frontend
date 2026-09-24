"use client";

import { Boxes, CheckSquare, MapPin, Shield } from "lucide-react";
import { OperationalKpiCard } from "@/components/operational-ui";

export function DataListKpiStrip({
  total,
  categoryLabel,
  selectedCount,
  supportsPopFilter,
  isPopFilterActive,
  selectedPopLabel,
  isMasterCategory,
  activeCount,
  archivedCount,
}: {
  total: number;
  categoryLabel: string;
  selectedCount: number;
  supportsPopFilter: boolean;
  isPopFilterActive: boolean;
  selectedPopLabel: string;
  isMasterCategory?: boolean;
  activeCount?: number;
  archivedCount?: number;
}) {
  const cards = [
    <OperationalKpiCard key="total" label="Total Data" value={total.toLocaleString("id-ID")} caption={`${categoryLabel} pada filter aktif`} icon={Boxes} tone="blue" compact />,
  ];

  if (isMasterCategory) {
    cards.push(
      <OperationalKpiCard key="active" label="Active" value={String(activeCount ?? 0)} caption="Item aktif" icon={CheckSquare} tone="emerald" compact />,
      <OperationalKpiCard key="inactive" label="Inactive" value={String(archivedCount ?? 0)} caption="Item tidak aktif" icon={Shield} tone={archivedCount ? "rose" : "slate"} compact />,
    );
  } else {
    cards.push(
      <OperationalKpiCard key="filter" label="POP Filter" value={supportsPopFilter && isPopFilterActive ? "Active" : "All"} caption={selectedPopLabel || "Semua POP"} icon={MapPin} tone={supportsPopFilter && isPopFilterActive ? "emerald" : "slate"} compact />,
    );
    if (selectedCount > 0) {
      cards.push(
        <OperationalKpiCard key="selected" label="Selected" value={selectedCount.toLocaleString("id-ID")} caption="Siap bulk action" icon={CheckSquare} tone="amber" compact />,
      );
    }
  }

  return <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">{cards}</div>;
}
