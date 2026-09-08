"use client";

import { useEffect, useState } from "react";
import { Server, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { RackOption } from "./pop-rack-mount-modal";

export const EIA310_RACK_HEIGHT_OPTIONS = [
  { value: "48", label: "48U — High Density Telco Cabinet" },
  { value: "45", label: "45U — Tall POP Cabinet" },
  { value: "42", label: "42U — Standard Full Cabinet (EIA-310-D Recommended)" },
  { value: "27", label: "27U — Mid Server Rack" },
  { value: "24", label: "24U — Half Cabinet (Secondary Shelter)" },
  { value: "18", label: "18U — Large Wallmount" },
  { value: "15", label: "15U — Mid Wallmount" },
  { value: "12", label: "12U — Standard Wallmount" },
  { value: "9", label: "9U — Compact Edge Enclosure" },
  { value: "6", label: "6U — Micro ODF Box" },
] as const;

export const RACK_TYPE_OPTIONS = [
  { value: "closed_cabinet", label: "Closed Cabinet (Pintu Kaca / Perforated)" },
  { value: "open_frame", label: "Open Frame Rack (4-Post / 2-Post)" },
  { value: "outdoor_enclosure", label: "Outdoor Weatherproof Cabinet (IP65)" },
] as const;

type PopRackFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  rack?: (RackOption & { rack_type?: string }) | null;
  defaultNextName?: string;
  onSubmit: (data: { device_name: string; rack_u_height: number; rack_type: string }) => Promise<void>;
};

export function PopRackFormDialog({
  open,
  onOpenChange,
  mode,
  rack,
  defaultNextName = "Rack 01",
  onSubmit,
}: PopRackFormDialogProps) {
  const [name, setName] = useState(defaultNextName);
  const [uHeight, setUHeight] = useState("42");
  const [rackType, setRackType] = useState("closed_cabinet");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      if (mode === "edit" && rack) {
        setName(rack.device_name || "");
        setUHeight(String(rack.rack_u_height || 42));
        setRackType(rack.rack_type || "closed_cabinet");
      } else {
        setName(defaultNextName);
        setUHeight("42");
        setRackType("closed_cabinet");
      }
      setError("");
    }
  }, [open, mode, rack, defaultNextName]);

  async function handleConfirm() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Nama rak tidak boleh kosong.");
      return;
    }
    const height = parseInt(uHeight, 10);
    if (Number.isNaN(height) || height < 1 || height > 60) {
      setError("Tinggi U harus berada di antara 1U dan 60U.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      await onSubmit({
        device_name: trimmed,
        rack_u_height: height,
        rack_type: rackType,
      });
      onOpenChange(false);
    } catch (err) {
      setError((err as Error).message || "Gagal menyimpan konfigurasi rak.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl border-border/60 shadow-lg glass-inset p-5 sm:p-6 space-y-4">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
              {mode === "create" ? <Server className="size-4" /> : <Settings2 className="size-4" />}
            </div>
            <div>
              <DialogTitle className="text-base font-bold">
                {mode === "create" ? "Tambah Rak Cabinet Baru" : "Edit Konfigurasi Rak"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Standar internasional EIA-310-D (Lebar 19&quot; rack mount).
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3 pt-2 text-xs">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Nama / Label Rak</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Rack 01 atau RK-A1"
              className="h-9 rounded-xl border-border/60 text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Kapasitas Tinggi Slot (U-Height)</Label>
            <Select value={uHeight} onValueChange={setUHeight}>
              <SelectTrigger className="h-9 rounded-xl border-border/60 font-mono text-xs">
                <SelectValue placeholder="Pilih kapasitas U" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border/60 max-h-56">
                {EIA310_RACK_HEIGHT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs font-mono">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Tipe Form Factor Cabinet</Label>
            <Select value={rackType} onValueChange={setRackType}>
              <SelectTrigger className="h-9 rounded-xl border-border/60 text-xs">
                <SelectValue placeholder="Pilih tipe cabinet" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border/60">
                {RACK_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-xl border border-border/50 bg-muted/20 p-2.5 space-y-1 text-[11px] text-muted-foreground">
            <p className="font-semibold text-foreground">Standar Spesifikasi:</p>
            <p>• Lebar Standar: <strong>19 inci</strong> (EIA-310-D compatible)</p>
            <p>• Penomoran Slot: U1 (paling bawah) s/d U{uHeight} (paling atas)</p>
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
            disabled={submitting || !name.trim()}
          >
            {submitting ? "Menyimpan..." : mode === "create" ? "Buat Rak" : "Simpan Perubahan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
