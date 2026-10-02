"use client";

import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { Field, FieldLabel } from "@/components/features/data-management/device-form/form-field-grid";
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
  const { t } = useTranslate();
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
        label: project.project_name || project.project_code || t("createForm.projectUnavailable"),
      })),
  ];

  return (
    <>
      <Field label="Route Name" value={values.route_name} onChange={(value) => onChange({ route_name: value })} />
      <div className="space-y-1.5">
        <FieldLabel label="Route Type" tooltip={t("createForm.routeTypeTip")} />
        <Combobox
          value={values.route_type || "__none__"}
          onValueChange={(value) => onChange({ route_type: value === "__none__" ? "" : value })}
          options={routeTypeOptions}
          placeholder={t("createForm.selectRouteType")}
          searchPlaceholder={t("createForm.searchRouteType")}
        />
      </div>
      <div className="space-y-1.5">
        <FieldLabel label={t("createForm.popOptionalLabel")} tooltip={t("createForm.popRouteTip")} />
        <Combobox
          value={values.pop_id || "__none__"}
          onValueChange={(value) => onChange({ pop_id: value === "__none__" ? "" : value })}
          options={popOptions}
          placeholder={t("createForm.selectPop")}
          searchPlaceholder={t("createForm.searchPop")}
        />
      </div>
      <div className="space-y-1.5">
        <FieldLabel label={t("createForm.projectOptional")} tooltip={t("createForm.projectRouteTip")} />
        <Combobox
          value={values.route_project_id || "__none__"}
          onValueChange={(value) => onChange({ route_project_id: value === "__none__" ? "" : value })}
          options={projectOptions}
          placeholder={t("createForm.selectProject")}
          searchPlaceholder={t("createForm.searchProject")}
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
