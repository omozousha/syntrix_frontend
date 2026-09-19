"use client";

import * as React from "react";
import {
  Navigation,
  MapPin,
  RotateCcw,
  ExternalLink,
  ChevronRight,
  CornerUpLeft,
  CornerUpRight,
  ArrowUpLeft,
  ArrowUpRight,
  ArrowUp,
  RotateCw,
  Flag,
  Compass,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { ButtonLoader } from "@/components/shared/loading-icon";
import type { OsgmRouteResult, OsgmRouteStep } from "@/lib/api";
import type { MapDevice } from "../topology-map-canvas";
import { cn } from "@/lib/utils";

type Option = { value: string; label: string };

export interface MapNavigationTabProps {
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
  onPanToLocation?: (loc: { lat: number; lng: number }) => void;
}

function getManeuverIcon(type?: string, modifier?: string) {
  const mod = (modifier || "").toLowerCase();
  const typ = (type || "").toLowerCase();

  if (typ === "arrive" || typ === "destination") return <Flag className="size-3.5 text-rose-500" />;
  if (typ === "roundabout" || typ === "rotary") return <RotateCw className="size-3.5 text-primary" />;
  if (mod.includes("uturn")) return <RotateCcw className="size-3.5 text-amber-500" />;
  if (mod.includes("sharp left") || mod === "left") return <CornerUpLeft className="size-3.5 text-primary" />;
  if (mod.includes("slight left")) return <ArrowUpLeft className="size-3.5 text-primary" />;
  if (mod.includes("sharp right") || mod === "right") return <CornerUpRight className="size-3.5 text-primary" />;
  if (mod.includes("slight right")) return <ArrowUpRight className="size-3.5 text-primary" />;
  if (mod.includes("straight") || typ === "continue" || typ === "new name") return <ArrowUp className="size-3.5 text-primary" />;
  return <Compass className="size-3.5 text-primary" />;
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
  onPanToLocation,
}: MapNavigationTabProps) {
  const [activeStepIndex, setActiveStepIndex] = React.useState<number | null>(null);

  const handleStepClick = (step: OsgmRouteStep) => {
    setActiveStepIndex(step.index);
    if (step.location && Number.isFinite(step.location[0]) && Number.isFinite(step.location[1])) {
      // step.location is [longitude, latitude]
      onPanToLocation?.({ lat: step.location[1], lng: step.location[0] });
    }
  };

  return (
    <div className="space-y-3 text-xs">
      {/* 1. Origin & Destination Input Group */}
      <div className="rounded-xl border border-border/60 bg-card p-2.5 shadow-2xs glass-inset space-y-2.5">
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">
              Titik Asal
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
          <div className="rounded-lg border border-border/50 bg-muted/20 px-2 py-1 font-mono text-[11px] flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-blue-500 animate-ping shrink-0" />
            <span className="truncate font-medium text-foreground">{originName}</span>
          </div>
        </div>

        <div className="space-y-1">
          <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">
            Perangkat Tujuan
          </span>
          <Combobox
            value={selectedDestination?.id || ""}
            onValueChange={(val) => {
              const dev = devices.find((d) => d.id === val);
              if (dev) onSelectDestinationDevice(dev);
            }}
            options={deviceOptions}
            placeholder="Pilih target perangkat..."
            searchPlaceholder="Cari nama perangkat..."
          />
        </div>

        <div className="flex items-center gap-2 pt-0.5">
          <Button
            type="button"
            onClick={onCalculateRoute}
            disabled={!selectedDestination || isRouteLoading}
            className="flex-1 rounded-full font-mono text-[9px] font-bold uppercase tracking-[0.12em] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
          >
            {isRouteLoading ? (
              <ButtonLoader className="mr-1.5" />
            ) : (
              <Navigation className="mr-1.5 size-3.5" />
            )}
            Hitung Rute Jalan
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
      </div>

      {/* Error Banner */}
      {routeError && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-2 text-red-600 dark:text-red-300 text-[11px] font-mono">
          {routeError}
        </div>
      )}

      {/* 2. Calculated Route KPIs & Direct Apps */}
      {routeResult && (
        <div className="space-y-2.5">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-border/60 bg-muted/20 p-2 text-center shadow-2xs glass-inset">
              <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-muted-foreground block">
                Total Jarak Rute
              </span>
              <span className="font-mono text-base font-bold tabular-nums text-primary">
                {routeResult.distance_km} <span className="text-xs font-normal">km</span>
              </span>
            </div>
            <div className="rounded-xl border border-border/60 bg-muted/20 p-2 text-center shadow-2xs glass-inset">
              <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-muted-foreground block">
                Estimasi Tempuh
              </span>
              <span className="font-mono text-base font-bold tabular-nums text-emerald-500">
                {routeResult.duration_minutes} <span className="text-xs font-normal">menit</span>
              </span>
            </div>
          </div>

          {selectedDestination?.latitude && selectedDestination?.longitude && (
            <div className="flex items-center gap-1.5">
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${selectedDestination.latitude},${selectedDestination.longitude}`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg border border-border/60 bg-background py-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-foreground hover:bg-muted active:scale-[0.98] transition-all shadow-xs"
              >
                <ExternalLink className="size-3 text-blue-500" />
                Google Maps
              </a>
              <a
                href={`https://waze.com/ul?ll=${selectedDestination.latitude},${selectedDestination.longitude}&navigate=yes`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg border border-border/60 bg-background py-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-foreground hover:bg-muted active:scale-[0.98] transition-all shadow-xs"
              >
                <ExternalLink className="size-3 text-cyan-500" />
                Waze
              </a>
            </div>
          )}

          {/* 3. Structured Turn-by-Turn Guidance */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                Panduan Belokan ({routeResult.steps.length} Langkah)
              </span>
              <span className="font-mono text-[8px] text-muted-foreground">
                Klik baris untuk fokus peta
              </span>
            </div>

            <div className="space-y-1.5 max-h-[340px] overflow-y-auto thin-scrollbar pr-0.5">
              {routeResult.steps.map((step) => {
                const isArrive = (step.type || "").toLowerCase() === "arrive";
                const isSelected = activeStepIndex === step.index;

                return (
                  <div
                    key={step.index}
                    onClick={() => handleStepClick(step)}
                    className={cn(
                      "flex items-start gap-2 rounded-xl border p-2 text-[11px] cursor-pointer transition-all duration-200 active:scale-[0.98]",
                      isSelected
                        ? "border-primary bg-primary/10 shadow-xs"
                        : "border-border/50 bg-muted/15 hover:border-border/80 hover:bg-muted/30",
                      isArrive && "border-rose-500/30 bg-rose-500/5",
                    )}
                  >
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-card/90 shadow-2xs">
                      {getManeuverIcon(step.type, step.modifier)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground leading-snug">
                        {step.instruction || "Lanjutkan perjalanan"}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 font-mono text-[9px] text-muted-foreground tabular-nums">
                        <span>{step.distance_m >= 1000 ? `${(step.distance_m / 1000).toFixed(1)} km` : `${step.distance_m} m`}</span>
                        {step.duration_s > 0 && (
                          <>
                            <span>•</span>
                            <span>{Math.round(step.duration_s / 60) || 1} mnt</span>
                          </>
                        )}
                        {step.location && (
                          <span className="ml-auto text-[8px] text-primary/70">Fokus ↗</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {!routeResult && (
        <div className="rounded-xl border border-dashed border-border/60 bg-muted/10 p-3 text-center text-muted-foreground space-y-1">
          <Navigation className="size-4 mx-auto text-primary/60 mb-1" />
          <p className="font-mono text-[9px] uppercase tracking-wider font-semibold text-foreground">
            Belum Ada Rute Aktif
          </p>
          <p className="text-[10px] text-muted-foreground">
            Pilih perangkat tujuan di atas lalu klik &ldquo;Hitung Rute Jalan&rdquo; untuk memunculkan panduan belokan navigasi.
          </p>
        </div>
      )}
    </div>
  );
}

// ponytail: turn-by-turn interactive OSRM route guidance. Click step pans camera to maneuver coordinates.
