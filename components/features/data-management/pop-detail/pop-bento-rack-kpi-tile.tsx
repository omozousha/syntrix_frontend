"use client";

import { useState } from "react";
import Link from "next/link";
import { Server, SlidersHorizontal, Check, Layers, Cpu, Radio, Network, HardDrive, Filter } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  POP_DEVICE_TYPES,
  POP_INDOOR_PRESET,
  POP_ALL_PRESET,
  savePopVisibleDeviceTypes,
} from "@/lib/pop-device-config";
import { deviceTypeKeyToSlug } from "@/lib/data-management-config";

type PopBentoRackKpiTileProps = {
  totalRacks: number;
  totalU: number;
  usedU: number;
  popId: string;
  deviceTypeCounts: Record<string, number>;
  visibleDeviceTypes: string[];
  token?: string;
  onVisibleTypesChange: (next: string[]) => void;
};

export function PopBentoRackKpiTile({
  totalRacks,
  totalU,
  usedU,
  popId,
  deviceTypeCounts,
  visibleDeviceTypes,
  token,
  onVisibleTypesChange,
}: PopBentoRackKpiTileProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);

  const availableU = Math.max(0, totalU - usedU);
  const occupancyPercent = totalU > 0 ? Math.min(100, Math.round((usedU / totalU) * 100)) : 0;

  function toggleType(key: string) {
    const next = visibleDeviceTypes.includes(key)
      ? visibleDeviceTypes.filter((k) => k !== key)
      : [...visibleDeviceTypes, key];
    onVisibleTypesChange(next);
    void savePopVisibleDeviceTypes(next, token);
  }

  function applyPreset(preset: readonly string[]) {
    const next = [...preset];
    onVisibleTypesChange(next);
    void savePopVisibleDeviceTypes(next, token);
  }

  return (
    <Card className="rounded-2xl border-border/60 shadow-xs glass-inset transition-all duration-300">
      <CardContent className="p-5 sm:p-6 space-y-5">
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Server className="size-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">Utilisasi Ruang Rak &amp; Inventaris Perangkat</h2>
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">EIA-310 Cabinet Capacity</p>
            </div>
          </div>

          {/* Config Filter Popover */}
          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 rounded-xl border-border/60 bg-muted/20 text-xs font-mono font-medium hover:bg-muted/40 active:scale-[0.98]"
              >
                <SlidersHorizontal className="mr-1.5 size-3.5 text-muted-foreground" />
                <span>Atur Tampilan ({visibleDeviceTypes.length})</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 rounded-2xl border-border/60 bg-popover/95 p-4 shadow-lg backdrop-blur-xl space-y-3">
              <div className="space-y-1">
                <p className="text-xs font-bold text-foreground">Filter Tampilan Perangkat POP</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Pilih tipe perangkat yang ingin ditampilkan di ringkasan POP. Pengaturan tersimpan di akun Anda.
                </p>
              </div>

              {/* Quick Presets */}
              <div className="flex items-center gap-2 pt-1">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 text-[10px] rounded-lg border-border/60 flex-1"
                  onClick={() => applyPreset(POP_INDOOR_PRESET)}
                >
                  Indoor Rak Saja
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 text-[10px] rounded-lg border-border/60 flex-1"
                  onClick={() => applyPreset(POP_ALL_PRESET)}
                >
                  Semua Aset
                </Button>
              </div>

              {/* Checkboxes List */}
              <div className="max-h-56 space-y-2 overflow-y-auto pt-1 pr-1">
                {POP_DEVICE_TYPES.map((type) => {
                  const isChecked = visibleDeviceTypes.includes(type.key);
                  const count = deviceTypeCounts[type.key] || 0;
                  return (
                    <div
                      key={type.key}
                      onClick={() => toggleType(type.key)}
                      className="flex items-center justify-between gap-2 rounded-lg p-1.5 hover:bg-muted/30 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => toggleType(type.key)}
                          id={`filter-${type.key}`}
                        />
                        <div className="min-w-0">
                          <Label htmlFor={`filter-${type.key}`} className="text-xs font-medium cursor-pointer">
                            {type.label}
                          </Label>
                          <p className="text-[10px] text-muted-foreground truncate">{type.description}</p>
                        </div>
                      </div>
                      <span className="font-mono tabular-nums text-xs font-semibold text-muted-foreground">
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Rack KPI Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-1">
            <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Total Rak Fisik</p>
            <p className="font-mono tabular-nums text-2xl font-bold text-foreground">{totalRacks}</p>
            <p className="text-[10px] text-muted-foreground">Cabinet Terpasang</p>
          </div>

          <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-1">
            <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Total Kapasitas</p>
            <p className="font-mono tabular-nums text-2xl font-bold text-foreground">
              {totalU} <span className="text-xs font-normal text-muted-foreground">U</span>
            </p>
            <p className="text-[10px] text-muted-foreground">Slot Ruang Rak</p>
          </div>

          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 space-y-1">
            <p className="font-mono text-[9px] uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Slot Terpakai</p>
            <p className="font-mono tabular-nums text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {usedU} <span className="text-xs font-normal">U</span>
            </p>
            <p className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80">({occupancyPercent}% Occupancy)</p>
          </div>

          <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-3 space-y-1">
            <p className="font-mono text-[9px] uppercase tracking-widest text-sky-600 dark:text-sky-400">Slot Tersedia</p>
            <p className="font-mono tabular-nums text-2xl font-bold text-sky-600 dark:text-sky-400">
              {availableU} <span className="text-xs font-normal">U</span>
            </p>
            <p className="text-[10px] text-sky-600/80 dark:text-sky-400/80">Siap Dipakai</p>
          </div>
        </div>

        {/* Occupancy Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-mono text-[10px] text-muted-foreground">
            <span>Kepadatan Rak Ruang POP</span>
            <span className="font-bold text-foreground">{occupancyPercent}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted/60 border border-border/40">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                occupancyPercent > 85 ? "bg-amber-500" : "bg-emerald-500"
              }`}
              style={{ width: `${occupancyPercent}%` }}
            />
          </div>
        </div>

        {/* Filtered Device Inventory Breakdown Chips */}
        <div className="pt-3 border-t border-border/40 space-y-2">
          <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
            Rangkuman Perangkat Terpilih ({visibleDeviceTypes.length} Tipe Aktif)
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            {POP_DEVICE_TYPES.filter((t) => visibleDeviceTypes.includes(t.key)).map((type) => {
              const count = deviceTypeCounts[type.key] || 0;
              const slug = deviceTypeKeyToSlug(type.key);
              return (
                <Link
                  key={type.key}
                  href={`/data-management/list/${slug}?pop_id=${encodeURIComponent(popId)}`}
                  className="group flex items-center gap-1.5 rounded-xl border border-border/60 bg-muted/20 px-2.5 py-1 text-xs transition-all duration-200 hover:border-primary/50 hover:bg-muted/40 active:scale-[0.98]"
                >
                  <span className="font-medium text-foreground group-hover:text-primary transition-colors">
                    {type.label}
                  </span>
                  <Badge variant="secondary" className="font-mono tabular-nums text-[10px] px-1.5 py-0 h-4 font-bold">
                    {count}
                  </Badge>
                </Link>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
