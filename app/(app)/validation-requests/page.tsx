"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { Clock, Inbox, RefreshCw, ShieldCheck } from "lucide-react";
import { AppLoading } from "@/components/app-loading-new";
import { ApprovalActions } from "@/components/features/requests/approval-actions";
import { EvidenceChecklistPreview } from "@/components/features/requests/evidence-checklist-preview";
import { RequestActorLine } from "@/components/features/requests/request-actor-line";
import { RequestCard } from "@/components/features/requests/request-card";
import { RequestComparison } from "@/components/features/requests/request-comparison";
import { RequestList } from "@/components/features/requests/request-list";
import { RequestStatusBadge } from "@/components/features/requests/request-status-badge";
import { RequestTypeBadge } from "@/components/features/requests/request-type-badge";
import { OperationalKpiCard, OperationalState } from "@/components/operational-ui";
import { ResponseDialog } from "@/components/response-dialog";
import { useSession } from "@/components/session-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiFetch } from "@/lib/api";
import { downloadAttachmentFile, fetchAttachmentBlob, resolveAttachment } from "@/lib/attachment-utils";
import {
  buildAssetRequestSummary,
  buildCreateAssetReviewFields as buildCreateAssetReviewDisplayFields,
  buildFieldValidationComparisonFields as buildFieldValidationComparisonDisplayFields,
  buildFieldValidationReviewFields as buildFieldValidationReviewDisplayFields,
} from "@/lib/display-adapters/request-display-adapter";
import { formatDateTime, normalizeRole, shortId, valueText } from "@/lib/domain-formatters";

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
  submitted_by_name?: string | null;
  submitted_by_email?: string | null;
  submitted_by_user_code?: string | null;
  adminregion_actor_name?: string | null;
  adminregion_actor_email?: string | null;
  adminregion_actor_user_code?: string | null;
  adminregion_action_at?: string | null;
  adminregion_action_type?: string | null;
  superadmin_actor_name?: string | null;
  superadmin_actor_email?: string | null;
  superadmin_actor_user_code?: string | null;
  superadmin_action_at?: string | null;
  superadmin_action_type?: string | null;
  actor_timeline?: Array<{
    action_type?: string | null;
    actor_role?: string | null;
    actor_name?: string | null;
    actor_email?: string | null;
    actor_user_code?: string | null;
    before_status?: string | null;
    after_status?: string | null;
    note?: string | null;
    created_at?: string | null;
  }> | null;
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
  users: Record<string, string>;
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
  const [searchTerm, setSearchTerm] = useState("");
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
  const [lookupLabels, setLookupLabels] = useState<LookupLabels>({ regions: {}, pops: {}, projects: {}, users: {} });
  const [selectedDeviceSnapshot, setSelectedDeviceSnapshot] = useState<Record<string, unknown> | null>(null);

  const filteredItems = useMemo(
    () => {
      const keyword = searchTerm.trim().toLowerCase();
      return items.filter((item) => {
        const requestType = getRequestType(item);
        const matchesType = typeFilter === "all" || requestType.kind === typeFilter;
        const matchesStatus = statusFilter === "all" || item.current_status === statusFilter;
        const matchesSearch =
          !keyword ||
          [
            item.request_id,
            item.id,
            getOdpName(item),
            requestType.label,
            getRequestSummary(item, lookupLabels),
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(keyword);
        return matchesType && matchesStatus && matchesSearch;
      });
    },
    [items, lookupLabels, searchTerm, statusFilter, typeFilter],
  );
  const selected = useMemo(
    () => filteredItems.find((item) => item.id === selectedId) || filteredItems[0] || null,
    [filteredItems, selectedId],
  );
  const queueSummary = useMemo(() => buildQueueSummary(items), [items]);
  const selectedType = getRequestType(selected);
  const evidenceRefs = useMemo(() => normalizeEvidenceRefs(selected?.evidence_attachments), [selected]);
  const visibleEvidenceRefs = useMemo(() => {
    const byKey = new Map<string, EvidenceRef>();
    [
      ...filteredItems.slice(0, 20).flatMap((item) => [
        ...normalizeEvidenceRefs(item.evidence_attachments),
        ...normalizeInspectionEvidenceRefs(item.payload_snapshot?.field_inspection),
      ]),
      ...evidenceRefs,
      ...normalizeInspectionEvidenceRefs(selected?.payload_snapshot?.field_inspection),
    ].forEach((ref) => {
      if (!byKey.has(ref.key)) byKey.set(ref.key, ref);
    });
    return Array.from(byKey.values());
  }, [evidenceRefs, filteredItems, selected]);
  const attachmentLabel = selectedType.kind === "field_validation" ? "Evidence" : "Attachment";
  const isAdminRegionView = activeQueue === "adminregion";
  const isRejectedBySuperadmin = selected?.current_status === "rejected_by_superadmin";
  const reviewContext = useMemo(
    () => getReviewContext(activeQueue, selectedType, selected?.current_status),
    [activeQueue, selectedType, selected?.current_status],
  );

  useEffect(() => {
    if (!token || visibleEvidenceRefs.length === 0) {
      setEvidenceThumbUrls({});
      return;
    }

    let cancelled = false;
    const objectUrls: string[] = [];

    async function loadThumbs() {
      const next: Record<string, string> = {};
      for (const ref of visibleEvidenceRefs) {
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
  }, [visibleEvidenceRefs, token]);

  useEffect(() => {
    if (!canAdminRegionQueue && !canSuperAdminQueue) return;
    void loadQueue();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeQueue, token, canAdminRegionQueue, canSuperAdminQueue]);

  useEffect(() => {
    if (!selected || selectedType.kind !== "field_validation" || !selected.entity_id || !token) {
      setSelectedDeviceSnapshot(null);
      return;
    }

    let cancelled = false;
    async function loadSelectedDeviceSnapshot() {
      try {
        const result = await apiFetch<{ data?: Record<string, unknown> } | Record<string, unknown>>(
          `/devices/${encodeURIComponent(selected.entity_id || "")}`,
          { token },
        );
        if (cancelled) return;
        setSelectedDeviceSnapshot(extractApiData(result));
      } catch {
        if (!cancelled) setSelectedDeviceSnapshot(null);
      }
    }

    void loadSelectedDeviceSnapshot();
    return () => {
      cancelled = true;
    };
  }, [selected, selectedType.kind, token]);

  useEffect(() => {
    if (!selected || !token) return;
    const lookupIds = collectLookupIds(selected);
    const currentDevicePopId = String(selectedDeviceSnapshot?.pop_id || "").trim();
    const missingRegions = lookupIds.regionIds.filter((id) => !lookupLabels.regions[id]);
    const missingPops = uniqueIds([...lookupIds.popIds, currentDevicePopId]).filter((id) => !lookupLabels.pops[id]);
    const missingProjects = lookupIds.projectIds.filter((id) => !lookupLabels.projects[id]);
    const missingUsers = lookupIds.userIds.filter((id) => !lookupLabels.users[id]);
    if (!missingRegions.length && !missingPops.length && !missingProjects.length && !missingUsers.length) return;

    let cancelled = false;
    async function loadLookupLabels() {
      const [regions, pops, projects, users] = await Promise.all([
        fetchLookupBatch(missingRegions, token, "regions", formatRegionLabel),
        fetchLookupBatch(missingPops, token, "pops", formatPopLabel),
        fetchLookupBatch(missingProjects, token, "projects", formatProjectLabel),
        fetchLookupBatch(missingUsers, token, "users", formatUserLabel),
      ]);
      if (cancelled) return;
      setLookupLabels((prev) => ({
        regions: { ...prev.regions, ...regions },
        pops: { ...prev.pops, ...pops },
        projects: { ...prev.projects, ...projects },
        users: { ...prev.users, ...users },
      }));
    }

    void loadLookupLabels();
    return () => {
      cancelled = true;
    };
  }, [selected, selectedDeviceSnapshot, token, lookupLabels]);

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
            Halaman ini hanya untuk Admin Region/Superadmin.
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
            <div className="xl:col-span-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <OperationalKpiCard label="Queue" value={items.length} caption={activeQueue === "adminregion" ? "Review Admin Region" : "Approval Superadmin"} icon={Inbox} tone="blue" />
              <OperationalKpiCard label="Validation" value={queueSummary.validation} caption="Field validation request" icon={ShieldCheck} tone="emerald" />
              <OperationalKpiCard label="Asset Change" value={queueSummary.assetChanges} caption="Create, update, archive" icon={Clock} tone="amber" />
            </div>
            <RequestList
              filteredCount={filteredItems.length}
              totalCount={items.length}
              searchTerm={searchTerm}
              typeFilter={typeFilter}
              statusFilter={statusFilter}
              summarySlot={<QueueSummaryChips summary={queueSummary} />}
              onSearchChange={setSearchTerm}
              onTypeFilterChange={(value) => setTypeFilter(value as RequestTypeFilter)}
              onStatusFilterChange={(value) => setStatusFilter(value as RequestStatusFilter)}
            >
                {filteredItems.length ? (
                  filteredItems.map((item) => {
                    const requestType = getRequestType(item);
                    return (
                      <RequestCard
                        key={item.id}
                        selected={selected?.id === item.id}
                        title={getOdpName(item)}
                        typeKind={requestType.kind}
                        typeLabel={requestType.label}
                        status={item.current_status}
                        summary={getRequestSummary(item, lookupLabels)}
                        ownerLabel={getNextOwnerLabel(item.current_status)}
                        updatedAt={formatDateTime(item.updated_at)}
                        quickOpenHref={getQuickOpenHref(item)}
                        onSelect={() => setSelectedId(item.id)}
                        evidenceSlot={
                          <EvidenceThumbStrip
                            refs={normalizeEvidenceRefs(item.evidence_attachments)}
                            thumbUrls={evidenceThumbUrls}
                            label="Evidence"
                            onPreview={previewEvidence}
                          />
                        }
                      />
                    );
                  })
                ) : (
                  <OperationalState
                    title="Tidak ada request"
                    description="Tidak ada request yang cocok dengan filter dan pencarian saat ini."
                    actionLabel="Reset Filter"
                    onAction={() => {
                      setSearchTerm("");
                      setTypeFilter("all");
                      setStatusFilter("all");
                    }}
                  />
                )}
            </RequestList>

            <Card>
              <CardHeader className="px-3 py-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">{getOdpName(selected) || "Pilih Request"}</CardTitle>
                    <CardDescription>{selectedType.description}</CardDescription>
                  </div>
                  {selected ? (
                    <RequestStatusBadge status={selected.current_status} />
                  ) : null}
                </div>
              </CardHeader>
              <CardContent className="space-y-3 px-3 pb-3">
                {selected ? (
                  <>
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-3 xl:grid-cols-5">
                      <InfoSlot title="Tipe Request">
                        <RequestTypeBadge kind={selectedType.kind} label={selectedType.label} className="w-fit text-[10px]" />
                      </InfoSlot>
                      <Info title="Device" value={getOdpName(selected)} />
                      <RequestActorLine value={getSubmitterText(selected, lookupLabels)} />
                      <Info title="Current Owner" value={getNextOwnerLabel(selected.current_status)} />
                      <Info title="Updated" value={formatDateTime(selected.updated_at)} />
                    </div>
                    <ActorTimelineCard item={selected} lookupLabels={lookupLabels} />

                    <RequestStageBanner context={reviewContext} />

                    <RequestReviewTemplate
                      item={selected}
                      requestType={selectedType}
                      lookupLabels={lookupLabels}
                      reviewContext={reviewContext}
                      currentDeviceSnapshot={selectedDeviceSnapshot}
                      onPreviewEvidence={previewEvidence}
                      onDownloadEvidence={openEvidence}
                    />
                    {selectedType.kind !== "field_validation" ? (
                      <EvidenceReviewCard
                        title={attachmentLabel}
                        refs={evidenceRefs}
                        thumbUrls={evidenceThumbUrls}
                        isFieldValidation={false}
                        onPreview={previewEvidence}
                        onDownload={openEvidence}
                      />
                    ) : null}

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

                    {selected.adminregion_review_note ? (
                      <p className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">Catatan Admin Region: {selected.adminregion_review_note}</p>
                    ) : null}
                    {selected.superadmin_review_note ? (
                      <p className="rounded-md border border-rose-200 bg-rose-50 p-2 text-xs text-rose-900">Catatan Superadmin: {selected.superadmin_review_note}</p>
                    ) : null}

                    <ApprovalActions
                      acting={acting}
                      showResubmit={isRejectedBySuperadmin && isAdminRegionView}
                      approveLabel={reviewContext.approveLabel}
                      rejectLabel={reviewContext.rejectLabel}
                      onApprove={() => void approveSelected()}
                      onReject={() => setRejectDialogOpen(true)}
                      onResubmit={() => void resubmitSelected()}
                    />
                  </>
                ) : (
                  <OperationalState title="Pilih request" description="Pilih salah satu request di panel kiri untuk melihat detail review." />
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

function normalizeInspectionEvidenceRefs(inspection?: Record<string, unknown> | null): EvidenceRef[] {
  const refs: EvidenceRef[] = [];
  objectRecordValues(inspection?.initial_photos).forEach((item, index) => {
    const ref = getInspectionAttachmentRef(item.attachment, `initial-${index}`);
    if (ref) refs.push(ref);
  });
  objectRecordValues(inspection?.condition_checks).forEach((item, index) => {
    const ref = getInspectionAttachmentRef(item.attachment, `condition-${index}`);
    if (ref) refs.push(ref);
  });
  return refs;
}

function getInspectionAttachmentRef(value: unknown, keyPrefix: string): EvidenceRef | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const attachment = value as Record<string, unknown>;
  const candidates = [
    attachment.id,
    attachment.attachment_id,
    attachment.storage_file_id,
    attachment.file_id,
  ]
    .map((candidate) => String(candidate || "").trim())
    .filter(Boolean);
  if (!candidates.length) return null;
  return {
    key: `${keyPrefix}-${candidates[0]}`,
    candidates,
    available: true,
  };
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

function Info({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-md border bg-muted/20 px-2 py-1.5">
      <p className="text-[10px] uppercase leading-4 text-muted-foreground">{title}</p>
      <p className="break-all text-sm leading-5">{value}</p>
    </div>
  );
}

function InfoSlot({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-md border bg-muted/20 px-2 py-1.5">
      <p className="text-[10px] uppercase leading-4 text-muted-foreground">{title}</p>
      <div className="mt-0.5 flex min-h-5 items-center">{children}</div>
    </div>
  );
}

function ActorTimelineCard({ item, lookupLabels }: { item: ValidationRequestItem; lookupLabels: LookupLabels }) {
  const submitterText = getSubmitterText(item, lookupLabels);
  const rows = [
    {
      actionType: item.adminregion_action_type,
      label: formatActorAction(item.adminregion_action_type, "Admin Region review"),
      name: getActorText(item.adminregion_actor_name, item.adminregion_actor_email, item.adminregion_actor_user_code),
      at: item.adminregion_action_at,
    },
    {
      actionType: item.superadmin_action_type,
      label: formatActorAction(item.superadmin_action_type, "Superadmin review"),
      name: getActorText(item.superadmin_actor_name, item.superadmin_actor_email, item.superadmin_actor_user_code),
      at: item.superadmin_action_at,
    },
  ].filter((row) => {
    if (row.name === "-") return false;
    if (String(row.actionType || "").toLowerCase() === "resubmitted_by_adminregion") return false;
    return normalizeActorDisplay(row.name) !== normalizeActorDisplay(submitterText);
  });

  if (!rows.length) return null;

  return (
    <div className="rounded-md border bg-muted/20 px-2.5 py-2">
      <p className="text-[10px] uppercase leading-4 text-muted-foreground">Actor Timeline</p>
      <div className="mt-1 grid gap-1 md:grid-cols-3">
        {rows.map((row) => (
          <div key={row.label} className="rounded-md border bg-background/70 px-2 py-1.5">
            <p className="text-[10px] font-medium uppercase text-muted-foreground">{row.label}</p>
            <p className="truncate text-sm font-medium">{row.name}</p>
            <p className="text-[11px] text-muted-foreground">{formatDateTime(row.at)}</p>
          </div>
        ))}
      </div>
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
      description: `Review data ${resourceLabel.toLowerCase()} baru dari Admin Region sebelum masuk Asset Overview.`,
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
    return buildAssetRequestSummary(item, requestType, lookupLabels);
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
      <QueueSummaryChip label="Total" value={summary.total} tone="slate" />
      <QueueSummaryChip label="Validation" value={summary.validation} tone="emerald" />
      <QueueSummaryChip label="Asset" value={summary.assetChanges} tone="sky" />
      <QueueSummaryChip label="Rejected" value={summary.rejected} tone="rose" />
    </div>
  );
}

function QueueSummaryChip({ label, value, tone }: { label: string; value: number; tone: "slate" | "emerald" | "sky" | "rose" }) {
  const toneClass =
    tone === "emerald"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/35 dark:bg-emerald-500/15 dark:text-emerald-200"
      : tone === "sky"
        ? "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/35 dark:bg-sky-500/15 dark:text-sky-200"
        : tone === "rose"
          ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/35 dark:bg-rose-500/15 dark:text-rose-200"
          : "border-border bg-muted/20 text-foreground";
  return (
    <div className={`inline-flex min-w-0 items-center gap-1 rounded-md border px-2 py-1 ${toneClass}`}>
      <span className="text-[10px] uppercase leading-4 opacity-75">{label}</span>
      <span className="text-sm font-semibold leading-5">{value}</span>
    </div>
  );
}

function getCreateAssetReviewFields(item: ValidationRequestItem, lookupLabels: LookupLabels) {
  return buildCreateAssetReviewDisplayFields(item, lookupLabels);
}

function getFieldValidationReviewFields(item: ValidationRequestItem) {
  return buildFieldValidationReviewDisplayFields(item);
}

function buildFieldValidationComparisonFields(
  field: Record<string, unknown>,
  currentDevice: Record<string, unknown>,
  lookupLabels: LookupLabels,
) {
  return buildFieldValidationComparisonDisplayFields(
    field,
    currentDevice,
    lookupLabels,
    (before, after) => normalizeComparableValue(before) !== normalizeComparableValue(after),
  );
}

type RequestType = ReturnType<typeof getRequestType>;

function RequestReviewTemplate({
  item,
  requestType,
  lookupLabels,
  reviewContext,
  currentDeviceSnapshot,
  onPreviewEvidence,
  onDownloadEvidence,
}: {
  item: ValidationRequestItem;
  requestType: RequestType;
  lookupLabels: LookupLabels;
  reviewContext: ReviewContext;
  currentDeviceSnapshot?: Record<string, unknown> | null;
  onPreviewEvidence: (candidates: string[], label: string) => Promise<void>;
  onDownloadEvidence: (candidates: string[]) => Promise<void>;
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
  return (
      <ValidationRequestReview
        item={item}
        reviewContext={reviewContext}
        lookupLabels={lookupLabels}
        currentDeviceSnapshot={currentDeviceSnapshot}
        onPreviewEvidence={onPreviewEvidence}
        onDownloadEvidence={onDownloadEvidence}
      />
  );
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
  lookupLabels,
  currentDeviceSnapshot,
  onPreviewEvidence,
  onDownloadEvidence,
}: {
  item: ValidationRequestItem;
  reviewContext: ReviewContext;
  lookupLabels: LookupLabels;
  currentDeviceSnapshot?: Record<string, unknown> | null;
  onPreviewEvidence: (candidates: string[], label: string) => Promise<void>;
  onDownloadEvidence: (candidates: string[]) => Promise<void>;
}) {
  const fieldRows = getFieldValidationReviewFields(item);
  const comparisonRows = buildFieldValidationComparisonFields(
    item.payload_snapshot?.field_validation || {},
    currentDeviceSnapshot || item.payload_snapshot?.before || item.payload_snapshot?.device || {},
    lookupLabels,
  );
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
      <RequestComparison rows={comparisonRows} />
      <EvidenceChecklistPreview
        inspection={item.payload_snapshot?.field_inspection}
        onPreview={onPreviewEvidence}
        onDownload={onDownloadEvidence}
      />
      <div className="rounded-md border p-2.5">
        <p className="mb-1.5 text-sm font-medium">Temuan</p>
        <p className="text-xs text-muted-foreground">{item.finding_note || "-"}</p>
      </div>
    </div>
  );
}

function EvidenceThumbStrip({
  refs,
  thumbUrls,
  label,
  onPreview,
}: {
  refs: EvidenceRef[];
  thumbUrls: Record<string, string>;
  label: string;
  onPreview: (candidates: string[], label: string) => Promise<void>;
}) {
  const availableRefs = refs.filter((ref) => ref.available).slice(0, 4);
  if (!availableRefs.length) return null;

  return (
    <div className="mt-2 flex items-center gap-1.5 overflow-hidden">
      {availableRefs.map((ref, index) => (
        <button
          key={ref.key}
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            void onPreview(ref.candidates, `${label} ${index + 1}`);
          }}
          className="size-9 overflow-hidden rounded-md border bg-muted/30"
          title={`${label} ${index + 1}`}
        >
          {thumbUrls[ref.key] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumbUrls[ref.key]} alt={`${label} ${index + 1}`} className="size-full object-cover" />
          ) : (
            <span className="flex size-full items-center justify-center text-[9px] text-muted-foreground">IMG</span>
          )}
        </button>
      ))}
      {refs.length > availableRefs.length ? (
        <Badge variant="outline" className="h-6 px-1.5 text-[10px]">
          +{refs.length - availableRefs.length}
        </Badge>
      ) : null}
    </div>
  );
}

