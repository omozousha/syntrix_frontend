"use client";

import { OperationalKpiCard } from "@/components/operational-ui";
import { Boxes, Building2, MapPin, Users } from "lucide-react";
import { useTranslate } from "@/lib/use-locale";

interface PopListSummaryStripProps {
  total: number;
  activeCount?: number;
  archivedCount?: number;
  customerCount?: number;
  loading?: boolean;
}

export function PopListSummaryStrip({
  total,
  activeCount,
  archivedCount,
  customerCount,
  loading = false,
}: PopListSummaryStripProps) {
  const { t } = useTranslate();

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-2xl border border-border/60 bg-card p-3 shadow-xs glass-inset">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 shrink-0 rounded-md border bg-muted/20" />
              <div className="space-y-2 flex-1">
                <div className="h-3 w-16 rounded bg-muted/20" />
                <div className="h-4 w-12 rounded bg-muted/20" />
                <div className="h-3 w-24 rounded bg-muted/20" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const activeValue = activeCount != null ? `${activeCount}/${total}` : String(total);
  const archivedValue = archivedCount != null ? String(archivedCount) : "--";
  const customerValue = customerCount != null ? String(customerCount) : "--";

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
      <OperationalKpiCard
        label={t("deviceList.summary.totalPop")}
        value={String(total)}
        caption={t("deviceList.summary.totalPopCaption")}
        icon={Boxes}
        tone="blue"
      />

      <OperationalKpiCard
        label={t("deviceList.summary.activeStatus")}
        value={activeValue}
        caption={t("deviceList.summary.activeStatusCaption", { count: activeCount ?? total })}
        icon={Building2}
        tone="emerald"
      />

      <OperationalKpiCard
        label={t("deviceList.summary.archived")}
        value={archivedValue}
        caption={t("deviceList.summary.archivedCaption", { count: archivedCount ?? 0 })}
        icon={MapPin}
        tone="slate"
      />

      <OperationalKpiCard
        label={t("deviceList.summary.customerCoverage")}
        value={customerValue}
        caption={t("deviceList.summary.customerCoverageCaption", { count: customerCount ?? 0 })}
        icon={Users}
        tone="amber"
      />
    </div>
  );
}