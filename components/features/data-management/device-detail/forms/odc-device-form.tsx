import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import {
  type DefaultInfoSectionProps,
  DefaultInfoSection,
  type SplitterProfileOption,
  DEVICE_TECHNICAL_COPY,
  Field,
  SplitterRatioField,
} from "../sections/index";
import {
  type TopologySectionProps,
  emptyTopologyLookup,
} from "../sections/device-topology-helpers";
import { OdcTopologySection } from "./sections/index";
import { OdcOutgoingCableSection } from "./sections/odc-outgoing-cable-section";
import { OdcCoreChainSummarySection } from "../odc-otb-chain-section";

export type OdcDeviceFormProps = DefaultInfoSectionProps & {
  splitterProfiles: SplitterProfileOption[];
  topologyLookup?: TopologySectionProps["topologyLookup"];
  topologySummary?: {
    odc_relations?: {
      downstream?: Array<Record<string, unknown>>;
      port_summary?: Record<string, unknown>;
      core_summary?: Record<string, unknown>;
    } | null;
  } | null;
  // ODC chain summary dari endpoint /devices/:id/odc-chain-summary
  odcChainSummary?: Parameters<typeof OdcCoreChainSummarySection>[0]["chainSummary"];
  odcChainLoading?: boolean;
  onOdcChainRefresh?: () => void;
};

export function OdcDeviceForm(props: OdcDeviceFormProps) {
  const technicalCopy = DEVICE_TECHNICAL_COPY.ODC;

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
          <SplitterRatioField
            value={props.form.splitter_ratio || "__none__"}
            label={technicalCopy.splitterLabel}
            editing={props.editing}
            deviceTypeKey="ODC"
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
          <Field
            label="Feeder Port Count"
            type="number"
            value={props.form.feeder_port_count}
            onChange={(value) => props.onChange((prev) => ({ ...prev, feeder_port_count: value }))}
            disabled={!props.editing}
            compact
          />
          <Field
            label="Distribution Port Count"
            type="number"
            value={props.form.distribution_port_count}
            onChange={(value) => props.onChange((prev) => ({ ...prev, distribution_port_count: value }))}
            disabled={!props.editing}
            compact
          />
        </CardContent>
      </Card>

      <OdcTopologySection
        form={props.form}
        onChange={props.onChange}
        editing={props.editing}
        topologyLookup={props.topologyLookup || emptyTopologyLookup()}
      />

      <OdcOutgoingCableSection
        downstream={props.topologySummary?.odc_relations?.downstream as any || null}
        portSummary={props.topologySummary?.odc_relations?.port_summary as any || null}
        coreSummary={props.topologySummary?.odc_relations?.core_summary as any || null}
      />

      <OdcCoreChainSummarySection
        chainSummary={props.odcChainSummary ?? null}
        loading={props.odcChainLoading ?? false}
        onRefresh={props.onOdcChainRefresh}
      />
    </div>
  );
}
