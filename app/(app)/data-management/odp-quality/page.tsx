"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Download, RefreshCw } from "lucide-react";
import { AppLoading } from "@/components/app-loading-new";
import { useSession } from "@/components/session-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiFetch, type PaginatedResponse } from "@/lib/api";

type GenericItem = {
  id: string;
  device_id?: string | null;
  device_name?: string | null;
  device_type_key?: string | null;
  validation_status?: string | null;
  status?: string | null;
  region_id?: string | null;
};

type DevicePortItem = {
  id: string;
  device_id?: string | null;
  port_id?: string | null;
  port_index?: number | null;
  port_label?: string | null;
  status?: string | null;
  customer_id?: string | null;
  ont_device_id?: string | null;
  notes?: string | null;
};

type ValidationQualityRequest = {
  id: string;
  request_id?: string | null;
  entity_id?: string | null;
  current_status?: string | null;
  payload_snapshot?: {
    field_validation?: {
      old_device_name?: string | null;
      new_device_name?: string | null;
    };
  } | null;
  evidence_attachments?: Array<{ id?: string | null; attachment_id?: string | null }> | null;
};

type IssueKey =
  | "odp-without-ports"
  | "odp-pending-validation"
  | "odp-used-without-endpoint"
  | "odp-assigned-not-used"
  | "odp-down-maintenance"
  | "odp-pending-adminregion"
  | "odp-pending-superadmin"
  | "odp-rejected-adminregion"
  | "odp-rejected-superadmin"
  | "odp-evidence-missing";

type IssueRow = {
  rowId: string;
  issue: IssueKey;
  odpId: string;
  odpDeviceId: string;
  odpDeviceName: string;
  portLabel: string;
  portStatus: string;
  note: string;
  auditEntityType: string;
  auditEntityId: string;
  requestStatus?: string;
};

type SortMode = "severity_then_odp" | "odp_id_asc" | "odp_id_desc" | "port_status";

const ISSUE_OPTIONS: Array<{ key: IssueKey; label: string; severity: "high" | "medium" }> = [
  { key: "odp-without-ports", label: "ODP tanpa port", severity: "high" },
  { key: "odp-pending-validation", label: "ODP belum tervalidasi", severity: "medium" },
  { key: "odp-used-without-endpoint", label: "Port used tanpa Customer/ONT", severity: "high" },
  { key: "odp-assigned-not-used", label: "Port assigned tapi status bukan used", severity: "high" },
  { key: "odp-down-maintenance", label: "Port down/maintenance", severity: "medium" },
  { key: "odp-pending-adminregion", label: "Pending Admin Region", severity: "medium" },
  { key: "odp-pending-superadmin", label: "Pending Superadmin", severity: "medium" },
  { key: "odp-rejected-adminregion", label: "Rejected Admin Region", severity: "high" },
  { key: "odp-rejected-superadmin", label: "Rejected Superadmin", severity: "high" },
  { key: "odp-evidence-missing", label: "Evidence kurang", severity: "high" },
];

