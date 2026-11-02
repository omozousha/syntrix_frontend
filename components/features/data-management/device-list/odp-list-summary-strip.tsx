"use client";

import type { OdpListSummary } from "@/lib/types/odp-summary";
import { OperationalKpiCard } from "@/components/operational-ui";
import {
  formatValidationRate,
  calculateAvailablePorts,
  calculateAvailableCores,
  formatPortUsage,
} from "@/lib/formatters/odp-stats";
import { Boxes, Cable, CheckSquare, Cpu, MapPin, Server, ShieldCheck, Users } from "lucide-react";
import { useTranslate } from "@/lib/use-locale";

interface OdpListSummaryStripProps {
  summary: OdpListSummary | null;
  popCount?: number;
  loading?: boolean;
  deviceTypeKey?: string;
  categoryLabel?: string;
}

export function OdpListSummaryStrip({
  summary,
  popCount,
  loading,
  deviceTypeKey = "ODP",
  categoryLabel = "ODP",
}: OdpListSummaryStripProps) {
  const { t } = useTranslate();
  const normalizedType = deviceTypeKey.toUpperCase();
  const isOdp = normalizedType === "ODP";

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
  const actualPopCount = popCount ?? 0;

  const specificMetric = (() => {
    const coreTotal = summary.cores?.total ?? 0;
    const coreUsed = summary.cores?.used ?? 0;
    const portTotal = summary.ports.total;
    const portUsed = summary.ports.used;

    if (["ODC", "OTB", "JC"].includes(normalizedType)) {
      if (coreTotal > 0 || portTotal === 0) {
        const coreUsage = formatPortUsage(coreUsed, coreTotal);
        const availableCores = calculateAvailableCores(coreTotal, coreUsed);
        return {
          label: t("deviceList.summary.core"),
          value: coreUsage.label,
          caption: t("deviceList.summary.coreCaption", { count: availableCores }),
          icon: Cpu,
          tone: "slate" as const,
        };
      }
    }

    if (normalizedType === "CABLE") {
      const lengthM = summary.cableLengthM ?? 0;
      const formattedLength =
        lengthM >= 1000
          ? `${(lengthM / 1000).toLocaleString("id-ID", { maximumFractionDigits: 2 })} km`
          : `${Math.round(lengthM).toLocaleString("id-ID")} m`;
      return {
        label: t("deviceList.summary.cableLength"),
        value: formattedLength,
        caption: t("deviceList.summary.cableLengthCaption", { count: coreTotal }),
        icon: Cable,
        tone: "slate" as const,
      };
    }

    if (normalizedType === "ONT") {
      const linked = summary.customerLinkedCount ?? 0;
      const unlinked = Math.max(0, summary.total - linked);
      return {
        label: t("deviceList.summary.customerLinked"),
        value: `${linked}/${summary.total}`,
        caption: t("deviceList.summary.customerLinkedCaption", { count: unlinked }),
        icon: Users,
        tone: "slate" as const,
      };
    }

    if (["RACK", "RECTIFIER"].includes(normalizedType)) {
      const active = summary.activeCount ?? 0;
      return {
        label: t("deviceList.summary.activeStatus"),
        value: `${active}/${summary.total}`,
        caption: t("deviceList.summary.activeStatusCaption", { count: active }),
        icon: ShieldCheck,
        tone: "slate" as const,
      };
    }

    const portUsage = formatPortUsage(portUsed, portTotal);
    const availablePorts = calculateAvailablePorts(portTotal, portUsed);
    return {
      label: t("deviceList.summary.port"),
      value: portUsage.label,
      caption: t("deviceList.summary.portCaption", { count: availablePorts }),
      icon: Server,
      tone: "slate" as const,
    };
  })();

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
      <OperationalKpiCard
        label={isOdp ? t("deviceList.summary.totalOdp") : t("deviceList.summary.totalDevice", { label: categoryLabel })}
        value={String(summary.total)}
        caption={isOdp ? t("deviceList.summary.totalOdpCaption") : t("deviceList.summary.totalDeviceCaption", { label: categoryLabel })}
        icon={Boxes}
        tone="blue"
      />

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

      <OperationalKpiCard
        label={specificMetric.label}
        value={specificMetric.value}
        caption={specificMetric.caption}
        icon={specificMetric.icon}
        tone={specificMetric.tone}
      />

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
