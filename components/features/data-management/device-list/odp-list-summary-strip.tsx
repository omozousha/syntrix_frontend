"use client";

import type { OdpListSummary } from "@/lib/types/odp-summary";
import { OperationalKpiCard } from "@/components/operational-ui";
import { formatValidationRate, calculateAvailablePorts, formatPortUsage } from "@/lib/formatters/odp-stats";
import { Boxes, CheckSquare, MapPin, Server } from "lucide-react";

interface OdpListSummaryStripProps {
  summary: OdpListSummary | null;
  popCount?: number;
  loading?: boolean;
}

export function OdpListSummaryStrip({ summary, popCount, loading }: OdpListSummaryStripProps) {
  if (loading || !summary) {
    return (
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-2xl border border-border/60 bg-card p-3 shadow-xs">
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
        label="Total ODP"
        value={String(summary.total)}
        caption="Device ODP dalam filter aktif"
        icon={Boxes}
        tone="blue"
      />
      
      {/* Validation Progress */}
      <OperationalKpiCard
        label="Validasi"
        value={validationStats.rate ?? "--"}
        caption={`${summary.validated} tervalidasi dari ${summary.total} total`}
        icon={CheckSquare}
        tone={validationStats.isHigh ? "emerald" : "amber"}
      />
      
      {/* Port Availability */}
      <OperationalKpiCard
        label="Port"
        value={portUsage.label}
        caption={`${availablePorts} port tersedia`}
        icon={Server}
        tone="slate"
      />
      
      {/* POP Coverage */}
      <OperationalKpiCard
        label="POP Coverage"
        value={String(actualPopCount)}
        caption={`${actualPopCount} POP dalam scope aktif`}
        icon={MapPin}
        tone="emerald"
      />
    </div>
  );
}
