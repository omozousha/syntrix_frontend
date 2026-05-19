"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, RefreshCw, X } from "lucide-react";
import { AppLoading } from "@/components/app-loading-new";
import { ResponseDialog } from "@/components/response-dialog";
import { useSession } from "@/components/session-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiFetch } from "@/lib/api";
import { downloadAttachmentFile, fetchAttachmentBlob, resolveAttachment } from "@/lib/attachment-utils";
import { mapValidationStatus } from "@/lib/validation-status";

type QueueType = "adminregion" | "superadmin";
type RequestStatus =
  | "ongoing_validated"
  | "pending_async"
  | "validated"
  | "rejected_by_adminregion"
  | "rejected_by_superadmin"
  | "unvalidated";

type ValidationRequestItem = {
  id: string;
  request_id?: string | null;
  entity_id?: string | null;
  region_id?: string | null;
  submitted_by_user_id?: string | null;
  current_status?: RequestStatus | null;
  payload_snapshot?: {
    source?: string;
    operation?: string;
    resource_name?: string;
    resource_label?: string;
    resource_payload?: Record<string, unknown>;
    before?: Record<string, unknown>;
    device?: Record<string, unknown>;
    field_validation?: Record<string, unknown>;
    field_inspection?: Record<string, unknown>;
    port_summary?: Record<string, unknown>;
    pop?: Record<string, unknown>;
    route?: Record<string, unknown>;
    project?: Record<string, unknown>;
    device_ports?: Array<Record<string, unknown>>;
  } | null;
  evidence_attachments?: Array<{ id?: string; attachment_id?: string; name?: string } | string> | null;
  checklist?: Record<string, boolean> | null;
  finding_note?: string | null;
  adminregion_review_note?: string | null;
  superadmin_review_note?: string | null;
  updated_at?: string | null;
};
type EvidenceRef = {
  key: string;
  candidates: string[];
  available: boolean;
};
type LookupLabels = {
  regions: Record<string, string>;
  pops: Record<string, string>;
  projects: Record<string, string>;
};
type ReviewViewerRole = "adminregion" | "superadmin";
type RequestTypeFilter = "all" | "create_asset" | "update_asset" | "archive_asset" | "field_validation";
type RequestStatusFilter = "all" | RequestStatus;
type ReviewContext = {
  viewerRole: ReviewViewerRole;
  stageLabel: string;
  stageTitle: string;
  stageDescription: string;
  ownerLabel: string;
  approveLabel: string;
  rejectLabel: string;
  rejectDialogTitle: string;
  rejectDialogDescription: string;
  toneClassName: string;
};
export default function ValidationRequestsPage() {
  const { token, me } = useSession();
  const normalizedRole = normalizeRole(me.role);
  const canAdminRegionQueue = normalizedRole === "adminregion";
  const canSuperAdminQueue = normalizedRole === "superadmin";
  const activeQueue: QueueType = canAdminRegionQueue ? "adminregion" : "superadmin";
  const [items, setItems] = useState<ValidationRequestItem[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [typeFilter, setTypeFilter] = useState<RequestTypeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<RequestStatusFilter>("all");
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectNote, setRejectNote] = useState("");
  const [rejectError, setRejectError] = useState("");
  const [resultDialogOpen, setResultDialogOpen] = useState(false);
  const [resultDialogTitle, setResultDialogTitle] = useState("");
  const [resultDialogDescription, setResultDialogDescription] = useState("");
  const [evidencePreviewOpen, setEvidencePreviewOpen] = useState(false);
  const [evidencePreviewUrl, setEvidencePreviewUrl] = useState("");
  const [evidencePreviewLabel, setEvidencePreviewLabel] = useState("");
  const [evidenceThumbUrls, setEvidenceThumbUrls] = useState<Record<string, string>>({});
  const [lookupLabels, setLookupLabels] = useState<LookupLabels>({ regions: {}, pops: {}, projects: {} });

  const filteredItems = useMemo(
    () =>
      items.filter((item) => {
        const requestType = getRequestType(item);
        const matchesType = typeFilter === "all" || requestType.kind === typeFilter;
        const matchesStatus = statusFilter === "all" || item.current_status === statusFilter;
        return matchesType && matchesStatus;
      }),
    [items, statusFilter, typeFilter],
  );
  const selected = useMemo(
    () => filteredItems.find((item) => item.id === selectedId) || filteredItems[0] || null,
    [filteredItems, selectedId],
  );
  const queueSummary = useMemo(() => buildQueueSummary(items), [items]);
  const selectedType = getRequestType(selected);
  const evidenceRefs = useMemo(() => normalizeEvidenceRefs(selected?.evidence_attachments), [selected]);
  const attachmentLabel = selectedType.kind === "field_validation" ? "Evidence" : "Attachment";
  const isAdminRegionView = activeQueue === "adminregion";
  const isRejectedBySuperadmin = selected?.current_status === "rejected_by_superadmin";
  const reviewContext = useMemo(
    () => getReviewContext(activeQueue, selectedType, selected?.current_status),
    [activeQueue, selectedType, selected?.current_status],
  );

  useEffect(() => {
    if (!token || evidenceRefs.length === 0) {
      setEvidenceThumbUrls({});
      return;
    }

    let cancelled = false;
    const objectUrls: string[] = [];

    async function loadThumbs() {
      const next: Record<string, string> = {};
      for (const ref of evidenceRefs) {
        const resolved = await resolveAttachmentCandidates(ref.candidates, token);
        for (const candidate of resolved) {
          try {
            const { blob } = await fetchAttachmentBlob(candidate, token, "preview");
            const url = URL.createObjectURL(blob);
            objectUrls.push(url);
            next[ref.key] = url;
            break;
          } catch {
            // try next
          }
        }
      }
      if (!cancelled) setEvidenceThumbUrls(next);
    }

    void loadThumbs();
    return () => {
      cancelled = true;
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [evidenceRefs, token]);

  useEffect(() => {
    if (!canAdminRegionQueue && !canSuperAdminQueue) return;
    void loadQueue();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeQueue, token, canAdminRegionQueue, canSuperAdminQueue]);

  useEffect(() => {
    if (!selected || !token) return;
    const lookupIds = collectLookupIds(selected);
    const missingRegions = lookupIds.regionIds.filter((id) => !lookupLabels.regions[id]);
    const missingPops = lookupIds.popIds.filter((id) => !lookupLabels.pops[id]);
    const missingProjects = lookupIds.projectIds.filter((id) => !lookupLabels.projects[id]);
    if (!missingRegions.length && !missingPops.length && !missingProjects.length) return;

    let cancelled = false;
    async function loadLookupLabels() {
      const [regions, pops, projects] = await Promise.all([
        fetchLookupBatch(missingRegions, token, "regions", formatRegionLabel),
        fetchLookupBatch(missingPops, token, "pops", formatPopLabel),
        fetchLookupBatch(missingProjects, token, "projects", formatProjectLabel),
      ]);
      if (cancelled) return;
      setLookupLabels((prev) => ({
        regions: { ...prev.regions, ...regions },
        pops: { ...prev.pops, ...pops },
        projects: { ...prev.projects, ...projects },
      }));
    }

    void loadLookupLabels();
    return () => {
      cancelled = true;
    };
  }, [selected, token, lookupLabels]);

  useEffect(() => {
    if (!filteredItems.length) {
      if (selectedId) setSelectedId("");
      return;
    }
    if (!selectedId || !filteredItems.some((item) => item.id === selectedId)) {
      setSelectedId(filteredItems[0].id);
    }
  }, [filteredItems, selectedId]);

  async function loadQueue() {
    setLoading(true);
    setError("");
    try {
      const result = await apiFetch<{ data: ValidationRequestItem[] }>(`/validation-requests?queue=${activeQueue}`, { token });
      const rows = result.data || [];
      setItems(rows);
      setSelectedId((prev) => (prev && rows.some((row) => row.id === prev) ? prev : rows[0]?.id || ""));
    } catch (err) {
      setError((err as Error).message || "Gagal memuat queue request.");
    } finally {
      setLoading(false);
    }
  }

  async function approveSelected() {
    if (!selected) return;
    setActing(true);
    setError("");
    setSuccess("");
    try {
      const path =
        activeQueue === "adminregion"
          ? `/validation-requests/${selected.id}/adminregion/approve`
          : `/validation-requests/${selected.id}/superadmin/approve`;
      await apiFetch(path, { method: "POST", token });
      const message = `Request ${selected.request_id || selected.id} berhasil di-approve.`;
      setSuccess(message);
      setResultDialogTitle("Approve Berhasil");
      setResultDialogDescription(message);
      setResultDialogOpen(true);
      await loadQueue();
    } catch (err) {
      const message = (err as Error).message || "Approve gagal.";
      setError(message);
      setResultDialogTitle("Approve Gagal");
      setResultDialogDescription(message);
      setResultDialogOpen(true);
    } finally {
      setActing(false);
    }
  }

  async function rejectSelected() {
    if (!selected) return;
    const note = rejectNote.trim();
    if (note.length < 10) {
      setRejectError("Catatan reject minimal 10 karakter.");
      return;
    }
    setActing(true);
    setError("");
    setSuccess("");
    setRejectError("");
    try {
      const path =
        activeQueue === "adminregion"
          ? `/validation-requests/${selected.id}/adminregion/reject`
          : `/validation-requests/${selected.id}/superadmin/reject`;
      await apiFetch(path, { method: "POST", token, body: { note } });
      setRejectDialogOpen(false);
      setRejectNote("");
      const message = `Request ${selected.request_id || selected.id} berhasil di-reject.`;
      setSuccess(message);
      setResultDialogTitle("Reject Berhasil");
      setResultDialogDescription(message);
      setResultDialogOpen(true);
      await loadQueue();
    } catch (err) {
      const message = (err as Error).message || "Reject gagal.";
      setError(message);
      setRejectError(message);
    } finally {
      setActing(false);
    }
  }

  async function resubmitSelected() {
    if (!selected) return;
    setActing(true);
    setError("");
    setSuccess("");
    try {
      await apiFetch(`/validation-requests/${selected.id}/adminregion/resubmit`, { method: "POST", token });
      const message = `Request ${selected.request_id || selected.id} berhasil di-resubmit ke superadmin.`;
      setSuccess(message);
      setResultDialogTitle("Resubmit Berhasil");
      setResultDialogDescription(message);
      setResultDialogOpen(true);
      await loadQueue();
    } catch (err) {
      const message = (err as Error).message || "Resubmit gagal.";
      setError(message);
      setResultDialogTitle("Resubmit Gagal");
      setResultDialogDescription(message);
      setResultDialogOpen(true);
    } finally {
      setActing(false);
    }
  }

  async function openEvidence(candidates: string[]) {
    const resolved = await resolveAttachmentCandidates(candidates, token);
    for (const candidate of resolved) {
      try {
        await downloadAttachmentFile(candidate, token);
        return;
      } catch {
        // try next candidate
      }
    }
    setError("Gagal membuka evidence (404).");
  }

  async function previewEvidence(candidates: string[], label: string) {
    const resolved = await resolveAttachmentCandidates(candidates, token);
    for (const candidate of resolved) {
      try {
        const { blob } = await fetchAttachmentBlob(candidate, token, "preview");
        const url = URL.createObjectURL(blob);
        setEvidencePreviewUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
        setEvidencePreviewLabel(label);
        setEvidencePreviewOpen(true);
        return;
      } catch {
        // try next candidate
      }
    }
    await openEvidence(candidates);
  }

  function closeResultDialog() {
    setResultDialogOpen(false);
    if (canAdminRegionQueue || canSuperAdminQueue) {
      void loadQueue();
    }
  }

  if (!canAdminRegionQueue && !canSuperAdminQueue) {
    return (
      <ScrollArea className="h-full min-h-0 w-full">
        <div className="pr-3">
          <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            Halaman ini hanya untuk adminregion/superadmin.
          </div>
        </div>
      </ScrollArea>
    );
  }

  return (
    <ScrollArea className="h-full min-h-0 w-full">
      <div className="space-y-4 px-3 pb-3 md:px-4 md:pb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Requests</h2>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <p className="text-sm text-muted-foreground">Queue review perubahan aset sebelum masuk data utama.</p>
              <Badge variant="outline" className="text-[10px] uppercase tracking-normal">
                {activeQueue === "adminregion" ? "Queue Admin Region" : "Queue Superadmin"}
              </Badge>
            </div>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => void loadQueue()} disabled={loading || acting}>
            <RefreshCw className={`mr-2 size-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {success ? <p className="rounded-md border border-emerald-200 bg-emerald-50 p-2 text-sm text-emerald-700">{success}</p> : null}
        {error ? <p className="rounded-md border border-destructive/20 bg-destructive/5 p-2 text-sm text-destructive">{error}</p> : null}

        {loading ? <AppLoading label="Memuat queue request..." /> : null}

        {!loading ? (
          <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
            <Card>
              <CardHeader className="px-3 py-2">
                <CardTitle className="text-base">Daftar Request</CardTitle>
                <CardDescription>{filteredItems.length} dari {items.length} request ditampilkan.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 px-3 pb-3">
                <QueueSummaryChips summary={queueSummary} />
                <div className="grid grid-cols-1 gap-2">
                  <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as RequestTypeFilter)}>
                    <SelectTrigger size="sm" className="w-full">
                      <SelectValue placeholder="Filter jenis request" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Jenis Request</SelectItem>
                      <SelectItem value="create_asset">Create</SelectItem>
                      <SelectItem value="update_asset">Update</SelectItem>
                      <SelectItem value="archive_asset">Archive</SelectItem>
                      <SelectItem value="field_validation">Field Validation</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as RequestStatusFilter)}>
                    <SelectTrigger size="sm" className="w-full">
                      <SelectValue placeholder="Filter status workflow" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Status</SelectItem>
                      <SelectItem value="ongoing_validated">Ongoing Validated</SelectItem>
                      <SelectItem value="pending_async">Pending Async</SelectItem>
                      <SelectItem value="rejected_by_adminregion">Rejected by Admin Region</SelectItem>
                      <SelectItem value="rejected_by_superadmin">Rejected by Superadmin</SelectItem>
                      <SelectItem value="validated">Validated</SelectItem>
                      <SelectItem value="unvalidated">Unvalidated</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {filteredItems.length ? (
                  filteredItems.map((item) => (
                    <div
                      key={item.id}
                      className={`rounded-md border p-2.5 transition ${selected?.id === item.id ? "border-primary bg-primary/5" : "bg-background hover:bg-muted/40"}`}
                    >
                      <button type="button" onClick={() => setSelectedId(item.id)} className="w-full text-left">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <p className="text-sm font-medium">{getOdpName(item) || "-"}</p>
                          <Badge variant="outline" className="text-[10px]">{getRequestType(item).label}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{mapValidationStatus(item.current_status).label} | {getRequestSummary(item, lookupLabels)}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <Badge variant="outline" className="text-[10px]">{getNextOwnerLabel(item.current_status)}</Badge>
                          <span className="text-[11px] text-muted-foreground">Updated: {formatDateTime(item.updated_at)}</span>
                        </div>
                      </button>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <Button asChild type="button" size="sm" variant="outline" className="h-6 px-2 text-[11px]">
                          <Link href={`/audit-trail?request_id=${encodeURIComponent(item.request_id || "")}`}>Audit</Link>
                        </Button>
                        {getFieldValidationHref(item) ? (
                          <Button asChild type="button" size="sm" variant="outline" className="h-6 px-2 text-[11px]">
                            <Link href={getFieldValidationHref(item)}>Open Validation</Link>
                          </Button>
                        ) : null}
                        {getQuickOpenHref(item) ? (
                          <Button asChild type="button" size="sm" variant="outline" className="h-6 px-2 text-[11px]">
                            <Link href={getQuickOpenHref(item)}>Open Detail</Link>
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">Tidak ada request yang cocok dengan filter.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="px-3 py-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">{getOdpName(selected) || "Pilih Request"}</CardTitle>
                    <CardDescription>{selectedType.description}</CardDescription>
                  </div>
                  {selected ? (
                    <Badge variant="outline" className={mapValidationStatus(selected.current_status).className}>
                      {mapValidationStatus(selected.current_status).label}
                    </Badge>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent className="space-y-3 px-3 pb-3">
                {selected ? (
                  <>
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                      <Info title="Tipe Request" value={selectedType.label} />
                      <Info title="Device" value={getOdpName(selected)} />
                      <Info title="Updated" value={formatDateTime(selected.updated_at)} />
                    </div>

                    <RequestStageBanner context={reviewContext} />

                    <RequestReviewTemplate
                      item={selected}
                      requestType={selectedType}
                      lookupLabels={lookupLabels}
                      reviewContext={reviewContext}
                    />

                    {!isAdminRegionView ? (
                      <div className="flex flex-wrap gap-2">
                        <Button asChild type="button" size="sm" variant="outline">
                          <Link href={`/audit-trail?request_id=${encodeURIComponent(selected.request_id || "")}`}>Lihat Audit Trail</Link>
                        </Button>
                        {selectedType.kind === "archive_asset" && selected.entity_id ? (
                          <Button asChild type="button" size="sm" variant="outline">
                            <Link
                              href={`/trash?entity_type=${encodeURIComponent("devices")}&entity_id=${encodeURIComponent(selected.entity_id || "")}`}
                            >
                              Buka Trash Device
                            </Link>
                          </Button>
                        ) : null}
                      </div>
                    ) : null}

                    {selectedType.kind === "field_validation" || (selected.payload_snapshot?.device_ports || []).length ? (
                      <PortSummaryCard ports={selected.payload_snapshot?.device_ports || []} />
                    ) : null}
                    <TechnicalSnapshotDetails item={selected} />

                    <div className="rounded-md border p-2">
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-medium">{attachmentLabel}</p>
                        {selectedType.kind === "field_validation" ? (
                          <Badge variant="outline" className="text-[10px]">Request aktif</Badge>
                        ) : null}
                      </div>
                      {selectedType.kind === "field_validation" ? (
                        <p className="mb-2 text-xs text-muted-foreground">
                          Lampiran di panel ini hanya berasal dari request validasi aktif. Evidence histori tetap dibaca dari histori validasi/detail ODP.
                        </p>
                      ) : null}
                      {evidenceRefs.length ? (
                        <div className="flex flex-wrap gap-1.5">
                          {evidenceRefs.map((ref, index) => (
                            <div key={ref.key} className="overflow-hidden rounded-md border bg-muted/30">
                              <button
                                type="button"
                                onClick={() => void previewEvidence(ref.candidates, `${attachmentLabel} ${index + 1}`)}
                                disabled={!ref.available}
                                className="block size-14 overflow-hidden border-b disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {evidenceThumbUrls[ref.key] ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={evidenceThumbUrls[ref.key]}
                                    alt={`${attachmentLabel} ${index + 1}`}
                                    className="size-full object-cover"
                                  />
                                ) : (
                                  <span className="flex size-full items-center justify-center text-[10px] text-muted-foreground">No preview</span>
                                )}
                              </button>
                              <div className="flex size-14 items-center justify-center p-1">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => void openEvidence(ref.candidates)}
                                  disabled={!ref.available}
                                  className="h-5 w-full px-1 text-[9px]"
                                >
                                  Download
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">Tidak ada {attachmentLabel.toLowerCase()}.</p>
                      )}
                    </div>

                    {selected.adminregion_review_note ? (
                      <p className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">Catatan Admin Region: {selected.adminregion_review_note}</p>
                    ) : null}
                    {selected.superadmin_review_note ? (
                      <p className="rounded-md border border-rose-200 bg-rose-50 p-2 text-xs text-rose-900">Catatan Superadmin: {selected.superadmin_review_note}</p>
                    ) : null}

                    {isRejectedBySuperadmin && isAdminRegionView ? (
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" onClick={() => void resubmitSelected()} disabled={acting}>
                          <RefreshCw className="mr-2 size-4" />
                          Resubmit ke Superadmin
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" onClick={() => void approveSelected()} disabled={acting}>
                          <Check className="mr-2 size-4" />
                          {reviewContext.approveLabel}
                        </Button>
                        <Button type="button" variant="destructive" onClick={() => setRejectDialogOpen(true)} disabled={acting}>
                          <X className="mr-2 size-4" />
                          {reviewContext.rejectLabel}
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">Pilih request di panel kiri.</p>
                )}
              </CardContent>
            </Card>
          </div>
        ) : null}

        <AlertDialog
          open={rejectDialogOpen}
          onOpenChange={(open) => {
            if (acting) return;
            setRejectDialogOpen(open);
            if (!open) {
              setRejectError("");
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{reviewContext.rejectDialogTitle}</AlertDialogTitle>
              <AlertDialogDescription>{reviewContext.rejectDialogDescription}</AlertDialogDescription>
            </AlertDialogHeader>
            <textarea
              value={rejectNote}
              onChange={(event) => {
                setRejectNote(event.target.value);
                if (rejectError) setRejectError("");
              }}
              placeholder="Tulis alasan reject..."
              className="min-h-24 w-full rounded-md border bg-background p-2 text-sm outline-none ring-0"
            />
            {rejectError ? (
              <p className="rounded-md border border-destructive/20 bg-destructive/5 p-2 text-sm text-destructive">
                {rejectError}
              </p>
            ) : null}
            <AlertDialogFooter>
              <Button type="button" variant="outline" onClick={() => setRejectDialogOpen(false)} disabled={acting}>
                Batal
              </Button>
              <Button type="button" variant="destructive" onClick={() => void rejectSelected()} disabled={acting}>
                {acting ? "Memproses..." : "Submit Reject"}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <ResponseDialog
          open={resultDialogOpen}
          title={resultDialogTitle}
          description={resultDialogDescription}
          variant={resultDialogTitle.toLowerCase().includes("gagal") ? "error" : "success"}
          actionLabel="OK"
          onOpenChange={(open) => {
            if (open) {
              setResultDialogOpen(true);
              return;
            }
            closeResultDialog();
          }}
        />

        <AlertDialog
          open={evidencePreviewOpen}
          onOpenChange={(open) => {
            setEvidencePreviewOpen(open);
            if (!open && evidencePreviewUrl) {
              URL.revokeObjectURL(evidencePreviewUrl);
              setEvidencePreviewUrl("");
            }
          }}
        >
          <AlertDialogContent className="!w-[min(92vw,960px)] !max-w-[min(92vw,960px)] p-3 sm:p-4">
            <AlertDialogHeader>
              <AlertDialogTitle>Preview {attachmentLabel}</AlertDialogTitle>
              <AlertDialogDescription>{evidencePreviewLabel || "-"}</AlertDialogDescription>
            </AlertDialogHeader>
            {evidencePreviewUrl ? (
              <div className="overflow-hidden rounded-md border bg-muted/20">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={evidencePreviewUrl} alt={evidencePreviewLabel || attachmentLabel} className="h-[60vh] w-full object-contain" />
              </div>
            ) : null}
            <AlertDialogFooter>
              <AlertDialogAction>Tutup</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </ScrollArea>
  );
}

function normalizeRole(role: string) {
  if (role === "admin") return "superadmin";
  if (role === "user_all_region") return "adminregion";
  if (role === "user_region") return "validator";
  return role;
}

function getReviewContext(
  queue: QueueType,
  requestType: RequestType,
  status?: RequestStatus | null,
): ReviewContext {
  const viewerRole: ReviewViewerRole = queue === "adminregion" ? "adminregion" : "superadmin";
  const isValidation = requestType.kind === "field_validation";
  const isResubmission = viewerRole === "adminregion" && status === "rejected_by_superadmin";

  if (viewerRole === "adminregion") {
    return {
      viewerRole,
      stageLabel: isResubmission ? "Revisi Admin Region" : "Review Admin Region",
      stageTitle: isValidation ? "Pemeriksaan awal sebelum eskalasi" : "Verifikasi awal perubahan asset",
      stageDescription: isResubmission
        ? "Request ini sempat dikembalikan superadmin. Pastikan catatan sudah ditindaklanjuti sebelum dikirim ulang."
        : isValidation
          ? "Cocokkan hasil lapangan, evidence, dan temuan sebelum meneruskan request ke superadmin."
          : "Pastikan perubahan administratif sudah lengkap sebelum diteruskan ke approval final.",
      ownerLabel: "Tanggung jawab saat ini: Admin Region",
      approveLabel: isValidation ? "Approve ke Superadmin" : "Teruskan ke Superadmin",
      rejectLabel: isValidation ? "Reject ke Validator" : "Reject Request",
      rejectDialogTitle: isValidation ? "Reject ke Validator" : "Reject Request",
      rejectDialogDescription: isValidation
        ? "Catatan reject akan menjadi arahan revisi untuk validator. Minimal 10 karakter."
        : "Catatan reject wajib minimal 10 karakter.",
      toneClassName: "border-amber-200 bg-amber-50/60 text-amber-950",
    };
  }

  return {
    viewerRole,
    stageLabel: "Approval Final",
    stageTitle: isValidation ? "Keputusan akhir validasi ODP" : "Keputusan akhir perubahan asset",
    stageDescription: isValidation
      ? "Nilai final asset akan mengikuti keputusan di tahap ini setelah data lapangan dinyatakan layak."
      : "Perubahan pada request ini akan diterapkan ke data utama setelah disetujui.",
    ownerLabel: "Tanggung jawab saat ini: Superadmin",
    approveLabel:
      requestType.kind === "create_asset"
        ? "Approve Create"
        : requestType.kind === "update_asset"
          ? "Approve Update"
          : requestType.kind === "archive_asset"
            ? "Approve Archive"
            : "Approve Final",
    rejectLabel: "Reject ke Admin Region",
    rejectDialogTitle: "Reject ke Admin Region",
    rejectDialogDescription: "Catatan reject wajib minimal 10 karakter dan akan menjadi tindak lanjut admin region.",
    toneClassName: "border-sky-200 bg-sky-50/60 text-sky-950",
  };
}

function normalizeEvidenceRefs(value: ValidationRequestItem["evidence_attachments"]): EvidenceRef[] {
  const rows = Array.isArray(value) ? value : [];
  return rows
    .map((item, index) => {
      if (typeof item === "string") {
        const id = item.trim();
        if (!id) return null;
        return { key: `${id}-${index}`, candidates: [id], available: true };
      }
      if (!item || typeof item !== "object") return null;
      const id = String(item.id || "").trim();
      const attachmentId = String(item.attachment_id || "").trim();
      const candidates = [id, attachmentId].filter((candidate) => Boolean(candidate));
      if (candidates.length) {
        return {
          key: `${candidates[0]}-${index}`,
          candidates,
          available: true,
        };
      }
      return null;
    })
    .filter((row): row is EvidenceRef => Boolean(row));
}

async function resolveAttachmentCandidates(candidates: string[], token: string): Promise<string[]> {
  const ordered = new Set<string>(candidates.filter(Boolean));
  for (const candidate of candidates) {
    if (!candidate) continue;
    const resolved = await resolveAttachment(candidate, token);
    if (resolved?.id) ordered.add(String(resolved.id));
    if (resolved?.attachment_id) ordered.add(String(resolved.attachment_id));
    if (resolved?.storage_file_id) ordered.add(String(resolved.storage_file_id));
  }
  return Array.from(ordered);
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function Info({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-md border bg-muted/20 px-2 py-1.5">
      <p className="text-[10px] uppercase leading-4 text-muted-foreground">{title}</p>
      <p className="break-all text-sm leading-5">{value}</p>
    </div>
  );
}

function getOdpName(item: ValidationRequestItem | null) {
  if (!item) return "-";
  const payload = getCreateAssetPayload(item);
  const name = String(
    payload.device_name ||
      payload.pop_name ||
      payload.route_name ||
      payload.project_name ||
      "",
  ).trim();
  if (name) return name;
  return item.request_id || "-";
}

function getRequestType(item: ValidationRequestItem | null) {
  const source = String(item?.payload_snapshot?.source || "").trim();
  if (source === "adminregion-create-device" || source === "adminregion-create-resource") {
    const resourceLabel = valueText(item?.payload_snapshot?.resource_label || "Device");
    return {
      kind: "create_asset" as const,
      resourceLabel,
      operationLabel: "Create",
      label: `Create ${resourceLabel} Request`,
      description: `Review data ${resourceLabel.toLowerCase()} baru dari adminregion sebelum masuk Asset Overview.`,
    };
  }

  if (source === "adminregion-update-resource") {
    const resourceLabel = valueText(item?.payload_snapshot?.resource_label || "Asset");
    return {
      kind: "update_asset" as const,
      resourceLabel,
      operationLabel: "Update",
      label: `Update ${resourceLabel} Request`,
      description: `Review perubahan ${resourceLabel.toLowerCase()} sebelum nilai final diterapkan.`,
    };
  }

  if (source === "adminregion-archive-resource") {
    const resourceLabel = valueText(item?.payload_snapshot?.resource_label || "Asset");
    return {
      kind: "archive_asset" as const,
      resourceLabel,
      operationLabel: "Archive",
      label: `Archive ${resourceLabel} Request`,
      description: `Review permintaan arsip sebelum asset dikeluarkan dari data aktif.`,
    };
  }

  return {
    kind: "field_validation" as const,
    resourceLabel: "Device",
    operationLabel: "Validation",
    label: "Field Validation Request",
    description: "Review hasil validasi lapangan, checklist, evidence, lalu approve/reject.",
  };
}

function getRequestSummary(item: ValidationRequestItem, lookupLabels: LookupLabels) {
  const requestType = getRequestType(item);
  if (requestType.kind !== "field_validation") {
    const payload = getCreateAssetPayload(item);
    return `${requestType.operationLabel} ${requestType.resourceLabel} | Status ${valueText(payload.status || payload.status_pop)} | Region ${getRegionText(payload.region_id || item.region_id, lookupLabels)}`;
  }

  return `${getInspectionSummary(item.payload_snapshot?.field_inspection)} | ${getPortSummary(item.payload_snapshot?.device_ports || [])}`;
}

function getNextOwnerLabel(status?: RequestStatus | null) {
  if (status === "rejected_by_adminregion") return "Tindak lanjut: Validator";
  if (status === "rejected_by_superadmin") return "Tindak lanjut: Admin Region";
  if (status === "validated") return "Selesai";
  if (status === "ongoing_validated" || status === "pending_async") return "Menunggu reviewer aktif";
  return "Menunggu proses";
}

function getQuickOpenHref(item: ValidationRequestItem) {
  if (!item.entity_id) return "";
  const requestType = getRequestType(item);
  if (requestType.kind === "field_validation") {
    return `/data-management/list/odp/${encodeURIComponent(item.entity_id)}`;
  }
  const resourceName = String(item.payload_snapshot?.resource_name || "").trim();
  if (resourceName === "devices") {
    return `/data-management/list/odp/${encodeURIComponent(item.entity_id)}`;
  }
  if (resourceName === "pops") {
    return `/data-management/list/pop/${encodeURIComponent(item.entity_id)}`;
  }
  if (resourceName === "routes") {
    return `/data-management/list/route/${encodeURIComponent(item.entity_id)}`;
  }
  if (resourceName === "projects") {
    return `/data-management/list/projects/${encodeURIComponent(item.entity_id)}`;
  }
  return "";
}

function getFieldValidationHref(item: ValidationRequestItem) {
  if (!item.entity_id) return "";
  return getRequestType(item).kind === "field_validation"
    ? `/field/odp/${encodeURIComponent(item.entity_id)}`
    : "";
}

function buildQueueSummary(items: ValidationRequestItem[]) {
  return {
    total: items.length,
    validation: items.filter((item) => getRequestType(item).kind === "field_validation").length,
    assetChanges: items.filter((item) => getRequestType(item).kind !== "field_validation").length,
    rejected: items.filter((item) =>
      item.current_status === "rejected_by_adminregion" || item.current_status === "rejected_by_superadmin"
    ).length,
  };
}

function QueueSummaryChips({
  summary,
}: {
  summary: ReturnType<typeof buildQueueSummary>;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <QueueSummaryChip label="Total" value={summary.total} />
      <QueueSummaryChip label="Validation" value={summary.validation} />
      <QueueSummaryChip label="Asset" value={summary.assetChanges} />
      <QueueSummaryChip label="Rejected" value={summary.rejected} />
    </div>
  );
}

function QueueSummaryChip({ label, value }: { label: string; value: number }) {
  return (
    <div className="inline-flex min-w-0 items-center gap-1 rounded-md border bg-muted/20 px-2 py-1">
      <span className="text-[10px] uppercase leading-4 text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold leading-5">{value}</span>
    </div>
  );
}

function getCreateAssetReviewFields(item: ValidationRequestItem, lookupLabels: LookupLabels) {
  const payload = getCreateAssetPayload(item);
  const resourceName = String(item.payload_snapshot?.resource_name || "").trim();
  const common = [
    { title: "Region", value: getRegionText(payload.region_name || payload.region_id || item.region_id, lookupLabels) },
    { title: "POP", value: getPopText(payload.pop_name || payload.pop_id, lookupLabels) },
    { title: "Status", value: valueText(payload.status || payload.status_pop) },
  ];

  if (resourceName === "pops" || item.payload_snapshot?.pop) {
    return [
      { title: "POP Name", value: valueText(payload.pop_name) },
      { title: "POP Code", value: valueText(payload.pop_code) },
      ...common,
      { title: "POP Type", value: valueText(payload.pop_type) },
      { title: "Longitude", value: valueText(payload.longitude) },
      { title: "Latitude", value: valueText(payload.latitude) },
      { title: "Address", value: valueText(payload.address) },
    ];
  }

  if (resourceName === "routes" || item.payload_snapshot?.route) {
    return [
      { title: "Route Name", value: valueText(payload.route_name) },
      { title: "Route Type", value: valueText(payload.route_type) },
      ...common,
      { title: "Project", value: getProjectText(payload.project_id, lookupLabels) },
      { title: "Distance", value: valueText(payload.distance_meters) },
    ];
  }

  if (resourceName === "projects" || item.payload_snapshot?.project) {
    return [
      { title: "Project Name", value: valueText(payload.project_name) },
      ...common,
      { title: "Vendor", value: valueText(payload.vendor_name) },
      { title: "BAST", value: valueText(payload.bast_number) },
      { title: "SPK", value: valueText(payload.spk_number) },
      { title: "Start Date", value: valueText(payload.start_date) },
      { title: "End Date", value: valueText(payload.end_date) },
      { title: "Budget", value: valueText(payload.budget_value) },
    ];
  }

  return [
    { title: "Device Type", value: valueText(payload.device_type_key) },
    { title: "Device Name", value: valueText(payload.device_name) },
    ...common,
    { title: "Project", value: getProjectText(payload.project_id, lookupLabels) },
    { title: "Tipe ODP", value: valueText(payload.odp_type) },
    { title: "Jenis Instalasi", value: valueText(payload.installation_type) },
    { title: "Total Port", value: valueText(payload.total_ports) },
    { title: "Used Port", value: valueText(payload.used_ports) },
    { title: "Splitter Ratio", value: valueText(payload.splitter_ratio) },
    { title: "Serial Number", value: valueText(payload.serial_number) },
    { title: "Longitude", value: valueText(payload.longitude) },
    { title: "Latitude", value: valueText(payload.latitude) },
    { title: "Address", value: valueText(payload.address) },
  ];
}

function getFieldValidationReviewFields(item: ValidationRequestItem) {
  const field = item.payload_snapshot?.field_validation || {};
  const summary = item.payload_snapshot?.port_summary || {};
  return [
    { title: "Tanggal Validasi", value: valueText(field.validation_date) },
    { title: "ID Inventory", value: valueText(field.inventory_id) },
    { title: "Nama ODP Lama", value: valueText(field.old_device_name) },
    { title: "Nama ODP Baru", value: valueText(field.new_device_name) },
    { title: "POP", value: valueText(field.pop_name || field.pop_id) },
    { title: "Longitude", value: valueText(field.longitude) },
    { title: "Latitude", value: valueText(field.latitude) },
    { title: "Tipe ODP", value: valueText(field.odp_type) },
    { title: "Jenis Instalasi", value: valueText(field.installation_type) },
    { title: "Splitter", value: valueText(field.splitter_ratio) },
    { title: "Kapasitas", value: valueText(field.total_ports) },
    { title: "Port Aktif", value: valueText(summary.used) },
    { title: "Port Kosong", value: valueText(summary.empty ?? summary.idle) },
    { title: "Port Rusak", value: valueText(summary.broken ?? summary.down) },
  ];
}

type RequestType = ReturnType<typeof getRequestType>;

function RequestReviewTemplate({
  item,
  requestType,
  lookupLabels,
  reviewContext,
}: {
  item: ValidationRequestItem;
  requestType: RequestType;
  lookupLabels: LookupLabels;
  reviewContext: ReviewContext;
}) {
  if (requestType.kind === "create_asset") {
    return <CreateAssetRequestReview item={item} requestType={requestType} lookupLabels={lookupLabels} />;
  }
  if (requestType.kind === "update_asset") {
    return <UpdateAssetRequestReview item={item} requestType={requestType} />;
  }
  if (requestType.kind === "archive_asset") {
    return <ArchiveAssetRequestReview item={item} requestType={requestType} lookupLabels={lookupLabels} />;
  }
  return <ValidationRequestReview item={item} reviewContext={reviewContext} />;
}

function CreateAssetRequestReview({
  item,
  requestType,
  lookupLabels,
}: {
  item: ValidationRequestItem;
  requestType: RequestType;
  lookupLabels: LookupLabels;
}) {
  const fields = getCreateAssetReviewFields(item, lookupLabels);
  const visibleFields = fields.filter((field) => field.value !== "-");
  const identityFields = visibleFields.slice(0, 4);
  const remainingFields = visibleFields.slice(4);
  return (
    <div className="space-y-2 rounded-md border p-2.5">
      <ReviewSectionHeader
        eyebrow="Create"
        title={`${requestType.resourceLabel} Baru`}
        description="Cek identitas inti, relasi lokasi, dan kapasitas awal sebelum approve."
      />
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="rounded-md border bg-muted/20 p-2">
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">Identitas Asset</p>
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {identityFields.map((field) => (
              <Info key={field.title} title={field.title} value={field.value} />
            ))}
          </div>
        </div>
        {remainingFields.length ? (
          <div className="rounded-md border p-2">
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">Konteks Operasional</p>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
              {remainingFields.map((field) => (
                <Info key={field.title} title={field.title} value={field.value} />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function UpdateAssetRequestReview({
  item,
  requestType,
}: {
  item: ValidationRequestItem;
  requestType: RequestType;
}) {
  const diffFields = getUpdateDiffFields(item);
  return (
    <div className="space-y-2 rounded-md border p-2.5">
      <ReviewSectionHeader
        eyebrow="Update"
        title={`${requestType.resourceLabel} Update`}
        description="Fokus utama reviewer ada pada perubahan nilai sebelum dan sesudah."
      />
      <div className="grid grid-cols-1 gap-2 md:grid-cols-[160px_minmax(0,1fr)]">
        <div className="rounded-md border bg-muted/20 p-2">
          <p className="text-xs font-medium text-muted-foreground">Field Berubah</p>
          <p className="mt-1 text-3xl font-semibold tracking-tight">{diffFields.length}</p>
          <p className="mt-1 text-xs text-muted-foreground">Bandingkan perubahan inti sebelum approve.</p>
        </div>
        <div className="rounded-md border p-2">
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">Perubahan Field</p>
          {diffFields.length ? (
            <div className="space-y-1">
              {diffFields.map((field) => (
                <div key={field.key} className="grid grid-cols-1 gap-1 rounded border bg-background px-2 py-1.5 text-xs sm:grid-cols-[150px_1fr_1fr]">
                  <span className="font-medium">{field.key}</span>
                  <span className="text-muted-foreground">Sebelum: {field.before}</span>
                  <span>Sesudah: {field.after}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Tidak ada field yang berubah pada request ini.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function ArchiveAssetRequestReview({
  item,
  requestType,
  lookupLabels,
}: {
  item: ValidationRequestItem;
  requestType: RequestType;
  lookupLabels: LookupLabels;
}) {
  const fields = getCreateAssetReviewFields(item, lookupLabels);
  return (
    <div className="space-y-2 rounded-md border border-rose-200 bg-rose-50/40 p-2.5">
      <ReviewSectionHeader
        eyebrow="Archive"
        title={`${requestType.resourceLabel} Akan Diarsipkan`}
        description="Pastikan asset yang dipilih benar sebelum dikeluarkan dari data aktif."
      />
      <div className="rounded-md border border-rose-200 bg-background/80 p-2">
        <p className="mb-1.5 text-xs font-medium text-rose-700">Konfirmasi Identitas Asset</p>
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {fields.map((field) => (
            <Info key={field.title} title={field.title} value={field.value} />
          ))}
        </div>
      </div>
      <div className="rounded-md border border-rose-200 bg-rose-100/40 p-2 text-xs text-rose-900">
        Request ini akan mengeluarkan asset dari data aktif setelah disetujui.
      </div>
    </div>
  );
}

function ValidationRequestReview({
  item,
  reviewContext,
}: {
  item: ValidationRequestItem;
  reviewContext: ReviewContext;
}) {
  const fieldRows = getFieldValidationReviewFields(item);
  const inspectionSummary = getInspectionSummary(item.payload_snapshot?.field_inspection);
  const portSummary = getPortSummary(item.payload_snapshot?.device_ports || []);
  const validationDescription =
    reviewContext.viewerRole === "adminregion"
      ? "Bandingkan input validator dengan evidence dan temuan sebelum diteruskan ke superadmin."
      : "Pastikan asset final yang akan diterapkan sesuai hasil validasi dan ringkasan bukti.";
  return (
    <div className="space-y-2">
      <div className="space-y-2 rounded-md border p-2.5">
        <ReviewSectionHeader
          eyebrow="Field Validation"
          title="Identitas & Kapasitas Aktual"
          description={validationDescription}
        />
        <div className={`rounded-md border px-2 py-1.5 text-xs ${reviewContext.toneClassName}`}>
          {reviewContext.viewerRole === "adminregion"
            ? "Fokus review: kelengkapan field, kecocokan evidence, dan kejelasan temuan."
            : "Fokus review: kelayakan finalisasi data asset setelah tahap admin region selesai."}
        </div>
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          <div className="rounded-md border bg-muted/20 px-2 py-1.5">
            <p className="text-xs font-medium text-muted-foreground">Checklist Kondisi</p>
            <p className="mt-1 text-sm font-semibold">{inspectionSummary}</p>
          </div>
          <div className="rounded-md border bg-muted/20 px-2 py-1.5">
            <p className="text-xs font-medium text-muted-foreground">Port & Redaman</p>
            <p className="mt-1 text-sm font-semibold">{portSummary}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {fieldRows.map((field) => (
            <Info key={field.title} title={field.title} value={field.value} />
          ))}
        </div>
      </div>
      <FieldInspectionReview inspection={item.payload_snapshot?.field_inspection} />
      <div className="rounded-md border p-2.5">
        <p className="mb-1.5 text-sm font-medium">Temuan</p>
        <p className="text-xs text-muted-foreground">{item.finding_note || "-"}</p>
      </div>
    </div>
  );
}

function RequestStageBanner({ context }: { context: ReviewContext }) {
  return (
    <div className={`rounded-md border px-2.5 py-2 ${context.toneClassName}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-0.5">
          <Badge variant="outline" className="w-fit border-current bg-background/70 text-[10px] uppercase tracking-normal">
            {context.stageLabel}
          </Badge>
          <div>
            <p className="text-sm font-medium leading-5">{context.stageTitle}</p>
            <p className="text-xs leading-4 opacity-90">{context.stageDescription}</p>
          </div>
        </div>
        <p className="rounded-md border border-current/20 bg-background/60 px-2 py-1 text-[11px] font-medium">
          {context.ownerLabel}
        </p>
      </div>
    </div>
  );
}

function ReviewSectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-0.5">
      <Badge variant="outline" className="w-fit text-[10px] uppercase tracking-normal">
        {eyebrow}
      </Badge>
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function PortSummaryCard({ ports }: { ports: Array<Record<string, unknown>> }) {
  return (
    <div className="rounded-md border p-2.5">
      <p className="mb-1.5 text-sm font-medium">Port & Redaman</p>
      {ports.length ? (
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-5">
          {renderPortStats(ports).map((stat) => (
            <div key={stat.label} className="rounded-md border bg-muted/20 px-2 py-1.5">
              <p className="text-[11px] uppercase text-muted-foreground">{stat.label}</p>
              <p className="text-base font-semibold">{stat.value}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Tidak ada perubahan port pada request ini.</p>
      )}
    </div>
  );
}

function TechnicalSnapshotDetails({ item }: { item: ValidationRequestItem }) {
  return (
    <details className="min-w-0 rounded-md border p-2.5">
      <summary className="cursor-pointer text-sm font-medium">Lihat Data Teknis (raw)</summary>
      <p className="mb-2 mt-3 text-sm font-medium">Snapshot Device</p>
      <pre className="max-h-48 overflow-auto rounded bg-muted/40 p-2 text-xs">{JSON.stringify(getCreateAssetPayload(item), null, 2)}</pre>
      <p className="mb-2 mt-3 text-sm font-medium">Snapshot Ports</p>
      <pre className="max-h-48 overflow-auto rounded bg-muted/40 p-2 text-xs">{JSON.stringify(item.payload_snapshot?.device_ports || [], null, 2)}</pre>
    </details>
  );
}

function FieldInspectionReview({ inspection }: { inspection?: Record<string, unknown> | null }) {
  const initialPhotos = objectRecordValues(inspection?.initial_photos);
  const conditionChecks = objectRecordValues(inspection?.condition_checks);

  if (!initialPhotos.length && !conditionChecks.length) return null;

  return (
    <div className="rounded-md border p-2.5">
      <p className="mb-1.5 text-sm font-medium">Pemeriksaan Awal & Checklist Kondisi</p>
      {initialPhotos.length ? (
        <div className="mb-3">
          <p className="mb-1 text-xs font-medium text-muted-foreground">Pemeriksaan Awal</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {initialPhotos.map((item, index) => (
              <div key={`${valueText(item.label)}-${index}`} className="rounded-md border bg-muted/20 p-2">
                <p className="text-xs font-medium">{valueText(item.label)}</p>
                <p className="text-xs text-muted-foreground">Foto: {getInspectionAttachmentName(item.attachment)}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {conditionChecks.length ? (
        <div>
          <p className="mb-1 text-xs font-medium text-muted-foreground">Checklist Kondisi</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {conditionChecks.map((item, index) => (
              <div key={`${valueText(item.label)}-${index}`} className="rounded-md border bg-muted/20 p-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-medium">{valueText(item.label)}</p>
                  <Badge variant="outline" className="shrink-0 text-[10px]">
                    {valueText(item.condition)}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Keterangan: {valueText(item.note)}</p>
                <p className="text-xs text-muted-foreground">Foto: {getInspectionAttachmentName(item.attachment)}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function getCreateAssetPayload(item: ValidationRequestItem) {
  return (
    nonEmptyObject(item.payload_snapshot?.resource_payload) ||
    item.payload_snapshot?.device ||
    item.payload_snapshot?.pop ||
    item.payload_snapshot?.route ||
    item.payload_snapshot?.project ||
    item.payload_snapshot?.before ||
    {}
  );
}

function getUpdateDiffFields(item: ValidationRequestItem) {
  const changes = item.payload_snapshot?.resource_payload || {};
  const before = item.payload_snapshot?.before || {};
  return Object.entries(changes)
    .filter(([key, after]) => !areValuesEquivalent(before[key], after))
    .map(([key, after]) => ({
      key,
      before: valueText(before[key]),
      after: valueText(after),
    }));
}

function areValuesEquivalent(before: unknown, after: unknown) {
  return normalizeComparableValue(before) === normalizeComparableValue(after);
}

function normalizeComparableValue(value: unknown): string {
  if (value == null || value === "") return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (typeof value === "string") return value.trim();
  return stableStringify(value);
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${key}:${stableStringify(item)}`)
      .join(",")}}`;
  }
  return String(value ?? "");
}

function collectLookupIds(item: ValidationRequestItem) {
  const payload = getCreateAssetPayload(item);
  return {
    regionIds: uniqueIds([payload.region_id, item.region_id]),
    popIds: uniqueIds([payload.pop_id]),
    projectIds: uniqueIds([payload.project_id]),
  };
}

function uniqueIds(values: unknown[]) {
  return Array.from(
    new Set(
      values
        .map((value) => String(value || "").trim())
        .filter((value) => value && value !== "-"),
    ),
  );
}

async function fetchLookupBatch(
  ids: string[],
  token: string,
  resource: "regions" | "pops" | "projects",
  formatter: (item: Record<string, unknown>) => string,
) {
  const entries = await Promise.all(
    ids.map(async (id) => {
      try {
        const result = await apiFetch<{ data?: Record<string, unknown> }>(`/${resource}/${encodeURIComponent(id)}`, { token });
        const label = result.data ? formatter(result.data) : "";
        return [id, label || shortId(id)] as const;
      } catch {
        return [id, shortId(id)] as const;
      }
    }),
  );
  return Object.fromEntries(entries);
}

function formatRegionLabel(item: Record<string, unknown>) {
  const name = valueText(item.region_name);
  const code = valueText(item.region_code);
  return code !== "-" ? `${name} (${code})` : name;
}

function formatPopLabel(item: Record<string, unknown>) {
  const name = valueText(item.pop_name);
  const code = valueText(item.pop_code);
  return code !== "-" ? `${name} (${code})` : name;
}

function formatProjectLabel(item: Record<string, unknown>) {
  const name = valueText(item.project_name);
  const code = valueText(item.project_code || item.project_id);
  return code !== "-" ? `${name} (${code})` : name;
}

function getRegionText(value: unknown, lookupLabels: LookupLabels) {
  const id = String(value || "").trim();
  if (!id) return "-";
  return lookupLabels.regions[id] || valueText(value);
}

function getPopText(value: unknown, lookupLabels: LookupLabels) {
  const id = String(value || "").trim();
  if (!id) return "-";
  return lookupLabels.pops[id] || valueText(value);
}

function getProjectText(value: unknown, lookupLabels: LookupLabels) {
  const id = String(value || "").trim();
  if (!id) return "-";
  return lookupLabels.projects[id] || valueText(value);
}

function shortId(value: string) {
  return value.length > 13 ? `${value.slice(0, 8)}...${value.slice(-4)}` : value;
}

function nonEmptyObject(value?: Record<string, unknown>) {
  if (!value || !Object.keys(value).length) return null;
  return value;
}

function objectRecordValues(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  return Object.values(value as Record<string, unknown>).filter(
    (item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item),
  );
}

function getInspectionAttachmentName(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "-";
  const attachment = value as Record<string, unknown>;
  return valueText(attachment.name || attachment.attachment_id || attachment.id);
}

function getInspectionSummary(inspection?: Record<string, unknown> | null) {
  const checks = objectRecordValues(inspection?.condition_checks);
  if (!checks.length) return "Kondisi -";
  const good = checks.filter((item) => ["Baik", "Bersih", "Lengkap", "Rapi"].includes(String(item.condition || ""))).length;
  return `Kondisi ${good}/${checks.length} baik`;
}

function valueText(value: unknown) {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") return value ? "Ya" : "Tidak";
  return String(value);
}

function renderPortStats(ports: Array<Record<string, unknown>>) {
  const rows = Array.isArray(ports) ? ports : [];
  const total = rows.length;
  const used = rows.filter((row) => String(row.status || "").toLowerCase() === "used").length;
  const idle = rows.filter((row) => String(row.status || "").toLowerCase() === "idle").length;
  const reserved = rows.filter((row) => String(row.status || "").toLowerCase() === "reserved").length;
  const down = rows.filter((row) => String(row.status || "").toLowerCase() === "down").length;
  return [
    { label: "Total", value: String(total) },
    { label: "Used", value: String(used) },
    { label: "Idle", value: String(idle) },
    { label: "Reserved", value: String(reserved) },
    { label: "Down", value: String(down) },
  ];
}

function getPortSummary(ports: Array<Record<string, unknown>>) {
  const stats = renderPortStats(ports);
  const total = stats.find((item) => item.label === "Total")?.value || "0";
  const used = stats.find((item) => item.label === "Used")?.value || "0";
  const idle = stats.find((item) => item.label === "Idle")?.value || "0";
  return `Port ${used}/${total} used | idle ${idle}`;
}
