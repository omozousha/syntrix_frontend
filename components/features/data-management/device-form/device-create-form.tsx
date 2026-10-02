"use client";

import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { Field, FieldLabel } from "@/components/features/data-management/device-form/form-field-grid";
import { normalizeDeviceName } from "@/lib/name-normalization";
import { useTranslate } from "@/lib/use-locale";

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
  const { t } = useTranslate();

  const odpTypeOptions: ComboboxOption[] = [
    { value: "__none__", label: t("createForm.selectOdpType") },
    ...odpTypes.map((item) => ({
      value: item.odp_type_name,
      label: [item.odp_type_name, item.odp_type_code].filter(Boolean).join(" - "),
    })),
  ];

  const installationTypeOptions: ComboboxOption[] = [
    { value: "__none__", label: t("createForm.selectInstallation") },
    ...installationTypes.map((item) => ({
      value: item.installation_type_name,
      label: [item.installation_type_name, item.installation_type_code].filter(Boolean).join(" - "),
    })),
  ];

  const tenantOptions: ComboboxOption[] = [
    { value: "__none__", label: t("createForm.selectTenantOptional") },
    ...tenants.map((item) => ({
      value: item.id,
      label: item.tenant_code ? `${item.tenant_name} (${item.tenant_code})` : item.tenant_name,
    })),
  ];

  return (
    <>
      <Field
        label={isOdp ? t("createForm.odpName") : "Device Name"}
        value={values.device_name}
        onChange={(value) => onChange({ device_name: normalizeDeviceName(value) })}
        required
      />
      {isOdp ? (
        <>
          <div className="space-y-1.5">
            <FieldLabel label="Tipe ODP" tooltip={t("createForm.odpTypeTip")} />
            <Combobox
              value={values.odp_type || "__none__"}
              onValueChange={(value) => onChange({ odp_type: value === "__none__" ? "" : value })}
              options={odpTypeOptions}
              placeholder={t("createForm.selectOdpType")}
              searchPlaceholder={t("createForm.searchOdpType")}
            />
          </div>
          <div className="space-y-1.5">
            <FieldLabel label="Jenis Instalasi" tooltip={t("createForm.installationTip")} />
            <Combobox
              value={values.installation_type || "__none__"}
              onValueChange={(value) => onChange({ installation_type: value === "__none__" ? "" : value })}
              options={installationTypeOptions}
              placeholder={t("createForm.selectInstallation")}
              searchPlaceholder={t("createForm.searchInstallation")}
            />
          </div>
        </>
      ) : null}
      <div className="space-y-1.5">
        <FieldLabel label="Tenant" tooltip={t("createForm.tenantTip")} />
        <Combobox
          value={values.tenant_id || "__none__"}
          onValueChange={(value) => onChange({ tenant_id: value === "__none__" ? "" : value })}
          options={tenantOptions}
          placeholder={t("createForm.selectTenant")}
          searchPlaceholder={t("createForm.searchTenant")}
        />
      </div>
    </>
  );
}
