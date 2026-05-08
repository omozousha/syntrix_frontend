"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, RefreshCw, X } from "lucide-react";
import { AppLoading } from "@/components/app-loading-new";
import { useSession } from "@/components/session-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
const CHECKLIST_LABELS: Array<{ key: string; label: string }> = [
  { key: "physical_ok", label: "Fisik ODP OK" },
  { key: "splitter_ok", label: "Splitter OK" },
  { key: "port_mapping_ok", label: "Mapping port OK" },
  { key: "qr_label_ok", label: "QR terpasang" },
  { key: "label_ok", label: "Label terbaca" },
];

export default function ValidationRequestsPage() {
  const { token, me } = useSession();
  const normalizedRole = normalizeRole(me.role);
  const canAdminRegionQueue = normalizedRole === "adminregion";
  const canSuperAdminQueue = normalizedRole === "superadmin";
  const [activeQueue, setActiveQueue] = useState<QueueType>(canAdminRegionQueue ? "adminregion" : "superadmin");
  const [items, setItems] = useState<ValidationRequestItem[]>([]);
  const [selectedId, setSelectedId] = useState("");
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

  const selected = useMemo(() => items.find((item) => item.id === selectedId) || items[0] || null, [items, selectedId]);
  const selectedType = getRequestType(selected);
  const evidenceRefs = useMemo(() => normalizeEvidenceRefs(selected?.evidence_attachments), [selected]);
  const isAdminRegionView = activeQueue === "adminregion";

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
            <p className="text-sm text-muted-foreground">Queue review perubahan aset sebelum masuk data utama.</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => void loadQueue()} disabled={loading || acting}>
            <RefreshCw className={`mr-2 size-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <Tabs value={activeQueue} onValueChange={(value) => setActiveQueue(value as QueueType)}>
          <TabsList className="w-full justify-start overflow-x-auto sm:w-auto">
            {canAdminRegionQueue ? <TabsTrigger value="adminregion">Queue Admin Region</TabsTrigger> : null}
            {canSuperAdminQueue ? <TabsTrigger value="superadmin">Queue Superadmin</TabsTrigger> : null}
          </TabsList>
        </Tabs>

        {success ? <p className="rounded-md border border-emerald-200 bg-emerald-50 p-2 text-sm text-emerald-700">{success}</p> : null}
        {error ? <p className="rounded-md border border-destructive/20 bg-destructive/5 p-2 text-sm text-destructive">{error}</p> : null}

        {loading ? <AppLoading label="Memuat queue request..." /> : null}

        {!loading ? (
          <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
            <Card>
              <CardHeader className="px-3 py-2">
                <CardTitle className="text-base">Daftar Request</CardTitle>
                <CardDescription>{items.length} request menunggu review.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 px-3 pb-3">
                {items.length ? (
                  items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedId(item.id)}
                      className={`w-full rounded-md border p-3 text-left transition ${selected?.id === item.id ? "border-primary bg-primary/5" : "bg-background hover:bg-muted/40"}`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="text-sm font-medium">{getOdpName(item) || "-"}</p>
                        <Badge variant="outline" className="text-[10px]">{getRequestType(item).label}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{mapValidationStatus(item.current_status).label} | {getRequestSummary(item, lookupLabels)}</p>
                      <p className="text-xs text-muted-foreground">Updated: {formatDateTime(item.updated_at)}</p>
                    </button>
                  ))
                ) : (
                  <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">Queue kosong.</p>
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
              <CardContent className="space-y-4 px-3 pb-3">
                {selected ? (
                  <>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                      <Info title="Tipe Request" value={selectedType.label} />
                      <Info title="Device" value={getOdpName(selected)} />
                      <Info title="Updated" value={formatDateTime(selected.updated_at)} />
                    </div>

                    {selectedType.kind === "asset_change" ? (
                      <div className="rounded-md border p-3">
                        <div className="mb-3">
                          <p className="text-sm font-medium">{selectedType.operationLabel} {selectedType.resourceLabel}</p>
                          <p className="text-xs text-muted-foreground">
                            Review perubahan yang diajukan adminregion sebelum masuk Asset Overview.
                          </p>
                        </div>
                        {selected.payload_snapshot?.operation === "update" ? (
                          <div className="mt-3 rounded-md border bg-muted/20 p-2">
                            <p className="mb-2 text-xs font-medium text-muted-foreground">Perubahan Field</p>
                            {getUpdateDiffFields(selected).length ? (
                              <div className="space-y-1">
                                {getUpdateDiffFields(selected).map((field) => (
                                  <div key={field.key} className="grid grid-cols-1 gap-1 rounded border bg-background p-2 text-xs sm:grid-cols-[160px_1fr_1fr]">
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
                        ) : (
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
                            {getCreateAssetReviewFields(selected, lookupLabels).map((field) => (
                              <Info key={field.title} title={field.title} value={field.value} />
                            ))}
                          </div>
                        )}
                      </div>
                    ) : null}

                    {!isAdminRegionView ? (
                      <div className="flex flex-wrap gap-2">
                        <Button asChild type="button" size="sm" variant="outline">
                          <Link href={`/audit-trail?request_id=${encodeURIComponent(selected.request_id || "")}`}>Lihat Audit Trail</Link>
                        </Button>
                        <Button asChild type="button" size="sm" variant="outline">
                          <Link
                            href={`/trash?entity_type=${encodeURIComponent("devices")}&entity_id=${encodeURIComponent(selected.entity_id || "")}`}
                          >
                            Buka Trash Device
                          </Link>
                        </Button>
                      </div>
                    ) : null}

                    {selectedType.kind === "field_validation" ? (
                      <div className="rounded-md border p-3">
                        <p className="mb-2 text-sm font-medium">Checklist</p>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {CHECKLIST_LABELS.map((item) => (
                            <p key={item.key} className="text-xs">
                              {item.label}:{" "}
                              <span className={selected.checklist?.[item.key] ? "text-emerald-600" : "text-rose-600"}>
                                {selected.checklist?.[item.key] ? "OK" : "Belum"}
                              </span>
                            </p>
                          ))}
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">Temuan: {selected.finding_note || "-"}</p>
                      </div>
                    ) : null}

                    <div className="rounded-md border p-3">
                      <p className="mb-2 text-sm font-medium">Ringkasan Port</p>
                      {selected.payload_snapshot?.device_ports?.length ? (
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                          {renderPortStats(selected.payload_snapshot?.device_ports || []).map((stat) => (
                            <div key={stat.label} className="rounded-md border bg-muted/20 p-2">
                              <p className="text-[11px] uppercase text-muted-foreground">{stat.label}</p>
                              <p className="text-base font-semibold">{stat.value}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">Tidak ada perubahan port pada request ini.</p>
                      )}
                    </div>

                    <details className="min-w-0 rounded-md border p-3">
                      <summary className="cursor-pointer text-sm font-medium">Lihat Data Teknis (raw)</summary>
                      <p className="mb-2 mt-3 text-sm font-medium">Snapshot Device</p>
                      <pre className="max-h-48 overflow-auto rounded bg-muted/40 p-2 text-xs">{JSON.stringify(getCreateAssetPayload(selected), null, 2)}</pre>
                      <p className="mb-2 mt-3 text-sm font-medium">Snapshot Ports</p>
                      <pre className="max-h-48 overflow-auto rounded bg-muted/40 p-2 text-xs">{JSON.stringify(selected.payload_snapshot?.device_ports || [], null, 2)}</pre>
                    </details>

                    <div className="rounded-md border p-2">
                      <p className="mb-2 text-sm font-medium">Evidence</p>
                      {evidenceRefs.length ? (
                        <div className="flex flex-wrap gap-1.5">
                          {evidenceRefs.map((ref, index) => (
                            <div key={ref.key} className="overflow-hidden rounded-md border bg-muted/30">
                              <button
                                type="button"
                                onClick={() => void previewEvidence(ref.candidates, `Evidence ${index + 1}`)}
                                disabled={!ref.available}
                                className="block size-16 overflow-hidden border-b disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {evidenceThumbUrls[ref.key] ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={evidenceThumbUrls[ref.key]}
                                    alt={`Evidence ${index + 1}`}
                                    className="size-full object-cover"
                                  />
                                ) : (
                                  <span className="flex size-full items-center justify-center text-[10px] text-muted-foreground">No preview</span>
                                )}
                              </button>
                              <div className="flex size-16 items-center justify-center p-1">
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
                        <p className="text-xs text-muted-foreground">Tidak ada evidence.</p>
                      )}
                    </div>

                    {selected.adminregion_review_note ? (
                      <p className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">Catatan Admin Region: {selected.adminregion_review_note}</p>
                    ) : null}
                    {selected.superadmin_review_note ? (
                      <p className="rounded-md border border-rose-200 bg-rose-50 p-2 text-xs text-rose-900">Catatan Superadmin: {selected.superadmin_review_note}</p>
                    ) : null}

                    <div className="flex flex-wrap gap-2">
                      <Button type="button" onClick={() => void approveSelected()} disabled={acting}>
                        <Check className="mr-2 size-4" />
                        Approve
                      </Button>
                      <Button type="button" variant="destructive" onClick={() => setRejectDialogOpen(true)} disabled={acting}>
                        <X className="mr-2 size-4" />
                        Reject
                      </Button>
                    </div>
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
              <AlertDialogTitle>Reject Request</AlertDialogTitle>
              <AlertDialogDescription>Catatan reject wajib minimal 10 karakter.</AlertDialogDescription>
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

        <AlertDialog
          open={resultDialogOpen}
          onOpenChange={(open) => {
            if (open) {
              setResultDialogOpen(true);
              return;
            }
            closeResultDialog();
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{resultDialogTitle}</AlertDialogTitle>
              <AlertDialogDescription>{resultDialogDescription}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction>OK</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

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
              <AlertDialogTitle>Preview Evidence</AlertDialogTitle>
              <AlertDialogDescription>{evidencePreviewLabel || "-"}</AlertDialogDescription>
            </AlertDialogHeader>
            {evidencePreviewUrl ? (
              <div className="overflow-hidden rounded-md border bg-muted/20">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={evidencePreviewUrl} alt={evidencePreviewLabel || "Evidence"} className="h-[60vh] w-full object-contain" />
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
    <div className="rounded-md border bg-muted/20 p-2">
      <p className="text-[11px] uppercase text-muted-foreground">{title}</p>
      <p className="break-all text-sm">{value}</p>
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
  if (
    source === "adminregion-create-device" ||
    source === "adminregion-create-resource" ||
    source === "adminregion-update-resource" ||
    source === "adminregion-archive-resource"
  ) {
    const resourceLabel = valueText(item?.payload_snapshot?.resource_label || "Device");
    const operation = String(item?.payload_snapshot?.operation || "create").trim();
    const operationLabel = getOperationLabel(operation);
    return {
      kind: "asset_change" as const,
      resourceLabel,
      operationLabel,
      label: `${operationLabel} ${resourceLabel} Request`,
      description: `Review ${operationLabel.toLowerCase()} ${resourceLabel.toLowerCase()} dari adminregion sebelum masuk Asset Overview.`,
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
  if (requestType.kind === "asset_change") {
    const payload = getCreateAssetPayload(item);
    return `${requestType.operationLabel} ${requestType.resourceLabel} | Status ${valueText(payload.status || payload.status_pop)} | Region ${getRegionText(payload.region_id || item.region_id, lookupLabels)}`;
  }

  return `${getChecklistSummary(item.checklist)} | ${getPortSummary(item.payload_snapshot?.device_ports || [])}`;
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
    { title: "Total Port", value: valueText(payload.total_ports) },
    { title: "Used Port", value: valueText(payload.used_ports) },
    { title: "Splitter Ratio", value: valueText(payload.splitter_ratio) },
    { title: "Serial Number", value: valueText(payload.serial_number) },
    { title: "Longitude", value: valueText(payload.longitude) },
    { title: "Latitude", value: valueText(payload.latitude) },
    { title: "Address", value: valueText(payload.address) },
  ];
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

function getOperationLabel(operation: string) {
  if (operation === "update") return "Update";
  if (operation === "archive") return "Archive";
  if (operation === "delete") return "Delete";
  return "Create";
}

function valueText(value: unknown) {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") return value ? "Ya" : "Tidak";
  return String(value);
}

function getChecklistSummary(checklist?: Record<string, boolean> | null) {
  const rows = CHECKLIST_LABELS.map((item) => Boolean(checklist?.[item.key]));
  const checked = rows.filter(Boolean).length;
  return `${checked}/${rows.length} OK`;
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
