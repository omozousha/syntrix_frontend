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
  const { t, locale } = useTranslate();
  const numberLocale = locale === "en" ? "en-US" : "id-ID";
  const cards = [
    <OperationalKpiCard key="total" label={t("deviceList.kpi.totalData")} value={total.toLocaleString(numberLocale)} caption={t("deviceList.kpi.totalCaption", { category: categoryLabel })} icon={Boxes} tone="blue" />,
  ];

  if (isMasterCategory) {
    cards.push(
      <OperationalKpiCard key="active" label={t("deviceList.kpi.active")} value={String(activeCount ?? 0)} caption={t("deviceList.kpi.activeItems")} icon={CheckSquare} tone="emerald" />,
      <OperationalKpiCard key="inactive" label={t("deviceList.kpi.inactive")} value={String(archivedCount ?? 0)} caption={t("deviceList.kpi.inactiveItems")} icon={Shield} tone={archivedCount ? "rose" : "slate"} />,
    );
  } else {
    cards.push(
      <OperationalKpiCard key="filter" label={t("deviceList.kpi.popFilter")} value={supportsPopFilter && isPopFilterActive ? t("deviceList.kpi.active") : t("deviceList.kpi.all")} caption={selectedPopLabel || t("deviceList.kpi.allPop")} icon={MapPin} tone={supportsPopFilter && isPopFilterActive ? "emerald" : "slate"} />,
    );
    if (customerCount !== undefined) {
      cards.push(
        <OperationalKpiCard
          key="customers"
          label={t("deviceList.kpi.totalCustomers")}
          value={customerCount.toLocaleString(numberLocale)}
          caption={t("deviceList.kpi.customerCaption")}
          icon={Users}
          tone="emerald"
        />,
      );
    }
    cards.push(
      <OperationalKpiCard
        key="selected"
        label={t("deviceList.kpi.selected")}
        value={selectedCount.toLocaleString(numberLocale)}
        caption={t("deviceList.kpi.selectedCaption")}
        icon={CheckSquare}
        tone={selectedCount > 0 ? "amber" : "slate"}
      />,
    );
  }

  const gridColsClass = cards.length === 3 ? "xl:grid-cols-3" : "xl:grid-cols-4";
  return <div className={`grid grid-cols-1 gap-2 sm:grid-cols-2 ${gridColsClass}`}>{cards}</div>;
}
