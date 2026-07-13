import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

import {
  type DefaultInfoSectionProps,
  DefaultInfoSection,
  DefaultIdentitySection,
  DefaultRelationSection,
  DefaultLocationSection,
  DefaultTagsSection,
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

type DeviceCoreCapacityOption = { core_capacity_value: number; label: string; allowed_device_type_keys?: string[] | null };

export type OtbDeviceFormProps = DefaultInfoSectionProps & {
  splitterProfiles: SplitterProfileOption[];
  topologyLookup?: TopologySectionProps["topologyLookup"];
  // OTB chain summary dari topology device summary
  otbChainSummary?: Parameters<typeof OtbCoreChainSummarySection>[0]["chainSummary"];
  otbChainLoading?: boolean;
  onOtbChainRefresh?: () => void;
  deviceCoreCapacities?: DeviceCoreCapacityOption[];
};

export function OtbDeviceForm(props: OtbDeviceFormProps) {
  const technicalCopy = DEVICE_TECHNICAL_COPY.OTB;

  const [activeTab, setActiveTab] = useState("identitas");
  function getMissingDeviceFields() {
    const missing: Record<string, string[]> = {};
    const identitasMissing: string[] = [];
    if (!props.form.device_name) identitasMissing.push("Device Name");
    if (!props.form.region_id) identitasMissing.push("Region");
    if (identitasMissing.length > 0) missing.identitas = identitasMissing;
    return missing;
  }

  const missingTabFields = props.editing ? getMissingDeviceFields() : {};

  const filteredOtbCoreCapacities = (props.deviceCoreCapacities || []).filter((item) => {
    const allowedKeys = item.allowed_device_type_keys || [];
    if (!allowedKeys.length) return true;
    return allowedKeys.includes("OTB");
  });

  const otbCapNum = Number(props.form.capacity_core);
  const otbUsedNum = Number(props.form.used_core);
  const otbTotalNum = Number(props.form.total_ports);
  const otbUsedPortNum = Number(props.form.used_ports);
  const showOtbCoreWarning = Boolean(props.form.capacity_core) && Boolean(props.form.used_core) && Number.isFinite(otbCapNum) && Number.isFinite(otbUsedNum) && otbUsedNum > otbCapNum;
  const showOtbPortWarning = Boolean(props.form.total_ports) && Boolean(props.form.used_ports) && Number.isFinite(otbTotalNum) && Number.isFinite(otbUsedPortNum) && otbUsedPortNum > otbTotalNum;

  const technicalCard = (
    <Card className="bg-transparent">
      <CardHeader className="px-3 py-2">
        <CardTitle className="text-sm">{technicalCopy.title}</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-2 px-3 pb-3 pt-0 md:grid-cols-2 xl:grid-cols-3">
        <ComboboxField
          label={technicalCopy.coreCapacityLabel || "Total Core Capacity"}
          value={props.form.capacity_core || "__none__"}
          onValueChange={(value) => props.onChange((prev) => ({ ...prev, capacity_core: value === "__none__" ? "" : value }))}
          disabled={!props.editing}
          searchPlaceholder="Cari kapasitas core..."
          options={[
            { value: "__none__", label: "Pilih kapasitas core" },
            ...filteredOtbCoreCapacities.map((item) => ({
              value: String(item.core_capacity_value),
              label: `${item.core_capacity_value} Core${item.label ? ` — ${item.label}` : ""}`,
            })),
          ]}
        />
        <Field
          label={technicalCopy.usedCoreLabel || "Used Core"}
          type="number"
          value={props.form.used_core}
          onChange={(value) => props.onChange((prev) => ({ ...prev, used_core: value }))}
          disabled={!props.editing}
          compact
        />
        {showOtbCoreWarning ? (
          <p className="col-span-full text-xs text-amber-600 dark:text-amber-400">
            &#9888; Used core ({props.form.used_core}) melebihi kapasitas core ({props.form.capacity_core}).
          </p>
        ) : null}
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
        {showOtbPortWarning ? (
          <p className="col-span-full text-xs text-amber-600 dark:text-amber-400">
            &#9888; {technicalCopy.usedPortsLabel} ({props.form.used_ports}) melebihi {technicalCopy.totalPortsLabel} ({props.form.total_ports}).
          </p>
        ) : null}
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
  );

  const topologySection = (
    <div className="space-y-3">
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

  if (!props.editing) {
    return (
      <div className="space-y-3">
        <DefaultInfoSection {...props} />
        {technicalCard}
        {topologySection}
      </div>
    );
  }

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <div className="flex items-center gap-2 mb-4 overflow-x-auto">
        <TabsList>
          <TabsTrigger value="identitas" className="relative text-xs sm:text-sm">
            Identitas & Relasi
            {missingTabFields.identitas?.length > 0 ? (
              <Badge variant="destructive" className="ml-1.5 h-4 px-1 text-[9px]">
                {missingTabFields.identitas.length}
              </Badge>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="teknis" className="relative text-xs sm:text-sm">
            Teknis & Kapasitas
            {missingTabFields.teknis?.length > 0 ? (
              <Badge variant="destructive" className="ml-1.5 h-4 px-1 text-[9px]">
                {missingTabFields.teknis.length}
              </Badge>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="lokasi" className="relative text-xs sm:text-sm">
            Lokasi
            {missingTabFields.lokasi?.length > 0 ? (
              <Badge variant="destructive" className="ml-1.5 h-4 px-1 text-[9px]">
                {missingTabFields.lokasi.length}
              </Badge>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="tags" className="relative text-xs sm:text-sm">
            Tags
            {missingTabFields.tags?.length > 0 ? (
              <Badge variant="destructive" className="ml-1.5 h-4 px-1 text-[9px]">
                {missingTabFields.tags.length}
              </Badge>
            ) : null}
          </TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="identitas" className="mt-0 space-y-3">
        <DefaultIdentitySection {...props} />
        <DefaultRelationSection {...props} />
      </TabsContent>
      <TabsContent value="teknis" className="mt-0 space-y-3">
        {technicalCard}
        {topologySection}
      </TabsContent>
      <TabsContent value="lokasi" className="mt-0 space-y-3">
        <DefaultLocationSection {...props} />
      </TabsContent>
      <TabsContent value="tags" className="mt-0 space-y-3">
        <DefaultTagsSection form={props.form} onChange={props.onChange} editing={props.editing} />
      </TabsContent>
    </Tabs>
  );
}
