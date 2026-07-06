"use client";

import { Combobox } from "@/components/ui/combobox";
import { DeviceCreateForm } from "@/components/features/data-management/device-form/device-create-form";
import { DeviceHardwareFields } from "@/components/features/data-management/device-form/device-hardware-fields";
import { DeviceCapacityFields } from "@/components/features/data-management/device-form/device-capacity-fields";
import { RouteFileUploadField } from "@/components/features/data-management/device-form/route-file-upload-field";
import { Field, FieldLabel } from "@/components/features/data-management/device-form/form-field-grid";

type PopOption = { id: string; pop_name: string; pop_code: string; region_id: string };
type ProjectOption = { id: string; project_name: string; project_code?: string | null; region_id?: string | null; pop_id?: string | null };
type OdpTypeOption = { id: string; odp_type_name: string; odp_type_code?: string | null };
type InstallationTypeOption = { id: string; installation_type_name: string; installation_type_code?: string | null };
type SplitterProfileOption = { ratio_label: string; output_port_count?: number | null; allowed_device_type_keys?: string[] | null };
type ManufacturerOption = { id: string; manufacturer_name: string; manufacturer_code?: string | null };
type BrandOption = { id: string; brand_name: string; brand_code?: string | null; manufacturer_id?: string | null };
type AssetModelOption = { id: string; model_name: string; model_code?: string | null; brand_id?: string | null; manufacturer_id?: string | null };
type TenantOption = { id: string; tenant_name: string; tenant_code?: string | null };
type RouteTypeOption = { id: string; route_type_name: string; route_type_code?: string | null };

type CableTypeOption = { id: string; cable_type_code: string; cable_type_name: string };
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
  capacity_core: string;
  used_core: string;
  total_ports: string;
  used_ports: string;
  splitter_ratio: string;
  cable_type: string;
  cable_length_m: string;
  cable_length: string;
  route_name: string;
  route_type: string;
  route_coordinates: string;
  route_file_url: string;
};

export function CableDeviceCreate({
  values,
  pops,
  odpTypes,
  installationTypes,
  tenants,
  projects,
  manufacturers,
  brands,
  assetModels,
  splitterProfiles,
  routeTypes,
  cableTypes = [],
  coreCapacities,
  onChange,
  onPopChange,
}: {
  values: CableCreateFormValues;
  pops: PopOption[];
  odpTypes: OdpTypeOption[];
  installationTypes: InstallationTypeOption[];
  tenants: TenantOption[];
  projects: ProjectOption[];
  routeTypes: RouteTypeOption[];
  cableTypes?: CableTypeOption[];
  coreCapacities?: CoreCapacityOption[];
  manufacturers: ManufacturerOption[];
  brands: BrandOption[];
  assetModels: AssetModelOption[];
  splitterProfiles: SplitterProfileOption[];
  onChange: (patch: Record<string, string>) => void;
  onPopChange: (popId: string) => void;
}) {
  return (
    <>
      {/* ═══ 1. INFORMASI DEVICE + AFILIASI JARINGAN ═══ */}
      <DeviceCreateForm
        values={values}
        pops={pops}
        odpTypes={odpTypes}
        installationTypes={installationTypes}
        tenants={tenants}
        projects={projects}
        onChange={onChange}
        onPopChange={onPopChange}
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

      {/* ═══ 5. CORE FIBER ═══ */}
      <div className="col-span-full text-[11px] font-semibold uppercase tracking-wide text-muted-foreground rounded-md border bg-muted/40 px-3 py-1.5">
        Core Fiber
      </div>

      <DeviceCapacityFields
        values={{
          device_type_key: "CABLE",
          route_type: values.route_type,
          capacity_core: values.capacity_core,
          used_core: values.used_core,
          total_ports: values.total_ports,
          used_ports: values.used_ports,
          splitter_ratio: values.splitter_ratio,
        }}
        showCoreFields={true}
        showPortFields={true}
        showSplitterField={false}
        needsPortPresetSelector={false}
        splitterPortPresetOptions={[]}
        splitterProfiles={splitterProfiles}
        coreCapacities={coreCapacities}
        onChange={onChange}
      />

      {/* ═══ 6. RELASI DEVICE ═══ */}
      <div className="col-span-full text-[11px] font-semibold uppercase tracking-wide text-muted-foreground rounded-md border border-dashed bg-muted/20 px-3 py-1.5">
        Relasi Device
        <span className="ml-2 font-normal normal-case text-muted-foreground">— Buat relasi topology setelah device tersimpan, melalui halaman detail CABLE.</span>
      </div>

      {/* ═══ 7. DOKUMENTASI ═══ */}
      <div className="col-span-full text-[11px] font-semibold uppercase tracking-wide text-muted-foreground rounded-md border border-dashed bg-muted/20 px-3 py-1.5">
        Dokumentasi
        <span className="ml-2 font-normal normal-case text-muted-foreground">— Tambah gambar/attachment setelah device tersimpan, melalui halaman detail CABLE.</span>
      </div>
    </>
  );
}
