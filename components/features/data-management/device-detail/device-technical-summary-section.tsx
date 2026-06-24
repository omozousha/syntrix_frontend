"use client";

import Link from "next/link";
import { Cable, Cpu, Network, RadioTower, Router, Server, SplitSquareVertical } from "lucide-react";

import { InfoField } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  odc_relations?: OdcRelations | null;
  core_overlap_conflicts?: Array<{
    cable_device_id?: string;
    first_connection_id?: string;
    second_connection_id?: string;
    first_range?: string;
    second_range?: string;
  }>;
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
    has_odc_upstream?: boolean;
    has_odc_downstream_odp?: boolean;
    has_odc_cable_context?: boolean;
    has_odc_core_mapping?: boolean;
    has_odc_splitter?: boolean;
  };
};

type OdcRelationItem = {
  id?: string;
  connection_id?: string | null;
  direction?: "upstream" | "downstream" | string;
  status?: string | null;
  connection_type?: string | null;
  odc_port?: Record<string, unknown> | null;
  peer_port?: Record<string, unknown> | null;
  peer_device?: Record<string, unknown> | null;
  cable_device?: Record<string, unknown> | null;
  route?: Record<string, unknown> | null;
  core_start?: number | null;
  core_end?: number | null;
  fiber_count?: number | null;
  labels?: {
    title?: unknown;
    peer?: unknown;
    odc_port?: unknown;
    peer_port?: unknown;
    cable?: unknown;
    route?: unknown;
    core_range?: unknown;
  } | null;
};

