"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Network, ArrowRight } from "lucide-react";
import { useTranslate } from "@/lib/use-locale";
import {
  type DefaultInfoSectionProps,
  DefaultInfoSection,
  type SplitterProfileOption,
  getDeviceTechnicalCopy,
  Field,
  ComboboxField,
} from "../sections/index";
import {
  type TopologySectionProps,
  emptyTopologyLookup,
} from "../sections/device-topology-helpers";
import { JcTopologySection } from "./sections/index";

type DeviceCoreCapacityOption = { core_capacity_value: number; label: string; allowed_device_type_keys?: string[] | null };
type ClosureTypeOption = { id: string; closure_type_name: string; closure_type_code?: string | null; max_core_capacity?: number | null; max_splice_capacity?: number | null; supports_pass_through?: boolean | null; supports_branching?: boolean | null };

export type JcDeviceFormProps = DefaultInfoSectionProps & {
  splitterProfiles: SplitterProfileOption[];
  topologyLookup?: TopologySectionProps["topologyLookup"];
  deviceCoreCapacities?: DeviceCoreCapacityOption[];
  closureTypes?: ClosureTypeOption[];
};

export function JcDeviceForm(props: JcDeviceFormProps) {
  const { t } = useTranslate();
  const technicalCopy = getDeviceTechnicalCopy("JC", t);

  const lookup = props.topologyLookup || emptyTopologyLookup();
  const closureTypes = props.closureTypes || [];

  const selectedClosureType = closureTypes.find((c) => c.id === props.form.closure_type_id) || null;

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
            label={t("deviceForm.jc.type")}
            value={props.form.closure_type_id || "__none__"}
            onValueChange={(value) => {
              const nextId = value === "__none__" ? "" : value;
              const type = closureTypes.find((t) => t.id === nextId) || null;
              props.onChange((prev) => ({ 
                ...prev, 
                closure_type_id: nextId,
                capacity_core: (!prev.capacity_core || prev.capacity_core === "0") && type?.max_core_capacity ? String(type.max_core_capacity) : prev.capacity_core
              }));
            }}
            disabled={!props.editing}
            searchPlaceholder={t("deviceForm.jc.searchType")}
            options={[
              { value: "__none__", label: t("deviceForm.jc.selectType") },
              ...closureTypes.map((c) => ({
                value: c.id,
                label: [c.closure_type_name, c.closure_type_code].filter(Boolean).join(" — "),
              })),
            ]}
          />
          {selectedClosureType ? (
            <p className="col-span-full text-xs text-muted-foreground">
              {t("deviceForm.jc.capacity")}: <span className="font-medium text-foreground">{selectedClosureType.max_core_capacity ?? "—"} core</span>
              {" · "}{t("deviceForm.jc.splice")}: <span className="font-medium text-foreground">{selectedClosureType.max_splice_capacity ?? "—"}</span>
              {" · "}{t("deviceForm.jc.passThrough")}: <span className="font-medium text-foreground">{selectedClosureType.supports_pass_through ? t("deviceForm.yes") : t("deviceForm.no")}</span>
              {" · "}{t("deviceForm.jc.branching")}: <span className="font-medium text-foreground">{selectedClosureType.supports_branching ? t("deviceForm.yes") : t("deviceForm.no")}</span>
            </p>
          ) : null}
          <ComboboxField
            label={technicalCopy.coreCapacityLabel || "Capacity Core"}
            value={props.form.capacity_core || "__none__"}
            onValueChange={(value) => props.onChange((prev) => ({ ...prev, capacity_core: value === "__none__" ? "" : value }))}
            disabled={!props.editing}
            searchPlaceholder={t("createForm.searchCoreCapacity")}
            options={[
              { value: "__none__", label: t("createForm.selectCoreCapacity") },
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
              &#9888; {t("deviceForm.jc.coreExceeded", { used: props.form.used_core, cap: props.form.capacity_core })}
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
            {t("deviceForm.jc.splicingMatrix")}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3 pt-0">
          {!hasSplicing ? (
            <div className="text-xs text-muted-foreground italic text-center p-4 border border-dashed rounded-lg">
              {t("deviceForm.jc.splicingHint")}
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <div className="grid grid-cols-3 bg-muted/40 p-2 text-xs font-semibold text-muted-foreground border-b">
                <div>{fromCableName} ({t("deviceForm.jc.core")})</div>
                <div className="text-center">{t("deviceForm.jc.splicing")}</div>
                <div className="text-right">{toCableName} ({t("deviceForm.jc.core")})</div>
              </div>
              <div className="max-h-48 overflow-y-auto divide-y">
                {spliceRows.map((coreNum) => (
                  <div key={coreNum} className="grid grid-cols-3 p-2 text-xs items-center hover:bg-muted/10 transition">
                    <div className="font-medium flex items-center gap-1.5">
                      <span className="inline-block size-2 rounded-full bg-emerald-500" />
                      {t("deviceForm.jc.coreNumber", { core: String(coreNum) })}
                    </div>
                    <div className="flex justify-center text-muted-foreground">
                      <ArrowRight className="size-3 text-primary animate-pulse" />
                    </div>
                    <div className="text-right font-medium flex items-center gap-1.5 justify-end">
                      {t("deviceForm.jc.coreNumber", { core: String(coreNum) })}
                      <span className="inline-block size-2 rounded-full bg-blue-500" />
                    </div>
                  </div>
                ))}
              </div>
              <div className="bg-muted/20 p-2 text-[10px] text-muted-foreground border-t">
                {t("deviceForm.jc.totalSpliced", { count: String(spliceRows.length) })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
