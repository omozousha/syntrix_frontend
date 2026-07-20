"use client";

import { DeviceCreateForm } from "@/components/features/data-management/device-form/device-create-form";
import { DeviceHardwareFields } from "@/components/features/data-management/device-form/device-hardware-fields";
import { FieldLabel } from "@/components/features/data-management/device-form/form-field-grid";
import { Input } from "@/components/ui/input";
import { Combobox } from "@/components/ui/combobox";

type PopOption = { id: string; pop_name: string; pop_code: string; region_id: string };
type ProjectOption = { id: string; project_name: string; project_code?: string | null; region_id?: string | null; pop_id?: string | null };
type OdpTypeOption = { id: string; odp_type_name: string; odp_type_code?: string | null };
type InstallationTypeOption = { id: string; installation_type_name: string; installation_type_code?: string | null };
type ManufacturerOption = { id: string; manufacturer_name: string; manufacturer_code?: string | null };
type BrandOption = { id: string; brand_name: string; brand_code?: string | null; manufacturer_id?: string | null };
type AssetModelOption = { id: string; model_name: string; model_code?: string | null; brand_id?: string | null; manufacturer_id?: string | null };
type TenantOption = { id: string; tenant_name: string; tenant_code?: string | null };
type TopologyDeviceOption = { id: string; device_name: string; device_type_key: string };
type TopologyPortOption = { id: string; port_label?: string | null; port_index: number; status: string };

export type OdpCreateFormValues = {
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
  front_device_id: string;
  front_port_id: string;
  rear_device_id: string;
  rear_port_id: string;
};

/**
 * ODP Create Form - aligned with classic ODC styling patterns.
 * Ensures visual and structure compatibility across passive inventory registers.
 */
export function OdpDeviceCreate({
  values,
  pops,
  odpTypes,
  installationTypes,
  tenants,
  projects,
  manufacturers,
  brands,
  assetModels,
  topologyFrontDevices = [],
  frontDevicePorts = [],
  loadingTopology = false,
  frontRelationLabel = "Hulu",
  rearRelationLabel = "Hilir",
  onChange,
  onPopChange,
}: {
  values: OdpCreateFormValues;
  pops: PopOption[];
  odpTypes: OdpTypeOption[];
  installationTypes: InstallationTypeOption[];
  tenants: TenantOption[];
  projects: ProjectOption[];
  manufacturers: ManufacturerOption[];
  brands: BrandOption[];
  assetModels: AssetModelOption[];
  topologyFrontDevices?: TopologyDeviceOption[];
  frontDevicePorts?: TopologyPortOption[];
  loadingTopology?: boolean;
  frontRelationLabel?: string;
  rearRelationLabel?: string;
  onChange: (patch: Record<string, string>) => void;
  onPopChange: (popId: string) => void;
}) {
  return (
    <>
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

      <div className="col-span-full text-[11px] font-semibold uppercase tracking-wide text-muted-foreground rounded-md border bg-muted/40 px-3 py-1.5">
        Relasi Topologi
      </div>

      <div className="space-y-1.5">
        <FieldLabel label={`Front Port (${frontRelationLabel})`} tooltip="Pilih perangkat ODC di POP yang sama sebagai sumber koneksi hulu." />
        <Combobox
          value={values.front_device_id || "__none__"}
          onValueChange={(v) => {
            const deviceId = v === "__none__" ? "" : v;
            onChange({ front_device_id: deviceId, front_port_id: "" });
          }}
          options={[
            { value: "__none__", label: values.pop_id ? "Pilih ODC hulu" : "Pilih POP terlebih dahulu" },
            ...topologyFrontDevices.map((d) => ({
              value: d.id,
              label: `${d.device_name} (${d.device_type_key})`,
            })),
          ]}
          placeholder={values.pop_id ? "Pilih ODC hulu" : "Pilih POP terlebih dahulu"}
          searchPlaceholder="Cari ODC hulu..."
          disabled={loadingTopology || values.pop_id === ""}
        />
      </div>

      <div className="space-y-1.5">
        <FieldLabel label="Port ODC" tooltip="Pilih port idle dari ODC yang terpilih." />
        <Combobox
          value={values.front_port_id || "__none__"}
          onValueChange={(v) => onChange({ front_port_id: v === "__none__" ? "" : v })}
          options={[
            { value: "__none__", label: values.front_device_id ? "Pilih port ODC" : "Pilih ODC terlebih dahulu" },
            ...frontDevicePorts.map((port) => ({
              value: port.id,
              label: port.port_label || `Port #${port.port_index}`,
            })),
          ]}
          placeholder={values.front_device_id ? "Pilih port ODC" : "Pilih ODC terlebih dahulu"}
          searchPlaceholder="Cari port ODC..."
          disabled={!values.front_device_id}
        />
      </div>

      <div className="col-span-full rounded-md border border-blue-200 bg-blue-50/50 px-3 py-2 text-xs text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/25 dark:text-blue-200">
        <span className="font-semibold">Rear Port (ONT-Customer):</span> Atur di <strong>detail device ODP → ODP Operations</strong>. Front port yang dipilih di sini akan otomatis tersambung ke operasi ODP.
      </div>

      <div className="col-span-full text-[11px] font-semibold uppercase tracking-wide text-muted-foreground rounded-md border bg-muted/40 px-3 py-1.5">
        Identitas Perangkat
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

      <div className="space-y-1.5">
        <FieldLabel label="Capacity Core" tooltip="Kapasitas core diisi otomatis dari core chain dan tidak bisa diedit manual." />
        <Input value={values.capacity_core} disabled />
      </div>
    </>
  );
}
