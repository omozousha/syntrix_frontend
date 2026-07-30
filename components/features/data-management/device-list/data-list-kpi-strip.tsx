"use client";

import { Boxes, CheckSquare, MapPin, Shield } from "lucide-react";
import { OperationalKpiCard } from "@/components/operational-ui";
import { formatRoleLabel } from "@/lib/domain-formatters";

export function DataListKpiStrip({
  total,
  categoryLabel,
  selectedCount,
  supportsPopFilter,
  isPopFilterActive,
  selectedPopLabel,
  canWrite,
  role,
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
  canWrite: boolean;
  role: string;
  isMasterCategory?: boolean;
  activeCount?: number;
  archivedCount?: number;
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
      {isMasterCategory ? (
        <>
          <OperationalKpiCard
            label="Active"
            value={String(activeCount ?? 0)}
            caption="Item aktif di halaman ini"
            icon={CheckSquare}
            tone="emerald"
          />
          <OperationalKpiCard
            label="Inactive"
            value={String(archivedCount ?? 0)}
            caption="Item tidak aktif di halaman ini"
            icon={Shield}
            tone={archivedCount ? "rose" : "slate"}
          />
        </>
      ) : (
        <>
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
            caption={formatRoleLabel(role)}
            icon={Shield}
            tone={canWrite ? "emerald" : "slate"}
          />
        </>
      )}
    </div>
  );
}
