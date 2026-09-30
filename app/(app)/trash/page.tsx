"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { Archive, RotateCcw, Search, ShieldAlert, Trash2, X } from "lucide-react";
import { AppLoading } from "@/components/app-loading-new";
import { ResponseDialog } from "@/components/response-dialog";
import { SimpleTable } from "@/components/simple-table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import { ContextMenuItem, ContextMenuLabel, ContextMenuSeparator } from "@/components/ui/context-menu";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSession } from "@/components/session-context";
import { apiFetch, type PaginatedResponse } from "@/lib/api";
import { useTranslate, type TFn } from "@/lib/use-locale";
import { MASTER_DATA_CATEGORIES } from "@/lib/data-management-config";

type TrashCategory = {
  slug: string;
  label: string;
  resource: string;
};

const ALL_TRASH_CATEGORY: TrashCategory = { slug: "all", label: "All Categories", resource: "all" };

const SOFT_DELETE_RESOURCES = new Set([
  "devices", "devicePorts", "regions", "deviceTypes", "topologyRelationRules",
  "popTypes", "routeTypes", "odpTypes", "installationTypes", "serviceTypes",
  "tenants", "manufacturers", "brands", "assetModels", "cableTypes",
  "closureTypes", "coreCapacities", "deviceCoreCapacities", "odcDistributionCables",
  "provinces", "cities",
]);

const TRASH_RESOURCE_CATEGORIES: TrashCategory[] = [
  { slug: "trash-devices", label: "Devices", resource: "devices" },
  { slug: "trash-device-ports", label: "Device Ports", resource: "devicePorts" },
  { slug: "trash-odc-distribution-cables", label: "ODC Distribution Cables", resource: "odcDistributionCables" },
  ...MASTER_DATA_CATEGORIES
    .filter((item) => SOFT_DELETE_RESOURCES.has(item.resource))
    .map((item) => ({ slug: item.slug, label: item.label, resource: item.resource })),
];

const TRASH_CATEGORIES: TrashCategory[] = [ALL_TRASH_CATEGORY, ...TRASH_RESOURCE_CATEGORIES];

const ENTITY_TYPE_RESOURCE_MAP: Record<string, string> = {
  device: "devices", devices: "devices",
  deviceport: "devicePorts", deviceports: "devicePorts",
  device_port: "devicePorts", device_ports: "devicePorts",
  region: "regions", regions: "regions",
  manufacturer: "manufacturers", manufacturers: "manufacturers",
  brand: "brands", brands: "brands",
  model: "assetModels", models: "assetModels",
  asset_model: "assetModels", assetmodels: "assetModels",
  province: "provinces", provinces: "provinces",
  city: "cities", cities: "cities",
};

type GenericItem = Record<string, unknown> & {
  id: string;
  deleted_at?: string | null;
  deleted_by_user_id?: string | null;
  __trashLabel?: string;
  __trashResource?: string;
};

type UserItem = { id: string; full_name?: string | null; email?: string | null };

// Stat card sub-component to reduce repetition
function StatCard({ eyebrow, value, caption, icon: Icon, iconColor }: {
  eyebrow: string; value: string; caption: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>; iconColor: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-border/40 bg-muted/10 p-1 shadow-2xs dark:bg-white/[0.01]">
      <div className="flex items-center justify-between gap-3 rounded-[calc(1.5rem-0.25rem)] border border-border/60 bg-card glass-inset p-3.5">
        <div className={typeof caption === "string" && caption.length > 30 ? "min-w-0" : ""}>
          <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">{eyebrow}</p>
          <p className="mt-0.5 truncate font-mono text-xl font-semibold text-foreground">{value}</p>
          <p className="truncate font-mono text-[11px] text-muted-foreground">{caption}</p>
        </div>
        <div className="shrink-0 rounded-xl border border-border/50 bg-muted/30 p-2 shadow-2xs">
          <Icon className={`size-4 ${iconColor}`} />
        </div>
      </div>
    </div>
  );
}