function EvidenceReviewCard({
  title,
  refs,
  thumbUrls,
  isFieldValidation,
  onPreview,
  onDownload,
}: {
  title: string;
  refs: EvidenceRef[];
  thumbUrls: Record<string, string>;
  isFieldValidation: boolean;
  onPreview: (candidates: string[], label: string) => Promise<void>;
  onDownload: (candidates: string[]) => Promise<void>;
}) {
  return (
    <div className="rounded-md border p-2.5">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <ReviewSectionHeader
          eyebrow="Evidence"
          title={`Foto ${title}`}
          description={
            isFieldValidation
              ? "Preview evidence aktif dari request validasi ini. Evidence histori tetap tersedia di detail ODP."
              : "Preview attachment request untuk membantu review perubahan asset."
          }
        />
        {isFieldValidation ? <Badge variant="outline" className="text-[10px]">Request aktif</Badge> : null}
      </div>
      {refs.length ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {refs.map((ref, index) => (
            <div key={ref.key} className="overflow-hidden rounded-md border bg-muted/30">
              <button
                type="button"
                onClick={() => void onPreview(ref.candidates, `${title} ${index + 1}`)}
                disabled={!ref.available}
                className="block aspect-[4/3] w-full overflow-hidden border-b disabled:cursor-not-allowed disabled:opacity-60"
              >
                {thumbUrls[ref.key] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={thumbUrls[ref.key]} alt={`${title} ${index + 1}`} className="size-full object-cover" />
                ) : (
                  <span className="flex size-full items-center justify-center text-[10px] text-muted-foreground">No preview</span>
                )}
              </button>
              <div className="flex items-center justify-between gap-2 p-1.5">
                <span className="truncate text-[11px] text-muted-foreground">{title} {index + 1}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void onDownload(ref.candidates)}
                  disabled={!ref.available}
                  className="h-6 px-2 text-[10px]"
                >
                  Download
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">Tidak ada {title.toLowerCase()} pada request ini.</p>
      )}
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
    userIds: uniqueIds([item.submitted_by_user_id]),
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
  resource: "regions" | "pops" | "projects" | "users",
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

function formatUserLabel(item: Record<string, unknown>) {
  const name = valueText(item.full_name);
  const code = valueText(item.email || item.user_code);
  if (name === "-" && code === "-") return "-";
  if (name === "-") return code;
  return name;
}

function getUserText(value: unknown, lookupLabels: LookupLabels) {
  const id = String(value || "").trim();
  if (!id) return "-";
  return lookupLabels.users[id] || "-";
}

function getActorText(...values: Array<unknown>) {
  for (const value of values) {
    const text = valueText(value);
    if (text !== "-" && !/^[0-9a-f-]{32,36}$/i.test(text)) return text;
  }
  return "-";
}

function normalizeActorDisplay(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function getSubmitterText(item: ValidationRequestItem, lookupLabels: LookupLabels) {
  return getActorText(item.submitted_by_name, item.submitted_by_email, item.submitted_by_user_code, getUserText(item.submitted_by_user_id, lookupLabels));
}

function formatActorAction(value: unknown, fallback: string) {
  const action = String(value || "").trim().toLowerCase();
  if (action === "approved_by_adminregion") return "Admin Region approved";
  if (action === "rejected_by_adminregion") return "Admin Region rejected";
  if (action === "resubmitted_by_adminregion") return "Admin Region resubmitted";
  if (action === "approved_by_superadmin") return "Superadmin approved";
  if (action === "rejected_by_superadmin") return "Superadmin rejected";
  return fallback;
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

function getInspectionSummary(inspection?: Record<string, unknown> | null) {
  const checks = objectRecordValues(inspection?.condition_checks);
  if (!checks.length) return "Kondisi -";
  const good = checks.filter((item) => ["Baik", "Bersih", "Lengkap", "Rapi"].includes(String(item.condition || ""))).length;
  return `Kondisi ${good}/${checks.length} baik`;
}


function extractApiData(result: { data?: Record<string, unknown> } | Record<string, unknown>) {
  if (result && typeof result === "object" && "data" in result && result.data && typeof result.data === "object") {
    return result.data as Record<string, unknown>;
  }
  return result as Record<string, unknown>;
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
