import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import {
  type DefaultInfoSectionProps,
  DefaultInfoSection,
  type SplitterProfileOption,
  type OdpTypeOption,
  type InstallationTypeOption,
  type OdpFieldValidationPayload,
  DEVICE_TECHNICAL_COPY,
  valueOf,
  DisplayField,
  Field,
  ComboboxField,
  SplitterRatioField,
} from "../sections/index";
import {
  type TopologySectionProps,
  emptyTopologyLookup,
} from "../sections/device-topology-helpers";
import { OdpTopologySection } from "./sections/index";

export type OdpDeviceFormProps = DefaultInfoSectionProps & {
  splitterProfiles: SplitterProfileOption[];
  odpTypes: OdpTypeOption[];
  installationTypes: InstallationTypeOption[];
  latestFieldValidation?: OdpFieldValidationPayload | null;
  topologyLookup?: TopologySectionProps["topologyLookup"];
};

export function OdpDeviceForm(props: OdpDeviceFormProps) {
  const technicalCopy = DEVICE_TECHNICAL_COPY.ODP;
  const selectedSplitterProfile =
    props.splitterProfiles.find((item) => item.ratio_label === props.form.splitter_ratio) || null;
  const selectedSplitterOutputPort = Number(selectedSplitterProfile?.output_port_count || 0);
  const needsPortPresetSelector =
    Number.isFinite(selectedSplitterOutputPort) && selectedSplitterOutputPort >= 16;
  const splitterPortPresetOptions = (() => {
    if (!needsPortPresetSelector) return [] as number[];
    const maxPort = selectedSplitterOutputPort;
    const presets = [8, 16, 32, 64].filter((value) => value <= maxPort);
    if (!presets.includes(maxPort)) presets.push(maxPort);
    return Array.from(new Set(presets)).sort((a, b) => a - b);
  })();

  return (
    <div className="space-y-3">
      <DefaultInfoSection {...props} />

      <Card className="bg-transparent">
        <CardHeader className="px-3 py-2">
          <CardTitle className="text-sm">{technicalCopy.title}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-2 px-3 pb-3 pt-0 md:grid-cols-2 xl:grid-cols-3">
          <DisplayField label="Nama ODP Baru" value={valueOf(props.latestFieldValidation?.new_device_name, "-")} compact />
          <ComboboxField
            label="Tipe ODP"
            value={props.form.odp_type || "__none__"}
            onValueChange={(value) => props.onChange((prev) => ({ ...prev, odp_type: value === "__none__" ? "" : value }))}
            disabled={!props.editing}
            searchPlaceholder="Cari tipe ODP..."
            options={[
              { value: "__none__", label: "Pilih tipe ODP" },
              ...props.odpTypes.map((item) => ({
                value: item.odp_type_name,
                label: [item.odp_type_name, item.odp_type_code].filter(Boolean).join(" - "),
              })),
            ]}
          />
          <ComboboxField
            label="Jenis Instalasi"
            value={props.form.installation_type || "__none__"}
            onValueChange={(value) => props.onChange((prev) => ({ ...prev, installation_type: value === "__none__" ? "" : value }))}
            disabled={!props.editing}
            searchPlaceholder="Cari jenis instalasi..."
            options={[
              { value: "__none__", label: "Pilih jenis instalasi" },
              ...props.installationTypes.map((item) => ({
                value: item.installation_type_name,
                label: [item.installation_type_name, item.installation_type_code].filter(Boolean).join(" - "),
              })),
            ]}
          />
          <DisplayField label="Capacity Core" value={technicalCopy.corePlaceholder || "-"} compact />
          {needsPortPresetSelector ? (
            <ComboboxField
              label={technicalCopy.totalPortsLabel}
              value={props.form.total_ports || "__none__"}
              onValueChange={(value) => props.onChange((prev) => ({ ...prev, total_ports: value === "__none__" ? "" : value }))}
              disabled={!props.editing}
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
            <Field
              label={technicalCopy.totalPortsLabel}
              type="number"
              value={props.form.total_ports}
              onChange={(value) => props.onChange((prev) => ({ ...prev, total_ports: value }))}
              disabled={!props.editing}
              compact
            />
          )}
          <Field
            label={technicalCopy.usedPortsLabel}
            type="number"
            value={props.form.used_ports}
            onChange={(value) => props.onChange((prev) => ({ ...prev, used_ports: value }))}
            disabled={!props.editing}
            compact
          />
          <SplitterRatioField
            value={props.form.splitter_ratio || "__none__"}
            label={technicalCopy.splitterLabel}
            editing={props.editing}
            deviceTypeKey="ODP"
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

      <OdpTopologySection
        form={props.form}
        onChange={props.onChange}
        editing={props.editing}
        topologyLookup={props.topologyLookup || emptyTopologyLookup()}
      />
    </div>
  );
}
