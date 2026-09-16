"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MapDevice } from "@/components/features/maps/topology-map-canvas";

interface LocationDevicePickerCardProps {
  devices: MapDevice[];
  onClose: () => void;
  onSelectDevice: (device: MapDevice, isMulti: boolean) => void;
  inspectDevices: MapDevice[];
}

export function LocationDevicePickerCard({
  devices,
  onClose,
  onSelectDevice,
  inspectDevices,
}: LocationDevicePickerCardProps) {
  const firstLat = devices[0]?.latitude != null ? Number(devices[0].latitude) : NaN;
  const firstLng = devices[0]?.longitude != null ? Number(devices[0].longitude) : NaN;
  const coordText =
    Number.isFinite(firstLat) && Number.isFinite(firstLng)
      ? `${firstLat.toFixed(6)}, ${firstLng.toFixed(6)}`
      : "-";

  return (
    <div
      role="dialog"
      aria-label="Pemilih Perangkat Berkelompok"
      className="absolute left-1/2 top-16 z-30 -translate-x-1/2 w-[min(340px,calc(100vw-2rem))] rounded-2xl border border-border/40 bg-card/95 p-2 shadow-xl backdrop-blur-md glass-inset transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] animate-in fade-in zoom-in-95"
    >
      <div className="rounded-[calc(1rem-0.25rem)] border border-border/60 bg-card/80 p-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-2 pb-2 border-b border-border/40">
          <div>
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="inline-block size-2 rounded-full bg-primary animate-pulse" />
              <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">
                Grouped Devices
              </p>
            </div>
            <h4 className="font-semibold text-xs text-foreground">
              {devices.length} Device di Lokasi Sama
            </h4>
            <p className="font-mono text-[10px] tabular-nums text-muted-foreground mt-0.5">
              📍 {coordText}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 size-5 flex items-center justify-center rounded-full border border-border/60 text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors active:scale-95"
            title="Tutup"
            aria-label="Tutup pemilih perangkat"
          >
            <X className="size-3" />
          </button>
        </div>

        {/* Device List */}
        <div className="space-y-1.5 max-h-56 overflow-y-auto thin-scrollbar pr-0.5">
          {devices.map((device) => {
            const isSelected = inspectDevices.some((d) => d.id === device.id);
            return (
              <button
                key={device.id}
                type="button"
                onClick={(e) => {
                  onSelectDevice(device, Boolean(e.shiftKey));
                }}
                className={cn(
                  "w-full flex items-center justify-between gap-2 rounded-xl border px-2.5 py-2 text-left transition-all duration-200 active:scale-[0.98]",
                  isSelected
                    ? "border-primary/50 bg-primary/10 text-primary shadow-2xs"
                    : "border-border/50 bg-muted/10 text-foreground hover:bg-muted/30 hover:border-border/80",
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-xs leading-snug">
                    {device.device_name || device.device_id || "Device"}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                      {device.device_type_key || "DEVICE"}
                    </span>
                    {device.marker_status && (
                      <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                        • {device.marker_status}
                      </span>
                    )}
                  </div>
                </div>

                {isSelected ? (
                  <span className="shrink-0 rounded-full bg-primary/20 border border-primary/40 px-1.5 py-0.5 font-mono text-[8px] font-semibold text-primary">
                    Terpilih
                  </span>
                ) : (
                  <span className="shrink-0 font-mono text-[9px] text-muted-foreground opacity-60">
                    Klik
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tip */}
        <p className="mt-2.5 pt-2 border-t border-border/40 font-mono text-[9px] text-muted-foreground text-center">
          💡 Gunakan <kbd className="rounded border border-border/60 bg-muted px-1 py-0.5 text-[8px] font-semibold">Shift + Klik</kbd> untuk memilih hingga 3 device sekaligus.
        </p>
      </div>
    </div>
  );
}
