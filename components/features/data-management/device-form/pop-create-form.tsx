"use client";

import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { Field, FieldLabel } from "@/components/features/data-management/device-form/form-field-grid";
import { useTranslate } from "@/lib/use-locale";

type PopTypeOption = {
  id: string;
  pop_type_name: string;
  pop_type_code?: string | null;
};

type TenantOption = {
  id: string;
  tenant_name: string;
  tenant_code?: string | null;
};

export type PopCreateFormValues = {
  pop_name: string;
  pop_code: string;
  tenant: string;
  pln_cid_number: string;
  pln_payment_method: string;
  pln_phase: string;
  pln_wattage: string;
  pop_type_id: string;
  pop_type: string;
  tanggal_pop_aktif: string;
  tags: string;
};

export function PopCreateIdentityFields({
  values,
  onChange,
}: {
  values: Pick<PopCreateFormValues, "pop_name" | "pop_code">;
  onChange: (patch: Partial<PopCreateFormValues>) => void;
}) {
  return (
    <>
      <Field label="POP Name" value={values.pop_name} onChange={(value) => onChange({ pop_name: value })} />
      <Field label="POP Code (3 huruf)" value={values.pop_code} onChange={(value) => onChange({ pop_code: value.toUpperCase() })} />
    </>
  );
}

export function PopCreateOperationalFields({
  values,
  popTypes,
  tenants,
  sectionSpanClass,
  onChange,
}: {
  values: Omit<PopCreateFormValues, "pop_name" | "pop_code">;
  popTypes: PopTypeOption[];
  tenants: TenantOption[];
  sectionSpanClass: string;
  onChange: (patch: Partial<PopCreateFormValues>) => void;
}) {
  const { t } = useTranslate();
  const tenantOptions: ComboboxOption[] = [
    { value: "__none__", label: "None" },
    ...tenants.map((item) => ({
      value: item.tenant_name,
      label: item.tenant_code ? `${item.tenant_name} (${item.tenant_code})` : item.tenant_name,
    })),
  ];

  const popTypeOptions: ComboboxOption[] = [
    { value: "__none__", label: "None" },
    ...popTypes.map((item) => ({
      value: item.id,
      label: item.pop_type_code ? `${item.pop_type_name} (${item.pop_type_code})` : item.pop_type_name,
    })),
  ];

  return (
    <>
      <div className="space-y-1.5">
        <FieldLabel label="Tenant" tooltip={t("createForm.tenantPopTip")} />
        <Combobox
          value={values.tenant || "__none__"}
          onValueChange={(value) => onChange({ tenant: value === "__none__" ? "" : value })}
          options={tenantOptions}
          placeholder={t("createForm.selectTenant")}
          searchPlaceholder={t("createForm.searchTenant")}
        />
      </div>
      <Field label="PLN CID Number" value={values.pln_cid_number} onChange={(value) => onChange({ pln_cid_number: value })} />
      <Field
        label="PLN Payment Method"
        value={values.pln_payment_method}
        onChange={(value) => onChange({ pln_payment_method: value })}
        placeholder="prepaid / postpaid"
      />
      <Field
        label="PLN Phase"
        value={values.pln_phase}
        onChange={(value) => onChange({ pln_phase: value })}
        placeholder="1 phase / 3 phase"
      />
      <Field label="PLN Wattage" type="number" value={values.pln_wattage} onChange={(value) => onChange({ pln_wattage: value })} />
      <div className="space-y-1.5">
        <FieldLabel label="POP Type" tooltip={t("createForm.popTypeTip")} />
        <Combobox
          value={values.pop_type_id || "__none__"}
          onValueChange={(value) => {
            if (value === "__none__") {
              onChange({ pop_type_id: "", pop_type: "" });
              return;
            }
            const selected = popTypes.find((item) => item.id === value);
            onChange({
              pop_type_id: value,
              pop_type: selected?.pop_type_name || values.pop_type,
            });
          }}
          options={popTypeOptions}
          placeholder={t("createForm.selectPopType")}
          searchPlaceholder={t("createForm.searchPopType")}
        />
      </div>
      <Field
        label="Tanggal POP Aktif"
        type="date"
        value={values.tanggal_pop_aktif}
        onChange={(value) => onChange({ tanggal_pop_aktif: value })}
      />
      <Field
        label="Tags (comma separated)"
        value={values.tags}
        onChange={(value) => onChange({ tags: value })}
        placeholder="jabodebek,core,premium"
        containerClassName={sectionSpanClass}
      />
    </>
  );
}
