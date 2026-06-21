import { CheckCircle2, CircleHelp, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { normalizeDeviceName } from "@/lib/name-normalization";
import { RELATION_LABEL_FALLBACK } from "@/lib/relation-labels";
import { mapValidationStatus } from "@/lib/validation-status";

type EditableForm = Record<string, string>;

type RelationLabels = {
  region?: string;
  pop?: string;
  project?: string;
  manufacturer?: string;
  brand?: string;
  model?: string;
  tenant?: string;
};

type SplitterProfileOption = {
  id: string;
  ratio_label: string;
  output_port_count?: number | null;
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

type PopLookupOption = {
  id: string;
  pop_id?: string | null;
  pop_code?: string | null;
  pop_name?: string | null;
  region_id?: string | null;
};

type ProjectLookupOption = {
  id: string;
  project_id?: string | null;
  project_code?: string | null;
  project_name?: string | null;
  region_id?: string | null;
  pop_id?: string | null;
};

type OdpFieldValidationPayload = {
  new_device_name?: string | null;
};

type DeviceDetailFormProps = {
  form: EditableForm;
  onChange: (next: EditableForm | ((prev: EditableForm) => EditableForm)) => void;
  editing: boolean;
  relationLabels: RelationLabels;
  relationLoading?: boolean;
  isOdpDevice: boolean;
  splitterProfiles: SplitterProfileOption[];
  odpTypes: OdpTypeOption[];
  installationTypes: InstallationTypeOption[];
  tenants: TenantOption[];
  popOptions: PopLookupOption[];
  projectOptions: ProjectLookupOption[];
  latestFieldValidation?: OdpFieldValidationPayload | null;
  effectiveValidationStatus: string;
};

const DEVICE_STATUS_OPTIONS = ["draft", "installed", "active", "inactive", "maintenance", "retired"];

const DEVICE_TECHNICAL_COPY: Record<string, {
  title: string;
  totalPortsLabel: string;
  usedPortsLabel: string;
  splitterLabel: string;
  corePlaceholder?: string;
}> = {
  ODP: {
    title: "Technical ODP",
    totalPortsLabel: "Kapasitas ODP",
    usedPortsLabel: "Port Aktif",
    splitterLabel: "Kapasitas Splitter",
    corePlaceholder: "Auto from core chain",
  },
  ODC: {
    title: "Technical ODC",
    totalPortsLabel: "Total Port Cabinet",
    usedPortsLabel: "Port Terpakai",
    splitterLabel: "Splitter Profile",
  },
  OLT: {
    title: "Technical OLT",
    totalPortsLabel: "Total PON/Uplink Ports",
    usedPortsLabel: "Used Ports",
    splitterLabel: "Splitter Ratio",
  },
  ONT: {
    title: "Technical ONT",
    totalPortsLabel: "Total Service Ports",
    usedPortsLabel: "Used Service Ports",
    splitterLabel: "Splitter Ratio",
  },
  CABLE: {
    title: "Technical Cable",
    totalPortsLabel: "Endpoint Ports",
    usedPortsLabel: "Used Endpoint Ports",
    splitterLabel: "Splitter Ratio",
  },
  SWITCH: {
    title: "Technical Switch",
    totalPortsLabel: "Interface Count",
    usedPortsLabel: "Used Interfaces",
    splitterLabel: "Splitter Ratio",
  },
  ROUTER: {
    title: "Technical Router",
    totalPortsLabel: "Interface Count",
    usedPortsLabel: "Used Interfaces",
    splitterLabel: "Splitter Ratio",
  },
};

export function DeviceDetailForm(props: DeviceDetailFormProps) {
  const selectedSplitterProfile =
    props.splitterProfiles.find((item) => item.ratio_label === props.form.splitter_ratio) || null;
  const selectedSplitterOutputPort = Number(selectedSplitterProfile?.output_port_count || 0);
  const needsPortPresetSelector =
    props.isOdpDevice && Number.isFinite(selectedSplitterOutputPort) && selectedSplitterOutputPort >= 16;
  const splitterPortPresetOptions = (() => {
    if (!needsPortPresetSelector) return [] as number[];
    const maxPort = selectedSplitterOutputPort;
    const presets = [8, 16, 32, 64].filter((value) => value <= maxPort);
    if (!presets.includes(maxPort)) presets.push(maxPort);
    return Array.from(new Set(presets)).sort((a, b) => a - b);
  })();

  return (
    <div className="space-y-3">
      <DeviceIdentitySection {...props} />
      <DeviceRelationSection {...props} />
      <DeviceTechnicalSection
        {...props}
        needsPortPresetSelector={needsPortPresetSelector}
        splitterPortPresetOptions={splitterPortPresetOptions}
      />
      <DeviceLocationSection form={props.form} onChange={props.onChange} editing={props.editing} />
      <DeviceTagsSection form={props.form} onChange={props.onChange} editing={props.editing} />
    </div>
  );
}

function DeviceIdentitySection({
  form,
  onChange,
  editing,
  isOdpDevice,
  odpTypes,
  installationTypes,
  latestFieldValidation,
  effectiveValidationStatus,
}: DeviceDetailFormProps) {
  return (
    <Card>
      <CardHeader className="px-3 py-2">
        <CardTitle className="text-sm">{isOdpDevice ? "Identitas ODP" : "Identitas Device"}</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-2 px-3 pb-3 pt-0 md:grid-cols-2 xl:grid-cols-3">
        <Field label={isOdpDevice ? "ID Inventory" : "Device ID"} value={form.device_id} disabled compact />
        <Field
          label={isOdpDevice ? "Nama ODP" : "Device Name"}
          value={form.device_name}
          onChange={(value) => onChange((prev) => ({ ...prev, device_name: normalizeDeviceName(value) }))}
          disabled={!editing}
          compact
        />
        {isOdpDevice ? <DisplayField label="Nama ODP Baru" value={valueOf(latestFieldValidation?.new_device_name, "-")} compact /> : null}
        {isOdpDevice ? (
          <ComboboxField
            label="Tipe ODP"
            value={form.odp_type || "__none__"}
            onValueChange={(value) => onChange((prev) => ({ ...prev, odp_type: value === "__none__" ? "" : value }))}
            disabled={!editing}
            searchPlaceholder="Cari tipe ODP..."
            options={[
              { value: "__none__", label: "Pilih tipe ODP" },
              ...odpTypes.map((item) => ({
                value: item.odp_type_name,
                label: [item.odp_type_name, item.odp_type_code].filter(Boolean).join(" - "),
              })),
            ]}
          />
        ) : null}
        {isOdpDevice ? (
          <ComboboxField
            label="Jenis Instalasi"
            value={form.installation_type || "__none__"}
            onValueChange={(value) => onChange((prev) => ({ ...prev, installation_type: value === "__none__" ? "" : value }))}
            disabled={!editing}
            searchPlaceholder="Cari jenis instalasi..."
            options={[
              { value: "__none__", label: "Pilih jenis instalasi" },
              ...installationTypes.map((item) => ({
                value: item.installation_type_name,
                label: [item.installation_type_name, item.installation_type_code].filter(Boolean).join(" - "),
              })),
            ]}
          />
        ) : null}
        <Field label={isOdpDevice ? "Kategori Device" : "Device Type"} value={form.device_type_key} disabled compact />
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

function DeviceRelationSection({
  form,
  onChange,
  editing,
  relationLabels,
  relationLoading = false,
  tenants,
  popOptions,
  projectOptions,
}: DeviceDetailFormProps) {
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
          <DisplayField label="Project" value={relationLabels.project || "-"} loading={relationLoading} compact />
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

function DeviceTechnicalSection({
  form,
  onChange,
  editing,
  isOdpDevice,
  splitterProfiles,
  needsPortPresetSelector,
  splitterPortPresetOptions,
}: DeviceDetailFormProps & {
  needsPortPresetSelector: boolean;
  splitterPortPresetOptions: number[];
}) {
  const deviceTypeKey = valueOf(form.device_type_key, "DEVICE").toUpperCase();
  const technicalCopy = DEVICE_TECHNICAL_COPY[deviceTypeKey] || {
    title: `Technical ${deviceTypeKey}`,
    totalPortsLabel: "Total Ports",
    usedPortsLabel: "Used Ports",
    splitterLabel: "Splitter Ratio",
  };

  return (
    <Card>
      <CardHeader className="px-3 py-2">
        <CardTitle className="text-sm">{technicalCopy.title}</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-2 px-3 pb-3 pt-0 md:grid-cols-2 xl:grid-cols-3">
        {!isOdpDevice ? (
          <Field label="Management IP" value={form.management_ip} onChange={(value) => onChange((prev) => ({ ...prev, management_ip: value }))} disabled={!editing} compact />
        ) : null}
        {!isOdpDevice ? (
          <>
            <Field label="Capacity Core" type="number" value={form.capacity_core} onChange={(value) => onChange((prev) => ({ ...prev, capacity_core: value }))} disabled={!editing} compact />
            <Field label="Used Core" type="number" value={form.used_core} onChange={(value) => onChange((prev) => ({ ...prev, used_core: value }))} disabled={!editing} compact />
          </>
        ) : (
          <DisplayField label="Capacity Core" value={technicalCopy.corePlaceholder || "-"} compact />
        )}
        {needsPortPresetSelector ? (
          <ComboboxField
            label={technicalCopy.totalPortsLabel}
            value={form.total_ports || "__none__"}
            onValueChange={(value) => onChange((prev) => ({ ...prev, total_ports: value === "__none__" ? "" : value }))}
            disabled={!editing}
            searchPlaceholder="Cari total port..."
            options={[
              { value: "__none__", label: "Pilih total port" },
              ...splitterPortPresetOptions.map((port) => ({
                value: String(port),
                label: `${port} port`,
              })),
            ]}
          />
        ) : (
          <Field label={technicalCopy.totalPortsLabel} type="number" value={form.total_ports} onChange={(value) => onChange((prev) => ({ ...prev, total_ports: value }))} disabled={!editing} compact />
        )}
        <Field label={technicalCopy.usedPortsLabel} type="number" value={form.used_ports} onChange={(value) => onChange((prev) => ({ ...prev, used_ports: value }))} disabled={!editing} compact />
        <SplitterRatioField
          value={form.splitter_ratio || "__none__"}
          label={technicalCopy.splitterLabel}
          editing={editing}
          splitterProfiles={splitterProfiles}
          onValueChange={(value) => {
            const ratioValue = value === "__none__" ? "" : value;
            const profile = splitterProfiles.find((item) => item.ratio_label === ratioValue) || null;
            const output = Number(profile?.output_port_count || 0);
            const autoTotal = Number.isFinite(output) && output > 0 ? (output >= 16 ? 8 : output) : 0;
            onChange((prev) => ({
              ...prev,
              splitter_ratio: ratioValue,
              total_ports: autoTotal ? String(autoTotal) : prev.total_ports,
            }));
          }}
        />
      </CardContent>
    </Card>
  );
}

function DeviceLocationSection({
  form,
  onChange,
  editing,
}: Pick<DeviceDetailFormProps, "form" | "onChange" | "editing">) {
  return (
    <Card>
      <CardHeader className="px-3 py-2">
        <CardTitle className="text-sm">Lokasi</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-2 px-3 pb-3 pt-0 md:grid-cols-2 xl:grid-cols-3">
        <Field className="md:col-span-2 xl:col-span-3" label="Address" value={form.address} onChange={(value) => onChange((prev) => ({ ...prev, address: value }))} disabled={!editing} compact />
        <CoordinateField label="Longitude" value={form.longitude} onChange={(value) => onChange((prev) => ({ ...prev, longitude: value }))} disabled={!editing} compact kind="longitude" />
        <CoordinateField label="Latitude" value={form.latitude} onChange={(value) => onChange((prev) => ({ ...prev, latitude: value }))} disabled={!editing} compact kind="latitude" />
      </CardContent>
    </Card>
  );
}

function DeviceTagsSection({ form, onChange, editing }: Pick<DeviceDetailFormProps, "form" | "onChange" | "editing">) {
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

function SplitterRatioField({
  value,
  label,
  editing,
  splitterProfiles,
  onValueChange,
}: {
  value: string;
  label: string;
  editing: boolean;
  splitterProfiles: SplitterProfileOption[];
  onValueChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-1.5">
        <Label>{label}</Label>
        <Badge variant="outline" className="h-4 rounded px-1.5 text-[9px] uppercase tracking-normal text-blue-700 dark:text-blue-300">
          Auto-fill
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground">
        Pilihan splitter mengisi rekomendasi kapasitas port. Review kembali sebelum menyimpan perubahan.
      </p>
      <Combobox
        value={value}
        onValueChange={onValueChange}
        disabled={!editing}
        triggerClassName="h-8 text-xs"
        options={[
          { value: "__none__", label: "Pilih splitter ratio" },
          ...splitterProfiles.map((item) => ({
            value: item.ratio_label,
            label: item.output_port_count ? `${item.ratio_label} (${item.output_port_count} port)` : item.ratio_label,
          })),
        ]}
        searchPlaceholder="Cari splitter ratio..."
      />
    </div>
  );
}

function ComboboxField({
  label,
  value,
  options,
  searchPlaceholder,
  onValueChange,
  disabled,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  searchPlaceholder?: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Combobox
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        triggerClassName="h-8 text-xs"
        options={options}
        searchPlaceholder={searchPlaceholder}
      />
    </div>
  );
}

function DisplayField({
  label,
  value,
  className = "",
  compact = false,
  loading = false,
}: {
  label: string;
  value: string;
  className?: string;
  compact?: boolean;
  loading?: boolean;
}) {
  return (
    <div className={`${compact ? "space-y-1" : "space-y-1.5"} ${className}`}>
      <Label>{label}</Label>
      {loading ? (
        <Skeleton className={compact ? "h-8 w-full rounded-md" : "h-10 w-full rounded-md"} />
      ) : (
        <Input value={value} disabled className={compact ? "h-8 text-xs" : undefined} />
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  disabled,
  className = "",
  compact = false,
}: {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  type?: string;
  disabled?: boolean;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className={`${compact ? "space-y-1" : "space-y-1.5"} ${className}`}>
      <Label>{label}</Label>
      <Input
        type={type}
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        disabled={disabled}
        className={compact ? "h-8 text-xs" : undefined}
      />
    </div>
  );
}

function CoordinateField({
  label,
  value,
  onChange,
  disabled,
  compact = false,
  kind,
}: {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  compact?: boolean;
  kind: "longitude" | "latitude";
}) {
  const validation = validateCoordinateFormat(value, kind);
  const placeholder = kind === "latitude" ? "-6.200000" : "106.816666";

  return (
    <div className={compact ? "space-y-1" : "space-y-1.5"}>
      <div className="flex items-center gap-1.5">
        <Label>{label}</Label>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button type="button" variant="ghost" size="icon-xs" className="text-muted-foreground" aria-label={`Info ${label}`}>
                <CircleHelp className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={6}>
              {kind === "latitude"
                ? "Format: -x.xxxxxx (contoh: -6.200000). Wajib minus di depan, minimal 6 digit desimal."
                : "Format: xxx.xxxxxx (contoh: 106.816666). Tiga digit di depan, minimal 6 digit desimal."}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <Input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange?.(event.target.value)}
        disabled={disabled}
        className={compact ? "h-8 text-xs" : undefined}
      />
      {validation.state !== "idle" ? (
        <Badge variant="outline" className={`${validation.state === "valid" ? "border-emerald-300 text-emerald-700" : "border-rose-300 text-rose-700"} h-4 w-fit gap-0.5 px-1.5 text-[10px]`}>
          {validation.state === "valid" ? <CheckCircle2 className="mr-0.5 size-3" /> : <XCircle className="mr-0.5 size-3" />}
          {validation.message}
        </Badge>
      ) : null}
    </div>
  );
}

function SelectField({
  label,
  value,
  options,
  onValueChange,
  disabled,
  compact = false,
}: {
  label: string;
  value: string;
  options: string[];
  onValueChange: (value: string) => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "space-y-1" : "space-y-1.5"}>
      <Label>{label}</Label>
      <Combobox
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        triggerClassName={compact ? "h-8 text-xs" : undefined}
        options={options.map((option) => ({ value: option, label: option }))}
      />
    </div>
  );
}

function valueOf(value: unknown, fallback = "") {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
}

function validateCoordinateFormat(value: string, kind: "longitude" | "latitude") {
  const text = value.trim();
  if (!text) return { state: "idle" as const, message: "" };

  if (kind === "longitude") {
    const valid = /^-?\d{3}\.\d{6,}$/.test(text);
    return {
      state: valid ? ("valid" as const) : ("invalid" as const),
      message: valid ? "Format valid" : "Format longitude: 3 digit depan dan minimal 6 desimal",
    };
  }

  const valid = /^-\d{1,2}\.\d{6,}$/.test(text);
  return {
    state: valid ? ("valid" as const) : ("invalid" as const),
    message: valid ? "Format valid" : "Format latitude wajib minus dan minimal 6 desimal",
  };
}
