"use client";

import * as React from "react";
import {
  Navigation,
  Cable,
  Activity,
  MapPin,
  ExternalLink,
  ChevronRight,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Combobox } from "@/components/ui/combobox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { InlineLoader, ButtonLoader } from "@/components/shared/loading-icon";
import { OsgmRouteResult } from "@/lib/api";
import { MapDevice } from "./topology-map-canvas";
import { cn } from "@/lib/utils";

type MapInspectionDrawerProps = {
  devices: MapDevice[];
  // OSRM Props
  originName?: string;
  destinationName?: string;
  onSetOriginFromGps: () => void;
  isGpsLoading: boolean;
  onSelectDestinationDevice: (device: MapDevice) => void;
  selectedDestination?: MapDevice | null;
  onCalculateRoute: () => void;
  isRouteLoading: boolean;
  routeResult?: OsgmRouteResult | null;
  routeError?: string | null;
  onClearRoute: () => void;
  // Fiber Cut Props
  cutMode: "none" | "connection" | "cable";
  onCutModeChange: (v: "none" | "connection" | "cable") => void;
  cutTarget: string;
  onCutTargetChange: (v: string) => void;
  cutTargetOptions: Array<{ value: string; label: string }>;
  impactData?: {
    active: boolean;
    summary: {
      cut_connections: number;
      affected_devices: number;
      affected_connections: number;
      affected_routes: number;
      affected_customers: number;
      affected_onts: number;
    };
    warnings?: string[];
  } | null;
  // Issues
  devicesWithoutCoords?: MapDevice[];
  className?: string;
};

