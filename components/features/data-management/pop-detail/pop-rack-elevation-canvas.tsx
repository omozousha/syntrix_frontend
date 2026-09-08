"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Server, Plus, Unlink, ExternalLink, GripVertical } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { deviceTypeKeyToSlug } from "@/lib/data-management-config";
import type { DeviceToMount, RackOption } from "./pop-rack-mount-modal";

type PopRackElevationCanvasProps = {
  racks: RackOption[];
  selectedRackId: string;
  mountedDevices: DeviceToMount[];
  onSelectRackId: (id: string) => void;
  onCreateNewRack: () => void;
  onMountDevice: (deviceId: string, rackId: string, uPosition: number, uHeight: number) => Promise<void>;
  onUnmountDevice: (deviceId: string) => Promise<void>;
  onEmptySlotClick: (u: number) => void;
};

function getDeviceTypeBadgeStyle(typeKey: string) {
  const k = (typeKey || "").toUpperCase();
  if (k === "OLT") return "border-amber-500/40 bg-amber-500/15 text-amber-600 dark:text-amber-400";
  if (k === "OTB") return "border-emerald-500/40 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400";
  if (k === "SWITCH" || k === "ROUTER") return "border-sky-500/40 bg-sky-500/15 text-sky-600 dark:text-sky-400";
  if (k === "RECTIFIER" || k === "POWER") return "border-violet-500/40 bg-violet-500/15 text-violet-600 dark:text-violet-400";
  return "border-border/60 bg-muted/30 text-muted-foreground";
}

