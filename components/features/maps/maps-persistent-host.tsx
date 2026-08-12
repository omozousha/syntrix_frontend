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
import type { NominatimResult } from "@/hooks/use-nominatim-search";
import { cn } from "@/lib/utils";
import { Copy, Check, X, ExternalLink, ChevronUp } from "lucide-react";
import Link from "next/link";

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

  // Status Dock Visibility
  const [dockVisible, setDockVisible] = useState(true);

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
      const startTime = Date.now();
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

        // Ensure a minimum 3-second loader display when filter changes for visual feedback
        const elapsed = Date.now() - startTime;
        const remainingDelay = Math.max(0, 3000 - elapsed);
        if (remainingDelay > 0) {
          await new Promise((resolve) => setTimeout(resolve, remainingDelay));
        }

        if (!cancelled) setData(response.data);
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
        />

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
              dockVisible ? "bottom-[7.75rem]" : "bottom-28",
            )}
          >
            <div className="pointer-events-auto">
              <MapFloatingMenu fullscreenRef={hostRef} screenshotRef={mapCanvasRef} />
            </div>
          </div>

          {/* Floating Bottom Status Dock (bottom-18 keeps it clear of the Google Maps terms/copyright footer) */}
          {dockVisible ? (
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
          )}
        </div>
      </div>

      {/* Device Detail Cards: vertical flow with two rows, responsive on small screens */}
      {inspectDevices.length > 0 && (
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
      {locationGroupDevices && locationGroupDevices.length > 0 && (
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

function DeviceDetailCard({
  device,
  index = 0,
  total = 1,
  onClose,
  regions,
  pops,
}: {
  device: MapDevice | null;
  index?: number;
  total?: number;
  onClose: (id: string) => void;
  regions: MapFilterOptionRow[];
  pops: MapFilterOptionRow[];
}) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!device) return null;

  const lat = device.latitude != null ? Number(device.latitude) : NaN;
  const lng = device.longitude != null ? Number(device.longitude) : NaN;
  const latText = Number.isFinite(lat) ? lat.toFixed(6) : "-";
  const lngText = Number.isFinite(lng) ? lng.toFixed(6) : "-";

  const regionLabel = findReferenceLabel(regions, device.region_id, ["region_name", "region_code", "name"], "Region");
  const popLabel = findReferenceLabel(pops, device.pop_id, ["pop_name", "pop_code", "pop_id"], "POP");

  const handleCopy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1500);
    } catch {
      // Clipboard not available
    }
  };

  // Compact 2-column field definition
  const fieldRows: Array<
    Array<{ key: string; label: string; value: string }>
  > = [
    [
      { key: "type", label: "Tipe", value: device.device_type_key || "-" },
      { key: "region", label: "Region", value: regionLabel },
    ],
    [
      { key: "pop", label: "POP", value: popLabel },
    ],
    [
      { key: "lat", label: "Latitude", value: latText },
      { key: "lng", label: "Longitude", value: lngText },
    ],
  ];

  const detailHref = `/data-management/list/${(device.device_type_key || "devices").toLowerCase()}/${device.id}`;

  return (
    <div className="w-[min(285px,calc(100vw-1.5rem))] max-sm:w-full rounded-2xl border border-border/40 bg-card/95 p-2 shadow-lg backdrop-blur-md glass-inset transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] animate-in fade-in slide-in-from-right-4">
      {/* Inner bezel */}
      <div className="rounded-[calc(1rem-0.25rem)] border border-border/60 bg-card/80 p-2.5">
        {/* Header: Device name + Close */}
        <div className="flex items-start justify-between gap-1.5 mb-2.5">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 mb-0.5">
              <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">
                Detail Device
              </p>
              {total > 1 && (
                <span className="rounded-full bg-primary/10 border border-primary/30 px-1.5 py-0.2 font-mono text-[8px] font-semibold text-primary">
                  {index + 1}/{total}
                </span>
              )}
            </div>
            <p className="truncate font-semibold text-xs leading-tight text-foreground">
              {device.device_name || device.device_id || "Device"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onClose(device.id)}
            className="shrink-0 size-5 flex items-center justify-center rounded-full border border-border/60 text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors active:scale-95"
          >
            <X className="size-3" />
          </button>
        </div>

        {/* Compact 2-column grid */}
        <div className="space-y-2 mb-3">
          {fieldRows.map((row, rowIdx) => (
            <div
              key={rowIdx}
              className={cn("grid gap-2", row.length === 1 ? "grid-cols-1" : "grid-cols-2")}
            >
              {row.map((field) => {
                const isCopied = copiedKey === field.key;
                return (
                  <button
                    key={field.key}
                    type="button"
                    onClick={() => handleCopy(field.key, field.value)}
                    className="group flex flex-col rounded-xl border border-border/50 bg-muted/10 px-2 py-1.5 text-left transition-colors hover:bg-muted/30 active:scale-[0.98]"
                    title={`Salin ${field.label}`}
                  >
                    <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-muted-foreground leading-none mb-1">
                      {field.label}
                    </span>
                    <span className="flex items-center justify-between gap-1 min-w-0">
                      <span className="truncate font-mono text-[11px] font-medium tabular-nums text-foreground leading-none">
                        {field.value}
                      </span>
                      {isCopied ? (
                        <Check className="size-3 shrink-0 text-emerald-500" />
                      ) : (
                        <Copy className="size-3 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-60 transition-opacity" />
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer Action: Direct Detail Device Link (bottom right) */}
        <div className="flex justify-end pt-1 border-t border-border/40">
          <Link
            href={detailHref}
            className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 font-mono text-[9px] uppercase tracking-[0.12em] font-medium text-primary hover:bg-primary/20 active:scale-95 transition-all"
          >
            <span>Detail Device</span>
            <ExternalLink className="size-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function findReferenceLabel(
  rows: MapFilterOptionRow[],
  id: unknown,
  fields: string[],
  fallback: string,
): string {
  if (id == null) return "-";
  const target = String(id);
  const match = rows.find((row) => String(row.id) === target);
  if (!match) return target;
  const values = fields.map((field) => textValue(match[field])).filter(Boolean);
  if (!values.length) return target;
  return values[0];
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

function LocationDevicePickerCard({
  devices,
  onClose,
  onSelectDevice,
  inspectDevices,
}: {
  devices: MapDevice[];
  onClose: () => void;
  onSelectDevice: (device: MapDevice, isMulti: boolean) => void;
  inspectDevices: MapDevice[];
}) {
  const firstLat = devices[0]?.latitude != null ? Number(devices[0].latitude) : NaN;
  const firstLng = devices[0]?.longitude != null ? Number(devices[0].longitude) : NaN;
  const coordText = Number.isFinite(firstLat) && Number.isFinite(firstLng)
    ? `${firstLat.toFixed(6)}, ${firstLng.toFixed(6)}`
    : "-";

  return (
    <div className="absolute left-1/2 top-16 z-30 -translate-x-1/2 w-[min(340px,calc(100vw-2rem))] rounded-2xl border border-border/40 bg-card/95 p-2 shadow-xl backdrop-blur-md glass-inset transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] animate-in fade-in zoom-in-95">
      <div className="rounded-[calc(1rem-0.25rem)] border border-border/60 bg-card/80 p-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-2 pb-2 border-b border-border/40">
          <div>
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="inline-block size-2 rounded-full bg-primary animate-pulse" />
              <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">
                Grouped Devices
              </p>
            </div>
            <h4 className="font-semibold text-xs text-foreground">
              {devices.length} Device di Lokasi Sama
            </h4>
            <p className="font-mono text-[10px] tabular-nums text-muted-foreground mt-0.5">
              📍 {coordText}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 size-5 flex items-center justify-center rounded-full border border-border/60 text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors active:scale-95"
            title="Tutup"
          >
            <X className="size-3" />
          </button>
        </div>

        {/* Device List */}
        <div className="space-y-1.5 max-h-56 overflow-y-auto thin-scrollbar pr-0.5">
          {devices.map((device) => {
            const isSelected = inspectDevices.some((d) => d.id === device.id);
            return (
              <button
                key={device.id}
                type="button"
                onClick={(e) => {
                  onSelectDevice(device, Boolean(e.shiftKey));
                }}
                className={cn(
                  "w-full flex items-center justify-between gap-2 rounded-xl border px-2.5 py-2 text-left transition-all duration-200 active:scale-[0.98]",
                  isSelected
                    ? "border-primary/50 bg-primary/10 text-primary shadow-2xs"
                    : "border-border/50 bg-muted/10 text-foreground hover:bg-muted/30 hover:border-border/80",
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-xs leading-snug">
                    {device.device_name || device.device_id || "Device"}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                      {device.device_type_key || "DEVICE"}
                    </span>
                    {device.marker_status && (
                      <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                        • {device.marker_status}
                      </span>
                    )}
                  </div>
                </div>

                {isSelected ? (
                  <span className="shrink-0 rounded-full bg-primary/20 border border-primary/40 px-1.5 py-0.5 font-mono text-[8px] font-semibold text-primary">
                    Terpilih
                  </span>
                ) : (
                  <span className="shrink-0 font-mono text-[9px] text-muted-foreground opacity-60">
                    Klik
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tip */}
        <p className="mt-2.5 pt-2 border-t border-border/40 font-mono text-[9px] text-muted-foreground text-center">
          💡 Gunakan <kbd className="rounded border border-border/60 bg-muted px-1 py-0.5 text-[8px] font-semibold">Shift + Klik</kbd> untuk memilih hingga 3 device sekaligus.
        </p>
      </div>
    </div>
  );
}

function deviceLabel(device?: MapDevice | null) {
  if (!device) return "Device belum tersedia";
  return device.device_name || device.device_id || device.device_type_key || "Device";
}