export function MapInspectionDrawer({
  devices,
  originName = "Lokasi GPS Saya",
  onSetOriginFromGps,
  isGpsLoading,
  onSelectDestinationDevice,
  selectedDestination,
  onCalculateRoute,
  isRouteLoading,
  routeResult,
  routeError,
  onClearRoute,
  cutMode,
  onCutModeChange,
  cutTarget,
  onCutTargetChange,
  cutTargetOptions,
  impactData,
  devicesWithoutCoords = [],
  className,
}: MapInspectionDrawerProps) {
  const [activeTab, setActiveTab] = React.useState<"overview" | "osrm" | "fibercut">("overview");

  const deviceOptions = React.useMemo(() => {
    return devices
      .filter((d) => Number.isFinite(Number(d.longitude)) && Number.isFinite(Number(d.latitude)))
      .map((d) => ({
        value: d.id,
        label: `${d.device_name || d.device_id || "Device"} (${d.device_type_key || "ASSET"})`,
      }));
  }, [devices]);

  return (
    <div className={cn("w-full lg:w-96 flex flex-col space-y-3", className)}>
      {/* Outer Double-Bezel Card */}
      <div className="rounded-2xl border border-border/40 bg-muted/10 p-1.5 shadow-xs backdrop-blur-md dark:bg-white/[0.02] glass-inset">
        {/* Inner Content Shell */}
        <div className="rounded-[calc(1.25rem-0.25rem)] border border-border/60 bg-card p-3 shadow-xs glass-inset space-y-3">

          {/* Tab Navigation Pill Bar */}
          <div className="flex items-center justify-between gap-1 rounded-full border border-border/60 bg-muted/20 p-1">
            <button
              type="button"
              onClick={() => setActiveTab("overview")}
              className={cn(
                "flex-1 rounded-full py-1.5 text-center font-mono text-[9px] uppercase tracking-[0.12em] transition-all duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]",
                activeTab === "overview"
                  ? "bg-background text-foreground font-semibold shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Activity className="inline-block size-3 mr-1" />
              Overview
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("osrm")}
              className={cn(
                "flex-1 rounded-full py-1.5 text-center font-mono text-[9px] uppercase tracking-[0.12em] transition-all duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]",
                activeTab === "osrm"
                  ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Navigation className="inline-block size-3 mr-1" />
              Navigasi
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("fibercut")}
              className={cn(
                "flex-1 rounded-full py-1.5 text-center font-mono text-[9px] uppercase tracking-[0.12em] transition-all duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]",
                activeTab === "fibercut"
                  ? "bg-destructive text-destructive-foreground font-semibold shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Cable className="inline-block size-3 mr-1" />
              Fiber Cut
            </button>
          </div>

          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-3 text-xs">
              <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-2">
                <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground block">
                  Data Quality Status
                </span>
                <div className="flex items-center justify-between font-mono tabular-nums text-xs">
                  <span>Device dengan koordinat valid:</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {devices.length - devicesWithoutCoords.length} / {devices.length}
                  </span>
                </div>
              </div>

              {devicesWithoutCoords.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-900/40 dark:bg-amber-950/20 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300 font-medium">
                    <AlertTriangle className="size-3.5" />
                    <span>{devicesWithoutCoords.length} Device Tanpa Koordinat</span>
                  </div>
                  <p className="text-[11px] text-amber-700 dark:text-amber-400">
                    Beberapa device belum memiliki data bujur &amp; lintang untuk dipetakan.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: OSRM ROAD NAVIGATION */}
          {activeTab === "osrm" && (
            <div className="space-y-3 text-xs">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">
                    Titik Asal (Origin)
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-6 rounded-full px-2 font-mono text-[9px] uppercase tracking-[0.1em]"
                    onClick={onSetOriginFromGps}
                    disabled={isGpsLoading}
                  >
                    {isGpsLoading ? <ButtonLoader className="mr-1 size-3" /> : <MapPin className="mr-1 size-3 text-primary" />}
                    Gunakan GPS
                  </Button>
                </div>
                <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2 font-mono text-xs flex items-center gap-2">
                  <span className="size-2 rounded-full bg-blue-500 animate-ping" />
                  <span className="truncate font-medium">{originName}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">
                  Device Tujuan (Destination)
                </span>
                <Combobox
                  value={selectedDestination?.id || ""}
                  onValueChange={(val) => {
                    const dev = devices.find((d) => d.id === val);
                    if (dev) onSelectDestinationDevice(dev);
                  }}
                  options={deviceOptions}
                  placeholder="Pilih device tujuan..."
                  searchPlaceholder="Cari device..."
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <Button
                  type="button"
                  onClick={onCalculateRoute}
                  disabled={!selectedDestination || isRouteLoading}
                  className="flex-1 rounded-full font-mono text-[10px] uppercase tracking-[0.12em] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
                >
                  {isRouteLoading ? <ButtonLoader className="mr-1.5" /> : <Navigation className="mr-1.5 size-3.5" />}
                  Hitung Rute OSRM
                </Button>
                {routeResult && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={onClearRoute}
                    className="rounded-full size-8 shrink-0"
                    title="Reset Rute"
                  >
                    <RotateCcw className="size-3.5" />
                  </Button>
                )}
              </div>

              {routeError && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-2.5 text-red-700 text-[11px] dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
                  {routeError}
                </div>
              )}

              {routeResult && (
                <div className="space-y-2.5 pt-2 border-t border-border/60">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl border border-border/60 bg-muted/20 p-2.5 text-center">
                      <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground block">
                        Jarak Rute
                      </span>
                      <span className="font-mono text-base font-semibold tabular-nums text-primary">
                        {routeResult.distance_km} <span className="text-xs font-normal">km</span>
                      </span>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-muted/20 p-2.5 text-center">
                      <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground block">
                        Estimasi Waktu
                      </span>
                      <span className="font-mono text-base font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                        {routeResult.duration_minutes} <span className="text-xs font-normal">menit</span>
                      </span>
                    </div>
                  </div>

                  {/* External Map Deep Links */}
                  {selectedDestination?.latitude && selectedDestination?.longitude && (
                    <div className="flex items-center gap-2">
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${selectedDestination.latitude},${selectedDestination.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full border border-border/60 bg-background py-1.5 font-mono text-[9px] uppercase tracking-[0.1em] transition-all hover:bg-muted active:scale-[0.98]"
                      >
                        <ExternalLink className="size-3 text-blue-500" />
                        Google Maps
                      </a>
                      <a
                        href={`https://waze.com/ul?ll=${selectedDestination.latitude},${selectedDestination.longitude}&navigate=yes`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full border border-border/60 bg-background py-1.5 font-mono text-[9px] uppercase tracking-[0.1em] transition-all hover:bg-muted active:scale-[0.98]"
                      >
                        <ExternalLink className="size-3 text-cyan-500" />
                        Waze
                      </a>
                    </div>
                  )}

                  {/* Turn by Turn Steps Collapsible */}
                  {routeResult.steps.length > 0 && (
                    <Collapsible className="w-full">
                      <CollapsibleTrigger className="flex w-full items-center justify-between py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground hover:no-underline">
                        <span>Petunjuk Arah Jalan ({routeResult.steps.length} Langkah)</span>
                        <ChevronRight className="size-3.5" />
                      </CollapsibleTrigger>
                      <CollapsibleContent className="pt-2">
                        <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 thin-scrollbar">
                          {routeResult.steps.map((step) => (
                            <div
                              key={step.index}
                              className="flex items-start gap-2 rounded-lg border border-border/40 bg-muted/10 p-2 text-[11px]"
                            >
                              <span className="font-mono text-[9px] font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                {step.index}
                              </span>
                              <div className="flex-1">
                                <p className="font-medium text-foreground">{step.instruction}</p>
                                <p className="font-mono text-[9px] text-muted-foreground tabular-nums">
                                  {step.distance_m} meter ({Math.round(step.duration_s / 60)} min)
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: FIBER CUT SIMULATOR */}
          {activeTab === "fibercut" && (
            <div className="space-y-3 text-xs">
              <div className="space-y-2">
                <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground block">
                  Mode Simulasi Putus Kabel
                </span>
                <Combobox
                  value={cutMode}
                  onValueChange={(val) => onCutModeChange(val as any)}
                  options={[
                    { value: "none", label: "Tanpa Simulasi Cut" },
                    { value: "connection", label: "Simulasi Per Connection" },
                    { value: "cable", label: "Simulasi Per Cable" },
                  ]}
                  placeholder="Pilih mode..."
                />
              </div>

              {cutMode !== "none" && (
                <div className="space-y-2">
                  <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground block">
                    Target {cutMode === "cable" ? "Cable" : "Connection"}
                  </span>
                  <Combobox
                    value={cutTarget}
                    onValueChange={onCutTargetChange}
                    options={cutTargetOptions}
                    placeholder={`Pilih ${cutMode}...`}
                  />
                </div>
              )}

              {impactData?.active && (
                <div className="rounded-xl border border-red-200 bg-red-50/80 p-3 dark:border-red-900/40 dark:bg-red-950/30 space-y-2">
                  <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-red-800 dark:text-red-300 font-semibold block">
                    Fiber Cut Impact Summary
                  </span>
                  <div className="grid grid-cols-2 gap-2 font-mono tabular-nums text-xs">
                    <div className="bg-background/80 rounded-lg p-2 border border-red-200/50">
                      <span className="text-[10px] text-muted-foreground block">Device Impacted</span>
                      <span className="text-sm font-semibold text-red-600">{impactData.summary.affected_devices}</span>
                    </div>
                    <div className="bg-background/80 rounded-lg p-2 border border-red-200/50">
                      <span className="text-[10px] text-muted-foreground block">Customers Impacted</span>
                      <span className="text-sm font-semibold text-red-600">{impactData.summary.affected_customers}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
