"use client";

import { useState } from "react";
import { Layers, Cpu, Network, UserCheck, Copy, Check, GitCommit } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTranslate } from "@/lib/use-locale";

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
  // Spesifikasi khusus per tipe:
  managementIp?: string | null;
  vlan?: string | null;
  closureTypeName?: string | null;
  trayCount?: number | string | null;
  cableLengthM?: number | string | null;
  cableType?: string | null;
  routeType?: string | null;
  customerName?: string | null;
  customerNumber?: string | null;
  uHeight?: string | null;
  feederPortCount?: number | string | null;
  operationalStatus?: string | null;
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
  deviceTypeKey = "DEVICE",
  managementIp,
  vlan,
  closureTypeName,
  trayCount,
  cableLengthM,
  cableType,
  routeType,
  customerName,
  customerNumber,
  uHeight,
  feederPortCount,
  operationalStatus,
}: DeviceBentoCapacityTileProps) {
  const { t } = useTranslate();
  const [copiedIp, setCopiedIp] = useState(false);
  const dtk = (deviceTypeKey || "DEVICE").toUpperCase();

  const totPorts = Number(totalPorts || 0);
  const uPorts = Number(usedPorts || 0);
  const idlePorts = Math.max(0, totPorts - uPorts);
  const portUtilPercent = totPorts > 0 ? Math.min(100, Math.round((uPorts / totPorts) * 100)) : 0;

  const totCores = Number(capacityCore || 0);
  const uCores = Number(usedCore || 0);
  const idleCores = Math.max(0, totCores - uCores);
  const coreUtilPercent = totCores > 0 ? Math.min(100, Math.round((uCores / totCores) * 100)) : 0;

  function handleCopyIp(ip: string) {
    navigator.clipboard.writeText(ip);
    setCopiedIp(true);
    setTimeout(() => setCopiedIp(false), 2000);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. JOINT CLOSURE (JC) — Murni Splicing Core (Tanpa Port)
  // ─────────────────────────────────────────────────────────────────────────────
  if (dtk === "JC") {
    return (
      <Card className="flex flex-col justify-between rounded-2xl border-border/60 shadow-xs glass-inset transition-all duration-300">
        <CardContent className="p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <Network className="size-4 text-sky-500" />
              <span>{t("deviceDetail.capacity.jcSplicingCapacity")}</span>
            </div>
            <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">JC SPECS</span>
          </div>

          {/* Splicing Core Capacity Meter */}
          <div className="rounded-xl border border-border/50 bg-muted/20 p-3 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{t("deviceDetail.capacity.coreSplicing")}</span>
              <span className="font-mono tabular-nums text-xs font-semibold text-foreground">
                <span className="text-sky-500">{uCores}</span> / {totCores} core ({coreUtilPercent}%)
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted/60 border border-border/40">
              <div className="h-full rounded-full bg-sky-500 transition-all duration-500" style={{ width: `${coreUtilPercent}%` }} />
            </div>
            <div className="flex items-center justify-between font-mono text-[9px] text-muted-foreground pt-0.5">
              <span>{t("deviceDetail.capacity.available", { count: idleCores })}</span>
              <span>{t("deviceDetail.capacity.connected", { count: uCores })}</span>
            </div>
          </div>

          {/* JC Specs Grid */}
          <div className="mt-5 grid grid-cols-2 gap-2 border-t border-border/40 pt-4 text-xs">
            <div className="space-y-0.5">
              <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{t("deviceDetail.capacity.closureType")}</p>
              <p className="truncate font-semibold text-foreground" title={closureTypeName || t("deviceDetail.capacity.closureBoxDefault")}>
                {closureTypeName || t("deviceDetail.capacity.closureBoxDefault")}
              </p>
            </div>
            <div className="space-y-0.5">
              <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{t("deviceDetail.capacity.trayCount")}</p>
              <p className="truncate font-mono tabular-nums font-semibold text-foreground">
                {trayCount ? `${trayCount} ${t("deviceDetail.capacity.tray")}` : "-"}
              </p>
            </div>
            <div className="space-y-0.5">
              <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{t("deviceDetail.capacity.installationEnv")}</p>
              <p className="truncate font-semibold text-foreground" title={installationType || t("deviceDetail.capacity.aerialDefault")}>
                {installationType || t("deviceDetail.capacity.aerialDefault")}
              </p>
            </div>
            <div className="space-y-0.5">
              <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Brand / Vendor</p>
              <p className="truncate font-semibold text-foreground" title={brandName || manufacturerName || "-"}>
                {[brandName, manufacturerName].filter(Boolean).join(" · ") || "-"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. CABLE — Bentangan Kabel Fiber (Tanpa Port)
  // ─────────────────────────────────────────────────────────────────────────────
  if (dtk === "CABLE") {
    return (
      <Card className="flex flex-col justify-between rounded-2xl border-border/60 shadow-xs glass-inset transition-all duration-300">
        <CardContent className="p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <GitCommit className="size-4 text-violet-500" />
              <span>{t("deviceDetail.capacity.fiberCableSpan")}</span>
            </div>
            <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">CABLE SPECS</span>
          </div>

          {/* Core Capacity Meter */}
          <div className="rounded-xl border border-border/50 bg-muted/20 p-3 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{t("deviceDetail.capacity.coreFiber")}</span>
              <span className="font-mono tabular-nums text-xs font-semibold text-foreground">
                <span className="text-violet-500">{uCores}</span> / {totCores} core ({coreUtilPercent}%)
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted/60 border border-border/40">
              <div className="h-full rounded-full bg-violet-500 transition-all duration-500" style={{ width: `${coreUtilPercent}%` }} />
            </div>
            <div className="flex items-center justify-between font-mono text-[9px] text-muted-foreground pt-0.5">
              <span>{t("deviceDetail.capacity.idle", { count: idleCores })}</span>
              <span>{t("deviceDetail.capacity.used", { count: uCores })}</span>
            </div>
          </div>

          {/* Cable Specs Grid */}
          <div className="mt-5 grid grid-cols-2 gap-2 border-t border-border/40 pt-4 text-xs">
            <div className="space-y-0.5">
              <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{t("deviceDetail.capacity.spanLength")}</p>
              <p className="truncate font-mono tabular-nums font-semibold text-foreground">
                {cableLengthM ? `${cableLengthM} ${t("deviceDetail.capacity.meter")}` : "-"}
              </p>
            </div>
            <div className="space-y-0.5">
              <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{t("deviceDetail.capacity.cableType")}</p>
              <p className="truncate font-semibold text-foreground" title={cableType || "-"}>
                {cableType || "-"}
              </p>
            </div>
            <div className="space-y-0.5">
              <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{t("deviceDetail.capacity.routeCategory")}</p>
              <p className="truncate font-semibold text-foreground" title={routeType || "-"}>
                {routeType || "-"}
              </p>
            </div>
            <div className="space-y-0.5">
              <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Brand / Vendor</p>
              <p className="truncate font-semibold text-foreground" title={brandName || manufacturerName || "-"}>
                {[brandName, manufacturerName].filter(Boolean).join(" · ") || "-"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. OLT (Optical Line Terminal) — Headend Active Ports & IP Management
  // ─────────────────────────────────────────────────────────────────────────────
  if (dtk === "OLT") {
    const ponPorts = totPorts || 16;
    const uplinkPorts = Number(feederPortCount) || 4;

    return (
      <Card className="flex flex-col justify-between rounded-2xl border-border/60 shadow-xs glass-inset transition-all duration-300">
        <CardContent className="p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <Cpu className="size-4 text-amber-500" />
              <span>{t("deviceDetail.capacity.headendActiveDevice")}</span>
            </div>
            <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">OLT SPECS</span>
          </div>

          {/* Active Ports Breakdown */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-border/50 bg-muted/20 p-3 space-y-1">
              <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">PON Ports</p>
              <p className="font-mono tabular-nums text-lg font-bold text-foreground">{ponPorts}</p>
              <p className="text-[10px] text-muted-foreground">GPON / EPON</p>
            </div>
            <div className="rounded-xl border border-border/50 bg-muted/20 p-3 space-y-1">
              <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Uplink Ports</p>
              <p className="font-mono tabular-nums text-lg font-bold text-foreground">{uplinkPorts}</p>
              <p className="text-[10px] text-muted-foreground">1G / 10G SFP+</p>
            </div>
          </div>

          {/* OLT Hardware & Network Details */}
          <div className="mt-5 grid grid-cols-2 gap-2 border-t border-border/40 pt-4 text-xs">
            <div className="space-y-0.5 col-span-2 sm:col-span-1">
              <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Management IP</p>
              {managementIp ? (
                <div className="flex items-center gap-1.5">
                  <span className="font-mono tabular-nums font-semibold text-foreground">{managementIp}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-4 rounded-md p-0"
                    onClick={() => handleCopyIp(managementIp)}
                    title={t("deviceDetail.capacity.copyIp")}
                  >
                    {copiedIp ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3 text-muted-foreground" />}
                  </Button>
                </div>
              ) : (
                <p className="font-mono text-muted-foreground">-</p>
              )}
            </div>
            <div className="space-y-0.5">
              <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">VLAN</p>
              <p className="font-mono tabular-nums font-semibold text-foreground">{vlan || "-"}</p>
            </div>
            <div className="space-y-0.5">
              <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Model / Vendor</p>
              <p className="truncate font-semibold text-foreground" title={[brandName, modelName].filter(Boolean).join(" · ") || "-"}>
                {[brandName, modelName].filter(Boolean).join(" · ") || "-"}
              </p>
            </div>
            <div className="space-y-0.5">
              <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Serial Number</p>
              <p className="truncate font-mono tabular-nums font-semibold text-foreground" title={serialNumber || "-"}>
                {serialNumber || "-"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. OTB (Optical Termination Box) — Core Termination & Rack Mount
  // ─────────────────────────────────────────────────────────────────────────────
  if (dtk === "OTB") {
    return (
      <Card className="flex flex-col justify-between rounded-2xl border-border/60 shadow-xs glass-inset transition-all duration-300">
        <CardContent className="p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <Layers className="size-4 text-emerald-500" />
              <span>{t("deviceDetail.capacity.otbCoreTermination")}</span>
            </div>
            <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">OTB SPECS</span>
          </div>

          {/* Core Termination Meter */}
          <div className="rounded-xl border border-border/50 bg-muted/20 p-3 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{t("deviceDetail.capacity.coreTermination")}</span>
              <span className="font-mono tabular-nums text-xs font-semibold text-foreground">
                <span className="text-emerald-500">{uCores}</span> / {totCores} core ({coreUtilPercent}%)
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted/60 border border-border/40">
              <div className="h-full rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${coreUtilPercent}%` }} />
            </div>
            <div className="flex items-center justify-between font-mono text-[9px] text-muted-foreground pt-0.5">
              <span>{t("deviceDetail.capacity.idle", { count: idleCores })}</span>
              <span>{t("deviceDetail.capacity.used", { count: uCores })}</span>
            </div>
          </div>

          {/* OTB Specs Grid */}
          <div className="mt-5 grid grid-cols-2 gap-2 border-t border-border/40 pt-4 text-xs">
            <div className="space-y-0.5">
              <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{t("deviceDetail.capacity.adapterType")}</p>
              <Badge variant="outline" className="font-mono text-[10px] uppercase">
                {odpType || "SC/UPC"}
              </Badge>
            </div>
            <div className="space-y-0.5">
              <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{t("deviceDetail.capacity.rackSize")}</p>
              <p className="truncate font-semibold text-foreground">
                {uHeight ? `${uHeight}${t("deviceDetail.capacity.unitSuffix")}` : `1${t("deviceDetail.capacity.unitSuffix")}`}
              </p>
            </div>
            <div className="space-y-0.5">
              <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Model / Vendor</p>
              <p className="truncate font-semibold text-foreground" title={[brandName, modelName].filter(Boolean).join(" · ") || "-"}>
                {[brandName, modelName].filter(Boolean).join(" · ") || "-"}
              </p>
            </div>
            <div className="space-y-0.5">
              <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Serial Number</p>
              <p className="truncate font-mono tabular-nums font-semibold text-foreground" title={serialNumber || "-"}>
                {serialNumber || "-"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. ONT (Optical Network Terminal) — CPE Pelanggan
  // ─────────────────────────────────────────────────────────────────────────────
  if (dtk === "ONT") {
    return (
      <Card className="flex flex-col justify-between rounded-2xl border-border/60 shadow-xs glass-inset transition-all duration-300">
        <CardContent className="p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <UserCheck className="size-4 text-sky-500" />
              <span>{t("deviceDetail.capacity.ontCustomerTerminal")}</span>
            </div>
            <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">ONT SPECS</span>
          </div>

          {/* Customer Reference Banner */}
          <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-3 space-y-1">
            <p className="font-mono text-[9px] uppercase tracking-widest text-sky-600 dark:text-sky-400 font-semibold">{t("deviceDetail.capacity.connectedCustomer")}</p>
            <p className="font-bold text-sm text-foreground truncate">{customerName || t("deviceDetail.capacity.noCustomerConnected")}</p>
            <p className="font-mono text-[10px] text-muted-foreground tabular-nums">CID: {customerNumber || "-"}</p>
          </div>

          {/* ONT Specs Grid */}
          <div className="mt-5 grid grid-cols-2 gap-2 border-t border-border/40 pt-4 text-xs">
            <div className="space-y-0.5">
              <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">GPON Serial Number</p>
              <p className="truncate font-mono tabular-nums font-semibold text-foreground" title={serialNumber || "-"}>
                {serialNumber || "-"}
              </p>
            </div>
            <div className="space-y-0.5">
              <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{t("deviceDetail.capacity.cpeStatus")}</p>
              <Badge variant="outline" className="font-mono text-[10px] uppercase border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                {operationalStatus || "Active"}
              </Badge>
            </div>
            <div className="space-y-0.5">
              <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Model / Tipe</p>
              <p className="truncate font-semibold text-foreground" title={modelName || "-"}>
                {modelName || "-"}
              </p>
            </div>
            <div className="space-y-0.5">
              <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Brand / Vendor</p>
              <p className="truncate font-semibold text-foreground" title={brandName || manufacturerName || "-"}>
                {[brandName, manufacturerName].filter(Boolean).join(" · ") || "-"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. ODP & ODC & DEFAULT — Kapasitas Port & Core Pasif
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <Card className="flex flex-col justify-between rounded-2xl border-border/60 shadow-xs glass-inset transition-all duration-300">
      <CardContent className="p-5 sm:p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
            <Layers className="size-4 text-emerald-500" />
            <span>{t("deviceDetail.capacity.capacityAndSpecs")}</span>
          </div>
          <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
            {dtk === "ODP" ? "ODP SPECS" : dtk === "ODC" ? "ODC SPECS" : "SPECS"}
          </span>
        </div>

        {/* Meters */}
        <div className="space-y-3">
          {/* Port Capacity Meter */}
          <div className="rounded-xl border border-border/50 bg-muted/20 p-3 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{t("deviceDetail.capacity.portStatus")}</span>
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
              <span>{t("deviceDetail.capacity.idle", { count: idlePorts })}</span>
              <span>{t("deviceDetail.capacity.used", { count: uPorts })}</span>
            </div>
          </div>

          {/* Core Capacity Meter (if device has core specs) */}
          {totCores > 0 ? (
            <div className="rounded-xl border border-border/50 bg-muted/20 p-3 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{t("deviceDetail.capacity.coreFiber")}</span>
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
              {splitterRatio ? t("deviceDetail.capacity.splitterRatio") : t("deviceDetail.capacity.mounting")}
            </p>
            <p className="truncate font-mono tabular-nums font-semibold text-foreground" title={splitterRatio ? `${t("deviceDetail.capacity.ratio")} ${splitterRatio}` : installationType || t("deviceDetail.capacity.poleWallDefault")}>
              {splitterRatio ? `${t("deviceDetail.capacity.ratio")} ${splitterRatio}` : installationType || t("deviceDetail.capacity.poleWallDefault")}
            </p>
          </div>

          <div className="space-y-0.5">
            <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Serial Number</p>
            <p className="truncate font-mono tabular-nums font-semibold text-foreground" title={serialNumber || "-"}>
              {serialNumber || "-"}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
