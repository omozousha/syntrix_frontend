import Link from "next/link";
import { CheckCircle2, CircleHelp, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// ── Shared Types ──────────────────────────────────────────────────────────

// ── DeviceBaseForm — semua shared field yang identik untuk semua device type ──

export type DeviceBaseForm = {
  device_id: string;
  device_name: string;
  device_type_key: string;
  asset_group: string;
  status: string;
  installation_date: string;
  validation_date: string;
  pop_id: string;
  region_id: string;
  project_id: string;
  tenant_id: string;
  manufacturer_id: string;
  brand_id: string;
  model_id: string;
  serial_number: string;
  address: string;
  province_id: string;
  city_id: string;
  longitude: string;
  latitude: string;
  tags: string;
};

// ── EditableForm — generic fallback ──
//
// `EditableForm` adalah tipe form umum yang dipakai oleh SEMUA resource
// (devices, POPs, customers, projects, routes). Karena itu Dictionary-style
// `Record<string, string>` tetap dipertahankan untuk backward compatibility.
//
export type EditableForm = Record<string, string>;

// ── DeviceForm — typed shared fields + index signature ──
//
// `DeviceForm` adalah tipe form khusus DEVICE dengan base fields yang sudah
// terdefinisi. Device-specific form components (DefaultInfoSection, device
// form components) menggunakan `DeviceForm` untuk type safety base fields.
// Index signature mengakomodasi field spesifik per device type.
//
export type DeviceForm = DeviceBaseForm & Record<string, string>;

// ── Per-Device-Type Extended Forms (untuk dokumentasi / IDE autocomplete) ──
//
// Extended types berikut mendefinisikan field tambahan per device type.
// Tidak dipakai secara langsung di type system karena form dikelola sebagai
// `EditableForm` di page level. Digunakan untuk dokumentasi dan autocomplete.
//

export type OdcEditableForm = DeviceBaseForm & {
  capacity_core: string;
  used_core: string;
  total_ports: string;
  used_ports: string;
  splitter_ratio: string;
  feeder_port_count: string;
  distribution_port_count: string;
  upstream_device_id: string;
  upstream_cable_id: string;
  upstream_core_start: string;
  upstream_core_end: string;
};

export type OdpEditableForm = DeviceBaseForm & {
  odp_type: string;
  installation_type: string;
  total_ports: string;
  used_ports: string;
  splitter_ratio: string;
  source_odc_id: string;
  source_odc_port_id: string;
  feeder_cable_id: string;
  feeder_core_start: string;
  feeder_core_end: string;
  odp_customer_id: string;
};

export type CableEditableForm = DeviceBaseForm & {
  cable_type: string;
  cable_category: string;
  capacity_core: string;
  used_core: string;
  total_ports: string;
  used_ports: string;
  cable_length_m: string;
  splitter_ratio: string;
  route_name: string;
  route_type: string;
  from_device_id: string;
  from_port_id: string;
  to_device_id: string;
  to_port_id: string;
  route_id: string;
};

export type OltEditableForm = DeviceBaseForm & {
  management_ip: string;
  capacity_core: string;
  used_core: string;
  pon_port_count: string;
  uplink_port_count: string;
  total_ports: string;
  used_ports: string;
  splitter_ratio: string;
  uplink_switch_id: string;
  uplink_router_id: string;
};

export type OntEditableForm = DeviceBaseForm & {
  management_ip: string;
  total_ports: string;
  used_ports: string;
  splitter_ratio: string;
  source_odp_id: string;
  source_odp_port_id: string;
  source_olt_id: string;
};

export type OtbEditableForm = DeviceBaseForm & {
  capacity_core: string;
  used_core: string;
  total_ports: string;
  used_ports: string;
  splitter_ratio: string;
  connector_type: string;
  tray_slot_count: string;
  from_device_id: string;
  to_device_id: string;
  from_cable_id: string;
  to_cable_id: string;
  is_backbone_connection: string;
};

export type JcEditableForm = DeviceBaseForm & {
  from_cable_id: string;
  to_cable_id: string;
  core_start: string;
  core_end: string;
  splice_tray_count: string;
};

export type GenericEditableForm = DeviceBaseForm & {
  management_ip: string;
  capacity_core: string;
  used_core: string;
  total_ports: string;
  used_ports: string;
  splitter_ratio: string;
  rack_device_id: string;
  rack_unit_position: string;
  u_height: string;
  uplink_device_id: string;
  from_cable_id: string;
  to_cable_id: string;
};

export type RelationLabels = {
  region?: string;
  pop?: string;
  project?: string;
  manufacturer?: string;
  brand?: string;
  model?: string;
  tenant?: string;
  province?: string;
  city?: string;
};

export type SplitterProfileOption = {
  id: string;
  ratio_label: string;
  output_port_count?: number | null;
  allowed_device_type_keys?: string[] | null;
};

export type OdpTypeOption = {
  id: string;
  odp_type_name: string;
  odp_type_code?: string | null;
};

export type InstallationTypeOption = {
  id: string;
  installation_type_name: string;
  installation_type_code?: string | null;
};

export type TenantOption = {
  id: string;
  tenant_name: string;
  tenant_code?: string | null;
};

export type PopLookupOption = {
  id: string;
  pop_id?: string | null;
  pop_code?: string | null;
  pop_name?: string | null;
  region_id?: string | null;
};

export type ProjectLookupOption = {
  id: string;
  project_id?: string | null;
  project_code?: string | null;
  project_name?: string | null;
  region_id?: string | null;
  pop_id?: string | null;
};

export type OdpFieldValidationPayload = {
  new_device_name?: string | null;
};

export type ProvinceOption = {
  id: string;
  province_name: string;
};

export type CityOption = {
  id: string;
  city_name: string;
  province_id?: string | null;
};

// ── Constants ──────────────────────────────────────────────────────────────

export const DEVICE_STATUS_OPTIONS = ["draft", "installed", "active", "inactive", "maintenance", "retired"];

export const DEVICE_TECHNICAL_COPY: Record<string, {
  title: string;
  coreCapacityLabel?: string;
  usedCoreLabel?: string;
  totalPortsLabel: string;
  usedPortsLabel: string;
  splitterLabel: string;
  corePlaceholder?: string;
}> = {
  ODP: {
    title: "Technical ODP",
    totalPortsLabel: "Kapasitas ODP",
    usedPortsLabel: "Port Aktif",
    splitterLabel: "Kapasitas Splitter",
    corePlaceholder: "Auto from core chain",
  },
  ODC: {
    title: "Technical ODC",
    coreCapacityLabel: "Total Core Capacity",
    usedCoreLabel: "Used Core",
    totalPortsLabel: "Total Port Cabinet",
    usedPortsLabel: "Port Terpakai",
    splitterLabel: "Splitter Profile",
  },
  OLT: {
    title: "Technical OLT",
    totalPortsLabel: "Total PON/Uplink Ports",
    usedPortsLabel: "Used Ports",
    splitterLabel: "Splitter Ratio",
  },
  ONT: {
    title: "Technical ONT",
    totalPortsLabel: "Total Service Ports",
    usedPortsLabel: "Used Service Ports",
    splitterLabel: "Splitter Ratio",
  },
  CABLE: {
    title: "Technical Cable",
    totalPortsLabel: "Endpoint Ports",
    usedPortsLabel: "Used Endpoint Ports",
    splitterLabel: "Splitter Ratio",
  },
  SWITCH: {
    title: "Technical Switch",
    totalPortsLabel: "Interface Count",
    usedPortsLabel: "Used Interfaces",
    splitterLabel: "Splitter Ratio",
  },
  ROUTER: {
    title: "Technical Router",
    totalPortsLabel: "Interface Count",
    usedPortsLabel: "Used Interfaces",
    splitterLabel: "Splitter Ratio",
  },
  OTB: {
    title: "Technical OTB",
    coreCapacityLabel: "Total Core Capacity",
    usedCoreLabel: "Used Core",
    totalPortsLabel: "Total Port",
    usedPortsLabel: "Used Port",
    splitterLabel: "Splitter Ratio",
  },
};

// ── Utility Functions ──────────────────────────────────────────────────────

export function valueOf(value: unknown, fallback = "") {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
}

export function validateCoordinateFormat(value: string, kind: "longitude" | "latitude") {
  const text = value.trim();
  if (!text) return { state: "idle" as const, message: "" };

  if (kind === "longitude") {
    const valid = /^-?\d{3}\.\d{6,}$/.test(text);
    return {
      state: valid ? ("valid" as const) : ("invalid" as const),
      message: valid ? "Format valid" : "Format longitude: 3 digit depan dan minimal 6 desimal",
    };
  }

  const valid = /^-\d{1,2}\.\d{6,}$/.test(text);
  return {
    state: valid ? ("valid" as const) : ("invalid" as const),
    message: valid ? "Format valid" : "Format latitude wajib minus dan minimal 6 desimal",
  };
}

// ── Helper UI Components ───────────────────────────────────────────────────

export function SplitterRatioField({
  value,
  label,
  editing,
  deviceTypeKey,
  splitterProfiles,
  onValueChange,
}: {
  value: string;
  label: string;
  editing: boolean;
  deviceTypeKey: string;
  splitterProfiles: SplitterProfileOption[];
  onValueChange: (value: string) => void;
}) {
  const filteredSplitterProfiles = splitterProfiles.filter((profile) => {
    const allowedKeys = profile.allowed_device_type_keys || [];
    if (!allowedKeys.length) return false;
    return allowedKeys.includes(deviceTypeKey);
  });

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-1.5">
        <Label>{label}</Label>
        <Badge variant="outline" className="h-4 rounded px-1.5 text-[9px] uppercase tracking-normal text-blue-700 dark:text-blue-300">
          Auto-fill
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground">
        Pilihan splitter mengisi rekomendasi kapasitas port. Review kembali sebelum menyimpan perubahan.
      </p>
      <Combobox
        value={value}
        onValueChange={onValueChange}
        disabled={!editing}
        triggerClassName="h-8 text-xs"
        options={[
          { value: "__none__", label: "Pilih splitter ratio" },
          ...filteredSplitterProfiles.map((item) => ({
            value: item.ratio_label,
            label: item.output_port_count ? `${item.ratio_label} (${item.output_port_count} port)` : item.ratio_label,
          })),
        ]}
        searchPlaceholder="Cari splitter ratio..."
      />
    </div>
  );
}