export default function OdpQualityPage() {
  const searchParams = useSearchParams();
  const { token } = useSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rows, setRows] = useState<IssueRow[]>([]);
  const [lastIssueKey, setLastIssueKey] = useState<IssueKey | null>(null);
  const [search, setSearch] = useState("");
  const [portStatusFilter, setPortStatusFilter] = useState("all");
  const [sortMode, setSortMode] = useState<SortMode>("severity_then_odp");

  const issue = normalizeIssue(searchParams.get("issue"));
  const regionId = (searchParams.get("region_id") || "").trim();
  const activeIssue = issue || ISSUE_OPTIONS[0].key;
  const activeMeta = ISSUE_OPTIONS.find((item) => item.key === activeIssue) || ISSUE_OPTIONS[0];

  const backHref = useMemo(
    () => `/data-management${regionId ? `?region_id=${encodeURIComponent(regionId)}` : ""}`,
    [regionId],
  );

  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (portStatusFilter !== "all" && row.portStatus !== portStatusFilter) return false;
      if (!keyword) return true;
      const haystack = [row.odpDeviceName, row.odpDeviceId, row.portLabel, row.note].join(" ").toLowerCase();
      return haystack.includes(keyword);
    });
  }, [rows, search, portStatusFilter]);

  const sortedRows = useMemo(() => {
    const next = [...filteredRows];
    if (sortMode === "severity_then_odp") {
      const severityWeight = activeMeta.severity === "high" ? 0 : 1;
      next.sort((a, b) => {
        if (severityWeight !== 0) return a.odpDeviceId.localeCompare(b.odpDeviceId);
        return a.odpDeviceId.localeCompare(b.odpDeviceId);
      });
      return next;
    }
    if (sortMode === "odp_id_desc") {
      next.sort((a, b) => b.odpDeviceId.localeCompare(a.odpDeviceId));
      return next;
    }
    if (sortMode === "port_status") {
      const rank: Record<string, number> = { down: 0, maintenance: 1, reserved: 2, idle: 3, used: 4, "-": 5 };
      next.sort((a, b) => {
        const ra = rank[a.portStatus] ?? 99;
        const rb = rank[b.portStatus] ?? 99;
        if (ra !== rb) return ra - rb;
        return a.odpDeviceId.localeCompare(b.odpDeviceId);
      });
      return next;
    }
    next.sort((a, b) => a.odpDeviceId.localeCompare(b.odpDeviceId));
    return next;
  }, [filteredRows, sortMode, activeMeta.severity]);

  useEffect(() => {
    if (!token) return;
    if (lastIssueKey === activeIssue && !loading) return;
    void loadData(activeIssue, regionId, token, setRows, setError, setLoading, setLastIssueKey);
  }, [activeIssue, regionId, token, lastIssueKey, loading]);

  return (
    <ScrollArea className="h-full min-h-0 w-full">
      <div className="space-y-4 pr-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold tracking-tight">ODP Quality Issues</h2>
            <p className="text-sm text-muted-foreground">{activeMeta.label}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={backHref}>
                <ArrowLeft className="mr-2 size-4" />
                Kembali
              </Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setLoading(true);
                setLastIssueKey(null);
              }}
            >
              <RefreshCw className={`mr-2 size-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
          {ISSUE_OPTIONS.map((option) => {
            const href = `/data-management/odp-quality?issue=${encodeURIComponent(option.key)}${regionId ? `&region_id=${encodeURIComponent(regionId)}` : ""}`;
            const isActive = option.key === activeIssue;
            return (
              <Button key={option.key} asChild variant={isActive ? "default" : "outline"} size="sm" className="h-auto min-h-12 justify-start px-3 py-2 text-left">
                <Link href={href}>{option.label}</Link>
              </Button>
            );
          })}
        </div>

        <Card>
          <CardHeader className="px-3 py-2">
            <CardTitle className="text-sm">Filter Triase</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-2 px-3 pb-3 pt-0 md:grid-cols-2 xl:grid-cols-5">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari ODP ID / nama / port / catatan..."
            />
            <Combobox
              value={portStatusFilter}
              onValueChange={setPortStatusFilter}
              options={[
                { value: "all", label: "Semua status port" },
                { value: "used", label: "used" },
                { value: "idle", label: "idle" },
                { value: "reserved", label: "reserved" },
                { value: "down", label: "down" },
                { value: "maintenance", label: "maintenance" },
              ]}
            />
            <Combobox
              value={sortMode}
              onValueChange={(value) => setSortMode(value as SortMode)}
              options={[
                { value: "severity_then_odp", label: "Sort: Severity + ODP ID" },
                { value: "odp_id_asc", label: "Sort: ODP ID A-Z" },
                { value: "odp_id_desc", label: "Sort: ODP ID Z-A" },
                { value: "port_status", label: "Sort: Status Port" },
              ]}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSearch("");
                setPortStatusFilter("all");
                setSortMode("severity_then_odp");
              }}
            >
              Reset
            </Button>
            <Button type="button" variant="outline" onClick={() => exportIssueCsv(sortedRows, activeMeta.label)}>
              <Download className="mr-2 size-4" />
              Export CSV
            </Button>
          </CardContent>
        </Card>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {loading ? <AppLoading label="Memuat issue ODP..." /> : null}

        {!loading ? (
          <Card>
            <CardHeader className="px-3 py-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-sm">{activeMeta.label}</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{sortedRows.length}/{rows.length}</Badge>
                  <Badge variant={activeMeta.severity === "high" ? "destructive" : "secondary"}>{activeMeta.severity}</Badge>
                </div>
              </div>
              <CardDescription>{sortedRows.length} issue sesuai filter</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 px-3 pb-3 pt-0">
              {sortedRows.length ? (
                sortedRows.map((row) => (
                  <div key={row.rowId} className="rounded-md border bg-background p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{row.odpDeviceName}</p>
                        <p className="text-xs text-muted-foreground">{row.odpDeviceId}</p>
                      </div>
                      <Badge variant="outline">{row.portStatus || "-"}</Badge>
                    </div>
                    <p className="mt-2 text-xs">
                      <span className="font-medium">Port:</span> {row.portLabel}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{row.note}</p>
                    {row.requestStatus ? (
                      <p className="mt-1 text-[11px] text-muted-foreground">Workflow: {row.requestStatus}</p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/data-management/list/odp/${row.odpId}`}>Open ODP</Link>
                      </Button>
                      <Button asChild variant="outline" size="sm">
                        <Link
                          href={`/audit-trail?entity_type=${encodeURIComponent(row.auditEntityType)}&entity_id=${encodeURIComponent(row.auditEntityId)}`}
                        >
                          Audit Trail
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">Tidak ada issue yang cocok dengan filter saat ini.</p>
              )}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </ScrollArea>
  );
}

