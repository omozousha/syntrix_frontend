"use client";

import type { ReactNode } from "react";
import { CheckCircle2, CircleHelp, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type ValidationState = {
  state: "idle" | "valid" | "invalid";
  message: string;
};

export function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  tooltip,
  containerClassName,
  badge,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  tooltip?: string;
  containerClassName?: string;
  badge?: ReactNode;
  required?: boolean;
}) {
  return (
    <div className={`space-y-1.5 ${containerClassName || ""}`}>
      <FieldLabel label={label} tooltip={tooltip || getDefaultTooltip(label)} badge={badge} required={required} />
      <Input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </div>
  );
}

export function CidField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const validation = validateCid(value);

  return (
    <div className="space-y-1.5">
      <FieldLabel label="CID" tooltip="Customer ID dari sistem layanan/billing. Jika diisi, wajib tepat 8 digit angka." />
      <Input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={8}
        value={value}
        onChange={(event) => onChange(normalizeCidInput(event.target.value))}
        placeholder="12345678"
      />
      <ValidationBadge validation={validation} />
    </div>
  );
}

export function CoordinateField({
  label,
  value,
  onChange,
  kind,
  badge,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  kind: "longitude" | "latitude";
  badge?: ReactNode;
}) {
  const validation = validateCoordinateFormat(value, kind);
  const placeholder = kind === "latitude" ? "-6.200000" : "106.816666";

  return (
    <div className="space-y-1.5">
      <FieldLabel
        label={label}
        badge={badge}
        tooltip={
          kind === "latitude"
            ? "Format: -x.xxxxxx (contoh: -6.200000). Wajib minus di depan, minimal 6 digit desimal."
            : "Format: xxx.xxxxxx (contoh: 106.816666). Tiga digit di depan, minimal 6 digit desimal."
        }
      />
      <Input type="text" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
      <ValidationBadge validation={validation} />
    </div>
  );
}

export function FieldLabel({ label, tooltip, badge, required }: { label: string; tooltip?: string | null; badge?: ReactNode; required?: boolean }) {
  const labelContent = (
    <>
      {label}
      {required ? <span className="text-destructive ml-0.5">*</span> : null}
    </>
  );

  if (!tooltip) {
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        <Label>{labelContent}</Label>
        {badge}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Label>{labelContent}</Label>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" className="text-muted-foreground hover:text-foreground" aria-label={`Info ${label}`}>
              <CircleHelp className="size-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={6}>
            {tooltip}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      {badge}
    </div>
  );
}

export function AutoFilledBadge({ label = "Auto-filled" }: { label?: string }) {
  return (
    <Badge variant="outline" className="h-4 rounded px-1.5 text-[9px] font-medium uppercase tracking-normal text-blue-700 dark:text-blue-300">
      {label}
    </Badge>
  );
}

export function validateCid(value: string): ValidationState {
  if (!value.trim()) return { state: "idle", message: "" };
  if (/^\d{8}$/.test(value)) return { state: "valid", message: "8 digit" };
  return { state: "invalid", message: "CID harus 8 digit angka" };
}

export function validateCoordinateFormat(value: string, kind: "longitude" | "latitude"): ValidationState {
  const text = value.trim();
  if (!text) return { state: "idle", message: "" };
  const pattern = kind === "latitude" ? /^-\d{1,2}\.\d{6,}$/ : /^\d{3}\.\d{6,}$/;
  if (pattern.test(text)) return { state: "valid", message: "Format OK" };
  return {
    state: "invalid",
    message: kind === "latitude" ? "Latitude wajib format -x.xxxxxx" : "Longitude wajib format xxx.xxxxxx",
  };
}

function ValidationBadge({ validation }: { validation: ValidationState }) {
  if (validation.state === "idle") return null;
  return (
    <Badge
      variant="outline"
      className={`${validation.state === "valid" ? "border-emerald-300 text-emerald-700" : "border-rose-300 text-rose-700"} h-4 w-fit gap-0.5 px-1.5 text-[10px]`}
    >
      {validation.state === "valid" ? <CheckCircle2 className="mr-0.5 size-3" /> : <XCircle className="mr-0.5 size-3" />}
      {validation.message}
    </Badge>
  );
}

function normalizeCidInput(value: string) {
  return value.replace(/\D/g, "").slice(0, 8);
}

function getDefaultTooltip(label: string) {
  const map: Record<string, string> = {
    "POP Name": "Nama POP yang mudah dikenali di lapangan dan laporan.",
    "POP Code (3 huruf)": "Kode singkat 3 huruf unik per POP, contoh CBO.",
    "Device Name": "Nama perangkat sesuai penamaan operasional.",
    "Customer Name": "Nama pelanggan atau titik layanan.",
    CID: "Customer ID dari sistem layanan/billing jika tersedia.",
    "Service Type": "Jenis layanan customer dari master data, misalnya Internet, Metro Ethernet, atau Dedicated Link.",
    "Contact Name": "Nama PIC customer yang dapat dihubungi.",
    "Contact Phone": "Nomor telepon PIC customer.",
    "BAST Number": "Nomor BAST untuk referensi serah terima project.",
    "SPK Number": "Nomor SPK untuk referensi kontrak pekerjaan.",
    "Validation Date": "Tanggal validasi terakhir untuk data ini.",
    Tenant: "Nama tenant/penyewa site POP jika ada. Tenant perangkat dikelola dari master data Tenant.",
    "PLN CID Number": "Nomor pelanggan listrik PLN untuk POP.",
    "PLN Payment Method": "Metode pembayaran listrik, misalnya prepaid/postpaid.",
    "PLN Phase": "Jenis phase listrik, misalnya 1 phase atau 3 phase.",
    "PLN Wattage": "Daya listrik terpasang pada POP dalam watt.",
    "POP Type": "Klasifikasi POP, misalnya core/distribution/edge.",
    "Tanggal POP Aktif": "Tanggal POP mulai beroperasi aktif.",
    "Tags (comma separated)": "Tag dipisahkan koma untuk pencarian/filter data.",
    "Capacity Core": "Total kapasitas core pada perangkat.",
    "Used Core": "Jumlah core yang sudah dipakai.",
    "Total Ports": "Total port yang tersedia pada perangkat.",
    "Used Ports": "Jumlah port yang sudah terpakai.",
    "Splitter Ratio": "Rasio splitter perangkat ODP, misalnya 1:8.",
    Address: "Alamat lengkap lokasi POP/perangkat/customer. Wajib diisi untuk customer.",
    City: "Kota/Kabupaten lokasi.",
    Province: "Provinsi lokasi.",
    Longitude: "Koordinat bujur lokasi.",
    Latitude: "Koordinat lintang lokasi.",
    Title: "Judul yang ditampilkan untuk custom field.",
    "Field Key": "Kode internal custom field (snake_case), dipakai sebagai key data.",
    "Options (CSV)": "Opsi nilai untuk select/multiselect, pisahkan dengan koma.",
    "Help Text": "Bantuan singkat yang akan tampil sebagai tooltip field.",
  };
  return map[label] || "";
}
