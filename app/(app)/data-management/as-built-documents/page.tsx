"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, RefreshCcw } from "lucide-react";
import { AppLoading } from "@/components/app-loading-new";
import { useSession } from "@/components/session-context";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { API_BASE_URL, apiFetch, type PaginatedResponse, type RegionsListResponse } from "@/lib/api";
import { getRegionLabel } from "@/lib/relation-labels";

type AsBuiltDocumentRow = {
  id: string;
  document_id?: string | null;
  region_id?: string | null;
  project_id?: string | null;
  route_id?: string | null;
  start_device_id?: string | null;
  end_device_id?: string | null;
  title: string;
  revision_code?: string | null;
  status?: string | null;
  primary_format?: string | null;
  generated_at?: string | null;
  prepared_by_name?: string | null;
  checked_by_name?: string | null;
  approved_by_name?: string | null;
  created_by_user_id?: string | null;
  attachment_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

const STATUS_OPTIONS = [
  { value: "__all__", label: "Semua Status" },
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "superseded", label: "Superseded" },
  { value: "archived", label: "Archived" },
];

const FORMAT_OPTIONS = [
  { value: "__all__", label: "Semua Format" },
  { value: "svg", label: "SVG" },
  { value: "png", label: "PNG" },
  { value: "pdf", label: "PDF" },
  { value: "json", label: "JSON" },
];

