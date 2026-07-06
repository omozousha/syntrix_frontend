"use client";

import { CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import { AppLoading } from "@/components/app-loading-new";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// ── Types ─────────────────────────────────────────────────────────────────

type OdcChainChecks = {
  has_ports: boolean;
  has_upstream_otb: boolean;
  has_splitter: boolean;
  has_feeder_cable: boolean;
  has_downstream_odp: boolean;
  has_core_mapping: boolean;
};

type OdcChainSummaryData = {
  is_odc: boolean;
  is_complete: boolean;
  checks: OdcChainChecks;
  missing_checks?: string[];
  suggestions?: Array<{
    key: string;
    title: string;
    description: string;
    severity: "high" | "medium" | "low";
  }>;
  summary?: {
    port_count?: number;
    upstream_otb_count?: number;
    downstream_odp_count?: number;
    total_connection_count?: number;
    fiber_core_total?: number;
    fiber_core_used?: number;
  };
  upstream_devices?: Array<{
    id: string;
    device_id?: string | null;
    device_name?: string | null;
    device_type_key?: string | null;
  }>;
  downstream_odp_devices?: Array<{
    id: string;
    device_id?: string | null;
    device_name?: string | null;
    total_ports?: number | null;
    used_ports?: number | null;
  }>;
  upstream_connections?: Array<{
    connection_id?: string | null;
    status?: string | null;
    cable_device_id?: string | null;
    core_start?: number | null;
    core_end?: number | null;
    fiber_count?: number | null;
    peer_device?: {
      device_name?: string | null;
      device_type_key?: string | null;
    } | null;
  }>;
};

// ── ODC Chain Summary Section ─────────────────────────────────────────────

export function OdcCoreChainSummarySection({
  chainSummary,
  loading,
  onRefresh,
}: {
  chainSummary: OdcChainSummaryData | null;
  loading: boolean;
  onRefresh?: () => void;
}) {
  if (!chainSummary && !loading) return null;

  return (
    <Card className="bg-transparent">
      <CardHeader className="px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm">ODC Core Chain Status</CardTitle>
          <div className="flex items-center gap-2">
            {chainSummary && (
              <Badge variant={chainSummary.is_complete ? "secondary" : "outline"}>
                {chainSummary.is_complete ? "Complete" : "Incomplete"}
              </Badge>
            )}
            {onRefresh && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={onRefresh}
                disabled={loading}
              >
                <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-3 pb-3 pt-0">
        {loading ? (
          <AppLoading label="Memuat status chain ODC..." />
        ) : chainSummary ? (
          <div className="space-y-3">
            {/* 6 Check Status */}
            <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
              <ChainCheckBadge label="Port Inventory" ok={chainSummary.checks.has_ports} />
              <ChainCheckBadge label="Upstream OTB" ok={chainSummary.checks.has_upstream_otb} />
              <ChainCheckBadge label="Splitter Profile" ok={chainSummary.checks.has_splitter} />
              <ChainCheckBadge label="Feeder Cable" ok={chainSummary.checks.has_feeder_cable} />
              <ChainCheckBadge label="Downstream ODP" ok={chainSummary.checks.has_downstream_odp} />
              <ChainCheckBadge label="Core Mapping" ok={chainSummary.checks.has_core_mapping} />
            </div>

            {/* Metrics */}
            {chainSummary.summary && (
              <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground md:grid-cols-6">
                <MetricCell label="Ports" value={chainSummary.summary.port_count ?? 0} />
                <MetricCell label="OTB Upstream" value={chainSummary.summary.upstream_otb_count ?? 0} />
                <MetricCell label="ODP Downstream" value={chainSummary.summary.downstream_odp_count ?? 0} />
                <MetricCell label="Connections" value={chainSummary.summary.total_connection_count ?? 0} />
                <MetricCell
                  label="Core Used/Total"
                  value={`${chainSummary.summary.fiber_core_used ?? 0}/${chainSummary.summary.fiber_core_total ?? 0}`}
                />
              </div>
            )}

            {/* Upstream OTB Detail */}
            {chainSummary.upstream_connections && chainSummary.upstream_connections.length > 0 && (
              <div className="rounded-md border p-2">
                <p className="mb-1.5 text-xs font-medium">Upstream OTB Connections</p>
                <div className="space-y-1">
                  {chainSummary.upstream_connections.map((conn, idx) => (
                    <div key={conn.connection_id || idx} className="flex items-center justify-between gap-2 rounded border px-2 py-1 text-xs">
                      <span className="font-medium text-foreground">
                        {conn.peer_device?.device_name ?? conn.peer_device?.device_type_key ?? "OTB"}
                      </span>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        {conn.core_start != null && conn.core_end != null && (
                          <span>Core {conn.core_start}–{conn.core_end}</span>
                        )}
                        <Badge variant="outline" className="h-4 px-1 text-[10px]">
                          {conn.status ?? "planned"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Downstream ODP List */}
            {chainSummary.downstream_odp_devices && chainSummary.downstream_odp_devices.length > 0 && (
              <div className="rounded-md border p-2">
                <p className="mb-1.5 text-xs font-medium">
                  Downstream ODP ({chainSummary.downstream_odp_devices.length})
                </p>
                <div className="grid grid-cols-1 gap-1 md:grid-cols-2">
                  {chainSummary.downstream_odp_devices.slice(0, 10).map((odp) => (
                    <div key={odp.id} className="flex items-center justify-between gap-2 rounded border px-2 py-1 text-xs">
                      <span className="truncate font-medium text-foreground">
                        {odp.device_name ?? odp.device_id ?? odp.id.slice(0, 8)}
                      </span>
                      <span className="text-muted-foreground">
                        {odp.used_ports ?? 0}/{odp.total_ports ?? 0} port
                      </span>
                    </div>
                  ))}
                  {chainSummary.downstream_odp_devices.length > 10 && (
                    <p className="col-span-full text-xs text-muted-foreground">
                      +{chainSummary.downstream_odp_devices.length - 10} ODP lainnya
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Suggestions */}
            {chainSummary.suggestions && chainSummary.suggestions.length > 0 && (
              <div className="rounded-md border bg-muted/20 p-2">
                <p className="mb-1 text-xs font-medium">Saran Perbaikan</p>
                <div className="space-y-1">
                  {chainSummary.suggestions.map((item) => (
                    <p key={item.key} className="text-xs text-muted-foreground">
                      <span
                        className={`mr-1 font-medium ${
                          item.severity === "high"
                            ? "text-red-600"
                            : item.severity === "medium"
                              ? "text-amber-600"
                              : "text-foreground"
                        }`}
                      >
                        {item.title}:
                      </span>
                      {item.description}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Status chain ODC belum tersedia.</p>
        )}
      </CardContent>
    </Card>
  );
}

// ── OTB Chain Summary Section ─────────────────────────────────────────────

type OtbChainSummaryData = {
  downstream_odc_count: number;
  downstream_odp_count: number;
  total_core_used: number;
  total_core_capacity: number;
  is_connected: boolean;
  odc_list?: Array<{
    id: string;
    device_name?: string | null;
    device_id?: string | null;
    is_chain_complete?: boolean;
  }>;
};

export function OtbCoreChainSummarySection({
  chainSummary,
  loading,
  onRefresh,
}: {
  chainSummary: OtbChainSummaryData | null;
  loading: boolean;
  onRefresh?: () => void;
}) {
  if (!chainSummary && !loading) return null;

  return (
    <Card className="bg-transparent">
      <CardHeader className="px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm">OTB Chain Downstream</CardTitle>
          <div className="flex items-center gap-2">
            {chainSummary && (
              <Badge variant={chainSummary.is_connected ? "secondary" : "outline"}>
                {chainSummary.is_connected ? "Connected" : "No Downstream"}
              </Badge>
            )}
            {onRefresh && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={onRefresh}
                disabled={loading}
              >
                <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-3 pb-3 pt-0">
        {loading ? (
          <AppLoading label="Memuat chain OTB..." />
        ) : chainSummary ? (
          <div className="space-y-3">
            {/* Metrics */}
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              <MetricCell label="ODC Terhubung" value={chainSummary.downstream_odc_count} />
              <MetricCell label="ODP via ODC" value={chainSummary.downstream_odp_count} />
              <MetricCell
                label="Core Terpakai"
                value={`${chainSummary.total_core_used}/${chainSummary.total_core_capacity}`}
              />
              <div className="rounded-md border bg-background p-2">
                <p className="text-[10px] font-medium uppercase text-muted-foreground">Utilisasi</p>
                <p className={`mt-1 text-lg font-semibold ${
                  chainSummary.total_core_capacity > 0
                    ? chainSummary.total_core_used / chainSummary.total_core_capacity > 0.8
                      ? "text-rose-600"
                      : "text-emerald-600"
                    : "text-foreground"
                }`}>
                  {chainSummary.total_core_capacity > 0
                    ? `${Math.round((chainSummary.total_core_used / chainSummary.total_core_capacity) * 100)}%`
                    : "—"}
                </p>
              </div>
            </div>

            {/* ODC List */}
            {chainSummary.odc_list && chainSummary.odc_list.length > 0 && (
              <div className="rounded-md border p-2">
                <p className="mb-1.5 text-xs font-medium">ODC yang Terhubung</p>
                <div className="space-y-1">
                  {chainSummary.odc_list.map((odc) => (
                    <div key={odc.id} className="flex items-center justify-between gap-2 rounded border px-2 py-1 text-xs">
                      <span className="font-medium text-foreground">
                        {odc.device_name ?? odc.device_id ?? odc.id.slice(0, 8)}
                      </span>
                      <Badge
                        variant="outline"
                        className={`h-4 px-1 text-[10px] ${
                          odc.is_chain_complete
                            ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                            : "border-amber-300 bg-amber-50 text-amber-700"
                        }`}
                      >
                        {odc.is_chain_complete ? "Complete" : "Incomplete"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!chainSummary.is_connected && (
              <p className="text-xs text-muted-foreground">
                OTB ini belum memiliki koneksi ke ODC. Hubungkan port OTB ke port ODC untuk membentuk chain.
              </p>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Status chain OTB belum tersedia.</p>
        )}
      </CardContent>
    </Card>
  );
}

// ── Shared Sub-components ─────────────────────────────────────────────────

function ChainCheckBadge({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div
      className={`flex items-center gap-2 rounded-md border px-2 py-1.5 text-xs ${
        ok
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-amber-200 bg-amber-50 text-amber-800"
      }`}
    >
      {ok ? <CheckCircle2 className="size-3.5 shrink-0" /> : <XCircle className="size-3.5 shrink-0" />}
      <span>{label}</span>
    </div>
  );
}

function MetricCell({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md border bg-background p-2">
      <p className="text-[10px] font-medium uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 text-base font-semibold text-foreground">{value}</p>
    </div>
  );
}
