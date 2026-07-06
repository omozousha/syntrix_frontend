"use client";

import { DeviceCreateForm } from "@/components/features/data-management/device-form/device-create-form";
import { DeviceHardwareFields } from "@/components/features/data-management/device-form/device-hardware-fields";
import { DeviceCapacityFields } from "@/components/features/data-management/device-form/device-capacity-fields";
import { Field } from "@/components/features/data-management/device-form/form-field-grid";

type PopOption = { id: string; pop_name: string; pop_code: string; region_id: string };
type ProjectOption = { id: string; project_name: string; project_code?: string | null; region_id?: string | null; pop_id?: string | null };
type OdpTypeOption = { id: string; odp_type_name: string; odp_type_code?: string | null };
type InstallationTypeOption = { id: string; installation_type_name: string; installation_type_code?: string | null };
type SplitterProfileOption = { ratio_label: string; output_port_count?: number | null; allowed_device_type_keys?: string[] | null };
type ManufacturerOption = { id: string; manufacturer_name: string; manufacturer_code?: string | null };
type BrandOption = { id: string; brand_name: string; brand_code?: string | null; manufacturer_id?: string | null };
type AssetModelOption = { id: string; model_name: string; model_code?: string | null; brand_id?: string | null; manufacturer_id?: string | null };
type TenantOption = { id: string; tenant_name: string; tenant_code?: string | null };

const MGMT_IP_TYPES = new Set(["OLT", "ONT", "SWITCH", "ROUTER"]);
const CORE_TYPES = new Set(["OTB", "ODC", "JC", "CABLE"]);
const PORT_TYPES = new Set(["OLT", "ODC", "SWITCH", "ROUTER", "ODP"]);
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
  capacity_core: string;
  used_core: string;
  total_ports: string;
  used_ports: string;
  splitter_ratio: string;
  management_ip: string;
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
  splitterProfiles,
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
  splitterProfiles: SplitterProfileOption[];
  onChange: (patch: Record<string, string>) => void;
  onPopChange: (popId: string) => void;
}) {
  const deviceType = values.device_type_key;
  const hasMgmtIp = MGMT_IP_TYPES.has(deviceType);
  const showCoreFields = CORE_TYPES.has(deviceType);
  const showPortFields = PORT_TYPES.has(deviceType);
  const showSplitterField = false;
  const isMinimal = NO_TECH_TYPES.has(deviceType);

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

      {hasMgmtIp ? (
        <Field
          label="Management IP"
          value={values.management_ip}
          onChange={(v) => onChange({ management_ip: v })}
          placeholder="10.0.0.1"
        />
      ) : null}

      {!isMinimal && (
        <DeviceCapacityFields
          values={{
            device_type_key: deviceType,
            capacity_core: values.capacity_core,
            used_core: values.used_core,
            total_ports: values.total_ports,
            used_ports: values.used_ports,
            splitter_ratio: values.splitter_ratio,
          }}
          showCoreFields={showCoreFields}
          showPortFields={showPortFields}
          showSplitterField={showSplitterField}
          needsPortPresetSelector={false}
          splitterPortPresetOptions={[]}
          splitterProfiles={splitterProfiles}
          onChange={onChange}
        />
      )}
    </>
  );
}
