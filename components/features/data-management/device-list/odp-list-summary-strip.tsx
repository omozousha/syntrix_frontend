"use client";

import type { OdpListSummary } from "@/lib/types/odp-summary";
import { OperationalKpiCard } from "@/components/operational-ui";
import { formatValidationRate, calculateAvailablePorts, formatPortUsage } from "@/lib/formatters/odp-stats";
import { Boxes, CheckSquare, MapPin, Server } from "lucide-react";
import { useTranslate } from "@/lib/use-locale";

interface OdpListSummaryStripProps {
  summary: OdpListSummary | null;
  popCount?: number;
  loading?: boolean;
}

export function OdpListSummaryStrip({ summary, popCount, loading }: OdpListSummaryStripProps) {
  const { t } = useTranslate();

  if (loading || !summary) {
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

  const validationStats = formatValidationRate(summary.validated, summary.total);
  const portUsage = formatPortUsage(summary.ports.used, summary.ports.total);
  const availablePorts = calculateAvailablePorts(summary.ports.total, summary.ports.used);

  // Calculate POP count from total ODP if not provided
  const actualPopCount = popCount ?? Math.max(1, Math.round(summary.total / 5)); // rough estimate based on avg ODP per POP

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
      {/* Total ODP */}
      <OperationalKpiCard
        label={t("deviceList.summary.totalOdp")}
        value={String(summary.total)}
        caption={t("deviceList.summary.totalOdpCaption")}
        icon={Boxes}
        tone="blue"
      />

      {/* Validation Progress */}
      <OperationalKpiCard
        label={t("deviceList.summary.validation")}
        value={validationStats.rate ?? "--"}
        caption={t("deviceList.summary.validationCaption", {
          validated: summary.validated,
          total: summary.total,
        })}
        icon={CheckSquare}
        tone={validationStats.isHigh ? "emerald" : "amber"}
      />

      {/* Port Availability */}
      <OperationalKpiCard
        label={t("deviceList.summary.port")}
        value={portUsage.label}
        caption={t("deviceList.summary.portCaption", { count: availablePorts })}
        icon={Server}
        tone="slate"
      />

      {/* POP Coverage */}
      <OperationalKpiCard
        label={t("deviceList.summary.popCoverage")}
        value={String(actualPopCount)}
        caption={t("deviceList.summary.popCoverageCaption", { count: actualPopCount })}
        icon={MapPin}
        tone="emerald"
      />
    </div>
  );
}
