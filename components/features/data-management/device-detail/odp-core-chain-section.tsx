import { CheckCircle2, XCircle } from "lucide-react";
import { AppLoading } from "@/components/app-loading-new";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";

type OdpCoreChainSummary = {
  is_complete: boolean;
  checks: {
    has_ports: boolean;
    has_upstream_link: boolean;
    has_main_splitter: boolean;
    has_distribution_cable: boolean;
    has_core_mapping: boolean;
    has_odc_source_path: boolean;
  };
  summary?: {
    upstream_device_count?: number;
    distribution_cable_count?: number;
    fiber_core_total?: number;
    fiber_core_used?: number;
  };
  suggestions?: Array<{
    key: string;
    title: string;
    description: string;
  }>;
  upstream_port_candidates?: Array<{
    port_id: string;
    port_label?: string | null;
    port_index?: number | null;
    device?: {
      device_id?: string | null;
      device_name?: string | null;
    };
  }>;
};

type SelectOption = {
  value: string;
  label: string;
};

export function OdpPortMetrics({
  totalPorts,
  usedPorts,
  idlePorts,
  reservedPorts,
  downPorts,
}: {
  totalPorts: number;
  usedPorts: number;
  idlePorts: number;
  reservedPorts: number;
  downPorts: number;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
      <OdpMetric label="Total Port" value={totalPorts} />
      <OdpMetric label="Used" value={usedPorts} tone="used" />
      <OdpMetric label="Idle" value={idlePorts} tone="idle" />
      <OdpMetric label="Reserved" value={reservedPorts} tone="reserved" />
      <OdpMetric label="Down/Maint." value={downPorts} tone="down" />
    </div>
  );
}

