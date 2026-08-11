"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { Navigation, MapPin, ExternalLink, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useOsrmRouting } from "@/hooks/use-osrm-routing";
import type { OsgmRouteResult } from "@/lib/api";

const GoogleMapsCanvas = dynamic(
  () =>
    import("@/components/features/maps/google-maps-canvas").then(
      (mod) => mod.GoogleMapsCanvas,
    ),
  { ssr: false, loading: () => <div className="flex h-64 items-center justify-center text-xs text-muted-foreground">Memuat Google Maps...</div> },
);

type DeviceNavigationModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token: string;
  deviceId: string;
  deviceName?: string | null;
  deviceLat: number;
  deviceLng: number;
};

export function DeviceNavigationModal({
  open,
  onOpenChange,
  token,
  deviceId,
  deviceName,
  deviceLat,
  deviceLng,
}: DeviceNavigationModalProps) {
  const {
    origin,
    setOriginFromGps,
    gpsLoading,
    route,
    loading: isRouteLoading,
    error: routeError,
    calculateRoute,
    clearRoute,
    setDestination,
  } = useOsrmRouting(token);

  // Set the destination to this device on mount
  React.useEffect(() => {
    if (open) {
      setDestination({
        id: deviceId,
        name: deviceName || "Device Tujuan",
        latitude: deviceLat,
        longitude: deviceLng,
        type: "device",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, deviceId, deviceLat, deviceLng]);

  const deviceNode = React.useMemo(
    () => [{ id: deviceId, latitude: deviceLat, longitude: deviceLng }],
    [deviceId, deviceLat, deviceLng],
  );

  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${deviceLat},${deviceLng}`;
  const wazeUrl = `https://waze.com/ul?ll=${deviceLat},${deviceLng}&navigate=yes`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Navigation className="size-5 text-primary" />
            Navigasi ke {deviceName || "Device"}
          </DialogTitle>
          <DialogDescription>
            Hitung rute jalan raya dari posisi Anda (GPS) ke lokasi device menggunakan OSRM.
          </DialogDescription>
        </DialogHeader>

        {/* Peta Mini */}
        <div className="h-56 w-full overflow-hidden rounded-xl border border-border/60 bg-muted/10">
          <GoogleMapsCanvas
            devices={deviceNode as any}
            routes={[]}
            connections={[]}
            osrmRoute={route}
            showConnections={false}
          />
        </div>

        {/* Action Row */}
        <div className="flex flex-col gap-3 sm:flex-row">
          {/* GPS + Calculate */}
          <div className="flex flex-1 flex-col gap-2">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full font-mono text-[9px] uppercase tracking-[0.1em]"
                onClick={setOriginFromGps}
                disabled={gpsLoading}
              >
                {gpsLoading ? <Loader2 className="mr-1 size-3 animate-spin" /> : <MapPin className="mr-1 size-3 text-primary" />}
                {origin ? "Update GPS" : "Gunakan GPS Saya"}
              </Button>
              {origin && (
                <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
                  {origin.latitude.toFixed(5)}, {origin.longitude.toFixed(5)}
                </span>
              )}
            </div>
            <Button
              type="button"
              disabled={!origin || isRouteLoading}
              onClick={calculateRoute}
              className="w-full rounded-full font-mono text-[10px] uppercase tracking-[0.12em] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
            >
              {isRouteLoading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Navigation className="mr-2 size-4" />}
              Hitung Rute OSRM
            </Button>
          </div>

          {/* Native Maps Links */}
          <div className="flex flex-1 flex-col gap-2">
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center justify-center gap-2 rounded-full border border-border/60 px-4 font-mono text-[10px] uppercase tracking-[0.1em] transition-all hover:bg-muted active:scale-[0.98]"
            >
              <ExternalLink className="size-3.5 text-blue-500" />
              Google Maps
            </a>
            <a
              href={wazeUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center justify-center gap-2 rounded-full border border-border/60 px-4 font-mono text-[10px] uppercase tracking-[0.1em] transition-all hover:bg-muted active:scale-[0.98]"
            >
              <ExternalLink className="size-3.5 text-cyan-500" />
              Waze
            </a>
          </div>
        </div>

        {/* Route Result */}
        {routeError && (
          <p className="rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700 dark:bg-red-950/30 dark:text-red-300">
            {routeError}
          </p>
        )}
        {route && (
          <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
            <div className="flex items-center gap-6 font-mono tabular-nums">
              <div className="text-center">
                <span className="text-[9px] uppercase tracking-[0.12em] text-muted-foreground block">Jarak</span>
                <span className="text-base font-semibold text-primary">{route.distance_km} km</span>
              </div>
              <div className="text-center">
                <span className="text-[9px] uppercase tracking-[0.12em] text-muted-foreground block">Estimasi</span>
                <span className="text-base font-semibold text-emerald-600">{route.duration_minutes} min</span>
              </div>
              <div className="text-center">
                <span className="text-[9px] uppercase tracking-[0.12em] text-muted-foreground block">Langkah</span>
                <span className="text-base font-semibold">{route.steps.length}</span>
              </div>
            </div>
            <Button type="button" variant="ghost" size="icon" onClick={clearRoute} className="rounded-full" title="Reset Rute">
              <RotateCcw className="size-4" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
