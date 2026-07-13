"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Network, ArrowRight } from "lucide-react";
import {
  type DefaultInfoSectionProps,
  DefaultInfoSection,
  type SplitterProfileOption,
  DEVICE_TECHNICAL_COPY,
  Field,
  ComboboxField,
} from "../sections/index";
import {
  type TopologySectionProps,
  emptyTopologyLookup,
} from "../sections/device-topology-helpers";
import { JcTopologySection } from "./sections/index";

type DeviceCoreCapacityOption = { core_capacity_value: number; label: string; allowed_device_type_keys?: string[] | null };

export type JcDeviceFormProps = DefaultInfoSectionProps & {
  splitterProfiles: SplitterProfileOption[];
  topologyLookup?: TopologySectionProps["topologyLookup"];
  deviceCoreCapacities?: DeviceCoreCapacityOption[];
};

export function JcDeviceForm(props: JcDeviceFormProps) {
  const technicalCopy = DEVICE_TECHNICAL_COPY.JC || {
    title: "Informasi Joint Closure",
    coreCapacityLabel: "Capacity Core",
    usedCoreLabel: "Used Core",
  };

  const lookup = props.topologyLookup || emptyTopologyLookup();

  const filteredJcCoreCapacities = (props.deviceCoreCapacities || []).filter((item) => {
    const allowedKeys = item.allowed_device_type_keys || [];
    if (!allowedKeys.length) return true;
    return allowedKeys.includes("JC");
  });

  // Find cable names for Splicing Matrix
  const fromCable = lookup.devices?.find((d) => d.id === props.form.from_cable_id);
  const toCable = lookup.devices?.find((d) => d.id === props.form.to_cable_id);
  
  const fromCableName = fromCable ? (fromCable.device_name || fromCable.device_id) : "Cable A";
  const toCableName = toCable ? (toCable.device_name || toCable.device_id) : "Cable B";

  const coreStart = Number(props.form.core_start) || 0;
  const coreEnd = Number(props.form.core_end) || 0;
  const hasSplicing = props.form.from_cable_id && props.form.to_cable_id && coreStart > 0 && coreEnd >= coreStart;

  // Generate rows for Splicing Matrix
  const spliceRows = [];
  if (hasSplicing) {
    for (let i = coreStart; i <= coreEnd; i++) {
      spliceRows.push(i);
    }
  }

  // ── Validation warnings ──────────────────────────────────────────────
  const jcCapNum = Number(props.form.capacity_core);
  const jcUsedNum = Number(props.form.used_core);
  const showJcCoreWarning = Boolean(props.form.capacity_core) && Boolean(props.form.used_core) && Number.isFinite(jcCapNum) && Number.isFinite(jcUsedNum) && jcUsedNum > jcCapNum;

  return (
    <div className="space-y-3">
      <DefaultInfoSection {...props} />

      <Card className="bg-transparent">
        <CardHeader className="px-3 py-2">
          <CardTitle className="text-sm">{technicalCopy.title}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-2 px-3 pb-3 pt-0 md:grid-cols-2 xl:grid-cols-3">
          <ComboboxField
            label={technicalCopy.coreCapacityLabel || "Capacity Core"}
            value={props.form.capacity_core || "__none__"}
            onValueChange={(value) => props.onChange((prev) => ({ ...prev, capacity_core: value === "__none__" ? "" : value }))}
            disabled={!props.editing}
            searchPlaceholder="Cari kapasitas core..."
            options={[
              { value: "__none__", label: "Pilih kapasitas core" },
              ...filteredJcCoreCapacities.map((item) => ({
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
          {showJcCoreWarning ? (
            <p className="col-span-full text-xs text-amber-600 dark:text-amber-400">
              &#9888; Used core ({props.form.used_core}) melebihi kapasitas core ({props.form.capacity_core}).
            </p>
          ) : null}
        </CardContent>
      </Card>

      <JcTopologySection
        form={props.form}
        onChange={props.onChange}
        editing={props.editing}
        topologyLookup={props.topologyLookup || emptyTopologyLookup()}
      />

      {/* Splicing Matrix Section */}
      <Card className="bg-transparent">
        <CardHeader className="px-3 py-2">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <Network className="size-4 text-primary" />
            Splicing Matrix
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3 pt-0">
          {!hasSplicing ? (
            <div className="text-xs text-muted-foreground italic text-center p-4 border border-dashed rounded-lg">
              Tentukan segment kabel masuk (From Cable) dan kabel keluar (To Cable) serta rentang core pada Relasi Joint Closure untuk menampilkan matriks splicing.
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <div className="grid grid-cols-3 bg-muted/40 p-2 text-xs font-semibold text-muted-foreground border-b">
                <div>{fromCableName} (Core)</div>
                <div className="text-center">Sambungan (Splice)</div>
                <div className="text-right">{toCableName} (Core)</div>
              </div>
              <div className="max-h-48 overflow-y-auto divide-y">
                {spliceRows.map((coreNum) => (
                  <div key={coreNum} className="grid grid-cols-3 p-2 text-xs items-center hover:bg-muted/10 transition">
                    <div className="font-medium flex items-center gap-1.5">
                      <span className="inline-block size-2 rounded-full bg-emerald-500" />
                      Core {coreNum}
                    </div>
                    <div className="flex justify-center text-muted-foreground">
                      <ArrowRight className="size-3 text-primary animate-pulse" />
                    </div>
                    <div className="text-right font-medium flex items-center gap-1.5 justify-end">
                      Core {coreNum}
                      <span className="inline-block size-2 rounded-full bg-blue-500" />
                    </div>
                  </div>
                ))}
              </div>
              <div className="bg-muted/20 p-2 text-[10px] text-muted-foreground border-t">
                Total core tersambung: <span className="font-semibold text-foreground">{spliceRows.length} core</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