export function OdpCoreChainSummarySection({
  coreChainSummary,
  loading,
  odpPortOptions,
  cableOptions,
  effectiveDraftTargetPortId,
  draftCableDeviceId,
  draftCoreStart,
  draftCoreEnd,
  creatingDraftLink,
  onDraftTargetPortChange,
  onDraftCableDeviceChange,
  onDraftCoreStartChange,
  onDraftCoreEndChange,
  onCreateDraftLink,
}: {
  coreChainSummary: OdpCoreChainSummary | null;
  loading: boolean;
  odpPortOptions: SelectOption[];
  cableOptions: SelectOption[];
  effectiveDraftTargetPortId: string;
  draftCableDeviceId: string;
  draftCoreStart: string;
  draftCoreEnd: string;
  creatingDraftLink: boolean;
  onDraftTargetPortChange: (value: string) => void;
  onDraftCableDeviceChange: (value: string) => void;
  onDraftCoreStartChange: (value: string) => void;
  onDraftCoreEndChange: (value: string) => void;
  onCreateDraftLink: (payload: {
    upstreamPortId: string;
    odpPortId: string;
    cableDeviceId?: string;
    coreStart?: number;
    coreEnd?: number;
  }) => void;
}) {
  return (
    <div className="rounded-md border p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-sm font-medium">Core Chain Summary</p>
        <Badge variant={coreChainSummary?.is_complete ? "secondary" : "outline"}>
          {coreChainSummary?.is_complete ? "Complete" : "Incomplete"}
        </Badge>
      </div>
      {loading ? (
        <AppLoading label="Memuat rantai core ODP..." />
      ) : coreChainSummary ? (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
            <ChainCheck label="Port Inventory" ok={coreChainSummary.checks.has_ports} />
            <ChainCheck label="Upstream Link" ok={coreChainSummary.checks.has_upstream_link} />
            <ChainCheck label="Main Splitter" ok={coreChainSummary.checks.has_main_splitter} />
            <ChainCheck label="Distribution Cable" ok={coreChainSummary.checks.has_distribution_cable} />
            <ChainCheck label="Core Mapping" ok={coreChainSummary.checks.has_core_mapping} />
            <ChainCheck label="ODC Source Path" ok={coreChainSummary.checks.has_odc_source_path} />
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground md:grid-cols-3">
            <p>Upstream Devices: <span className="font-medium text-foreground">{coreChainSummary.summary?.upstream_device_count ?? 0}</span></p>
            <p>Distribution Cables: <span className="font-medium text-foreground">{coreChainSummary.summary?.distribution_cable_count ?? 0}</span></p>
            <p>Fiber Cores Used/Total: <span className="font-medium text-foreground">{coreChainSummary.summary?.fiber_core_used ?? 0}/{coreChainSummary.summary?.fiber_core_total ?? 0}</span></p>
          </div>
          {coreChainSummary.suggestions?.length ? (
            <div className="space-y-1 rounded-md border bg-muted/20 p-2">
              <p className="text-xs font-medium">Auto Suggest Actions</p>
              {coreChainSummary.suggestions.map((item) => (
                <p key={item.key} className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{item.title}:</span> {item.description}
                </p>
              ))}
            </div>
          ) : null}
          {coreChainSummary.upstream_port_candidates?.length ? (
            <div className="space-y-1 rounded-md border p-2">
              <p className="text-xs font-medium">Suggested Upstream Ports</p>
              <div className="grid grid-cols-1 gap-2 pb-1 md:grid-cols-2">
                <Combobox
                  value={effectiveDraftTargetPortId || "__none__"}
                  onValueChange={(value) => onDraftTargetPortChange(value === "__none__" ? "" : value)}
                  options={[
                    { value: "__none__", label: "Pilih port ODP target" },
                    ...odpPortOptions,
                  ]}
                  triggerClassName="h-8 text-xs"
                />
                <Combobox
                  value={draftCableDeviceId}
                  onValueChange={onDraftCableDeviceChange}
                  options={cableOptions}
                  triggerClassName="h-8 text-xs"
                />
                <Input
                  type="number"
                  min={1}
                  placeholder="Core start (opsional)"
                  value={draftCoreStart}
                  onChange={(event) => onDraftCoreStartChange(event.target.value)}
                  className="h-8 text-xs"
                />
                <Input
                  type="number"
                  min={1}
                  placeholder="Core end (opsional)"
                  value={draftCoreEnd}
                  onChange={(event) => onDraftCoreEndChange(event.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="grid grid-cols-1 gap-1 md:grid-cols-2">
                {coreChainSummary.upstream_port_candidates.slice(0, 8).map((candidate) => (
                  <div key={candidate.port_id} className="flex items-center justify-between gap-2 rounded border px-2 py-1">
                    <p className="truncate text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{candidate.device?.device_id || candidate.device?.device_name || "-"}</span>
                      {" - "}
                      {candidate.port_label || `Port ${candidate.port_index ?? "-"}`}
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-6 px-2 text-[11px]"
                      disabled={creatingDraftLink}
                      onClick={() =>
                        onCreateDraftLink({
                          upstreamPortId: candidate.port_id,
                          odpPortId: effectiveDraftTargetPortId,
                          cableDeviceId: draftCableDeviceId === "__none__" ? "" : draftCableDeviceId,
                          coreStart: draftCoreStart ? Number(draftCoreStart) : undefined,
                          coreEnd: draftCoreEnd ? Number(draftCoreEnd) : undefined,
                        })
                      }
                    >
                      {creatingDraftLink ? "..." : "Draft Link"}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Ringkasan rantai core belum tersedia.</p>
      )}
    </div>
  );
}

function OdpMetric({ label, value, tone }: { label: string; value: number; tone?: "used" | "idle" | "reserved" | "down" }) {
  const toneClass =
    tone === "used"
      ? "text-emerald-700"
      : tone === "idle"
        ? "text-slate-700"
        : tone === "reserved"
          ? "text-amber-700"
          : tone === "down"
            ? "text-rose-700"
            : "text-foreground";
  return (
    <div className="rounded-md border bg-background p-2">
      <p className="text-[10px] font-medium uppercase text-muted-foreground">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}

function ChainCheck({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className={`flex items-center gap-2 rounded-md border px-2 py-1.5 text-xs ${ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
      {ok ? <CheckCircle2 className="size-3.5" /> : <XCircle className="size-3.5" />}
      <span>{label}</span>
    </div>
  );
}