type OdcRelations = {
  summary?: {
    upstream?: Record<string, unknown>;
    downstream?: Record<string, unknown>;
    cable_usage?: Record<string, unknown>;
    has_upstream?: boolean;
    has_downstream?: boolean;
    has_trace_ready_relation?: boolean;
  };
  upstream?: OdcRelationItem[];
  downstream?: OdcRelationItem[];
  cable_usage?: OdcRelationItem[];
  splitter_ratio?: string | null;
  port_summary?: {
    total?: number;
    feeder?: number;
    distribution?: number;
    by_direction?: {
      in?: number;
      out?: number;
    };
    active?: number;
  };
  core_summary?: {
    total_mappings?: number;
    total_cores_used?: number;
    unique_cables?: number;
  };
  readiness?: {
    has_upstream_source?: boolean;
    has_downstream_odp?: boolean;
    has_cable_context?: boolean;
    has_core_mapping?: boolean;
    has_splitter_configured?: boolean;
    has_ports_defined?: boolean;
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
  const odcRelations = typeKey === "ODC" ? topologySummary?.odc_relations || null : null;
  const odcTopologyActions = typeKey === "ODC" ? buildOdcTopologyActionHrefs(item) : null;
  const coreOverlapConflicts = topologySummary?.core_overlap_conflicts || [];
  const totalReadinessItems = typeKey === "ODC" ? 5 : 4;
  const readyCount = [
    typeKey === "ODC" ? readiness.has_odc_upstream : readiness.has_ports,
    typeKey === "ODC" ? readiness.has_odc_downstream_odp : readiness.has_connections,
    typeKey === "ODC" ? readiness.has_odc_cable_context : readiness.has_core_summary,
    typeKey === "ODC" ? readiness.has_odc_core_mapping : readiness.has_fiber_core_inventory,
    typeKey === "ODC" ? readiness.has_odc_splitter : false,
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
          <Badge variant="outline">{readyCount}/{totalReadinessItems} topology ready</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 px-3 pb-3 pt-0">
        {odcTopologyActions ? (
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href={odcTopologyActions.feeder}>Create Feeder Relation</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href={odcTopologyActions.distribution}>Create ODP Relation</Link>
            </Button>
          </div>
        ) : null}
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
        {!loading && odcRelations ? <OdcRelationSummary relations={odcRelations} coreOverlapConflicts={coreOverlapConflicts} /> : null}
      </CardContent>
    </Card>
  );
}

function buildOdcTopologyActionHrefs(item: Record<string, unknown>) {
  const deviceId = valueOf(item.id, "");
  if (!deviceId) return null;

  const baseParams = new URLSearchParams();
  baseParams.set("tool", "connection");
  baseParams.set("region_id", valueOf(item.region_id, "all"));

  const feederParams = new URLSearchParams(baseParams);
  feederParams.set("relation_mode", "feeder");
  feederParams.set("to_device_id", deviceId);

  const distributionParams = new URLSearchParams(baseParams);
  distributionParams.set("relation_mode", "distribution");
  distributionParams.set("from_device_id", deviceId);
  distributionParams.set("start_device_id", deviceId);
  distributionParams.set("direction", "downstream");

  return {
    feeder: `/data-management/topology?${feederParams.toString()}`,
    distribution: `/data-management/topology?${distributionParams.toString()}`,
  };
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
    const odcRelations = summary?.odc_relations;      const upstreamTotal = numeric(odcRelations?.summary?.upstream?.total, odcRelations?.upstream?.length);
    const downstreamTotal = numeric(odcRelations?.summary?.downstream?.total, odcRelations?.downstream?.length);
    const primaryUpstream = firstOdcRelation(odcRelations?.upstream);
    const primaryDownstream = firstOdcRelation(odcRelations?.downstream);
    const splitterRatio = odcRelations?.splitter_ratio || null;
    return [
      { label: "Port Cabinet", value: formatNumber(totalPorts), hint: `${formatNumber(idlePorts)} idle.` },
      { label: "Feeder Upstream", value: formatNumber(upstreamTotal), hint: formatOdcRelationHint(primaryUpstream, "Belum ada upstream OTB/POP.") },
      {
        label: "Distribution Downstream",
        value: formatNumber(downstreamTotal),
        hint: formatOdcRelationHint(primaryDownstream, "Belum ada downstream ODP."),
      },
      {
        label: "Core / Route",
        value: formatNumber(numeric(summary?.core_management?.summary?.core_count)),
        hint: routeLabel || "Feeder/distribution core approved.",
      },
      {
        label: "Splitter Ratio",
        value: splitterRatio || "-",
        hint: splitterRatio ? "Splitter ODC terkonfigurasi." : "Splitter ratio belum dikonfigurasi.",
      },
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

function OdcRelationSummary({ relations, coreOverlapConflicts = [] }: { relations: OdcRelations; coreOverlapConflicts?: Array<{ cable_device_id?: string; first_range?: string; second_range?: string }> }) {
  const upstream = relations.upstream || [];
  const downstream = relations.downstream || [];
  const readiness = relations.readiness || {};
  const splitterRatio = relations.splitter_ratio || null;
  const portSummary = relations.port_summary || {};
  const coreSummary = relations.core_summary || {};
  const readinessItems = [
    { label: "Upstream", ready: Boolean(readiness.has_upstream_source) },
    { label: "Downstream ODP", ready: Boolean(readiness.has_downstream_odp) },
    { label: "Cable", ready: Boolean(readiness.has_cable_context) },
    { label: "Core", ready: Boolean(readiness.has_core_mapping) },
    { label: "Splitter", ready: Boolean(readiness.has_splitter_configured), hint: splitterRatio },
  ];

  return (
    <div className="space-y-2 rounded-md border bg-muted/20 p-3">
      {coreOverlapConflicts.length > 0 ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2">
          <div className="flex items-start gap-2">
            <span className="mt-0.5 shrink-0 text-sm text-red-500">⚠️</span>
            <div className="min-w-0 text-xs text-red-800">
              <p className="font-medium">Ditemukan {coreOverlapConflicts.length} core overlap conflict(s):</p>
              <ul className="mt-1 list-inside list-disc space-y-0.5">
                {coreOverlapConflicts.map((conflict, index) => (
                  <li key={index}>
                    Range {conflict.first_range || "?"} bertabrakan dengan {conflict.second_range || "?"}
                    {conflict.cable_device_id ? ` (cable: ${conflict.cable_device_id.slice(0, 8)}...)` : ""}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : null}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold">Topology ODC</p>
          <p className="text-xs text-muted-foreground">Relasi physical layer OTB/POP, ODC, kabel, core, dan ODP.</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {readinessItems.map((item) => (
            <Badge
              key={item.label}
              variant="outline"
              className={item.ready ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-600"}
            >
              {item.label}: {item.ready ? "ready" : "pending"}
              {item.label === "Splitter" && item.hint && item.hint !== "-" ? ` (${item.hint})` : null}
            </Badge>
          ))}
        </div>
      </div>

      {/* Port & Core Summary Cards */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="rounded-md border bg-background p-2.5">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Port Summary
          </p>
          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2">
            <div>
              <p className="text-[11px] text-muted-foreground">Total</p>
              <p className="text-base font-semibold">{portSummary.total ?? 0}</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">Active</p>
              <p className="text-base font-semibold text-emerald-600">{portSummary.active ?? 0}</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">Feeder (in)</p>
              <p className="text-base font-semibold text-blue-600">{portSummary.feeder ?? 0}</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">Distribution (out)</p>
              <p className="text-base font-semibold text-amber-600">{portSummary.distribution ?? 0}</p>
            </div>
          </div>
        </div>
        <div className="rounded-md border bg-background p-2.5">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Core Usage
          </p>
          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2">
            <div>
              <p className="text-[11px] text-muted-foreground">Mappings</p>
              <p className="text-base font-semibold">{coreSummary.total_mappings ?? 0}</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">Cores Used</p>
              <p className="text-base font-semibold">{coreSummary.total_cores_used ?? 0}</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">Unique Cables</p>
              <p className="text-base font-semibold">{coreSummary.unique_cables ?? 0}</p>
            </div>
          </div>
        </div>
      </div>

      {splitterRatio ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <span className="font-medium">Splitter:</span> {splitterRatio}
        </div>
      ) : (
        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          Splitter ratio belum dikonfigurasi.
        </div>
      )}

      <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
        <OdcRelationList title="Feeder Upstream" emptyText="Belum ada relasi feeder dari OTB/POP ke ODC." items={upstream} />
        <OdcRelationList title="Distribution Downstream" emptyText="Belum ada relasi distribusi dari ODC ke ODP." items={downstream} />
      </div>
    </div>
  );
}

function OdcRelationList({
  title,
  emptyText,
  items,
}: {
  title: string;
  emptyText: string;
  items: OdcRelationItem[];
}) {
  return (
    <div className="min-w-0 rounded-md border bg-background p-2">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold">{title}</p>
        <Badge variant="secondary">{items.length}</Badge>
      </div>
      {items.length ? (
        <div className="space-y-2">
          {items.slice(0, 3).map((item) => (
            <div key={item.id || item.connection_id || formatOdcRelationTitle(item)} className="min-w-0 rounded-md border bg-muted/10 px-2 py-2">
              <p className="truncate text-xs font-medium">{formatOdcRelationTitle(item)}</p>
              <p className="mt-1 truncate text-[11px] text-muted-foreground">{formatOdcRelationMeta(item)}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Badge variant="outline">{valueOf(item.status, "unknown")}</Badge>
                {firstText(item.labels?.core_range, buildCoreRange(item)) ? (
                  <Badge variant="outline">Core {firstText(item.labels?.core_range, buildCoreRange(item))}</Badge>
                ) : null}
              </div>
            </div>
          ))}
          {items.length > 3 ? <p className="text-[11px] text-muted-foreground">+{items.length - 3} relasi lainnya.</p> : null}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">{emptyText}</p>
      )}
    </div>
  );
}

function firstOdcRelation(items?: OdcRelationItem[]) {
  return Array.isArray(items) && items.length ? items[0] : null;
}

function formatOdcRelationTitle(item: OdcRelationItem | null) {
  if (!item) return "";
  return firstText(
    item.labels?.peer,
    item.peer_device?.device_name,
    item.peer_device?.device_id,
    item.labels?.title,
  ) || "Peer device belum tersedia";
}

function formatOdcRelationHint(item: OdcRelationItem | null, fallback: string) {
  if (!item) return fallback;
  const peer = formatOdcRelationTitle(item);
  const cable = firstText(item.labels?.cable, item.cable_device?.device_name, item.cable_device?.device_id);
  const core = firstText(item.labels?.core_range, buildCoreRange(item));
  return [peer, cable ? `Cable: ${cable}` : "", core ? `Core ${core}` : ""].filter(Boolean).join(" | ");
}

function formatOdcRelationMeta(item: OdcRelationItem) {
  const odcPort = firstText(item.labels?.odc_port, item.odc_port?.port_label, item.odc_port?.port_id);
  const peerPort = firstText(item.labels?.peer_port, item.peer_port?.port_label, item.peer_port?.port_id);
  const cable = firstText(item.labels?.cable, item.cable_device?.device_name, item.cable_device?.device_id);
  const route = firstText(item.labels?.route, item.route?.route_name, item.route?.route_code, item.route?.route_id);
  return [
    odcPort && peerPort ? `${odcPort} -> ${peerPort}` : odcPort || peerPort,
    cable ? `Cable: ${cable}` : "",
    route ? `Route: ${route}` : "",
  ].filter(Boolean).join(" | ") || "Detail port/cable belum tersedia.";
}

function buildCoreRange(item: OdcRelationItem | null) {
  if (!item || item.core_start == null || item.core_end == null) return "";
  return `${item.core_start}-${item.core_end}`;
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
