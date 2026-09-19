"use client";

import * as React from "react";
import {
  GoogleMap,
  useJsApiLoader,
  MarkerF,
  PolylineF,
  PolygonF,
  OverlayViewF,
  OVERLAY_MOUSE_TARGET,
} from "@react-google-maps/api";
import type { Feature, Polygon, MultiPolygon } from "geojson";
import type { OsgmRouteResult } from "@/lib/api";
import {
  calculateIndividualDeviceHomepassed,
  type HomepassedCalculationConfig,
} from "@/lib/gis/homepassed-calculator";
import type { MapConnection, MapDevice, MapRoute } from "./topology-map-canvas";

export type OverpassPOI = {
  id: number;
  lat: number;
  lng: number;
  label: string;
  kind: "mast" | "pole" | "utility" | "building";
  category?: "building" | "telco";
};

export type GoogleMapsCanvasProps = {
  devices: MapDevice[];
  routes: MapRoute[];
  connections: MapConnection[];
  impactedDeviceIds?: string[];
  impactedConnectionIds?: string[];
  osrmRoute?: OsgmRouteResult | null;
  poiMarkers?: OverpassPOI[];
  buildingPois?: OverpassPOI[];
  userGpsPosition?: { lat: number; lng: number } | null;
  searchSelection?: { lat: number; lng: number; label: string } | null;
  searchLocation?: { lat: number; lng: number; label: string } | null;
  searchedDeviceId?: string | null;
  panTarget?: { lat: number; lng: number } | null;
  onClearSearchLocation?: () => void;
  selectedDeviceIds?: string[];
  homepassedCoveragePolygon?: Feature<Polygon | MultiPolygon> | null;
  homepassedConfig?: HomepassedCalculationConfig;
  homepassedEnabled?: boolean;
  showDevices?: boolean;
  showLabels?: boolean;
  showCables?: boolean;
  showConnections?: boolean;
  showOsrmRoute?: boolean;
  showPoi?: boolean;
  onDeviceSelect?: (device: MapDevice, isMulti: boolean) => void;
  onGroupSelect?: (devices: MapDevice[]) => void;
  onMapIdle?: (bounds: { south: number; west: number; north: number; east: number }, zoom?: number) => void;
  className?: string;
};

// Default viewport covers Java Island, Indonesia.
const DEFAULT_CENTER = { lat: -7.3, lng: 110.2 };
const DEFAULT_ZOOM = 8;

const MARKER_COLORS: Record<string, string> = {
  healthy: "#16a34a",
  warning: "#d97706",
  critical: "#dc2626",
  impacted: "#dc2626",
  unvalidated: "#64748b",
  searched: "#06b6d4",
};

const fallbackColor = "#64748b";

function getMarkerGlyphSvg(status: string): string {
  switch (status) {
    case "searched":
      return `<circle cx="14" cy="14" r="4.5" fill="#ffffff"/><circle cx="14" cy="14" r="2" fill="#06b6d4"/>`;
    case "healthy":
      return `<path d="M9.5 14l3 3 6-6" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`;
    case "warning":
      return `<path d="M14 9.5v5M14 17.5h.01" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round"/>`;
    case "critical":
    case "impacted":
      return `<path d="M14 8.5v5.5M14 17.5v.01" fill="none" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round"/>`;
    case "unvalidated":
    default:
      return `<circle cx="14" cy="14" r="3.5" fill="none" stroke="#ffffff" stroke-width="1.6"/><path d="M14 8.5v2M14 17.5v2M8.5 14h2M17.5 14h2" stroke="#ffffff" stroke-width="1.6" stroke-linecap="round"/>`;
  }
}

function svgMarker(statusOrColor: string): string {
  // ponytail: support both status key and raw hex color for OSRM endpoints
  const isHex = statusOrColor.startsWith("#");
  const color = isHex ? statusOrColor : (MARKER_COLORS[statusOrColor] || fallbackColor);
  const encoded = encodeURIComponent(color);
  const glyph = isHex
    ? `<circle cx="14" cy="14" r="4" fill="#ffffff" fill-opacity="0.9"/>`
    : getMarkerGlyphSvg(statusOrColor);

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
       <circle cx="14" cy="14" r="10" fill="${encoded}" stroke="#ffffff" stroke-width="2.5"/>
       ${glyph}
     </svg>`,
  )}`;
}

