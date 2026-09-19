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
import { MapLeftSidebar, type LayerToggles, type MapTabType } from "@/components/features/maps/map-left-sidebar";
import { MapFloatingMenu } from "@/components/features/maps/map-floating-menu";
import { MapFloatingLayersControl } from "@/components/features/maps/map-floating-layers-control";
import { TopMapOmnibar } from "@/components/features/maps/top-map-omnibar";
import {
  calculateHomepassedCoverage,
  DEFAULT_HOMEPASSED_CONFIG,
  type HomepassedCalculationConfig,
} from "@/lib/gis/homepassed-calculator";
import { cn } from "@/lib/utils";
import { ChevronUp } from "lucide-react";
import { MapDeviceInspectorDrawer } from "@/components/features/maps/cards/map-device-inspector-drawer";
import { LocationDevicePickerCard } from "@/components/features/maps/cards/location-device-picker-card";
import { BottomContextualStudio } from "@/components/features/maps/bottom-contextual-studio";

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
  const [debouncedHomepassedConfig, setDebouncedHomepassedConfig] = useState(DEFAULT_HOMEPASSED_CONFIG);

  // Active Spatial Map Mode ("overview" | "homepassed" | "osrm" | "fibercut")
  const [mapMode, setMapMode] = useState<MapTabType>("overview");

  // Debounce heavy spatial Turf union calculation (250ms) during slider drags
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedHomepassedConfig(homepassedConfig);
    }, 250);
    return () => clearTimeout(timer);
  }, [homepassedConfig]);

  // Status Dock Visibility (default hidden)
  const [dockVisible, setDockVisible] = useState(false);

  // Zen / Focus Mode state (Z hotkey)
  const [isZenMode, setIsZenMode] = useState(false);

  // Refs for Fullscreen (entire host) and Screenshot (map canvas area)
  const hostRef = useRef<HTMLDivElement>(null);
  const mapCanvasRef = useRef<HTMLDivElement>(null);

  // Search State: Separated between Location Placemark (Addresses) and Searched Device Highlight
  const [searchLocation, setSearchLocation] = useState<{ lat: number; lng: number; label: string } | null>(null);
  const [searchedDeviceId, setSearchedDeviceId] = useState<string | null>(null);
  const [panTarget, setPanTarget] = useState<{ lat: number; lng: number } | null>(null);

  // OSRM Routing Hook
  const {
    origin,
    setOrigin,
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
  const { poiMarkers, buildingPois, telcoPois, fetchPOI, clearPOI } = useOverpassPOI();

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

  const handleSelectDestinationDevice = useCallback(
    (device: MapDevice) => {
      setDestination({
        id: device.id,
        name: device.device_name || device.device_id || "Device",
        latitude: Number(device.latitude),
        longitude: Number(device.longitude),
        type: "device",
      });
    },
    [setDestination],
  );

  const handleSelectDeviceFromOmnibar = useCallback((device: MapDevice) => {
    setInspectDevices([device]);
    setSearchedDeviceId(device.id);
    setSearchLocation(null); // Devices do not create separate geographic placemarks
    const lat = Number(device.latitude);
    const lng = Number(device.longitude);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      setPanTarget({ lat, lng });
    }
  }, []);

  const handleSelectLocationFromOmnibar = useCallback(
    (result: { lat: number; lng: number; label: string }) => {
      setSearchLocation(result);
      setSearchedDeviceId(null);
      setPanTarget({ lat: result.lat, lng: result.lng });
    },
    [],
  );

  const handleClearSearch = useCallback(() => {
    setSearchLocation(null);
    setSearchedDeviceId(null);
    setPanTarget(null);
  }, []);

  const handleResetFilters = useCallback(() => {
    setRegionFilter("__all__");
    setProjectFilter("__all__");
    setPopFilter("__all__");
    setTenantFilter("__all__");
    setDeviceType("all");
  }, []);

  const handleModeChange = useCallback((mode: MapTabType) => {
    setMapMode(mode);
    if (mode === "homepassed") {
      setHomepassedEnabled(true);
    }
    if (mode === "osrm") {
      setSidebarOpen(true);
    }
  }, []);

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
    return calculateHomepassedCoverage(devices, routes, buildingPois, debouncedHomepassedConfig);
  }, [homepassedEnabled, devices, routes, buildingPois, debouncedHomepassedConfig]);

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

  const handleMapIdle = useCallback(
    (bounds: { south: number; west: number; north: number; east: number }, currentZoom?: number) => {
      // Guard: only fetch Overpass building POIs when zoomed in (zoom >= 13) to avoid server timeout/rate-limit
      const effectiveZoom = currentZoom ?? 15;
      if ((layerToggles.poi || homepassedEnabled) && effectiveZoom >= 13) {
        fetchPOI(bounds);
      }
    },
    [fetchPOI, layerToggles.poi, homepassedEnabled],
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
            activeTab={mapMode}
            onActiveTabChange={handleModeChange}
            devices={devices}
            routesCount={routes.length}
            connectionsCount={connections.length}
            devicesWithoutCoords={data?.issues.devices_without_coordinates || []}
            routesWithoutGeometry={data?.issues.routes_without_geometry || []}
            connectionsWithoutGeometry={data?.issues.connections_without_geometry_context || []}
            onSelectDevice={handleSelectDeviceFromOmnibar}
            originName={origin?.name || "Lokasi GPS Saya"}
            onSetOriginFromGps={setOriginFromGps}
            isGpsLoading={isGpsLoading}
            selectedDestination={destination ? devices.find((d) => d.id === destination.id) : null}
            onSelectDestinationDevice={handleSelectDestinationDevice}
            onCalculateRoute={calculateRoute}
            isRouteLoading={isRouteLoading}
            routeResult={route}
            routeError={routeError}
            onClearRoute={clearRoute}
            onPanToLocation={(loc) => setPanTarget(loc)}
            pops={filterOptions.pops}
            regions={filterOptions.regions}
            cutMode={cutMode}
            onCutModeChange={(mode) => {
              setCutMode(mode);
              setCutTarget("");
            }}
            cutTarget={cutTarget}
            onCutTargetChange={setCutTarget}
            cutTargetOptions={cutTargetOptions}
            impactData={impact}
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
          {/* Top Floating Spatial Omnibar */}
          {!isZenMode && (
            <TopMapOmnibar
              devices={devices}
              onSelectDevice={handleSelectDeviceFromOmnibar}
              onSelectLocation={handleSelectLocationFromOmnibar}
              onClearSearch={handleClearSearch}
              isSearchActive={Boolean(searchLocation || searchedDeviceId)}
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
              onResetFilters={handleResetFilters}
              activeMode={mapMode}
              onModeChange={handleModeChange}
            />
          )}

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
                  poiMarkers={telcoPois}
                  buildingPois={buildingPois}
                  userGpsPosition={userGpsPosition}
                  searchLocation={searchLocation}
                  searchedDeviceId={searchedDeviceId}
                  panTarget={panTarget}
                  onClearSearchLocation={handleClearSearch}
                  selectedDeviceIds={inspectDevices.map((d) => d.id)}
                  homepassedCoveragePolygon={homepassedResult?.mergedPolygonFeature || null}
                  homepassedConfig={debouncedHomepassedConfig}
                  homepassedEnabled={homepassedEnabled}
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
                        if (prev.length >= 4) return prev; // Max 4 for comparison
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

          {/* Floating Maps Actions & Layers Menu */}
          <div
            className={cn(
              "absolute right-3 z-20 pointer-events-none sm:right-3",
              !isZenMode && dockVisible ? "bottom-[7.75rem]" : "bottom-28",
            )}
          >
            <div className="flex flex-col items-center gap-2 pointer-events-auto">
              <MapFloatingLayersControl
                layerToggles={layerToggles}
                onToggleLayer={handleToggleLayer}
              />
              <MapFloatingMenu
                fullscreenRef={hostRef}
                screenshotRef={mapCanvasRef}
                isZenMode={isZenMode}
                onToggleZenMode={() => setIsZenMode((prev) => !prev)}
              />
            </div>
          </div>

          {/* Zone 3: Bottom Contextual Studio (Active when mode is homepassed or fibercut) */}
          {!isZenMode && (mapMode === "homepassed" || mapMode === "fibercut") && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 w-[min(980px,calc(100vw-2rem))] pointer-events-none px-2 sm:px-0">
              <BottomContextualStudio
                mode={mapMode}
                onClose={() => setMapMode("overview")}
                homepassedEnabled={homepassedEnabled}
                onToggleHomepassedEnabled={setHomepassedEnabled}
                homepassedConfig={homepassedConfig}
                onHomepassedConfigChange={setHomepassedConfig}
                homepassedResult={homepassedResult}
                regionOptions={regionOptions}
                cutMode={cutMode}
                onCutModeChange={setCutMode}
                cutTarget={cutTarget}
                onCutTargetChange={setCutTarget}
                cutTargetOptions={cutTargetOptions}
                impactData={impact}
              />
            </div>
          )}

          {/* Floating Bottom Status Dock (bottom-18 keeps it clear of the Google Maps terms/copyright footer) */}
          {!isZenMode && mapMode !== "homepassed" && mapMode !== "fibercut" && (
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

      {/* Right Slide-Over Device Inspector Drawer */}
      {!isZenMode && inspectDevices.length > 0 && (
        <MapDeviceInspectorDrawer
          isOpen={inspectDevices.length > 0}
          devices={inspectDevices}
          onClose={() => setInspectDevices([])}
          onRemoveDevice={(id) => setInspectDevices((prev) => prev.filter((d) => d.id !== id))}
          regions={filterOptions.regions}
          pops={filterOptions.pops}
          onSetNavigationDestination={(device) => {
            handleSelectDestinationDevice(device);
            setSidebarOpen(true);
          }}
          onConnectDevicesRoute={(originDev, destDev) => {
            setOrigin({
              id: originDev.id,
              name: originDev.device_name || originDev.device_id || "Origin",
              latitude: Number(originDev.latitude),
              longitude: Number(originDev.longitude),
              type: "device",
            });
            setDestination({
              id: destDev.id,
              name: destDev.device_name || destDev.device_id || "Destination",
              latitude: Number(destDev.latitude),
              longitude: Number(destDev.longitude),
              type: "device",
            });
            setMapMode("osrm");
            setSidebarOpen(true);
          }}
          isSidebarOpen={sidebarOpen}
        />
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
                if (prev.length >= 4) return prev;
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
