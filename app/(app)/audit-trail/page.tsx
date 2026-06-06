"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AppLoading } from "@/components/app-loading-new";
import { SimpleTable } from "@/components/simple-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSession } from "@/components/session-context";
import { apiFetch, type PaginatedResponse } from "@/lib/api";

type AuditLogItem = {
  id: string;
  actor_user_id?: string | null;
  action_name?: string | null;
  entity_type?: string | null;
  entity_id?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  before_data?: Record<string, unknown> | null;
  after_data?: Record<string, unknown> | null;
  created_at?: string | null;
};

type UserItem = {
  id: string;
  full_name?: string | null;
  email?: string | null;
};

const ACTION_OPTIONS = [
  { value: "__all", label: "Semua aksi" },
  { value: "create:", label: "Create" },
  { value: "update:", label: "Update" },
  { value: "soft_delete:", label: "Soft Delete" },
  { value: "delete:", label: "Delete" },
  { value: "restore:", label: "Restore" },
  { value: "purge:", label: "Purge" },
  { value: "validation_request_submitted", label: "ODP - Submit Validasi" },
  { value: "validation_request_resubmitted_by_validator", label: "ODP - Resubmit Validator" },
  { value: "validation_request_approved_by_adminregion", label: "ODP - Approve Admin Region" },
  { value: "validation_request_rejected_by_adminregion", label: "ODP - Reject Admin Region" },
  { value: "validation_request_resubmitted_by_adminregion", label: "ODP - Resubmit Admin Region" },
  { value: "validation_request_approved_by_superadmin", label: "ODP - Approve Superadmin" },
  { value: "validation_request_rejected_by_superadmin", label: "ODP - Reject Superadmin" },
  { value: "validation_request_applied_to_asset", label: "ODP - Apply ke Asset" },
];

const ACTION_LABELS: Record<string, string> = {
  validation_request_submitted: "ODP validation submitted",
  validation_request_resubmitted_by_validator: "ODP validation resubmitted by validator",
  validation_request_approved_by_adminregion: "ODP validation approved by Admin Region",
  validation_request_rejected_by_adminregion: "ODP validation rejected by Admin Region",
  validation_request_resubmitted_by_adminregion: "ODP validation resubmitted by Admin Region",
  validation_request_approved_by_superadmin: "ODP validation approved by superadmin",
  validation_request_rejected_by_superadmin: "ODP validation rejected by superadmin",
  validation_request_applied_to_asset: "ODP validation applied to asset",
};

const ENTITY_LABELS: Record<string, string> = {
  validation_requests: "Validation Request",
  devicePorts: "Device Port",
  deviceTypes: "Device Type",
  popTypes: "POP Type",
  assetModels: "Asset Model",
};

