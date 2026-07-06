"use client";

import React, { useState, useMemo } from "react";
import { Plus, Trash2, Unlink, Server, ExternalLink, Cpu, X, Layers, AlertCircle } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export type PopDeviceSpecs = {
  rack_device_id?: string;
  rack_unit_position?: string | number;
  u_height?: string | number;
  rack_u_height?: number;
  rack_width_inches?: number;
  rack_type?: string;
  [key: string]: unknown;
};

export type PopDevice = {
  id: string;
  device_name: string;
  device_type_key: string;
  device_id?: string | null;
  region_id?: string | null;
  specifications?: PopDeviceSpecs;
  [key: string]: unknown;
};

interface PopRackLayoutSectionProps {
  devices: PopDevice[];
  popId: string;
  regionId: string;
  token: string;
  onRefresh: () => void;
}

export function PopRackLayoutSection({
  devices,
  popId,
  regionId,
  token,
  onRefresh,
}: PopRackLayoutSectionProps) {
  // Filter devices
  const racks = useMemo(() => devices.filter((d) => d.device_type_key === "RACK"), [devices]);
  
  const nonRacks = useMemo(() => devices.filter((d) => d.device_type_key !== "RACK"), [devices]);

  const unmountedDevices = useMemo(() => {
    return nonRacks.filter((d) => {
      const specs = d.specifications;
      return !specs || !specs.rack_device_id;
    });
  }, [nonRacks]);

  // Modal states
  const [showCreateRack, setShowCreateRack] = useState(false);
  const [showMountDevice, setShowMountDevice] = useState(false);
  const [showConfirmDeleteRack, setShowConfirmDeleteRack] = useState(false);

  // Form states
  const [newRackName, setNewRackName] = useState("");
  const [newRackUHeight, setNewRackUHeight] = useState("42");
  
  const [selectedDeviceToMount, setSelectedDeviceToMount] = useState<PopDevice | null>(null);
  const [selectedRackToMount, setSelectedRackToMount] = useState<string>("");
  const [mountPosition, setMountPosition] = useState<string>("1");
  const [mountHeight, setMountHeight] = useState<string>("1");

  const [selectedRackToDelete, setSelectedRackToDelete] = useState<PopDevice | null>(null);

  const [loadingAction, setLoadingAction] = useState(false);
  const [errorText, setErrorText] = useState("");

  // Handle actions
  async function handleCreateRack(e: React.FormEvent) {
    e.preventDefault();
    if (!newRackName.trim()) return;

    setLoadingAction(true);
    setErrorText("");
    try {
      const payload = {
        device_name: newRackName.trim(),
        device_type_key: "RACK",
        asset_group: "passive",
        status: "installed",
        region_id: regionId,
        pop_id: popId,
        specifications: {
          rack_u_height: parseInt(newRackUHeight) || 42,
          rack_width_inches: 19,
          rack_type: "closed_cabinet",
        },
      };

      await apiFetch("/devices", {
        method: "POST",
        token,
        body: JSON.stringify(payload),
      });

      setShowCreateRack(false);
      setNewRackName("");
      setNewRackUHeight("42");
      onRefresh();
    } catch (err: unknown) {
      setErrorText((err as Error).message || "Gagal membuat Rack baru.");
    } finally {
      setLoadingAction(false);
    }
  }

  async function handleDeleteRack() {
    if (!selectedRackToDelete) return;
    setLoadingAction(true);
    setErrorText("");
    try {
      // Find devices mounted in this rack and unmount them first
      const mountedInThisRack = nonRacks.filter(
        (d) => d.specifications?.rack_device_id === selectedRackToDelete.id
      );

      // Unmount each device
      for (const dev of mountedInThisRack) {
        const updatedSpecs = { ...dev.specifications } as PopDeviceSpecs;
        delete updatedSpecs.rack_device_id;
        delete updatedSpecs.rack_unit_position;
        delete updatedSpecs.u_height;

        await apiFetch(`/devices/${dev.id}`, {
          method: "PATCH",
          token,
          body: JSON.stringify({ specifications: updatedSpecs }),
        });
      }

      // Delete the rack itself
      await apiFetch(`/devices/${selectedRackToDelete.id}`, {
        method: "DELETE",
        token,
      });

      setShowConfirmDeleteRack(false);
      setSelectedRackToDelete(null);
      onRefresh();
    } catch (err: unknown) {
      setErrorText((err as Error).message || "Gagal menghapus Rack.");
    } finally {
      setLoadingAction(false);
    }
  }

  async function handleMountDevice(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedDeviceToMount || !selectedRackToMount) return;

    setLoadingAction(true);
    setErrorText("");
    try {
      const uPos = parseInt(mountPosition);
      const height = parseInt(mountHeight);

      // Simple validation for U boundaries
      const targetRack = racks.find((r) => r.id === selectedRackToMount);
      const rackHeight = targetRack?.specifications?.rack_u_height || 42;

      if (uPos < 1 || uPos + height - 1 > rackHeight) {
        throw new Error(`Posisi perangkat melebihi tinggi rak (${rackHeight}U).`);
      }

      // Check if slot overlaps with other mounted devices
      const occupiedInRack = nonRacks.filter(
        (d) => d.specifications?.rack_device_id === selectedRackToMount && d.id !== selectedDeviceToMount.id
      );

      for (const dev of occupiedInRack) {
        const devPos = parseInt(String(dev.specifications?.rack_unit_position || "1"));
        const devHeight = parseInt(String(dev.specifications?.u_height || "1"));
        
        // Overlap condition:
        const startA = uPos;
        const endA = uPos + height - 1;
        const startB = devPos;
        const endB = devPos + devHeight - 1;

        if (startA <= endB && endA >= startB) {
          throw new Error(`Slot U${startB} sampai U${endB} sudah diisi oleh perangkat: ${dev.device_name}`);
        }
      }

      const currentSpecs = selectedDeviceToMount.specifications || {};
      const updatedSpecs = {
        ...currentSpecs,
        rack_device_id: selectedRackToMount,
        rack_unit_position: uPos,
        u_height: height,
      };

      await apiFetch(`/devices/${selectedDeviceToMount.id}`, {
        method: "PATCH",
        token,
        body: JSON.stringify({ specifications: updatedSpecs }),
      });

      setShowMountDevice(false);
      setSelectedDeviceToMount(null);
      setSelectedRackToMount("");
      onRefresh();
    } catch (err: unknown) {
      setErrorText((err as Error).message || "Gagal memasang perangkat.");
    } finally {
      setLoadingAction(false);
    }
  }

  async function handleUnmountDevice(device: PopDevice) {
    if (!window.confirm(`Lepaskan perangkat ${device.device_name} dari Rack?`)) return;

    try {
      const updatedSpecs = { ...device.specifications } as PopDeviceSpecs;
      delete updatedSpecs.rack_device_id;
      delete updatedSpecs.rack_unit_position;
      delete updatedSpecs.u_height;

      await apiFetch(`/devices/${device.id}`, {
        method: "PATCH",
        token,
        body: JSON.stringify({ specifications: updatedSpecs }),
      });

      onRefresh();
    } catch (err: unknown) {
      alert((err as Error).message || "Gagal melepas perangkat.");
    }
  }

  // Visual render helpers
  const getDeviceTypeColor = (type: string) => {
    switch (type?.toUpperCase()) {
      case "OLT":
        return "bg-blue-500/10 border-blue-500 text-blue-700 dark:text-blue-300";
      case "SWITCH":
        return "bg-emerald-500/10 border-emerald-500 text-emerald-700 dark:text-emerald-300";
      case "OTB":
        return "bg-amber-500/10 border-amber-500 text-amber-700 dark:text-amber-300";
      case "RECTIFIER":
        return "bg-orange-500/10 border-orange-500 text-orange-700 dark:text-orange-300";
      case "ROUTER":
        return "bg-indigo-500/10 border-indigo-500 text-indigo-700 dark:text-indigo-300";
      default:
        return "bg-slate-500/10 border-slate-500 text-slate-700 dark:text-slate-300";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold tracking-tight">Rack & Tata Letak Perangkat</h3>
          <p className="text-xs text-muted-foreground">Kelola tata letak perangkat aktif dan pasif di dalam POP cabinet.</p>
        </div>
        <Button onClick={() => setShowCreateRack(true)}>
          <Plus className="mr-2 size-4" /> Tambah Rack Baru
        </Button>
      </div>

      {racks.length === 0 ? (
        <Card className="flex flex-col items-center justify-center border-dashed p-8 text-center">
          <Server className="size-10 text-muted-foreground mb-3 stroke-[1.5]" />
          <CardTitle className="text-base">Belum ada Rack di POP ini</CardTitle>
          <CardDescription className="max-w-xs mt-1 text-xs">
            Buat Rack kabinet baru terlebih dahulu untuk mulai menempatkan OLT, OTB, Switch, dan Rectifier.
          </CardDescription>
          <Button variant="outline" className="mt-4" onClick={() => setShowCreateRack(true)}>
            <Plus className="mr-2 size-4" /> Tambah Rack Baru
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-6">
          {/* Racks Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {racks.map((rack) => {
              const uHeight = rack.specifications?.rack_u_height || 42;
              
              // Build slots map
              const slotsMap = Array(uHeight + 1).fill(null);
              nonRacks.forEach((d) => {
                const specs = d.specifications;
                if (specs?.rack_device_id === rack.id) {
                  const pos = parseInt(String(specs.rack_unit_position || "1"));
                  const h = parseInt(String(specs.u_height || "1")) || 1;
                  if (pos >= 1 && pos <= uHeight) {
                    slotsMap[pos] = { device: d, isStart: true, height: h };
                    for (let i = pos + 1; i < pos + h; i++) {
                      if (i <= uHeight) {
                        slotsMap[i] = { device: d, isStart: false };
                      }
                    }
                  }
                }
              });

              // Render slots from top to bottom
              const slots = [];
              for (let u = uHeight; u >= 1; u--) {
                const slotInfo = slotsMap[u];
                if (slotInfo) {
                  if (slotInfo.isStart) {
                    slots.push(
                      <div
                        key={u}
                        className={`border border-l-4 rounded-md p-2 flex flex-col justify-between transition-shadow hover:shadow-sm ${getDeviceTypeColor(
                          slotInfo.device.device_type_key
                        )}`}
                        style={{ height: `${slotInfo.height * 36}px` }}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <div className="truncate">
                            <p className="font-semibold text-xs truncate" title={slotInfo.device.device_name}>
                              {slotInfo.device.device_name}
                            </p>
                            <div className="flex gap-1.5 mt-0.5 items-center">
                              <Badge variant="outline" className="text-[9px] px-1 h-4">
                                {slotInfo.device.device_type_key}
                              </Badge>
                              <span className="text-[10px] opacity-75">
                                U{slotInfo.device.specifications?.rack_unit_position} ({slotInfo.height}U)
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-0.5">
                            <a
                              href={`/data-management/list/${slotInfo.device.device_type_key?.toLowerCase()}/${slotInfo.device.id}`}
                              className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded"
                              title="Lihat Detail"
                            >
                              <ExternalLink className="size-3" />
                            </a>
                            <button
                              onClick={() => handleUnmountDevice(slotInfo.device)}
                              className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded text-destructive"
                              title="Lepas dari Rack"
                            >
                              <Unlink className="size-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                    u -= slotInfo.height - 1; // Skip spanned slots
                  }
                } else {
                  // Empty slot
                  slots.push(
                    <div
                      key={u}
                      onClick={() => {
                        setSelectedRackToMount(rack.id);
                        setMountPosition(String(u));
                        setMountHeight("1");
                        setShowMountDevice(true);
                      }}
                      className="h-[32px] border border-dashed border-border rounded flex items-center justify-between px-3 text-[10px] text-muted-foreground bg-muted/20 hover:bg-muted/40 hover:border-primary/50 cursor-pointer group transition-colors"
                    >
                      <span>U{u}</span>
                      <span className="opacity-0 group-hover:opacity-100 text-primary transition-opacity text-[9px] flex items-center">
                        <Plus className="size-2.5 mr-1" /> Pasang Perangkat
                      </span>
                    </div>
                  );
                }
              }

              return (
                <Card key={rack.id} className="relative overflow-hidden border-2 border-slate-300 dark:border-slate-800">
                  {/* Rack Header */}
                  <div className="bg-slate-100 dark:bg-slate-800 px-4 py-3 flex items-center justify-between border-b">
                    <div>
                      <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                        <Server className="size-4 text-muted-foreground" />
                        {rack.device_name}
                      </h4>
                      <p className="text-[10px] text-muted-foreground">
                        Kapasitas: {uHeight}U | {devices.filter(d => d.specifications?.rack_device_id === rack.id).length} perangkat
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        setSelectedRackToDelete(rack);
                        setShowConfirmDeleteRack(true);
                      }}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>

                  {/* Rack Cabinet Graphic */}
                  <CardContent className="p-3 bg-slate-50 dark:bg-slate-900/50">
                    <div className="border-4 border-slate-700 dark:border-slate-800 rounded-lg p-2.5 bg-black/5 space-y-1 max-h-[600px] overflow-y-auto scrollbar-thin">
                      {/* Ventilation Grill Mockup */}
                      <div className="flex flex-col gap-0.5 mb-2 opacity-30">
                        <div className="h-1 bg-slate-400 dark:bg-slate-700 w-full rounded" />
                        <div className="h-1 bg-slate-400 dark:bg-slate-700 w-full rounded" />
                        <div className="h-1 bg-slate-400 dark:bg-slate-700 w-full rounded" />
                      </div>
                      
                      {/* Slots Container */}
                      <div className="space-y-1.5">
                        {slots}
                      </div>

                      {/* Bottom Grill */}
                      <div className="flex flex-col gap-0.5 mt-3 opacity-30">
                        <div className="h-1 bg-slate-400 dark:bg-slate-700 w-full rounded" />
                        <div className="h-1 bg-slate-400 dark:bg-slate-700 w-full rounded" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Unmounted Devices Sidebar */}
          <div>
            <Card className="h-fit">
              <CardHeader className="p-4">
                <CardTitle className="text-sm flex items-center gap-1.5">
                  <Layers className="size-4 text-muted-foreground" />
                  Perangkat Belum Terpasang
                </CardTitle>
                <CardDescription className="text-[11px]">
                  Daftar perangkat di POP ini yang belum dimasukkan ke dalam Rack.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-3 max-h-[500px] overflow-y-auto">
                {unmountedDevices.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">
                    Semua perangkat telah terpasang ke Rack.
                  </p>
                ) : (
                  unmountedDevices.map((device) => (
                    <div
                      key={device.id}
                      className="border rounded-md p-2.5 flex flex-col justify-between gap-2 hover:bg-muted/30 transition-colors bg-card"
                    >
                      <div className="truncate">
                        <p className="font-semibold text-xs truncate" title={device.device_name}>
                          {device.device_name}
                        </p>
                        <div className="flex gap-1.5 mt-1 items-center">
                          <Badge variant="secondary" className="text-[9px] px-1 h-3.5">
                            {device.device_type_key}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground truncate">
                            {device.device_id}
                          </span>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full text-xs h-7"
                        onClick={() => {
                          setSelectedDeviceToMount(device);
                          setSelectedRackToMount(racks[0]?.id || "");
                          setMountPosition("1");
                          setMountHeight("1");
                          setShowMountDevice(true);
                        }}
                      >
                        <Plus className="size-3 mr-1" /> Pasang ke Rack
                      </Button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* CREATE RACK MODAL */}
      {showCreateRack && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-background rounded-lg border max-w-sm w-full shadow-lg p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-1.5">
                <Server className="size-4 text-primary" />
                Tambah Rack Baru
              </h3>
              <Button size="icon" variant="ghost" className="size-7" onClick={() => setShowCreateRack(false)}>
                <X className="size-4" />
              </Button>
            </div>

            <form onSubmit={handleCreateRack} className="space-y-3.5">
              <div className="space-y-1.5">
                <Label htmlFor="rack-name" className="text-xs">Nama Rack</Label>
                <Input
                  id="rack-name"
                  placeholder="Contoh: Rack 01, Cabinet A"
                  value={newRackName}
                  onChange={(e) => setNewRackName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="rack-height" className="text-xs">Tinggi Rak (U)</Label>
                <Select value={newRackUHeight} onValueChange={setNewRackUHeight}>
                  <SelectTrigger id="rack-height">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12">12 U (Wallmount/Kecil)</SelectItem>
                    <SelectItem value="20">20 U</SelectItem>
                    <SelectItem value="30">30 U</SelectItem>
                    <SelectItem value="42">42 U (Standard)</SelectItem>
                    <SelectItem value="45">45 U</SelectItem>
                    <SelectItem value="48">48 U</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {errorText && (
                <div className="p-2.5 rounded bg-destructive/10 text-destructive text-xs flex gap-1.5 items-start">
                  <AlertCircle className="size-4 shrink-0 mt-0.5" />
                  <span>{errorText}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowCreateRack(false)}>
                  Batal
                </Button>
                <Button type="submit" size="sm" disabled={loadingAction}>
                  {loadingAction ? "Menyimpan..." : "Tambah"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MOUNT DEVICE MODAL */}
      {showMountDevice && selectedDeviceToMount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-background rounded-lg border max-w-sm w-full shadow-lg p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-1.5">
                <Cpu className="size-4 text-primary" />
                Pasang Perangkat ke Rack
              </h3>
              <Button size="icon" variant="ghost" className="size-7" onClick={() => setShowMountDevice(false)}>
                <X className="size-4" />
              </Button>
            </div>

            <div className="p-2.5 rounded bg-muted text-xs">
              <p className="font-semibold text-foreground">{selectedDeviceToMount.device_name}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Tipe: {selectedDeviceToMount.device_type_key} | {selectedDeviceToMount.device_id}</p>
            </div>

            <form onSubmit={handleMountDevice} className="space-y-3.5">
              <div className="space-y-1.5">
                <Label htmlFor="target-rack" className="text-xs">Pilih Rack</Label>
                <Select value={selectedRackToMount} onValueChange={setSelectedRackToMount}>
                  <SelectTrigger id="target-rack">
                    <SelectValue placeholder="Pilih Rack tujuan" />
                  </SelectTrigger>
                  <SelectContent>
                    {racks.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.device_name} ({r.specifications?.rack_u_height || 42}U)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="u-position" className="text-xs">Posisi Mulai U</Label>
                  <Input
                    id="u-position"
                    type="number"
                    min="1"
                    max={racks.find((r) => r.id === selectedRackToMount)?.specifications?.rack_u_height || 42}
                    value={mountPosition}
                    onChange={(e) => setMountPosition(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="u-height" className="text-xs">Tinggi Device (U)</Label>
                  <Select value={mountHeight} onValueChange={setMountHeight}>
                    <SelectTrigger id="u-height">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 U (Switch/OTB)</SelectItem>
                      <SelectItem value="2">2 U (OLT/Rectifier)</SelectItem>
                      <SelectItem value="3">3 U</SelectItem>
                      <SelectItem value="4">4 U</SelectItem>
                      <SelectItem value="6">6 U</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {errorText && (
                <div className="p-2.5 rounded bg-destructive/10 text-destructive text-xs flex gap-1.5 items-start">
                  <AlertCircle className="size-4 shrink-0 mt-0.5" />
                  <span>{errorText}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowMountDevice(false)}>
                  Batal
                </Button>
                <Button type="submit" size="sm" disabled={loadingAction}>
                  {loadingAction ? "Menyimpan..." : "Mount Perangkat"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE RACK MODAL */}
      {showConfirmDeleteRack && selectedRackToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-background rounded-lg border max-w-sm w-full shadow-lg p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-destructive flex items-center gap-1.5">
                <AlertCircle className="size-4" />
                Hapus Rack?
              </h3>
              <Button size="icon" variant="ghost" className="size-7" onClick={() => setShowConfirmDeleteRack(false)}>
                <X className="size-4" />
              </Button>
            </div>

            <div className="text-xs text-muted-foreground space-y-2">
              <p>
                Menghapus rak <span className="font-bold text-foreground">{selectedRackToDelete.device_name}</span> akan melepaskan seluruh perangkat yang saat ini terpasang di dalamnya kembali menjadi status &quot;Perangkat Belum Terpasang&quot;.
              </p>
              <p className="font-semibold text-destructive">Tindakan ini tidak dapat dibatalkan.</p>
            </div>

            {errorText && (
              <div className="p-2.5 rounded bg-destructive/10 text-destructive text-xs flex gap-1.5 items-start">
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <span>{errorText}</span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowConfirmDeleteRack(false)}>
                Batal
              </Button>
              <Button type="submit" variant="destructive" size="sm" disabled={loadingAction} onClick={handleDeleteRack}>
                {loadingAction ? "Menghapus..." : "Ya, Hapus Rak"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
