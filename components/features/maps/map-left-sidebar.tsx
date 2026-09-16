"use client";

import * as React from "react";
import {
  ChevronLeft,
  ChevronRight,
  Radio,
  Activity,
  PieChart,
  Navigation,
  Cable,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { NominatimResult } from "@/hooks/use-nominatim-search";
import type { OsgmRouteResult } from "@/lib/api";
import type { MapDevice } from "./topology-map-canvas";
import type {
  HomepassedCalculationConfig,
  HomepassedCalculationResult,
} from "@/lib/gis/homepassed-calculator";
import { cn } from "@/lib/utils";

import {
  MapSearchSection,
  MapFiltersSection,
  MapOverviewTab,
  MapCoverageTab,
  MapNavigationTab,
  MapFiberCutTab,
  MapLayersSection,
  type LayerToggles,
  type CutMode,
  type FiberCutImpactData,
} from "./sidebar";

export type { LayerToggles };

type Option = { value: string; label: string };

export type MapLeftSidebarProps = {
  isOpen: boolean;
  onToggleOpen: () => void;
  // Filters
  regionFilter: string;
  onRegionChange: (v: string) => void;
  regionOptions: Option[];
  projectFilter: string;
  onProjectChange: (v: string) => void;
  projectOptions: Option[];
  popFilter: string;
  onPopChange: (v: string) => void;
  popOptions: Option[];
  tenantFilter: string;
  onTenantChange: (v: string) => void;
  tenantOptions: Option[];
  deviceType: string;
  onDeviceTypeChange: (v: string) => void;
  deviceTypeOptions: Option[];
  // Devices & Inspection
  devices: MapDevice[];
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
  // Fiber Cut Props
  cutMode: CutMode;
  onCutModeChange: (v: CutMode) => void;
  cutTarget: string;
  onCutTargetChange: (v: string) => void;
  cutTargetOptions: Option[];
  impactData?: FiberCutImpactData | null;
  devicesWithoutCoords?: MapDevice[];
  // Nominatim Search callback
  onSelectSearchResult?: (result: NominatimResult) => void;
  onClearSearchResult?: () => void;
  // Layer Toggles
  layerToggles: LayerToggles;
  onToggleLayer: (key: keyof LayerToggles) => void;
  // Homepassed Spatial Props
  homepassedEnabled?: boolean;
  onToggleHomepassedEnabled?: (v: boolean) => void;
  homepassedConfig?: HomepassedCalculationConfig;
  onHomepassedConfigChange?: (config: HomepassedCalculationConfig) => void;
  homepassedResult?: HomepassedCalculationResult | null;
  className?: string;
};

export function MapLeftSidebar({
  isOpen,
  onToggleOpen,
  regionFilter,
  onRegionChange,
  regionOptions,
  projectFilter,
  onProjectChange,
  projectOptions,
  popFilter,
  onPopChange,
  popOptions,
  tenantFilter,
  onTenantChange,
  tenantOptions,
  deviceType,
  onDeviceTypeChange,
  deviceTypeOptions,
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
  onSelectSearchResult,
  onClearSearchResult,
  layerToggles,
  onToggleLayer,
  homepassedEnabled = false,
  onToggleHomepassedEnabled,
  homepassedConfig,
  onHomepassedConfigChange,
  homepassedResult,
  className,
}: MapLeftSidebarProps) {
  const [activeTab, setActiveTab] = React.useState<
    "overview" | "homepassed" | "osrm" | "fibercut"
  >("overview");
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [filterOpen, setFilterOpen] = React.useState(false);

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

  return (
    <>
      {/* Floating Toggle Button (Visible when closed) */}
      {!isOpen && (
        <button
          type="button"
          onClick={onToggleOpen}
          className="absolute left-3 top-3 z-30 flex items-center gap-1.5 rounded-full border border-border/60 bg-card/90 px-3 py-2 text-xs shadow-md backdrop-blur-md transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-muted active:scale-[0.98] glass-inset"
          title="Buka Tools Peta"
        >
          <ChevronRight className="size-4 text-primary" />
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] font-semibold">
            Tools Peta
          </span>
        </button>
      )}

      {/* Main Left Sidebar Panel */}
      <aside
        className={cn(
          "absolute left-0 top-0 bottom-0 z-30 flex w-full sm:w-[340px] flex-col p-2 sm:p-3 transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
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
              <div className="flex items-center gap-2">
                <Radio className="size-4 text-primary animate-pulse" />
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] font-semibold">
                  Syntrix Maps Tools
                </span>
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
            <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 thin-scrollbar">
              {/* SECTION 1: SEARCH LOKASI (Nominatim) */}
              <MapSearchSection
                isOpen={searchOpen}
                onOpenChange={setSearchOpen}
                onSelectSearchResult={onSelectSearchResult}
                onClearSearchResult={onClearSearchResult}
              />

              {/* SECTION 2: FILTER TOPOLOGI */}
              <MapFiltersSection
                isOpen={filterOpen}
                onOpenChange={setFilterOpen}
                regionFilter={regionFilter}
                onRegionChange={onRegionChange}
                regionOptions={regionOptions}
                projectFilter={projectFilter}
                onProjectChange={onProjectChange}
                projectOptions={projectOptions}
                popFilter={popFilter}
                onPopChange={onPopChange}
                popOptions={popOptions}
                tenantFilter={tenantFilter}
                onTenantChange={onTenantChange}
                tenantOptions={tenantOptions}
                deviceType={deviceType}
                onDeviceTypeChange={onDeviceTypeChange}
                deviceTypeOptions={deviceTypeOptions}
                devices={devices}
                onSelectSearchResult={onSelectSearchResult}
              />

              {/* SECTION 3: TABS INSPECTION */}
              <div className="space-y-2 pt-1 border-t border-border/40">
                {/* Tab Navigation Pill Bar */}
                <div
                  role="tablist"
                  aria-label="Tab fitur peta"
                  className="flex items-center justify-between gap-0.5 rounded-full border border-border/60 bg-muted/20 p-1"
                >
                  <button
                    type="button"
                    role="tab"
                    id="tab-overview"
                    aria-selected={activeTab === "overview"}
                    aria-controls="tabpanel-overview"
                    tabIndex={activeTab === "overview" ? 0 : -1}
                    onClick={() => setActiveTab("overview")}
                    className={cn(
                      "flex-1 rounded-full py-1 text-center font-mono text-[8px] uppercase tracking-[0.08em] transition-all duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]",
                      activeTab === "overview"
                        ? "bg-background text-foreground font-semibold shadow-2xs"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Activity className="inline-block size-3 mr-0.5" />
                    Overview
                  </button>
                  <button
                    type="button"
                    role="tab"
                    id="tab-homepassed"
                    aria-selected={activeTab === "homepassed"}
                    aria-controls="tabpanel-homepassed"
                    tabIndex={activeTab === "homepassed" ? 0 : -1}
                    onClick={() => setActiveTab("homepassed")}
                    className={cn(
                      "flex-1 rounded-full py-1 text-center font-mono text-[8px] uppercase tracking-[0.08em] transition-all duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]",
                      activeTab === "homepassed"
                        ? "bg-cyan-500 text-white font-semibold shadow-2xs"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <PieChart className="inline-block size-3 mr-0.5" />
                    Coverage
                  </button>
                  <button
                    type="button"
                    role="tab"
                    id="tab-osrm"
                    aria-selected={activeTab === "osrm"}
                    aria-controls="tabpanel-osrm"
                    tabIndex={activeTab === "osrm" ? 0 : -1}
                    onClick={() => setActiveTab("osrm")}
                    className={cn(
                      "flex-1 rounded-full py-1 text-center font-mono text-[8px] uppercase tracking-[0.08em] transition-all duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]",
                      activeTab === "osrm"
                        ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Navigation className="inline-block size-3 mr-0.5" />
                    Navigasi
                  </button>
                  <button
                    type="button"
                    role="tab"
                    id="tab-fibercut"
                    aria-selected={activeTab === "fibercut"}
                    aria-controls="tabpanel-fibercut"
                    tabIndex={activeTab === "fibercut" ? 0 : -1}
                    onClick={() => setActiveTab("fibercut")}
                    className={cn(
                      "flex-1 rounded-full py-1 text-center font-mono text-[8px] uppercase tracking-[0.08em] transition-all duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]",
                      activeTab === "fibercut"
                        ? "bg-destructive text-destructive-foreground font-semibold shadow-2xs"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Cable className="inline-block size-3 mr-0.5" />
                    Cut
                  </button>
                </div>

                {/* TAB 1: OVERVIEW */}
                {activeTab === "overview" && (
                  <div role="tabpanel" id="tabpanel-overview" aria-labelledby="tab-overview">
                    <MapOverviewTab
                      devices={devices}
                      devicesWithoutCoords={devicesWithoutCoords}
                    />
                  </div>
                )}

                {/* TAB 2: HOMEPASSED COVERAGE */}
                {activeTab === "homepassed" && (
                  <div role="tabpanel" id="tabpanel-homepassed" aria-labelledby="tab-homepassed">
                    <MapCoverageTab
                      homepassedEnabled={homepassedEnabled}
                      onToggleHomepassedEnabled={onToggleHomepassedEnabled}
                      homepassedConfig={homepassedConfig}
                      onHomepassedConfigChange={onHomepassedConfigChange}
                      homepassedResult={homepassedResult}
                      regionOptions={regionOptions}
                    />
                  </div>
                )}

                {/* TAB 3: OSRM ROAD NAVIGATION */}
                {activeTab === "osrm" && (
                  <div role="tabpanel" id="tabpanel-osrm" aria-labelledby="tab-osrm">
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
                    />
                  </div>
                )}

                {/* TAB 4: FIBER CUT SIMULATOR */}
                {activeTab === "fibercut" && (
                  <div role="tabpanel" id="tabpanel-fibercut" aria-labelledby="tab-fibercut">
                    <MapFiberCutTab
                      cutMode={cutMode}
                      onCutModeChange={onCutModeChange}
                      cutTarget={cutTarget}
                      onCutTargetChange={onCutTargetChange}
                      cutTargetOptions={cutTargetOptions}
                      impactData={impactData}
                    />
                  </div>
                )}
              </div>

              {/* SECTION 4: LAYER TOGGLES */}
              <MapLayersSection
                layerToggles={layerToggles}
                onToggleLayer={onToggleLayer}
              />
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
