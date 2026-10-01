"use client";

import { useMemo } from "react";
import { Trash2 } from "lucide-react";

import { AppLoading } from "@/components/app-loading-new";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { useTranslate, type TFn } from "@/lib/use-locale";

type DevicePort = {
  id: string;
  port_id?: string | null;
  port_index: number;
  port_label?: string | null;
  status?: string | null;
  customer_id?: string | null;
  ont_device_id?: string | null;
  occupied_at?: string | null;
  notes?: string | null;
  splitter_profile_id?: string | null;
  splitter_role?: string | null;
};

type SplitterProfileOption = {
  id: string;
  ratio_label: string;
  output_port_count?: number | null;
  expected_loss_db?: number | null;
};

type OdpCustomerOption = {
  id: string;
  customer_id?: string | null;
  customer_name?: string | null;
  customer_number?: string | null;
};

type OdpOntOption = {
  id: string;
  device_id?: string | null;
  device_name?: string | null;
};

type OdpValidationPortSnapshot = {
  port_index?: number | null;
  status?: string | null;
  attenuation_db?: number | null;
  notes?: string | null;
};

const ODP_PORT_STATUS_OPTIONS = ["idle", "used", "reserved", "down", "maintenance"];

export function OdpPortSection({
  ports,
  customers,
  ontDevices,
  splitterProfiles = [],
  loadingPorts,
  loadingLookups,
  updatingPortId,
  editing,
  latestPortSnapshotByIndex,
  onUpdatePort,
  onArchivePort,
}: {
  ports: DevicePort[];
  customers: OdpCustomerOption[];
  ontDevices: OdpOntOption[];
  splitterProfiles?: SplitterProfileOption[];
  loadingPorts: boolean;
  loadingLookups: boolean;
  updatingPortId: string;
  editing: boolean;
  latestPortSnapshotByIndex: Map<number, OdpValidationPortSnapshot>;
  onUpdatePort: (port: DevicePort, changes: Partial<DevicePort>) => void;
  onArchivePort: (port: DevicePort) => void;
}) {
  const { t } = useTranslate();

  const splitterOptions = useMemo(() => [
    { value: "__none__", label: t("odpPortSection.noSplitter") },
    ...splitterProfiles.map((s) => ({
      value: s.id,
      label: s.output_port_count ? `${s.ratio_label} (${s.output_port_count} ${t("odpPortSection.portUnit")})` : s.ratio_label,
    })),
  ], [splitterProfiles, t]);

  const splitterRoleOptions = useMemo(() => [
    { value: "input", label: "Input" },
    { value: "output", label: "Output" },
    { value: "bidirectional", label: "Bidirectional" },
  ], []);

  const customerOptions = useMemo(() => [
    { value: "__none__", label: t("odpPortSection.noCustomer") },
    ...customers.map((customer) => ({
      value: customer.id,
      label: [customer.customer_name, customer.customer_number].filter(Boolean).join(" - ") || t("odpPortSection.customerUnavailable"),
    })),
  ], [customers, t]);

  const ontOptions = useMemo(() => [
    { value: "__none__", label: t("odpPortSection.noOnt") },
    ...ontDevices.map((device) => ({
      value: device.id,
      label: [device.device_name, device.device_id].filter(Boolean).join(" - ") || t("odpPortSection.ontUnavailable"),
    })),
  ], [ontDevices, t]);

  const customerMap = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers]);
  const ontMap = useMemo(() => new Map(ontDevices.map((d) => [d.id, d])), [ontDevices]);
  const splitterMap = useMemo(() => new Map(splitterProfiles.map((s) => [s.id, s])), [splitterProfiles]);

  return (
    <div className="space-y-2 rounded-md border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">{t("odpPortSection.title")}</p>
        <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
          <LegendDot className="bg-emerald-500" label={t("odpPortSection.legendUsed")} />
          <LegendDot className="bg-slate-300" label={t("odpPortSection.legendIdle")} />
          <LegendDot className="bg-amber-400" label={t("odpPortSection.legendReserved")} />
          <LegendDot className="bg-rose-500" label={t("odpPortSection.legendDown")} />
        </div>
      </div>
      <div className="rounded-md border border-blue-200 bg-blue-50/70 px-3 py-2 text-xs text-blue-950 dark:border-blue-900/60 dark:bg-blue-950/25 dark:text-blue-100">
        <div className="mb-1 flex flex-wrap items-center gap-2 font-medium">
          <Badge variant="outline" className="h-4 rounded px-1.5 text-[9px] uppercase tracking-normal">
            Auto-fill
          </Badge>
          {t("odpPortSection.relationTitle")}
        </div>
        <p className="text-blue-900/80 dark:text-blue-100/80">
          {t("odpPortSection.relationDescription")}
        </p>
      </div>

      {loadingPorts ? (
        <AppLoading label={t("odpPortSection.loading")} />
      ) : ports.length ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {ports.map((port) => {
            const portSnapshot = latestPortSnapshotByIndex.get(Number(port.port_index));
            const assignedCustomer = port.customer_id ? customerMap.get(port.customer_id) : undefined;
            const assignedOnt = port.ont_device_id ? ontMap.get(port.ont_device_id) : undefined;
            const assignedSplitter = port.splitter_profile_id ? splitterMap.get(port.splitter_profile_id) : undefined;
            return (
              <div key={port.id} className="rounded-md border bg-background p-3">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{port.port_label || `#${port.port_index}`}</p>
                    <p className="truncate text-xs text-muted-foreground">{describePortAssignmentState(port, t)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`h-3 w-3 shrink-0 rounded-full ${getOdpPortStatusClass(port.status)}`} />
                    {editing ? (
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="size-7 text-destructive hover:text-destructive"
                        disabled={updatingPortId === port.id}
                        onClick={() => onArchivePort(port)}
                        title={t("odpPortSection.archivePort")}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    ) : null}
                  </div>
                </div>
                <div className="mb-2 grid grid-cols-2 gap-2 text-xs">
                  <RelationInfo label={t("odpPortSection.currentStatus")} value={port.status || "idle"} />
                  <RelationInfo label="CID" value={assignedCustomer?.customer_number || "-"} />
                  <RelationInfo label={t("odpPortSection.customer")} value={assignedCustomer?.customer_name || "-"} />
                  <RelationInfo label={t("odpPortSection.ont")} value={assignedOnt?.device_name || assignedOnt?.device_id || "-"} />
                  <RelationInfo
                    label={t("odpPortSection.lastAttenuation")}
                    value={portSnapshot?.attenuation_db == null ? "-" : `${portSnapshot.attenuation_db} dB`}
                  />
                  <RelationInfo label={t("odpPortSection.validationStatus")} value={portSnapshot?.status || "-"} />
                  <RelationInfo
                    label={t("odpPortSection.splitter")}
                    value={assignedSplitter?.ratio_label ? `${assignedSplitter.ratio_label}${port.splitter_role ? ` (${port.splitter_role})` : ""}` : "-"}
                  />
                  <RelationInfo label={t("odpPortSection.notes")} value={portSnapshot?.notes || port.notes || "-"} />
                </div>
                {editing ? (
                  <div className="grid grid-cols-1 gap-2 pt-2 border-t border-border/40">
                    <Combobox
                      value={port.status || "idle"}
                      onValueChange={(status) => onUpdatePort(port, { status })}
                      disabled={updatingPortId === port.id}
                      triggerClassName="h-9"
                      options={ODP_PORT_STATUS_OPTIONS.map((status) => ({ value: status, label: status }))}
                    />
                    <Combobox
                      value={port.customer_id || "__none__"}
                      onValueChange={(value) => {
                        const customerId = value === "__none__" ? null : value;
                        const changes: Partial<DevicePort> = { customer_id: customerId };
                        if (customerId) changes.status = "used";
                        if (!customerId && !port.ont_device_id) changes.status = "idle";
                        onUpdatePort(port, changes);
                      }}
                      disabled={updatingPortId === port.id || loadingLookups}
                      triggerClassName="h-9"
                      searchPlaceholder={t("odpPortSection.searchCustomer")}
                      emptyText={t("odpPortSection.customerNotFound")}
                      options={customerOptions}
                    />
                    <Combobox
                      value={port.ont_device_id || "__none__"}
                      onValueChange={(value) => {
                        const ontDeviceId = value === "__none__" ? null : value;
                        const changes: Partial<DevicePort> = { ont_device_id: ontDeviceId };
                        if (ontDeviceId) changes.status = "used";
                        if (!ontDeviceId && !port.customer_id) changes.status = "idle";
                        onUpdatePort(port, changes);
                      }}
                      disabled={updatingPortId === port.id || loadingLookups}
                      triggerClassName="h-9"
                      searchPlaceholder={t("odpPortSection.searchOnt")}
                      emptyText={t("odpPortSection.ontNotFound")}
                      options={ontOptions}
                    />
                    <Input
                      key={`${port.id}-notes-${port.notes || ""}`}
                      defaultValue={port.notes || ""}
                      onBlur={(event) => {
                        if (event.target.value !== (port.notes || "")) {
                          onUpdatePort(port, { notes: event.target.value });
                        }
                      }}
                      disabled={updatingPortId === port.id}
                      placeholder={t("odpPortSection.notesPlaceholder")}
                      className="h-9"
                    />
                    <Combobox
                      value={port.splitter_profile_id || "__none__"}
                      onValueChange={(value) => onUpdatePort(port, { splitter_profile_id: value === "__none__" ? null : value })}
                      disabled={updatingPortId === port.id}
                      triggerClassName="h-9"
                      placeholder={t("odpPortSection.splitterProfilePlaceholder")}
                      options={splitterOptions}
                    />
                    {port.splitter_profile_id ? (
                      <Combobox
                        value={port.splitter_role || "__none__"}
                        onValueChange={(value) => onUpdatePort(port, { splitter_role: value === "__none__" ? null : value })}
                        disabled={updatingPortId === port.id}
                        triggerClassName="h-9"
                        placeholder={t("odpPortSection.splitterRolePlaceholder")}
                        options={[{ value: "__none__", label: t("odpPortSection.selectRole") }, ...splitterRoleOptions]}
                      />
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          {t("odpPortSection.empty")}
        </div>
      )}
    </div>
  );
}

function RelationInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-muted/20 p-2">
      <p className="text-[10px] font-medium uppercase text-muted-foreground">{label}</p>
      <p className="mt-0.5 truncate font-medium">{value}</p>
    </div>
  );
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`size-2 rounded-full ${className}`} />
      {label}
    </span>
  );
}

function getOdpPortStatusClass(status?: string | null) {
  if (status === "used") return "bg-emerald-500";
  if (status === "reserved") return "bg-amber-400";
  if (status === "down" || status === "maintenance") return "bg-rose-500";
  return "bg-slate-300";
}

function describePortAssignmentState(port: DevicePort, t: TFn) {
  if (port.customer_id || port.ont_device_id) return t("odpPortSection.endpointConnected");
  return t("odpPortSection.notConnected");
}
