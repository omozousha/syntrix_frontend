"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import type { MapConnection, MapDevice, MapRoute } from "@/components/features/maps/topology-map-canvas";
import { AppLoading } from "@/components/app-loading-new";
import { useSession } from "@/components/session-context";
import { apiFetch, getReferenceData } from "@/lib/api";
import { useOsrmRouting } from "@/hooks/use-osrm-routing";
import { useOverpassPOI } from "@/hooks/use-overpass-poi";
import { MapStatusDock } from "@/components/features/maps/map-status-dock";
import { MapLeftSidebar, type LayerToggles } from "@/components/features/maps/map-left-sidebar";
import { MapFloatingMenu } from "@/components/features/maps/map-floating-menu";
import {
  calculateHomepassedCoverage,
  DEFAULT_HOMEPASSED_CONFIG,
  type HomepassedCalculationConfig,
} from "@/lib/gis/homepassed-calculator";
import type { NominatimResult } from "@/hooks/use-nominatim-search";
import { cn } from "@/lib/utils";
import { ChevronUp } from "lucide-react";
import { DeviceDetailCard } from "@/components/features/maps/cards/device-detail-card";
import { LocationDevicePickerCard } from "@/components/features/maps/cards/location-device-picker-card";

const GoogleMapsCanvas = dynamic(
  () =>
    import("@/components/features/maps/google-maps-canvas").then(
      (module) => module.GoogleMapsCanvas,
    ),
  { ssr: false, loading: () => <AppLoading label="Menyiapkan peta Google Maps & data..." /> },
);

type MapConnectionItem = MapConnection & {
  cable_device_id?: string | null;
  cable_device?: MapDevice | null;
  route?: MapRoute | null;
};

type FiberCutImpact = {
  active: boolean;
  summary: {
    cut_connections: number;
    affected_devices: number;
    affected_connections: number;
    affected_routes: number;
    affected_customers: number;
    affected_onts: number;
  };
  devices: MapDevice[];
  connections: MapConnectionItem[];
  warnings?: string[];
};

type TopologyMapsResponse = {
  data: {
    scope?: {
      role?: string | null;
      requested_region_id?: string | null;
      effective_region_ids?: string[] | null;
    };
    layers: {
      devices: { items: MapDevice[]; summary: { total: number; with_coordinates: number; without_coordinates: number } };
      routes: { items: MapRoute[]; summary: { total: number; with_geometry: number; without_geometry: number } };
      connections: { items: MapConnectionItem[]; summary: { total: number; with_geometry_context: number } };
      fiber_cut_impact: FiberCutImpact;
    };
    issues: {
      devices_without_coordinates: MapDevice[];
      routes_without_geometry: MapRoute[];
      connections_without_geometry_context: MapConnectionItem[];
    };
    meta: { generated_at?: string | null };
  };
};

type MapFilterOptionRow = Record<string, unknown> & {
  id?: string | null;
  region_id?: string | null;
};

type MapFilterOptions = {
  regions: MapFilterOptionRow[];
  projects: MapFilterOptionRow[];
  pops: MapFilterOptionRow[];
  tenants: MapFilterOptionRow[];
};

/**
 * Persistent Google Maps host.
 *
 * Lazy-mounts the full maps UI the first time the user visits `/maps`, then keeps
 * the map instance alive across all subsequent navigations (hidden via CSS instead
 * of unmounting). Prevents repeated Google Maps JS SDK loads and Dynamic Map
 * re-initialization that would otherwise burn the free quota on every page visit.
 *
 * @param visible - When true the map fills the parent content area; when false it
 *                  is hidden with `opacity-0 pointer-events-none` but stays mounted.
 */
export function MapsPersistentHost({ visible }: { visible: boolean }) {
  const [hasVisited, setHasVisited] = useState(false);

  useEffect(() => {
    if (visible) setHasVisited(true);
  }, [visible]);

  if (!hasVisited) return null;

  return <MapsHostContent visible={visible} />;
}

