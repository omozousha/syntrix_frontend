"use client";

import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { Field, FieldLabel } from "@/components/features/data-management/device-form/form-field-grid";
import { normalizeDeviceName } from "@/lib/name-normalization";

type PopOption = {
  id: string;
  pop_name: string;
  pop_code: string;
  region_id: string;
};

type OdpTypeOption = {
  id: string;
  odp_type_name: string;
  odp_type_code?: string | null;
};

type InstallationTypeOption = {
  id: string;
  installation_type_name: string;
  installation_type_code?: string | null;
};

type TenantOption = {
  id: string;
  tenant_name: string;
  tenant_code?: string | null;
};

type ProjectOption = {
  id: string;
  project_name?: string | null;
  project_code?: string | null;
  region_id?: string | null;
  pop_id?: string | null;
};

export type DeviceCreateFormValues = {
  device_type_key: string;
  device_name: string;
  odp_type: string;
  installation_type: string;
  region_id: string;
  tenant_id: string;
};

export function DeviceCreateForm({
  values,
  odpTypes,
  installationTypes,
  tenants,
  onChange,
}: {
  values: DeviceCreateFormValues;
  odpTypes: OdpTypeOption[];
  installationTypes: InstallationTypeOption[];
  tenants: TenantOption[];
  onChange: (patch: Partial<DeviceCreateFormValues>) => void;
}) {
  const isOdp = values.device_type_key === "ODP";

  const odpTypeOptions: ComboboxOption[] = [
    { value: "__none__", label: "Pilih tipe ODP" },
    ...odpTypes.map((item) => ({
      value: item.odp_type_name,
      label: [item.odp_type_name, item.odp_type_code].filter(Boolean).join(" - "),
    })),
  ];

  const installationTypeOptions: ComboboxOption[] = [
    { value: "__none__", label: "Pilih jenis instalasi" },
    ...installationTypes.map((item) => ({
      value: item.installation_type_name,
      label: [item.installation_type_name, item.installation_type_code].filter(Boolean).join(" - "),
    })),
  ];

  const tenantOptions: ComboboxOption[] = [
    { value: "__none__", label: "Pilih Tenant (Opsional)" },
    ...tenants.map((item) => ({
      value: item.id,
      label: item.tenant_code ? `${item.tenant_name} (${item.tenant_code})` : item.tenant_name,
    })),
  ];

  return (
    <>
      <Field
        label={isOdp ? "Nama ODP" : "Device Name"}
        value={values.device_name}
        onChange={(value) => onChange({ device_name: normalizeDeviceName(value) })}
        required
      />
      {isOdp ? (
        <>
          <div className="space-y-1.5">
            <FieldLabel label="Tipe ODP" tooltip="Pilih tipe ODP dari master data." />
            <Combobox
              value={values.odp_type || "__none__"}
              onValueChange={(value) => onChange({ odp_type: value === "__none__" ? "" : value })}
              options={odpTypeOptions}
              placeholder="Pilih tipe ODP"
              searchPlaceholder="Cari tipe ODP..."
            />
          </div>
          <div className="space-y-1.5">
            <FieldLabel label="Jenis Instalasi" tooltip="Pilih jenis instalasi dari master data." />
            <Combobox
              value={values.installation_type || "__none__"}
              onValueChange={(value) => onChange({ installation_type: value === "__none__" ? "" : value })}
              options={installationTypeOptions}
              placeholder="Pilih jenis instalasi"
              searchPlaceholder="Cari jenis instalasi..."
            />
          </div>
        </>
      ) : null}
      <div className="space-y-1.5">
        <FieldLabel label="Tenant" tooltip="Pilih tenant perangkat dari master data." />
        <Combobox
          value={values.tenant_id || "__none__"}
          onValueChange={(value) => onChange({ tenant_id: value === "__none__" ? "" : value })}
          options={tenantOptions}
          placeholder="Pilih tenant"
          searchPlaceholder="Cari tenant..."
        />
      </div>
    </>
  );
}
