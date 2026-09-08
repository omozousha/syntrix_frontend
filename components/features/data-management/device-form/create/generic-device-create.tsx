"use client";

import { DeviceCreateForm } from "@/components/features/data-management/device-form/device-create-form";
import { DeviceHardwareFields } from "@/components/features/data-management/device-form/device-hardware-fields";
import { Field, FieldLabel } from "@/components/features/data-management/device-form/form-field-grid";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";

type OdpTypeOption = { id: string; odp_type_name: string; odp_type_code?: string | null };
type InstallationTypeOption = { id: string; installation_type_name: string; installation_type_code?: string | null };
type ManufacturerOption = { id: string; manufacturer_name: string; manufacturer_code?: string | null };
type BrandOption = { id: string; brand_name: string; brand_code?: string | null; manufacturer_id?: string | null };
type AssetModelOption = { id: string; model_name: string; model_code?: string | null; brand_id?: string | null; manufacturer_id?: string | null };
type TenantOption = { id: string; tenant_name: string; tenant_code?: string | null };
type ClosureTypeOption = { id: string; closure_type_name: string; closure_type_code?: string | null; max_core_capacity?: number | null; max_splice_capacity?: number | null };
type DeviceCoreCapacityOption = { core_capacity_value: number; label: string; allowed_device_type_keys?: string[] | null };

const NO_TECH_TYPES = new Set(["HH", "MH"]);

const CONNECTOR_TYPE_OPTIONS = [
  { value: "SC/UPC", label: "SC/UPC" },
  { value: "SC/APC", label: "SC/APC" },
  { value: "LC/UPC", label: "LC/UPC" },
  { value: "LC/APC", label: "LC/APC" },
  { value: "FC/UPC", label: "FC/UPC" },
  { value: "FC/APC", label: "FC/APC" },
];

const JC_ENVIRONMENT_OPTIONS = [
  { value: "Tiang / Aerial", label: "Tiang / Aerial" },
  { value: "Manhole", label: "Manhole" },
  { value: "Handhole", label: "Handhole" },
  { value: "Direct Buried", label: "Direct Buried (Bawah Tanah)" },
];

const U_HEIGHT_OPTIONS = [
  { value: "1", label: "1U (Standard Rack)" },
  { value: "2", label: "2U" },
  { value: "3", label: "3U" },
  { value: "4", label: "4U" },
  { value: "6", label: "6U" },
];

export type GenericCreateFormValues = {
  device_type_key: string;
  device_name: string;
  odp_type: string;
  installation_type: string;
  pop_id: string;
  region_id: string;
  tenant_id: string;
  project_id: string;
  manufacturer_id: string;
  brand_id: string;
  model_id: string;
  serial_number: string;
  capacity_core?: string;
  used_core?: string;
  total_ports?: string;
  used_ports?: string;
  management_ip?: string;
  vlan?: string;
  closure_type_id?: string;
  rack_unit_position?: string;
  u_height?: string;
  feeder_port_count?: string;
  customer_id?: string;
};