function MapsHostContent({ visible }: { visible: boolean }) {
  const { token, me } = useSession();
  const [data, setData] = useState<TopologyMapsResponse["data"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [inspectDevices, setInspectDevices] = useState<MapDevice[]>([]);
  const [locationGroupDevices, setLocationGroupDevices] = useState<MapDevice[] | null>(null);
  const [filterOptions, setFilterOptions] = useState<MapFilterOptions>({
    regions: [],
    projects: [],
    pops: [],
    tenants: [],
  });

  // Sidebar Open State
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Filters
  const [regionFilter, setRegionFilter] = useState("__all__");
  const [projectFilter, setProjectFilter] = useState("__all__");
  const [popFilter, setPopFilter] = useState("__all__");
  const [tenantFilter, setTenantFilter] = useState("__all__");
  const [deviceType, setDeviceType] = useState("all");

  // Fiber Cut State
  const [cutMode, setCutMode] = useState<"none" | "connection" | "cable">("none");
  const [cutTarget, setCutTarget] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  // Layer Toggles State (localStorage key scoped by user ID)
  const storageKey = me?.app_user?.id ? `syntrix_map_layer_toggles_${me.app_user.id}` : "syntrix_map_layer_toggles";
  const [layerToggles, setLayerToggles] = useState<LayerToggles>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = window.localStorage.getItem(storageKey);
        if (stored) {
          return JSON.parse(stored) as LayerToggles;
        }
      } catch {
        // Fallback default
      }
    }
    return {
      devices: false, // Default uncheck per request
      labels: false, // Device name labels off by default
      cables: true,
      connections: true,
      poi: false,
    };
  });

  // Homepassed GIS Coverage State
  const [homepassedEnabled, setHomepassedEnabled] = useState(false);
  const [homepassedConfig, setHomepassedConfig] = useState<HomepassedCalculationConfig>(DEFAULT_HOMEPASSED_CONFIG);

  // Status Dock Visibility (default hidden)
  const [dockVisible, setDockVisible] = useState(false);

  // Zen / Focus Mode state (Z hotkey)
  const [isZenMode, setIsZenMode] = useState(false);

  // Refs for Fullscreen (entire host) and Screenshot (map canvas area)
  const hostRef = useRef<HTMLDivElement>(null);
  const mapCanvasRef = useRef<HTMLDivElement>(null);

  // Nominatim Search Selection
  const [searchSelection, setSearchSelection] = useState<{ lat: number; lng: number; label: string } | null>(null);

  // OSRM Routing Hook
  const {
    origin,
    destination,
    setDestination,
    route,
    loading: isRouteLoading,
    error: routeError,
    gpsLoading: isGpsLoading,
    setOriginFromGps,
    calculateRoute,
    clearRoute,
  } = useOsrmRouting(token || "");

  // Overpass POI Hook
  const { poiMarkers, fetchPOI, clearPOI } = useOverpassPOI();

  const handleToggleLayer = useCallback((key: keyof LayerToggles) => {
    setLayerToggles((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      if (!next.poi) clearPOI();
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // Ignore storage errors
      }
      return next;
    });
  }, [clearPOI, storageKey]);

  // Load Filters
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    async function loadFilters() {
      try {
        const response = await getReferenceData(token, {
          groups: ["regions", "projects", "pops", "tenants"],
          limit: 500,
        });
        if (cancelled) return;
        setFilterOptions({
          regions: (response.data.regions || []) as MapFilterOptionRow[],
          projects: (response.data.projects || []) as MapFilterOptionRow[],
          pops: (response.data.pops || []) as MapFilterOptionRow[],
          tenants: (response.data.tenants || []) as MapFilterOptionRow[],
        });
      } catch {
        if (!cancelled) setFilterOptions({ regions: [], projects: [], pops: [], tenants: [] });
      }
    }
    void loadFilters();
    return () => {
      cancelled = true;
    };
  }, [token]);

  // Load Maps Topology Layer with 3s minimum filter loading & backdrop blur
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    async function loadMap() {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams();
        if (regionFilter !== "__all__") params.set("region_id", regionFilter);
        if (projectFilter !== "__all__") params.set("project_id", projectFilter);
        if (popFilter !== "__all__") params.set("pop_id", popFilter);
        if (tenantFilter !== "__all__") params.set("tenant_id", tenantFilter);
        if (deviceType !== "all") params.set("device_type_key", deviceType);
        if (cutMode === "connection" && cutTarget) params.set("cut_connection_id", cutTarget);
        if (cutMode === "cable" && cutTarget) params.set("cut_cable_device_id", cutTarget);
        const response = await apiFetch<TopologyMapsResponse>(`/topology/maps?${params.toString()}`, { token });
        if (cancelled) return;
        setData(response.data);
      } catch (err) {
        if (!cancelled) setError((err as Error).message || "Gagal memuat topology map.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadMap();
    return () => {
      cancelled = true;
    };
  }, [cutMode, cutTarget, deviceType, popFilter, projectFilter, refreshKey, regionFilter, tenantFilter, token]);

  useEffect(() => {
    setProjectFilter("__all__");
    setPopFilter("__all__");
  }, [regionFilter]);

  const devices = useMemo(() => data?.layers.devices.items || [], [data]);
  const routes = useMemo(() => data?.layers.routes.items || [], [data]);
  const connections = useMemo(() => data?.layers.connections.items || [], [data]);
  const impact = data?.layers.fiber_cut_impact;

  // Homepassed Spatial Coverage Calculation
  const homepassedResult = useMemo(() => {
    if (!homepassedEnabled) return null;
    return calculateHomepassedCoverage(devices, routes, poiMarkers, homepassedConfig);
  }, [homepassedEnabled, devices, routes, poiMarkers, homepassedConfig]);

  const regionOptions = useMemo(
    () => [
      { value: "__all__", label: "Semua region" },
      ...filterOptions.regions
        .map((item) => ({
          value: String(item.id || ""),
          label: formatMapFilterLabel(item, ["region_name", "region_code", "name"], "Region"),
        }))
        .filter((item) => item.value),
    ],
    [filterOptions.regions],
  );

  const projectOptions = useMemo(() => {
    const rows = filterOptions.projects.filter((item) => regionFilter === "__all__" || item.region_id === regionFilter);
    return [
      { value: "__all__", label: "Semua project" },
      ...rows
        .map((item) => ({
          value: String(item.id || ""),
          label: formatMapFilterLabel(item, ["project_name", "project_code", "project_id"], "Project"),
        }))
        .filter((item) => item.value),
    ];
  }, [filterOptions.projects, regionFilter]);

  const popOptions = useMemo(() => {
    const rows = filterOptions.pops.filter((item) => regionFilter === "__all__" || item.region_id === regionFilter);
    return [
      { value: "__all__", label: "Semua POP" },
      ...rows
        .map((item) => ({
          value: String(item.id || ""),
          label: formatMapFilterLabel(item, ["pop_name", "pop_code", "pop_id"], "POP"),
        }))
        .filter((item) => item.value),
    ];
  }, [filterOptions.pops, regionFilter]);

  const tenantOptions = useMemo(
    () => [
      { value: "__all__", label: "Semua tenant" },
      ...filterOptions.tenants
        .map((item) => ({
          value: String(item.id || ""),
          label: formatMapFilterLabel(item, ["tenant_name", "tenant_code", "name"], "Tenant"),
        }))
        .filter((item) => item.value),
    ],
    [filterOptions.tenants],
  );

  const deviceTypeOptions = useMemo(() => {
    const values = Array.from(
      new Set(devices.map((item) => String(item.device_type_key || "").toUpperCase()).filter(Boolean)),
    ).sort();
    return [{ value: "all", label: "Semua tipe device" }, ...values.map((value) => ({ value, label: value }))];
  }, [devices]);

  const cutTargetOptions = useMemo(() => {
    if (cutMode === "connection") {
      return connections.map((item) => ({
        value: item.id,
        label: `${deviceLabel(item.from_device)} -> ${deviceLabel(item.to_device)}`,
      }));
    }
    if (cutMode === "cable") {
      const rows = new Map<string, string>();
      connections.forEach((item) => {
        if (!item.cable_device_id) return;
        rows.set(item.cable_device_id, deviceLabel(item.cable_device));
      });
      return Array.from(rows, ([value, label]) => ({ value, label }));
    }
    return [];
  }, [connections, cutMode]);

  const userGpsPosition = useMemo(
    () => (origin?.type === "gps" ? { lat: origin.latitude, lng: origin.longitude } : null),
    [origin],
  );

  const handleSelectSearchResult = useCallback((res: NominatimResult) => {
    setSearchSelection({
      lat: res.lat,
      lng: res.lon,
      label: res.short_name,
    });
  }, []);

  const handleClearSearchResult = useCallback(() => {
    setSearchSelection(null);
  }, []);

  const handleMapIdle = useCallback(
    (bounds: { south: number; west: number; north: number; east: number }) => {
      if (layerToggles.poi) {
        fetchPOI(bounds);
      }
    },
    [fetchPOI, layerToggles.poi],
  );

  return (
    <div
      ref={hostRef}
      className={cn(
        "absolute inset-0 z-20 flex h-full w-full",
        !visible && "pointer-events-none opacity-0",
      )}
      aria-hidden={!visible}
    >
      <div className="relative flex h-full w-full flex-1 overflow-hidden bg-background">
        {/* Collapsible Left Sidebar */}
        {!isZenMode && (
          <MapLeftSidebar
            isOpen={sidebarOpen}
            onToggleOpen={() => setSidebarOpen((v) => !v)}
            regionFilter={regionFilter}
            onRegionChange={setRegionFilter}
            regionOptions={regionOptions}
            projectFilter={projectFilter}
            onProjectChange={setProjectFilter}
            projectOptions={projectOptions}
            popFilter={popFilter}
            onPopChange={setPopFilter}
            popOptions={popOptions}
            tenantFilter={tenantFilter}
            onTenantChange={setTenantFilter}
            tenantOptions={tenantOptions}
            deviceType={deviceType}
            onDeviceTypeChange={setDeviceType}
            deviceTypeOptions={deviceTypeOptions}
            devices={devices}
            originName={origin?.name || "Lokasi GPS Saya"}
            onSetOriginFromGps={setOriginFromGps}
            isGpsLoading={isGpsLoading}
            selectedDestination={destination ? devices.find((d) => d.id === destination.id) : null}
            onSelectDestinationDevice={(device) => {
              setDestination({
                id: device.id,
                name: device.device_name || device.device_id || "Device",
                latitude: Number(device.latitude),
                longitude: Number(device.longitude),
                type: "device",
              });
            }}
            onCalculateRoute={calculateRoute}
            isRouteLoading={isRouteLoading}
            routeResult={route}
            routeError={routeError}
            onClearRoute={clearRoute}
            cutMode={cutMode}
            onCutModeChange={(mode) => {
              setCutMode(mode);
              setCutTarget("");
            }}
            cutTarget={cutTarget}
            onCutTargetChange={setCutTarget}
            cutTargetOptions={cutTargetOptions}
            impactData={impact}
            devicesWithoutCoords={data?.issues.devices_without_coordinates || []}
            onSelectSearchResult={handleSelectSearchResult}
            onClearSearchResult={handleClearSearchResult}
            layerToggles={layerToggles}
            onToggleLayer={handleToggleLayer}
            homepassedEnabled={homepassedEnabled}
            onToggleHomepassedEnabled={setHomepassedEnabled}
            homepassedConfig={homepassedConfig}
            onHomepassedConfigChange={setHomepassedConfig}
            homepassedResult={homepassedResult}
          />
        )}

        {/* Floating Zen Mode Indicator & Exit Button */}
        {isZenMode && (
          <button
            type="button"
            onClick={() => setIsZenMode(false)}
            className="absolute left-3 top-3 z-30 flex items-center gap-1.5 rounded-full border border-primary/40 bg-card/90 px-3 py-1.5 text-xs shadow-md backdrop-blur-md transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-muted active:scale-[0.98] glass-inset animate-in fade-in"
            title="Keluar Mode Fokus (Zen)"
          >
            <span className="size-2 rounded-full bg-primary animate-pulse" />
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] font-semibold text-primary">
              Zen Mode Aktif (Z)
            </span>
          </button>
        )}

        {/* Main Google Maps Full-Page Canvas */}
        <div ref={mapCanvasRef} className="relative h-full w-full flex-1">
          {loading && !data ? (
            <AppLoading label="Memuat Google Maps & topologi fiber..." />
          ) : error ? (
            <AppLoading label={error} variant="error" />
          ) : (
            <>
              {/* Maps Canvas Wrapper (Handles Blur during filter loading) */}
              <div
                className={cn(
                  "h-full w-full transition-all duration-300 ease-in-out",
                  loading && "blur-[3px] pointer-events-none opacity-80",
                )}
              >
                <GoogleMapsCanvas
                  devices={devices}
                  routes={routes}
                  connections={connections}
                  impactedDeviceIds={(impact?.devices || []).map((item) => item.id)}
                  impactedConnectionIds={(impact?.connections || []).map((item) => item.id)}
                  osrmRoute={route}
                  poiMarkers={poiMarkers}
                  userGpsPosition={userGpsPosition}
                  searchSelection={searchSelection}
                  homepassedCoveragePolygon={homepassedResult?.mergedPolygonFeature || null}
                  homepassedConfig={homepassedConfig}
                  showDevices={layerToggles.devices}
                  showLabels={layerToggles.labels}
                  showCables={layerToggles.cables}
                  showConnections={layerToggles.connections}
                  showOsrmRoute={true}
                  showPoi={layerToggles.poi}
                  onDeviceSelect={(device, isMulti) => {
                    setInspectDevices((prev) => {
                      if (isMulti) {
                        const exists = prev.findIndex((d) => d.id === device.id);
                        if (exists >= 0) {
                          // Toggle off: remove if already selected
                          return prev.filter((d) => d.id !== device.id);
                        }
                        if (prev.length >= 3) return prev; // Max 3
                        return [...prev, device];
                      }
                      // Normal click: single select
                      return [device];
                    });
                  }}
                  onGroupSelect={(grouped) => {
                    setLocationGroupDevices(grouped);
                  }}
                  onMapIdle={handleMapIdle}
                />
              </div>

              {/* Centered Glass Loader Overlay (Displayed when reloading data) */}
              {loading && data && (
                <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/10 backdrop-blur-[2px]">
                  <div className="rounded-2xl border border-border/40 bg-card/90 p-6 shadow-lg glass-inset max-w-sm w-full mx-4">
                    <AppLoading label="Memperbarui data topologi..." />
                  </div>
                </div>
              )}
            </>
          )}

          {/* Floating Maps Actions Menu */}
          <div
            className={cn(
              "absolute right-3 z-20 pointer-events-none sm:right-3",
              !isZenMode && dockVisible ? "bottom-[7.75rem]" : "bottom-28",
            )}
          >
            <div className="pointer-events-auto">
              <MapFloatingMenu
                fullscreenRef={hostRef}
                screenshotRef={mapCanvasRef}
                isZenMode={isZenMode}
                onToggleZenMode={() => setIsZenMode((prev) => !prev)}
              />
            </div>
          </div>

          {/* Floating Bottom Status Dock (bottom-18 keeps it clear of the Google Maps terms/copyright footer) */}
          {!isZenMode && (
            dockVisible ? (
              <div className="absolute bottom-18 left-3 right-3 z-10 pointer-events-none sm:left-auto sm:right-3">
                <div className="pointer-events-auto">
                  <MapStatusDock
                    activeDevicesCount={devices.length}
                    activeRoutesCount={routes.length}
                    activeConnectionsCount={connections.length}
                    osrmStatus={isRouteLoading ? "loading" : routeError ? "error" : "ready"}
                    onHide={() => setDockVisible(false)}
                  />
                </div>
              </div>
            ) : (
              <div className="absolute bottom-18 left-3 z-10 pointer-events-none sm:left-auto sm:right-3">
                <div className="pointer-events-auto">
                  <button
                    type="button"
                    onClick={() => setDockVisible(true)}
                    title="Tampilkan status dock"
                    aria-label="Tampilkan status dock"
                    className="flex items-center gap-1.5 rounded-full border border-border/60 bg-card/90 px-3 py-2 text-xs shadow-2xs backdrop-blur-md glass-inset transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-muted active:scale-[0.98]"
                  >
                    <ChevronUp className="size-4 text-primary" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.12em] font-semibold">
                      Status
                    </span>
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      </div>

      {/* Device Detail Cards: vertical flow with two rows, responsive on small screens */}
      {!isZenMode && inspectDevices.length > 0 && (
        <div
          className={cn(
            "absolute right-16 top-3 z-30 grid max-h-[calc(100%-1rem)] max-w-[calc(100%-5.5rem)] grid-flow-col grid-rows-2 gap-2 overflow-x-auto overflow-y-auto pb-1",
            "max-sm:left-3 max-sm:right-3 max-sm:top-14 max-sm:max-w-none max-sm:grid-flow-row max-sm:grid-cols-1 max-sm:grid-rows-none max-sm:overflow-x-hidden max-sm:overflow-y-auto max-sm:pb-0",
          )}
        >
          {inspectDevices.map((device, idx) => (
            <DeviceDetailCard
              key={device.id}
              device={device}
              index={idx}
              total={inspectDevices.length}
              onClose={(id) => setInspectDevices((prev) => prev.filter((d) => d.id !== id))}
              regions={filterOptions.regions}
              pops={filterOptions.pops}
            />
          ))}
        </div>
      )}

      {/* Location Group Device Picker Card (Double-Bezel overlay when grouped marker clicked) */}
      {!isZenMode && locationGroupDevices && locationGroupDevices.length > 0 && (
        <LocationDevicePickerCard
          devices={locationGroupDevices}
          onClose={() => setLocationGroupDevices(null)}
          onSelectDevice={(device, isMulti) => {
            setInspectDevices((prev) => {
              if (isMulti) {
                const exists = prev.findIndex((d) => d.id === device.id);
                if (exists >= 0) return prev.filter((d) => d.id !== device.id);
                if (prev.length >= 3) return prev;
                return [...prev, device];
              }
              return [device];
            });
          }}
          inspectDevices={inspectDevices}
        />
      )}
    </div>
  );
}

function formatMapFilterLabel(item: MapFilterOptionRow, fields: string[], fallback: string) {
  const values = fields.map((field) => textValue(item[field])).filter(Boolean);
  if (!values.length) return fallback;
  if (values.length === 1) return values[0];
  return `${values[0]} (${values[1]})`;
}

function textValue(value: unknown) {
  if (value == null) return "";
  const text = String(value).trim();
  return text && text !== "-" ? text : "";
}

function deviceLabel(device?: MapDevice | null) {
  if (!device) return "Device belum tersedia";
  return device.device_name || device.device_id || device.device_type_key || "Device";
}
