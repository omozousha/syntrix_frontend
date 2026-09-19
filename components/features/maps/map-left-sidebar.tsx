"use client";

import * as React from "react";
import {
  ChevronLeft,
  ChevronRight,
  Radio,
  Activity,
  Navigation,
  Cable,
  PieChart,
  Sliders,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { OsgmRouteResult } from "@/lib/api";
import type { MapDevice, MapRoute } from "./topology-map-canvas";
import type {
  HomepassedCalculationConfig,
  HomepassedCalculationResult,
} from "@/lib/gis/homepassed-calculator";
import { cn } from "@/lib/utils";

import {
  MapOverviewTab,
  MapNavigationTab,
  type CutMode,
  type FiberCutImpactData,
} from "./sidebar";
import type { LayerToggles } from "./map-floating-layers-control";

export type { LayerToggles };

type Option = { value: string; label: string };

export type MapTabType = "overview" | "homepassed" | "osrm" | "fibercut";

export type MapLeftSidebarProps = {
  isOpen: boolean;
  onToggleOpen: () => void;
  activeTab?: MapTabType;
  onActiveTabChange?: (tab: MapTabType) => void;
  // Network Assets & Quality
  devices: MapDevice[];
  routesCount?: number;
  connectionsCount?: number;
  devicesWithoutCoords?: MapDevice[];
  routesWithoutGeometry?: MapRoute[];
  connectionsWithoutGeometry?: unknown[];
  onSelectDevice?: (device: MapDevice) => void;
  // OSRM Props
  originName?: string;
  onSetOriginFromGps: () => void;
  isGpsLoading: boolean;
  onSelectDestinationDevice: (device: MapDevice) => void;
  selectedDestination?: MapDevice | null;
  onCalculateRoute: () => void;
  isRouteLoading: boolean;
  routeResult?: OsgmRouteResult | null;
  routeError?: string | null;
  onClearRoute: () => void;
  onPanToLocation?: (loc: { lat: number; lng: number }) => void;
  // Fiber Cut Props
  cutMode?: CutMode;
  onCutModeChange?: (v: CutMode) => void;
  cutTarget?: string;
  onCutTargetChange?: (v: string) => void;
  cutTargetOptions?: Option[];
  impactData?: FiberCutImpactData | null;
  // Homepassed Spatial Props
  homepassedEnabled?: boolean;
  onToggleHomepassedEnabled?: (v: boolean) => void;
  homepassedConfig?: HomepassedCalculationConfig;
  onHomepassedConfigChange?: (config: HomepassedCalculationConfig) => void;
  homepassedResult?: HomepassedCalculationResult | null;
  // Optional references
  pops?: Array<{ id?: string | null; pop_name?: string | null; pop_code?: string | null }>;
  regions?: Array<{ id?: string | null; region_name?: string | null; region_code?: string | null }>;
  className?: string;
};

export function MapLeftSidebar({
  isOpen,
  onToggleOpen,
  activeTab: controlledActiveTab,
  onActiveTabChange,
  devices,
  routesCount = 0,
  connectionsCount = 0,
  devicesWithoutCoords = [],
  routesWithoutGeometry = [],
  connectionsWithoutGeometry = [],
  onSelectDevice,
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
  onPanToLocation,
  pops = [],
  regions = [],
  className,
}: MapLeftSidebarProps) {
  const [internalActiveTab, setInternalActiveTab] = React.useState<MapTabType>("osrm");
  const activeTab = controlledActiveTab ?? internalActiveTab;
  const setActiveTab = React.useCallback(
    (tab: MapTabType) => {
      if (onActiveTabChange) onActiveTabChange(tab);
      else setInternalActiveTab(tab);
    },
    [onActiveTabChange],
  );

  const deviceOptions = React.useMemo(() => {
    return devices
      .filter(
        (d) =>
          Number.isFinite(Number(d.longitude)) &&
          Number.isFinite(Number(d.latitude)),
      )
      .map((d) => ({
        value: d.id,
        label: `${d.device_name || d.device_id || "Device"} (${
          d.device_type_key || "ASSET"
        })`,
      }));
  }, [devices]);

  const unvalidatedCount = React.useMemo(() => {
    return devices.filter((d) => d.marker_status !== "validated").length;
  }, [devices]);

  const totalAuditIssues =
    devicesWithoutCoords.length +
    unvalidatedCount +
    routesWithoutGeometry.length +
    connectionsWithoutGeometry.length;

  return (
    <>
      {/* Floating Toggle Button (Visible when sidebar is closed) */}
      {!isOpen && (
        <button
          type="button"
          onClick={onToggleOpen}
          className="absolute left-3 top-3 z-30 flex items-center gap-1.5 rounded-full border border-border/60 bg-card/90 px-3 py-2 text-xs shadow-md backdrop-blur-md transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-muted active:scale-[0.98] glass-inset"
          title="Buka Navigasi & Audit Peta"
        >
          <Navigation className="size-3.5 text-primary" />
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] font-semibold">
            Navigasi & Audit
          </span>
          {totalAuditIssues > 0 && (
            <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
          )}
        </button>
      )}

      {/* Main Left Sidebar Panel */}
      <aside
        className={cn(
          "absolute left-0 top-0 bottom-0 z-40 flex w-full sm:w-[350px] flex-col p-2 sm:p-3 transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] pointer-events-auto",
          isOpen ? "translate-x-0" : "-translate-x-full",
          className,
        )}
      >
        {/* Double-Bezel Container */}
        <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-border/40 bg-card/95 p-1.5 shadow-lg backdrop-blur-md dark:bg-white/[0.02] glass-inset">
          {/* Inner Content Shell */}
          <div className="flex h-full flex-col overflow-hidden rounded-[calc(1.25rem-0.25rem)] border border-border/60 bg-card p-3 shadow-xs glass-inset space-y-3">
            {/* Header Sidebar */}
            <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <Radio className="size-4 text-primary animate-pulse shrink-0" />
                <div className="min-w-0">
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] font-bold text-foreground block truncate">
                    Spatial Command
                  </span>
                  <span className="font-mono text-[8px] text-muted-foreground uppercase tracking-wider block">
                    Turn-by-Turn & Audit
                  </span>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onToggleOpen}
                className="size-7 rounded-full"
                title="Sembunyikan Sidebar"
              >
                <ChevronLeft className="size-4" />
              </Button>
            </div>

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 thin-scrollbar">
              {/* Option 1: 2-Pill Tab Bar (Navigasi vs Audit) */}
              <div
                role="tablist"
                aria-label="Tab Navigasi dan Audit"
                className="flex items-center gap-1 rounded-full border border-border/60 bg-muted/20 p-1"
              >
                <button
                  type="button"
                  role="tab"
                  id="tab-osrm"
                  aria-selected={activeTab === "osrm"}
                  aria-controls="tabpanel-osrm"
                  tabIndex={activeTab === "osrm" ? 0 : -1}
                  onClick={() => setActiveTab("osrm")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 rounded-full py-1.5 text-center font-mono text-[9px] uppercase tracking-[0.1em] transition-all duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]",
                    activeTab === "osrm"
                      ? "bg-background text-foreground font-bold shadow-2xs"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Navigation className="size-3 text-primary" />
                  <span>Navigasi</span>
                </button>

                <button
                  type="button"
                  role="tab"
                  id="tab-overview"
                  aria-selected={activeTab === "overview" || activeTab === "homepassed" || activeTab === "fibercut"}
                  aria-controls="tabpanel-overview"
                  tabIndex={activeTab === "overview" ? 0 : -1}
                  onClick={() => setActiveTab("overview")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 rounded-full py-1.5 text-center font-mono text-[9px] uppercase tracking-[0.1em] transition-all duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]",
                    activeTab === "overview"
                      ? "bg-background text-foreground font-bold shadow-2xs"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Activity className="size-3 text-amber-500" />
                  <span>Audit Data</span>
                  {totalAuditIssues > 0 && (
                    <Badge
                      variant="outline"
                      className="h-4 rounded-full px-1 font-mono text-[7px] font-bold border-amber-500/40 bg-amber-500/15 text-amber-600 dark:text-amber-400"
                    >
                      {totalAuditIssues}
                    </Badge>
                  )}
                </button>
              </div>

              {/* Informative banners if Omnibar selected Homepassed / Fibercut Studio */}
              {activeTab === "homepassed" && (
                <div className="rounded-xl border border-primary/40 bg-primary/5 p-2.5 space-y-1.5 text-xs">
                  <div className="flex items-center gap-1.5 text-primary font-bold">
                    <PieChart className="size-3.5" />
                    <span className="font-mono text-[9px] uppercase tracking-wider">Spatial Coverage Aktif</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-snug">
                    Kalkulator coverage dan fusi poligon homepassed sedang aktif di <strong>Bottom Studio</strong> di dasar peta.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab("overview")}
                    className="w-full h-6 rounded-md font-mono text-[8px] uppercase tracking-wider"
                  >
                    Buka Antrean Audit
                  </Button>
                </div>
              )}

              {activeTab === "fibercut" && (
                <div className="rounded-xl border border-rose-500/40 bg-rose-500/5 p-2.5 space-y-1.5 text-xs">
                  <div className="flex items-center gap-1.5 text-rose-500 font-bold">
                    <Cable className="size-3.5" />
                    <span className="font-mono text-[9px] uppercase tracking-wider">Simulasi Fiber Cut Aktif</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-snug">
                    Simulasi blast radius putus kabel sedang aktif di <strong>Bottom Studio</strong> di dasar peta.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab("overview")}
                    className="w-full h-6 rounded-md font-mono text-[8px] uppercase tracking-wider"
                  >
                    Buka Antrean Audit
                  </Button>
                </div>
              )}

              {/* Tab 1: Navigasi Turn-by-Turn OSRM */}
              {activeTab === "osrm" && (
                <div
                  role="tabpanel"
                  id="tabpanel-osrm"
                  aria-labelledby="tab-osrm"
                >
                  <MapNavigationTab
                    originName={originName}
                    onSetOriginFromGps={onSetOriginFromGps}
                    isGpsLoading={isGpsLoading}
                    onSelectDestinationDevice={onSelectDestinationDevice}
                    selectedDestination={selectedDestination}
                    onCalculateRoute={onCalculateRoute}
                    isRouteLoading={isRouteLoading}
                    routeResult={routeResult}
                    routeError={routeError}
                    onClearRoute={onClearRoute}
                    devices={devices}
                    deviceOptions={deviceOptions}
                    onPanToLocation={onPanToLocation}
                  />
                </div>
              )}

              {/* Tab 2: Audit Kualitas Geospasial & Antrean Isu */}
              {activeTab === "overview" && (
                <div
                  role="tabpanel"
                  id="tabpanel-overview"
                  aria-labelledby="tab-overview"
                >
                  <MapOverviewTab
                    devices={devices}
                    routesCount={routesCount}
                    connectionsCount={connectionsCount}
                    devicesWithoutCoords={devicesWithoutCoords}
                    routesWithoutGeometry={routesWithoutGeometry}
                    connectionsWithoutGeometry={connectionsWithoutGeometry}
                    onSelectDevice={onSelectDevice}
                    pops={pops}
                    regions={regions}
                  />
                </div>
              )}
            </div>

            {/* Sidebar Footer */}
            <div className="border-t border-border/60 pt-2 flex items-center justify-between text-[9px] font-mono text-muted-foreground">
              <span>Syntrix GIS v3.0</span>
              <span className="text-primary">OSRM & Quality Engine</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

// ponytail: streamlined 2-tab sidebar (Turn-by-turn navigation & Quick audit queue).
