"use client";

import { useState } from "react";
import { Cable, Link2, Unlink } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  type DevicePort,
  type PeerDeviceOption,
  type PeerPortOption,
  getPortStatusClass,
  getPortStatusLabel,
} from "./port-tray-types";

export function PortAssignmentDrawer({
  open,
  onOpenChange,
  port,
  deviceTypeKey,
  direction,
  onDirectionChange,
  peerDevices,
  peerDeviceValue,
  onPeerDeviceChange,
  peerPorts,
  peerPortValue,
  onPeerPortChange,
  onAssign,
  onDisconnect,
  loading = false,
  existingConnection,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  port: DevicePort | null;
  deviceTypeKey: string;
  /** Which direction to set: 'front' (upstream) or 'rear' (downstream) */
  direction: "front" | "rear";
  onDirectionChange: (direction: "front" | "rear") => void;
  /** Available peer device options */
  peerDevices: PeerDeviceOption[];
  /** Currently selected peer device ID */
  peerDeviceValue: string;
  onPeerDeviceChange: (id: string) => void;
  /** Available port options on the selected peer device */
  peerPorts: PeerPortOption[];
  /** Currently selected peer port ID */
  peerPortValue: string;
  onPeerPortChange: (id: string) => void;
  /** Called when user clicks Simpan */
  onAssign: () => void;
  /** Called when user clicks Putuskan Koneksi */
  onDisconnect?: () => void;
  loading?: boolean;
  /** Info about existing connection if this port is already used */
  existingConnection?: { id: string; label: string } | null;
}) {
  const [assignError, setAssignError] = useState("");

  const isIdle = !port?.status || port.status === "idle";
  const isUsed = port?.status === "used";

  const peerDeviceOptions = [
    { value: "__none__", label: "Pilih device" },
    ...peerDevices,
  ];

  const peerPortOptions = [
    { value: "__none__", label: peerDeviceValue ? "Pilih port" : "Pilih device terlebih dahulu" },
    ...peerPorts,
  ];

  function handleAssign() {
    setAssignError("");
    if (!port) return;
    if (!peerDeviceValue) {
      setAssignError("Pilih device tujuan terlebih dahulu.");
      return;
    }
    if (!peerPortValue) {
      setAssignError("Pilih port tujuan terlebih dahulu.");
      return;
    }
    onAssign();
  }

  function handleDisconnect() {
    setAssignError("");
    onDisconnect?.();
  }

  // Reset error when dialog closes
  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) setAssignError("");
    onOpenChange(nextOpen);
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Cable className="size-4" />
            {port ? `Port ${port.port_label || `#${port.port_index}`}` : "Assign Port"}
          </SheetTitle>
          <SheetDescription>
            {deviceTypeKey} — atur relasi port ini dengan device lain
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-2">
          {/* Port info card */}
          {port && (
            <div className="rounded-md border bg-muted/20 p-3">
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "size-3 shrink-0 rounded-full",
                    getPortStatusClass(port.status),
                  )}
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {port.port_label || `Port #${port.port_index}`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Status: {getPortStatusLabel(port.status)}
                    {port.port_type ? ` · Tipe: ${port.port_type}` : ""}
                    {port.direction ? ` · ${port.direction}` : ""}
                  </p>
                </div>
              </div>
              {port.notes && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Catatan: {port.notes}
                </p>
              )}
            </div>
          )}

          {/* Existing connection info */}
          {existingConnection && (
            <div className="rounded-md border border-blue-200 bg-blue-50/70 px-3 py-2 text-xs text-blue-950 dark:border-blue-900/60 dark:bg-blue-950/25 dark:text-blue-100">
              <div className="mb-1 flex items-center gap-2 font-medium">
                <Link2 className="size-3.5" />
                Koneksi Aktif
              </div>
              <p className="text-blue-900/80 dark:text-blue-100/80">
                {existingConnection.label}
              </p>
            </div>
          )}

          {/* Direction tabs */}
          {isIdle && (
            <div className="flex gap-1 rounded-lg border bg-muted/30 p-1">
              <button
                type="button"
                onClick={() => onDirectionChange("front")}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  direction === "front"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Front Port (Hulu)
              </button>
              <button
                type="button"
                onClick={() => onDirectionChange("rear")}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  direction === "rear"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Rear Port (Hilir)
              </button>
            </div>
          )}

          {/* Peer device selector */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">
              {direction === "front" ? "Device Hulu (Front)" : "Device Hilir (Rear)"}
            </p>
            <Combobox
              value={peerDeviceValue}
              onValueChange={onPeerDeviceChange}
              options={peerDeviceOptions}
              placeholder="Pilih device..."
              searchPlaceholder="Cari device..."
              emptyText="Tidak ada device ditemukan."
              disabled={!isIdle || loading}
            />
          </div>

          {/* Peer port selector */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">
              Port pada device {direction === "front" ? "hulu" : "hilir"}
            </p>
            <Combobox
              value={peerPortValue}
              onValueChange={onPeerPortChange}
              options={peerPortOptions}
              placeholder="Pilih port..."
              searchPlaceholder="Cari port..."
              emptyText={peerDeviceValue ? "Tidak ada port tersedia." : "Pilih device terlebih dahulu."}
              disabled={!peerDeviceValue || !isIdle || loading}
            />
          </div>

          {/* Error */}
          {assignError && (
            <p className="text-xs text-destructive">{assignError}</p>
          )}
        </div>

        <SheetFooter className="px-4 pb-4">
          {isUsed && onDisconnect ? (
            <Button
              variant="destructive"
              className="w-full"
              onClick={handleDisconnect}
              disabled={loading}
            >
              <Unlink className="mr-2 size-4" />
              Putuskan Koneksi
            </Button>
          ) : null}
          {isIdle && (
            <Button
              className="w-full"
              onClick={handleAssign}
              disabled={loading || !peerDeviceValue || !peerPortValue}
            >
              <Link2 className="mr-2 size-4" />
              {loading ? "Menyimpan..." : "Simpan"}
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
