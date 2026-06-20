"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { DateRange } from "react-day-picker";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Download, Filter, Search } from "lucide-react";
import { AppLoading } from "@/components/app-loading-new";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
  { value: "create:,update:,delete:,soft_delete:,restore:,purge:", label: "Asset Change" },
  { value: ":devices,validation_request_,provision_ports:devices", label: "Device" },
  { value: "create:", label: "Create Data" },
  { value: "update:", label: "Update Data" },
  { value: "delete:,soft_delete:", label: "Hapus Data" },
  { value: "restore:", label: "Restore" },
  { value: "purge:", label: "Purge" },
  { value: "validation_request_submitted,validation_request_resubmitted_by_validator", label: "Validasi Validator" },
  {
    value:
      "validation_request_approved_by_adminregion,validation_request_rejected_by_adminregion,validation_request_resubmitted_by_adminregion",
    label: "Approval Admin Region",
  },
  {
    value: "validation_request_approved_by_superadmin,validation_request_rejected_by_superadmin",
    label: "Approval Superadmin",
  },
  { value: "account:", label: "Account" },
  { value: "notification:", label: "Notification" },
  { value: "attachment:", label: "Attachment" },
  { value: "import:", label: "Import" },
];

const EXACT_ACTION_FILTERS = new Set([
  "validation_request_submitted,validation_request_resubmitted_by_validator",
  "validation_request_approved_by_adminregion,validation_request_rejected_by_adminregion,validation_request_resubmitted_by_adminregion",
  "validation_request_approved_by_superadmin,validation_request_rejected_by_superadmin",
]);

const ACTION_LABELS: Record<string, string> = {
  "account:login_success": "Login successful",
  "account:user_register": "Account created",
  "account:bootstrap_admin": "Bootstrap admin created",
  "account:profile_update": "Profile updated",
  "account:password_change": "Password changed",
  "account:password_reset_requested": "Password reset requested",
  "account:avatar_orphan_cleanup": "Avatar orphan cleanup",
  "attachment:upload": "Attachment uploaded",
  "provision_ports:devices": "Provision port device",
  validation_request_submitted: "Validator submit validasi device",
  validation_request_resubmitted_by_validator: "Validator resubmit validasi device",
  validation_request_submitted_by_adminregion: "Admin Region submit validasi device",
  asset_create_request_submitted_by_adminregion: "Admin Region submit create asset",
  asset_update_request_submitted_by_adminregion: "Admin Region submit update asset",
  validation_request_approved_by_adminregion: "Admin Region approve validasi device",
  validation_request_rejected_by_adminregion: "Admin Region reject validasi device",
  validation_request_resubmitted_by_adminregion: "Admin Region resubmit validasi device",
  validation_request_approved_by_superadmin: "Superadmin approve validasi device",
  validation_request_rejected_by_superadmin: "Superadmin reject validasi device",
  validation_request_applied_to_asset: "Perubahan validasi diterapkan ke asset",
  "notification:validation_reminder_sent": "Validation reminder sent",
};

