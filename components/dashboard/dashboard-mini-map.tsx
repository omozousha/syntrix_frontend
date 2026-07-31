"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useState } from "react";
import { useTheme } from "@/lib/use-theme";

type MapMarker = {
  id: string;
  lat: number;
  lng: number;
  label: string;
  type: "pop" | "odp";
  deviceCount?: number;
};

const POP_ICON = L.divIcon({
  className: "",
  html: `<div style="width:14px;height:14px;border-radius:50%;background:#0EA5E9;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.3)"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const ODP_ICON = L.divIcon({
  className: "",
  html: `<div style="width:12px;height:12px;border-radius:50%;background:#22C55E;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.3)"></div>`,
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

export function DashboardMiniMap({
  title,
  description,
  markers,
  loading = false,
  defaultCenter = [-6.2088, 106.8456],
  defaultZoom = 10,
}: {
  title: string;
  description: string;
  markers: MapMarker[];
  loading?: boolean;
  defaultCenter?: [number, number];
  defaultZoom?: number;
}) {
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  const tileUrl = resolvedTheme === "dark"
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

  return (
    <Card className="min-w-0 overflow-hidden">
      <CardHeader className="p-3 pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <Skeleton className="h-[240px] w-full rounded-none" />
        ) : mounted && markers.length ? (
          <div className="h-[240px] w-full">
            <MapContainer
              center={defaultCenter}
              zoom={defaultZoom}
              scrollWheelZoom={false}
              style={{ height: "100%", width: "100%" }}
              attributionControl={false}
            >
              <TileLayer
                url={tileUrl}
              />
              {markers.map((m) => (
                <Marker
                  key={m.id}
                  position={[m.lat, m.lng]}
                  icon={m.type === "pop" ? POP_ICON : ODP_ICON}
                >
                  <Popup>
                    <div className="text-xs">
                      <strong>{m.label}</strong>
                      {m.deviceCount != null ? <div>Devices: {m.deviceCount}</div> : null}
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        ) : (
          <div className="flex h-[240px] items-center justify-center rounded-none border-t text-sm text-muted-foreground">
            {mounted ? "Tidak ada data geografis untuk ditampilkan." : "Memuat peta..."}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export type { MapMarker };