export function ComboboxField({
  label,
  value,
  options,
  searchPlaceholder,
  onValueChange,
  disabled,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  searchPlaceholder?: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Combobox
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        triggerClassName="h-8 text-xs"
        options={options}
        searchPlaceholder={searchPlaceholder}
      />
    </div>
  );
}

export function DisplayField({
  label,
  value,
  className = "",
  compact = false,
  loading = false,
}: {
  label: string;
  value: string;
  className?: string;
  compact?: boolean;
  loading?: boolean;
}) {
  return (
    <div className={`${compact ? "space-y-1" : "space-y-1.5"} ${className}`}>
      <Label>{label}</Label>
      {loading ? (
        <Skeleton className={compact ? "h-8 w-full rounded-md" : "h-10 w-full rounded-md"} />
      ) : (
        <Input value={value} disabled className={compact ? "h-8 text-xs" : undefined} />
      )}
    </div>
  );
}

export function LinkedDisplayField({
  label,
  value,
  href,
  className = "",
  compact = false,
  loading = false,
}: {
  label: string;
  value: string;
  href?: string;
  className?: string;
  compact?: boolean;
  loading?: boolean;
}) {
  if (loading) return <DisplayField label={label} value={value} className={className} compact={compact} loading />;
  if (!href || !value || value === "-") return <DisplayField label={label} value={value || "-"} className={className} compact={compact} />;

  return (
    <div className={`${compact ? "space-y-1" : "space-y-1.5"} ${className}`}>
      <Label>{label}</Label>
      <Link
        href={href}
        className={`flex items-center rounded-md border bg-muted px-3 text-xs font-medium text-foreground hover:underline ${compact ? "h-8" : "h-10"}`}
      >
        {value}
      </Link>
    </div>
  );
}