const ENTITY_LABELS: Record<string, string> = {
  app_user: "Account",
  attachments: "Attachment",
  import_job: "Import Job",
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
  const [dateRangeInput, setDateRangeInput] = useState<DateRange | undefined>();
  const [dateRangeFilter, setDateRangeFilter] = useState<DateRange | undefined>();
  const [actionFilter, setActionFilter] = useState("__all");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [pageInput, setPageInput] = useState("1");
  const [userMap, setUserMap] = useState<Record<string, string>>({});
  const entityTypeFilter = (searchParams.get("entity_type") || "").trim();
  const entityIdFilter = (searchParams.get("entity_id") || "").trim();
  const dateFromFilter = toIsoDateBoundary(dateRangeFilter?.from, false);
  const dateToFilter = toIsoDateBoundary(dateRangeFilter?.to || dateRangeFilter?.from, true);

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
        if (dateFromFilter) query.set("created_from", dateFromFilter);
        if (dateToFilter) query.set("created_to", dateToFilter);
        if (actionFilter !== "__all") {
          if (EXACT_ACTION_FILTERS.has(actionFilter)) query.set("action_name_in", actionFilter);
          else if (actionFilter.includes(",")) query.set("action_name_contains_any", actionFilter);
          else query.set("action_name_contains", actionFilter);
        }

        const payload = await apiFetch<PaginatedResponse<AuditLogItem>>(`/auditLogs?${query.toString()}`, { token });
        let data = payload.data || [];

        if (entityTypeFilter) {
          data = data.filter((item) => (item.entity_type || "").toLowerCase() === entityTypeFilter.toLowerCase());
        }
        if (entityIdFilter) data = data.filter((item) => String(item.entity_id || "").toLowerCase() === entityIdFilter.toLowerCase());

        if (!cancelled) {
          setRows(data);
          setTotal(payload.meta?.total ?? data.length);
          setPageInput(String(page));
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
  }, [token, me.role, page, limit, search, requestIdFilter, actionFilter, entityTypeFilter, entityIdFilter, dateFromFilter, dateToFilter]);

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
          nextMap[user.id] = user.full_name?.trim() || user.email?.trim() || "User tidak tersedia";
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

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const pageNumbers = useMemo(() => buildPageNumbers(page, totalPages), [page, totalPages]);
  const activeFilterCount = [
    search,
    requestIdFilter,
    dateRangeFilter?.from ? "date-range" : "",
    actionFilter !== "__all" ? actionFilter : "",
    entityTypeFilter,
    entityIdFilter,
  ].filter(Boolean).length;

  function applyFilters() {
    setPage(1);
    setSearch(searchInput.trim());
    setRequestIdFilter(requestIdInput.trim());
    setDateRangeFilter(dateRangeInput);
    setExpandedIds(new Set());
  }

  function resetFilters() {
    setPage(1);
    setSearchInput("");
    setSearch("");
    setRequestIdInput("");
    setRequestIdFilter("");
    setDateRangeInput(undefined);
    setDateRangeFilter(undefined);
    setActionFilter("__all");
    setExpandedIds(new Set());
  }

  function goToPage(nextPage: number) {
    const safePage = Math.min(totalPages, Math.max(1, nextPage));
    setPage(safePage);
    setPageInput(String(safePage));
  }

  function exportVisibleCsv() {
    downloadCsv(
      `syntrix-audit-trail-page-${page}.csv`,
      rows.map((item) => ({
        waktu: formatDateTime(item.created_at),
        action: formatAction(item.action_name),
        entity: formatEntityName(item),
        actor: formatActorName(item.actor_user_id, userMap),
        ip_address: item.ip_address || "-",
        request_id: getAuditRequestId(item) || "-",
        entity_id: item.entity_id || "-",
        user_agent: item.user_agent || "-",
      })),
    );
  }

  return (
    <ScrollArea className="h-full min-h-0 w-full">
      <div className="space-y-4 pr-3">
        <Card className="overflow-hidden">
          <CardHeader className="border-b bg-muted/20">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <CardTitle>Activity Log</CardTitle>
                <CardDescription>Jejak aktivitas sistem, approval, dan perubahan asset.</CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">Admin Only</Badge>
                <Badge variant="secondary">{total} log</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 p-3 md:p-4">
            <div className="rounded-md border bg-muted/10 p-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Filter className="size-4 text-muted-foreground" />
                  Filter Audit
                  {activeFilterCount ? <Badge variant="secondary">{activeFilterCount} aktif</Badge> : null}
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={resetFilters} disabled={loading || !activeFilterCount}>
                  Reset
                </Button>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
                <div className="relative min-w-0">
                  <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                  <Input
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") applyFilters();
                    }}
                    placeholder="Cari action/entity/id..."
                    className="pl-8"
                  />
                </div>
                <Input
                  value={requestIdInput}
                  onChange={(event) => setRequestIdInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") applyFilters();
                  }}
                  placeholder="Request ID, contoh VRQ-0001"
                />
                <AuditDateRangePicker value={dateRangeInput} onChange={setDateRangeInput} />
                <Combobox
                  value={actionFilter}
                  onValueChange={(value) => {
                    setPage(1);
                    setActionFilter(value);
                  }}
                  options={ACTION_OPTIONS}
                />
                <div className="grid grid-cols-2 gap-2 sm:col-span-2 lg:col-span-2 2xl:col-span-1 2xl:grid-cols-[120px_128px]">
                  <Select
                    value={String(limit)}
                    onValueChange={(value) => {
                      setPage(1);
                      setLimit(Number(value));
                    }}
                  >
                    <SelectTrigger className="w-full min-w-[8.5rem]">
                      <SelectValue placeholder="20 / halaman" />
                    </SelectTrigger>
                    <SelectContent align="start" className="min-w-[8.5rem]">
                      <SelectItem value="10">10 / halaman</SelectItem>
                      <SelectItem value="20">20 / halaman</SelectItem>
                      <SelectItem value="50">50 / halaman</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button type="button" onClick={applyFilters} className="whitespace-nowrap">
                    Terapkan
                  </Button>
                </div>
              </div>
            </div>
            {(entityTypeFilter || entityIdFilter || requestIdFilter.trim() || dateRangeFilter?.from) ? (
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>Preset filter:</span>
                {entityTypeFilter ? <Badge variant="outline">entity: {entityTypeFilter}</Badge> : null}
                {entityIdFilter ? <Badge variant="outline">id: {entityIdFilter}</Badge> : null}
                {requestIdFilter.trim() ? <Badge variant="outline">request: {requestIdFilter.trim()}</Badge> : null}
                {dateRangeFilter?.from ? <Badge variant="outline">tanggal: {formatDateRangeLabel(dateRangeFilter)}</Badge> : null}
              </div>
            ) : null}

            {loading ? (
              <AppLoading label="Sedang memuat audit trail..." />
            ) : error ? (
              <AppLoading label={error} variant="error" />
            ) : (
              <AuditTrailTable
                rows={rows}
                userMap={userMap}
                expandedIds={expandedIds}
                onToggleExpanded={(id) => {
                  setExpandedIds((current) => {
                    const next = new Set(current);
                    if (next.has(id)) next.delete(id);
                    else next.add(id);
                    return next;
                  });
                }}
              />
            )}

            <div className="flex flex-col gap-3 text-sm text-muted-foreground lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <span>Total data: {total}</span>
                <Button type="button" variant="outline" size="sm" onClick={exportVisibleCsv} disabled={!rows.length || loading}>
                  <Download className="mr-2 size-4" />
                  Export CSV
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page <= 1 || loading}
                  onClick={() => goToPage(page - 1)}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                {pageNumbers.map((item, index) =>
                  item === "dots" ? (
                    <span key={`${item}-${index}`} className="px-1">...</span>
                  ) : (
                    <Button
                      key={item}
                      type="button"
                      variant={item === page ? "default" : "outline"}
                      size="sm"
                      className="h-8 min-w-8 px-2"
                      disabled={loading}
                      onClick={() => goToPage(item)}
                    >
                      {item}
                    </Button>
                  ),
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={loading || page * limit >= total}
                  onClick={() => goToPage(page + 1)}
                >
                  <ChevronRight className="size-4" />
                </Button>
                <form
                  className="ml-1 flex items-center gap-1"
                  onSubmit={(event) => {
                    event.preventDefault();
                    goToPage(Number(pageInput));
                  }}
                >
                  <Input
                    value={pageInput}
                    onChange={(event) => setPageInput(event.target.value.replace(/\D/g, ""))}
                    className="h-8 w-16 text-center"
                    aria-label="Go to page"
                  />
                  <span>/ {totalPages}</span>
                </form>
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

function AuditTrailTable({
  rows,
  userMap,
  expandedIds,
  onToggleExpanded,
}: {
  rows: AuditLogItem[];
  userMap: Record<string, string>;
  expandedIds: Set<string>;
  onToggleExpanded: (id: string) => void;
}) {
  if (!rows.length) {
    return (
      <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
        Tidak ada audit log yang cocok dengan filter saat ini.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border bg-card">
      <div className="divide-y 2xl:hidden">
        {rows.map((item) => {
          const expanded = expandedIds.has(item.id);
          const requestId = getAuditRequestId(item);
          const isValidationPair = isValidationWorkflowAction(item.action_name);
          return (
            <div
              key={item.id}
              className={`min-w-0 p-3 ${isValidationPair ? "border-l-4 border-l-sky-300 bg-sky-50/35 dark:bg-sky-500/10" : ""}`}
            >
              <div className="flex min-w-0 items-start justify-between gap-2">
                <div className="min-w-0 space-y-1">
                  <Badge variant="outline" className="max-w-full whitespace-normal text-left">
                    {formatAction(item.action_name)}
                  </Badge>
                  <p className="break-words text-sm font-medium">{formatEntityName(item)}</p>
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span>{formatDateTime(item.created_at)}</span>
                    {requestId ? <span>{requestId}</span> : null}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => onToggleExpanded(item.id)}
                  aria-label={expanded ? "Tutup detail audit" : "Buka detail audit"}
                  className="shrink-0"
                >
                  <ChevronDown className={`size-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
                </Button>
              </div>
              <div className="mt-2 grid grid-cols-1 gap-1.5 text-xs sm:grid-cols-2">
                <AuditMiniField label="Actor" value={formatActorName(item.actor_user_id, userMap)} />
                <AuditMiniField label="IP" value={item.ip_address || "-"} />
              </div>
              {expanded ? (
                <div className="mt-3 space-y-3">
                  <div className="grid gap-2">
                    <AuditDetailBlock title="User Agent" value={item.user_agent || "-"} />
                    <AuditDetailBlock title="Entity ID" value={item.entity_id || "-"} />
                  </div>
                  <div className="grid gap-2">
                    <AuditJsonBlock title="Before Data" value={item.before_data} />
                    <AuditJsonBlock title="After Data" value={item.after_data} />
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      <div className="hidden overflow-x-auto 2xl:block">
        <Table className="min-w-[920px]">
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-10" />
              <TableHead className="w-[160px]">Waktu</TableHead>
              <TableHead>Aksi</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead className="w-[180px]">Actor</TableHead>
              <TableHead className="w-[140px]">IP Address</TableHead>
              <TableHead className="w-[110px]">Detail</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((item) => {
              const expanded = expandedIds.has(item.id);
              const requestId = getAuditRequestId(item);
              const isValidationPair = isValidationWorkflowAction(item.action_name);
              return (
                <Fragment key={item.id}>
                  <TableRow
                    className={isValidationPair ? "border-l-4 border-l-sky-300 bg-sky-50/35 dark:bg-sky-500/10" : undefined}
                  >
                    <TableCell className="px-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => onToggleExpanded(item.id)}
                        aria-label={expanded ? "Tutup detail audit" : "Buka detail audit"}
                      >
                        <ChevronDown className={`size-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
                      </Button>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{formatDateTime(item.created_at)}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Badge variant="outline" className="max-w-full whitespace-normal text-left">
                          {formatAction(item.action_name)}
                        </Badge>
                        {requestId ? <p className="text-[11px] text-muted-foreground">{requestId}</p> : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="min-w-0">
                        <p className="break-words text-sm font-medium">{formatEntityName(item)}</p>
                        <p className="text-[11px] text-muted-foreground">{formatEntityType(item.entity_type || "-")}</p>
                      </div>
                    </TableCell>
                    <TableCell className="break-words text-sm">{formatActorName(item.actor_user_id, userMap)}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm">{item.ip_address || "-"}</TableCell>
                    <TableCell>
                      <Button type="button" variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => onToggleExpanded(item.id)}>
                        {expanded ? "Tutup" : "Lihat"}
                      </Button>
                    </TableCell>
                  </TableRow>
                  {expanded ? (
                    <TableRow className="bg-muted/20">
                      <TableCell />
                      <TableCell colSpan={6} className="space-y-3 py-3">
                        <div className="grid gap-3 md:grid-cols-2">
                          <AuditDetailBlock title="User Agent" value={item.user_agent || "-"} />
                          <AuditDetailBlock title="Entity ID" value={item.entity_id || "-"} />
                        </div>
                        <div className="grid gap-3 lg:grid-cols-2">
                          <AuditJsonBlock title="Before Data" value={item.before_data} />
                          <AuditJsonBlock title="After Data" value={item.after_data} />
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : null}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function AuditMiniField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md border bg-background px-2 py-1.5">
      <p className="text-[9px] font-medium uppercase text-muted-foreground">{label}</p>
      <p className="break-words text-xs">{value}</p>
    </div>
  );
}

function AuditDateRangePicker({ value, onChange }: { value?: DateRange; onChange: (value: DateRange | undefined) => void }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={`min-w-0 justify-start px-2 text-left font-normal ${value?.from ? "" : "text-muted-foreground"}`}
          aria-label="Rentang tanggal audit"
        >
          <CalendarDays className="size-4" />
          <span className="truncate">{value?.from ? formatDateRangeLabel(value) : "Pilih rentang tanggal"}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="range"
          selected={value}
          onSelect={onChange}
          captionLayout="label"
        />
      </PopoverContent>
    </Popover>
  );
}

function AuditDetailBlock({ title, value }: { title: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md border bg-background p-2">
      <p className="text-[10px] font-medium uppercase text-muted-foreground">{title}</p>
      <p className="mt-1 break-words text-xs">{value}</p>
    </div>
  );
}

function AuditJsonBlock({ title, value }: { title: string; value?: Record<string, unknown> | null }) {
  return (
    <Collapsible className="min-w-0 rounded-md border bg-background p-2">
      <CollapsibleTrigger asChild>
        <Button type="button" variant="ghost" className="h-7 w-full justify-between px-2 text-xs font-medium">
          {title}
          <ChevronDown className="size-3.5" />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <pre className="mt-2 max-h-56 overflow-auto rounded bg-muted/40 p-2 text-[11px]">
          {JSON.stringify(value || {}, null, 2)}
        </pre>
      </CollapsibleContent>
    </Collapsible>
  );
}

function formatAction(value?: string | null) {
  const text = (value || "").trim();
  if (!text) return "-";
  if (ACTION_LABELS[text]) return ACTION_LABELS[text];
  const [action, entity] = text.split(":");
  if (!entity) return toTitleCase(text.replaceAll("_", " "));
  const entityLabel = formatAuditResourceName(entity);
  if (action === "create") return `Create ${entityLabel}`;
  if (action === "update") return `Update ${entityLabel}`;
  if (action === "delete" || action === "soft_delete") return `Hapus ${entityLabel}`;
  if (action === "restore") return `Restore ${entityLabel}`;
  if (action === "purge") return `Purge ${entityLabel}`;
  if (action === "import") return `Import ${entityLabel}`;
  if (action === "provision_ports") return `Provision port ${entityLabel}`;
  return `${toTitleCase(action.replaceAll("_", " "))} ${entityLabel}`;
}

function formatAuditResourceName(value: string) {
  const map: Record<string, string> = {
    app_user: "Account",
    assetModels: "Asset Model",
    attachments: "Attachment",
    customers: "Customer",
    devicePorts: "Device Port",
    devices: "Device",
    deviceTypes: "Device Type",
    import_job: "Import Job",
    poles: "Pole",
    popTypes: "POP Type",
    pops: "POP",
    projects: "Project",
    regions: "Region",
    routes: "Route",
    validation_requests: "Validation Request",
  };
  return map[value] || formatEntityType(value);
}

function getAuditRequestId(item: AuditLogItem) {
  const beforeRequest = item.before_data?.request_id;
  const afterRequest = item.after_data?.request_id;
  const requestId = String(afterRequest || beforeRequest || "").trim();
  if (requestId) return requestId;
  return "";
}

function isValidationWorkflowAction(value?: string | null) {
  const action = String(value || "");
  return action.startsWith("validation_request_");
}

function buildPageNumbers(currentPage: number, totalPages: number): Array<number | "dots"> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set([1, totalPages, currentPage, currentPage - 1, currentPage + 1]);
  const sorted = Array.from(pages)
    .filter((value) => value >= 1 && value <= totalPages)
    .sort((left, right) => left - right);

  const result: Array<number | "dots"> = [];
  sorted.forEach((pageNumber, index) => {
    const previous = sorted[index - 1];
    if (previous && pageNumber - previous > 1) result.push("dots");
    result.push(pageNumber);
  });
  return result;
}

function toIsoDateBoundary(value: Date | undefined, endOfDay: boolean) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  date.setHours(endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
  return date.toISOString();
}

function formatDateRangeLabel(value: DateRange) {
  if (!value.from) return "Pilih rentang tanggal";
  if (!value.to) return formatDateOnly(value.from);
  return `${formatDateOnly(value.from)} - ${formatDateOnly(value.to)}`;
}

function formatDateOnly(value: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(value);
}

function downloadCsv(filename: string, rows: Array<Record<string, string>>) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function csvCell(value: string) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function formatActorName(actorUserId: string | null | undefined, userMap: Record<string, string>) {
  if (!actorUserId) return "-";
  return userMap[actorUserId] || "User tidak tersedia";
}

function formatEntityName(item: AuditLogItem) {
  const entityType = (item.entity_type || "").trim();
  const sources = getAuditEntitySources(item);
  const pick = (...keys: string[]) => {
    for (const source of sources) {
      for (const key of keys) {
        const value = source?.[key];
        if (value === null || value === undefined) continue;
        const text = String(value).trim();
        if (text) return text;
      }
    }
    return "";
  };

  if (!entityType) return "Data tidak tersedia";

  if (entityType === "validation_requests") {
    const label = pick(
      "entity_label",
      "device_name",
      "document_title",
      "document_name",
      "as_built_document_name",
      "request_title",
      "request_name",
    );
    const requestId = pick("request_id");
    if (label && requestId && label !== requestId) return `${label} (${requestId})`;
    return label || requestId || "Request tidak tersedia";
  }
  if (entityType === "regions") return pick("region_name", "region_code") || "Region tidak tersedia";
  if (entityType === "deviceTypes") return pick("device_type_name", "device_type_key") || "Tipe device tidak tersedia";
  if (entityType === "popTypes") return pick("pop_type_name", "pop_type_code") || "Tipe POP tidak tersedia";
  if (entityType === "manufacturers") return pick("manufacturer_name", "manufacturer_code") || "Manufacturer tidak tersedia";
  if (entityType === "brands") return pick("brand_name", "brand_code") || "Brand tidak tersedia";
  if (entityType === "assetModels") return pick("model_name", "model_code") || "Model tidak tersedia";
  if (entityType === "provinces") return pick("province_name") || "Provinsi tidak tersedia";
  if (entityType === "cities") return pick("city_name", "city_code") || "Kota tidak tersedia";
  if (entityType === "pops") return pick("pop_name", "pop_code") || "POP tidak tersedia";
  if (entityType === "devices") return pick("device_name", "device_code", "inventory_id", "device_id") || "Device tidak tersedia";
  if (entityType === "projects") return pick("project_name", "project_code") || "Project tidak tersedia";
  if (entityType === "routes") return pick("route_name", "route_code") || "Route tidak tersedia";
  if (entityType === "poles") return pick("pole_number", "pole_code") || "Pole tidak tersedia";
  if (entityType === "devicePorts") return pick("port_label", "port_index") || "Port tidak tersedia";
  if (entityType === "validations") return pick("device_name", "validation_type", "status") || "Validation tidak tersedia";
  if (entityType === "app_user") return pick("full_name", "email", "user_code") || "Account tidak tersedia";
  if (entityType === "attachments") return pick("file_name", "original_name", "attachment_name") || "Attachment tidak tersedia";
  if (entityType === "import_job") return pick("file_name", "entity_type", "status") || "Import job tidak tersedia";

  return pick("entity_label", "name", "title", "code") || "Data tidak tersedia";
}

function getAuditEntitySources(item: AuditLogItem): Array<Record<string, unknown>> {
  const sources: Array<Record<string, unknown>> = [];
  [item.after_data, item.before_data].forEach((source) => {
    if (!isRecord(source)) return;
    sources.push(source);
    [
      "device",
      "pop",
      "project",
      "route",
      "pole",
      "port",
      "document",
      "request",
      "validation",
      "payload",
      "payload_snapshot",
      "field_validation",
    ].forEach((key) => {
      const nested = source[key];
      if (isRecord(nested)) sources.push(nested);
    });
  });
  return sources;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
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
