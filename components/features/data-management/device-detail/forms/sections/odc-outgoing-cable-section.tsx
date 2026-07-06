import { Cable, SplitSquareVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// ── Types ────────────────────────────────────────────────────────────────

type OutgoingCableItem = {
  id?: string;
  connection_id?: string | null;
  status?: string | null;
  connection_type?: string | null;
  peer_device?: Record<string, unknown> | null;
  peer_port?: Record<string, unknown> | null;
  odc_port?: Record<string, unknown> | null;
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

type CableGroup = {
  cableId: string;
  cableName: string;
  connections: OutgoingCableItem[];
  coreMin: number | null;
  coreMax: number | null;
};

// ── Props ─────────────────────────────────────────────────────────────────

export type OdcOutgoingCableSectionProps = {
  downstream?: OutgoingCableItem[] | null;
  portSummary?: {
    distribution?: number;
    active?: number;
    total?: number;
  } | null;
  coreSummary?: {
    total_mappings?: number;
    total_cores_used?: number;
    unique_cables?: number;
  } | null;
  loading?: boolean;
};

// ── Helpers ───────────────────────────────────────────────────────────────

function groupByCable(items: OutgoingCableItem[]): CableGroup[] {
  const groups = new Map<string, OutgoingCableItem[]>();

  for (const item of items) {
    const cable = item.cable_device;
    const cableId = cable?.id ? String(cable.id) : "__no_cable__";
    if (!groups.has(cableId)) groups.set(cableId, []);
    groups.get(cableId)!.push(item);
  }

  return Array.from(groups.entries()).map(([cableId, connections]) => {
    const first = connections[0];
    const cable = first?.cable_device;
    const cableName = cable?.device_name
      ? String(cable.device_name)
      : cableId === "__no_cable__"
        ? "Tanpa Kabel"
        : `Cable ${cableId.slice(0, 8)}...`;

    const cores = connections
      .map((c) => c.core_start ?? c.core_end)
      .filter((c): c is number => c !== null);
    const coreMin = cores.length ? Math.min(...cores) : null;
    const coreMax = cores.length ? Math.max(...cores) : null;

    return { cableId, cableName, connections, coreMin, coreMax };
  });
}

function formatCoreRange(item: OutgoingCableItem): string {
  if (item.core_start != null && item.core_end != null) {
    return `${item.core_start}-${item.core_end}`;
  }
  if (item.core_start != null) return String(item.core_start);
  if (item.core_end != null) return String(item.core_end);
  return "-";
}

function peerName(item: OutgoingCableItem): string {
  const peer = item.peer_device;
  if (!peer) return "ODP tidak dikenal";
  return String(peer.device_name || peer.device_id || peer.id || "ODP");
}

function peerPortLabel(item: OutgoingCableItem): string {
  const port = item.peer_port;
  if (!port) return "-";
  return String(port.port_label || port.port_id || `Port ${port.port_index || "?"}`);
}

function odcPortLabel(item: OutgoingCableItem): string {
  const port = item.odc_port;
  if (!port) return "-";
  return String(port.port_label || port.port_id || `Port ${port.port_index || "?"}`);
}

function statusBadge(status: string | null | undefined) {
  const s = String(status || "").toLowerCase();
  if (s === "approved" || s === "active") {
    return <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 text-[10px]">Active</Badge>;
  }
  if (s === "draft" || s === "pending") {
    return <Badge className="border-amber-200 bg-amber-50 text-amber-700 text-[10px]">Draft</Badge>;
  }
  return <Badge className="border-slate-200 bg-slate-50 text-slate-600 text-[10px]">{s || "Unknown"}</Badge>;
}

function valueOf(value: unknown, fallback = "") {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
}

// ── Component ─────────────────────────────────────────────────────────────

export function OdcOutgoingCableSection({
  downstream,
  portSummary,
  coreSummary,
  loading = false,
}: OdcOutgoingCableSectionProps) {
  const items = downstream || [];
  const cableGroups = groupByCable(items);
  const totalOdp = items.length;

  return (
    <Card className="bg-transparent">
      <CardHeader className="px-3 py-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Outgoing Cable (Downstream)</CardTitle>
          <Badge variant="outline" className="text-xs">
            {totalOdp} ODP terhubung
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 px-3 pb-3 pt-0">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-md border bg-muted/20 p-2">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Distribution Ports
            </p>
            <p className="mt-1 text-lg font-semibold text-amber-600">
              {portSummary?.distribution ?? 0}
            </p>
          </div>
          <div className="rounded-md border bg-muted/20 p-2">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Port Active
            </p>
            <p className="mt-1 text-lg font-semibold text-emerald-600">
              {portSummary?.active ?? 0}
            </p>
          </div>
          <div className="rounded-md border bg-muted/20 p-2">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Distribution Cables
            </p>
            <p className="mt-1 text-lg font-semibold">
              {coreSummary?.unique_cables ?? cableGroups.length}
            </p>
          </div>
          <div className="rounded-md border bg-muted/20 p-2">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Cores Used
            </p>
            <p className="mt-1 text-lg font-semibold">
              {coreSummary?.total_cores_used ?? items.reduce((sum, i) => sum + (i.core_start != null && i.core_end != null ? i.core_end - i.core_start + 1 : 0), 0)}
            </p>
          </div>
        </div>

        {/* Cable Groups */}
        {loading ? (
          <div className="flex items-center justify-center rounded-md border bg-muted/10 p-6">
            <p className="text-sm text-muted-foreground">Memuat data kabel distribusi...</p>
          </div>
        ) : cableGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-md border bg-muted/10 p-6">
            <Cable className="mb-2 size-8 text-muted-foreground/40" />
            <p className="text-sm font-medium text-muted-foreground">Belum ada outgoing cable</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Buat relasi distribusi ODC ke ODP melalui Topology Workspace untuk menambahkan kabel.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {cableGroups.map((group) => (
              <div key={group.cableId} className="rounded-md border bg-background">
                {/* Cable Header */}
                <div className="flex items-center justify-between border-b bg-muted/10 px-3 py-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Cable className="size-4 shrink-0 text-blue-600" />
                    <span className="truncate text-xs font-semibold">{group.cableName}</span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">
                      {group.connections.length} ODP
                    </Badge>
                    {group.coreMin != null && group.coreMax != null ? (
                      <Badge className="border-purple-200 bg-purple-50 text-purple-700 text-[10px]">
                        Core {group.coreMin}-{group.coreMax}
                      </Badge>
                    ) : null}
                  </div>
                </div>

                {/* Connection List */}
                <div className="divide-y">
                  {group.connections.map((conn) => (
                    <div
                      key={conn.id || conn.connection_id || `${conn.peer_device?.id}-${conn.core_start}`}
                      className="flex flex-col gap-1 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <SplitSquareVertical className="size-3.5 shrink-0 text-amber-500" />
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium">{peerName(conn)}</p>
                          <p className="truncate text-[10px] text-muted-foreground">
                            Port ODP: {peerPortLabel(conn)}
                            {odcPortLabel(conn) !== "-" ? ` | Port ODC: ${odcPortLabel(conn)}` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="text-[10px] font-medium text-purple-700">
                          Core {formatCoreRange(conn)}
                        </span>
                        {statusBadge(conn.status)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
