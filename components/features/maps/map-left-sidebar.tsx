"use client";

import * as React from "react";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Layers,
  MapPin,
  Activity,
  Navigation,
  Cable,
  ExternalLink,
  RotateCcw,
  Loader2,
  AlertTriangle,
  Radio,
  Filter,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Combobox } from "@/components/ui/combobox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { InlineLoader, ButtonLoader } from "@/components/shared/loading-icon";
import { useNominatimSearch, NominatimResult } from "@/hooks/use-nominatim-search";
import type { OsgmRouteResult } from "@/lib/api";
import type { MapDevice } from "./topology-map-canvas";
import { cn } from "@/lib/utils";

type Option = { value: string; label: string };

export type LayerToggles = {
  devices: boolean;
  labels: boolean;
  cables: boolean;
  connections: boolean;
  poi: boolean;
};

type MapLeftSidebarProps = {
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
  cutMode: "none" | "connection" | "cable";
  onCutModeChange: (v: "none" | "connection" | "cable") => void;
  cutTarget: string;
  onCutTargetChange: (v: string) => void;
  cutTargetOptions: Option[];
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
  devicesWithoutCoords?: MapDevice[];
  // Nominatim Search callback
  onSelectSearchResult?: (result: NominatimResult) => void;
  onClearSearchResult?: () => void;
  // Layer Toggles
  layerToggles: LayerToggles;
  onToggleLayer: (key: keyof LayerToggles) => void;
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
  className,
}: MapLeftSidebarProps) {
  const [activeTab, setActiveTab] = React.useState<"overview" | "osrm" | "fibercut">("overview");
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [filterOpen, setFilterOpen] = React.useState(false);

  const activeFilterCount = React.useMemo(
    () =>
      [regionFilter, projectFilter, popFilter, tenantFilter, deviceType].filter(
        (v) => v && v !== "__all__" && v !== "all",
      ).length,
    [regionFilter, projectFilter, popFilter, tenantFilter, deviceType],
  );

  // Nominatim Search
  const { query, setQuery, results, loading: searchLoading, selected, setSelected, clearSelection } = useNominatimSearch();
  const [showResults, setShowResults] = React.useState(true);

  // Device Search inside Filter Topology
  const [deviceSearch, setDeviceSearch] = React.useState("");
  const [showDeviceResults, setShowDeviceResults] = React.useState(false);

  const filteredDevices = React.useMemo(() => {
    const q = deviceSearch.trim().toLowerCase();
    if (q.length < 2) return [];
    return devices
      .filter(
        (d) =>
          (d.device_name?.toLowerCase().includes(q) ||
            d.device_id?.toLowerCase().includes(q) ||
            d.device_type_key?.toLowerCase().includes(q)) &&
          Number.isFinite(Number(d.longitude)) &&
          Number.isFinite(Number(d.latitude)),
      )
      .slice(0, 20);
  }, [devices, deviceSearch]);

  const handleDeviceClick = React.useCallback(
    (device: MapDevice) => {
      onSelectSearchResult?.({
        place_id: Number(device.id) || Date.now(),
        lat: Number(device.latitude),
        lon: Number(device.longitude),
        display_name: `${device.device_name || device.device_id} (${device.device_type_key || "ASSET"})`,
        short_name: device.device_name || device.device_id || "Device",
        type: "device",
        class: "device",
      });
      setDeviceSearch(device.device_name || device.device_id || "");
      setShowDeviceResults(false);
    },
    [onSelectSearchResult],
  );

  const handleResetSearch = React.useCallback(() => {
    clearSelection();
    setShowResults(false);
    onClearSearchResult?.();
  }, [clearSelection, onClearSearchResult]);

  // Handle direct coordinate entry or result click
  const handleSearchResultClick = React.useCallback(
    (res: NominatimResult) => {
      setSelected(res);
      onSelectSearchResult?.(res);
      setQuery(res.short_name);
      setShowResults(false);
    },
    [onSelectSearchResult, setSelected, setQuery],
  );

  const handleSearchKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const coords = parseCoordinateInput(query);
        if (coords) {
          const customResult: NominatimResult = {
            place_id: Date.now(),
            lat: coords.lat,
            lon: coords.lng,
            display_name: `Koordinat: ${coords.lat}, ${coords.lng}`,
            short_name: `Koordinat (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`,
            type: "coordinate",
            class: "coordinate",
          };
          handleSearchResultClick(customResult);
        } else if (results.length > 0) {
          handleSearchResultClick(results[0]);
        }
      }
    },
    [handleSearchResultClick, query, results],
  );

  const deviceOptions = React.useMemo(() => {
    return devices
      .filter((d) => Number.isFinite(Number(d.longitude)) && Number.isFinite(Number(d.latitude)))
      .map((d) => ({
        value: d.id,
        label: `${d.device_name || d.device_id || "Device"} (${d.device_type_key || "ASSET"})`,
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
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] font-semibold">Tools Peta</span>
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
              {/* SECTION 1: SEARCH LOKASI (Nominatim) — Collapsible Double-Bezel */}
              <Collapsible open={searchOpen} onOpenChange={setSearchOpen}>
                <div className="rounded-xl border border-border/40 bg-muted/10 p-1 shadow-2xs dark:bg-white/[0.01]">
                  <div className="rounded-[calc(0.75rem-0.125rem)] border border-border/60 bg-card/80 shadow-xs glass-inset">
                    <CollapsibleTrigger className="flex w-full items-center justify-between px-2.5 py-2 hover:no-underline">
                      <div className="flex items-center gap-1.5">
                        <Search className="size-3.5 text-primary" />
                        <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground font-semibold">
                          Search Lokasi
                        </span>
                        <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-primary/70">(Geocoding)</span>
                      </div>
                      <ChevronRight
                        className={cn(
                          "size-3.5 text-muted-foreground transition-transform duration-200 ease-[cubic-bezier(0.32,0.72,0,1)]",
                          searchOpen && "rotate-90",
                        )}
                      />
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="px-2.5 pb-2.5 space-y-1.5">
                        <div className="relative">
                          <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                          <Input
                            type="text"
                            value={query}
                            onChange={(e) => {
                              setQuery(e.target.value);
                              setShowResults(true);
                            }}
                            onKeyDown={handleSearchKeyDown}
                            placeholder="Cari jalan, kota, atau koordinat (lat,lng)..."
                            className="h-8 rounded-full pl-8 pr-8 font-mono text-[11px]"
                          />
                          {searchLoading && <Loader2 className="absolute right-2.5 top-2.5 size-3.5 animate-spin text-primary" />}
                        </div>

                        {/* Selected Location Reset Badge */}
                        {selected && (
                          <div className="flex items-center justify-between rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[10px] font-medium text-primary">
                            <span className="font-mono text-[9px] uppercase tracking-[0.12em] truncate mr-2">
                              {selected.short_name}
                            </span>
                            <button
                              type="button"
                              onClick={handleResetSearch}
                              className="size-4 rounded-full flex items-center justify-center hover:bg-primary/20 transition-colors active:scale-95 shrink-0"
                              title="Hapus Pencarian"
                            >
                              <X className="size-3" />
                            </button>
                          </div>
                        )}

                        {showResults && results.length > 0 && (
                          <ScrollArea className="max-h-48 rounded-xl border border-border/60 bg-card p-1 shadow-md">
                            <div className="space-y-1 pr-1.5">
                              {results.map((res) => (
                                <button
                                  key={res.place_id}
                                  type="button"
                                  onClick={() => handleSearchResultClick(res)}
                                  className="w-full text-left rounded-lg p-2 hover:bg-muted transition-colors text-xs space-y-0.5"
                                >
                                  <p className="font-medium text-foreground truncate">{res.short_name}</p>
                                  <p className="font-mono text-[9px] text-muted-foreground truncate">{res.display_name}</p>
                                </button>
                              ))}
                            </div>
                          </ScrollArea>
                        )}
                      </div>
                    </CollapsibleContent>
                  </div>
                </div>
              </Collapsible>

              {/* SECTION 2: FILTER TOPOLOGI — Collapsible Double-Bezel */}
              <Collapsible open={filterOpen} onOpenChange={setFilterOpen}>
                <div className="rounded-xl border border-border/40 bg-muted/10 p-1 shadow-2xs dark:bg-white/[0.01]">
                  <div className="rounded-[calc(0.75rem-0.125rem)] border border-border/60 bg-card/80 shadow-xs glass-inset">
                    <CollapsibleTrigger className="flex w-full items-center justify-between px-2.5 py-2 hover:no-underline">
                      <div className="flex items-center gap-1.5">
                        <Filter className="size-3.5 text-primary" />
                        <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground font-semibold">
                          Filter Topologi
                        </span>
                        {activeFilterCount > 0 && (
                          <span className="inline-flex items-center justify-center rounded-full bg-primary/15 px-1.5 py-0.5 font-mono text-[8px] font-semibold tabular-nums text-primary">
                            {activeFilterCount}
                          </span>
                        )}
                      </div>
                      <ChevronRight
                        className={cn(
                          "size-3.5 text-muted-foreground transition-transform duration-200 ease-[cubic-bezier(0.32,0.72,0,1)]",
                          filterOpen && "rotate-90",
                        )}
                      />
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="px-2.5 pb-2.5 space-y-1.5">
                        {/* Device Search Bar */}
                        <div className="relative">
                          <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                          <Input
                            type="text"
                            value={deviceSearch}
                            onChange={(e) => {
                              setDeviceSearch(e.target.value);
                              setShowDeviceResults(true);
                            }}
                            placeholder="Cari nama / ID device..."
                            className="h-8 rounded-full pl-8 pr-8 font-mono text-[11px]"
                          />
                          {deviceSearch && (
                            <button
                              type="button"
                              onClick={() => {
                                setDeviceSearch("");
                                setShowDeviceResults(false);
                              }}
                              className="absolute right-2.5 top-2.5 size-3.5 text-muted-foreground hover:text-foreground"
                            >
                              <X className="size-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Device Search Autocomplete Results */}
                        {showDeviceResults && filteredDevices.length > 0 && (
                          <ScrollArea className="max-h-48 rounded-xl border border-border/60 bg-card p-1 shadow-md">
                            <div className="space-y-1 pr-1.5">
                              {filteredDevices.map((d) => (
                                <button
                                  key={d.id}
                                  type="button"
                                  onClick={() => handleDeviceClick(d)}
                                  className="w-full text-left rounded-lg p-2 hover:bg-muted transition-colors text-xs space-y-0.5"
                                >
                                  <p className="font-medium text-foreground truncate">
                                    {d.device_name || d.device_id}
                                  </p>
                                  <div className="flex items-center gap-2 font-mono text-[9px] text-muted-foreground">
                                    <span className="uppercase text-primary/80">{d.device_type_key || "ASSET"}</span>
                                    <span>•</span>
                                    <span>{d.id}</span>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </ScrollArea>
                        )}

                        <Combobox
                          value={regionFilter}
                          onValueChange={(val) => onRegionChange(val || "__all__")}
                          options={regionOptions}
                          placeholder="Region"
                          searchPlaceholder="Cari region..."
                        />
                        <Combobox
                          value={projectFilter}
                          onValueChange={(val) => onProjectChange(val || "__all__")}
                          options={projectOptions}
                          placeholder="Project"
                          searchPlaceholder="Cari project..."
                        />
                        <Combobox
                          value={popFilter}
                          onValueChange={(val) => onPopChange(val || "__all__")}
                          options={popOptions}
                          placeholder="Point of Presence (POP)"
                          searchPlaceholder="Cari POP..."
                        />
                        <Combobox
                          value={tenantFilter}
                          onValueChange={(val) => onTenantChange(val || "__all__")}
                          options={tenantOptions}
                          placeholder="Tenant"
                          searchPlaceholder="Cari tenant..."
                        />
                        <Combobox
                          value={deviceType}
                          onValueChange={(val) => onDeviceTypeChange(val || "all")}
                          options={deviceTypeOptions}
                          placeholder="Tipe device"
                        />
                      </div>
                    </CollapsibleContent>
                  </div>
                </div>
              </Collapsible>

              {/* SECTION 3: TABS INSPECTION (Overview / Navigasi / Fiber Cut) */}
              <div className="space-y-2 pt-1 border-t border-border/40">
                {/* Tab Navigation Pill Bar */}
                <div className="flex items-center justify-between gap-1 rounded-full border border-border/60 bg-muted/20 p-1">
                  <button
                    type="button"
                    onClick={() => setActiveTab("overview")}
                    className={cn(
                      "flex-1 rounded-full py-1 text-center font-mono text-[9px] uppercase tracking-[0.1em] transition-all duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]",
                      activeTab === "overview"
                        ? "bg-background text-foreground font-semibold shadow-2xs"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Activity className="inline-block size-3 mr-1" />
                    Overview
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("osrm")}
                    className={cn(
                      "flex-1 rounded-full py-1 text-center font-mono text-[9px] uppercase tracking-[0.1em] transition-all duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]",
                      activeTab === "osrm"
                        ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Navigation className="inline-block size-3 mr-1" />
                    Navigasi
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("fibercut")}
                    className={cn(
                      "flex-1 rounded-full py-1 text-center font-mono text-[9px] uppercase tracking-[0.1em] transition-all duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]",
                      activeTab === "fibercut"
                        ? "bg-destructive text-destructive-foreground font-semibold shadow-2xs"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Cable className="inline-block size-3 mr-1" />
                    Fiber Cut
                  </button>
                </div>

                {/* TAB 1: OVERVIEW */}
                {activeTab === "overview" && (
                  <div className="space-y-2 text-xs">
                    <div className="rounded-xl border border-border/60 bg-muted/20 p-2.5 space-y-1.5">
                      <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground block">
                        Data Quality Status
                      </span>
                      <div className="flex items-center justify-between font-mono tabular-nums text-xs">
                        <span>Koordinat Valid:</span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          {devices.length - devicesWithoutCoords.length} / {devices.length}
                        </span>
                      </div>
                    </div>

                    {devicesWithoutCoords.length > 0 && (
                      <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-2.5 dark:border-amber-900/40 dark:bg-amber-950/20 space-y-1">
                        <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300 font-medium">
                          <AlertTriangle className="size-3.5" />
                          <span>{devicesWithoutCoords.length} Device Tanpa Koordinat</span>
                        </div>
                        <p className="text-[11px] text-amber-700 dark:text-amber-400">
                          Beberapa device belum memiliki bujur &amp; lintang.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 2: OSRM ROAD NAVIGATION */}
                {activeTab === "osrm" && (
                  <div className="space-y-2.5 text-xs">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">
                          Origin (Titik Asal)
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-5 rounded-full px-2 font-mono text-[9px] uppercase tracking-[0.1em]"
                          onClick={onSetOriginFromGps}
                          disabled={isGpsLoading}
                        >
                          {isGpsLoading ? <ButtonLoader className="mr-1 size-3" /> : <MapPin className="mr-1 size-3 text-primary" />}
                          GPS Saya
                        </Button>
                      </div>
                      <div className="rounded-xl border border-border/60 bg-muted/20 px-2.5 py-1.5 font-mono text-xs flex items-center gap-2">
                        <span className="size-2 rounded-full bg-blue-500 animate-ping" />
                        <span className="truncate font-medium">{originName}</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">
                        Destination (Device Tujuan)
                      </span>
                      <Combobox
                        value={selectedDestination?.id || ""}
                        onValueChange={(val) => {
                          const dev = devices.find((d) => d.id === val);
                          if (dev) onSelectDestinationDevice(dev);
                        }}
                        options={deviceOptions}
                        placeholder="Pilih device..."
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
                      <div className="rounded-xl border border-red-200 bg-red-50 p-2 text-red-700 text-[11px] dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
                        {routeError}
                      </div>
                    )}

                    {routeResult && (
                      <div className="space-y-2 pt-1 border-t border-border/60">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="rounded-xl border border-border/60 bg-muted/20 p-2 text-center">
                            <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground block">
                              Jarak Rute
                            </span>
                            <span className="font-mono text-base font-semibold tabular-nums text-primary">
                              {routeResult.distance_km} <span className="text-xs font-normal">km</span>
                            </span>
                          </div>
                          <div className="rounded-xl border border-border/60 bg-muted/20 p-2 text-center">
                            <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground block">
                              Estimasi Waktu
                            </span>
                            <span className="font-mono text-base font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                              {routeResult.duration_minutes} <span className="text-xs font-normal">menit</span>
                            </span>
                          </div>
                        </div>

                        {selectedDestination?.latitude && selectedDestination?.longitude && (
                          <div className="flex items-center gap-2">
                            <a
                              href={`https://www.google.com/maps/dir/?api=1&destination=${selectedDestination.latitude},${selectedDestination.longitude}`}
                              target="_blank"
                              rel="noreferrer"
                              className="flex-1 inline-flex items-center justify-center gap-1 rounded-full border border-border/60 bg-background py-1 font-mono text-[9px] uppercase tracking-[0.1em] transition-all hover:bg-muted active:scale-[0.98]"
                            >
                              <ExternalLink className="size-3 text-blue-500" />
                              Google Maps
                            </a>
                            <a
                              href={`https://waze.com/ul?ll=${selectedDestination.latitude},${selectedDestination.longitude}&navigate=yes`}
                              target="_blank"
                              rel="noreferrer"
                              className="flex-1 inline-flex items-center justify-center gap-1 rounded-full border border-border/60 bg-background py-1 font-mono text-[9px] uppercase tracking-[0.1em] transition-all hover:bg-muted active:scale-[0.98]"
                            >
                              <ExternalLink className="size-3 text-cyan-500" />
                              Waze
                            </a>
                          </div>
                        )}

                        {routeResult.steps.length > 0 && (
                          <Collapsible className="w-full">
                            <CollapsibleTrigger className="flex w-full items-center justify-between py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground hover:no-underline">
                              <span>Steps ({routeResult.steps.length})</span>
                              <ChevronRight className="size-3.5" />
                            </CollapsibleTrigger>
                            <CollapsibleContent className="pt-1">
                              <div className="max-h-36 overflow-y-auto space-y-1 pr-1 thin-scrollbar">
                                {routeResult.steps.map((step) => (
                                  <div
                                    key={step.index}
                                    className="flex items-start gap-1.5 rounded-lg border border-border/40 bg-muted/10 p-1.5 text-[11px]"
                                  >
                                    <span className="font-mono text-[9px] font-semibold text-muted-foreground bg-muted px-1 rounded">
                                      {step.index}
                                    </span>
                                    <div className="flex-1">
                                      <p className="font-medium text-foreground">{step.instruction}</p>
                                      <p className="font-mono text-[9px] text-muted-foreground tabular-nums">
                                        {step.distance_m}m ({Math.round(step.duration_s / 60)} min)
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
                  <div className="space-y-2 text-xs">
                    <div className="space-y-1">
                      <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground block">
                        Mode Simulasi Cut
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
                      <div className="space-y-1">
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
                      <div className="rounded-xl border border-red-200 bg-red-50/80 p-2.5 dark:border-red-900/40 dark:bg-red-950/30 space-y-1.5">
                        <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-red-800 dark:text-red-300 font-semibold block">
                          Impact Summary
                        </span>
                        <div className="grid grid-cols-2 gap-1.5 font-mono tabular-nums text-xs">
                          <div className="bg-background/80 rounded-lg p-1.5 border border-red-200/50">
                            <span className="text-[9px] text-muted-foreground block">Devices</span>
                            <span className="text-sm font-semibold text-red-600">{impactData.summary.affected_devices}</span>
                          </div>
                          <div className="bg-background/80 rounded-lg p-1.5 border border-red-200/50">
                            <span className="text-[9px] text-muted-foreground block">Customers</span>
                            <span className="text-sm font-semibold text-red-600">{impactData.summary.affected_customers}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* SECTION 4: LAYER TOGGLES */}
              <div className="space-y-2 pt-1 border-t border-border/40">
                <div className="flex items-center gap-1.5">
                  <Layers className="size-3.5 text-primary" />
                  <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground font-semibold">
                    Layer Toggles
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 font-mono text-[10px]">
                  <label className="flex items-center gap-2 rounded-lg border border-border/60 p-1.5 cursor-pointer hover:bg-muted/40 transition-colors">
                    <input
                      type="checkbox"
                      checked={layerToggles.devices}
                      onChange={() => onToggleLayer("devices")}
                      className="size-3.5 rounded accent-primary"
                    />
                    <span>Devices</span>
                  </label>
                  <label className="flex items-center gap-2 rounded-lg border border-border/60 p-1.5 cursor-pointer hover:bg-muted/40 transition-colors">
                    <input
                      type="checkbox"
                      checked={layerToggles.labels}
                      onChange={() => onToggleLayer("labels")}
                      className="size-3.5 rounded accent-primary"
                    />
                    <span>Label Nama</span>
                  </label>
                  <label className="flex items-center gap-2 rounded-lg border border-border/60 p-1.5 cursor-pointer hover:bg-muted/40 transition-colors">
                    <input
                      type="checkbox"
                      checked={layerToggles.cables}
                      onChange={() => onToggleLayer("cables")}
                      className="size-3.5 rounded accent-primary"
                    />
                    <span>Kabel Fiber</span>
                  </label>
                  <label className="flex items-center gap-2 rounded-lg border border-border/60 p-1.5 cursor-pointer hover:bg-muted/40 transition-colors">
                    <input
                      type="checkbox"
                      checked={layerToggles.connections}
                      onChange={() => onToggleLayer("connections")}
                      className="size-3.5 rounded accent-primary"
                    />
                    <span>Connections</span>
                  </label>
                  <label className="flex items-center gap-2 rounded-lg border border-border/60 p-1.5 cursor-pointer hover:bg-muted/40 transition-colors">
                    <input
                      type="checkbox"
                      checked={layerToggles.poi}
                      onChange={() => onToggleLayer("poi")}
                      className="size-3.5 rounded accent-primary"
                    />
                    <span>POI Overpass</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

function parseCoordinateInput(input: string): { lat: number; lng: number } | null {
  const clean = input.trim();
  const parts = clean.split(/[\s,]+/);
  if (parts.length === 2) {
    const lat = Number(parts[0]);
    const lng = Number(parts[1]);
    if (
      Number.isFinite(lat) &&
      Number.isFinite(lng) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180
    ) {
      return { lat, lng };
    }
  }
  return null;
}