async function loadData(
  issue: IssueKey,
  regionId: string,
  token: string,
  setRows: (rows: IssueRow[]) => void,
  setError: (msg: string) => void,
  setLoading: (value: boolean) => void,
  setLastIssueKey: (value: IssueKey) => void,
) {
  setLoading(true);
  setError("");
  try {
    const suffix = regionId ? `&region_id=${encodeURIComponent(regionId)}` : "";
    const [devices, ports] = await Promise.all([
      fetchAllPaginated<GenericItem>(`/devices?page=1&limit=100&device_type_key=ODP${suffix}`, token, 100),
      fetchAllPaginated<DevicePortItem>(`/devicePorts?page=1&limit=100${suffix}`, token, 100),
    ]);

    const odpMap = new Map(devices.map((item) => [item.id, item]));
    const odpPorts = ports.filter((port) => port.device_id && odpMap.has(port.device_id));
    const portsByOdp = new Map<string, DevicePortItem[]>();
    odpPorts.forEach((port) => {
      const key = String(port.device_id);
      if (!portsByOdp.has(key)) portsByOdp.set(key, []);
      portsByOdp.get(key)?.push(port);
    });

    let rows: IssueRow[] = [];
    if (isWorkflowIssue(issue)) {
      const queue = toQualityQueueKey(issue);
      const requestPayload = await apiFetch<{ data: ValidationQualityRequest[] }>(
        `/validation-requests/quality-queue?queue=${encodeURIComponent(queue)}${suffix}`,
        { token },
      );
      const requests = requestPayload.data || [];
      rows = requests.map((request) => {
        const odp = odpMap.get(String(request.entity_id || "")) || null;
        return toWorkflowRow(issue, request, odp);
      });
      setRows(rows);
      setLastIssueKey(issue);
      return;
    }

    if (issue === "odp-without-ports") {
      rows = devices
        .filter((item) => !portsByOdp.has(item.id))
        .map((item) => toRow(issue, item, null, "ODP belum memiliki data port."));
    }
    if (issue === "odp-pending-validation") {
      rows = devices
        .filter((item) => !isValidated(item))
        .map((item) => toRow(issue, item, null, "ODP belum tervalidasi final."));
    }
    if (issue === "odp-used-without-endpoint") {
      rows = odpPorts
        .filter((port) => port.status === "used" && !hasAnyValue(port, ["customer_id", "ont_device_id"]))
        .map((port) => toRow(issue, odpMap.get(String(port.device_id)) || null, port, "Port status used tanpa customer/ONT."));
    }
    if (issue === "odp-assigned-not-used") {
      rows = odpPorts
        .filter((port) => hasAnyValue(port, ["customer_id", "ont_device_id"]) && port.status !== "used")
        .map((port) => toRow(issue, odpMap.get(String(port.device_id)) || null, port, "Customer/ONT terisi, tapi status port bukan used."));
    }
    if (issue === "odp-down-maintenance") {
      rows = odpPorts
        .filter((port) => port.status === "down" || port.status === "maintenance")
        .map((port) => toRow(issue, odpMap.get(String(port.device_id)) || null, port, "Port berada pada status down/maintenance."));
    }

    setRows(rows);
    setLastIssueKey(issue);
  } catch (err) {
    setError((err as Error).message || "Gagal memuat issue ODP.");
    setRows([]);
    setLastIssueKey(issue);
  } finally {
    setLoading(false);
  }
}

function toRow(issue: IssueKey, odp: GenericItem | null, port: DevicePortItem | null, note: string): IssueRow {
  const odpId = String(odp?.id || port?.device_id || "");
  const portIdx = port?.port_index != null ? Number(port.port_index) : 0;
  const hasPort = Boolean(port?.id);
  return {
    rowId: `${issue}:${port?.id || odpId}`,
    issue,
    odpId,
    odpDeviceId: String(odp?.device_id || odpId || "-"),
    odpDeviceName: String(odp?.device_name || "ODP"),
    portLabel: port ? String(port.port_label || (portIdx ? `Port ${portIdx}` : "-")) : "-",
    portStatus: String(port?.status || odp?.status || "-"),
    note,
    auditEntityType: hasPort ? "devicePorts" : "devices",
    auditEntityId: hasPort ? String(port?.id || "") : odpId,
  };
}

