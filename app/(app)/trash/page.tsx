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
import { Separator } from "@/components/ui/separator";
import { useSession } from "@/components/session-context";
import { apiFetch, type PaginatedResponse } from "@/lib/api";
import { MASTER_DATA_CATEGORIES } from "@/lib/data-management-config";

type TrashCategory = {
  slug: string;
  label: string;
  resource: string;
};

const ALL_TRASH_CATEGORY: TrashCategory = { slug: "all", label: "All", resource: "all" };

const TRASH_RESOURCE_CATEGORIES: TrashCategory[] = [
  { slug: "trash-devices", label: "Devices", resource: "devices" },
  { slug: "trash-device-ports", label: "Device Ports", resource: "devicePorts" },
  ...MASTER_DATA_CATEGORIES.map((item) => ({
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
      const matchedCategory = TRASH_RESOURCE_CATEGORIES.find((item) => item.resource.toLowerCase() === normalizedEntityType.toLowerCase());
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
        if (!cancelled) setError((err as Error).message || "Gagal memuat trash data.");
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
        <span className="sr-only">Pilih</span>
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
    () => [selectAllHeader, "Data", "Kategori", "Dihapus Pada", "Dihapus Oleh"],
    [selectAllHeader],
  );
  const columnVisibilityLabels = useMemo(
    () => ["Pilih", "Data", "Kategori", "Dihapus Pada", "Dihapus Oleh"],
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
          <p className="truncate font-medium">{getDisplayName(getItemResource(selectedCategory, item), item)}</p>
          <p className="truncate text-xs text-muted-foreground">{getIdentifier(getItemResource(selectedCategory, item), item)}</p>
        </div>,
        <Badge key={`resource-${item.id}`} variant="outline" className="font-normal">
          {getItemLabel(selectedCategory, item)}
        </Badge>,
        formatDateTime(item.deleted_at),
        resolveUser(item.deleted_by_user_id, userMap),
      ]),
    [rows, selectedIds, selectedCategory, userMap],
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
      setResultDialogDescription(`Item ${getDisplayName(getItemResource(selectedCategory, item), item)} berhasil direstore.`);
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
    const selectedRows = rows.filter((row) => selectedIds.has(row.id));
    if (!selectedRows.length) return;

    setActionLoading(true);
    setError("");
    try {
      await Promise.all(
        selectedRows.map((row) =>
          apiFetch(`/${getItemResource(selectedCategory, row)}/${row.id}/restore`, {
            method: "POST",
            token,
          }),
        ),
      );
      setBulkRestoreOpen(false);
      setRows((prev) => prev.filter((row) => !selectedIds.has(row.id)));
      setTotal((prev) => Math.max(0, prev - selectedRows.length));
      setSelectedIds(new Set());
      setResultDialogTitle("Bulk Restore Berhasil");
      setResultDialogDescription(`${selectedRows.length} item berhasil direstore.`);
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
      setResultDialogDescription(`Item ${getDisplayName(getItemResource(selectedCategory, item), item)} berhasil dihapus permanen.`);
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
    const selectedRows = rows.filter((row) => selectedIds.has(row.id));
    if (!selectedRows.length) return;

    setActionLoading(true);
    setError("");
    try {
      await Promise.all(
        selectedRows.map((row) =>
          apiFetch(`/${getItemResource(selectedCategory, row)}/${row.id}/purge`, {
            method: "POST",
            body: JSON.stringify({ confirm: "PURGE" }),
            token,
          }),
        ),
      );
      setBulkPurgeOpen(false);
      setBulkPurgeConfirmInput("");
      setRows((prev) => prev.filter((row) => !selectedIds.has(row.id)));
      setTotal((prev) => Math.max(0, prev - selectedRows.length));
      setSelectedIds(new Set());
      setResultDialogTitle("Bulk Purge Berhasil");
      setResultDialogDescription(`${selectedRows.length} item berhasil dihapus permanen.`);
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
        <Card className="max-w-md">
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
      <div className="space-y-4 pr-3">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Card>
            <CardContent className="p-3">
              <p className="text-xs uppercase text-muted-foreground">Kategori</p>
              <p className="mt-1 text-lg font-semibold">{selectedCategory.label}</p>
              <p className="text-xs text-muted-foreground">
                {selectedCategory.slug === ALL_TRASH_CATEGORY.slug ? "Semua kategori trash" : selectedCategory.resource}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <p className="text-xs uppercase text-muted-foreground">Total Arsip</p>
              <p className="mt-1 text-lg font-semibold">{total}</p>
              <p className="text-xs text-muted-foreground">{pageStart}-{pageEnd} tampil</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <p className="text-xs uppercase text-muted-foreground">Item Terpilih</p>
              <p className="mt-1 text-lg font-semibold">{selectedIds.size}</p>
              <p className="text-xs text-muted-foreground">Terakhir: {formatDateTime(latestDeletedAt)}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Archive className="size-4" />
                  Arsip Data
                </CardTitle>
                <CardDescription>Pilih kategori, cari item, lalu restore atau purge dari menu aksi.</CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">Admin Only</Badge>
                {activeFilterCount ? <Badge variant="outline">{activeFilterCount} filter aktif</Badge> : null}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[220px_1fr_160px_auto_auto]">
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
                placeholder="Rows"
              />
              <Button
                type="button"
                onClick={() => {
                  setPage(1);
                  setSearch(searchInput.trim());
                }}
              >
                <Search className="mr-1 size-4" />
                Terapkan
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSelectedCategorySlug(ALL_TRASH_CATEGORY.slug);
                  setSearchInput("");
                  setSearch("");
                  setPage(1);
                  setSelectedIds(new Set());
                }}
                disabled={loading}
              >
                <X className="mr-1 size-4" />
                Reset
              </Button>
            </div>
            {(searchParams.get("entity_type") || searchParams.get("entity_id")) ? (
              <Alert>
                <Search className="size-4" />
                <AlertTitle>Preset dari halaman sebelumnya</AlertTitle>
                <AlertDescription>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {searchParams.get("entity_type") ? <Badge variant="outline">entity: {searchParams.get("entity_type")}</Badge> : null}
                    {searchParams.get("entity_id") ? <Badge variant="outline">id: {searchParams.get("entity_id")}</Badge> : null}
                  </div>
                </AlertDescription>
              </Alert>
            ) : null}

            <Separator />

            <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/20 px-3 py-2 text-sm">
              <div className="space-y-0.5">
                <p className="font-medium">Bulk Action</p>
                <p className="text-xs text-muted-foreground">
                  {selectedIds.size ? `${selectedIds.size} item siap diproses` : "Pilih item dari tabel untuk bulk restore atau purge."}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={selectedIds.size === 0 || actionLoading}
                  onClick={() => setBulkRestoreOpen(true)}
                >
                  <RotateCcw className="mr-1 size-4" />
                  Restore
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={selectedIds.size === 0 || actionLoading}
                  onClick={() => setBulkPurgeOpen(true)}
                >
                  <Trash2 className="mr-1 size-4" />
                  Purge
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())} disabled={selectedIds.size === 0}>
                  Clear
                </Button>
              </div>
            </div>

            {selectedRows.length ? (
              <div className="flex flex-wrap gap-1.5">
                {selectedRows.slice(0, 4).map((row) => (
                  <Badge key={row.id} variant="secondary" className="max-w-60 truncate font-normal">
                    {getDisplayName(getItemResource(selectedCategory, row), row)}
                  </Badge>
                ))}
                {selectedRows.length > 4 ? <Badge variant="outline">+{selectedRows.length - 4}</Badge> : null}
              </div>
            ) : null}

            {loading ? (
              <AppLoading label="Memuat data trash..." />
            ) : error ? (
              <Alert variant="destructive">
                <ShieldAlert className="size-4" />
                <AlertTitle>Gagal memuat trash</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : rows.length === 0 ? (
              <div className="rounded-md border border-dashed p-8 text-center">
                <Archive className="mx-auto mb-2 size-8 text-muted-foreground" />
                <p className="font-medium">Trash kosong untuk filter ini.</p>
                <p className="mt-1 text-sm text-muted-foreground">Ubah kategori atau kosongkan pencarian untuk melihat data arsip lain.</p>
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
                disableSortColumns={[0]}
                rowContextMenu={(rowIndex) => {
                  const row = rows[rowIndex];
                  if (!row) return null;
                  return (
                    <>
                      <ContextMenuLabel>Trash Actions</ContextMenuLabel>
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
                        <RotateCcw className="mr-1 size-4" />
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
                        <Trash2 className="mr-1 size-4" />
                        Purge Permanen
                      </ContextMenuItem>
                    </>
                  );
                }}
              />
            )}

            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">
                Menampilkan {pageStart}-{pageEnd} dari {total}
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => setPage((prev) => Math.max(1, prev - 1))}>
                  Prev
                </Button>
                <span className="text-sm text-muted-foreground">Page {page}</span>
                <Button variant="outline" size="sm" disabled={loading || page * limit >= total} onClick={() => setPage((prev) => prev + 1)}>
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={Boolean(restoreTarget)} onOpenChange={(open) => !open && setRestoreTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore data ini?</AlertDialogTitle>
            <AlertDialogDescription>Data terarsip akan dikembalikan ke list aktif.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Batal</AlertDialogCancel>
            <AlertDialogAction disabled={actionLoading || !restoreTarget} onClick={() => restoreTarget && void handleRestore(restoreTarget)}>
              {actionLoading ? "Memproses..." : "Restore"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkRestoreOpen} onOpenChange={setBulkRestoreOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore item terpilih?</AlertDialogTitle>
            <AlertDialogDescription>{`Jumlah item: ${selectedIds.size}. Semua data ini akan dikembalikan ke list aktif.`}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Batal</AlertDialogCancel>
            <AlertDialogAction disabled={actionLoading || selectedIds.size === 0} onClick={() => void handleBulkRestore()}>
              {actionLoading ? "Memproses..." : "Restore Selected"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(purgeTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setPurgeTarget(null);
            setPurgeConfirmInput("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Purge permanen data ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Data akan dihapus permanen dari sistem dan tidak bisa dipulihkan lagi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm">
            <p className="font-medium text-destructive">Aksi permanen</p>
            <p className="text-muted-foreground">
              Item: <span className="font-medium">{purgeTarget ? getDisplayName(getItemResource(selectedCategory, purgeTarget), purgeTarget) : "-"}</span>
            </p>
          </div>
          <Input
            value={purgeConfirmInput}
            onChange={(event) => setPurgeConfirmInput(event.target.value)}
            placeholder="Ketik PURGE"
            autoComplete="off"
          />
          <p className={`text-xs ${singlePurgeReady ? "text-emerald-600" : "text-muted-foreground"}`}>
            Ketik tepat <span className="font-semibold">PURGE</span> untuk mengaktifkan tombol konfirmasi.
          </p>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Batal</AlertDialogCancel>
            <AlertDialogAction
              disabled={actionLoading || !purgeTarget || !singlePurgeReady}
              onClick={() => purgeTarget && void handlePurge(purgeTarget)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {actionLoading ? "Memproses..." : "Purge Permanen"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={bulkPurgeOpen}
        onOpenChange={(open) => {
          setBulkPurgeOpen(open);
          if (!open) setBulkPurgeConfirmInput("");
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Purge permanen item terpilih?</AlertDialogTitle>
            <AlertDialogDescription>
              Hapus permanen seluruh item terpilih dari sistem. Tindakan ini tidak bisa dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm">
            <p className="font-medium text-destructive">Aksi permanen</p>
            <p className="text-muted-foreground">
              Jumlah item terpilih: <span className="font-medium">{selectedIds.size}</span>
            </p>
          </div>
          <Input
            value={bulkPurgeConfirmInput}
            onChange={(event) => setBulkPurgeConfirmInput(event.target.value)}
            placeholder="Ketik PURGE"
            autoComplete="off"
          />
          <p className={`text-xs ${bulkPurgeReady ? "text-emerald-600" : "text-muted-foreground"}`}>
            Ketik tepat <span className="font-semibold">PURGE</span> untuk mengaktifkan tombol konfirmasi.
          </p>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Batal</AlertDialogCancel>
            <AlertDialogAction
              disabled={actionLoading || selectedIds.size === 0 || !bulkPurgeReady}
              onClick={() => void handleBulkPurge()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
