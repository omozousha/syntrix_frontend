"use client";

import * as React from "react";
import { useState } from "react";
import {
  PieChart,
  Cable,
  Download,
  ChevronDown,
  ChevronUp,
  X,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Combobox } from "@/components/ui/combobox";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type {
  HomepassedCalculationConfig,
  HomepassedCalculationResult,
} from "@/lib/gis/homepassed-calculator";
import type { CutMode, FiberCutImpactData } from "./sidebar/map-fiber-cut-tab";

type Option = { value: string; label: string };

export interface BottomContextualStudioProps {
  mode: "homepassed" | "fibercut";
  onClose: () => void;
  // Homepassed props
  homepassedEnabled?: boolean;
  onToggleHomepassedEnabled?: (v: boolean) => void;
  homepassedConfig?: HomepassedCalculationConfig;
  onHomepassedConfigChange?: (config: HomepassedCalculationConfig) => void;
  homepassedResult?: HomepassedCalculationResult | null;
  regionOptions?: Option[];
  // Fiber cut props
  cutMode?: CutMode;
  onCutModeChange?: (mode: CutMode) => void;
  cutTarget?: string;
  onCutTargetChange?: (target: string) => void;
  cutTargetOptions?: Option[];
  impactData?: FiberCutImpactData | null;
}

