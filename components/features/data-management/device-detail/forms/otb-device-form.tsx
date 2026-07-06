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
import { OtbTopologySection } from "./sections/index";
import { OtbCoreChainSummarySection } from "../odc-otb-chain-section";

// ── Connector Type Options (sementara inline, nanti dari master data) ─────

const CONNECTOR_TYPE_OPTIONS = [
  { value: "SC/UPC", label: "SC/UPC" },
  { value: "SC/APC", label: "SC/APC" },
  { value: "LC/UPC", label: "LC/UPC" },
  { value: "LC/APC", label: "LC/APC" },
  { value: "FC/UPC", label: "FC/UPC" },
  { value: "FC/APC", label: "FC/APC" },
  { value: "MPO/MTP", label: "MPO/MTP (Multi-fiber)" },
];

export type OtbDeviceFormProps = DefaultInfoSectionProps & {
  splitterProfiles: SplitterProfileOption[];
  topologyLookup?: TopologySectionProps["topologyLookup"];
  // OTB chain summary dari topology device summary
  otbChainSummary?: Parameters<typeof OtbCoreChainSummarySection>[0]["chainSummary"];
  otbChainLoading?: boolean;
  onOtbChainRefresh?: () => void;
};

export function OtbDeviceForm(props: OtbDeviceFormProps) {
  const technicalCopy = DEVICE_TECHNICAL_COPY.OTB;

  return (
    <div className="space-y-3">
      <DefaultInfoSection {...props} />

      <Card className="bg-transparent">
        <CardHeader className="px-3 py-2">
          <CardTitle className="text-sm">{technicalCopy.title}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-2 px-3 pb-3 pt-0 md:grid-cols-2 xl:grid-cols-3">
          <Field
            label={technicalCopy.coreCapacityLabel || "Total Core Capacity"}
            type="number"
            value={props.form.capacity_core}
            onChange={(value) => props.onChange((prev) => ({ ...prev, capacity_core: value }))}
            disabled={!props.editing}
            compact
          />
          <Field
            label={technicalCopy.usedCoreLabel || "Used Core"}
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
          <ComboboxField
            label="Tipe Konektor"
            value={props.form.connector_type || "__none__"}
            onValueChange={(value) => props.onChange((prev) => ({ ...prev, connector_type: value === "__none__" ? "" : value }))}
            disabled={!props.editing}
            searchPlaceholder="Cari tipe konektor..."
            options={[
              { value: "__none__", label: "Pilih tipe konektor" },
              ...CONNECTOR_TYPE_OPTIONS,
            ]}
          />
          <Field
            label="Jumlah Slot Tray"
            type="number"
            value={props.form.tray_slot_count}
            onChange={(value) => props.onChange((prev) => ({ ...prev, tray_slot_count: value }))}
            disabled={!props.editing}
            compact
          />
          <SplitterRatioField
            value={props.form.splitter_ratio || "__none__"}
            label={technicalCopy.splitterLabel}
            editing={props.editing}
            deviceTypeKey="OTB"
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

      <OtbTopologySection
        form={props.form}
        onChange={props.onChange}
        editing={props.editing}
        topologyLookup={props.topologyLookup || emptyTopologyLookup()}
      />

      <OtbCoreChainSummarySection
        chainSummary={props.otbChainSummary ?? null}
        loading={props.otbChainLoading ?? false}
        onRefresh={props.onOtbChainRefresh}
      />
    </div>
  );
}
