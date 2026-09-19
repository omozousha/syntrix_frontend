"use client";

import * as React from "react";
import {
  Search,
  SlidersHorizontal,
  X,
  Radio,
  MapPin,
  Loader2,
  PieChart,
  Navigation,
  Cable,
  Check,
  RotateCcw,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Combobox } from "@/components/ui/combobox";
import { useNominatimSearch, type NominatimResult } from "@/hooks/use-nominatim-search";
import type { MapDevice } from "./topology-map-canvas";
import { cn } from "@/lib/utils";

type Option = { value: string; label: string };

export type MapMode = "overview" | "homepassed" | "osrm" | "fibercut";

export type TopMapOmnibarProps = {
  // Search
  devices: MapDevice[];
  onSelectDevice: (device: MapDevice) => void;
  onSelectLocation: (result: { lat: number; lng: number; label: string }) => void;
  onClearSearch?: () => void;
  isSearchActive?: boolean;
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
  onResetFilters: () => void;
  // Modes
  activeMode: MapMode;
  onModeChange: (mode: MapMode) => void;
  className?: string;
};

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

export function TopMapOmnibar({
  devices,
  onSelectDevice,
  onSelectLocation,
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
  onResetFilters,
  activeMode,
  onModeChange,
  onClearSearch,
  isSearchActive = false,
  className,
}: TopMapOmnibarProps) {
  const [query, setQuery] = React.useState("");
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Geocoding hook
  const {
    query: geoQuery,
    setQuery: setGeoQuery,
    results: geoResults,
    loading: geoLoading,
    clearSelection,
  } = useNominatimSearch();

  // Sync geocoding query with omnibar input
  React.useEffect(() => {
    setGeoQuery(query);
  }, [query, setGeoQuery]);

  // Global hotkey (Cmd+K or / to focus search)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === "k" && (e.metaKey || e.ctrlKey)) ||
        (e.key === "/" && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement))
      ) {
        e.preventDefault();
        inputRef.current?.focus();
        setIsSearchOpen(true);
      } else if (e.key === "Escape") {
        setIsSearchOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Filter devices in memory based on query
  const matchedDevices = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || q.length < 2) return [];
    return devices
      .filter((d) => {
        const name = (d.device_name || "").toLowerCase();
        const id = (d.device_id || d.id || "").toLowerCase();
        const type = (d.device_type_key || "").toLowerCase();
        return name.includes(q) || id.includes(q) || type.includes(q);
      })
      .slice(0, 8);
  }, [query, devices]);

  const parsedCoord = React.useMemo(() => parseCoordinateInput(query), [query]);

  // Active filters count
  const activeFilterCount = React.useMemo(() => {
    return [regionFilter, projectFilter, popFilter, tenantFilter, deviceType].filter(
      (v) => v && v !== "__all__" && v !== "all",
    ).length;
  }, [regionFilter, projectFilter, popFilter, tenantFilter, deviceType]);

  const handleSelectDeviceItem = (device: MapDevice) => {
    onSelectDevice(device);
    setQuery(device.device_name || device.device_id || "");
    setIsSearchOpen(false);
  };

  const handleSelectGeoItem = (geo: NominatimResult) => {
    onSelectLocation({
      lat: geo.lat,
      lng: geo.lon,
      label: geo.short_name || geo.display_name,
    });
    setQuery(geo.short_name || geo.display_name);
    setIsSearchOpen(false);
  };

  const handleSelectCoord = () => {
    if (!parsedCoord) return;
    onSelectLocation({
      lat: parsedCoord.lat,
      lng: parsedCoord.lng,
      label: `Koordinat: ${parsedCoord.lat}, ${parsedCoord.lng}`,
    });
    setIsSearchOpen(false);
  };

  const handleClearQuery = () => {
    setQuery("");
    clearSelection();
    onClearSearch?.();
    setIsSearchOpen(false);
    inputRef.current?.focus();
  };

  const hasResults =
    matchedDevices.length > 0 ||
    geoResults.length > 0 ||
    Boolean(parsedCoord) ||
    geoLoading;

  return (
    <div
      className={cn(
        "absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 max-w-[calc(100vw-1.5rem)] pointer-events-auto",
        className,
      )}
    >
      {/* Outer Double-Bezel Frame */}
      <div className="flex items-center gap-1.5 rounded-2xl border border-border/40 bg-card/90 p-1.5 shadow-2xl backdrop-blur-xl glass-inset">
        {/* Omnisearch Input with Dropdown Popover */}
        <div className="relative">
          <div className="relative flex items-center">
            <Search className="absolute left-2.5 size-3.5 text-muted-foreground pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setIsSearchOpen(true);
              }}
              onFocus={() => setIsSearchOpen(true)}
              placeholder="Cari ODP, ODC, POP, atau alamat..."
              className="h-8 w-48 sm:w-64 md:w-80 rounded-xl border border-border/60 bg-muted/20 pl-8 pr-14 text-xs text-foreground placeholder:text-muted-foreground/70 focus:border-primary/50 focus:bg-background/80 focus:outline-hidden focus:ring-1 focus:ring-primary/40 transition-all font-mono"
            />

            {/* Clear / Hotkey indicator */}
            <div className="absolute right-2 flex items-center gap-1">
              {query || isSearchActive ? (
                <button
                  type="button"
                  onClick={handleClearQuery}
                  aria-label="Bersihkan pencarian"
                  title="Bersihkan pencarian (Hapus pin / highlight)"
                  className="size-5 flex items-center justify-center rounded-full text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-all active:scale-95"
                >
                  <X className="size-3" />
                </button>
              ) : (
                <kbd className="hidden sm:inline-flex h-4 items-center justify-center rounded border border-border/60 bg-muted/40 px-1 font-mono text-[8px] font-semibold text-muted-foreground">
                  ⌘K
                </kbd>
              )}
            </div>
          </div>

          {/* Omnisearch Results Dropdown */}
          {isSearchOpen && query.trim().length >= 2 && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsSearchOpen(false)}
              />
              <div className="absolute left-0 top-full mt-1.5 w-72 sm:w-96 rounded-2xl border border-border/40 bg-card/95 p-2 shadow-2xl backdrop-blur-xl glass-inset z-50 max-h-80 overflow-y-auto thin-scrollbar animate-in fade-in zoom-in-95">
                {/* 1. Coordinate Match */}
                {parsedCoord && (
                  <div className="mb-2 pb-2 border-b border-border/40">
                    <button
                      type="button"
                      onClick={handleSelectCoord}
                      className="w-full flex items-center gap-2 rounded-xl border border-primary/40 bg-primary/10 p-2 text-left hover:bg-primary/20 transition-colors active:scale-[0.98]"
                    >
                      <MapPin className="size-4 text-primary shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-primary">
                          Pusatkan ke Koordinat GPS
                        </p>
                        <p className="font-mono text-[10px] tabular-nums text-primary/80">
                          {parsedCoord.lat}, {parsedCoord.lng}
                        </p>
                      </div>
                    </button>
                  </div>
                )}

                {/* 2. Matched Topology Devices */}
                {matchedDevices.length > 0 && (
                  <div className="mb-2">
                    <span className="font-mono text-[8px] font-bold uppercase tracking-[0.18em] text-muted-foreground px-2 py-1 block">
                      Perangkat Topologi ({matchedDevices.length})
                    </span>
                    <div className="space-y-1">
                      {matchedDevices.map((device) => (
                        <button
                          key={device.id}
                          type="button"
                          onClick={() => handleSelectDeviceItem(device)}
                          className="w-full flex items-center justify-between gap-2 rounded-xl p-2 text-left hover:bg-muted/50 transition-colors active:scale-[0.98]"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Radio className="size-3.5 text-primary shrink-0" />
                            <div className="min-w-0">
                              <p className="truncate text-xs font-semibold text-foreground">
                                {device.device_name || device.device_id}
                              </p>
                              <p className="font-mono text-[9px] text-muted-foreground">
                                {device.device_type_key || "DEVICE"} •{" "}
                                {Number(device.latitude).toFixed(4)}, {Number(device.longitude).toFixed(4)}
                              </p>
                            </div>
                          </div>
                          <span className="shrink-0 rounded-full bg-primary/10 border border-primary/20 px-1.5 py-0.5 font-mono text-[8px] font-semibold text-primary uppercase">
                            Pilih
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. Matched Geocoding Addresses */}
                {geoResults.length > 0 && (
                  <div>
                    <span className="font-mono text-[8px] font-bold uppercase tracking-[0.18em] text-muted-foreground px-2 py-1 block border-t border-border/30 pt-1.5">
                      Lokasi Geografis (OpenStreetMap)
                    </span>
                    <div className="space-y-1">
                      {geoResults.map((geo) => (
                        <button
                          key={geo.place_id}
                          type="button"
                          onClick={() => handleSelectGeoItem(geo)}
                          className="w-full flex items-center gap-2 rounded-xl p-2 text-left hover:bg-muted/50 transition-colors active:scale-[0.98]"
                        >
                          <MapPin className="size-3.5 text-rose-500 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-semibold text-foreground">
                              {geo.short_name || geo.display_name}
                            </p>
                            <p className="truncate font-mono text-[9px] text-muted-foreground">
                              {geo.display_name}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Loading or Empty */}
                {geoLoading && (
                  <div className="flex items-center justify-center gap-2 py-3 text-muted-foreground font-mono text-[10px]">
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Mencari lokasi geografis...</span>
                  </div>
                )}

                {!hasResults && !geoLoading && (
                  <div className="py-4 text-center font-mono text-[10px] text-muted-foreground">
                    Tidak ada perangkat atau lokasi yang cocok
                  </div>
                )}

                {isSearchActive && (
                  <div className="mt-2 pt-2 border-t border-border/40 flex items-center justify-between font-mono text-[9px]">
                    <span className="text-muted-foreground">Pencarian aktif di peta</span>
                    <button
                      type="button"
                      onClick={handleClearQuery}
                      className="text-destructive hover:underline flex items-center gap-1 font-semibold"
                    >
                      <X className="size-2.5" />
                      <span>Hapus Pin / Highlight</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Quick Filter Popover */}
        <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                "relative flex h-8 items-center gap-1.5 rounded-xl border px-2.5 font-mono text-[10px] font-semibold transition-all active:scale-[0.95]",
                activeFilterCount > 0
                  ? "border-primary/50 bg-primary/10 text-primary shadow-2xs"
                  : "border-border/60 bg-muted/20 text-muted-foreground hover:bg-muted/40 hover:text-foreground",
              )}
              title="Filter Topologi Jaringan"
            >
              <SlidersHorizontal className="size-3.5" />
              <span className="hidden sm:inline">Filter</span>
              {activeFilterCount > 0 && (
                <span className="flex size-4 items-center justify-center rounded-full bg-primary font-mono text-[8px] font-bold text-primary-foreground">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </PopoverTrigger>

          <PopoverContent
            align="center"
            side="bottom"
            sideOffset={8}
            className="w-80 rounded-2xl border border-border/40 bg-card/95 p-3 shadow-2xl backdrop-blur-xl glass-inset animate-in fade-in zoom-in-95"
          >
            <div className="flex items-center justify-between border-b border-border/40 pb-2 mb-2.5">
              <span className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-foreground">
                Filter Jaringan
              </span>
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={onResetFilters}
                  className="inline-flex items-center gap-1 font-mono text-[9px] text-rose-500 hover:underline"
                >
                  <RotateCcw className="size-2.5" />
                  <span>Reset</span>
                </button>
              )}
            </div>

            <div className="space-y-2">
              <div>
                <label className="font-mono text-[8px] uppercase tracking-wider text-muted-foreground block mb-1">
                  Region
                </label>
                <Combobox
                  value={regionFilter}
                  onValueChange={(val) => onRegionChange(val || "__all__")}
                  options={regionOptions}
                  placeholder="Semua Region"
                  className="w-full text-xs"
                />
              </div>

              <div>
                <label className="font-mono text-[8px] uppercase tracking-wider text-muted-foreground block mb-1">
                  Project
                </label>
                <Combobox
                  value={projectFilter}
                  onValueChange={(val) => onProjectChange(val || "__all__")}
                  options={projectOptions}
                  placeholder="Semua Project"
                  className="w-full text-xs"
                />
              </div>

              <div>
                <label className="font-mono text-[8px] uppercase tracking-wider text-muted-foreground block mb-1">
                  POP Induk
                </label>
                <Combobox
                  value={popFilter}
                  onValueChange={(val) => onPopChange(val || "__all__")}
                  options={popOptions}
                  placeholder="Semua POP"
                  className="w-full text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-mono text-[8px] uppercase tracking-wider text-muted-foreground block mb-1">
                    Tenant
                  </label>
                  <Combobox
                    value={tenantFilter}
                    onValueChange={(val) => onTenantChange(val || "__all__")}
                    options={tenantOptions}
                    placeholder="Semua"
                    className="w-full text-xs"
                  />
                </div>
                <div>
                  <label className="font-mono text-[8px] uppercase tracking-wider text-muted-foreground block mb-1">
                    Tipe
                  </label>
                  <Combobox
                    value={deviceType}
                    onValueChange={(val) => onDeviceTypeChange(val || "all")}
                    options={deviceTypeOptions}
                    placeholder="Semua"
                    className="w-full text-xs"
                  />
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Separator */}
        <div className="h-5 w-px bg-border/40" />

        {/* Mode Switcher Segmented Pills */}
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => onModeChange("overview")}
            className={cn(
              "flex h-8 items-center gap-1 rounded-xl px-2.5 font-mono text-[10px] font-semibold transition-all active:scale-[0.95]",
              activeMode === "overview"
                ? "bg-foreground text-background shadow-xs font-bold"
                : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
            )}
            title="Mode Peta Standar"
          >
            <span>Peta</span>
          </button>

          <button
            type="button"
            onClick={() => onModeChange("homepassed")}
            className={cn(
              "flex h-8 items-center gap-1 rounded-xl px-2.5 font-mono text-[10px] font-semibold transition-all active:scale-[0.95]",
              activeMode === "homepassed"
                ? "border border-cyan-500/50 bg-cyan-500/15 text-cyan-500 shadow-[0_0_12px_rgba(6,182,212,0.25)] font-bold"
                : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
            )}
            title="Analisis Homepassed GIS"
          >
            <PieChart className="size-3 text-cyan-500" />
            <span className="hidden md:inline">Coverage</span>
          </button>

          <button
            type="button"
            onClick={() => onModeChange("osrm")}
            className={cn(
              "flex h-8 items-center gap-1 rounded-xl px-2.5 font-mono text-[10px] font-semibold transition-all active:scale-[0.95]",
              activeMode === "osrm"
                ? "border border-primary/50 bg-primary/15 text-primary shadow-xs font-bold"
                : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
            )}
            title="Navigasi Rute Jalan OSRM"
          >
            <Navigation className="size-3 text-primary" />
            <span className="hidden md:inline">Rute</span>
          </button>

          <button
            type="button"
            onClick={() => onModeChange("fibercut")}
            className={cn(
              "flex h-8 items-center gap-1 rounded-xl px-2.5 font-mono text-[10px] font-semibold transition-all active:scale-[0.95]",
              activeMode === "fibercut"
                ? "border border-rose-500/50 bg-rose-500/15 text-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.25)] font-bold"
                : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
            )}
            title="Simulasi Putus Serat Fiber Cut"
          >
            <Cable className="size-3 text-rose-500" />
            <span className="hidden md:inline">Fiber Cut</span>
          </button>
        </div>
      </div>
    </div>
  );
}
