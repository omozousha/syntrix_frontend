"use client";

import { Cable, Cpu, Network, RadioTower, Router, Server, SplitSquareVertical } from "lucide-react";

import { InfoField } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type DeviceTopologySummary = {
  ports?: {
    summary?: Record<string, unknown>;
    items?: unknown[];
  };
  connections?: {
    summary?: Record<string, unknown>;
    items?: unknown[];
  };
  core_management?: {
    summary?: {
      total?: number;
      core_count?: number;
      used_count?: number;
      reserved_count?: number;
    };
    items?: unknown[];
  };
  fiber_cores?: {
    summary?: {
      total?: number;
      loss_warnings?: number;
      damaged?: number;
    };
  };
  readiness?: {
    has_ports?: boolean;
    has_connections?: boolean;
    has_core_summary?: boolean;
    has_fiber_core_inventory?: boolean;
  };
};

type TopologyLabeledItem = {
  labels?: {
    title?: unknown;
    from?: unknown;
    to?: unknown;
    cable?: unknown;
    route?: unknown;
    core_range?: unknown;
  };
  route?: Record<string, unknown> | null;
  cable_device?: Record<string, unknown> | null;
  from_device?: Record<string, unknown> | null;
  to_device?: Record<string, unknown> | null;
};

type DeviceTechnicalSummarySectionProps = {
  item: Record<string, unknown>;
  topologySummary: DeviceTopologySummary | null;
  loading?: boolean;
};

const TYPE_CONFIG = {
  ODC: {
    title: "Technical ODC",
    description: "Ringkasan cabinet, port, splitter, dan relasi downstream/upstream.",
    icon: SplitSquareVertical,
  },
  OLT: {
    title: "Technical OLT",
    description: "Ringkasan POP/site, port PON/uplink, dan koneksi downstream.",
    icon: Server,
  },
  ONT: {
    title: "Technical ONT",
    description: "Ringkasan customer premise, serial, dan assignment service.",
    icon: RadioTower,
  },
  CABLE: {
    title: "Technical Cable",
    description: "Ringkasan kapasitas core, fiber inventory, dan koneksi route/core.",
    icon: Cable,
  },
  SWITCH: {
    title: "Technical Switch",
    description: "Ringkasan interface, management IP, dan uplink/downlink.",
    icon: Network,
  },
  ROUTER: {
    title: "Technical Router",
    description: "Ringkasan interface, management IP, dan koneksi jaringan.",
    icon: Router,
  },
  DEVICE: {
    title: "Technical Device",
    description: "Ringkasan teknikal device berdasarkan inventory dan topology.",
    icon: Cpu,
  },
};

