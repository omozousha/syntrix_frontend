"use client";

import React from "react";
import { GripVertical, Plus, Layers, Cpu, Server, Radio, ArrowUpRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { DeviceToMount } from "./pop-rack-mount-modal";

type PopUnmountedTrayProps = {
  devices: DeviceToMount[];
  onSelectDeviceToMount: (device: DeviceToMount) => void;
};

function getDeviceTypeBadgeStyle(typeKey: string) {
  const k = (typeKey || "").toUpperCase();
  if (k === "OLT") return "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400";
  if (k === "OTB") return "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
  if (k === "SWITCH" || k === "ROUTER") return "border-sky-500/40 bg-sky-500/10 text-sky-600 dark:text-sky-400";
  if (k === "RECTIFIER" || k === "POWER") return "border-violet-500/40 bg-violet-500/10 text-violet-600 dark:text-violet-400";
  return "border-border/60 bg-muted/30 text-muted-foreground";
}

export function PopUnmountedTray({ devices, onSelectDeviceToMount }: PopUnmountedTrayProps) {
  function handleDragStart(e: React.DragEvent, device: DeviceToMount) {
    e.dataTransfer.setData(
      "application/json",
      JSON.stringify({
        deviceId: device.id,
        deviceName: device.device_name,
        deviceTypeKey: device.device_type_key,
        uHeight: Number(device.u_height) || 1,
      })
    );
    e.dataTransfer.effectAllowed = "move";
  }

  return (
    <Card className="flex flex-col justify-between rounded-2xl border-border/60 shadow-xs glass-inset transition-all duration-300">
      <CardContent className="p-5 sm:p-6 space-y-3.5 flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
            <Layers className="size-4 text-primary" />
            <span>Perangkat Belum Terpasang</span>
          </div>
          <Badge variant="outline" className="font-mono tabular-nums text-[10px] uppercase">
            {devices.length} Aset
          </Badge>
        </div>

        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Tarik kartu perangkat langsung ke slot rak di sebelah kiri, atau klik tombol <strong>Pasang</strong> untuk menentukan posisi U secara manual.
        </p>

        {/* Devices List */}
        <div className="flex-1 space-y-2 max-h-[500px] overflow-y-auto pr-1">
          {devices.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/10 p-6 text-center text-xs text-muted-foreground">
              <Server className="size-8 text-muted-foreground/50 mb-2" />
              <span>Semua perangkat indoor di POP ini sudah terpasang rapi di dalam rak.</span>
            </div>
          ) : (
            devices.map((device) => {
              const uHeight = Number(device.u_height) || 1;
              return (
                <div
                  key={device.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, device)}
                  className="group flex items-center justify-between gap-2 rounded-xl border border-border/60 bg-muted/20 p-2.5 shadow-2xs hover:border-primary/50 hover:bg-muted/40 cursor-grab active:cursor-grabbing transition-all duration-200"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <GripVertical className="size-3.5 text-muted-foreground/60 group-hover:text-primary transition-colors shrink-0" />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-foreground" title={device.device_name}>
                        {device.device_name}
                      </p>
                      <div className="flex items-center gap-1.5 pt-0.5">
                        <Badge
                          variant="outline"
                          className={`font-mono text-[9px] uppercase px-1.5 py-0 ${getDeviceTypeBadgeStyle(device.device_type_key)}`}
                        >
                          {device.device_type_key}
                        </Badge>
                        <span className="font-mono tabular-nums text-[10px] text-muted-foreground">
                          {uHeight}U
                        </span>
                      </div>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-[10px] rounded-lg border-border/60 px-2 shrink-0 hover:bg-primary/10 hover:text-primary"
                    onClick={() => onSelectDeviceToMount(device)}
                  >
                    <Plus className="mr-1 size-3" />
                    Pasang
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
