"use client";

import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { Field, FieldLabel } from "@/components/features/data-management/device-form/form-field-grid";

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

type RouteTypeOption = {
  id: string;
  route_type_name: string;
  route_type_code?: string | null;
};

export type RouteCreateFormValues = {
  route_name: string;
  route_type: string;
  pop_id: string;
  route_project_id: string;
  region_id: string;
  distance_meters: string;
};

export function RouteCreateForm({
  values,
  pops,
  projects,
  routeTypes,
  onChange,
}: {
  values: RouteCreateFormValues;
  pops: PopOption[];
  projects: ProjectOption[];
  routeTypes: RouteTypeOption[];
  onChange: (patch: Partial<RouteCreateFormValues>) => void;
}) {
  const routeTypeOptions: ComboboxOption[] = [
    { value: "__none__", label: "None" },
    ...routeTypes.map((item) => ({
      value: item.route_type_code || item.route_type_name,
      label: item.route_type_code ? `${item.route_type_name} (${item.route_type_code})` : item.route_type_name,
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

  const projectOptions: ComboboxOption[] = [
    { value: "__none__", label: "None" },
    ...projects
      .filter((project) => !values.region_id || !project.region_id || project.region_id === values.region_id)
      .map((project) => ({
        value: project.id,
        label: project.project_name || project.project_code || project.id,
      })),
  ];

  return (
    <>
      <Field label="Route Name" value={values.route_name} onChange={(value) => onChange({ route_name: value })} />
      <div className="space-y-1.5">
        <FieldLabel label="Route Type" tooltip="Pilih dari master Route Types. Kelola opsinya di Tata Kelola Master Data." />
        <Combobox
          value={values.route_type || "__none__"}
          onValueChange={(value) => onChange({ route_type: value === "__none__" ? "" : value })}
          options={routeTypeOptions}
          placeholder="Pilih route type"
          searchPlaceholder="Cari route type..."
        />
      </div>
      <div className="space-y-1.5">
        <FieldLabel label="POP (opsional)" tooltip="Titik POP utama untuk route ini." />
        <Combobox
          value={values.pop_id || "__none__"}
          onValueChange={(value) => onChange({ pop_id: value === "__none__" ? "" : value })}
          options={popOptions}
          placeholder="Pilih POP"
          searchPlaceholder="Cari POP..."
        />
      </div>
      <div className="space-y-1.5">
        <FieldLabel label="Project (opsional)" tooltip="Project delivery yang menaungi route ini." />
        <Combobox
          value={values.route_project_id || "__none__"}
          onValueChange={(value) => onChange({ route_project_id: value === "__none__" ? "" : value })}
          options={projectOptions}
          placeholder="Pilih project"
          searchPlaceholder="Cari project..."
        />
      </div>
      <Field
        label="Distance (meters)"
        type="number"
        value={values.distance_meters}
        onChange={(value) => onChange({ distance_meters: value })}
      />
    </>
  );
}