export default function AsBuiltDocumentsPage() {
  const { token, me } = useSession();
  const [rows, setRows] = useState<AsBuiltDocumentRow[]>([]);
  const [regions, setRegions] = useState<RegionsListResponse["data"]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [regionId, setRegionId] = useState("__all__");
  const [status, setStatus] = useState("__all__");
  const [format, setFormat] = useState("__all__");
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [actionTarget, setActionTarget] = useState<{
    row: AsBuiltDocumentRow;
    nextStatus: "published" | "superseded" | "archived";
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        const payload = await apiFetch<RegionsListResponse>("/regions?page=1&limit=200", { token });
        if (cancelled) return;
        setRegions(payload.data || []);
      } catch {
        if (!cancelled) setRegions([]);
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError("");
      setActionError("");
      try {
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("limit", String(limit));
        if (q.trim()) params.set("q", q.trim());
        if (regionId !== "__all__") params.set("region_id", regionId);
        if (status !== "__all__") params.set("status", status);
        if (format !== "__all__") params.set("primary_format", format);
        if (me.role === "user_region" && me.app_user.default_region_id && regionId === "__all__") {
          params.set("region_id", me.app_user.default_region_id);
        }

        const payload = await apiFetch<PaginatedResponse<AsBuiltDocumentRow>>(`/asBuiltDocuments?${params.toString()}`, { token });
        if (cancelled) return;
        setRows(payload.data || []);
        setTotal(payload.meta?.total || 0);
      } catch (err) {
        if (cancelled) return;
        setRows([]);
        setTotal(0);
        setError((err as Error).message || "Gagal memuat daftar as-built documents.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [token, page, limit, q, regionId, status, format, me.role, me.app_user.default_region_id, refreshNonce]);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const regionOptions = useMemo(
    () => [{ value: "__all__", label: "Semua Region" }, ...regions.map((item) => ({ value: item.id, label: `${item.region_name} (${item.region_id})` }))],
    [regions],
  );
  const regionNameMap = useMemo(() => {
    const map = new Map<string, string>();
    regions.forEach((item) => map.set(item.id, item.region_name));
    return map;
  }, [regions]);

  async function handleDownload(row: AsBuiltDocumentRow) {
    if (!row.attachment_id) return;
    const response = await fetch(`${API_BASE_URL}/attachments/${row.attachment_id}/download`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      throw new Error(`Download gagal (${response.status})`);
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const ext = (row.primary_format || "bin").toLowerCase();
    anchor.href = url;
    anchor.download = `${(row.document_id || row.id || "as-built").trim()}.${ext}`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  function handleResetFilters() {
    setQ("");
    setRegionId("__all__");
    setStatus("__all__");
    setFormat("__all__");
    setPage(1);
  }

  async function handleStatusActionConfirm() {
    if (!actionTarget) return;
    setUpdatingStatus(true);
    setActionError("");
    setActionSuccess("");
    try {
      const payload: Record<string, unknown> = {
        status: actionTarget.nextStatus,
      };

      if (actionTarget.nextStatus === "published") {
        if (!actionTarget.row.checked_by_name?.trim()) payload.checked_by_name = me.app_user.full_name || me.app_user.email;
        if (!actionTarget.row.approved_by_name?.trim()) payload.approved_by_name = me.app_user.full_name || me.app_user.email;
      }

      await apiFetch(`/asBuiltDocuments/${encodeURIComponent(actionTarget.row.id)}`, {
        method: "PATCH",
        token,
        body: payload,
      });

      setActionTarget(null);
      setActionSuccess(`Status dokumen ${actionTarget.row.document_id || actionTarget.row.id} diubah ke ${actionTarget.nextStatus}.`);
      setRefreshNonce((prev) => prev + 1);
    } catch (err) {
      setActionError((err as Error).message || "Gagal mengubah status dokumen.");
    } finally {
      setUpdatingStatus(false);
    }
  }

  function canShowAction(currentStatus: string | undefined | null, nextStatus: "published" | "superseded" | "archived") {
    const statusValue = String(currentStatus || "").toLowerCase();
    if (nextStatus === "published") return statusValue === "draft";
    if (nextStatus === "superseded") return statusValue === "published";
    if (nextStatus === "archived") return statusValue === "draft" || statusValue === "published" || statusValue === "superseded";
    return false;
  }

  return (
    <ScrollArea className="h-full min-h-0 w-full">
      <div className="space-y-4 pr-3">
        <section className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight">As-Built Documents</h2>
          <p className="text-sm text-muted-foreground">Daftar dokumen hasil export As-Built yang tersimpan di backend dan siap diunduh ulang.</p>
        </section>

        <Card>
          <CardHeader className="px-4 py-3">
            <CardTitle className="text-base">Filters</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-2 px-4 pb-4 pt-0 md:grid-cols-5">
            <Input
              value={q}
              onChange={(event) => {
                setQ(event.target.value);
                setPage(1);
              }}
              placeholder="Cari title/document id..."
            />
            <Combobox
              value={regionId}
              onValueChange={(value) => {
                setRegionId(value || "__all__");
                setPage(1);
              }}
              options={regionOptions}
              placeholder="Pilih region"
              searchPlaceholder="Cari region..."
            />
            <Combobox
              value={status}
              onValueChange={(value) => {
                setStatus(value || "__all__");
                setPage(1);
              }}
              options={STATUS_OPTIONS}
              placeholder="Pilih status"
              searchPlaceholder="Cari status..."
            />
            <Combobox
              value={format}
              onValueChange={(value) => {
                setFormat(value || "__all__");
                setPage(1);
              }}
              options={FORMAT_OPTIONS}
              placeholder="Pilih format"
              searchPlaceholder="Cari format..."
            />
            <Button type="button" variant="outline" onClick={handleResetFilters}>
              <RefreshCcw className="mr-1 size-4" />
              Reset
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-base">Documents ({total.toLocaleString("id-ID")})</CardTitle>
              <p className="text-xs text-muted-foreground">
                Page {page} / {totalPages}
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 px-4 pb-4 pt-0">
            {loading ? <AppLoading label="Memuat daftar as-built documents..." /> : null}
            {!loading && error ? <AppLoading label={error} variant="error" /> : null}
            {!loading && actionSuccess ? <p className="text-sm text-emerald-600">{actionSuccess}</p> : null}
            {!loading && actionError ? <p className="text-sm text-destructive">{actionError}</p> : null}
            {!loading && !error ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document</TableHead>
                    <TableHead>Region</TableHead>
                    <TableHead>Revision</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Format</TableHead>
                    <TableHead>Generated</TableHead>
                    <TableHead>Prepared</TableHead>
                    <TableHead className="w-[320px]">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{row.title || "-"}</p>
                          <p className="truncate text-xs text-muted-foreground">{row.document_id || row.id}</p>
                        </div>
                      </TableCell>
                      <TableCell>{getRegionLabel({ fallback: row.region_id ? regionNameMap.get(row.region_id) || row.region_id : "", optional: true })}</TableCell>
                      <TableCell>{row.revision_code || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={row.status === "published" ? "secondary" : "outline"}>{(row.status || "-").toUpperCase()}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{(row.primary_format || "-").toUpperCase()}</Badge>
                      </TableCell>
                      <TableCell>{formatDateTime(row.generated_at || row.created_at)}</TableCell>
                      <TableCell>{row.prepared_by_name || "-"}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1.5">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={!row.attachment_id}
                            onClick={() => {
                              void handleDownload(row);
                            }}
                          >
                            <Download className="mr-1 size-4" />
                            Download
                          </Button>
                          {canShowAction(row.status, "published") ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              onClick={() => setActionTarget({ row, nextStatus: "published" })}
                            >
                              Publish
                            </Button>
                          ) : null}
                          {canShowAction(row.status, "superseded") ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => setActionTarget({ row, nextStatus: "superseded" })}
                            >
                              Supersede
                            </Button>
                          ) : null}
                          {canShowAction(row.status, "archived") ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => setActionTarget({ row, nextStatus: "archived" })}
                            >
                              Archive
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!rows.length ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-6 text-center text-sm text-muted-foreground">
                        Belum ada dokumen yang tersimpan.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            ) : null}

            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page <= 1 || loading}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              >
                Prev
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              >
                Next
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      <AlertDialog open={Boolean(actionTarget)} onOpenChange={(nextOpen) => (nextOpen ? undefined : setActionTarget(null))}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Ubah Status</AlertDialogTitle>
            <AlertDialogDescription>
              {actionTarget
                ? `Dokumen ${actionTarget.row.document_id || actionTarget.row.id} akan diubah ke status ${actionTarget.nextStatus}.`
                : "Pilih aksi status dokumen."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={updatingStatus}>Batal</AlertDialogCancel>
            <AlertDialogAction disabled={updatingStatus} onClick={() => void handleStatusActionConfirm()}>
              {updatingStatus ? "Memproses..." : "Lanjutkan"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
