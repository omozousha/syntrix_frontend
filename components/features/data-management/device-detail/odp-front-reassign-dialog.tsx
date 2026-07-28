"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { apiFetch, type PaginatedResponse } from "@/lib/api";

type TopologyDeviceOption = { id: string; device_name: string; device_type_key: string };
type TopologyPortOption = { id: string; port_label?: string | null; port_index: number; status: string };

export function OdpFrontReassignDialog({
  odpDeviceId,
  odpPortId,
  token,
  onSuccess,
}: {
  odpDeviceId: string;
  odpPortId: string;
  token: string | null;
  onSuccess?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [frontDevices, setFrontDevices] = useState<TopologyDeviceOption[]>([]);
  const [frontDevicePorts, setFrontDevicePorts] = useState<TopologyPortOption[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [selectedPortId, setSelectedPortId] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token || !odpDeviceId) return;
    let cancelled = false;
    setFrontDevices([]);
    setFrontDevicePorts([]);
    setSelectedDeviceId("");
    setSelectedPortId("");
    setError("");

    async function load() {
      try {
        const result = await apiFetch<PaginatedResponse<TopologyDeviceOption>>(
          `/devices?status=installed&device_type_key=ODC&limit=200`,
          { token: token || undefined },
        );
        if (!cancelled) setFrontDevices(result.data || []);
      } catch {
        if (!cancelled) setFrontDevices([]);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [open, token, odpDeviceId]);

  useEffect(() => {
    if (!selectedDeviceId || !token) return;
    let cancelled = false;
    setFrontDevicePorts([]);
    setSelectedPortId("");
    async function loadPorts() {
      try {
        const result = await apiFetch<PaginatedResponse<TopologyPortOption>>(
          `/devicePorts?device_id=${selectedDeviceId}&status=idle&limit=200`,
          { token: token || undefined },
        );
        if (!cancelled) setFrontDevicePorts(result.data || []);
      } catch {
        if (!cancelled) setFrontDevicePorts([]);
      }
    }
    void loadPorts();
    return () => { cancelled = true; };
  }, [selectedDeviceId, token]);

  async function handleReassign() {
    if (!token || !selectedDeviceId || !selectedPortId) return;
    setSaving(true);
    setError("");
    try {
      await apiFetch(`/devices/${odpPortId}/reassign-front`, {
        method: "POST",
        token,
        body: JSON.stringify({
          new_front_device_id: selectedDeviceId,
          new_front_port_id: selectedPortId,
        }),
      });
      setOpen(false);
      onSuccess?.();
    } catch (err) {
      setError((err as Error).message || "Gagal mengganti ODC hulu");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          Ganti ODC Hulu
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ganti ODC Hulu</DialogTitle>
          <DialogDescription>
            Pilih ODC baru dan port idle untuk mengganti koneksi hulu ODP ini.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium">ODC Tujuan</label>
            <Combobox
              value={selectedDeviceId || "__none__"}
              onValueChange={(v) => setSelectedDeviceId(v === "__none__" ? "" : v)}
              options={[
                { value: "__none__", label: "Pilih ODC" },
                ...frontDevices.map((d) => ({
                  value: d.id,
                  label: `${d.device_name} (${d.device_type_key})`,
                })),
              ]}
              placeholder="Cari ODC..."
              searchPlaceholder="Cari ODC..."
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Port ODC Idle</label>
            <Combobox
              value={selectedPortId || "__none__"}
              onValueChange={(v) => setSelectedPortId(v === "__none__" ? "" : v)}
              options={[
                { value: "__none__", label: selectedDeviceId ? "Pilih port ODC" : "Pilih ODC terlebih dahulu" },
                ...frontDevicePorts.map((p) => ({
                  value: p.id,
                  label: p.port_label || `Port #${p.port_index}`,
                })),
              ]}
              placeholder={selectedDeviceId ? "Pilih port ODC" : "Pilih ODC terlebih dahulu"}
              disabled={!selectedDeviceId}
            />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>Batal</Button>
          <Button type="button" onClick={handleReassign} disabled={!selectedDeviceId || !selectedPortId || saving}>
            {saving ? "Menyimpan..." : "Ganti"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
