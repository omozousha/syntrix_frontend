"use client";

import { DeviceCreateForm } from "@/components/features/data-management/device-form/device-create-form";
import { DeviceHardwareFields } from "@/components/features/data-management/device-form/device-hardware-fields";

type PopOption = { id: string; pop_name: string; pop_code: string; region_id: string };
type ProjectOption = { id: string; project_name: string; project_code?: string | null; region_id?: string | null; pop_id?: string | null };
type OdpTypeOption = { id: string; odp_type_name: string; odp_type_code?: string | null };
type InstallationTypeOption = { id: string; installation_type_name: string; installation_type_code?: string | null };
type ManufacturerOption = { id: string; manufacturer_name: string; manufacturer_code?: string | null };
type BrandOption = { id: string; brand_name: string; brand_code?: string | null; manufacturer_id?: string | null };
type AssetModelOption = { id: string; model_name: string; model_code?: string | null; brand_id?: string | null; manufacturer_id?: string | null };
type TenantOption = { id: string; tenant_name: string; tenant_code?: string | null };

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
