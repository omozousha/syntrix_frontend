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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import { ContextMenuItem, ContextMenuLabel, ContextMenuSeparator } from "@/components/ui/context-menu";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSession } from "@/components/session-context";
import { apiFetch, type PaginatedResponse } from "@/lib/api";
import { MASTER_DATA_CATEGORIES } from "@/lib/data-management-config";

type TrashCategory = {
  slug: string;
  label: string;
  resource: string;
};

const ALL_TRASH_CATEGORY: TrashCategory = { slug: "all", label: "All Categories", resource: "all" };

// Whitelist only resources that support softDelete: true in backend registry
const SOFT_DELETE_RESOURCES = new Set([
  "devices",
  "devicePorts",
  "regions",
  "deviceTypes",
  "topologyRelationRules",
  "popTypes",
  "routeTypes",
  "odpTypes",
  "installationTypes",
  "serviceTypes",
  "tenants",
  "manufacturers",
  "brands",
  "assetModels",
  "cableTypes",
  "closureTypes",
  "coreCapacities",
  "deviceCoreCapacities",
  "odcDistributionCables",
  "provinces",
  "cities",
]);

const TRASH_RESOURCE_CATEGORIES: TrashCategory[] = [
  { slug: "trash-devices", label: "Devices", resource: "devices" },
  { slug: "trash-device-ports", label: "Device Ports", resource: "devicePorts" },
  { slug: "trash-odc-distribution-cables", label: "ODC Distribution Cables", resource: "odcDistributionCables" },
  ...MASTER_DATA_CATEGORIES
    .filter((item) => SOFT_DELETE_RESOURCES.has(item.resource))
    .map((item) => ({
      slug: item.slug,
      label: item.label,
      resource: item.resource,
    })),
];

const TRASH_CATEGORIES: TrashCategory[] = [ALL_TRASH_CATEGORY, ...TRASH_RESOURCE_CATEGORIES];

const ENTITY_TYPE_RESOURCE_MAP: Record<string, string> = {
  device: "devices",
  devices: "devices",
  deviceport: "devicePorts",
  deviceports: "devicePorts",
  device_port: "devicePorts",
  device_ports: "devicePorts",
  region: "regions",
  regions: "regions",
  manufacturer: "manufacturers",
  manufacturers: "manufacturers",
  brand: "brands",
  brands: "brands",
  model: "assetModels",
  models: "assetModels",
  asset_model: "assetModels",
  assetmodels: "assetModels",
  province: "provinces",
  provinces: "provinces",
  city: "cities",
  cities: "cities",
};

type GenericItem = Record<string, unknown> & {
  id: string;
  deleted_at?: string | null;
  deleted_by_user_id?: string | null;
  __trashLabel?: string;
  __trashResource?: string;
};

type UserItem = {
  id: string;
  full_name?: string | null;
  email?: string | null;
};

