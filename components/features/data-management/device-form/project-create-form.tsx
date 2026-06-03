"use client";

import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { Field, FieldLabel } from "@/components/features/data-management/device-form/form-field-grid";

type PopOption = {
  id: string;
  pop_name: string;
  pop_code: string;
  region_id: string;
};

export type ProjectCreateFormValues = {
  project_name: string;
  vendor_name: string;
  bast_number: string;
  spk_number: string;
  pop_id: string;
  region_id: string;
  project_description: string;
  start_date: string;
  end_date: string;
  budget_value: string;
};

export function ProjectCreateForm({
  values,
  pops,
  sectionSpanClass,
  onChange,
}: {
  values: ProjectCreateFormValues;
  pops: PopOption[];
  sectionSpanClass: string;
  onChange: (patch: Partial<ProjectCreateFormValues>) => void;
}) {
  const popOptions: ComboboxOption[] = [
    { value: "__none__", label: "None" },
    ...pops
      .filter((pop) => !values.region_id || pop.region_id === values.region_id)
      .map((pop) => ({
        value: pop.id,
        label: `${pop.pop_name} (${pop.pop_code})`,
      })),
  ];

  return (
    <>
      <Field label="Project Name" value={values.project_name} onChange={(value) => onChange({ project_name: value })} />
      <Field label="Vendor Name" value={values.vendor_name} onChange={(value) => onChange({ vendor_name: value })} />
      <Field label="BAST Number" value={values.bast_number} onChange={(value) => onChange({ bast_number: value })} />
      <Field label="SPK Number" value={values.spk_number} onChange={(value) => onChange({ spk_number: value })} />
      <div className="space-y-1.5">
        <FieldLabel label="POP (opsional)" tooltip="POP utama project." />
        <Combobox
          value={values.pop_id || "__none__"}
          onValueChange={(value) => onChange({ pop_id: value === "__none__" ? "" : value })}
          options={popOptions}
          placeholder="Pilih POP"
          searchPlaceholder="Cari POP..."
        />
      </div>
      <Field
        label="Description"
        value={values.project_description}
        onChange={(value) => onChange({ project_description: value })}
        containerClassName={sectionSpanClass}
      />
      <Field label="Start Date" type="date" value={values.start_date} onChange={(value) => onChange({ start_date: value })} />
      <Field label="End Date" type="date" value={values.end_date} onChange={(value) => onChange({ end_date: value })} />
      <Field label="Budget Value" type="number" value={values.budget_value} onChange={(value) => onChange({ budget_value: value })} />
    </>
  );
}
