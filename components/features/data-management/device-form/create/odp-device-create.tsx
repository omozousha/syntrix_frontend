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
  capacity_core?: string;
  used_core?: string;
  total_ports?: string;
  used_ports?: string;
  splitter_ratio?: string;
  front_device_id?: string;
  front_port_id?: string;
  rear_device_id?: string;
  rear_port_id?: string;
};

type SplitterProfileOption = { ratio_label: string; output_port_count?: number | null };

/**
 * ODP Create Form - aligned with classic ODC styling patterns.
 * Ensures visual and structure compatibility across passive inventory registers.
 */
export function OdpDeviceCreate({
  values,
  odpTypes,
  installationTypes,
  tenants,
  manufacturers,
  brands,
  assetModels,
  splitterProfiles = [],
  onChange,
}: {
  values: OdpCreateFormValues;
  odpTypes: OdpTypeOption[];
  installationTypes: InstallationTypeOption[];
  tenants: TenantOption[];
  manufacturers: ManufacturerOption[];
  brands: BrandOption[];
  assetModels: AssetModelOption[];
  splitterProfiles?: SplitterProfileOption[];
  topologyFrontDevices?: TopologyDeviceOption[];
  frontDevicePorts?: TopologyPortOption[];
  loadingTopology?: boolean;
  frontRelationLabel?: string;
  rearRelationLabel?: string;
  onChange: (patch: Record<string, string>) => void;
}) {
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
        Spesifikasi Port &amp; Splitter ODP
      </div>

      <div className="space-y-1.5">
        <FieldLabel label="Rasio Splitter" tooltip="Pilih rasio splitter optik terpasang pada ODP." />
        <Combobox
          value={values.splitter_ratio || "__none__"}
          onValueChange={(val) => {
            const nextRatio = val === "__none__" ? "" : val;
            const profile = (splitterProfiles || []).find((p) => p.ratio_label === nextRatio);
            const autoPorts = profile?.output_port_count ? String(profile.output_port_count) : values.total_ports || "";
            onChange({ splitter_ratio: nextRatio, total_ports: autoPorts });
          }}
          options={[
            { value: "__none__", label: "Pilih rasio splitter" },
            ...(splitterProfiles || []).map((p) => ({
              value: p.ratio_label,
              label: `Splitter ${p.ratio_label} (${p.output_port_count || 0} port)`,
            })),
          ]}
          placeholder="Pilih rasio splitter"
          searchPlaceholder="Cari rasio splitter..."
        />
      </div>

      <div className="space-y-1.5">
        <FieldLabel label="Kapasitas Port Distribusi" tooltip="Total port ODP yang dapat melayani sambungan drop pelanggan." />
        <Input
          type="number"
          value={values.total_ports || ""}
          onChange={(e) => onChange({ total_ports: e.target.value })}
          placeholder="8 atau 16"
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
