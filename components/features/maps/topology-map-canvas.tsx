"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

export type MapDevice = {
  id: string;
  device_id?: string | null;
  device_name?: string | null;
  device_type_key?: string | null;
  marker_status?: string | null;
  longitude?: number | null;
  latitude?: number | null;
  has_coordinates?: boolean;
};

export type MapRoute = {
  id: string;
  route_name?: string | null;
  route_code?: string | null;
  path_geojson?: unknown;
  has_geometry?: boolean;
};

export type MapConnection = {
  id: string;
  connection_id?: string | null;
  from_device?: MapDevice | null;
  to_device?: MapDevice | null;
};

type TopologyMapCanvasProps = {
  devices: MapDevice[];
  routes: MapRoute[];
  connections: MapConnection[];
  impactedDeviceIds?: string[];
  impactedConnectionIds?: string[];
};

const BASE_STYLE = {
  version: 8 as const,
  sources: {
    osm: {
      type: "raster" as const,
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [{ id: "osm", type: "raster" as const, source: "osm" }],
};

export function TopologyMapCanvas({
  devices,
  routes,
  connections,
  impactedDeviceIds = [],
  impactedConnectionIds = [],
}: TopologyMapCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: BASE_STYLE,
      center: [117, -2.5],
      zoom: 4,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    map.on("load", () => {
      const impactedDevices = new Set(impactedDeviceIds);
      const impactedConnections = new Set(impactedConnectionIds);
      const deviceFeatures = devices
        .filter(hasCoordinates)
        .map((device) => ({
          type: "Feature" as const,
          geometry: {
            type: "Point" as const,
            coordinates: [Number(device.longitude), Number(device.latitude)],
          },
          properties: {
            id: device.id,
            label: device.device_name || device.device_id || device.device_type_key || "Device",
            marker_status: impactedDevices.has(device.id) ? "impacted" : device.marker_status || "unvalidated",
          },
        }));
      const routeFeatures = routes.flatMap(toRouteFeatures);
      const connectionFeatures = connections
        .filter((connection) => hasCoordinates(connection.from_device) && hasCoordinates(connection.to_device))
        .map((connection) => ({
          type: "Feature" as const,
          geometry: {
            type: "LineString" as const,
            coordinates: [
              [Number(connection.from_device?.longitude), Number(connection.from_device?.latitude)],
              [Number(connection.to_device?.longitude), Number(connection.to_device?.latitude)],
            ],
          },
          properties: {
            id: connection.id,
            impacted: impactedConnections.has(connection.id),
          },
        }));

      map.addSource("routes", { type: "geojson", data: { type: "FeatureCollection", features: routeFeatures } });
      map.addLayer({
        id: "routes",
        type: "line",
        source: "routes",
        paint: { "line-color": "#2563eb", "line-width": 3, "line-opacity": 0.75 },
      });
      map.addSource("connections", { type: "geojson", data: { type: "FeatureCollection", features: connectionFeatures } });
      map.addLayer({
        id: "connections",
        type: "line",
        source: "connections",
        paint: {
          "line-color": ["case", ["==", ["get", "impacted"], true], "#dc2626", "#0f766e"],
          "line-width": ["case", ["==", ["get", "impacted"], true], 5, 2],
          "line-opacity": 0.9,
        },
      });
      map.addSource("devices", { type: "geojson", data: { type: "FeatureCollection", features: deviceFeatures } });
      map.addLayer({
        id: "devices",
        type: "circle",
        source: "devices",
        paint: {
          "circle-radius": 7,
          "circle-color": [
            "match",
            ["get", "marker_status"],
            "impacted", "#dc2626",
            "critical", "#dc2626",
            "warning", "#d97706",
            "healthy", "#16a34a",
            "#64748b",
          ],
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 2,
        },
      });

      map.on("click", "devices", (event) => {
        const feature = event.features?.[0];
        const coordinates = (feature?.geometry as { coordinates?: [number, number] } | undefined)?.coordinates;
        if (!coordinates) return;
        const popupContent = document.createElement("div");
        popupContent.className = "text-sm font-medium";
        popupContent.textContent = String(feature?.properties?.label || "Device");
        new maplibregl.Popup({ offset: 10 }).setLngLat(coordinates).setDOMContent(popupContent).addTo(map);
      });
      map.on("mouseenter", "devices", () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", "devices", () => { map.getCanvas().style.cursor = ""; });

      if (deviceFeatures.length) {
        const bounds = new maplibregl.LngLatBounds();
        deviceFeatures.forEach((feature) => bounds.extend(feature.geometry.coordinates as [number, number]));
        map.fitBounds(bounds, { padding: 48, maxZoom: 15, duration: 0 });
      }
    });

    return () => map.remove();
  }, [connections, devices, impactedConnectionIds, impactedDeviceIds, routes]);

  return <div ref={containerRef} className="h-full min-h-[320px] w-full md:min-h-[420px]" aria-label="Topology operational map" />;
}

function hasCoordinates(device?: MapDevice | null) {
  return Number.isFinite(Number(device?.longitude)) && Number.isFinite(Number(device?.latitude));
}

function toRouteFeatures(route: MapRoute) {
  const value = route.path_geojson;
  if (!value || typeof value !== "object") return [];
  const candidate = value as { type?: string; geometry?: unknown; features?: unknown[]; coordinates?: unknown };
  const properties = { id: route.id, label: route.route_name || route.route_code || "Route" };

  if (candidate.type === "FeatureCollection" && Array.isArray(candidate.features)) {
    return candidate.features.flatMap((feature) => normalizeLineFeature(feature, properties));
  }
  return normalizeLineFeature(candidate, properties);
}

function normalizeLineFeature(value: unknown, properties: Record<string, string>) {
  if (!value || typeof value !== "object") return [];
  const candidate = value as { type?: string; geometry?: unknown; coordinates?: unknown };
  if (candidate.type === "Feature") return normalizeLineFeature(candidate.geometry, properties);
  if (!['LineString', 'MultiLineString'].includes(String(candidate.type)) || !Array.isArray(candidate.coordinates)) return [];
  return [{
    type: "Feature" as const,
    geometry: { type: candidate.type as "LineString" | "MultiLineString", coordinates: candidate.coordinates },
    properties,
  }];
}
