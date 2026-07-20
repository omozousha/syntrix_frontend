"use client";

import { DeviceCreateForm } from "@/components/features/data-management/device-form/device-create-form";
import { DeviceHardwareFields } from "@/components/features/data-management/device-form/device-hardware-fields";
import { FieldLabel } from "@/components/features/data-management/device-form/form-field-grid";
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

const NO_TECH_TYPES = new Set(["HH", "MH"]);

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
  front_device_id: string;
  front_port_id: string;
  rear_device_id: string;
  rear_port_id: string;
};

export function GenericDeviceCreate({
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
  topologyRearDevices = [],
  frontDevicePorts = [],
  rearDevicePorts = [],
  loadingTopology = false,
  frontRelationLabel = "Hulu",
  rearRelationLabel = "Hilir",
  onChange,
  onPopChange,
}: {
  values: GenericCreateFormValues;
  pops: PopOption[];
  odpTypes: OdpTypeOption[];
  installationTypes: InstallationTypeOption[];
  tenants: TenantOption[];
  projects: ProjectOption[];
  manufacturers: ManufacturerOption[];
  brands: BrandOption[];
  assetModels: AssetModelOption[];
  topologyFrontDevices?: TopologyDeviceOption[];
  topologyRearDevices?: TopologyDeviceOption[];
  frontDevicePorts?: TopologyPortOption[];
  rearDevicePorts?: TopologyPortOption[];
  loadingTopology?: boolean;
  frontRelationLabel?: string;
  rearRelationLabel?: string;
  onChange: (patch: Record<string, string>) => void;
  onPopChange: (popId: string) => void;
}) {
  const isMinimal = NO_TECH_TYPES.has(values.device_type_key);

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

      {values.device_type_key === "OTB" ? (
        <>
          <div className="col-span-full text-[11px] font-semibold uppercase tracking-wide text-muted-foreground rounded-md border bg-muted/40 px-3 py-1.5">
            Relasi Topologi
          </div>
          <div className="space-y-1.5">
            <FieldLabel label={`Front Port (${frontRelationLabel})`} tooltip="Pilih perangkat OLT/SWITCH di POP yang sama sebagai sumber koneksi hulu." />
            <Combobox
              value={values.front_device_id || "__none__"}
              onValueChange={(v) => {
                const deviceId = v === "__none__" ? "" : v;
                onChange({ front_device_id: deviceId, front_port_id: "" });
              }}
              options={[
                { value: "__none__", label: values.pop_id ? "Pilih device hulu" : "Pilih POP terlebih dahulu" },
                ...topologyFrontDevices.map((d) => ({ value: d.id, label: `${d.device_name} (${d.device_type_key})` })),
              ]}
              placeholder={values.pop_id ? "Pilih device hulu" : "Pilih POP terlebih dahulu"}
              searchPlaceholder="Cari device hulu..."
              disabled={loadingTopology || values.pop_id === ""}
            />
          </div>
          <div className="space-y-1.5">
            <FieldLabel label={`Port ${frontRelationLabel}`} tooltip="Pilih port idle dari device hulu yang terpilih." />
            <Combobox
              value={values.front_port_id || "__none__"}
              onValueChange={(v) => onChange({ front_port_id: v === "__none__" ? "" : v })}
              options={[
                { value: "__none__", label: values.front_device_id ? "Pilih port hulu" : "Pilih device hulu terlebih dahulu" },
                ...frontDevicePorts.map((port) => ({ value: port.id, label: port.port_label || `Port #${port.port_index}` })),
              ]}
              placeholder={values.front_device_id ? "Pilih port hulu" : "Pilih device hulu terlebih dahulu"}
              searchPlaceholder="Cari port hulu..."
              disabled={!values.front_device_id}
            />
          </div>
          <div className="space-y-1.5">
            <FieldLabel label={`Rear Port (${rearRelationLabel})`} tooltip="Pilih perangkat ODC/JC di POP yang sama sebagai tujuan koneksi hilir." />
            <Combobox
              value={values.rear_device_id || "__none__"}
              onValueChange={(v) => {
                const deviceId = v === "__none__" ? "" : v;
                onChange({ rear_device_id: deviceId, rear_port_id: "" });
              }}
              options={[
                { value: "__none__", label: values.pop_id ? "Pilih device hilir" : "Pilih POP terlebih dahulu" },
                ...topologyRearDevices.map((d) => ({ value: d.id, label: `${d.device_name} (${d.device_type_key})` })),
              ]}
              placeholder={values.pop_id ? "Pilih device hilir" : "Pilih POP terlebih dahulu"}
              searchPlaceholder="Cari device hilir..."
              disabled={loadingTopology || values.pop_id === ""}
            />
          </div>
          <div className="space-y-1.5">
            <FieldLabel label={`Port ${rearRelationLabel}`} tooltip="Pilih port idle dari device hilir yang terpilih." />
            <Combobox
              value={values.rear_port_id || "__none__"}
              onValueChange={(v) => onChange({ rear_port_id: v === "__none__" ? "" : v })}
              options={[
                { value: "__none__", label: values.rear_device_id ? "Pilih port hilir" : "Pilih device hilir terlebih dahulu" },
                ...rearDevicePorts.map((port) => ({ value: port.id, label: port.port_label || `Port #${port.port_index}` })),
              ]}
              placeholder={values.rear_device_id ? "Pilih port hilir" : "Pilih device hilir terlebih dahulu"}
              searchPlaceholder="Cari port hilir..."
              disabled={!values.rear_device_id}
            />
          </div>
        </>
      ) : null}

      {values.device_type_key === "JC" ? (
        <>
          <div className="col-span-full text-[11px] font-semibold uppercase tracking-wide text-muted-foreground rounded-md border bg-muted/40 px-3 py-1.5">
            Relasi Topologi
          </div>
          <div className="space-y-1.5">
            <FieldLabel label={`Front Port (${frontRelationLabel})`} tooltip="Pilih perangkat OTB di POP yang sama sebagai sumber koneksi hulu." />
            <Combobox
              value={values.front_device_id || "__none__"}
              onValueChange={(v) => {
                const deviceId = v === "__none__" ? "" : v;
                onChange({ front_device_id: deviceId, front_port_id: "" });
              }}
              options={[
                { value: "__none__", label: values.pop_id ? "Pilih OTB hulu" : "Pilih POP terlebih dahulu" },
                ...topologyFrontDevices.map((d) => ({ value: d.id, label: `${d.device_name} (${d.device_type_key})` })),
              ]}
              placeholder={values.pop_id ? "Pilih OTB hulu" : "Pilih POP terlebih dahulu"}
              searchPlaceholder="Cari OTB hulu..."
              disabled={loadingTopology || values.pop_id === ""}
            />
          </div>
          <div className="space-y-1.5">
            <FieldLabel label="Port OTB" tooltip="Pilih port idle dari OTB yang terpilih." />
            <Combobox
              value={values.front_port_id || "__none__"}
              onValueChange={(v) => onChange({ front_port_id: v === "__none__" ? "" : v })}
              options={[
                { value: "__none__", label: values.front_device_id ? "Pilih port OTB" : "Pilih OTB terlebih dahulu" },
                ...frontDevicePorts.map((port) => ({ value: port.id, label: port.port_label || `Port #${port.port_index}` })),
              ]}
              placeholder={values.front_device_id ? "Pilih port OTB" : "Pilih OTB terlebih dahulu"}
              searchPlaceholder="Cari port OTB..."
              disabled={!values.front_device_id}
            />
          </div>
          <div className="space-y-1.5">
            <FieldLabel label={`Rear Port (${rearRelationLabel}, opsional)`} tooltip="Pilih perangkat HH/MH di POP yang sama sebagai tujuan koneksi hilir." />
            <Combobox
              value={values.rear_device_id || "__none__"}
              onValueChange={(v) => {
                const deviceId = v === "__none__" ? "" : v;
                onChange({ rear_device_id: deviceId, rear_port_id: "" });
              }}
              options={[
                { value: "__none__", label: values.pop_id ? "Pilih HH/MH hilir (opsional)" : "Pilih POP terlebih dahulu" },
                ...topologyRearDevices.map((d) => ({ value: d.id, label: `${d.device_name} (${d.device_type_key})` })),
              ]}
              placeholder={values.pop_id ? "Pilih HH/MH hilir" : "Pilih POP terlebih dahulu"}
              searchPlaceholder="Cari HH/MH hilir..."
              disabled={loadingTopology || values.pop_id === ""}
            />
          </div>
          <div className="space-y-1.5">
            <FieldLabel label="Port HH/MH (opsional)" tooltip="Pilih port idle dari HH/MH yang terpilih." />
            <Combobox
              value={values.rear_port_id || "__none__"}
              onValueChange={(v) => onChange({ rear_port_id: v === "__none__" ? "" : v })}
              options={[
                { value: "__none__", label: values.rear_device_id ? "Pilih port HH/MH (opsional)" : "Pilih HH/MH terlebih dahulu" },
                ...rearDevicePorts.map((port) => ({ value: port.id, label: port.port_label || `Port #${port.port_index}` })),
              ]}
              placeholder={values.rear_device_id ? "Pilih port HH/MH" : "Pilih HH/MH terlebih dahulu"}
              searchPlaceholder="Cari port HH/MH..."
              disabled={!values.rear_device_id}
            />
          </div>
        </>
      ) : null}

      {!isMinimal && (
        <div className="col-span-full text-[11px] font-semibold uppercase tracking-wide text-muted-foreground rounded-md border bg-muted/40 px-3 py-1.5">
          Identitas Perangkat
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