export default function TrashPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token, me } = useSession();
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
  const [error, setError] = useState("");
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

  const selectedCategory = useMemo(
    () => TRASH_CATEGORIES.find((item) => item.slug === selectedCategorySlug) || TRASH_CATEGORIES[0],
    [selectedCategorySlug],
  );

  useEffect(() => {
    const entityType = String(searchParams.get("entity_type") || "").trim();
    const entityId = String(searchParams.get("entity_id") || "").trim();

    if (entityType) {
      const normalizedEntityType = ENTITY_TYPE_RESOURCE_MAP[entityType.toLowerCase()] || entityType;
      const matchedCategory = TRASH_RESOURCE_CATEGORIES.find(
        (item) => item.resource.toLowerCase() === normalizedEntityType.toLowerCase(),
      );
      if (matchedCategory) {
        setSelectedCategorySlug(matchedCategory.slug);
      }
    }

    if (entityId) {
      setSearchInput(entityId);
      setSearch(entityId);
      setPage(1);
    }
  }, [searchParams]);

  useEffect(() => {
    if (me.role !== "admin") return;
    let cancelled = false;
    async function run() {
      try {
        const payload = await apiFetch<PaginatedResponse<UserItem>>("/users?page=1&limit=200", { token });
        if (cancelled) return;
        const nextMap: Record<string, string> = {};
        (payload.data || []).forEach((user) => {
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

  useEffect(() => {
    if (!selectedCategory || me.role !== "admin") return;
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError("");
      try {
        if (selectedCategory.slug === ALL_TRASH_CATEGORY.slug) {
          const perCategoryLimit = page * limit;
          const results = await Promise.allSettled(
            TRASH_RESOURCE_CATEGORIES.map(async (category) => {
              const query = new URLSearchParams({
                page: "1",
                limit: String(perCategoryLimit),
                include_deleted: "true",
                archived_only: "true",
              });
              if (search.trim()) query.set("q", search.trim());
              const payload = await apiFetch<PaginatedResponse<GenericItem>>(`/${category.resource}?${query.toString()}`, { token });
              return {
                category,
                data: (payload.data || []).map((item) => ({
                  ...item,
                  __trashLabel: category.label,
                  __trashResource: category.resource,
                })),
                total: payload.meta?.total ?? payload.data?.length ?? 0,
              };
            }),
          );

          if (cancelled) return;
          const successfulResults = results.flatMap((result) => (result.status === "fulfilled" ? [result.value] : []));
          const combinedRows = successfulResults
            .flatMap((result) => result.data)
            .sort((a, b) => getTimeValue(b.deleted_at) - getTimeValue(a.deleted_at));
          const start = (page - 1) * limit;
          setRows(combinedRows.slice(start, start + limit));
          setTotal(successfulResults.reduce((sum, result) => sum + result.total, 0));
          return;
        }

        const query = new URLSearchParams({
          page: String(page),
          limit: String(limit),
          include_deleted: "true",
          archived_only: "true",
        });
        if (search.trim()) query.set("q", search.trim());
        const payload = await apiFetch<PaginatedResponse<GenericItem>>(`/${selectedCategory.resource}?${query.toString()}`, { token });
        if (cancelled) return;
        setRows((payload.data || []).map((item) => ({ ...item, __trashLabel: selectedCategory.label, __trashResource: selectedCategory.resource })));
        setTotal(payload.meta?.total ?? payload.data?.length ?? 0);
      } catch (err) {
        if (!cancelled) setError((err as Error).message || "Gagal memuat data arsip trash.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [selectedCategory, token, me.role, page, limit, search]);

  useEffect(() => {
    const visibleIds = new Set(rows.map((row) => row.id));
    setSelectedIds((prev) => new Set(Array.from(prev).filter((id) => visibleIds.has(id))));
  }, [rows]);

  const allCurrentRowsSelected = rows.length > 0 && rows.every((row) => selectedIds.has(row.id));
  const someCurrentRowsSelected = rows.some((row) => selectedIds.has(row.id));
  const singlePurgeReady = purgeConfirmInput.trim().toUpperCase() === "PURGE";
  const bulkPurgeReady = bulkPurgeConfirmInput.trim().toUpperCase() === "PURGE";
  const selectedRows = useMemo(() => rows.filter((row) => selectedIds.has(row.id)), [rows, selectedIds]);
  const latestDeletedAt = useMemo(() => rows[0]?.deleted_at || null, [rows]);
  const activeFilterCount = (search.trim() ? 1 : 0) + ((searchParams.get("entity_type") || searchParams.get("entity_id")) ? 1 : 0);
  const pageStart = total === 0 ? 0 : (page - 1) * limit + 1;
  const pageEnd = Math.min(page * limit, total);

  const selectAllHeader = useMemo(
    () => (
      <div className="flex items-center justify-center">
        <span className="sr-only">Pilih Semua</span>
        <input
          type="checkbox"
          checked={allCurrentRowsSelected}
          ref={(node) => {
            if (!node) return;
            node.indeterminate = !allCurrentRowsSelected && someCurrentRowsSelected;
          }}
          onChange={(event) => {
            const checked = event.target.checked;
            setSelectedIds((prev) => {
              const next = new Set(prev);
              if (checked) rows.forEach((row) => next.add(row.id));
              else rows.forEach((row) => next.delete(row.id));
              return next;
            });
          }}
          aria-label="Select all rows"
          className="size-4 cursor-pointer rounded border-input bg-background text-primary"
        />
      </div>
    ),
    [allCurrentRowsSelected, someCurrentRowsSelected, rows],
  );

  const headers = useMemo(
    () => [
      selectAllHeader,
      <span key="h-data" className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">Data</span>,
      <span key="h-cat" className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">Kategori</span>,
      <span key="h-date" className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">Dihapus Pada</span>,
      <span key="h-user" className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">Dihapus Oleh</span>,
      <span key="h-act" className="block text-right font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">Aksi</span>,
    ],
    [selectAllHeader],
  );

  const columnVisibilityLabels = useMemo(
    () => ["Pilih", "Data", "Kategori", "Dihapus Pada", "Dihapus Oleh", "Aksi"],
    [],
  );

  const tableRows = useMemo(
    () =>
      rows.map((item) => [
        <div key={`select-${item.id}`} className="flex items-center justify-center">
          <input
            type="checkbox"
            checked={selectedIds.has(item.id)}
            onChange={(event) => {
              const checked = event.target.checked;
              setSelectedIds((prev) => {
                const next = new Set(prev);
                if (checked) next.add(item.id);
                else next.delete(item.id);
                return next;
              });
            }}
            aria-label={`Select ${item.id}`}
            className="size-4 cursor-pointer rounded border-input bg-background text-primary"
          />
        </div>,
        <div key={`data-${item.id}`} className="min-w-0">
          <p className="truncate font-medium text-foreground">{getDisplayName(getItemResource(selectedCategory, item), item)}</p>
          <p className="truncate font-mono text-[11px] text-muted-foreground">{getIdentifier(getItemResource(selectedCategory, item), item)}</p>
        </div>,
        <Badge key={`resource-${item.id}`} variant="outline" className="font-mono text-[9px] uppercase tracking-[0.12em]">
          {getItemLabel(selectedCategory, item)}
        </Badge>,
        <span key={`date-${item.id}`} className="font-mono text-xs tabular-nums text-muted-foreground">
          {formatDateTime(item.deleted_at)}
        </span>,
        <span key={`user-${item.id}`} className="block max-w-[150px] truncate font-mono text-xs text-foreground">
          {resolveUser(item.deleted_by_user_id, userMap)}
        </span>,
        <div key={`actions-${item.id}`} className="flex items-center justify-end gap-1.5">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 rounded-full px-2.5 font-mono text-[9px] uppercase tracking-[0.08em] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
            onClick={(event) => {
              event.stopPropagation();
              setRestoreTarget(item);
            }}
            disabled={actionLoading}
          >
            <RotateCcw className="mr-1 size-3 text-emerald-500" />
            Restore
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 rounded-full px-2.5 font-mono text-[9px] uppercase tracking-[0.08em] text-destructive hover:bg-destructive/10 hover:text-destructive transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
            onClick={(event) => {
              event.stopPropagation();
              setPurgeTarget(item);
              setPurgeConfirmInput("");
            }}
            disabled={actionLoading}
          >
            <Trash2 className="mr-1 size-3" />
            Purge
          </Button>
        </div>,
      ]),
    [rows, selectedIds, selectedCategory, userMap, actionLoading],
  );

  async function handleRestore(item: GenericItem) {
    if (!selectedCategory) return;
    setActionLoading(true);
    setError("");
    try {
      await apiFetch(`/${getItemResource(selectedCategory, item)}/${item.id}/restore`, {
        method: "POST",
        token,
      });
      setRestoreTarget(null);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
      setRows((prev) => prev.filter((row) => row.id !== item.id));
      setTotal((prev) => Math.max(0, prev - 1));
      setResultDialogTitle("Restore Berhasil");
      setResultDialogDescription(`Item "${getDisplayName(getItemResource(selectedCategory, item), item)}" berhasil dikembalikan ke data aktif.`);
      setResultDialogOpen(true);
    } catch (err) {
      const message = (err as Error).message || "Gagal restore data.";
      setError(message);
      setResultDialogTitle("Restore Gagal");
      setResultDialogDescription(message);
      setResultDialogOpen(true);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleBulkRestore() {
    if (!selectedCategory || selectedIds.size === 0) return;
    const selectedRowsList = rows.filter((row) => selectedIds.has(row.id));
    if (!selectedRowsList.length) return;

    setActionLoading(true);
    setError("");
    try {
      const results = await Promise.allSettled(
        selectedRowsList.map((row) =>
          apiFetch(`/${getItemResource(selectedCategory, row)}/${row.id}/restore`, {
            method: "POST",
            token,
          }),
        ),
      );

      const succeededIds = new Set<string>();
      let failCount = 0;

      results.forEach((res, index) => {
        if (res.status === "fulfilled") {
          succeededIds.add(selectedRowsList[index].id);
        } else {
          failCount += 1;
        }
      });

      setBulkRestoreOpen(false);
      if (succeededIds.size > 0) {
        setRows((prev) => prev.filter((row) => !succeededIds.has(row.id)));
        setTotal((prev) => Math.max(0, prev - succeededIds.size));
        setSelectedIds((prev) => {
          const next = new Set(prev);
          succeededIds.forEach((id) => next.delete(id));
          return next;
        });
      }

      if (failCount > 0) {
        setResultDialogTitle("Sebagian Restore Gagal");
        setResultDialogDescription(`${succeededIds.size} item berhasil direstore, ${failCount} item gagal.`);
      } else {
        setResultDialogTitle("Bulk Restore Berhasil");
        setResultDialogDescription(`${succeededIds.size} item berhasil dikembalikan ke list aktif.`);
      }
      setResultDialogOpen(true);
    } catch (err) {
      const message = (err as Error).message || "Gagal bulk restore.";
      setError(message);
      setResultDialogTitle("Bulk Restore Gagal");
      setResultDialogDescription(message);
      setResultDialogOpen(true);
    } finally {
      setActionLoading(false);
    }
  }

  async function handlePurge(item: GenericItem) {
    if (!selectedCategory) return;
    setActionLoading(true);
    setError("");
    try {
      await apiFetch(`/${getItemResource(selectedCategory, item)}/${item.id}/purge`, {
        method: "POST",
        body: JSON.stringify({ confirm: "PURGE" }),
        token,
      });
      setPurgeTarget(null);
      setPurgeConfirmInput("");
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
      setRows((prev) => prev.filter((row) => row.id !== item.id));
      setTotal((prev) => Math.max(0, prev - 1));
      setResultDialogTitle("Purge Berhasil");
      setResultDialogDescription(`Item "${getDisplayName(getItemResource(selectedCategory, item), item)}" berhasil dihapus permanen dari sistem.`);
      setResultDialogOpen(true);
    } catch (err) {
      const message = (err as Error).message || "Gagal purge permanen.";
      setError(message);
      setResultDialogTitle("Purge Gagal");
      setResultDialogDescription(message);
      setResultDialogOpen(true);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleBulkPurge() {
    if (!selectedCategory || selectedIds.size === 0) return;
    const selectedRowsList = rows.filter((row) => selectedIds.has(row.id));
    if (!selectedRowsList.length) return;

    setActionLoading(true);
    setError("");
    try {
      const items = selectedRowsList.map((row) => ({
        id: row.id,
        resource: getItemResource(selectedCategory, row),
      }));

      const response = await apiFetch<{
        data?: {
          purgedCount: number;
          failedCount: number;
          purgedIds: string[];
          errors?: Array<{ resource: string; error: string }>;
        };
        message?: string;
      }>("/trash/bulk-purge", {
        method: "POST",
        body: JSON.stringify({ items, confirm: "PURGE" }),
        token,
      });

      const purgedIdsSet = new Set(response.data?.purgedIds || selectedRowsList.map((r) => r.id));
      const purgedCount = response.data?.purgedCount ?? purgedIdsSet.size;

      setBulkPurgeOpen(false);
      setBulkPurgeConfirmInput("");
      setRows((prev) => prev.filter((row) => !purgedIdsSet.has(row.id)));
      setTotal((prev) => Math.max(0, prev - purgedCount));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        purgedIdsSet.forEach((id) => next.delete(id));
        return next;
      });

      setResultDialogTitle("Bulk Purge Berhasil");
      setResultDialogDescription(
        response.data?.failedCount
          ? `${purgedCount} item berhasil dihapus permanen, ${response.data.failedCount} item terkendala relasi.`
          : `${purgedCount} item berhasil dihapus permanen dari database.`,
      );
      setResultDialogOpen(true);
    } catch (err) {
      const message = (err as Error).message || "Gagal bulk purge permanen.";
      setError(message);
      setResultDialogTitle("Bulk Purge Gagal");
      setResultDialogDescription(message);
      setResultDialogOpen(true);
    } finally {
      setActionLoading(false);
    }
  }

  if (me.role !== "admin") {
    return (
      <div className="flex h-full items-center justify-center">
        <Card className="max-w-md rounded-2xl border border-border/60 bg-card p-2 shadow-xs glass-inset">
          <CardHeader>
            <CardTitle>Akses Terbatas</CardTitle>
            <CardDescription>Halaman Trash hanya tersedia untuk role admin.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full min-h-0 w-full">
      <div className="space-y-4 pr-3 pb-8">
        {/* Header Eyebrow & Title */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">SYSTEM / DATA ARCHIVE</p>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">Data Trash & Arsip</h1>
            <p className="text-xs text-muted-foreground">
              Pusat penampungan data terhapus (soft-delete). Item dapat dipulihkan atau dibersihkan permanen oleh Admin.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="font-mono text-[9px] uppercase tracking-[0.12em]">
              Admin Only
            </Badge>
            {activeFilterCount ? (
              <Badge variant="outline" className="font-mono text-[9px] uppercase tracking-[0.12em]">
                {activeFilterCount} filter aktif
              </Badge>
            ) : null}
          </div>
        </div>

        {/* Metric Summary Cards (Double-Bezel Architecture) */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-[1.5rem] border border-border/40 bg-muted/10 p-1 shadow-2xs dark:bg-white/[0.01]">
            <div className="flex items-center justify-between gap-3 rounded-[calc(1.5rem-0.25rem)] border border-border/60 bg-card glass-inset p-3.5">
              <div className="min-w-0">
                <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">Kategori Terpilih</p>
                <p className="mt-0.5 truncate font-mono text-xl font-semibold text-foreground">{selectedCategory.label}</p>
                <p className="truncate font-mono text-[11px] text-muted-foreground">
                  {selectedCategory.slug === ALL_TRASH_CATEGORY.slug ? "Semua Kategori" : selectedCategory.resource}
                </p>
              </div>
              <div className="shrink-0 rounded-xl border border-border/50 bg-muted/30 p-2 shadow-2xs">
                <Archive className="size-4 text-sky-500" />
              </div>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-border/40 bg-muted/10 p-1 shadow-2xs dark:bg-white/[0.01]">
            <div className="flex items-center justify-between gap-3 rounded-[calc(1.5rem-0.25rem)] border border-border/60 bg-card glass-inset p-3.5">
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">Total Arsip</p>
                <p className="mt-0.5 font-mono text-2xl font-semibold tabular-nums text-foreground">{total}</p>
                <p className="font-mono text-[11px] tabular-nums text-muted-foreground">{pageStart}-{pageEnd} tampil</p>
              </div>
              <div className="shrink-0 rounded-xl border border-border/50 bg-muted/30 p-2 shadow-2xs">
                <Trash2 className="size-4 text-amber-500" />
              </div>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-border/40 bg-muted/10 p-1 shadow-2xs dark:bg-white/[0.01]">
            <div className="flex items-center justify-between gap-3 rounded-[calc(1.5rem-0.25rem)] border border-border/60 bg-card glass-inset p-3.5">
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">Item Terpilih</p>
                <p className="mt-0.5 font-mono text-2xl font-semibold tabular-nums text-foreground">{selectedIds.size}</p>
                <p className="font-mono text-[11px] text-muted-foreground">
                  {selectedIds.size > 0 ? "Siap diproses" : "Belum ada item"}
                </p>
              </div>
              <div className="shrink-0 rounded-xl border border-border/50 bg-muted/30 p-2 shadow-2xs">
                <ShieldAlert className="size-4 text-blue-500" />
              </div>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-border/40 bg-muted/10 p-1 shadow-2xs dark:bg-white/[0.01]">
            <div className="flex items-center justify-between gap-3 rounded-[calc(1.5rem-0.25rem)] border border-border/60 bg-card glass-inset p-3.5">
              <div className="min-w-0">
                <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">Arsip Terakhir</p>
                <p className="mt-0.5 truncate font-mono text-xs font-semibold tabular-nums text-foreground">
                  {formatDateTime(latestDeletedAt)}
                </p>
                <p className="font-mono text-[11px] text-muted-foreground">Waktu arsip terbaru</p>
              </div>
              <div className="shrink-0 rounded-xl border border-border/50 bg-muted/30 p-2 shadow-2xs">
                <RotateCcw className="size-4 text-emerald-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Filter & Search Bar Container */}
        <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-xs glass-inset space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[240px_1fr_160px_auto_auto]">
            <div className="space-y-1">
              <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">Kategori Arsip</p>
              <Combobox
                value={selectedCategory.slug}
                onValueChange={(value) => {
                  setSelectedCategorySlug(value);
                  setPage(1);
                  setSelectedIds(new Set());
                }}
                options={TRASH_CATEGORIES.map((item) => ({ value: item.slug, label: item.label }))}
                placeholder="Pilih kategori"
                searchPlaceholder="Cari kategori..."
              />
            </div>

            <div className="space-y-1">
              <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">Pencarian Data</p>
              <Input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    setPage(1);
                    setSearch(searchInput.trim());
                  }
                }}
                placeholder="Cari nama, ID, kode, atau UUID..."
              />
            </div>

            <div className="space-y-1">
              <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">Baris Per Halaman</p>
              <Combobox
                value={String(limit)}
                onValueChange={(value) => {
                  setPage(1);
                  setLimit(Number(value));
                }}
                options={[
                  { value: "10", label: "10 baris" },
                  { value: "20", label: "20 baris" },
                  { value: "50", label: "50 baris" },
                ]}
                placeholder="Rows"
              />
            </div>

            <div className="flex items-end">
              <Button
                type="button"
                className="w-full sm:w-auto rounded-full font-mono text-[10px] uppercase tracking-[0.08em] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
                onClick={() => {
                  setPage(1);
                  setSearch(searchInput.trim());
                }}
              >
                <Search className="mr-1.5 size-3.5" />
                Terapkan
              </Button>
            </div>

            <div className="flex items-end">
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto rounded-full font-mono text-[10px] uppercase tracking-[0.08em] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
                onClick={() => {
                  setSelectedCategorySlug(ALL_TRASH_CATEGORY.slug);
                  setSearchInput("");
                  setSearch("");
                  setPage(1);
                  setSelectedIds(new Set());
                }}
                disabled={loading}
              >
                <X className="mr-1.5 size-3.5" />
                Reset
              </Button>
            </div>
          </div>

          {(searchParams.get("entity_type") || searchParams.get("entity_id")) ? (
            <Alert className="rounded-xl border-border/50 bg-muted/20">
              <Search className="size-4" />
              <AlertTitle className="font-mono text-xs uppercase tracking-wider">Preset Dari Halaman Sebelumnya</AlertTitle>
              <AlertDescription>
                <div className="mt-1 flex flex-wrap gap-2">
                  {searchParams.get("entity_type") ? (
                    <Badge variant="outline" className="font-mono text-[9px] uppercase">
                      entity: {searchParams.get("entity_type")}
                    </Badge>
                  ) : null}
                  {searchParams.get("entity_id") ? (
                    <Badge variant="outline" className="font-mono text-[9px] uppercase">
                      id: {searchParams.get("entity_id")}
                    </Badge>
                  ) : null}
                </div>
              </AlertDescription>
            </Alert>
          ) : null}
        </div>

        {/* Floating / Sticky Selection Bar (Double-Bezel Pattern) */}
        {selectedIds.size > 0 && (
          <div className="rounded-2xl border border-primary/40 bg-primary/5 p-1 shadow-xs animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[calc(1rem-0.25rem)] border border-primary/30 bg-card glass-inset px-4 py-2.5">
              <div className="flex items-center gap-2.5">
                <Badge variant="outline" className="border-primary/40 bg-primary/10 font-mono text-[9px] uppercase tracking-[0.12em] text-primary">
                  <span className="mr-1 font-semibold tabular-nums">{selectedIds.size}</span> item terpilih
                </Badge>
                <p className="hidden text-xs text-muted-foreground sm:inline">
                  Item terpilih siap direstore atau dihapus permanen.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="rounded-full font-mono text-[10px] uppercase tracking-[0.08em] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
                  disabled={actionLoading}
                  onClick={() => setBulkRestoreOpen(true)}
                >
                  <RotateCcw className="mr-1.5 size-3.5 text-emerald-500" />
                  Restore Terpilih
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  className="rounded-full font-mono text-[10px] uppercase tracking-[0.08em] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
                  disabled={actionLoading}
                  onClick={() => setBulkPurgeOpen(true)}
                >
                  <Trash2 className="mr-1.5 size-3.5" />
                  Purge Terpilih
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="rounded-full font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
                  onClick={() => setSelectedIds(new Set())}
                >
                  Batal
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Main Table Container */}
        <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-xs glass-inset space-y-4">
          {loading ? (
            <AppLoading label="Memuat data arsip..." />
          ) : error ? (
            <Alert variant="destructive" className="rounded-xl">
              <ShieldAlert className="size-4" />
              <AlertTitle>Gagal memuat trash</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : rows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/60 p-12 text-center">
              <Archive className="mx-auto mb-3 size-10 text-muted-foreground/60" />
              <p className="font-mono text-sm font-semibold uppercase tracking-wider text-foreground">Trash Kosong</p>
              <p className="mt-1 text-xs text-muted-foreground">Tidak ada data arsip untuk kategori dan pencarian ini.</p>
            </div>
          ) : (
            <SimpleTable
              headers={headers}
              rows={tableRows}
              tableLabel="Kolom Arsip Data"
              columnVisibilityLabel="Column"
              columnVisibilityLabels={columnVisibilityLabels}
              enableColumnVisibility
              enableSorting
              disableSortColumns={[0, 5]}
              rowContextMenu={(rowIndex) => {
                const row = rows[rowIndex];
                if (!row) return null;
                return (
                  <>
                    <ContextMenuLabel className="font-mono text-[9px] uppercase tracking-wider">Aksi Arsip</ContextMenuLabel>
                    <ContextMenuItem
                      onSelect={() =>
                        router.push(
                          `/audit-trail?entity_type=${encodeURIComponent(getItemResource(selectedCategory, row))}&entity_id=${encodeURIComponent(row.id)}`,
                        )
                      }
                    >
                      Lihat Audit Trail
                    </ContextMenuItem>
                    <ContextMenuItem onSelect={() => setRestoreTarget(row)}>
                      <RotateCcw className="mr-1.5 size-3.5 text-emerald-500" />
                      Restore
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem
                      className="text-destructive focus:text-destructive"
                      onSelect={() => {
                        setPurgeTarget(row);
                        setPurgeConfirmInput("");
                      }}
                    >
                      <Trash2 className="mr-1.5 size-3.5" />
                      Purge Permanen
                    </ContextMenuItem>
                  </>
                );
              }}
            />
          )}

          {/* Table Pagination */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/40 pt-3">
            <p className="font-mono text-xs tabular-nums text-muted-foreground">
              Menampilkan <span className="font-semibold text-foreground">{pageStart}</span>-
              <span className="font-semibold text-foreground">{pageEnd}</span> dari{" "}
              <span className="font-semibold text-foreground">{total}</span> item
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-full font-mono text-[10px] uppercase tracking-[0.08em] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
                disabled={page <= 1 || loading}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              >
                Prev
              </Button>
              <span className="font-mono text-xs tabular-nums text-muted-foreground">
                Page {page} of {Math.max(1, Math.ceil(total / limit))}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full font-mono text-[10px] uppercase tracking-[0.08em] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
                disabled={loading || page * limit >= total}
                onClick={() => setPage((prev) => prev + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Single Restore Dialog */}
      <AlertDialog open={Boolean(restoreTarget)} onOpenChange={(open) => !open && setRestoreTarget(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Restore data ini?</AlertDialogTitle>
            <AlertDialogDescription>Data terarsip akan dikembalikan ke list data aktif.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={actionLoading}
              className="rounded-full transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
            >
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={actionLoading || !restoreTarget}
              onClick={() => restoreTarget && void handleRestore(restoreTarget)}
              className="rounded-full transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
            >
              {actionLoading ? "Memproses..." : "Restore"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Restore Dialog */}
      <AlertDialog open={bulkRestoreOpen} onOpenChange={setBulkRestoreOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Restore item terpilih?</AlertDialogTitle>
            <AlertDialogDescription>
              {`Jumlah item: ${selectedIds.size}. Seluruh data ini akan dikembalikan ke status aktif.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={actionLoading}
              className="rounded-full transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
            >
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={actionLoading || selectedIds.size === 0}
              onClick={() => void handleBulkRestore()}
              className="rounded-full transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
            >
              {actionLoading ? "Memproses..." : "Restore Selected"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Single Purge Dialog */}
      <AlertDialog
        open={Boolean(purgeTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setPurgeTarget(null);
            setPurgeConfirmInput("");
          }
        }}
      >
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Purge permanen data ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Data akan dihapus secara permanen dari database dan tidak bisa dipulihkan kembali.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-3.5 py-2.5 text-sm">
            <p className="font-mono text-[9px] uppercase tracking-wider text-destructive font-semibold">Aksi Permanen</p>
            <p className="mt-0.5 text-muted-foreground">
              Item: <span className="font-medium text-foreground">{purgeTarget ? getDisplayName(getItemResource(selectedCategory, purgeTarget), purgeTarget) : "-"}</span>
            </p>
          </div>
          <div className="space-y-1.5">
            <Input
              value={purgeConfirmInput}
              onChange={(event) => setPurgeConfirmInput(event.target.value)}
              placeholder="Ketik PURGE"
              autoComplete="off"
              className="font-mono uppercase"
            />
            <p className={`font-mono text-xs ${singlePurgeReady ? "text-emerald-600 font-medium" : "text-muted-foreground"}`}>
              Ketik tepat <span className="font-bold">PURGE</span> untuk mengaktifkan tombol konfirmasi.
            </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={actionLoading}
              className="rounded-full transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
            >
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={actionLoading || !purgeTarget || !singlePurgeReady}
              onClick={() => purgeTarget && void handlePurge(purgeTarget)}
              className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
            >
              {actionLoading ? "Memproses..." : "Purge Permanen"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Purge Dialog */}
      <AlertDialog
        open={bulkPurgeOpen}
        onOpenChange={(open) => {
          setBulkPurgeOpen(open);
          if (!open) setBulkPurgeConfirmInput("");
        }}
      >
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Purge permanen item terpilih?</AlertDialogTitle>
            <AlertDialogDescription>
              Hapus permanen seluruh item terpilih dari sistem secara atomik. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-3.5 py-2.5 text-sm">
            <p className="font-mono text-[9px] uppercase tracking-wider text-destructive font-semibold">Aksi Permanen</p>
            <p className="mt-0.5 text-muted-foreground">
              Jumlah item terpilih: <span className="font-mono font-bold tabular-nums text-foreground">{selectedIds.size}</span> item
            </p>
          </div>
          <div className="space-y-1.5">
            <Input
              value={bulkPurgeConfirmInput}
              onChange={(event) => setBulkPurgeConfirmInput(event.target.value)}
              placeholder="Ketik PURGE"
              autoComplete="off"
              className="font-mono uppercase"
            />
            <p className={`font-mono text-xs ${bulkPurgeReady ? "text-emerald-600 font-medium" : "text-muted-foreground"}`}>
              Ketik tepat <span className="font-bold">PURGE</span> untuk mengaktifkan tombol konfirmasi.
            </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={actionLoading}
              className="rounded-full transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
            >
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={actionLoading || selectedIds.size === 0 || !bulkPurgeReady}
              onClick={() => void handleBulkPurge()}
              className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
            >
              {actionLoading ? "Memproses..." : "Purge Selected"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ResponseDialog
        open={resultDialogOpen}
        title={resultDialogTitle}
        description={resultDialogDescription}
        variant={resultDialogTitle.toLowerCase().includes("gagal") ? "error" : "success"}
        actionLabel="OK"
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
  if (resource === "devices") return pick(item, ["device_id", "device_code"]);
  if (resource === "devicePorts") return pick(item, ["port_id", "port_label", "port_index"]);
  if (resource === "regions") return pick(item, ["region_id"]);
  if (resource === "deviceTypes") return pick(item, ["device_type_key"]);
  if (resource === "popTypes") return pick(item, ["pop_type_code"]);
  if (resource === "manufacturers") return pick(item, ["manufacturer_code"]);
  if (resource === "brands") return pick(item, ["brand_code"]);
  if (resource === "assetModels") return pick(item, ["model_code"]);
  if (resource === "provinces") return pick(item, ["province_name"]);
  if (resource === "cities") return pick(item, ["city_code"]);
  if (resource === "routeTypes") return pick(item, ["route_type_code"]);
  if (resource === "odpTypes") return pick(item, ["odp_type_code"]);
  if (resource === "cableTypes") return pick(item, ["cable_type_code"]);
  if (resource === "closureTypes") return pick(item, ["closure_type_code"]);
  if (resource === "coreCapacities") return pick(item, ["core_capacity_id", "core_capacity_value"]);
  if (resource === "deviceCoreCapacities") return pick(item, ["device_core_capacity_id", "core_capacity_value"]);
  if (resource === "tenants") return pick(item, ["tenant_code"]);
  if (resource === "installationTypes") return pick(item, ["installation_type_code"]);
  if (resource === "serviceTypes") return pick(item, ["service_type_code"]);
  return pick(item, ["id"]);
}

function getDisplayName(resource: string, item: GenericItem) {
  if (resource === "devices") return pick(item, ["device_name", "device_id", "device_code"]);
  if (resource === "devicePorts") return pick(item, ["port_label", "port_id", "port_index"]);
  if (resource === "regions") return pick(item, ["region_name"]);
  if (resource === "deviceTypes") return pick(item, ["device_type_name", "device_type_key"]);
  if (resource === "popTypes") return pick(item, ["pop_type_name", "pop_type_code"]);
  if (resource === "manufacturers") return pick(item, ["manufacturer_name", "manufacturer_code"]);
  if (resource === "brands") return pick(item, ["brand_name", "brand_code"]);
  if (resource === "assetModels") return pick(item, ["model_name", "model_code"]);
  if (resource === "provinces") return pick(item, ["province_name"]);
  if (resource === "cities") return pick(item, ["city_name", "city_code"]);
  if (resource === "routeTypes") return pick(item, ["route_type_name", "route_type_code"]);
  if (resource === "odpTypes") return pick(item, ["odp_type_name", "odp_type_code"]);
  if (resource === "cableTypes") return pick(item, ["cable_type_name", "cable_type_code"]);
  if (resource === "closureTypes") return pick(item, ["closure_type_name", "closure_type_code"]);
  if (resource === "coreCapacities") return pick(item, ["label", "description", "core_capacity_value"]);
  if (resource === "deviceCoreCapacities") return pick(item, ["label", "description", "core_capacity_value"]);
  if (resource === "tenants") return pick(item, ["tenant_name", "tenant_code"]);
  if (resource === "installationTypes") return pick(item, ["installation_type_name", "installation_type_code"]);
  if (resource === "serviceTypes") return pick(item, ["service_type_name", "service_type_code"]);
  return pick(item, ["id"]);
}

function resolveUser(id: unknown, userMap: Record<string, string>) {
  if (id === null || id === undefined) return "-";
  const key = String(id).trim();
  if (!key) return "-";
  return userMap[key] || key;
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
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getTimeValue(value?: string | null) {
  if (!value) return 0;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}
