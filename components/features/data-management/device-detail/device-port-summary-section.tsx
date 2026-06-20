"use client";

import { useMemo, useState } from "react";
import { Cable, Network } from "lucide-react";

import { AppLoading } from "@/components/app-loading-new";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

type DevicePort = {
  id: string;
  port_index: number;
  port_label?: string | null;
  port_type?: string | null;
  direction?: string | null;
  status?: string | null;
  core_capacity?: number | null;
  core_used?: number | null;
  customer_id?: string | null;
  customer_name?: string | null;
  customer_number?: string | null;
  ont_device_id?: string | null;
  notes?: string | null;
  updated_at?: string | null;
};

type DevicePortConnection = {
  id: string;
  connection_id?: string | null;
  from_port_id?: string | null;
  to_port_id?: string | null;
  connection_type?: string | null;
  status?: string | null;
  route_id?: string | null;
  cable_device_id?: string | null;
  core_start?: number | null;
  core_end?: number | null;
  fiber_count?: number | null;
  installed_at?: string | null;
  notes?: string | null;
};

type DevicePortSummarySectionProps = {
  deviceTypeLabel: string;
  ports: DevicePort[];
  connections: DevicePortConnection[];
  coreSummary?: {
    total?: number;
    by_status?: Record<string, number>;
    core_count?: number;
    used_count?: number;
    reserved_count?: number;
  } | null;
  fiberSummary?: {
    total?: number;
    by_status?: Record<string, number>;
    loss_warnings?: number;
    damaged?: number;
  } | null;
  readiness?: {
    has_ports?: boolean;
    has_connections?: boolean;
    has_core_summary?: boolean;
    has_fiber_core_inventory?: boolean;
  } | null;
  loading: boolean;
};

