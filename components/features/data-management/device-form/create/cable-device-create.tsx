"use client";

import { Combobox } from "@/components/ui/combobox";
import { DeviceCreateForm } from "@/components/features/data-management/device-form/device-create-form";
import { DeviceHardwareFields } from "@/components/features/data-management/device-form/device-hardware-fields";
import { RouteFileUploadField } from "@/components/features/data-management/device-form/route-file-upload-field";
import { Field, FieldLabel } from "@/components/features/data-management/device-form/form-field-grid";

type PopOption = { id: string; pop_name: string; pop_code: string; region_id: string };
type ProjectOption = { id: string; project_name: string; project_code?: string | null; region_id?: string | null; pop_id?: string | null };
type OdpTypeOption = { id: string; odp_type_name: string; odp_type_code?: string | null };
type InstallationTypeOption = { id: string; installation_type_name: string; installation_type_code?: string | null };
type ManufacturerOption = { id: string; manufacturer_name: string; manufacturer_code?: string | null };
type BrandOption = { id: string; brand_name: string; brand_code?: string | null; manufacturer_id?: string | null };
type AssetModelOption = { id: string; model_name: string; model_code?: string | null; brand_id?: string | null; manufacturer_id?: string | null };
type TenantOption = { id: string; tenant_name: string; tenant_code?: string | null };
type RouteTypeOption = { id: string; route_type_name: string; route_type_code?: string | null };

type CableTypeOption = { id: string; cable_type_code: string; cable_type_name: string };
type TopologyDeviceOption = { id: string; device_name: string; device_type_key: string };
type TopologyPortOption = { id: string; port_label?: string | null; port_index: number; status: string };

type CoreCapacityOption = { core_capacity_value: number; label: string; allowed_route_type_keys?: string[] | null };

export type CableCreateFormValues = {
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
  cable_type: string;
  cable_length_m: string;
  cable_length: string;
  route_name: string;
  route_type: string;
  route_coordinates: string;
  route_file_url: string;
  front_device_id?: string;
  front_port_id?: string;
  rear_device_id?: string;
  rear_port_id?: string;
};