export function DeviceTechnicalSummarySection({
  item,
  topologySummary,
  loading = false,
}: DeviceTechnicalSummarySectionProps) {
  const typeKey = valueOf(item.device_type_key, "DEVICE").toUpperCase();
  const config = TYPE_CONFIG[typeKey as keyof typeof TYPE_CONFIG] || TYPE_CONFIG.DEVICE;
  const Icon = config.icon;
  const metrics = buildTechnicalMetrics(typeKey, item, topologySummary);
  const readiness = topologySummary?.readiness || {};
  const readyCount = [
    readiness.has_ports,
    readiness.has_connections,
    readiness.has_core_summary,
    readiness.has_fiber_core_inventory,
  ].filter(Boolean).length;

  return (
    <Card>
      <CardHeader className="px-3 py-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 gap-2">
            <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Icon className="size-4" />
            </span>
            <div className="min-w-0">
              <CardTitle className="text-sm">{config.title}</CardTitle>
              <CardDescription className="text-xs">{config.description}</CardDescription>
            </div>
          </div>
          <Badge variant="outline">{readyCount}/4 topology ready</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 px-3 pb-3 pt-0">
        {loading ? (
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-20 rounded-md" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric) => (
              <InfoField key={metric.label} label={metric.label} value={metric.value} hint={metric.hint} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function buildTechnicalMetrics(typeKey: string, item: Record<string, unknown>, summary: DeviceTopologySummary | null) {
  const totalPorts = numeric(summary?.ports?.summary?.total, summary?.ports?.items?.length, item.total_ports);
  const usedPorts = numeric(item.used_ports);
  const idlePorts = Math.max(0, totalPorts - usedPorts);
  const connectionTotal = numeric(summary?.connections?.summary?.total, summary?.connections?.items?.length);
  const capacityCore = numeric(item.capacity_core, summary?.fiber_cores?.summary?.total);
  const usedCore = numeric(item.used_core, summary?.core_management?.summary?.used_count);
  const reservedCore = numeric(summary?.core_management?.summary?.reserved_count);
  const damagedCore = numeric(summary?.fiber_cores?.summary?.damaged);
  const lossWarnings = numeric(summary?.fiber_cores?.summary?.loss_warnings);
  const primaryConnection = firstTopologyItem(summary?.connections?.items);
  const primaryCore = firstTopologyItem(summary?.core_management?.items);
  const routeLabel = firstText(
    primaryConnection?.labels?.route,
    primaryCore?.labels?.route,
    primaryConnection?.route?.route_name,
    primaryConnection?.route?.route_code,
    primaryCore?.route?.route_name,
    primaryCore?.route?.route_code,
  );
  const cableLabel = firstText(
    primaryConnection?.labels?.cable,
    primaryCore?.labels?.cable,
    primaryConnection?.cable_device?.device_name,
    primaryConnection?.cable_device?.device_id,
    primaryCore?.cable_device?.device_name,
    primaryCore?.cable_device?.device_id,
  );
  const endpointLabel = formatEndpointLabel(primaryConnection || primaryCore);
  const coreRangeLabel = firstText(primaryConnection?.labels?.core_range, primaryCore?.labels?.core_range);

  if (typeKey === "CABLE") {
    return [
      { label: "Capacity Core", value: formatNumber(capacityCore), hint: "Total core dari inventory kabel." },
      {
        label: "Used / Reserved",
        value: `${formatNumber(usedCore)} / ${formatNumber(reservedCore)}`,
        hint: `${formatNumber(damagedCore)} damaged, ${formatNumber(lossWarnings)} loss warning.`,
      },
      { label: "Route", value: routeLabel || "-", hint: cableLabel ? `Cable: ${cableLabel}` : "Belum ada route terkait." },
      { label: "Core / Endpoint", value: coreRangeLabel || "-", hint: endpointLabel || "Belum ada endpoint connection terkait." },
    ];
  }

  if (typeKey === "ODC") {
    return [
      { label: "Port Cabinet", value: formatNumber(totalPorts), hint: `${formatNumber(idlePorts)} idle.` },
      { label: "Used Ports", value: formatNumber(usedPorts), hint: "Berdasarkan device_ports." },
      {
        label: "Core / Route",
        value: formatNumber(numeric(summary?.core_management?.summary?.core_count)),
        hint: routeLabel || "Feeder/distribution core approved.",
      },
      { label: "Connection", value: formatNumber(connectionTotal), hint: endpointLabel || "Upstream/downstream topology." },
    ];
  }

  if (typeKey === "ONT") {
    return [
      { label: "Serial Number", value: valueOf(item.serial_number, "-"), hint: "Identitas perangkat pelanggan." },
      { label: "Service Ports", value: formatNumber(totalPorts), hint: `${formatNumber(usedPorts)} used.` },
      { label: "Connection", value: formatNumber(connectionTotal), hint: "Relasi ODP/port upstream." },
      { label: "Installed", value: formatDate(valueOf(item.installation_date)), hint: "Tanggal instalasi jika tersedia." },
    ];
  }

  if (typeKey === "OLT" || typeKey === "SWITCH" || typeKey === "ROUTER") {
    return [
      { label: "Management IP", value: valueOf(item.management_ip, "-"), hint: "Alamat manajemen perangkat." },
      { label: "Interfaces", value: formatNumber(totalPorts), hint: `${formatNumber(usedPorts)} used, ${formatNumber(idlePorts)} idle.` },
      { label: "Connection", value: formatNumber(connectionTotal), hint: endpointLabel || "Uplink/downlink topology." },
      { label: "Status", value: valueOf(item.status, "-"), hint: "Status operasional inventory." },
    ];
  }

  return [
    { label: "Total Ports", value: formatNumber(totalPorts), hint: `${formatNumber(usedPorts)} used.` },
    { label: "Capacity Core", value: formatNumber(capacityCore), hint: "Core capacity jika device mendukung." },
    { label: "Connection", value: formatNumber(connectionTotal), hint: "Relasi topology approved." },
    { label: "Status", value: valueOf(item.status, "-"), hint: "Status operasional inventory." },
  ];
}

function firstTopologyItem(items?: unknown[]) {
  return Array.isArray(items) && items.length ? (items[0] as TopologyLabeledItem) : null;
}

function formatEndpointLabel(item: TopologyLabeledItem | null) {
  if (!item) return "";
  const from = firstText(item.labels?.from, item.from_device?.device_name, item.from_device?.device_id);
  const to = firstText(item.labels?.to, item.to_device?.device_name, item.to_device?.device_id);
  if (from && to) return `${from} -> ${to}`;
  return firstText(item.labels?.title, from, to);
}

function firstText(...values: unknown[]) {
  for (const value of values) {
    const text = valueOf(value, "");
    if (text) return text;
  }
  return "";
}

function numeric(...values: unknown[]) {
  for (const value of values) {
    const numberValue = Number(value);
    if (Number.isFinite(numberValue)) return numberValue;
  }
  return 0;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("id-ID").format(Number.isFinite(value) ? value : 0);
}

function formatDate(value: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(date);
}

function valueOf(value: unknown, fallback = "") {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
}
