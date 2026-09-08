"use client";

import { useState } from "react";
import { Server } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import { isRackMountable } from "@/lib/pop-device-config";

export type DeviceToMount = {
  id: string;
  device_name: string;
  device_type_key: string;
  u_height?: number | string | null;
  rack_unit_position?: number | string | null;
  rack_device_id?: string | null;
};

export type RackOption = {
  id: string;
  device_name: string;
  rack_u_height: number;
};

type PopRackMountModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  racks: RackOption[];
  selectedRackId: string;
  initialU: number;
  initialDevice?: DeviceToMount | null;
  unmountedDevices: DeviceToMount[];
  onMount: (deviceId: string, rackId: string, uPosition: number, uHeight: number) => Promise<void>;
};

export function PopRackMountModal({
  open,
  onOpenChange,
  racks,
  selectedRackId,
  initialU,
  initialDevice,
  unmountedDevices,
  onMount,
}: PopRackMountModalProps) {
  const [targetRackId, setTargetRackId] = useState(selectedRackId);
  const [deviceId, setDeviceId] = useState(initialDevice?.id || "");
  const [uPosition, setUPosition] = useState(String(initialU || 1));
  const [uHeight, setUHeight] = useState(String(initialDevice?.u_height || 1));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const activeRack = racks.find((r) => r.id === (targetRackId || selectedRackId)) || racks[0];
  const maxU = activeRack?.rack_u_height || 42;

  // Sync when props change
  const currentInitialId = initialDevice?.id;
  useState(() => {
    if (currentInitialId) setDeviceId(currentInitialId);
    if (selectedRackId) setTargetRackId(selectedRackId);
    if (initialU) setUPosition(String(initialU));
  });

  async function handleConfirm() {
    if (!deviceId) {
      setError("Pilih perangkat yang ingin dipasang ke rak.");
      return;
    }
    const pos = parseInt(uPosition, 10);
    const height = parseInt(uHeight, 10);
    if (Number.isNaN(pos) || pos < 1 || pos > maxU) {
      setError(`Posisi U harus berada di antara 1 dan ${maxU}.`);
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      await onMount(deviceId, targetRackId || activeRack.id, pos, height);
      onOpenChange(false);
    } catch (err) {
      setError((err as Error).message || "Gagal memasang perangkat ke rak.");
    } finally {
      setSubmitting(false);
    }
  }

  const deviceOptions = initialDevice
    ? [{ value: initialDevice.id, label: `${initialDevice.device_name} (${initialDevice.device_type_key})` }]
    : unmountedDevices
        .filter(isRackMountable)
        .map((d) => ({
          value: d.id,
          label: `${d.device_name} (${d.device_type_key})`,
        }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl border-border/60 shadow-lg glass-inset p-5 sm:p-6 space-y-4">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Server className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">Pasang Perangkat ke Slot Rak</DialogTitle>
              <DialogDescription className="text-xs">
                Tentukan posisi slot U awal dan tinggi unit perangkat di cabinet.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3 pt-2">
          {racks.length > 1 ? (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Pilih Rak Cabinet</Label>
              <Select value={targetRackId || activeRack?.id} onValueChange={setTargetRackId}>
                <SelectTrigger className="h-9 rounded-xl border-border/60 text-xs">
                  <SelectValue placeholder="Pilih Rak" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border/60">
                  {racks.map((r) => (
                    <SelectItem key={r.id} value={r.id} className="text-xs">
                      {r.device_name} ({r.rack_u_height}U)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Perangkat</Label>
            {initialDevice ? (
              <div className="rounded-xl border border-border/60 bg-muted/20 p-2.5 text-xs font-medium">
                {initialDevice.device_name} <span className="font-mono text-[10px] text-muted-foreground">({initialDevice.device_type_key})</span>
              </div>
            ) : (
              <Combobox
                value={deviceId}
                onValueChange={(v) => {
                  setDeviceId(v);
                  const selected = unmountedDevices.find((d) => d.id === v);
                  if (selected?.u_height) setUHeight(String(selected.u_height));
                }}
                options={deviceOptions}
                placeholder="Pilih perangkat POP"
                searchPlaceholder="Cari perangkat..."
                emptyText="Semua perangkat sudah terpasang di rak."
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Posisi U (1–{maxU})</Label>
              <Select value={uPosition} onValueChange={setUPosition}>
                <SelectTrigger className="h-9 rounded-xl border-border/60 font-mono text-xs">
                  <SelectValue placeholder="Posisi U" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border/60 max-h-48">
                  {Array.from({ length: maxU }).map((_, idx) => {
                    const u = maxU - idx;
                    return (
                      <SelectItem key={u} value={String(u)} className="font-mono text-xs">
                        Slot U{u}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Tinggi Unit (U)</Label>
              <Select value={uHeight} onValueChange={setUHeight}>
                <SelectTrigger className="h-9 rounded-xl border-border/60 font-mono text-xs">
                  <SelectValue placeholder="Tinggi U" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border/60">
                  <SelectItem value="1" className="font-mono text-xs">1U (Standard)</SelectItem>
                  <SelectItem value="2" className="font-mono text-xs">2U</SelectItem>
                  <SelectItem value="3" className="font-mono text-xs">3U</SelectItem>
                  <SelectItem value="4" className="font-mono text-xs">4U</SelectItem>
                  <SelectItem value="6" className="font-mono text-xs">6U (Chassis)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {error ? <p className="text-xs text-destructive font-medium">{error}</p> : null}
        </div>

        <DialogFooter className="pt-2 border-t border-border/40">
          <Button
            type="button"
            variant="outline"
            className="rounded-xl border-border/60 text-xs hover:bg-muted/40"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Batal
          </Button>
          <Button
            type="button"
            className="rounded-xl bg-primary text-primary-foreground text-xs font-semibold shadow-xs hover:bg-primary/90"
            onClick={() => void handleConfirm()}
            disabled={submitting || !deviceId}
          >
            {submitting ? "Memasang..." : "Pasang ke Rak"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
