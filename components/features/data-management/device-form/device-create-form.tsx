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
  pop_id: string;
  region_id: string;
  tenant_id: string;
  project_id: string;
};

export function DeviceCreateForm({
  values,
  pops,
  odpTypes,
  installationTypes,
  tenants,
  projects,
  onChange,
  onPopChange,
}: {
  values: DeviceCreateFormValues;
  pops: PopOption[];
  odpTypes: OdpTypeOption[];
  installationTypes: InstallationTypeOption[];
  tenants: TenantOption[];
  projects: ProjectOption[];
  onChange: (patch: Partial<DeviceCreateFormValues>) => void;
  onPopChange: (popId: string) => void;
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

  const popOptions: ComboboxOption[] = [
    { value: "__none__", label: "None" },
    ...pops
      .filter((pop) => !values.region_id || pop.region_id === values.region_id)
      .map((pop) => ({
        value: pop.id,
        label: `${pop.pop_name} (${pop.pop_code})`,
      })),
  ];

  const tenantOptions: ComboboxOption[] = [
    { value: "__none__", label: "None" },
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
        <FieldLabel label="POP (opsional)" tooltip="Hubungkan device ke POP jika perangkat berada di POP tertentu." />
        <Combobox
          value={values.pop_id || "__none__"}
          onValueChange={(value) => onPopChange(value === "__none__" ? "" : value)}
          options={popOptions}
          placeholder="Pilih POP"
          searchPlaceholder="Cari POP..."
        />
      </div>
      <div className="space-y-1.5">
        <FieldLabel label="Project (opsional)" tooltip="Hubungkan device ke project untuk konteks asset capitalization." />
        <Combobox
          value={values.project_id || "__none__"}
          onValueChange={(value) => onChange({ project_id: value === "__none__" ? "" : value })}
          options={[
            { value: "__none__", label: "Tidak ada project" },
            ...projects
              .filter((project) => !values.region_id || !project.region_id || project.region_id === values.region_id)
              .map((project) => ({
                value: project.id,
                label: [project.project_name, project.project_code].filter(Boolean).join(" | ") || "Project tidak tersedia",
              })),
          ]}
          placeholder="Pilih project"
          searchPlaceholder="Cari project..."
        />
      </div>
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
