"use client";

import * as React from "react";
import { AlertTriangle } from "lucide-react";
import type { MapDevice } from "../topology-map-canvas";

interface MapOverviewTabProps {
  devices: MapDevice[];
  devicesWithoutCoords: MapDevice[];
}

export function MapOverviewTab({
  devices,
  devicesWithoutCoords,
}: MapOverviewTabProps) {
  const validCoordsCount = devices.length - devicesWithoutCoords.length;

  return (
    <div className="space-y-2 text-xs">
      <div className="rounded-xl border border-border/60 bg-muted/20 p-2.5 space-y-1.5">
        <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground block">
          Data Quality Status
        </span>
        <div className="flex items-center justify-between font-mono tabular-nums text-xs">
          <span>Koordinat Valid:</span>
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
            {validCoordsCount} / {devices.length}
          </span>
        </div>
      </div>

      {devicesWithoutCoords.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-2.5 dark:border-amber-900/40 dark:bg-amber-950/20 space-y-1">
          <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300 font-medium">
            <AlertTriangle className="size-3.5 shrink-0" />
            <span>{devicesWithoutCoords.length} Device Tanpa Koordinat</span>
          </div>
          <p className="text-[11px] text-amber-700 dark:text-amber-400">
            Beberapa device belum memiliki bujur &amp; lintang valid.
          </p>
        </div>
      )}
    </div>
  );
}
