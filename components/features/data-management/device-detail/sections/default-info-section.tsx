import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { normalizeDeviceName } from "@/lib/name-normalization";
import { RELATION_LABEL_FALLBACK } from "@/lib/relation-labels";
import { mapValidationStatus } from "@/lib/validation-status";
import {
  type DeviceForm,
  type EditableForm,
  type RelationLabels,
  type TenantOption,
  type PopLookupOption,
  type ProjectLookupOption,
  type ProvinceOption,
  type CityOption,
  DEVICE_STATUS_OPTIONS,
  DisplayField,
  LinkedDisplayField,
  Field,
  CoordinateField,
  SelectField,
  ComboboxField,
} from "./device-technical-helpers";

// ── Props ─────────────────────────────────────────────────────────────────

export type DefaultInfoSectionProps = {
  form: DeviceForm;
  onChange: (next: EditableForm | ((prev: EditableForm) => EditableForm)) => void;
  editing: boolean;
  relationLabels: RelationLabels;
  relationLoading?: boolean;
  tenants: TenantOption[];
  popOptions: PopLookupOption[];
  projectOptions: ProjectLookupOption[];
  projectHref?: string;
  effectiveValidationStatus: string;
  provinces?: ProvinceOption[];
  cities?: CityOption[];
};

// ── Default Info Section (Section 1) ───────────────────────────────────────

export function DefaultInfoSection(props: DefaultInfoSectionProps) {
  return (
    <>
      <DeviceIdentitySection {...props} />
      <DeviceRelationSection {...props} />
      <DeviceLocationSection {...props} />
      <DeviceTagsSection form={props.form} onChange={props.onChange} editing={props.editing} />
    </>
  );
}

// ── Identity Section ───────────────────────────────────────────────────────

function DeviceIdentitySection({
  form,
  onChange,
  editing,
  effectiveValidationStatus,
}: DefaultInfoSectionProps) {
  return (
    <Card>
      <CardHeader className="px-3 py-2">
        <CardTitle className="text-sm">Informasi Umum</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-2 px-3 pb-3 pt-0 md:grid-cols-2 xl:grid-cols-3">
        <Field label="Device ID" value={form.device_id} disabled compact />
        <Field
          label="Device Name"
          value={form.device_name}
          onChange={(value) => onChange((prev) => ({ ...prev, device_name: normalizeDeviceName(value) }))}
          disabled={!editing}
          compact
        />
        <Field label="Device Type" value={form.device_type_key} disabled compact />
        <Field label="Asset Group" value={form.asset_group} disabled compact />
        <SelectField
          label="Status"
          value={form.status}
          options={DEVICE_STATUS_OPTIONS}
          onValueChange={(value) => onChange((prev) => ({ ...prev, status: value }))}
          disabled={!editing}
          compact
        />
        <Field
          label="Installation Date"
          type="date"
          value={form.installation_date}
          onChange={(value) => onChange((prev) => ({ ...prev, installation_date: value }))}
          disabled={!editing}
          compact
        />
        <DisplayField label="Validation Status" value={mapValidationStatus(effectiveValidationStatus).label} compact />
        <Field
          label="Validation Date"
          type="date"
          value={form.validation_date}
          disabled
          compact
        />
      </CardContent>
    </Card>
  );
}

// ── Relation Section ───────────────────────────────────────────────────────

