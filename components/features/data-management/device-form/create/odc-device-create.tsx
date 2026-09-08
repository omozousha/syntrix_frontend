"use client";

import { DeviceCreateForm } from "@/components/features/data-management/device-form/device-create-form";
import { DeviceHardwareFields } from "@/components/features/data-management/device-form/device-hardware-fields";
import { FieldLabel } from "@/components/features/data-management/device-form/form-field-grid";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";

type OdpTypeOption = { id: string; odp_type_name: string; odp_type_code?: string | null };
type InstallationTypeOption = { id: string; installation_type_name: string; installation_type_code?: string | null };
type ManufacturerOption = { id: string; manufacturer_name: string; manufacturer_code?: string | null };
type BrandOption = { id: string; brand_name: string; brand_code?: string | null; manufacturer_id?: string | null };
type AssetModelOption = { id: string; model_name: string; model_code?: string | null; brand_id?: string | null; manufacturer_id?: string | null };
type TenantOption = { id: string; tenant_name: string; tenant_code?: string | null };
type DeviceCoreCapacityOption = { core_capacity_value: number; label: string; allowed_device_type_keys?: string[] | null };

const ODC_MOUNTING_OPTIONS = [
  { value: "Outdoor Pad Mounted", label: "Outdoor Pad Mounted (Pondasi)" },
  { value: "Outdoor Pole Mounted", label: "Outdoor Pole Mounted (Tiang)" },
  { value: "Indoor Wall Mounted", label: "Indoor Wall Mounted (Dinding)" },
];

export type OdcCreateFormValues = {
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
};

export function OdcDeviceCreate({
  values,
  odpTypes,
  installationTypes,
  tenants,
  manufacturers,
  brands,
  assetModels,
  deviceCoreCapacities = [],
  onChange,
}: {
  values: OdcCreateFormValues;
  odpTypes: OdpTypeOption[];
  installationTypes: InstallationTypeOption[];
  tenants: TenantOption[];
  manufacturers: ManufacturerOption[];
  brands: BrandOption[];
  assetModels: AssetModelOption[];
  deviceCoreCapacities?: DeviceCoreCapacityOption[];
  onChange: (patch: Record<string, string>) => void;
}) {
  const filteredCoreCapacities = deviceCoreCapacities.filter((item) => {
    const allowedKeys = item.allowed_device_type_keys || [];
    if (!allowedKeys.length) return true;
    return allowedKeys.includes("ODC");
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

      <div className="col-span-full text-[11px] font-semibold uppercase tracking-wide text-muted-foreground rounded-md border bg-muted/40 px-3 py-1.5">
        Spesifikasi Kapasitas ODC
      </div>

      <div className="space-y-1.5">
        <FieldLabel label="Kapasitas Core Cabinet" tooltip="Pilih total kapasitas core optik ODC dari master data." required />
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
        <FieldLabel label="Total Port Cabinet" tooltip="Jumlah port adaptor/terminasi pada frame ODC." />
        <Input
          type="number"
          value={values.total_ports || ""}
          onChange={(e) => onChange({ total_ports: e.target.value })}
          placeholder="Contoh: 144"
        />
      </div>

      <div className="space-y-1.5">
        <FieldLabel label="Tipe Mounting Cabinet" tooltip="Jenis instalasi fisik cabinet di lapangan." />
        <Combobox
          value={values.installation_type || "__none__"}
          onValueChange={(val) => onChange({ installation_type: val === "__none__" ? "" : val })}
          options={[{ value: "__none__", label: "Pilih tipe mounting" }, ...ODC_MOUNTING_OPTIONS]}
          placeholder="Pilih tipe mounting"
        />
      </div>

      <div className="col-span-full text-[11px] font-semibold uppercase tracking-wide text-muted-foreground rounded-md border bg-muted/40 px-3 py-1.5">
        Identitas Perangkat &amp; Vendor
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
    </>
  );
}
