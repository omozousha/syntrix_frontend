"use client";

import * as React from "react";
import {
  GoogleMap,
  useJsApiLoader,
  MarkerF,
  InfoWindow,
  PolylineF,
} from "@react-google-maps/api";
import type { OsgmRouteResult } from "@/lib/api";
import type { MapConnection, MapDevice, MapRoute } from "./topology-map-canvas";

export type OverpassPOI = {
  id: number;
  lat: number;
  lng: number;
  label: string;
  kind: "mast" | "pole" | "utility";
};

export type GoogleMapsCanvasProps = {
  devices: MapDevice[];
  routes: MapRoute[];
  connections: MapConnection[];
  impactedDeviceIds?: string[];
  impactedConnectionIds?: string[];
  osrmRoute?: OsgmRouteResult | null;
  poiMarkers?: OverpassPOI[];
  userGpsPosition?: { lat: number; lng: number } | null;
  searchSelection?: { lat: number; lng: number; label: string } | null;
  showDevices?: boolean;
  showLabels?: boolean;
  showCables?: boolean;
  showConnections?: boolean;
  showOsrmRoute?: boolean;
  showPoi?: boolean;
  onDeviceSelect?: (device: MapDevice) => void;
  onMapIdle?: (bounds: { south: number; west: number; north: number; east: number }) => void;
  className?: string;
};

const DEFAULT_CENTER = { lat: -6.2, lng: 106.816 };
const DEFAULT_ZOOM = 10;

const MARKER_COLORS: Record<string, string> = {
  healthy: "#16a34a",
  warning: "#d97706",
  critical: "#dc2626",
  impacted: "#dc2626",
  unvalidated: "#64748b",
};

const fallbackColor = "#64748b";

function svgMarker(color: string): string {
  const encoded = encodeURIComponent(color);
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
       <circle cx="14" cy="14" r="10" fill="${encoded}" stroke="#ffffff" stroke-width="2.5"/>
       <circle cx="14" cy="14" r="4" fill="#ffffff" fill-opacity="0.85"/>
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

type FlatPoint = { lat: number; lng: number };

// Memoized individual Device Marker component to prevent unnecessary repaints
const DeviceMarker = React.memo(
  ({
    device,
    icon,
    showLabel,
    onClick,
  }: {
    device: MapDevice;
    icon: google.maps.Icon | string;
    showLabel: boolean;
    onClick: (device: MapDevice) => void;
  }) => {
    const lat = Number(device.latitude);
    const lng = Number(device.longitude);
    const labelText = device.device_name || device.device_id || "";

    const markerLabel = React.useMemo(() => {
      if (!showLabel || !labelText) return undefined;
      return {
        text: labelText,
        color: "#1e293b",
        fontSize: "10px",
        fontWeight: "500",
        fontFamily: "monospace",
      };
    }, [showLabel, labelText]);

    return (
      <MarkerF
        position={{ lat, lng }}
        icon={icon}
        title={labelText || device.device_type_key || ""}
        label={markerLabel}
        onClick={() => onClick(device)}
      />
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
  userGpsPosition,
  searchSelection,
  showDevices = true,
  showLabels = true,
  showCables = true,
  showConnections = true,
  showOsrmRoute = true,
  showPoi = false,
  onDeviceSelect,
  onMapIdle,
  className,
}: GoogleMapsCanvasProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
  const { isLoaded, loadError } = useJsApiLoader({ googleMapsApiKey: apiKey, id: "google-maps-script" });
  const mapRef = React.useRef<google.maps.Map | null>(null);
  const [mapType, setMapType] = React.useState<string>("roadmap");
  const [selectedDevice, setSelectedDevice] = React.useState<MapDevice | null>(null);
  const [zoom, setZoom] = React.useState<number>(DEFAULT_ZOOM);

  // Icons memoized once per marker status (avoids `new google.maps.Size/Point` on every render)
  const deviceIcons = React.useMemo(() => {
    if (typeof google === "undefined") return {};
    const entries = Object.entries(MARKER_COLORS).map(([status, color]) => [
      status,
      {
        url: svgMarker(color),
        scaledSize: new google.maps.Size(28, 28),
        anchor: new google.maps.Point(14, 14),
        labelOrigin: new google.maps.Point(14, -10),
      } as google.maps.Icon,
    ]);
    return Object.fromEntries(entries);
  }, []);

  // Auto-panTo when searchSelection changes
  React.useEffect(() => {
    if (searchSelection && mapRef.current) {
      mapRef.current.panTo({ lat: searchSelection.lat, lng: searchSelection.lng });
      mapRef.current.setZoom(15);
    }
  }, [searchSelection]);

  const deviceFeatures = React.useMemo(() => {
    return devices
      .filter((device) => Number.isFinite(Number(device.longitude)) && Number.isFinite(Number(device.latitude)))
      .map((device) => {
        const markerStatus = impactedDeviceIds.includes(device.id)
          ? "impacted"
          : device.marker_status || "unvalidated";
        return { device, markerStatus };
      });
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
      const points: FlatPoint[] = deviceFeatures.map(({ device }) => ({
        lat: Number(device.latitude),
        lng: Number(device.longitude),
      }));
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
    [deviceFeatures, osrmPath],
  );

  const handleIdle = React.useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    setZoom(map.getZoom() ?? DEFAULT_ZOOM);
    if (!onMapIdle) return;
    const bounds = map.getBounds();
    if (!bounds) return;
    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();
    onMapIdle({ south: sw.lat(), west: sw.lng(), north: ne.lat(), east: ne.lng() });
  }, [onMapIdle]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-muted/10">
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
            onClick={() => setSelectedDevice(null)}
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

            {/* Device Markers (memoized, labels shown only when enabled & zoom >= 13) */}
            {showDevices &&
              deviceFeatures.map(({ device, markerStatus }) => (
                <DeviceMarker
                  key={device.id}
                  device={device}
                  icon={deviceIcons[markerStatus] || svgMarker(MARKER_COLORS[markerStatus] || fallbackColor)}
                  showLabel={showLabels && zoom >= 13}
                  onClick={(d) => setSelectedDevice(d)}
                />
              ))}

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

            {/* POI Overpass layer */}
            {showPoi &&
              poiMarkers.map((poi) => (
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

            {/* Nominatim search result */}
            {searchSelection && (
              <MarkerF
                position={{ lat: searchSelection.lat, lng: searchSelection.lng }}
                icon={svgMarker("#8b5cf6")}
                title={searchSelection.label}
              />
            )}

            {/* Device InfoWindow */}
            {selectedDevice && (
              <InfoWindow
                position={{
                  lat: Number(selectedDevice.latitude),
                  lng: Number(selectedDevice.longitude),
                }}
                onCloseClick={() => setSelectedDevice(null)}
              >
                <div className="max-w-[220px] text-sm">
                  <p className="font-semibold leading-tight">
                    {selectedDevice.device_name || selectedDevice.device_id || "Device"}
                  </p>
                  <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wide text-gray-500">
                    {selectedDevice.device_type_key || "ASSET"}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      onDeviceSelect?.(selectedDevice);
                      setSelectedDevice(null);
                    }}
                    className="mt-2 w-full rounded-full border border-blue-600 bg-blue-600 px-3 py-1 text-[11px] font-medium text-white transition-transform active:scale-[0.98]"
                  >
                    Navigasi ke Sini
                  </button>
                </div>
              </InfoWindow>
            )}
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