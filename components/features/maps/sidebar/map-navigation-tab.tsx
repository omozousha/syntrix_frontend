"use client";

import * as React from "react";
import {
  Navigation,
  MapPin,
  RotateCcw,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ButtonLoader } from "@/components/shared/loading-icon";
import type { OsgmRouteResult } from "@/lib/api";
import type { MapDevice } from "../topology-map-canvas";

type Option = { value: string; label: string };

interface MapNavigationTabProps {
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
  devices: MapDevice[];
  deviceOptions: Option[];
}

export function MapNavigationTab({
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
  devices,
  deviceOptions,
}: MapNavigationTabProps) {
  return (
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
            {isGpsLoading ? (
              <ButtonLoader className="mr-1 size-3" />
            ) : (
              <MapPin className="mr-1 size-3 text-primary" />
            )}
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
          {isRouteLoading ? (
            <ButtonLoader className="mr-1.5" />
          ) : (
            <Navigation className="mr-1.5 size-3.5" />
          )}
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
  );
}
