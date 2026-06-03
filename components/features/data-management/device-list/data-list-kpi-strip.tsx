"use client";

import { Boxes, CheckSquare, MapPin, Shield } from "lucide-react";
import { OperationalKpiCard } from "@/components/operational-ui";

function getRoleLabel(role: string) {
  if (role === "admin") return "Superadmin";
  if (role === "user_all_region") return "Adminregion";
  return role;
}

export function DataListKpiStrip({
  total,
  categoryLabel,
  selectedCount,
  supportsPopFilter,
  isPopFilterActive,
  selectedPopLabel,
  canWrite,
  role,
}: {
  total: number;
  categoryLabel: string;
  selectedCount: number;
  supportsPopFilter: boolean;
  isPopFilterActive: boolean;
  selectedPopLabel: string;
  canWrite: boolean;
  role: string;
}) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
      <OperationalKpiCard
        label="Total Data"
        value={total.toLocaleString("id-ID")}
        caption={`${categoryLabel} pada filter aktif`}
        icon={Boxes}
        tone="blue"
      />
      <OperationalKpiCard
        label="Selected"
        value={selectedCount.toLocaleString("id-ID")}
        caption="Item siap bulk action"
        icon={CheckSquare}
        tone={selectedCount ? "amber" : "slate"}
      />
      <OperationalKpiCard
        label="POP Filter"
        value={supportsPopFilter && isPopFilterActive ? "Active" : "All"}
        caption={selectedPopLabel || "Semua POP"}
        icon={MapPin}
        tone={supportsPopFilter && isPopFilterActive ? "emerald" : "slate"}
      />
      <OperationalKpiCard
        label="Access"
        value={canWrite ? "Manage" : "View"}
        caption={getRoleLabel(role)}
        icon={Shield}
        tone={canWrite ? "emerald" : "slate"}
      />
    </div>
  );
}