function toWorkflowRow(issue: IssueKey, request: ValidationQualityRequest, odp: GenericItem | null): IssueRow {
  const odpId = String(request.entity_id || odp?.id || "");
  const fallbackName =
    request.payload_snapshot?.field_validation?.new_device_name ||
    request.payload_snapshot?.field_validation?.old_device_name ||
    "ODP";
  return {
    rowId: `${issue}:${request.id}`,
    issue,
    odpId,
    odpDeviceId: String(odp?.device_id || request.request_id || odpId || "-"),
    odpDeviceName: String(odp?.device_name || fallbackName),
    portLabel: "-",
    portStatus: "-",
    note: getWorkflowIssueNote(issue, request),
    auditEntityType: "validation_requests",
    auditEntityId: request.id,
    requestStatus: String(request.current_status || "-"),
  };
}

function isWorkflowIssue(issue: IssueKey) {
  return [
    "odp-pending-adminregion",
    "odp-pending-superadmin",
    "odp-rejected-adminregion",
    "odp-rejected-superadmin",
    "odp-evidence-missing",
  ].includes(issue);
}

function toQualityQueueKey(issue: IssueKey) {
  if (issue === "odp-pending-adminregion") return "pending_adminregion";
  if (issue === "odp-pending-superadmin") return "pending_superadmin";
  if (issue === "odp-rejected-adminregion") return "rejected_adminregion";
  if (issue === "odp-rejected-superadmin") return "rejected_superadmin";
  return "evidence_missing";
}

function getWorkflowIssueNote(issue: IssueKey, request: ValidationQualityRequest) {
  if (issue === "odp-pending-adminregion") return "Request menunggu review Admin Region.";
  if (issue === "odp-pending-superadmin") return "Request menunggu approval final Superadmin.";
  if (issue === "odp-rejected-adminregion") return "Request ditolak Admin Region dan perlu tindak lanjut validator.";
  if (issue === "odp-rejected-superadmin") return "Request ditolak Superadmin dan perlu review ulang Admin Region.";
  const evidenceCount = request.evidence_attachments?.length || 0;
  return evidenceCount
    ? "Request punya attachment, tetapi masih masuk antrean evidence kurang."
    : "Request aktif belum memiliki evidence attachment.";
}

function exportIssueCsv(rows: IssueRow[], issueLabel: string) {
  const headers = ["issue_label", "odp_id", "odp_name", "port_label", "port_status", "note", "detail_url", "qr_url"];
  const lines = rows.map((row) => [
    issueLabel,
    row.odpDeviceId,
    row.odpDeviceName,
    row.portLabel,
    row.portStatus,
    row.note,
    `/data-management/list/odp/${row.odpId}`,
    `/field/odp/${row.odpId}`,
  ]);

  const csv = [headers, ...lines]
    .map((line) => line.map((value) => csvEscape(value)).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `odp-quality-${slugify(issueLabel)}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function csvEscape(value: string) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeIssue(value: string | null): IssueKey | null {
  if (!value) return null;
  const valid = new Set<IssueKey>(ISSUE_OPTIONS.map((item) => item.key));
  return valid.has(value as IssueKey) ? (value as IssueKey) : null;
}

async function fetchAllPaginated<T>(pathWithPage: string, token: string, limit = 100) {
  const rows: T[] = [];
  let page = 1;

  while (true) {
    const path = pathWithPage.replace(/page=\d+/i, `page=${page}`).replace(/limit=\d+/i, `limit=${limit}`);
    const payload = await apiFetch<PaginatedResponse<T>>(path, { token });
    const pageRows = payload.data || [];
    rows.push(...pageRows);

    const total = payload.meta?.total ?? 0;
    if (!pageRows.length) break;
    if (total && rows.length >= total) break;
    if (!total && pageRows.length < limit) break;
    page += 1;
  }

  return rows;
}

function hasAnyValue(item: Record<string, unknown>, keys: string[]) {
  return keys.some((key) => {
    const value = item[key];
    if (value === null || value === undefined) return false;
    if (typeof value === "string") return value.trim() !== "";
    return true;
  });
}

function isValidated(item: Record<string, unknown>) {
  if (hasAnyValue(item, ["validation_date", "last_validation_at"])) return true;
  const status = String(item.validation_status || "").trim().toLowerCase();
  return ["valid", "validated", "verified", "ok"].includes(status);
}