export function DevicePortSummarySection({
  deviceTypeLabel,
  ports,
  connections,
  coreSummary,
  fiberSummary,
  readiness,
  loading,
}: DevicePortSummarySectionProps) {
  const [selectedPort, setSelectedPort] = useState<DevicePort | null>(null);
  const statusCounts = useMemo(
    () => ports.reduce<Record<string, number>>((acc, port) => {
      const status = String(port.status || "idle").toLowerCase();
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {}),
    [ports],
  );
  const totalPorts = ports.length;
  const connectedPorts = ports.filter((port) => port.customer_id || port.ont_device_id || String(port.status || "").toLowerCase() === "used").length;
  const selectedPortConnections = selectedPort
    ? connections.filter((connection) => connection.from_port_id === selectedPort.id || connection.to_port_id === selectedPort.id)
    : [];

  return (
    <Card>
      <CardHeader className="px-3 py-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Network className="size-4 text-muted-foreground" />
              Port Inventory
            </CardTitle>
            <CardDescription className="text-xs">
              Ringkasan port {deviceTypeLabel || "device"} untuk kebutuhan topology dan assignment.
            </CardDescription>
          </div>
          <Badge variant={totalPorts ? "secondary" : "outline"}>{totalPorts} port</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 px-3 pb-3 pt-0">
        {loading ? (
          <AppLoading label="Memuat port device..." />
        ) : totalPorts ? (
          <>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              <PortMetric label="Total" value={totalPorts} />
              <PortMetric label="Connected" value={connectedPorts} tone="used" />
              <PortMetric label="Idle" value={statusCounts.idle || 0} tone="idle" />
              <PortMetric label="Reserved" value={statusCounts.reserved || 0} tone="reserved" />
            </div>
            <TopologyReadinessStrip
              connections={connections.length}
              coreSummary={coreSummary}
              fiberSummary={fiberSummary}
              readiness={readiness}
            />
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
              {ports.slice(0, 12).map((port) => (
                <Button
                  key={port.id}
                  type="button"
                  variant="outline"
                  className="h-auto w-full flex-col items-stretch justify-start rounded-md bg-background p-2 text-left whitespace-normal transition hover:border-primary/50 hover:bg-muted/30"
                  onClick={() => setSelectedPort(port)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium">{port.port_label || `Port ${port.port_index}`}</p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {[port.port_type, port.direction].filter(Boolean).join(" | ") || "Port inventory"}
                      </p>
                    </div>
                    <Badge variant="outline" className="shrink-0 text-[10px]">
                      {port.status || "idle"}
                    </Badge>
                  </div>
                  <p className="mt-1 truncate text-[11px] text-muted-foreground">
                    {portAssignmentLabel(port)}
                  </p>
                </Button>
              ))}
            </div>
            {ports.length > 12 ? (
              <p className="text-xs text-muted-foreground">Menampilkan 12 dari {ports.length} port. Detail lengkap akan masuk ke Topology Management.</p>
            ) : null}
          </>
        ) : (
          <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
            Belum ada port untuk device ini. Port template dan provisioning akan menjadi dasar Topology Management.
          </div>
        )}
      </CardContent>
      <Sheet open={Boolean(selectedPort)} onOpenChange={(open) => !open && setSelectedPort(null)}>
        <SheetContent side="bottom" className="max-h-[88vh] overflow-y-auto rounded-t-xl sm:mx-auto sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>{selectedPort?.port_label || `Port ${selectedPort?.port_index ?? "-"}`}</SheetTitle>
            <SheetDescription>Detail port inventory dan assignment topology.</SheetDescription>
          </SheetHeader>
          {selectedPort ? (
            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <PortDetail label="Status" value={selectedPort.status || "idle"} />
                <PortDetail label="Type" value={selectedPort.port_type || "-"} />
                <PortDetail label="Direction" value={selectedPort.direction || "-"} />
                <PortDetail label="Core" value={`${selectedPort.core_used ?? 0}/${selectedPort.core_capacity ?? "-"}`} />
                <PortDetail label="Customer" value={customerLabel(selectedPort)} />
                <PortDetail label="ONT" value={selectedPort.ont_device_id ? "Assigned" : "-"} />
              </div>
              <div className="rounded-md border bg-muted/20 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] font-medium uppercase text-muted-foreground">Connection</p>
                  <Badge variant={selectedPortConnections.length ? "secondary" : "outline"}>{selectedPortConnections.length}</Badge>
                </div>
                {selectedPortConnections.length ? (
                  <div className="mt-2 space-y-2">
                    {selectedPortConnections.map((connection) => (
                      <div key={connection.id} className="rounded-md border bg-background p-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline">{connection.status || "draft"}</Badge>
                          <p className="text-xs font-medium">{connection.connection_id || connection.id}</p>
                        </div>
                        <div className="mt-1 grid grid-cols-1 gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                          <span>Type: {connection.connection_type || "-"}</span>
                          <span>Role: {connection.from_port_id === selectedPort.id ? "From port" : "To port"}</span>
                          <span>Core: {formatCoreRange(connection)}</span>
                          <span>Fiber: {connection.fiber_count ?? "-"}</span>
                        </div>
                        {connection.notes ? <p className="mt-1 text-xs text-muted-foreground">{connection.notes}</p> : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-1 text-sm text-muted-foreground">Belum ada port connection untuk port ini.</p>
                )}
              </div>
              <div className="rounded-md border bg-muted/20 p-3">
                <p className="text-[10px] font-medium uppercase text-muted-foreground">Notes</p>
                <p className="mt-1 text-sm">{selectedPort.notes || "-"}</p>
              </div>
              <div className="flex justify-end">
                <Button type="button" variant="outline" size="sm" onClick={() => setSelectedPort(null)}>
                  Tutup
                </Button>
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </Card>
  );
}

function TopologyReadinessStrip({
  connections,
  coreSummary,
  fiberSummary,
  readiness,
}: {
  connections: number;
  coreSummary?: DevicePortSummarySectionProps["coreSummary"];
  fiberSummary?: DevicePortSummarySectionProps["fiberSummary"];
  readiness?: DevicePortSummarySectionProps["readiness"];
}) {
  return (
    <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
      <div className="rounded-md border bg-muted/20 p-2">
        <div className="flex items-center gap-2">
          <Network className="size-3.5 text-muted-foreground" />
          <p className="text-[10px] font-medium uppercase text-muted-foreground">Connection</p>
        </div>
        <p className="mt-1 text-sm font-semibold">{connections}</p>
        <p className="text-[11px] text-muted-foreground">
          {readiness?.has_connections ? "Topology edge tersedia" : "Belum ada edge"}
        </p>
      </div>
      <div className="rounded-md border bg-muted/20 p-2">
        <div className="flex items-center gap-2">
          <Cable className="size-3.5 text-muted-foreground" />
          <p className="text-[10px] font-medium uppercase text-muted-foreground">Core Summary</p>
        </div>
        <p className="mt-1 text-sm font-semibold">{coreSummary?.core_count ?? 0}</p>
        <p className="text-[11px] text-muted-foreground">
          Used {coreSummary?.used_count ?? 0} / Reserved {coreSummary?.reserved_count ?? 0}
        </p>
      </div>
      <div className="rounded-md border bg-muted/20 p-2">
        <div className="flex items-center gap-2">
          <Cable className="size-3.5 text-muted-foreground" />
          <p className="text-[10px] font-medium uppercase text-muted-foreground">Fiber Core</p>
        </div>
        <p className="mt-1 text-sm font-semibold">{fiberSummary?.total ?? 0}</p>
        <p className="text-[11px] text-muted-foreground">
          Warning {fiberSummary?.loss_warnings ?? 0} / Damaged {fiberSummary?.damaged ?? 0}
        </p>
      </div>
    </div>
  );
}

function formatCoreRange(connection: DevicePortConnection) {
  if (connection.core_start == null && connection.core_end == null) return "-";
  if (connection.core_start === connection.core_end || connection.core_end == null) return String(connection.core_start ?? "-");
  return `${connection.core_start}-${connection.core_end}`;
}

function customerLabel(port: DevicePort) {
  const { customer_id: assignedCustomerId } = port;
  return port.customer_name || port.customer_number || (assignedCustomerId ? "Assigned" : "-");
}

function portAssignmentLabel(port: DevicePort) {
  const { ont_device_id: assignedOntDeviceId } = port;
  const customer = customerLabel(port);
  if (customer !== "-") return customer;
  return assignedOntDeviceId ? "ONT assigned" : "Belum ada assignment";
}

function PortMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "used" | "idle" | "reserved";
}) {
  const toneClass =
    tone === "used"
      ? "text-emerald-700"
      : tone === "reserved"
        ? "text-amber-700"
        : tone === "idle"
          ? "text-slate-700"
          : "text-foreground";

  return (
    <div className="rounded-md border bg-background p-2">
      <p className="text-[10px] font-medium uppercase text-muted-foreground">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}

function PortDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-background p-3">
      <p className="text-[10px] font-medium uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 break-words text-sm font-medium">{value}</p>
    </div>
  );
}
