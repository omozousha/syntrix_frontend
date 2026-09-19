"use client";

import * as React from "react";
import { Layers, Radio, Tag, Cable, Network, Building } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export type LayerToggles = {
  devices: boolean;
  labels: boolean;
  cables: boolean;
  connections: boolean;
  poi: boolean;
};

export type MapFloatingLayersControlProps = {
  layerToggles: LayerToggles;
  onToggleLayer: (key: keyof LayerToggles) => void;
  className?: string;
};

const LAYER_CONFIGS: Array<{
  key: keyof LayerToggles;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    key: "devices",
    label: "Perangkat Jaringan",
    description: "ODP, ODC, OLT, Closure",
    icon: Radio,
  },
  {
    key: "labels",
    label: "Label Nama",
    description: "Nama perangkat di zoom >= 16",
    icon: Tag,
  },
  {
    key: "cables",
    label: "Kabel Fiber Optik",
    description: "Jalur kabel & kapasitas core",
    icon: Cable,
  },
  {
    key: "connections",
    label: "Koneksi Port-to-Port",
    description: "Garis relasi perangkat",
    icon: Network,
  },
  {
    key: "poi",
    label: "Bangunan & Tiang POI",
    description: "Data OpenStreetMap",
    icon: Building,
  },
];

export function MapFloatingLayersControl({
  layerToggles,
  onToggleLayer,
  className,
}: MapFloatingLayersControlProps) {
  const [open, setOpen] = React.useState(false);

  const activeCount = React.useMemo(() => {
    return Object.values(layerToggles).filter(Boolean).length;
  }, [layerToggles]);

  return (
    <div className={className}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "relative flex size-9 items-center justify-center rounded-full border border-border/60 bg-card/90 shadow-2xs backdrop-blur-md transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-muted hover:text-foreground active:scale-[0.95] glass-inset",
              open && "border-primary/50 bg-primary/10 text-primary shadow-[0_0_12px_rgba(var(--primary),0.2)]",
            )}
            title="Layer Peta"
            aria-label="Layer Peta"
          >
            <Layers className="size-4 text-primary" />
            {activeCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex size-3.5 items-center justify-center rounded-full bg-primary font-mono text-[8px] font-bold text-primary-foreground shadow-xs">
                {activeCount}
              </span>
            )}
          </button>
        </PopoverTrigger>

        <PopoverContent
          align="end"
          side="top"
          sideOffset={8}
          className="w-72 rounded-2xl border border-border/40 bg-card/95 p-3 shadow-xl backdrop-blur-xl glass-inset animate-in fade-in zoom-in-95"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/40 pb-2 mb-2">
            <div className="flex items-center gap-1.5">
              <Layers className="size-3.5 text-primary" />
              <span className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-foreground">
                Layer Topologi
              </span>
            </div>
            <span className="rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 font-mono text-[9px] font-semibold text-primary tabular-nums">
              {activeCount}/{LAYER_CONFIGS.length} Aktif
            </span>
          </div>

          {/* Layer List */}
          <div className="space-y-1">
            {LAYER_CONFIGS.map(({ key, label, description, icon: Icon }) => {
              const checked = layerToggles[key];
              return (
                <div
                  key={key}
                  onClick={() => onToggleLayer(key)}
                  className={cn(
                    "flex items-center justify-between rounded-xl border p-2 cursor-pointer transition-all duration-200 select-none",
                    checked
                      ? "border-border/60 bg-muted/30 hover:bg-muted/50"
                      : "border-transparent bg-transparent hover:bg-muted/20 opacity-60",
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    <div
                      className={cn(
                        "flex size-6 shrink-0 items-center justify-center rounded-lg border transition-colors",
                        checked
                          ? "border-primary/40 bg-primary/10 text-primary"
                          : "border-border/40 bg-muted/20 text-muted-foreground",
                      )}
                    >
                      <Icon className="size-3" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[11px] font-semibold text-foreground leading-none mb-0.5">
                        {label}
                      </p>
                      <p className="truncate font-mono text-[9px] text-muted-foreground leading-none">
                        {description}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={checked}
                    onCheckedChange={() => onToggleLayer(key)}
                    className="scale-85 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