export function PopRackElevationCanvas({
  racks,
  selectedRackId,
  mountedDevices,
  onSelectRackId,
  onCreateNewRack,
  onMountDevice,
  onUnmountDevice,
  onEmptySlotClick,
}: PopRackElevationCanvasProps) {
  const activeRack = racks.find((r) => r.id === selectedRackId) || racks[0];
  const maxU = activeRack?.rack_u_height || 42;

  const [dragOverU, setDragOverU] = useState<number | null>(null);
  const [dragCollides, setDragCollides] = useState(false);
  const [unmountingId, setUnmountingId] = useState<string | null>(null);

  // Map each U to device if occupied
  // A device at position P with height H occupies slots: P, P+1, ..., P+H-1
  const slotOccupancy = new Map<number, { device: DeviceToMount; isBase: boolean; uIndex: number }>();

  mountedDevices.forEach((dev) => {
    const baseU = Number(dev.rack_unit_position);
    const h = Number(dev.u_height) || 1;
    if (baseU && baseU >= 1 && baseU <= maxU) {
      for (let i = 0; i < h; i++) {
        const u = baseU + i;
        if (u <= maxU) {
          slotOccupancy.set(u, {
            device: dev,
            isBase: i === 0,
            uIndex: i,
          });
        }
      }
    }
  });

  function canFit(startU: number, height: number, excludeDeviceId?: string) {
    if (startU < 1 || startU + height - 1 > maxU) return false;
    for (let i = 0; i < height; i++) {
      const u = startU + i;
      const occ = slotOccupancy.get(u);
      if (occ && occ.device.id !== excludeDeviceId) {
        return false;
      }
    }
    return true;
  }

  function handleDragOver(e: React.DragEvent, u: number) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";

    try {
      const raw = e.dataTransfer.getData("application/json");
      if (raw) {
        const parsed = JSON.parse(raw);
        const h = Number(parsed.uHeight) || 1;
        const fits = canFit(u, h, parsed.deviceId);
        setDragCollides(!fits);
      }
    } catch {
      // fallback
    }

    setDragOverU(u);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setDragOverU(null);
    setDragCollides(false);
  }

  async function handleDrop(e: React.DragEvent, targetU: number) {
    e.preventDefault();
    setDragOverU(null);
    setDragCollides(false);

    try {
      const raw = e.dataTransfer.getData("application/json");
      if (!raw) return;
      const { deviceId, uHeight } = JSON.parse(raw);
      const h = Number(uHeight) || 1;

      if (!canFit(targetU, h, deviceId)) {
        alert(`Slot U${targetU} bentrok dengan perangkat lain atau melebihi tinggi rak!`);
        return;
      }

      await onMountDevice(deviceId, activeRack.id, targetU, h);
    } catch (err) {
      console.warn("Drop mount failed:", err);
    }
  }

  async function handleUnmount(deviceId: string) {
    setUnmountingId(deviceId);
    try {
      await onUnmountDevice(deviceId);
    } finally {
      setUnmountingId(null);
    }
  }

  // Render U slots from top (maxU) to bottom (1)
  const uSlots = Array.from({ length: maxU }, (_, i) => maxU - i);

  return (
    <Card className="rounded-2xl border-border/60 shadow-xs glass-inset transition-all duration-300">
      <CardContent className="p-5 sm:p-6 space-y-4">
        {/* Rack Selector Tabs & Add Rack */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {racks.length === 0 ? (
              <span className="text-xs text-muted-foreground">Belum ada Rak Cabinet di POP ini.</span>
            ) : (
              racks.map((rack) => (
                <Button
                  key={rack.id}
                  type="button"
                  size="sm"
                  variant={rack.id === activeRack?.id ? "default" : "outline"}
                  className="h-8 rounded-xl text-xs font-mono font-medium"
                  onClick={() => onSelectRackId(rack.id)}
                >
                  <Server className="mr-1.5 size-3.5" />
                  <span>{rack.device_name} ({rack.rack_u_height}U)</span>
                </Button>
              ))
            )}
          </div>

          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 rounded-xl border-border/60 bg-muted/20 text-xs font-semibold hover:bg-muted/40 active:scale-[0.98]"
            onClick={onCreateNewRack}
          >
            <Plus className="mr-1.5 size-3.5" />
            <span>Tambah Rak Baru</span>
          </Button>
        </div>

        {/* Rack Elevation Cabinet Frame (Double-Bezel Standard) */}
        {!activeRack ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-muted/10 p-10 text-center text-xs text-muted-foreground space-y-3">
            <Server className="size-10 text-muted-foreground/40" />
            <p className="font-semibold text-sm text-foreground">Belum Ada Rak Terpasang</p>
            <p className="max-w-sm">
              Buat rack cabinet pertama (misal 42U) untuk mulai menata posisi OLT, OTB, Switch, dan Rectifier.
            </p>
            <Button type="button" size="sm" onClick={onCreateNewRack}>
              <Plus className="mr-1.5 size-4" />
              Buat Rak Sekarang
            </Button>
          </div>
        ) : (
          <div className="rounded-[1.5rem] border border-border/60 bg-muted/15 p-2 sm:p-3 shadow-inner">
            <div className="rounded-xl border border-border/80 bg-background/95 overflow-hidden shadow-xs">
              {/* Cabinet Top Header Strip */}
              <div className="flex items-center justify-between bg-muted/40 px-4 py-2 border-b border-border/60 font-mono text-[10px] text-muted-foreground">
                <span>EIA-310 19&quot; STANDARD CABINET</span>
                <span className="font-semibold text-foreground">{activeRack.device_name}</span>
                <span>TOP OF RACK</span>
              </div>

              {/* Slots List */}
              <div className="divide-y divide-border/30">
                {uSlots.map((u) => {
                  const occ = slotOccupancy.get(u);

                  // If slot is occupied by device
                  if (occ) {
                    const { device, uIndex } = occ;
                    const h = Number(device.u_height) || 1;

                    // If it's not the top of the multi-U block (render merged visually)
                    // Note: base is at bottom, highest slot is base + h - 1.
                    const isTopSlot = uIndex === h - 1;

                    return (
                      <div
                        key={u}
                        className={`flex min-h-[36px] items-stretch transition-colors ${
                          isTopSlot ? "border-t-2 border-primary/50" : ""
                        }`}
                      >
                        {/* U Number Label (Left Rail) */}
                        <div className="flex w-12 shrink-0 items-center justify-center border-r border-border/50 bg-muted/30 font-mono text-[11px] tabular-nums font-bold text-muted-foreground">
                          U{u}
                        </div>

                        {/* Device Content (renders details at top slot or middle) */}
                        <div
                          draggable={isTopSlot}
                          onDragStart={(e) => {
                            e.dataTransfer.setData(
                              "application/json",
                              JSON.stringify({
                                deviceId: device.id,
                                deviceName: device.device_name,
                                uHeight: h,
                              })
                            );
                            e.dataTransfer.effectAllowed = "move";
                          }}
                          className={`flex-1 flex items-center justify-between px-3 py-1.5 gap-2 bg-card ${
                            isTopSlot ? "cursor-grab active:cursor-grabbing hover:bg-muted/20" : ""
                          }`}
                        >
                          {isTopSlot ? (
                            <>
                              <div className="flex items-center gap-2 min-w-0">
                                <GripVertical className="size-3 text-muted-foreground/40 shrink-0" />
                                <Badge
                                  variant="outline"
                                  className={`font-mono text-[9px] uppercase px-1.5 py-0 ${getDeviceTypeBadgeStyle(
                                    device.device_type_key
                                  )}`}
                                >
                                  {device.device_type_key}
                                </Badge>
                                <span className="font-bold text-xs text-foreground truncate" title={device.device_name}>
                                  {device.device_name}
                                </span>
                                <span className="font-mono text-[10px] text-muted-foreground">
                                  ({h}U)
                                </span>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <Button asChild variant="ghost" size="icon" className="size-6 rounded-md hover:bg-muted" title="Buka Detail Perangkat">
                                  <Link href={`/data-management/list/${deviceTypeKeyToSlug(device.device_type_key)}/${device.id}`}>
                                    <ExternalLink className="size-3 text-muted-foreground" />
                                  </Link>
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="size-6 rounded-md text-destructive hover:bg-destructive/10"
                                  onClick={() => handleUnmount(device.id)}
                                  disabled={unmountingId === device.id}
                                  title="Lepas dari Rak (Unmount)"
                                >
                                  <Unlink className="size-3" />
                                </Button>
                              </div>
                            </>
                          ) : (
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground/60 font-mono italic">
                              <span>↳ span slot {device.device_name}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }

                  // Empty Slot
                  const isHovered = dragOverU === u;
                  return (
                    <div
                      key={u}
                      onDragOver={(e) => handleDragOver(e, u)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, u)}
                      onClick={() => onEmptySlotClick(u)}
                      className={`group flex min-h-[36px] items-stretch transition-all duration-150 cursor-pointer ${
                        isHovered
                          ? dragCollides
                            ? "bg-destructive/15 border-2 border-destructive"
                            : "bg-emerald-500/15 border-2 border-emerald-500"
                          : "hover:bg-muted/30"
                      }`}
                    >
                      {/* U Number Label (Left Rail) */}
                      <div className="flex w-12 shrink-0 items-center justify-center border-r border-border/50 bg-muted/20 font-mono text-[11px] tabular-nums text-muted-foreground group-hover:text-primary transition-colors">
                        U{u}
                      </div>

                      {/* Empty Slot Area */}
                      <div className="flex-1 flex items-center justify-between px-3 py-1 border border-dashed border-transparent group-hover:border-border/60 text-xs text-muted-foreground/60 group-hover:text-muted-foreground">
                        <span className="font-mono text-[10px] tracking-wide">
                          {isHovered ? (dragCollides ? "Slot bentrok!" : "Lepas untuk memasang di sini") : "Slot Kosong"}
                        </span>
                        <span className="opacity-0 group-hover:opacity-100 font-mono text-[10px] uppercase tracking-wider text-primary font-semibold transition-opacity">
                          + Pasang
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Cabinet Bottom Strip */}
              <div className="flex items-center justify-between bg-muted/40 px-4 py-2 border-t border-border/60 font-mono text-[10px] text-muted-foreground">
                <span>BOTTOM OF RACK</span>
                <span>U1 / FLOOR</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