function svgGroupMarker(count: number): string {
  const text = String(count);
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
       <circle cx="16" cy="16" r="13" fill="#2563eb" stroke="#ffffff" stroke-width="2.5"/>
       <circle cx="16" cy="16" r="9.5" fill="#1d4ed8"/>
       <text x="16" y="20" font-family="monospace, sans-serif" font-size="10" font-weight="700" fill="#ffffff" text-anchor="middle">${text}</text>
     </svg>`,
  )}`;
}

const gpsMarkerUrl = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30">
     <circle cx="15" cy="15" r="12" fill="#3b82f6" fill-opacity="0.25"/>
     <circle cx="15" cy="15" r="7" fill="#3b82f6" stroke="#ffffff" stroke-width="2"/>
   </svg>`,
)}`;

const poiMarkerUrl = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22">
     <rect x="4" y="2" width="14" height="16" rx="2" fill="#8b5cf6" stroke="#ffffff" stroke-width="2"/>
     <circle cx="11" cy="14" r="2" fill="#ffffff"/>
     <path d="M8 6h6M8 9h6" stroke="#ffffff" stroke-width="1.6"/>
   </svg>`,
)}`;

const searchDotMarkerUrl = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
     <circle cx="8" cy="8" r="7" fill="#8b5cf6" fill-opacity="0.25"/>
     <circle cx="8" cy="8" r="4.5" fill="#8b5cf6" stroke="#ffffff" stroke-width="1.5"/>
   </svg>`,
)}`;

type FlatPoint = { lat: number; lng: number };

