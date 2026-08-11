"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";

type MapStatusDockProps = {
  activeDevicesCount: number;
  activeRoutesCount: number;
  activeConnectionsCount: number;
  osrmStatus?: "ready" | "loading" | "error";
  cursorCoords?: { lat: number; lng: number } | null;
};

export function MapStatusDock({
  activeDevicesCount,
  activeRoutesCount,
  activeConnectionsCount,
  osrmStatus = "ready",
  cursorCoords,
}: MapStatusDockProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/60 bg-card/90 px-3 py-2 text-xs shadow-2xs backdrop-blur-md glass-inset">
      <div className="flex items-center gap-3">
        <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
          Active Layer:
        </span>
        <div className="flex items-center gap-2 font-mono tabular-nums text-[10px]">
          <Badge variant="outline" className="h-5 rounded-full px-2 text-[10px]">
            {activeDevicesCount} Device
          </Badge>
          <Badge variant="outline" className="h-5 rounded-full px-2 text-[10px]">
            {activeRoutesCount} Route
          </Badge>
          <Badge variant="outline" className="h-5 rounded-full px-2 text-[10px]">
            {activeConnectionsCount} Connection
          </Badge>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {cursorCoords && (
          <div className="hidden items-center gap-1.5 font-mono text-[10px] tabular-nums text-muted-foreground sm:flex">
            <span>LNG: {cursorCoords.lng.toFixed(5)}</span>
            <span>LAT: {cursorCoords.lat.toFixed(5)}</span>
          </div>
        )}

        <div className="flex items-center gap-1.5 font-mono text-[10px]">
          <span className="text-muted-foreground">OSRM Engine:</span>
          <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {osrmStatus === "ready" ? "READY (ONLINE)" : osrmStatus === "loading" ? "CALCULATING..." : "ERROR"}
          </span>
        </div>
      </div>
    </div>
  );
}
