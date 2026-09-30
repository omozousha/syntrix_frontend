"use client";

import { Boxes, CheckSquare, MapPin, Shield, Users } from "lucide-react";
import { OperationalKpiCard } from "@/components/operational-ui";
import { useTranslate } from "@/lib/use-locale";

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
  customerCount,
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
  customerCount?: number;
}) {
  const { t } = useTranslate();
  const cards = [
    <OperationalKpiCard key="total" label={t("deviceList.kpi.totalData")} value={total.toLocaleString("id-ID")} caption={t("deviceList.kpi.totalCaption", { category: categoryLabel })} icon={Boxes} tone="blue" compact />,
  ];

  if (isMasterCategory) {
    cards.push(
      <OperationalKpiCard key="active" label="Active" value={String(activeCount ?? 0)} caption={t("deviceList.kpi.activeItems")} icon={CheckSquare} tone="emerald" compact />,
      <OperationalKpiCard key="inactive" label="Inactive" value={String(archivedCount ?? 0)} caption={t("deviceList.kpi.inactiveItems")} icon={Shield} tone={archivedCount ? "rose" : "slate"} compact />,
    );
  } else {
    cards.push(
      <OperationalKpiCard key="filter" label="POP Filter" value={supportsPopFilter && isPopFilterActive ? "Active" : "All"} caption={selectedPopLabel || t("deviceList.kpi.allPop")} icon={MapPin} tone={supportsPopFilter && isPopFilterActive ? "emerald" : "slate"} compact />,
    );
    if (customerCount !== undefined) {
      cards.push(
        <OperationalKpiCard
          key="customers"
          label={t("deviceList.kpi.totalCustomers")}
          value={customerCount.toLocaleString("id-ID")}
          caption={t("deviceList.kpi.customerCaption")}
          icon={Users}
          tone="emerald"
          compact
        />,
      );
    }
    if (selectedCount > 0) {
      cards.push(
        <OperationalKpiCard key="selected" label="Selected" value={selectedCount.toLocaleString("id-ID")} caption={t("deviceList.kpi.selectedCaption")} icon={CheckSquare} tone="amber" compact />,
      );
    }
  }

  return <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">{cards}</div>;
}
