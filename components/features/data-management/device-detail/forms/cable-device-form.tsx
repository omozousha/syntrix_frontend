import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import {
  type DefaultInfoSectionProps,
  DefaultInfoSection,
  type SplitterProfileOption,
  DEVICE_TECHNICAL_COPY,
  Field,
  ComboboxField,
  SplitterRatioField,
} from "../sections/index";
import {
  type TopologySectionProps,
  emptyTopologyLookup,
} from "../sections/device-topology-helpers";
import { CableTopologySection } from "./sections/index";

export type CableDeviceFormProps = DefaultInfoSectionProps & {
  splitterProfiles: SplitterProfileOption[];
  topologyLookup?: TopologySectionProps["topologyLookup"];
  cableTypes?: Array<{ id: string; cable_type_code: string; cable_type_name: string }>;
  routeTypes?: Array<{ id: string; route_type_code?: string | null; route_type_name: string }>;
  coreCapacities?: Array<{ core_capacity_value: number; label: string; allowed_route_type_keys?: string[] | null }>;
};

export function CableDeviceForm(props: CableDeviceFormProps) {
  const technicalCopy = DEVICE_TECHNICAL_COPY.CABLE;

  // Filter core capacities based on selected route type
  const routeType = props.form.route_type || "";
  const filteredCoreCapacities = (props.coreCapacities || []).filter((item) => {
    const allowedKeys = item.allowed_route_type_keys || [];
    if (!allowedKeys.length) return true; // empty = ALL (berlaku untuk semua route type)
    if (allowedKeys.includes("_NONE_")) return false; // _NONE_ = tidak berlaku di kategori manapun
    if (!routeType) return true; // route_type belum dipilih, tampilkan semua core
    return allowedKeys.includes(routeType);
  });

  return (
    <div className="space-y-3">
      <DefaultInfoSection {...props} />

      <Card className="bg-transparent">
        <CardHeader className="px-3 py-2">
          <CardTitle className="text-sm">{technicalCopy.title}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-2 px-3 pb-3 pt-0 md:grid-cols-2 xl:grid-cols-3">
          <ComboboxField
            label="Tipe Kabel"
            value={props.form.cable_type || "__none__"}
            onValueChange={(value) => props.onChange((prev) => ({ ...prev, cable_type: value === "__none__" ? "" : value }))}
            disabled={!props.editing}
            searchPlaceholder="Cari tipe kabel..."
            options={[
              { value: "__none__", label: "Pilih tipe kabel" },
              ...(props.cableTypes || []).map((t) => ({
                value: t.cable_type_code,
                label: t.cable_type_name,
              })),
            ]}
          />
          <ComboboxField
            label="Kategori Kabel"
            value={props.form.route_type || "__none__"}
            onValueChange={(value) => props.onChange((prev) => ({ ...prev, route_type: value === "__none__" ? "" : value }))}
            disabled={!props.editing}
            searchPlaceholder="Cari kategori kabel..."
            options={[
              { value: "__none__", label: "Pilih kategori kabel" },
              ...(props.routeTypes || []).map((rt) => ({
                value: rt.route_type_code || rt.route_type_name,
                label: rt.route_type_code ? `${rt.route_type_name} (${rt.route_type_code})` : rt.route_type_name,
              })),
            ]}
          />
          <ComboboxField
            label="Capacity Core"
            value={props.form.capacity_core || "__none__"}
            onValueChange={(value) => props.onChange((prev) => ({ ...prev, capacity_core: value === "__none__" ? "" : value }))}
            disabled={!props.editing}
            searchPlaceholder="Cari kapasitas core..."
            options={[
              { value: "__none__", label: "Pilih kapasitas core" },
              ...filteredCoreCapacities.map((item) => ({
                value: String(item.core_capacity_value),
                label: `${item.core_capacity_value} Core${item.label ? ` — ${item.label}` : ""}`,
              })),
            ]}
          />
          <Field
            label="Used Core"
            type="number"
            value={props.form.used_core}
            onChange={(value) => props.onChange((prev) => ({ ...prev, used_core: value }))}
            disabled={!props.editing}
            compact
          />
          <Field
            label={technicalCopy.totalPortsLabel}
            type="number"
            value={props.form.total_ports}
            onChange={(value) => props.onChange((prev) => ({ ...prev, total_ports: value }))}
            disabled={!props.editing}
            compact
          />
          <Field
            label={technicalCopy.usedPortsLabel}
            type="number"
            value={props.form.used_ports}
            onChange={(value) => props.onChange((prev) => ({ ...prev, used_ports: value }))}
            disabled={!props.editing}
            compact
          />
          <Field
            label="Panjang Kabel (m)"
            type="number"
            value={props.form.cable_length_m}
            onChange={(value) => props.onChange((prev) => ({ ...prev, cable_length_m: value }))}
            disabled={!props.editing}
            compact
          />
          <Field
            label="Route Name"
            value={props.form.route_name}
            onChange={(value) => props.onChange((prev) => ({ ...prev, route_name: value }))}
            disabled={!props.editing}
            compact
          />
          <SplitterRatioField
            value={props.form.splitter_ratio || "__none__"}
            label={technicalCopy.splitterLabel}
            editing={props.editing}
            deviceTypeKey="CABLE"
            splitterProfiles={props.splitterProfiles}
            onValueChange={(value) => {
              const ratioValue = value === "__none__" ? "" : value;
              const profile = props.splitterProfiles.find((item) => item.ratio_label === ratioValue) || null;
              const output = Number(profile?.output_port_count || 0);
              const autoTotal = Number.isFinite(output) && output > 0 ? (output >= 16 ? 8 : output) : 0;
              props.onChange((prev) => ({
                ...prev,
                splitter_ratio: ratioValue,
                total_ports: autoTotal ? String(autoTotal) : prev.total_ports,
              }));
            }}
          />
        </CardContent>
      </Card>

      <CableTopologySection
        form={props.form}
        onChange={props.onChange}
        editing={props.editing}
        topologyLookup={props.topologyLookup || emptyTopologyLookup()}
      />
    </div>
  );
}
