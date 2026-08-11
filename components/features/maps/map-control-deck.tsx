"use client";

import * as React from "react";
import { Combobox } from "@/components/ui/combobox";
import { cn } from "@/lib/utils";

type Option = { value: string; label: string };

type MapControlDeckProps = {
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
  className?: string;
};

export function MapControlDeck({
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
  className,
}: MapControlDeckProps) {
  return (
    <div className={cn("z-10 w-full p-1.5", className)}>
      {/* Outer bezel wrapper */}
      <div className="rounded-2xl border border-border/40 bg-muted/10 p-1.5 shadow-xs backdrop-blur-md dark:bg-white/[0.02] glass-inset">
        {/* Inner layout container */}
        <div className="grid grid-cols-1 gap-2 rounded-[calc(1.25rem-0.25rem)] border border-border/60 bg-background/80 p-3 sm:grid-cols-2 lg:grid-cols-5 glass-inset">
          <div className="space-y-1">
            <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground block px-1">Region</span>
            <Combobox
              value={regionFilter}
              onValueChange={(value) => onRegionChange(value || "__all__")}
              options={regionOptions}
              placeholder="Region"
              searchPlaceholder="Cari region..."
            />
          </div>

          <div className="space-y-1">
            <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground block px-1">Project</span>
            <Combobox
              value={projectFilter}
              onValueChange={(value) => onProjectChange(value || "__all__")}
              options={projectOptions}
              placeholder="Project"
              searchPlaceholder="Cari project..."
            />
          </div>

          <div className="space-y-1">
            <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground block px-1">Point of Presence (POP)</span>
            <Combobox
              value={popFilter}
              onValueChange={(value) => onPopChange(value || "__all__")}
              options={popOptions}
              placeholder="POP"
              searchPlaceholder="Cari POP..."
            />
          </div>

          <div className="space-y-1">
            <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground block px-1">Tenant</span>
            <Combobox
              value={tenantFilter}
              onValueChange={(value) => onTenantChange(value || "__all__")}
              options={tenantOptions}
              placeholder="Tenant"
              searchPlaceholder="Cari tenant..."
            />
          </div>

          <div className="space-y-1">
            <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground block px-1">Tipe Device</span>
            <Combobox
              value={deviceType}
              onValueChange={(value) => onDeviceTypeChange(value || "all")}
              options={deviceTypeOptions}
              placeholder="Tipe device"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
