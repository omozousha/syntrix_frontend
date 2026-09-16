"use client";

import * as React from "react";
import { Layers } from "lucide-react";
import { Switch } from "@/components/ui/switch";

export type LayerToggles = {
  devices: boolean;
  labels: boolean;
  cables: boolean;
  connections: boolean;
  poi: boolean;
};

export interface MapLayersSectionProps {
  layerToggles: LayerToggles;
  onToggleLayer: (key: keyof LayerToggles) => void;
}

export function MapLayersSection({
  layerToggles,
  onToggleLayer,
}: MapLayersSectionProps) {
  return (
    <div className="space-y-2 pt-1 border-t border-border/40">
      <div className="flex items-center gap-1.5">
        <Layers className="size-3.5 text-primary" />
        <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground font-semibold">
          Layer Toggles
        </span>
      </div>
      <div className="grid grid-cols-2 gap-1.5 font-mono text-[10px]">
        <label className="flex items-center justify-between rounded-lg border border-border/60 p-2 cursor-pointer hover:bg-muted/40 transition-colors">
          <span>Devices</span>
          <Switch
            checked={layerToggles.devices}
            onCheckedChange={() => onToggleLayer("devices")}
          />
        </label>
        <label className="flex items-center justify-between rounded-lg border border-border/60 p-2 cursor-pointer hover:bg-muted/40 transition-colors">
          <span>Label Nama</span>
          <Switch
            checked={layerToggles.labels}
            onCheckedChange={() => onToggleLayer("labels")}
          />
        </label>
        <label className="flex items-center justify-between rounded-lg border border-border/60 p-2 cursor-pointer hover:bg-muted/40 transition-colors">
          <span>Kabel Fiber</span>
          <Switch
            checked={layerToggles.cables}
            onCheckedChange={() => onToggleLayer("cables")}
          />
        </label>
        <label className="flex items-center justify-between rounded-lg border border-border/60 p-2 cursor-pointer hover:bg-muted/40 transition-colors">
          <span>Connections</span>
          <Switch
            checked={layerToggles.connections}
            onCheckedChange={() => onToggleLayer("connections")}
          />
        </label>
        <label className="flex items-center justify-between rounded-lg border border-border/60 p-2 cursor-pointer hover:bg-muted/40 transition-colors">
          <span>POI Overpass</span>
          <Switch
            checked={layerToggles.poi}
            onCheckedChange={() => onToggleLayer("poi")}
          />
        </label>
      </div>
    </div>
  );
}