function DeviceRelationSection({
  form,
  onChange,
  editing,
  relationLabels,
  relationLoading = false,
  tenants,
  popOptions,
  projectOptions,
  projectHref,
}: DefaultInfoSectionProps) {
  const filteredProjectOptions = projectOptions
    .filter((project) => !form.region_id || !project.region_id || project.region_id === form.region_id)
    .filter((project) => !form.pop_id || !project.pop_id || project.pop_id === form.pop_id);

  return (
    <Card>
      <CardHeader className="px-3 py-2">
        <CardTitle className="text-sm">Relasi & Vendor</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-2 px-3 pb-3 pt-0 md:grid-cols-2 xl:grid-cols-3">
        <DisplayField label="Region" value={relationLabels.region || "-"} loading={relationLoading} compact />
        {editing ? (
          <ComboboxField
            label="POP"
            value={form.pop_id || "__none__"}
            onValueChange={(value) => onChange((prev) => ({ ...prev, pop_id: value === "__none__" ? "" : value }))}
            searchPlaceholder="Cari POP..."
            options={[
              { value: "__none__", label: "Tidak ada POP" },
              ...popOptions.map((pop) => ({
                value: pop.id,
                label: [pop.pop_name, pop.pop_code].filter(Boolean).join(" - ") || RELATION_LABEL_FALLBACK.missing,
              })),
            ]}
          />
        ) : (
          <DisplayField label="POP" value={relationLabels.pop || "-"} loading={relationLoading} compact />
        )}
        {editing ? (
          <ComboboxField
            label="Project"
            value={form.project_id || "__none__"}
            onValueChange={(value) => onChange((prev) => ({ ...prev, project_id: value === "__none__" ? "" : value }))}
            searchPlaceholder="Cari project..."
            options={[
              { value: "__none__", label: "Tidak ada project" },
              ...filteredProjectOptions.map((project) => ({
                value: project.id,
                label: [project.project_name, project.project_code || project.project_id].filter(Boolean).join(" | ") || RELATION_LABEL_FALLBACK.missing,
              })),
            ]}
          />
        ) : (
          <LinkedDisplayField label="Project" value={relationLabels.project || "-"} href={projectHref} loading={relationLoading} compact />
        )}
        {editing ? (
          <ComboboxField
            label="Tenant"
            value={form.tenant_id || "__none__"}
            onValueChange={(value) => onChange((prev) => ({ ...prev, tenant_id: value === "__none__" ? "" : value }))}
            searchPlaceholder="Cari tenant..."
            options={[
              { value: "__none__", label: "Tidak ada tenant" },
              ...tenants.map((tenant) => ({
                value: tenant.id,
                label: tenant.tenant_code ? `${tenant.tenant_name} (${tenant.tenant_code})` : tenant.tenant_name,
              })),
            ]}
          />
        ) : (
          <DisplayField label="Tenant" value={relationLabels.tenant || "-"} loading={relationLoading} compact />
        )}
        <DisplayField label="Manufacturer" value={relationLabels.manufacturer || "-"} loading={relationLoading} compact />
        <DisplayField label="Brand" value={relationLabels.brand || "-"} loading={relationLoading} compact />
        <DisplayField label="Model" value={relationLabels.model || "-"} loading={relationLoading} compact />
        <Field
          label="Serial Number"
          value={form.serial_number}
          onChange={(value) => onChange((prev) => ({ ...prev, serial_number: value }))}
          disabled={!editing}
          compact
        />
      </CardContent>
    </Card>
  );
}

// ── Location Section ───────────────────────────────────────────────────────

function DeviceLocationSection({
  form,
  onChange,
  editing,
  relationLabels,
  relationLoading = false,
  provinces = [],
  cities = [],
}: DefaultInfoSectionProps) {
  const provinceOptions = [
    { value: "__none__", label: "Pilih provinsi" },
    ...provinces.map((item) => ({
      value: item.id,
      label: item.province_name,
    })),
  ];

  const cityOptions = [
    { value: "__none__", label: "Pilih kota/kabupaten" },
    ...cities
      .filter((item) => !form.province_id || item.province_id === form.province_id)
      .map((item) => ({
        value: item.id,
        label: item.city_name,
      })),
  ];

  return (
    <Card>
      <CardHeader className="px-3 py-2">
        <CardTitle className="text-sm">Lokasi</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-2 px-3 pb-3 pt-0 md:grid-cols-2 xl:grid-cols-3">
        <Field className="md:col-span-2 xl:col-span-3" label="Address" value={form.address} onChange={(value) => onChange((prev) => ({ ...prev, address: value }))} disabled={!editing} compact />
        {editing ? (
          <ComboboxField
            label="Province (Master)"
            value={form.province_id || "__none__"}
            onValueChange={(value) => {
              if (value === "__none__") {
                onChange((prev) => ({ ...prev, province_id: "", city_id: "" }));
                return;
              }
              onChange((prev) => ({
                ...prev,
                province_id: value,
                city_id: "",
              }));
            }}
            searchPlaceholder="Cari provinsi..."
            options={provinceOptions}
          />
        ) : (
          <DisplayField label="Province" value={relationLabels.province || "-"} loading={relationLoading} compact />
        )}
        {editing ? (
          <ComboboxField
            label="City/Kabupaten (Master)"
            value={form.city_id || "__none__"}
            onValueChange={(value) => {
              if (value === "__none__") {
                onChange((prev) => ({ ...prev, city_id: "" }));
                return;
              }
              onChange((prev) => ({ ...prev, city_id: value }));
            }}
            disabled={!form.province_id}
            searchPlaceholder="Cari kota/kabupaten..."
            options={cityOptions}
          />
        ) : (
          <DisplayField label="City/Kabupaten" value={relationLabels.city || "-"} loading={relationLoading} compact />
        )}
        <CoordinateField label="Longitude" value={form.longitude} onChange={(value) => onChange((prev) => ({ ...prev, longitude: value }))} disabled={!editing} compact kind="longitude" />
        <CoordinateField label="Latitude" value={form.latitude} onChange={(value) => onChange((prev) => ({ ...prev, latitude: value }))} disabled={!editing} compact kind="latitude" />
      </CardContent>
    </Card>
  );
}

// ── Tags Section ───────────────────────────────────────────────────────────

function DeviceTagsSection({ form, onChange, editing }: Pick<DefaultInfoSectionProps, "form" | "onChange" | "editing">) {
  return (
    <Card>
      <CardHeader className="px-3 py-2">
        <CardTitle className="text-sm">Tags</CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3 pt-0">
        <Field label="Tags (CSV)" value={form.tags} onChange={(value) => onChange((prev) => ({ ...prev, tags: value }))} disabled={!editing} compact />
      </CardContent>
    </Card>
  );
}
