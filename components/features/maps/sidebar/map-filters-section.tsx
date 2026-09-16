"use client";

import * as React from "react";
import { Filter, Search, ChevronRight, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Combobox } from "@/components/ui/combobox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { MapDevice } from "../topology-map-canvas";
import type { NominatimResult } from "@/hooks/use-nominatim-search";
import { cn } from "@/lib/utils";

type Option = { value: string; label: string };

interface MapFiltersSectionProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  regionFilter: string;
  onRegionChange: (v: string) => void;
  regionOptions: Option[];
  projectFilter: string;
  onProjectChange: (v: string) => void;
  projectOptions: Option[];
  popFilter: string;
  onPopChange: (v: string) => void;
  popOptions: Option[];
  tenantFilter: string;
  onTenantChange: (v: string) => void;
  tenantOptions: Option[];
  deviceType: string;
  onDeviceTypeChange: (v: string) => void;
  deviceTypeOptions: Option[];
  devices: MapDevice[];
  onSelectSearchResult?: (result: NominatimResult) => void;
}

export function MapFiltersSection({
  isOpen,
  onOpenChange,
  regionFilter,
  onRegionChange,
  regionOptions,
  projectFilter,
  onProjectChange,
  projectOptions,
  popFilter,
  onPopChange,
  popOptions,
  tenantFilter,
  onTenantChange,
  tenantOptions,
  deviceType,
  onDeviceTypeChange,
  deviceTypeOptions,
  devices,
  onSelectSearchResult,
}: MapFiltersSectionProps) {
  const [deviceSearch, setDeviceSearch] = React.useState("");
  const [showDeviceResults, setShowDeviceResults] = React.useState(false);

  const activeFilterCount = React.useMemo(
    () =>
      [regionFilter, projectFilter, popFilter, tenantFilter, deviceType].filter(
        (v) => v && v !== "__all__" && v !== "all",
      ).length,
    [regionFilter, projectFilter, popFilter, tenantFilter, deviceType],
  );

  const filteredDevices = React.useMemo(() => {
    const q = deviceSearch.trim().toLowerCase();
    if (q.length < 2) return [];
    return devices
      .filter(
        (d) =>
          (d.device_name?.toLowerCase().includes(q) ||
            d.device_id?.toLowerCase().includes(q) ||
            d.device_type_key?.toLowerCase().includes(q)) &&
          Number.isFinite(Number(d.longitude)) &&
          Number.isFinite(Number(d.latitude)),
      )
      .slice(0, 20);
  }, [devices, deviceSearch]);

  const handleDeviceClick = React.useCallback(
    (device: MapDevice) => {
      onSelectSearchResult?.({
        place_id: Number(device.id) || Date.now(),
        lat: Number(device.latitude),
        lon: Number(device.longitude),
        display_name: `${device.device_name || device.device_id} (${device.device_type_key || "ASSET"})`,
        short_name: device.device_name || device.device_id || "Device",
        type: "device",
        class: "device",
      });
      setDeviceSearch(device.device_name || device.device_id || "");
      setShowDeviceResults(false);
    },
    [onSelectSearchResult],
  );

  return (
    <Collapsible open={isOpen} onOpenChange={onOpenChange}>
      <div className="rounded-xl border border-border/40 bg-muted/10 p-1 shadow-2xs dark:bg-white/[0.01]">
        <div className="rounded-[calc(0.75rem-0.125rem)] border border-border/60 bg-card/80 shadow-xs glass-inset">
          <CollapsibleTrigger className="flex w-full items-center justify-between px-2.5 py-2 hover:no-underline">
            <div className="flex items-center gap-1.5">
              <Filter className="size-3.5 text-primary" />
              <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground font-semibold">
                Filter Topologi
              </span>
              {activeFilterCount > 0 && (
                <span className="inline-flex items-center justify-center rounded-full bg-primary/15 px-1.5 py-0.5 font-mono text-[8px] font-semibold tabular-nums text-primary">
                  {activeFilterCount}
                </span>
              )}
            </div>
            <ChevronRight
              className={cn(
                "size-3.5 text-muted-foreground transition-transform duration-200 ease-[cubic-bezier(0.32,0.72,0,1)]",
                isOpen && "rotate-90",
              )}
            />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-2.5 pb-2.5 space-y-1.5">
              {/* Device Search Bar */}
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                <Input
                  type="text"
                  value={deviceSearch}
                  onChange={(e) => {
                    setDeviceSearch(e.target.value);
                    setShowDeviceResults(true);
                  }}
                  placeholder="Cari nama / ID device..."
                  className="h-8 rounded-full pl-8 pr-8 font-mono text-[11px]"
                />
                {deviceSearch && (
                  <button
                    type="button"
                    onClick={() => {
                      setDeviceSearch("");
                      setShowDeviceResults(false);
                    }}
                    className="absolute right-2.5 top-2.5 size-3.5 text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>

              {/* Device Search Autocomplete Results */}
              {showDeviceResults && filteredDevices.length > 0 && (
                <ScrollArea className="max-h-48 rounded-xl border border-border/60 bg-card p-1 shadow-md">
                  <div className="space-y-1 pr-1.5">
                    {filteredDevices.map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => handleDeviceClick(d)}
                        className="w-full text-left rounded-lg p-2 hover:bg-muted transition-colors text-xs space-y-0.5"
                      >
                        <p className="font-medium text-foreground truncate">
                          {d.device_name || d.device_id}
                        </p>
                        <div className="flex items-center gap-2 font-mono text-[9px] text-muted-foreground">
                          <span className="uppercase text-primary/80">
                            {d.device_type_key || "ASSET"}
                          </span>
                          <span>•</span>
                          <span>{d.id}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              )}

              <Combobox
                value={regionFilter}
                onValueChange={(val) => onRegionChange(val || "__all__")}
                options={regionOptions}
                placeholder="Region"
                searchPlaceholder="Cari region..."
              />
              <Combobox
                value={projectFilter}
                onValueChange={(val) => onProjectChange(val || "__all__")}
                options={projectOptions}
                placeholder="Project"
                searchPlaceholder="Cari project..."
              />
              <Combobox
                value={popFilter}
                onValueChange={(val) => onPopChange(val || "__all__")}
                options={popOptions}
                placeholder="Point of Presence (POP)"
                searchPlaceholder="Cari POP..."
              />
              <Combobox
                value={tenantFilter}
                onValueChange={(val) => onTenantChange(val || "__all__")}
                options={tenantOptions}
                placeholder="Tenant"
                searchPlaceholder="Cari tenant..."
              />
              <Combobox
                value={deviceType}
                onValueChange={(val) => onDeviceTypeChange(val || "all")}
                options={deviceTypeOptions}
                placeholder="Tipe device"
              />
            </div>
          </CollapsibleContent>
        </div>
      </div>
    </Collapsible>
  );
}