export function GenericDeviceCreate({
  values,
  odpTypes,
  installationTypes,
  tenants,
  manufacturers,
  brands,
  assetModels,
  closureTypes = [],
  deviceCoreCapacities = [],
  onChange,
}: {
  values: GenericCreateFormValues;
  odpTypes: OdpTypeOption[];
  installationTypes: InstallationTypeOption[];
  tenants: TenantOption[];
  manufacturers: ManufacturerOption[];
  brands: BrandOption[];
  assetModels: AssetModelOption[];
  closureTypes?: ClosureTypeOption[];
  deviceCoreCapacities?: DeviceCoreCapacityOption[];
  onChange: (patch: Record<string, string>) => void;
}) {
  const dtk = (values.device_type_key || "").toUpperCase();
  const isMinimal = NO_TECH_TYPES.has(dtk);

  // Filter core capacities based on device type
  const filteredCoreCapacities = deviceCoreCapacities.filter((item) => {
    const allowedKeys = item.allowed_device_type_keys || [];
    if (!allowedKeys.length) return true;
    return allowedKeys.includes(dtk);
  });

  return (
    <>
      <DeviceCreateForm
        values={values}
        odpTypes={odpTypes}
        installationTypes={installationTypes}
        tenants={tenants}
        onChange={onChange}
      />

      {/* ── SPESIFIKASI KHUSUS: OLT (Optical Line Terminal) ── */}
      {dtk === "OLT" ? (
        <>
          <div className="col-span-full text-[11px] font-semibold uppercase tracking-wide text-muted-foreground rounded-md border bg-muted/40 px-3 py-1.5">
            Spesifikasi Headend OLT
          </div>

          <Field
            label="Management IP"
            value={values.management_ip || ""}
            onChange={(val) => onChange({ management_ip: val })}
            placeholder="10.20.30.1"
          />

          <Field
            label="VLAN Management"
            value={values.vlan || ""}
            onChange={(val) => onChange({ vlan: val })}
            placeholder="100"
          />

          <Field
            label="Total PON Ports"
            type="number"
            value={values.total_ports || "16"}
            onChange={(val) => onChange({ total_ports: val })}
            placeholder="16"
          />

          <Field
            label="Total Uplink Ports (SFP+)"
            type="number"
            value={values.feeder_port_count || "4"}
            onChange={(val) => onChange({ feeder_port_count: val })}
            placeholder="4"
          />

          <div className="space-y-1.5">
            <FieldLabel label="Tinggi Perangkat (U)" tooltip="Tinggi form factor perangkat di dalam rak POP." />
            <Combobox
              value={values.u_height || "1"}
              onValueChange={(val) => onChange({ u_height: val === "__none__" ? "1" : val })}
              options={U_HEIGHT_OPTIONS}
              placeholder="Pilih tinggi U"
            />
          </div>
        </>
      ) : null}

      {/* ── SPESIFIKASI KHUSUS: OTB (Optical Termination Box) ── */}
      {dtk === "OTB" ? (
        <>
          <div className="col-span-full text-[11px] font-semibold uppercase tracking-wide text-muted-foreground rounded-md border bg-muted/40 px-3 py-1.5">
            Spesifikasi Terminasi OTB
          </div>

          <div className="space-y-1.5">
            <FieldLabel label="Kapasitas Core" tooltip="Pilih total kapasitas core terminasi OTB dari master data." required />
            <Combobox
              value={values.capacity_core || "__none__"}
              onValueChange={(val) => onChange({ capacity_core: val === "__none__" ? "" : val })}
              options={[
                { value: "__none__", label: "Pilih kapasitas core" },
                ...filteredCoreCapacities.map((item) => ({
                  value: String(item.core_capacity_value),
                  label: `${item.core_capacity_value} Core${item.label ? ` — ${item.label}` : ""}`,
                })),
              ]}
              placeholder="Pilih kapasitas core"
              searchPlaceholder="Cari kapasitas core..."
            />
          </div>

          <div className="space-y-1.5">
            <FieldLabel label="Tipe Konektor Adaptor" tooltip="Pilih tipe adaptor konektor optik pada panel OTB." />
            <Combobox
              value={values.odp_type || "__none__"}
              onValueChange={(val) => onChange({ odp_type: val === "__none__" ? "" : val })}
              options={[{ value: "__none__", label: "Pilih tipe konektor" }, ...CONNECTOR_TYPE_OPTIONS]}
              placeholder="Pilih tipe konektor"
            />
          </div>

          <div className="space-y-1.5">
            <FieldLabel label="Tinggi Perangkat (U)" tooltip="Ukuran slot rack OTB di dalam POP." />
            <Combobox
              value={values.u_height || "1"}
              onValueChange={(val) => onChange({ u_height: val === "__none__" ? "1" : val })}
              options={U_HEIGHT_OPTIONS}
              placeholder="Pilih tinggi U"
            />
          </div>
        </>
      ) : null}

      {/* ── SPESIFIKASI KHUSUS: JC (Joint Closure) ── */}
      {dtk === "JC" ? (
        <>
          <div className="col-span-full text-[11px] font-semibold uppercase tracking-wide text-muted-foreground rounded-md border bg-muted/40 px-3 py-1.5">
            Spesifikasi Joint Closure
          </div>

          <div className="space-y-1.5">
            <FieldLabel label="Tipe Closure" tooltip="Pilih model fisik closure (Dome / Inline) dari master data." required />
            <Combobox
              value={values.closure_type_id || "__none__"}
              onValueChange={(val) => onChange({ closure_type_id: val === "__none__" ? "" : val })}
              options={[
                { value: "__none__", label: "Pilih tipe closure" },
                ...closureTypes.map((c) => ({
                  value: c.id,
                  label: [c.closure_type_name, c.closure_type_code].filter(Boolean).join(" - "),
                })),
              ]}
              placeholder="Pilih tipe closure"
              searchPlaceholder="Cari tipe closure..."
            />
          </div>

          <div className="space-y-1.5">
            <FieldLabel label="Kapasitas Core Splicing" tooltip="Total core fiber yang dapat disambung dalam closure ini." required />
            <Combobox
              value={values.capacity_core || "__none__"}
              onValueChange={(val) => onChange({ capacity_core: val === "__none__" ? "" : val })}
              options={[
                { value: "__none__", label: "Pilih kapasitas core" },
                ...filteredCoreCapacities.map((item) => ({
                  value: String(item.core_capacity_value),
                  label: `${item.core_capacity_value} Core${item.label ? ` — ${item.label}` : ""}`,
                })),
              ]}
              placeholder="Pilih kapasitas core"
              searchPlaceholder="Cari kapasitas core..."
            />
          </div>

          <div className="space-y-1.5">
            <FieldLabel label="Lingkungan Penempatan" tooltip="Lokasi instalasi fisik closure di lapangan." />
            <Combobox
              value={values.installation_type || "__none__"}
              onValueChange={(val) => onChange({ installation_type: val === "__none__" ? "" : val })}
              options={[{ value: "__none__", label: "Pilih penempatan" }, ...JC_ENVIRONMENT_OPTIONS]}
              placeholder="Pilih penempatan"
            />
          </div>
        </>
      ) : null}

      {/* ── SPESIFIKASI KHUSUS: ONT ── */}
      {dtk === "ONT" ? (
        <div className="col-span-full rounded-xl border border-sky-500/20 bg-sky-500/10 p-3 text-xs text-sky-700 dark:text-sky-300">
          <span className="font-semibold">Terminal Pelanggan:</span> Hubungkan data customer dan alamat instalasi melalui field <strong>Customer Reference</strong> di bawah.
        </div>
      ) : null}

      {/* ── HARDWARE CATALOG (Brand, Model, Serial Number) ── */}
      {!isMinimal && (
        <div className="col-span-full text-[11px] font-semibold uppercase tracking-wide text-muted-foreground rounded-md border bg-muted/40 px-3 py-1.5">
          Identitas Perangkat &amp; Vendor
        </div>
      )}

      {!isMinimal && (
        <DeviceHardwareFields
          values={{
            manufacturer_id: values.manufacturer_id,
            brand_id: values.brand_id,
            model_id: values.model_id,
            serial_number: values.serial_number,
          }}
          manufacturers={manufacturers}
          brands={brands}
          assetModels={assetModels}
          onChange={onChange}
        />
      )}
    </>
  );
}