// Memoized individual Device Marker component to prevent unnecessary repaints
const DeviceMarker = React.memo(
  ({
    device,
    icon,
    showLabel,
    homepassedConfig,
    homepassedEnabled = false,
    buildingPois = [],
    isSelected = false,
    selectionIndex = 1,
    isSearched = false,
    onClick,
  }: {
    device: MapDevice;
    icon: google.maps.Icon | string;
    showLabel: boolean;
    homepassedConfig?: HomepassedCalculationConfig;
    homepassedEnabled?: boolean;
    buildingPois?: OverpassPOI[];
    isSelected?: boolean;
    selectionIndex?: number;
    isSearched?: boolean;
    onClick: (device: MapDevice, isMulti: boolean) => void;
  }) => {
    const [isHovered, setIsHovered] = React.useState(false);
    const lat = Number(device.latitude);
    const lng = Number(device.longitude);
    const labelText = device.device_name || device.device_id || "";

    const individualHomepassed = React.useMemo(() => {
      if (!homepassedEnabled || !isHovered) return null;
      return calculateIndividualDeviceHomepassed(
        device,
        homepassedConfig?.odpRadiusMeters ?? 250,
        homepassedConfig?.densityPerSqMeter ?? 0.003,
        buildingPois,
      );
    }, [homepassedEnabled, isHovered, device, homepassedConfig, buildingPois]);

    return (
      <>
        <MarkerF
          position={{ lat, lng }}
          icon={icon}
          title={labelText || device.device_type_key || ""}
          onClick={(e: google.maps.MapMouseEvent) => {
            const domEvent = e.domEvent as MouseEvent | undefined;
            onClick(device, Boolean(domEvent?.shiftKey));
          }}
          onMouseOver={() => {
            if (homepassedEnabled) setIsHovered(true);
          }}
          onMouseOut={() => setIsHovered(false)}
        />

        {/* Hover Tooltip: ODP Details & Individual Homepassed Count */}
        {homepassedEnabled && isHovered && individualHomepassed && (
          <OverlayViewF
            position={{ lat, lng }}
            mapPaneName={OVERLAY_MOUSE_TARGET}
            getPixelPositionOffset={(width, height) => ({
              x: -(width / 2),
              y: -95,
            })}
          >
            <div className="pointer-events-none z-50 min-w-[170px] space-y-1 rounded-2xl border border-border/60 bg-card/95 p-2.5 shadow-lg backdrop-blur-md glass-inset">
              <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-1">
                <span className="font-mono text-[8px] font-bold uppercase tracking-wider text-rose-500">
                  {device.device_type_key || "DEVICE"}
                </span>
                {individualHomepassed.isOdp !== false && (
                  <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.2 font-mono text-[8px] font-bold text-emerald-500">
                    R={individualHomepassed.radiusMeters}m
                  </span>
                )}
              </div>
              <p className="truncate font-semibold text-xs text-foreground">
                {labelText}
              </p>
              {individualHomepassed.isInWater ? (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-1.5 font-mono text-[9px] font-semibold text-amber-500">
                  ⚠️ {individualHomepassed.waterWarning || "Koordinat di Perairan / Laut"}
                </div>
              ) : (
                <div className="flex items-center justify-between font-mono text-[9px] text-muted-foreground pt-0.5">
                  <span>Kapasitas:</span>
                  <span className="font-bold text-foreground tabular-nums">{individualHomepassed.portCapacity} Port</span>
                </div>
              )}
              {individualHomepassed.isOdp !== false ? (
                <div className="flex items-center justify-between pt-0.5 text-[10px] border-t border-border/30">
                  <span className="font-mono text-[8px] font-bold uppercase tracking-wider text-muted-foreground">
                    Homepassed:
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className={`font-mono tabular-nums font-bold ${individualHomepassed.isInWater ? "text-amber-500" : "text-cyan-500"}`}>
                      {individualHomepassed.estimatedHomepassed} Unit
                    </span>
                    {!individualHomepassed.isInWater && (
                      <span
                        className={`rounded px-1 py-0.2 font-mono text-[7px] font-bold uppercase ${
                          individualHomepassed.source === "poi"
                            ? "border border-emerald-500/30 bg-emerald-500/15 text-emerald-500"
                            : "border border-border/40 bg-muted/40 text-muted-foreground"
                        }`}
                      >
                        {individualHomepassed.source === "poi" ? "POI" : "Est"}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between pt-0.5 text-[9px] border-t border-border/30 font-mono text-muted-foreground">
                  <span>Distribusi:</span>
                  <span className="text-foreground">Feeder / Trunk (Non-ODP)</span>
                </div>
              )}
            </div>
          </OverlayViewF>
        )}

        {showLabel && !isHovered && labelText && !isSelected && (
          <OverlayViewF
            position={{ lat, lng }}
            mapPaneName={OVERLAY_MOUSE_TARGET}
            getPixelPositionOffset={(width, height) => ({
              x: -(width / 2),
              y: -42,
            })}
          >
            <div className="pointer-events-none rounded-full border border-border/60 bg-card/95 px-2.5 py-0.5 font-mono text-[9px] font-medium tracking-wide text-foreground shadow-xs backdrop-blur-md glass-inset whitespace-nowrap">
              {labelText}
            </div>
          </OverlayViewF>
        )}

        {/* Selected Highlight Badge for Comparative Selection */}
        {isSelected && (
          <OverlayViewF
            position={{ lat, lng }}
            mapPaneName={OVERLAY_MOUSE_TARGET}
            getPixelPositionOffset={() => ({
              x: -10,
              y: -46,
            })}
          >
            <div className="pointer-events-none flex size-5 items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground font-mono text-[10px] font-bold shadow-lg ring-2 ring-primary/60 animate-in zoom-in-75">
              {selectionIndex}
            </div>
          </OverlayViewF>
        )}

        {/* Searched Device Pulsing Halo & Floating Highlight Badge */}
        {isSearched && !isSelected && (
          <>
            <OverlayViewF
              position={{ lat, lng }}
              mapPaneName={OVERLAY_MOUSE_TARGET}
              getPixelPositionOffset={() => ({
                x: -16,
                y: -16,
              })}
            >
              <div className="pointer-events-none size-8 rounded-full border-2 border-cyan-400 bg-cyan-400/25 animate-ping" />
            </OverlayViewF>

            <OverlayViewF
              position={{ lat, lng }}
              mapPaneName={OVERLAY_MOUSE_TARGET}
              getPixelPositionOffset={(width, height) => ({
                x: -(width / 2),
                y: -44,
              })}
            >
              <div className="pointer-events-none flex items-center gap-1 rounded-full border border-cyan-400/80 bg-card/95 px-2.5 py-0.5 font-mono text-[9px] font-bold text-cyan-500 shadow-xl backdrop-blur-md glass-inset whitespace-nowrap animate-in zoom-in-75 ring-2 ring-cyan-400/30">
                <span>🔍</span>
                <span>{labelText}</span>
              </div>
            </OverlayViewF>
          </>
        )}
      </>
    );
  },
);
DeviceMarker.displayName = "DeviceMarker";

export function GoogleMapsCanvas({
  devices,
  routes,
  connections,
  impactedDeviceIds = [],
  impactedConnectionIds = [],
  osrmRoute,
  poiMarkers = [],
  buildingPois = [],
  userGpsPosition,
  searchSelection,
  searchLocation,
  searchedDeviceId,
  panTarget,
  onClearSearchLocation,
  selectedDeviceIds = [],
  homepassedCoveragePolygon,
  homepassedConfig,
  homepassedEnabled = false,
  showDevices = true,
  showLabels = true,
  showCables = true,
  showConnections = true,
  showOsrmRoute = true,
  showPoi = false,
  onDeviceSelect,
  onGroupSelect,
  onMapIdle,
  className,
}: GoogleMapsCanvasProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
  const { isLoaded, loadError } = useJsApiLoader({ googleMapsApiKey: apiKey, id: "google-maps-script" });
  const mapRef = React.useRef<google.maps.Map | null>(null);
  const [mapType, setMapType] = React.useState<string>("roadmap");
  const [zoom, setZoom] = React.useState<number>(DEFAULT_ZOOM);

  // Icons memoized once per marker status (avoids `new google.maps.Size/Point` on every render)
  const deviceIcons = React.useMemo(() => {
    if (!isLoaded || typeof google === "undefined" || !google.maps) return {};
    const entries = Object.keys(MARKER_COLORS).map((status) => [
      status,
      {
        url: svgMarker(status),
        scaledSize: new google.maps.Size(28, 28),
        anchor: new google.maps.Point(14, 14),
        labelOrigin: new google.maps.Point(14, -10),
      } as google.maps.Icon,
    ]);
    return Object.fromEntries(entries);
  }, [isLoaded]);

  const getIcon = React.useCallback(
    (status: string) => {
      if (deviceIcons[status]) return deviceIcons[status];
      if (typeof google !== "undefined" && google.maps) {
        return {
          url: svgMarker(status),
          scaledSize: new google.maps.Size(28, 28),
          anchor: new google.maps.Point(14, 14),
          labelOrigin: new google.maps.Point(14, -10),
        } as google.maps.Icon;
      }
      return svgMarker(status);
    },
    [deviceIcons],
  );

  const searchDotIcon = React.useMemo(() => {
    if (!isLoaded || typeof google === "undefined" || !google.maps) return searchDotMarkerUrl;
    return {
      url: searchDotMarkerUrl,
      scaledSize: new google.maps.Size(16, 16),
      anchor: new google.maps.Point(8, 8),
    } as google.maps.Icon;
  }, [isLoaded]);

  // Auto-panTo when panTarget, searchLocation, or searchSelection changes
  React.useEffect(() => {
    const target = panTarget || searchLocation || searchSelection;
    if (target && mapRef.current) {
      mapRef.current.panTo({ lat: target.lat, lng: target.lng });
      mapRef.current.setZoom(16);
    }
  }, [panTarget, searchLocation, searchSelection]);

  // Auto-fit bounds when multi-selecting devices for comparison (with padding for the 380px right drawer)
  React.useEffect(() => {
    if (!selectedDeviceIds || selectedDeviceIds.length < 2 || !mapRef.current) return;
    const selectedDevs = devices.filter((d) => selectedDeviceIds.includes(d.id));
    if (selectedDevs.length < 2) return;
    if (typeof google === "undefined" || !google.maps) return;

    const bounds = new google.maps.LatLngBounds();
    let validCount = 0;
    selectedDevs.forEach((d) => {
      const lat = Number(d.latitude);
      const lng = Number(d.longitude);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        bounds.extend({ lat, lng });
        validCount++;
      }
    });

    if (validCount >= 2 && !bounds.isEmpty()) {
      try {
        mapRef.current.fitBounds(bounds, {
          top: 90,
          right: 90,
          bottom: 340,
          left: 90,
        } as unknown as number);
      } catch {
        mapRef.current.fitBounds(bounds, 80);
      }
    }
  }, [selectedDeviceIds, devices]);

  const { singleDeviceGroups, multiDeviceGroups } = React.useMemo(() => {
    const groups = new Map<string, Array<{ device: MapDevice; markerStatus: string }>>();

    devices.forEach((device) => {
      const lat = Number(device.latitude);
      const lng = Number(device.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

      const key = `${lat.toFixed(6)},${lng.toFixed(6)}`;
      const markerStatus = impactedDeviceIds.includes(device.id)
        ? "impacted"
        : device.marker_status || "unvalidated";

      const existing = groups.get(key) || [];
      existing.push({ device, markerStatus });
      groups.set(key, existing);
    });

    const single: Array<{ device: MapDevice; markerStatus: string; key: string }> = [];
    const multi: Array<{ key: string; lat: number; lng: number; items: MapDevice[] }> = [];

    groups.forEach((items, groupKey) => {
      if (items.length === 1) {
        single.push({ ...items[0], key: groupKey });
      } else {
        const firstLat = Number(items[0].device.latitude);
        const firstLng = Number(items[0].device.longitude);
        multi.push({
          key: groupKey,
          lat: firstLat,
          lng: firstLng,
          items: items.map((i) => i.device),
        });
      }
    });

    return { singleDeviceGroups: single, multiDeviceGroups: multi };
  }, [devices, impactedDeviceIds]);

  const routePaths = React.useMemo(() => routes.flatMap(extractLatLngPaths), [routes]);
  const connectionPaths = React.useMemo(
    () =>
      connections
        .filter((c) => hasCoords(c.from_device) && hasCoords(c.to_device))
        .map((c) => ({
          id: c.id,
          impacted: impactedConnectionIds.includes(c.id),
          path: [
            { lat: Number(c.from_device?.latitude), lng: Number(c.from_device?.longitude) },
            { lat: Number(c.to_device?.latitude), lng: Number(c.to_device?.longitude) },
          ] as FlatPoint[],
        })),
    [connections, impactedConnectionIds],
  );

  const osrmPath = React.useMemo(
    () =>
      osrmRoute?.geometry?.coordinates?.map((coord) => ({
        lat: coord[1],
        lng: coord[0],
      })) || [],
    [osrmRoute],
  );

  const handleLoad = React.useCallback(
    (map: google.maps.Map) => {
      mapRef.current = map;
      const points: FlatPoint[] = devices
        .map((d) => ({ lat: Number(d.latitude), lng: Number(d.longitude) }))
        .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
      if (points.length) {
        const bounds = new google.maps.LatLngBounds();
        points.forEach((p) => bounds.extend(p));
        if (osrmPath.length) osrmPath.forEach((p) => bounds.extend(p));
        map.fitBounds(bounds, 60);
      } else {
        map.setCenter(DEFAULT_CENTER);
        map.setZoom(DEFAULT_ZOOM);
      }
      setZoom(map.getZoom() ?? DEFAULT_ZOOM);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [devices, osrmPath],
  );

  const handleIdle = React.useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const currentZoom = map.getZoom() ?? DEFAULT_ZOOM;
    setZoom(currentZoom);
    if (!onMapIdle) return;
    const bounds = map.getBounds();
    if (!bounds) return;
    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();
    onMapIdle({ south: sw.lat(), west: sw.lng(), north: ne.lat(), east: ne.lng() }, currentZoom);
  }, [onMapIdle]);

  return (
    <div
      role="region"
      aria-label="Peta Operasional Google Maps"
      className="relative h-full w-full overflow-hidden bg-muted/10"
    >
      {!apiKey ? (
        <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
          Google Maps API key belum dikonfigurasi di .env.local
        </div>
      ) : loadError ? (
        <div className="flex h-full items-center justify-center text-xs text-red-600">
          Gagal memuat Google Maps: {loadError.message}
        </div>
      ) : !isLoaded ? (
        <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
          Memuat Google Maps...
        </div>
      ) : (
          <GoogleMap
            mapContainerClassName={`h-full w-full ${className || ""}`}
            center={DEFAULT_CENTER}
            zoom={DEFAULT_ZOOM}
            mapTypeId={mapType}
            onLoad={handleLoad}
            onIdle={handleIdle}
            options={{
              disableDefaultUI: false,
              mapTypeControl: false,
              fullscreenControl: false,
              streetViewControl: false,
            }}
          >
            {/* Kabel Optik (Route path_geojson) */}
            {showCables &&
              routePaths.map((path, index) => (
                <PolylineF
                  key={`route-${index}`}
                  path={path}
                  options={{
                    strokeColor: "#1d4ed8",
                    strokeOpacity: 0.75,
                    strokeWeight: 3,
                    zIndex: 2,
                  }}
                />
              ))}

            {/* Connections antar device */}
            {showConnections &&
              connectionPaths.map((connection) => (
                <PolylineF
                  key={`conn-${connection.id}`}
                  path={connection.path}
                  options={{
                    strokeColor: connection.impacted ? "#dc2626" : "#0f766e",
                    strokeOpacity: 0.9,
                    strokeWeight: connection.impacted ? 5 : 2,
                    zIndex: 1,
                  }}
                />
              ))}

            {/* OSRM Road Route */}
            {showOsrmRoute &&
              osrmPath.length > 1 && (
                <PolylineF
                  path={osrmPath}
                  options={{
                    strokeColor: "#2563eb",
                    strokeOpacity: 0.85,
                    strokeWeight: 5,
                    zIndex: 3,
                  }}
                />
              )}

            {/* Device Markers & Grouped Markers */}
            {showDevices && (
              <>
                {/* Single devices (memoized, rounded dynamic label badge when enabled & zoom >= 16) */}
                {singleDeviceGroups.map(({ device, markerStatus }) => {
                  const canShowLabel = showLabels && zoom >= 16;
                  const isSearched = searchedDeviceId === device.id;
                  const selIdx = (selectedDeviceIds || []).indexOf(device.id);
                  const isSelected = selIdx !== -1;
                  return (
                    <DeviceMarker
                      key={`${device.id}-${canShowLabel}-${isSelected}-${isSearched}`}
                      device={device}
                      icon={isSearched ? getIcon("searched") : getIcon(markerStatus)}
                      showLabel={canShowLabel}
                      homepassedConfig={homepassedConfig}
                      homepassedEnabled={homepassedEnabled}
                      buildingPois={buildingPois}
                      isSelected={isSelected}
                      selectionIndex={selIdx + 1}
                      isSearched={isSearched}
                      onClick={(d, isMulti) => onDeviceSelect?.(d, isMulti)}
                    />
                  );
                })}

                {/* Grouped devices at identical coordinates */}
                {multiDeviceGroups.map(({ key, lat, lng, items }) => (
                  <MarkerF
                    key={`group-${key}`}
                    position={{ lat, lng }}
                    icon={svgGroupMarker(items.length)}
                    title={`${items.length} device di lokasi ini (Klik untuk melihat daftar)`}
                    onClick={() => onGroupSelect?.(items)}
                  />
                ))}
              </>
            )}

            {/* OSRM start/end markers */}
            {showOsrmRoute && osrmRoute && osrmPath.length > 1 && (
              <>
                <MarkerF
                  position={osrmPath[0]}
                  icon={svgMarker("#3b82f6")}
                  title="Titik Awal Rute"
                />
                <MarkerF
                  position={osrmPath[osrmPath.length - 1]}
                  icon={svgMarker("#ef4444")}
                  title="Titik Akhir Rute"
                />
              </>
            )}

            {/* POI Overpass layer (telco infrastructure only) */}
            {showPoi &&
              poiMarkers
                .filter((p) => p.kind !== "building")
                .map((poi) => (
                  <MarkerF
                    key={poi.id}
                    position={{ lat: poi.lat, lng: poi.lng }}
                    icon={poiMarkerUrl}
                    title={poi.label}
                  />
                ))}

            {/* User GPS position */}
            {userGpsPosition && (
              <MarkerF position={userGpsPosition} icon={gpsMarkerUrl} title="Posisi GPS Anda" />
            )}

            {/* GIS Homepassed Coverage Union Polygon Layer */}
            {homepassedCoveragePolygon && (
              <PolygonF
                paths={geoJsonPolygonToGooglePaths(homepassedCoveragePolygon)}
                options={{
                  fillColor: "#06b6d4",
                  fillOpacity: 0.18,
                  strokeColor: "#10b981",
                  strokeOpacity: 0.85,
                  strokeWeight: 2,
                  clickable: false,
                  zIndex: 1,
                }}
              />
            )}

            {/* Geographic Address / Road Search Placemark (Minimal dot marker) */}
            {(searchLocation || searchSelection) && (() => {
              const loc = searchLocation || searchSelection;
              if (!loc) return null;
              // ponytail: titik ringkas native tooltip, skip overlay card DOM berat. Tambah popover interaktif hanya jika user butuh aksi lanjutan di titik
              return (
                <MarkerF
                  position={{ lat: loc.lat, lng: loc.lng }}
                  icon={searchDotIcon}
                  title={loc.label}
                  zIndex={10}
                  onClick={onClearSearchLocation}
                />
              );
            })()}
          </GoogleMap>
      )}

      {/* Floating Map Type Switcher */}
      <div className="absolute right-3 top-3 z-10 flex flex-col gap-1 rounded-2xl border border-border/40 bg-muted/10 p-1.5 shadow-xs backdrop-blur-md glass-inset">
        {([["Roadmap", "roadmap"], ["Satellite", "satellite"], ["Terrain", "terrain"]] as const).map(
          ([label, type]) => (
          <button
            key={type}
            type="button"
            onClick={() => setMapType(type)}
            className={`rounded-xl px-2.5 py-1 text-center font-mono text-[9px] uppercase tracking-[0.1em] transition-all duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98] ${
              mapType === type
                ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

function hasCoords(device?: MapDevice | null) {
  return Number.isFinite(Number(device?.longitude)) && Number.isFinite(Number(device?.latitude));
}

function extractLatLngPaths(route: MapRoute): FlatPoint[][] {
  const geometry = route.path_geojson as
    | { type?: string; coordinates?: unknown; features?: unknown[]; geometry?: { type?: string; coordinates?: unknown } }
    | undefined;
  if (!geometry) return [];
  const unwrapped = geometry.type === "Feature" ? geometry.geometry : geometry;
  if (!unwrapped || typeof unwrapped !== "object") return [];
  if (unwrapped.type === "Feature") return extractLatLngPaths({ ...route, path_geojson: unwrapped });
  if (unwrapped.type === "LineString" && Array.isArray(unwrapped.coordinates)) {
    const path = flattenCoords(unwrapped.coordinates);
    return path.length > 1 ? [path] : [];
  }
  if (unwrapped.type === "MultiLineString" && Array.isArray(unwrapped.coordinates)) {
    return (unwrapped.coordinates as unknown[])
      .map((line) => flattenCoords(line))
      .filter((path) => path.length > 1);
  }
  return [];
}

function flattenCoords(value: unknown): FlatPoint[] {
  if (!Array.isArray(value)) return [];
  return (value as unknown[])
    .map((coord) => {
      if (!Array.isArray(coord) || coord.length < 2) return null;
      const lng = Number(coord[0]);
      const lat = Number(coord[1]);
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
      return { lat, lng };
    })
    .filter((point): point is FlatPoint => point !== null);
}

function geoJsonPolygonToGooglePaths(
  feature?: Feature<Polygon | MultiPolygon> | null
): Array<Array<{ lat: number; lng: number }>> {
  if (!feature || !feature.geometry) return [];
  const paths: Array<Array<{ lat: number; lng: number }>> = [];

  if (feature.geometry.type === "Polygon") {
    feature.geometry.coordinates.forEach((ring) => {
      paths.push(ring.map(([lng, lat]) => ({ lat, lng })));
    });
  } else if (feature.geometry.type === "MultiPolygon") {
    feature.geometry.coordinates.forEach((poly) => {
      poly.forEach((ring) => {
        paths.push(ring.map(([lng, lat]) => ({ lat, lng })));
      });
    });
  }
  return paths;
}