export function CableDeviceCreate({
  values,
  odpTypes,
  installationTypes,
  tenants,
  manufacturers,
  brands,
  assetModels,
  routeTypes,
  cableTypes = [],
  coreCapacities = [],
  onChange,
}: {
  values: CableCreateFormValues;
  odpTypes: OdpTypeOption[];
  installationTypes: InstallationTypeOption[];
  tenants: TenantOption[];
  routeTypes: RouteTypeOption[];
  cableTypes?: CableTypeOption[];
  manufacturers: ManufacturerOption[];
  brands: BrandOption[];
  assetModels: AssetModelOption[];
  coreCapacities?: CoreCapacityOption[];
  topologyFrontDevices?: TopologyDeviceOption[];
  topologyRearDevices?: TopologyDeviceOption[];
  frontDevicePorts?: TopologyPortOption[];
  rearDevicePorts?: TopologyPortOption[];
  loadingTopology?: boolean;
  frontRelationLabel?: string;
  rearRelationLabel?: string;
  onChange: (patch: Record<string, string>) => void;
}) {
  // Filter core capacities based on selected route type
  const routeType = values.route_type || "";
  const filteredCoreCapacities = coreCapacities.filter((item) => {
    const allowedKeys = item.allowed_route_type_keys || [];
    if (!allowedKeys.length) return true;
    if (allowedKeys.includes("_NONE_")) return false;
    if (!routeType) return true;
    return allowedKeys.includes(routeType);
  });
  return (
    <>
      {/* ═══ 1. INFORMASI DEVICE + AFILIASI JARINGAN ═══ */}
      <DeviceCreateForm
        values={values}
        odpTypes={odpTypes}
        installationTypes={installationTypes}
        tenants={tenants}
        onChange={onChange}
      />

      {/* ═══ 2. INFORMASI ROUTE ═══ */}
      <div className="col-span-full text-[11px] font-semibold uppercase tracking-wide text-muted-foreground rounded-md border bg-muted/40 px-3 py-1.5">
        Informasi Route
      </div>

      {/* Kategori Kabel */}
      <div className="space-y-1.5">
        <FieldLabel label="Kategori Kabel" tooltip="Kategori fungsi kabel dalam jaringan. Menggunakan data Route Types dari master data." />
        <Combobox
          value={values.route_type || "__none__"}
          onValueChange={(v) => onChange({ route_type: v === "__none__" ? "" : v })}
          options={[
            { value: "__none__", label: "Pilih kategori kabel" },
            ...routeTypes.map((rt) => ({
              value: rt.route_type_code || rt.route_type_name,
              label: rt.route_type_code ? `${rt.route_type_name} (${rt.route_type_code})` : rt.route_type_name,
            })),
          ]}
          placeholder="Pilih kategori kabel"
          searchPlaceholder="Cari kategori kabel..."
        />
      </div>

      {/* Tipe Kabel */}
      <div className="space-y-1.5">
        <FieldLabel label="Tipe Kabel" tooltip="Pilih tipe kabel fiber optik dari master data." />
        <Combobox
          value={values.cable_type || "__none__"}
          onValueChange={(v) => onChange({ cable_type: v === "__none__" ? "" : v })}
          options={[
            { value: "__none__", label: "Pilih tipe kabel" },
            ...cableTypes.map((t) => ({
              value: t.cable_type_code,
              label: t.cable_type_name,
            })),
          ]}
          placeholder="Pilih tipe kabel"
          searchPlaceholder="Cari tipe kabel..."
        />
      </div>

      {/* Kapasitas Core */}
      <div className="space-y-1.5">
        <FieldLabel label="Kapasitas Core" tooltip="Pilih total core optik dalam kabel." required />
        <Combobox
          value={values.capacity_core || "__none__"}
          onValueChange={(v) => onChange({ capacity_core: v === "__none__" ? "" : v })}
          options={[
            { value: "__none__", label: "Pilih kapasitas core" },
            ...filteredCoreCapacities.map((c) => ({
              value: String(c.core_capacity_value),
              label: `${c.core_capacity_value} Core${c.label ? ` — ${c.label}` : ""}`,
            })),
          ]}
          placeholder="Pilih kapasitas core"
          searchPlaceholder="Cari kapasitas core..."
        />
      </div>

      {/* Route Name */}
      <Field
        label="Route Name"
        value={values.route_name}
        onChange={(v) => onChange({ route_name: v })}
        tooltip="Nama route kabel (contoh: Jakarta-Bogor Segmen A)."
      />

      {/* ═══ 3. UPLOAD ROUTE FILE ═══ */}
      <div className="col-span-full space-y-2">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground rounded-md border bg-muted/40 px-3 py-1.5">
          Upload Route File
        </div>
        <RouteFileUploadField
          disabled={false}
          onParsed={(data) => {
            onChange({
              route_coordinates: JSON.stringify(data.coordinates),
              cable_length_m: String(Math.round(data.length_m)),
            });
          }}
        />
      </div>

      {/* Panjang Kabel (auto-fill dari upload atau manual) */}
      <Field
        label="Panjang Kabel (m)"
        type="number"
        value={values.cable_length_m}
        onChange={(v) => onChange({ cable_length_m: v })}
        tooltip="Panjang kabel dalam meter. Terisi otomatis dari upload file KML/KMZ."
      />

      {/* ═══ 4. SPESIFIKASI KABEL ═══ */}
      <div className="col-span-full text-[11px] font-semibold uppercase tracking-wide text-muted-foreground rounded-md border bg-muted/40 px-3 py-1.5">
        Spesifikasi Kabel
      </div>

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

      {/* ═══ 5. DOKUMENTASI ═══ */}
      <div className="col-span-full text-[11px] font-semibold uppercase tracking-wide text-muted-foreground rounded-md border border-dashed bg-muted/20 px-3 py-1.5">
        Dokumentasi
        <span className="ml-2 font-normal normal-case text-muted-foreground">— Tambah gambar/attachment setelah device tersimpan, melalui halaman detail CABLE.</span>
      </div>
    </>
  );
}