export function Field({
  label,
  value,
  onChange,
  type = "text",
  disabled,
  className = "",
  compact = false,
}: {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  type?: string;
  disabled?: boolean;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className={`${compact ? "space-y-1" : "space-y-1.5"} ${className}`}>
      <Label>{label}</Label>
      <Input
        type={type}
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        disabled={disabled}
        className={compact ? "h-8 text-xs" : undefined}
      />
    </div>
  );
}

export function CoordinateField({
  label,
  value,
  onChange,
  disabled,
  compact = false,
  kind,
}: {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  compact?: boolean;
  kind: "longitude" | "latitude";
}) {
  const validation = validateCoordinateFormat(value, kind);
  const placeholder = kind === "latitude" ? "-6.200000" : "106.816666";

  return (
    <div className={compact ? "space-y-1" : "space-y-1.5"}>
      <div className="flex items-center gap-1.5">
        <Label>{label}</Label>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button type="button" variant="ghost" size="icon-xs" className="text-muted-foreground" aria-label={`Info ${label}`}>
                <CircleHelp className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={6}>
              {kind === "latitude"
                ? "Format: -x.xxxxxx (contoh: -6.200000). Wajib minus di depan, minimal 6 digit desimal."
                : "Format: xxx.xxxxxx (contoh: 106.816666). Tiga digit di depan, minimal 6 digit desimal."}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <Input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange?.(event.target.value)}
        disabled={disabled}
        className={compact ? "h-8 text-xs" : undefined}
      />
      {validation.state !== "idle" ? (
        <Badge variant="outline" className={`${validation.state === "valid" ? "border-emerald-300 text-emerald-700" : "border-rose-300 text-rose-700"} h-4 w-fit gap-0.5 px-1.5 text-[10px]`}>
          {validation.state === "valid" ? <CheckCircle2 className="mr-0.5 size-3" /> : <XCircle className="mr-0.5 size-3" />}
          {validation.message}
        </Badge>
      ) : null}
    </div>
  );
}

export function SelectField({
  label,
  value,
  options,
  onValueChange,
  disabled,
  compact = false,
}: {
  label: string;
  value: string;
  options: string[];
  onValueChange: (value: string) => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "space-y-1" : "space-y-1.5"}>
      <Label>{label}</Label>
      <Combobox
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        triggerClassName={compact ? "h-8 text-xs" : undefined}
        options={options.map((option) => ({ value: option, label: option }))}
      />
    </div>
  );
}
