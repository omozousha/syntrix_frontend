"use client";

import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { CidField, Field, FieldLabel } from "@/components/features/data-management/device-form/form-field-grid";
import { useTranslate } from "@/lib/use-locale";

type PopOption = {
  id: string;
  pop_name: string;
  pop_code: string;
  region_id: string;
};

type ProjectOption = {
  id: string;
  project_name: string;
  project_code?: string | null;
  region_id?: string | null;
};

type ServiceTypeOption = {
  id: string;
  service_type_name: string;
  service_type_code?: string | null;
};

export type CustomerCreateFormValues = {
  customer_name: string;
  customer_number: string;
  service_type_id: string;
  service_type: string;
  pop_id: string;
  customer_project_id: string;
  region_id: string;
};

export function CustomerCreateForm({
  values,
  serviceTypes,
  pops,
  projects,
  onChange,
}: {
  values: CustomerCreateFormValues;
  serviceTypes: ServiceTypeOption[];
  pops: PopOption[];
  projects: ProjectOption[];
  onChange: (patch: Partial<CustomerCreateFormValues>) => void;
}) {
  const { t } = useTranslate();
  const serviceTypeOptions: ComboboxOption[] = [
    { value: "__none__", label: "None" },
    ...serviceTypes.map((item) => ({
      value: item.id,
      label: item.service_type_code ? `${item.service_type_name} (${item.service_type_code})` : item.service_type_name,
    })),
  ];

  const popOptions: ComboboxOption[] = [
    { value: "__none__", label: t("createForm.selectPop") },
    ...pops
      .filter((pop) => !values.region_id || pop.region_id === values.region_id)
      .map((pop) => ({
        value: pop.id,
        label: `${pop.pop_name} (${pop.pop_code})`,
      })),
  ];

  const projectOptions: ComboboxOption[] = [
    { value: "__none__", label: "None" },
    ...projects
      .filter((project) => !values.region_id || !project.region_id || project.region_id === values.region_id)
      .map((project) => ({
        value: project.id,
        label: project.project_name || project.project_code || t("createForm.projectUnavailable"),
      })),
  ];

  return (
    <>
      <Field label="Customer Name" value={values.customer_name} onChange={(value) => onChange({ customer_name: value })} />
      <CidField value={values.customer_number} onChange={(value) => onChange({ customer_number: value })} />
      <div className="space-y-1.5">
        <FieldLabel label={t("createForm.serviceTypeOptional")} tooltip={t("createForm.serviceTypeTip")} />
        <Combobox
          value={values.service_type_id || "__none__"}
          onValueChange={(value) => {
            if (value === "__none__") {
              onChange({ service_type_id: "", service_type: "" });
              return;
            }
            const selected = serviceTypes.find((item) => item.id === value);
            onChange({
              service_type_id: value,
              service_type: selected?.service_type_name || values.service_type,
            });
          }}
          options={serviceTypeOptions}
          placeholder={t("createForm.selectServiceType")}
          searchPlaceholder={t("createForm.searchServiceType")}
        />
      </div>
      <div className="space-y-1.5">
        <FieldLabel label="POP" tooltip={t("createForm.popCustomerTip")} />
        <Combobox
          value={values.pop_id || "__none__"}
          onValueChange={(value) => onChange({ pop_id: value === "__none__" ? "" : value })}
          options={popOptions}
          placeholder={t("createForm.selectPop")}
          searchPlaceholder={t("createForm.searchPop")}
        />
      </div>
      <div className="space-y-1.5">
        <FieldLabel label={t("createForm.projectOptional")} tooltip={t("createForm.projectCustomerTip")} />
        <Combobox
          value={values.customer_project_id || "__none__"}
          onValueChange={(value) => onChange({ customer_project_id: value === "__none__" ? "" : value })}
          options={projectOptions}
          placeholder={t("createForm.selectProject")}
          searchPlaceholder={t("createForm.searchProject")}
        />
      </div>
    </>
  );
}