export function BottomContextualStudio({
  mode,
  onClose,
  homepassedEnabled = false,
  onToggleHomepassedEnabled,
  homepassedConfig,
  onHomepassedConfigChange,
  homepassedResult,
  regionOptions = [],
  cutMode = "none",
  onCutModeChange,
  cutTarget = "",
  onCutTargetChange,
  cutTargetOptions = [],
  impactData,
}: BottomContextualStudioProps) {
  const [isMinimized, setIsMinimized] = useState(false);

  const handleDownloadGeoJson = () => {
    if (!homepassedResult?.mergedPolygonFeature) return;
    const dateStr = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(homepassedResult.mergedPolygonFeature, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `syntrix-homepassed-coverage-${dateStr}.geojson`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const isHomepassed = mode === "homepassed";

  // Minimized Bar Render
  if (isMinimized) {
    return (
      <div className="pointer-events-auto">
        <div className="rounded-full border border-border/40 bg-background/85 p-1 shadow-lg backdrop-blur-xl glass-inset dark:bg-background/60">
          <div className="flex items-center gap-2.5 rounded-full border border-border/60 bg-card/90 px-3.5 py-1.5 shadow-xs">
            <div className="flex items-center gap-2">
              {isHomepassed ? (
                <PieChart className="size-4 text-cyan-500" />
              ) : (
                <Cable className="size-4 text-red-500" />
              )}
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.14em]">
                {isHomepassed ? "Spatial Coverage" : "Fiber Cut Studio"}
              </span>
            </div>

            <div className="h-3 w-px bg-border/60" />

            {/* Micro Telemetry Pill */}
            {isHomepassed ? (
              <div className="flex items-center gap-2 font-mono text-[10px] tabular-nums text-muted-foreground">
                <span>
                  Luas: <strong className="text-foreground">{homepassedResult?.totalCoverageAreaKm2 || 0} km²</strong>
                </span>
                <span>•</span>
                <span>
                  HP:{" "}
                  <strong className="text-cyan-500">
                    {(homepassedResult?.exactHomepassedCount || homepassedResult?.estimatedHomepassedCount || 0).toLocaleString("id-ID")}
                  </strong>
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 font-mono text-[10px] tabular-nums text-muted-foreground">
                <span>
                  Dampak:{" "}
                  <strong className={impactData?.active ? "text-red-500" : "text-foreground"}>
                    {impactData?.summary.affected_devices || 0} Device / {impactData?.summary.affected_customers || 0} User
                  </strong>
                </span>
              </div>
            )}

            <div className="flex items-center gap-1 pl-1">
              <button
                type="button"
                onClick={() => setIsMinimized(false)}
                title="Perbesar Studio"
                className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <ChevronUp className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={onClose}
                title="Tutup Studio"
                className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Full Expanded Studio Render
  return (
    <div className="pointer-events-auto w-full">
      {/* Outer Bezel */}
      <div className="rounded-2xl border border-border/40 bg-background/85 p-1.5 shadow-2xl backdrop-blur-xl glass-inset dark:bg-background/60 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]">
        {/* Inner Bezel */}
        <div className="rounded-[calc(1rem-0.125rem)] border border-border/60 bg-card/95 p-3 shadow-xs space-y-3">
          {/* Header Bar */}
          <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
            <div className="flex items-center gap-2.5">
              <div
                className={cn(
                  "flex size-7 items-center justify-center rounded-lg border shadow-2xs",
                  isHomepassed
                    ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-500"
                    : "border-red-500/30 bg-red-500/10 text-red-500"
                )}
              >
                {isHomepassed ? <PieChart className="size-4" /> : <Cable className="size-4" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-foreground">
                    {isHomepassed ? "Spatial Coverage Studio" : "Fiber Cut Impact Simulator"}
                  </span>
                  {isHomepassed ? (
                    <Badge
                      variant="outline"
                      className={cn(
                        "h-4 rounded-full px-1.5 font-mono text-[8px] uppercase tracking-wider font-semibold",
                        homepassedEnabled
                          ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400"
                          : "border-border/60 text-muted-foreground"
                      )}
                    >
                      {homepassedEnabled ? "Active GIS" : "Disabled"}
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className={cn(
                        "h-4 rounded-full px-1.5 font-mono text-[8px] uppercase tracking-wider font-semibold",
                        impactData?.active
                          ? "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400 animate-pulse"
                          : "border-border/60 text-muted-foreground"
                      )}
                    >
                      {impactData?.active ? "Cut Simulated" : "No Cut"}
                    </Badge>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {isHomepassed
                    ? "Estimasi homepassed akurat berbasis radius buffer ODP, koridor kabel, dan data bangunan OpenStreetMap."
                    : "Analisis blast radius kegagalan jalur serat optik terhadap perangkat dan pelanggan terdampak."}
                </p>
              </div>
            </div>

            {/* Top Right Controls */}
            <div className="flex items-center gap-2">
              {isHomepassed && (
                <>
                  <div className="flex items-center gap-1.5 pr-2 border-r border-border/40">
                    <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                      GIS Aktif
                    </span>
                    <Switch
                      checked={homepassedEnabled}
                      onCheckedChange={onToggleHomepassedEnabled}
                      aria-label="Toggle Hitung Homepassed"
                    />
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 rounded-full px-2.5 font-mono text-[9px] uppercase tracking-wider shadow-2xs"
                    disabled={!homepassedResult?.mergedPolygonFeature}
                    onClick={handleDownloadGeoJson}
                  >
                    <Download className="mr-1 size-3 text-cyan-500" />
                    Export GeoJSON
                  </Button>
                </>
              )}

              <button
                type="button"
                onClick={() => setIsMinimized(true)}
                title="Kecilkan Studio"
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <ChevronDown className="size-4" />
              </button>
              <button
                type="button"
                onClick={onClose}
                title="Tutup Studio"
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          {/* Body Content */}
          {isHomepassed ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
              {/* Column 1: Parameters (5 Cols) */}
              <div className="md:col-span-5 space-y-2.5 border-b md:border-b-0 md:border-r border-border/40 pb-2 md:pb-0 md:pr-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground font-semibold flex items-center gap-1">
                    <Sliders className="size-3 text-primary" />
                    Parameter Radius
                  </span>
                  <div className="w-48">
                    <Combobox
                      value={homepassedConfig?.targetRegionId || "__all__"}
                      onValueChange={(val) =>
                        homepassedConfig &&
                        onHomepassedConfigChange?.({
                          ...homepassedConfig,
                          targetRegionId: val || "__all__",
                        })
                      }
                      options={[
                        { value: "__all__", label: "Semua Region (Global)" },
                        ...regionOptions.filter((r) => r.value !== "__all__"),
                      ]}
                      placeholder="Pilih Scope Region"
                    />
                  </div>
                </div>

                {homepassedConfig && (
                  <div className="space-y-2">
                    {/* ODP Radius Slider */}
                    <div className="rounded-xl border border-border/40 bg-muted/20 p-2 space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="font-mono text-[9px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={homepassedConfig.includeOdp}
                            onChange={(e) =>
                              onHomepassedConfigChange?.({
                                ...homepassedConfig,
                                includeOdp: e.target.checked,
                              })
                            }
                            className="rounded border-border/60 text-primary focus:ring-primary/20"
                          />
                          <span>Radius ODP Coverage</span>
                        </label>
                        <span className="font-mono tabular-nums text-xs font-bold text-primary">
                          {homepassedConfig.odpRadiusMeters}m
                        </span>
                      </div>
                      <input
                        type="range"
                        min={50}
                        max={500}
                        step={25}
                        disabled={!homepassedConfig.includeOdp}
                        value={homepassedConfig.odpRadiusMeters}
                        onChange={(e) =>
                          onHomepassedConfigChange?.({
                            ...homepassedConfig,
                            odpRadiusMeters: Number(e.target.value),
                          })
                        }
                        className="w-full accent-primary h-1.5 bg-muted rounded-lg cursor-pointer disabled:opacity-40"
                      />
                    </div>

                    {/* Cable Corridor Slider */}
                    <div className="rounded-xl border border-border/40 bg-muted/20 p-2 space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="font-mono text-[9px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={homepassedConfig.includeCables}
                            onChange={(e) =>
                              onHomepassedConfigChange?.({
                                ...homepassedConfig,
                                includeCables: e.target.checked,
                              })
                            }
                            className="rounded border-border/60 text-primary focus:ring-primary/20"
                          />
                          <span>Koridor Kabel (Backbone/Feeder)</span>
                        </label>
                        <span className="font-mono tabular-nums text-xs font-bold text-primary">
                          {homepassedConfig.cableRadiusMeters}m
                        </span>
                      </div>
                      <input
                        type="range"
                        min={50}
                        max={500}
                        step={25}
                        disabled={!homepassedConfig.includeCables}
                        value={homepassedConfig.cableRadiusMeters}
                        onChange={(e) =>
                          onHomepassedConfigChange?.({
                            ...homepassedConfig,
                            cableRadiusMeters: Number(e.target.value),
                          })
                        }
                        className="w-full accent-primary h-1.5 bg-muted rounded-lg cursor-pointer disabled:opacity-40"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Column 2: Live GIS Telemetry Metrics (4 Cols) */}
              <div className="md:col-span-4 space-y-2 border-b md:border-b-0 md:border-r border-border/40 pb-2 md:pb-0 md:pr-3">
                <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground font-semibold block">
                  Telemetri Cakupan Spasial
                </span>
                <div className="grid grid-cols-2 gap-2 font-mono tabular-nums">
                  <div className="rounded-xl border border-border/40 bg-muted/15 p-2.5">
                    <span className="text-[8px] uppercase tracking-wider text-muted-foreground block">
                      Luas Area Total
                    </span>
                    <span className="text-base font-bold text-foreground">
                      {homepassedResult?.totalCoverageAreaKm2 || 0}{" "}
                      <span className="text-[10px] font-normal text-muted-foreground">km²</span>
                    </span>
                  </div>

                  <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[8px] uppercase tracking-wider text-muted-foreground">
                        {homepassedResult && homepassedResult.exactHomepassedCount > 0
                          ? "Homepassed POI"
                          : "Est. Homepassed"}
                      </span>
                      <span
                        className={cn(
                          "rounded px-1 font-mono text-[7px] font-bold uppercase",
                          homepassedResult && homepassedResult.exactHomepassedCount > 0
                            ? "border border-emerald-500/30 bg-emerald-500/15 text-emerald-500"
                            : "border border-border/40 bg-muted/40 text-muted-foreground"
                        )}
                      >
                        {homepassedResult && homepassedResult.exactHomepassedCount > 0 ? "Exact POI" : "Fallback"}
                      </span>
                    </div>
                    <span className="text-base font-bold text-cyan-500 block mt-0.5">
                      {(homepassedResult
                        ? homepassedResult.exactHomepassedCount > 0
                          ? homepassedResult.exactHomepassedCount
                          : homepassedResult.estimatedHomepassedCount
                        : 0
                      ).toLocaleString("id-ID")}{" "}
                      <span className="text-[10px] font-normal text-muted-foreground">Unit</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-2.5 py-1.5 font-mono text-[10px]">
                  <span className="text-muted-foreground">Efisiensi Deduplikasi:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    +{homepassedResult?.overlapSavingsPercentage || 0}% Bebas Ganda
                  </span>
                </div>
              </div>

              {/* Column 3: GIS Intelligence / Notes (3 Cols) */}
              <div className="md:col-span-3 flex flex-col justify-between space-y-2">
                <div>
                  <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground font-semibold block mb-1">
                    Metodologi Spasial
                  </span>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    Kalkulasi menggunakan Turf.js union buffer berkecepatan tinggi dengan isolasi eksklusif tipe ODP, proteksi water-masking, dan fallback kapasitas port jika OSM POI kosong.
                  </p>
                </div>
                <div className="flex items-center gap-1 text-[9px] font-mono text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="size-3 shrink-0" />
                  <span>BBox Pre-filter terverifikasi aktif</span>
                </div>
              </div>
            </div>
          ) : (
            /* Fiber Cut Simulator Content */
            <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
              {/* Column 1: Cut Target Selection (4 Cols) */}
              <div className="md:col-span-4 space-y-2 border-b md:border-b-0 md:border-r border-border/40 pb-2 md:pb-0 md:pr-3">
                <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground font-semibold flex items-center gap-1">
                  <Cable className="size-3 text-red-500" />
                  Target Putus Serat
                </span>

                <div className="space-y-1.5">
                  <Combobox
                    value={cutMode}
                    onValueChange={(val) => onCutModeChange?.((val as CutMode) || "none")}
                    options={[
                      { value: "none", label: "Tanpa Simulasi Cut" },
                      { value: "connection", label: "Simulasi Per Connection" },
                      { value: "cable", label: "Simulasi Per Cable" },
                    ]}
                    placeholder="Pilih mode cut..."
                  />

                  {cutMode !== "none" && (
                    <Combobox
                      value={cutTarget}
                      onValueChange={(val) => onCutTargetChange?.(val)}
                      options={cutTargetOptions}
                      placeholder={`Pilih target ${cutMode}...`}
                    />
                  )}
                </div>
              </div>

              {/* Column 2: Blast Radius Metrics (5 Cols) */}
              <div className="md:col-span-5 space-y-2 border-b md:border-b-0 md:border-r border-border/40 pb-2 md:pb-0 md:pr-3">
                <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground font-semibold block">
                  Estimasi Blast Radius Dampak
                </span>

                <div className="grid grid-cols-4 gap-1.5 font-mono tabular-nums">
                  <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-2 text-center">
                    <span className="text-[8px] uppercase tracking-wider text-muted-foreground block">
                      Perangkat
                    </span>
                    <span className="text-sm font-bold text-red-600 dark:text-red-400">
                      {impactData?.summary.affected_devices || 0}
                    </span>
                  </div>

                  <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-2 text-center">
                    <span className="text-[8px] uppercase tracking-wider text-muted-foreground block">
                      Pelanggan
                    </span>
                    <span className="text-sm font-bold text-red-600 dark:text-red-400">
                      {impactData?.summary.affected_customers || 0}
                    </span>
                  </div>

                  <div className="rounded-xl border border-border/40 bg-muted/15 p-2 text-center">
                    <span className="text-[8px] uppercase tracking-wider text-muted-foreground block">
                      Koneksi
                    </span>
                    <span className="text-sm font-bold text-foreground">
                      {impactData?.summary.affected_connections || 0}
                    </span>
                  </div>

                  <div className="rounded-xl border border-border/40 bg-muted/15 p-2 text-center">
                    <span className="text-[8px] uppercase tracking-wider text-muted-foreground block">
                      Rute
                    </span>
                    <span className="text-sm font-bold text-foreground">
                      {impactData?.summary.affected_routes || 0}
                    </span>
                  </div>
                </div>
              </div>

              {/* Column 3: Warning & Status (3 Cols) */}
              <div className="md:col-span-3 flex flex-col justify-between space-y-2">
                <div>
                  <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground font-semibold block mb-1">
                    Status Jalur
                  </span>
                  {impactData?.active ? (
                    <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-2 text-[10px] text-red-600 dark:text-red-400 flex items-start gap-1.5">
                      <ShieldAlert className="size-4 shrink-0 mt-0.5" />
                      <span>Simulasi aktif: Jalur downstream terputus disorot merah pada peta.</span>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2 text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="size-4 shrink-0" />
                      <span>Semua jalur serat beroperasi normal tanpa simulasi gangguan.</span>
                    </div>
                  )}
                </div>

                {impactData?.warnings && impactData.warnings.length > 0 && (
                  <div className="flex items-center gap-1 text-[9px] font-mono text-amber-500">
                    <AlertTriangle className="size-3 shrink-0" />
                    <span>{impactData.warnings[0]}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ponytail: basic collapsible studio docked at bottom. Add timeline scrubber when real-time telemetry playback is required.
