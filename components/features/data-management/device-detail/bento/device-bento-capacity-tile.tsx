"use client";

import { HardDrive, Layers, Cpu, Server, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type DeviceBentoCapacityTileProps = {
  totalPorts?: number | string | null;
  usedPorts?: number | string | null;
  capacityCore?: number | string | null;
  usedCore?: number | string | null;
  splitterRatio?: string | null;
  odpType?: string | null;
  modelName?: string | null;
  brandName?: string | null;
  manufacturerName?: string | null;
  installationType?: string | null;
  serialNumber?: string | null;
  deviceTypeKey?: string | null;
};

export function DeviceBentoCapacityTile({
  totalPorts,
  usedPorts,
  capacityCore,
  usedCore,
  splitterRatio,
  odpType,
  modelName,
  brandName,
  manufacturerName,
  installationType,
  serialNumber,
  deviceTypeKey,
}: DeviceBentoCapacityTileProps) {
  const totPorts = Number(totalPorts || 0);
  const uPorts = Number(usedPorts || 0);
  const idlePorts = Math.max(0, totPorts - uPorts);
  const portUtilPercent = totPorts > 0 ? Math.min(100, Math.round((uPorts / totPorts) * 100)) : 0;

  const totCores = Number(capacityCore || 0);
  const uCores = Number(usedCore || 0);
  const idleCores = Math.max(0, totCores - uCores);
  const coreUtilPercent = totCores > 0 ? Math.min(100, Math.round((uCores / totCores) * 100)) : 0;

  return (
    <div className="flex flex-col justify-between rounded-2xl border border-border/60 bg-card p-5 sm:p-6 shadow-xs glass-inset transition-all duration-300">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
            <Layers className="size-4 text-emerald-500" />
            <span>Kapasitas &amp; Spesifikasi Aset</span>
          </div>
          <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Specs</span>
        </div>

        {/* Meters */}
        <div className="space-y-3">
          {/* Port Capacity Meter */}
          <div className="rounded-xl border border-border/50 bg-muted/20 p-3 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Port Status</span>
              <span className="font-mono tabular-nums text-xs font-semibold text-foreground">
                <span className="text-emerald-500">{uPorts}</span> / {totPorts} port ({portUtilPercent}%)
              </span>
            </div>
            {/* Progress bar */}
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted/60 border border-border/40">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${portUtilPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between font-mono text-[9px] text-muted-foreground pt-0.5">
              <span>{idlePorts} Idle</span>
              <span>{uPorts} Terpakai</span>
            </div>
          </div>

          {/* Core Capacity Meter (if device has core specs) */}
          {totCores > 0 ? (
            <div className="rounded-xl border border-border/50 bg-muted/20 p-3 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Core Fiber</span>
                <span className="font-mono tabular-nums text-xs font-semibold text-foreground">
                  <span className="text-sky-500">{uCores}</span> / {totCores} core ({coreUtilPercent}%)
                </span>
              </div>
              {/* Progress bar */}
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted/60 border border-border/40">
                <div
                  className="h-full rounded-full bg-sky-500 transition-all duration-500"
                  style={{ width: `${coreUtilPercent}%` }}
                />
              </div>
              <div className="flex items-center justify-between font-mono text-[9px] text-muted-foreground pt-0.5">
                <span>{idleCores} Idle</span>
                <span>{uCores} Terpakai</span>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Hardware Details Grid */}
      <div className="mt-5 grid grid-cols-2 gap-2 border-t border-border/40 pt-4 text-xs">
        <div className="space-y-0.5">
          <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Model / Tipe</p>
          <p className="truncate font-semibold text-foreground" title={modelName || odpType || "-"}>
            {modelName || odpType || "-"}
          </p>
        </div>

        <div className="space-y-0.5">
          <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Brand / Vendor</p>
          <p className="truncate font-semibold text-foreground" title={brandName || manufacturerName || "-"}>
            {[brandName, manufacturerName].filter(Boolean).join(" · ") || "-"}
          </p>
        </div>

        <div className="space-y-0.5">
          <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
            {splitterRatio ? "Splitter / Ratio" : "Mounting"}
          </p>
          <p className="truncate font-mono tabular-nums font-semibold text-foreground" title={splitterRatio || installationType || "-"}>
            {splitterRatio ? `Rasio ${splitterRatio}` : installationType || "Tiang / Wall"}
          </p>
        </div>

        <div className="space-y-0.5">
          <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Serial Number</p>
          <p className="truncate font-mono tabular-nums font-semibold text-foreground" title={serialNumber || "-"}>
            {serialNumber || "-"}
          </p>
        </div>
      </div>
    </div>
  );
}
