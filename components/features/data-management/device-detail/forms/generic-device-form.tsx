type RackDevice = {
  id: string;
  device_name: string;
  device_id?: string | null;
  device_type_key?: string | null;
  specifications?: Record<string, unknown>;
};

import { useEffect, useState } from "react";
import { Server } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSession } from "@/components/session-context";
import { apiFetch, type PaginatedResponse } from "@/lib/api";

import {
  type DefaultInfoSectionProps,
  DefaultInfoSection,
  type SplitterProfileOption,
  DEVICE_TECHNICAL_COPY,
  valueOf,
  Field,
  SplitterRatioField,
  ComboboxField,
  DisplayField,
  SelectField,
} from "../sections/index";
import {
  type TopologySectionProps,
  emptyTopologyLookup,
} from "../sections/device-topology-helpers";
import {
  OltTopologySection,
  OntTopologySection,
  GenericTopologySection,
  JcTopologySection,
} from "./sections/index";

export type GenericDeviceFormProps = DefaultInfoSectionProps & {
  splitterProfiles: SplitterProfileOption[];
  topologyLookup?: TopologySectionProps["topologyLookup"];
};

const NO_MGMT_IP_TYPES = new Set(["ODC", "ODP", "OTB", "CABLE", "JC", "HH", "MH"]);

export function GenericDeviceForm(props: GenericDeviceFormProps) {
  const deviceTypeKey = valueOf(props.form.device_type_key, "DEVICE").toUpperCase();
  const technicalCopy = DEVICE_TECHNICAL_COPY[deviceTypeKey] || {
    title: `Technical ${deviceTypeKey}`,
    totalPortsLabel: "Total Ports",
    usedPortsLabel: "Used Ports",
    splitterLabel: "Splitter Ratio",
  };
  const showManagementIp = !NO_MGMT_IP_TYPES.has(deviceTypeKey);
  const isRack = deviceTypeKey === "RACK";

  const [popRacks, setPopRacks] = useState<RackDevice[]>([]);
  const [loadingRacks, setLoadingRacks] = useState(false);
  const { token } = useSession();

  useEffect(() => {
    if (!token || !props.form.pop_id) {
      setPopRacks([]);
      return;
    }

    let cancelled = false;
    async function loadRacks() {
      setLoadingRacks(true);
      try {
        const result = await apiFetch<PaginatedResponse<RackDevice>>(`/devices?page=1&limit=100&pop_id=${props.form.pop_id}&device_type_key=RACK`, { token });
        if (!cancelled) {
          setPopRacks(result.data || []);
        }
      } catch {
        if (!cancelled) setPopRacks([]);
      } finally {
        if (!cancelled) setLoadingRacks(false);
      }
    }

    void loadRacks();
    return () => {
      cancelled = true;
    };
  }, [props.form.pop_id, token]);

  return (
    <div className="space-y-3">
      <DefaultInfoSection {...props} />

      <Card className="bg-transparent">
        <CardHeader className="px-3 py-2">
          <CardTitle className="text-sm">{technicalCopy.title}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-2 px-3 pb-3 pt-0 md:grid-cols-2 xl:grid-cols-3">
          {showManagementIp ? (
            <Field
              label="Management IP"
              value={props.form.management_ip}
              onChange={(value) => props.onChange((prev) => ({ ...prev, management_ip: value }))}
              disabled={!props.editing}
              compact
            />
          ) : null}
          <Field
            label={technicalCopy.coreCapacityLabel || "Capacity Core"}
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
            deviceTypeKey={deviceTypeKey}
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

      {props.form.pop_id && !isRack ? (
        <Card className="bg-transparent">
          <CardHeader className="px-3 py-2">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <Server className="size-4 text-muted-foreground" />
              Penempatan Rack (Rack Mounting)
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-2 px-3 pb-3 pt-0 md:grid-cols-2 xl:grid-cols-3">
            {props.editing ? (
              <ComboboxField
                label="Pilih Rack"
                value={props.form.rack_device_id || "__none__"}
                onValueChange={(value) =>
                  props.onChange((prev) => ({
                    ...prev,
                    rack_device_id: value === "__none__" ? "" : value,
                  }))
                }
                options={[
                  { value: "__none__", label: "Tidak terpasang di Rack" },
                  ...popRacks.map((rack) => ({
                    value: rack.id,
                    label: rack.device_name,
                  })),
                ]}
              />
            ) : (
              <DisplayField
                label="Rack"
                value={
                  popRacks.find((r) => r.id === props.form.rack_device_id)?.device_name ||
                  props.form.rack_device_id ||
                  "Tidak terpasang di Rack"
                }
                loading={loadingRacks}
                compact
              />
            )}

            <Field
              label="Posisi Mulai U"
              type="number"
              value={props.form.rack_unit_position}
              onChange={(value) => props.onChange((prev) => ({ ...prev, rack_unit_position: value }))}
              disabled={!props.editing || !props.form.rack_device_id}
              compact
            />

            <SelectField
              label="Tinggi Perangkat (U)"
              value={props.form.u_height || "1"}
              options={["1", "2", "3", "4", "6"]}
              onValueChange={(value) => props.onChange((prev) => ({ ...prev, u_height: value }))}
              disabled={!props.editing || !props.form.rack_device_id}
              compact
            />
          </CardContent>
        </Card>
      ) : null}

      {deviceTypeKey === "OLT" ? (
        <OltTopologySection
          form={props.form}
          onChange={props.onChange}
          editing={props.editing}
          topologyLookup={props.topologyLookup || emptyTopologyLookup()}
        />
      ) : null}

      {deviceTypeKey === "ONT" ? (
        <OntTopologySection
          form={props.form}
          onChange={props.onChange}
          editing={props.editing}
          topologyLookup={props.topologyLookup || emptyTopologyLookup()}
        />
      ) : null}

      {deviceTypeKey === "JC" ? (
        <JcTopologySection
          form={props.form}
          onChange={props.onChange}
          editing={props.editing}
          topologyLookup={props.topologyLookup || emptyTopologyLookup()}
        />
      ) : null}

      {deviceTypeKey === "SWITCH" || deviceTypeKey === "ROUTER" || deviceTypeKey === "HH" || deviceTypeKey === "MH" ? (
        <GenericTopologySection
          form={props.form}
          onChange={props.onChange}
          editing={props.editing}
          topologyLookup={props.topologyLookup || emptyTopologyLookup()}
        />
      ) : null}
    </div>
  );
}