export default function TrashPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token, me } = useSession();
  const { t } = useTranslate();
  const [selectedCategorySlug, setSelectedCategorySlug] = useState(ALL_TRASH_CATEGORY.slug);
  const [rows, setRows] = useState<GenericItem[]>([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [userMap, setUserMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState<GenericItem | null>(null);
  const [bulkRestoreOpen, setBulkRestoreOpen] = useState(false);
  const [purgeTarget, setPurgeTarget] = useState<GenericItem | null>(null);
  const [purgeConfirmInput, setPurgeConfirmInput] = useState("");
  const [bulkPurgeOpen, setBulkPurgeOpen] = useState(false);
  const [bulkPurgeConfirmInput, setBulkPurgeConfirmInput] = useState("");
  const [resultDialogOpen, setResultDialogOpen] = useState(false);
  const [resultDialogTitle, setResultDialogTitle] = useState("");
  const [resultDialogDescription, setResultDialogDescription] = useState("");
  const [resultDialogVariant, setResultDialogVariant] = useState<"success" | "error">("success");

  const selectedCategory = useMemo(
    () => TRASH_CATEGORIES.find((item) => item.slug === selectedCategorySlug) || TRASH_CATEGORIES[0],
    [selectedCategorySlug],
  );

  useEffect(() => {
    const entityType = String(searchParams.get("entity_type") || "").trim();
    const entityId = String(searchParams.get("entity_id") || "").trim();
    if (entityType) {
      const normalized = ENTITY_TYPE_RESOURCE_MAP[entityType.toLowerCase()] || entityType;
      const matched = TRASH_RESOURCE_CATEGORIES.find((c) => c.resource.toLowerCase() === normalized.toLowerCase());
      if (matched) setSelectedCategorySlug(matched.slug);
    }
    if (entityId) { setSearchInput(entityId); setSearch(entityId); setPage(1); }
  }, [searchParams]);

  useEffect(() => {
    if (me.role !== "admin") return;
    let cancelled = false;
    async function run() {
      try {
        const payload = await apiFetch<PaginatedResponse<UserItem>>("/users?page=1&limit=200", { token });
        if (cancelled) return;
        const nextMap: Record<string, string> = {};
        (payload.data || []).forEach((u) => {
          // raw fallback "" — resolved at render via resolveUser so t never enters deps
          nextMap[u.id] = u.full_name?.trim() || u.email?.trim() || "";
        });
        setUserMap(nextMap);
      } catch { if (!cancelled) setUserMap({}); }
    }
    void run();
    return () => { cancelled = true; };
  }, [token, me.role]);

  useEffect(() => {
    if (!selectedCategory || me.role !== "admin") return;
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        if (selectedCategory.slug === ALL_TRASH_CATEGORY.slug) {
          const perLimit = page * limit;
          const results = await Promise.allSettled(
            TRASH_RESOURCE_CATEGORIES.map(async (cat) => {
              const q = new URLSearchParams({ page: "1", limit: String(perLimit), include_deleted: "true", archived_only: "true" });
              if (search.trim()) q.set("q", search.trim());
              const payload = await apiFetch<PaginatedResponse<GenericItem>>(`/${cat.resource}?${q.toString()}`, { token });
              return { category: cat, data: (payload.data || []).map((i) => ({ ...i, __trashLabel: cat.label, __trashResource: cat.resource })), total: payload.meta?.total ?? payload.data?.length ?? 0 };
            }),
          );
          if (cancelled) return;
          const ok = results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
          const combined = ok.flatMap((r) => r.data).sort((a, b) => getTimeValue(b.deleted_at) - getTimeValue(a.deleted_at));
          const start = (page - 1) * limit;
          setRows(combined.slice(start, start + limit));
          setTotal(ok.reduce((s, r) => s + r.total, 0));
          return;
        }
        const q = new URLSearchParams({ page: String(page), limit: String(limit), include_deleted: "true", archived_only: "true" });
        if (search.trim()) q.set("q", search.trim());
        const payload = await apiFetch<PaginatedResponse<GenericItem>>(`/${selectedCategory.resource}?${q.toString()}`, { token });
        if (cancelled) return;
        setRows((payload.data || []).map((i) => ({ ...i, __trashLabel: selectedCategory.label, __trashResource: selectedCategory.resource })));
        setTotal(payload.meta?.total ?? payload.data?.length ?? 0);
      } catch (err) {
        if (!cancelled) setError({ message: (err as Error).message });
      } finally { if (!cancelled) setLoading(false); }
    }
    void run();
    return () => { cancelled = true; };
  }, [selectedCategory, token, me.role, page, limit, search]);

  useEffect(() => {
    const visibleIds = new Set(rows.map((r) => r.id));
    setSelectedIds((prev) => new Set(Array.from(prev).filter((id) => visibleIds.has(id))));
  }, [rows]);

  const allCurrentRowsSelected = rows.length > 0 && rows.every((r) => selectedIds.has(r.id));
  const someCurrentRowsSelected = rows.some((r) => selectedIds.has(r.id));
  const singlePurgeReady = purgeConfirmInput.trim().toUpperCase() === "PURGE";
  const bulkPurgeReady = bulkPurgeConfirmInput.trim().toUpperCase() === "PURGE";
  const latestDeletedAt = useMemo(() => rows[0]?.deleted_at || null, [rows]);
  const activeFilterCount = (search.trim() ? 1 : 0) + ((searchParams.get("entity_type") || searchParams.get("entity_id")) ? 1 : 0);
  const pageStart = total === 0 ? 0 : (page - 1) * limit + 1;
  const pageEnd = Math.min(page * limit, total);

  function openResult(title: string, description: string, isError: boolean) {
    setResultDialogTitle(title);
    setResultDialogDescription(description);
    setResultDialogVariant(isError ? "error" : "success");
    setResultDialogOpen(true);
  }

  const selectAllHeader = useMemo(
    () => (
      <div className="flex items-center justify-center">
        <span className="sr-only">{t("trash.table.select")}</span>
        <input
          type="checkbox"
          checked={allCurrentRowsSelected}
          ref={(node) => { if (node) node.indeterminate = !allCurrentRowsSelected && someCurrentRowsSelected; }}
          onChange={(e) => {
            const checked = e.target.checked;
            setSelectedIds((prev) => {
              const next = new Set(prev);
              rows.forEach((r) => checked ? next.add(r.id) : next.delete(r.id));
              return next;
            });
          }}
          aria-label={t("trash.table.selectAllRows")}
          className="size-4 cursor-pointer rounded border-input bg-background text-primary"
        />
      </div>
    ),
    [allCurrentRowsSelected, someCurrentRowsSelected, rows, t],
  );

  const headers = useMemo(
    () => [
      selectAllHeader,
      <span key="h-data" className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">{t("trash.table.data")}</span>,
      <span key="h-cat" className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">{t("trash.table.category")}</span>,
      <span key="h-date" className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">{t("trash.table.archiveDate")}</span>,
      <span key="h-user" className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">{t("trash.table.deletedBy")}</span>,
      <span key="h-act" className="block text-right font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">{t("trash.table.action")}</span>,
    ],
    [selectAllHeader, t],
  );

  const columnVisibilityLabels = useMemo(() => t("trash.table.columns").split(", "), [t]);

  const tableRows = useMemo(
    () =>
      rows.map((item) => [
        <div key={`select-${item.id}`} className="flex items-center justify-center">
          <input
            type="checkbox"
            checked={selectedIds.has(item.id)}
            onChange={(e) => {
              const checked = e.target.checked;
              setSelectedIds((prev) => {
                const next = new Set(prev);
                if (checked) next.add(item.id);
                else next.delete(item.id);
                return next;
              });
            }}
            aria-label={t("trash.table.selectRow", { id: item.id })}
            className="size-4 cursor-pointer rounded border-input bg-background text-primary"
          />
        </div>,
        <div key={`data-${item.id}`} className="min-w-0">
          <p className="truncate font-medium text-foreground">{getDisplayName(getItemResource(selectedCategory, item), item)}</p>
          <p className="truncate font-mono text-[11px] text-muted-foreground">{getIdentifier(getItemResource(selectedCategory, item), item)}</p>
        </div>,
        <Badge key={`res-${item.id}`} variant="outline" className="font-mono text-[9px] uppercase tracking-[0.12em]">{getItemLabel(selectedCategory, item)}</Badge>,
        <span key={`date-${item.id}`} className="font-mono text-xs tabular-nums text-muted-foreground">{formatDateTime(item.deleted_at)}</span>,
        <span key={`user-${item.id}`} className="block max-w-[150px] truncate font-mono text-xs text-foreground">{resolveUser(item.deleted_by_user_id, userMap, t)}</span>,
        <div key={`act-${item.id}`} className="flex items-center justify-end gap-1.5">
          <Button type="button" size="sm" variant="outline" className="h-7 rounded-full px-2.5 font-mono text-[9px] uppercase tracking-[0.08em] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]" onClick={(e) => { e.stopPropagation(); setRestoreTarget(item); }} disabled={actionLoading}>
            <RotateCcw className="mr-1 size-3 text-emerald-500" />{t("trash.contextMenuRestore")}
          </Button>
          <Button type="button" size="sm" variant="ghost" className="h-7 rounded-full px-2.5 font-mono text-[9px] uppercase tracking-[0.08em] text-destructive hover:bg-destructive/10 hover:text-destructive transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]" onClick={(e) => { e.stopPropagation(); setPurgeTarget(item); setPurgeConfirmInput(""); }} disabled={actionLoading}>
            <Trash2 className="mr-1 size-3" />{t("trash.button.purge")}
          </Button>
        </div>,
      ]),
    [rows, selectedIds, selectedCategory, userMap, actionLoading, t],
  );

  async function handleRestore(item: GenericItem) {
    if (!selectedCategory) return;
    setActionLoading(true); setError(null);
    try {
      await apiFetch(`/${getItemResource(selectedCategory, item)}/${item.id}/restore`, { method: "POST", token });
      setRestoreTarget(null);
      setSelectedIds((p) => { const n = new Set(p); n.delete(item.id); return n; });
      setRows((p) => p.filter((r) => r.id !== item.id));
      setTotal((p) => Math.max(0, p - 1));
      const name = getDisplayName(getItemResource(selectedCategory, item), item);
      openResult(t("trash.result.restoreSuccess"), t("trash.result.restoreDescription", { name }), false);
    } catch (err) {
      const msg = (err as Error).message || t("trash.result.restoreError");
      setError({ message: msg });
      openResult(t("trash.result.restoreFailed"), msg, true);
    } finally { setActionLoading(false); }
  }

  async function handleBulkRestore() {
    if (!selectedCategory || selectedIds.size === 0) return;
    const list = rows.filter((r) => selectedIds.has(r.id));
    if (!list.length) return;
    setActionLoading(true); setError(null);
    try {
      const results = await Promise.allSettled(
        list.map((r) => apiFetch(`/${getItemResource(selectedCategory, r)}/${r.id}/restore`, { method: "POST", token })),
      );
      const succeeded = new Set<string>();
      let failCount = 0;
      results.forEach((res, i) => {
        if (res.status === "fulfilled") succeeded.add(list[i].id);
        else failCount++;
      });
      setBulkRestoreOpen(false);
      if (succeeded.size > 0) {
        setRows((p) => p.filter((r) => !succeeded.has(r.id)));
        setTotal((p) => Math.max(0, p - succeeded.size));
        setSelectedIds((p) => { const n = new Set(p); succeeded.forEach((id) => n.delete(id)); return n; });
      }
      if (failCount > 0) {
        openResult(t("trash.result.bulkRestorePartial"), t("trash.result.bulkRestorePartialDescription", { succeeded: succeeded.size, failed: failCount }), true);
      } else {
        openResult(t("trash.result.bulkRestoreSuccess"), t("trash.result.bulkRestoreDescription", { count: succeeded.size }), false);
      }
    } catch (err) {
      const msg = (err as Error).message || t("trash.result.bulkRestoreError");
      setError({ message: msg });
      openResult(t("trash.result.bulkRestoreFailed"), msg, true);
    } finally { setActionLoading(false); }
  }

  async function handlePurge(item: GenericItem) {
    if (!selectedCategory) return;
    setActionLoading(true); setError(null);
    try {
      await apiFetch(`/${getItemResource(selectedCategory, item)}/${item.id}/purge`, { method: "POST", body: JSON.stringify({ confirm: "PURGE" }), token });
      setPurgeTarget(null); setPurgeConfirmInput("");
      setSelectedIds((p) => { const n = new Set(p); n.delete(item.id); return n; });
      setRows((p) => p.filter((r) => r.id !== item.id));
      setTotal((p) => Math.max(0, p - 1));
      const name = getDisplayName(getItemResource(selectedCategory, item), item);
      openResult(t("trash.result.purgeSuccess"), t("trash.result.purgeDescription", { name }), false);
    } catch (err) {
      const msg = (err as Error).message || t("trash.result.purgeError");
      setError({ message: msg });
      openResult(t("trash.result.purgeFailed"), msg, true);
    } finally { setActionLoading(false); }
  }

  async function handleBulkPurge() {
    if (!selectedCategory || selectedIds.size === 0) return;
    const list = rows.filter((r) => selectedIds.has(r.id));
    if (!list.length) return;
    setActionLoading(true); setError(null);
    try {
      const items = list.map((r) => ({ id: r.id, resource: getItemResource(selectedCategory, r) }));
      const resp = await apiFetch<{ data?: { purgedCount: number; failedCount: number; purgedIds: string[] } }>(
        "/trash/bulk-purge", { method: "POST", body: JSON.stringify({ items, confirm: "PURGE" }), token },
      );
      const purgedSet = new Set(resp.data?.purgedIds || list.map((r) => r.id));
      const purgedCount = resp.data?.purgedCount ?? purgedSet.size;
      setBulkPurgeOpen(false); setBulkPurgeConfirmInput("");
      setRows((p) => p.filter((r) => !purgedSet.has(r.id)));
      setTotal((p) => Math.max(0, p - purgedCount));
      setSelectedIds((p) => { const n = new Set(p); purgedSet.forEach((id) => n.delete(id)); return n; });
      const failedCount = resp.data?.failedCount ?? 0;
      if (failedCount > 0) {
        openResult(t("trash.result.bulkPurgeSuccess"), t("trash.result.bulkPurgeRelationDescription", { count: purgedCount, failed: failedCount }), false);
      } else {
        openResult(t("trash.result.bulkPurgeSuccess"), t("trash.result.bulkPurgeDescription", { count: purgedCount }), false);
      }
    } catch (err) {
      const msg = (err as Error).message || t("trash.result.bulkPurgeError");
      setError({ message: msg });
      openResult(t("trash.result.bulkPurgeFailed"), msg, true);
    } finally { setActionLoading(false); }
  }

  if (me.role !== "admin") {
    return (
      <div className="flex h-full items-center justify-center">
        <Card className="max-w-md rounded-2xl border border-border/60 bg-card p-2 shadow-xs glass-inset">
          <CardHeader>
            <CardTitle>{t("trash.accessDeniedTitle")}</CardTitle>
            <CardDescription>{t("trash.accessDeniedDescription")}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full min-h-0 w-full">
      <div className="space-y-4 pr-3 pb-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">{t("trash.eyebrow")}</p>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">{t("trash.title")}</h1>
            <p className="text-xs text-muted-foreground">{t("trash.description")}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="font-mono text-[9px] uppercase tracking-[0.12em]">{t("trash.adminOnly")}</Badge>
            {activeFilterCount ? (
              <Badge variant="outline" className="font-mono text-[9px] uppercase tracking-[0.12em]">
                {t("trash.filter.activeFilter", { count: activeFilterCount })}
              </Badge>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard eyebrow={t("trash.stat.categoryLabel")} value={selectedCategory.label} caption={selectedCategory.slug === ALL_TRASH_CATEGORY.slug ? t("trash.category.all") : selectedCategory.resource} icon={Archive} iconColor="text-sky-500" />
          <StatCard eyebrow={t("trash.stat.totalArchive")} value={String(total)} caption={<span className="tabular-nums">{pageStart}-{pageEnd} {t("trash.stat.showing", { start: pageStart, end: pageEnd })}</span>} icon={Trash2} iconColor="text-amber-500" />
          <StatCard eyebrow={t("trash.stat.selectedItems")} value={String(selectedIds.size)} caption={selectedIds.size > 0 ? t("trash.selectedReady") : t("trash.selectedNone")} icon={ShieldAlert} iconColor="text-blue-500" />
          <StatCard eyebrow={t("trash.stat.lastArchive")} value={formatDateTime(latestDeletedAt)} caption={t("trash.stat.lastArchiveCaption")} icon={RotateCcw} iconColor="text-emerald-500" />
        </div>

        <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-xs glass-inset space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[240px_1fr_160px_auto_auto]">
            <div className="space-y-1">
              <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">{t("trash.filter.category")}</p>
              <Combobox
                value={selectedCategory.slug}
                onValueChange={(v) => { setSelectedCategorySlug(v); setPage(1); setSelectedIds(new Set()); }}
                options={TRASH_CATEGORIES.map((item) => ({ value: item.slug, label: item.label }))}
                placeholder={t("trash.filter.categoryPlaceholder")}
                searchPlaceholder={t("trash.filter.categorySearch")}
              />
            </div>
            <div className="space-y-1">
              <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">{t("trash.filter.search")}</p>
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { setPage(1); setSearch(searchInput.trim()); } }}
                placeholder={t("trash.filter.searchPlaceholder")}
              />
            </div>
            <div className="space-y-1">
              <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">{t("trash.filter.rows")}</p>
              <Combobox
                value={String(limit)}
                onValueChange={(v) => { setPage(1); setLimit(Number(v)); }}
                options={[
                  { value: "10", label: t("trash.filter.rowsValue", { count: 10 }) },
                  { value: "20", label: t("trash.filter.rowsValue", { count: 20 }) },
                  { value: "50", label: t("trash.filter.rowsValue", { count: 50 }) },
                ]}
                placeholder={t("trash.filter.rowsPlaceholder")}
              />
            </div>
            <div className="flex items-end">
              <Button type="button" className="w-full sm:w-auto rounded-full font-mono text-[10px] uppercase tracking-[0.08em] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]" onClick={() => { setPage(1); setSearch(searchInput.trim()); }}>
                <Search className="mr-1.5 size-3.5" />{t("trash.button.apply")}
              </Button>
            </div>
            <div className="flex items-end">
              <Button type="button" variant="outline" className="w-full sm:w-auto rounded-full font-mono text-[10px] uppercase tracking-[0.08em] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]" onClick={() => { setSelectedCategorySlug(ALL_TRASH_CATEGORY.slug); setSearchInput(""); setSearch(""); setPage(1); setSelectedIds(new Set()); }} disabled={loading}>
                <X className="mr-1.5 size-3.5" />{t("trash.button.reset")}
              </Button>
            </div>
          </div>

          {(searchParams.get("entity_type") || searchParams.get("entity_id")) && (
            <Alert className="rounded-xl border-border/50 bg-muted/20">
              <Search className="size-4" />
              <AlertTitle className="font-mono text-xs uppercase tracking-wider">{t("trash.presetTitle")}</AlertTitle>
              <AlertDescription>
                <div className="mt-1 flex flex-wrap gap-2">
                  {searchParams.get("entity_type") ? <Badge variant="outline" className="font-mono text-[9px] uppercase">entity: {searchParams.get("entity_type")}</Badge> : null}
                  {searchParams.get("entity_id") ? <Badge variant="outline" className="font-mono text-[9px] uppercase">id: {searchParams.get("entity_id")}</Badge> : null}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>

        {selectedIds.size > 0 && (
          <div className="rounded-2xl border border-primary/40 bg-primary/5 p-1 shadow-xs animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[calc(1rem-0.25rem)] border border-primary/30 bg-card glass-inset px-4 py-2.5">
              <div className="flex items-center gap-2.5">
                <Badge variant="outline" className="border-primary/40 bg-primary/10 font-mono text-[9px] uppercase tracking-[0.12em] text-primary">
                  <span className="mr-1 font-semibold tabular-nums">{selectedIds.size}</span> {t("trash.selectedCount", { count: selectedIds.size })}
                </Badge>
                <p className="hidden text-xs text-muted-foreground sm:inline">{t("trash.selectedHint")}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" size="sm" variant="outline" className="rounded-full font-mono text-[10px] uppercase tracking-[0.08em] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]" disabled={actionLoading} onClick={() => setBulkRestoreOpen(true)}>
                  <RotateCcw className="mr-1.5 size-3.5 text-emerald-500" />{t("trash.button.restoreSelected")}
                </Button>
                <Button type="button" size="sm" variant="destructive" className="rounded-full font-mono text-[10px] uppercase tracking-[0.08em] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]" disabled={actionLoading} onClick={() => setBulkPurgeOpen(true)}>
                  <Trash2 className="mr-1.5 size-3.5" />{t("trash.button.purgeSelected")}
                </Button>
                <Button type="button" size="sm" variant="ghost" className="rounded-full font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]" onClick={() => setSelectedIds(new Set())}>
                  {t("common.cancel")}
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-xs glass-inset space-y-4">
          {loading ? (
            <AppLoading label={t("trash.loading")} />
          ) : error ? (
            <Alert variant="destructive" className="rounded-xl">
              <ShieldAlert className="size-4" />
              <AlertTitle>{t("trash.loadFailTitle")}</AlertTitle>
              <AlertDescription>{error.message || t("trash.loadFailed")}</AlertDescription>
            </Alert>
          ) : rows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/60 p-12 text-center">
              <Archive className="mx-auto mb-3 size-10 text-muted-foreground/60" />
              <p className="font-mono text-sm font-semibold uppercase tracking-wider text-foreground">{t("trash.emptyTitle")}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t("trash.emptyDescription")}</p>
            </div>
          ) : (
            <SimpleTable
              headers={headers}
              rows={tableRows}
              tableLabel={t("trash.table.label")}
              columnVisibilityLabel={t("trash.table.columnVisibility")}
              columnVisibilityLabels={columnVisibilityLabels}
              enableColumnVisibility
              enableSorting
              disableSortColumns={[0, 5]}
              rowContextMenu={(rowIndex) => {
                const row = rows[rowIndex];
                if (!row) return null;
                return (
                  <>
                    <ContextMenuLabel className="font-mono text-[9px] uppercase tracking-wider">{t("trash.contextMenuLabel")}</ContextMenuLabel>
                    <ContextMenuItem onSelect={() => router.push(`/audit-trail?entity_type=${encodeURIComponent(getItemResource(selectedCategory, row))}&entity_id=${encodeURIComponent(row.id)}`)}>
                      {t("trash.contextMenuAudit")}
                    </ContextMenuItem>
                    <ContextMenuItem onSelect={() => setRestoreTarget(row)}>
                      <RotateCcw className="mr-1.5 size-3.5 text-emerald-500" />{t("trash.contextMenuRestore")}
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem className="text-destructive focus:text-destructive" onSelect={() => { setPurgeTarget(row); setPurgeConfirmInput(""); }}>
                      <Trash2 className="mr-1.5 size-3.5" />{t("trash.contextMenuPurge")}
                    </ContextMenuItem>
                  </>
                );
              }}
            />
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/40 pt-3">
            <p className="font-mono text-xs tabular-nums text-muted-foreground">
              {t("trash.pagination.showing", { start: pageStart, end: pageEnd, total })}
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="rounded-full font-mono text-[10px] uppercase tracking-[0.08em] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]" disabled={page <= 1 || loading} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                {t("trash.button.prev")}
              </Button>
              <span className="font-mono text-xs tabular-nums text-muted-foreground">
                {t("trash.pagination.pageOf", { page, max: Math.max(1, Math.ceil(total / limit)) })}
              </span>
              <Button variant="outline" size="sm" className="rounded-full font-mono text-[10px] uppercase tracking-[0.08em] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]" disabled={loading || page * limit >= total} onClick={() => setPage((p) => p + 1)}>
                {t("trash.button.next")}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <AlertDialog open={Boolean(restoreTarget)} onOpenChange={(open) => !open && setRestoreTarget(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("trash.dialog.restoreTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("trash.dialog.restoreDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading} className="rounded-full transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]">{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction disabled={actionLoading || !restoreTarget} onClick={() => restoreTarget && void handleRestore(restoreTarget)} className="rounded-full transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]">
              {actionLoading ? t("common.processing") : t("trash.contextMenuRestore")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkRestoreOpen} onOpenChange={setBulkRestoreOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("trash.dialog.bulkRestoreTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("trash.dialog.bulkRestoreDescription", { count: selectedIds.size })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading} className="rounded-full transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]">{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction disabled={actionLoading || selectedIds.size === 0} onClick={() => void handleBulkRestore()} className="rounded-full transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]">
              {actionLoading ? t("common.processing") : t("trash.button.restoreSelected")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={Boolean(purgeTarget)} onOpenChange={(open) => { if (!open) { setPurgeTarget(null); setPurgeConfirmInput(""); } }}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("trash.dialog.purgeTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("trash.dialog.purgeDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-3.5 py-2.5 text-sm">
            <p className="font-mono text-[9px] uppercase tracking-wider text-destructive font-semibold">{t("trash.permanentLabel")}</p>
            <p className="mt-0.5 text-muted-foreground">
              {t("trash.dialog.itemLabel")} <span className="font-medium text-foreground">{purgeTarget ? getDisplayName(getItemResource(selectedCategory, purgeTarget), purgeTarget) : "-"}</span>
            </p>
          </div>
          <div className="space-y-1.5">
            <Input value={purgeConfirmInput} onChange={(e) => setPurgeConfirmInput(e.target.value)} placeholder={t("trash.confirmPlaceholder")} autoComplete="off" className="font-mono uppercase" />
            <p className={`font-mono text-xs ${singlePurgeReady ? "text-emerald-600 font-medium" : "text-muted-foreground"}`}>
              {t("trash.confirmHint", { word: "PURGE" })}
            </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading} className="rounded-full transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]">{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction disabled={actionLoading || !purgeTarget || !singlePurgeReady} onClick={() => purgeTarget && void handlePurge(purgeTarget)} className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]">
              {actionLoading ? t("common.processing") : t("trash.dialog.purgeTitle").replace("?", "")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkPurgeOpen} onOpenChange={(open) => { setBulkPurgeOpen(open); if (!open) setBulkPurgeConfirmInput(""); }}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("trash.dialog.bulkPurgeTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("trash.dialog.bulkPurgeDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-3.5 py-2.5 text-sm">
            <p className="font-mono text-[9px] uppercase tracking-wider text-destructive font-semibold">{t("trash.permanentLabel")}</p>
            <p className="mt-0.5 text-muted-foreground">
              {t("trash.permanentCount", { count: selectedIds.size })}
            </p>
          </div>
          <div className="space-y-1.5">
            <Input value={bulkPurgeConfirmInput} onChange={(e) => setBulkPurgeConfirmInput(e.target.value)} placeholder={t("trash.confirmPlaceholder")} autoComplete="off" className="font-mono uppercase" />
            <p className={`font-mono text-xs ${bulkPurgeReady ? "text-emerald-600 font-medium" : "text-muted-foreground"}`}>
              {t("trash.confirmHint", { word: "PURGE" })}
            </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading} className="rounded-full transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]">{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction disabled={actionLoading || selectedIds.size === 0 || !bulkPurgeReady} onClick={() => void handleBulkPurge()} className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]">
              {actionLoading ? t("common.processing") : t("trash.dialog.bulkPurgeTitle").replace("?", "")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ResponseDialog
        open={resultDialogOpen}
        title={resultDialogTitle}
        description={resultDialogDescription}
        variant={resultDialogVariant}
        actionLabel={t("common.ok")}
        onOpenChange={setResultDialogOpen}
        onAction={() => setResultDialogOpen(false)}
      />
    </ScrollArea>
  );
}

function getItemResource(selectedCategory: TrashCategory, item: GenericItem) {
  return item.__trashResource || selectedCategory.resource;
}

function getItemLabel(selectedCategory: TrashCategory, item: GenericItem) {
  return item.__trashLabel || selectedCategory.label;
}

function getIdentifier(resource: string, item: GenericItem) {
  const map: Record<string, string[]> = {
    devices: ["device_id", "device_code"], devicePorts: ["port_id", "port_label", "port_index"],
    regions: ["region_id"], deviceTypes: ["device_type_key"], popTypes: ["pop_type_code"],
    manufacturers: ["manufacturer_code"], brands: ["brand_code"], assetModels: ["model_code"],
    provinces: ["province_name"], cities: ["city_code"], routeTypes: ["route_type_code"],
    odpTypes: ["odp_type_code"], cableTypes: ["cable_type_code"], closureTypes: ["closure_type_code"],
    coreCapacities: ["core_capacity_id", "core_capacity_value"],
    deviceCoreCapacities: ["device_core_capacity_id", "core_capacity_value"],
    tenants: ["tenant_code"], installationTypes: ["installation_type_code"], serviceTypes: ["service_type_code"],
  };
  return pick(item, map[resource] || ["id"]);
}

function getDisplayName(resource: string, item: GenericItem) {
  const map: Record<string, string[]> = {
    devices: ["device_name", "device_id", "device_code"], devicePorts: ["port_label", "port_id", "port_index"],
    regions: ["region_name"], deviceTypes: ["device_type_name", "device_type_key"],
    popTypes: ["pop_type_name", "pop_type_code"],
    manufacturers: ["manufacturer_name", "manufacturer_code"], brands: ["brand_name", "brand_code"],
    assetModels: ["model_name", "model_code"], provinces: ["province_name"], cities: ["city_name", "city_code"],
    routeTypes: ["route_type_name", "route_type_code"], odpTypes: ["odp_type_name", "odp_type_code"],
    cableTypes: ["cable_type_name", "cable_type_code"], closureTypes: ["closure_type_name", "closure_type_code"],
    coreCapacities: ["label", "description", "core_capacity_value"],
    deviceCoreCapacities: ["label", "description", "core_capacity_value"],
    tenants: ["tenant_name", "tenant_code"], installationTypes: ["installation_type_name", "installation_type_code"],
    serviceTypes: ["service_type_name", "service_type_code"],
  };
  return pick(item, map[resource] || ["id"]);
}

function resolveUser(id: unknown, userMap: Record<string, string>, t: TFn) {
  if (id === null || id === undefined) return "-";
  const key = String(id).trim();
  if (!key) return "-";
  return userMap[key] || t("trash.userUnavailable");
}

function pick(item: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = item[key];
    if (value !== null && value !== undefined && String(value).trim() !== "") return String(value);
  }
  return "-";
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function getTimeValue(value?: string | null) {
  if (!value) return 0;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}