export default function AuditTrailPage() {
  const searchParams = useSearchParams();
  const { token, me } = useSession();
  const [rows, setRows] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [requestIdInput, setRequestIdInput] = useState(searchParams.get("request_id") || "");
  const [requestIdFilter, setRequestIdFilter] = useState(searchParams.get("request_id") || "");
  const [actionFilter, setActionFilter] = useState("__all");
  const [userMap, setUserMap] = useState<Record<string, string>>({});
  const entityTypeFilter = (searchParams.get("entity_type") || "").trim();
  const entityIdFilter = (searchParams.get("entity_id") || "").trim();

  useEffect(() => {
    if (!entityIdFilter) return;
    setPage(1);
  }, [entityIdFilter]);

  useEffect(() => {
    if (me.role !== "admin") {
      setRows([]);
      setLoading(false);
      setError("Halaman ini hanya untuk admin.");
      return;
    }
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError("");
      try {
        const query = new URLSearchParams({
          page: String(page),
          limit: String(limit),
        });
        if (search.trim()) query.set("q", search.trim());
        if (requestIdFilter.trim()) query.set("request_id", requestIdFilter.trim());
        if (entityTypeFilter) query.set("entity_type", entityTypeFilter);
        if (entityIdFilter) query.set("entity_id", entityIdFilter);

        const payload = await apiFetch<PaginatedResponse<AuditLogItem>>(`/auditLogs?${query.toString()}`, { token });
        let data = payload.data || [];

        if (actionFilter !== "__all") {
          data = data.filter((item) => String(item.action_name || "").includes(actionFilter));
        }
        if (entityTypeFilter) {
          data = data.filter((item) => (item.entity_type || "").toLowerCase() === entityTypeFilter.toLowerCase());
        }
        if (entityIdFilter) data = data.filter((item) => String(item.entity_id || "").toLowerCase() === entityIdFilter.toLowerCase());

        if (!cancelled) {
          setRows(data);
          setTotal(payload.meta?.total ?? data.length);
        }
      } catch (err) {
        if (!cancelled) setError((err as Error).message || "Gagal memuat audit trail.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [token, me.role, page, limit, search, requestIdFilter, actionFilter, entityTypeFilter, entityIdFilter]);

  useEffect(() => {
    if (me.role !== "admin") return;
    let cancelled = false;

    async function run() {
      try {
        const payload = await apiFetch<PaginatedResponse<UserItem>>("/users?page=1&limit=200", { token });
        if (cancelled) return;
        const nextMap: Record<string, string> = {};
        (payload.data || []).forEach((user) => {
          if (!user.id) return;
          nextMap[user.id] = user.full_name?.trim() || user.email?.trim() || user.id;
        });
        setUserMap(nextMap);
      } catch {
        if (!cancelled) setUserMap({});
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [token, me.role]);

  const headers = useMemo(
    () => ["Waktu", "Aksi", "Entity", "Actor", "IP Address", "User Agent"],
    [],
  );

  const tableRows = useMemo(
    () =>
      rows.map((item) => [
        formatDateTime(item.created_at),
        formatAction(item.action_name),
        formatEntityName(item),
        formatActorName(item.actor_user_id, userMap),
        item.ip_address || "-",
        item.user_agent || "-",
      ]),
    [rows, userMap],
  );

  return (
    <ScrollArea className="h-full min-h-0 w-full">
      <div className="space-y-4 pr-3">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <CardTitle>Activity Log</CardTitle>
                <CardDescription>Jejak aktivitas create, update, delete, dan soft delete.</CardDescription>
              </div>
              <Badge variant="outline">Admin Only</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
              <Input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Cari action/entity/id..."
              />
              <Input
                value={requestIdInput}
                onChange={(event) => setRequestIdInput(event.target.value)}
                placeholder="Filter request_id (contoh: VRQ-0001)"
              />
              <Combobox
                value={actionFilter}
                onValueChange={(value) => {
                  setPage(1);
                  setActionFilter(value);
                }}
                options={ACTION_OPTIONS}
              />
              <Combobox
                value={String(limit)}
                onValueChange={(value) => {
                  setPage(1);
                  setLimit(Number(value));
                }}
                options={[
                  { value: "10", label: "10 / halaman" },
                  { value: "20", label: "20 / halaman" },
                  { value: "50", label: "50 / halaman" },
                ]}
              />
              <Button
                type="button"
                onClick={() => {
                  setPage(1);
                  setSearch(searchInput.trim());
                  setRequestIdFilter(requestIdInput.trim());
                }}
              >
                Terapkan Filter
              </Button>
            </div>
            {(entityTypeFilter || entityIdFilter || requestIdFilter.trim()) ? (
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>Preset filter:</span>
                {entityTypeFilter ? <Badge variant="outline">entity: {entityTypeFilter}</Badge> : null}
                {entityIdFilter ? <Badge variant="outline">id: {entityIdFilter}</Badge> : null}
                {requestIdFilter.trim() ? <Badge variant="outline">request: {requestIdFilter.trim()}</Badge> : null}
              </div>
            ) : null}

            {loading ? (
              <AppLoading label="Sedang memuat audit trail..." />
            ) : error ? (
              <AppLoading label={error} variant="error" />
            ) : (
              <SimpleTable
                headers={headers}
                rows={tableRows}
                tableLabel="Audit Trail Columns"
                enableColumnVisibility
                enableSorting
              />
            )}

            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Total data: {total}</span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                >
                  Prev
                </Button>
                <span>Page {page}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={loading || page * limit >= total}
                  onClick={() => setPage((prev) => prev + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatAction(value?: string | null) {
  const text = (value || "").trim();
  if (!text) return "-";
  if (ACTION_LABELS[text]) return ACTION_LABELS[text];
  const [action, entity] = text.split(":");
  if (!entity) return toTitleCase(text.replaceAll("_", " "));
  return `${toTitleCase(action.replaceAll("_", " "))} - ${formatEntityType(entity)}`;
}

function formatActorName(actorUserId: string | null | undefined, userMap: Record<string, string>) {
  if (!actorUserId) return "-";
  return userMap[actorUserId] || actorUserId;
}

function formatEntityName(item: AuditLogItem) {
  const entityType = (item.entity_type || "").trim();
  const source = item.after_data || item.before_data || {};
  const pick = (...keys: string[]) => {
    for (const key of keys) {
      const value = source?.[key];
      if (value === null || value === undefined) continue;
      const text = String(value).trim();
      if (text) return text;
    }
    return "";
  };

  if (!entityType) return item.entity_id || "-";

  if (entityType === "validation_requests") return pick("request_id") || item.entity_id || "-";
  if (entityType === "regions") return pick("region_name") || item.entity_id || "-";
  if (entityType === "deviceTypes") return pick("device_type_name", "device_type_key") || item.entity_id || "-";
  if (entityType === "popTypes") return pick("pop_type_name", "pop_type_code") || item.entity_id || "-";
  if (entityType === "manufacturers") return pick("manufacturer_name", "manufacturer_code") || item.entity_id || "-";
  if (entityType === "brands") return pick("brand_name", "brand_code") || item.entity_id || "-";
  if (entityType === "assetModels") return pick("model_name", "model_code") || item.entity_id || "-";
  if (entityType === "provinces") return pick("province_name") || item.entity_id || "-";
  if (entityType === "cities") return pick("city_name", "city_code") || item.entity_id || "-";
  if (entityType === "pops") return pick("pop_name", "pop_id", "pop_code") || item.entity_id || "-";
  if (entityType === "devices") return pick("device_name", "device_id", "device_code") || item.entity_id || "-";
  if (entityType === "projects") return pick("project_name", "project_id", "project_code") || item.entity_id || "-";
  if (entityType === "routes") return pick("route_name", "route_id", "route_code") || item.entity_id || "-";
  if (entityType === "poles") return pick("pole_number", "pole_id") || item.entity_id || "-";
  if (entityType === "devicePorts") return pick("port_label", "port_id", "port_index") || item.entity_id || "-";
  if (entityType === "validations") return pick("validation_id", "validation_type", "status") || item.entity_id || "-";

  return item.entity_id || "-";
}

function formatEntityType(value: string) {
  return ENTITY_LABELS[value] || toTitleCase(value.replaceAll("_", " "));
}

function toTitleCase(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
