"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useTranslate, type TFn } from "@/lib/use-locale";
import { AlertTriangle, ArrowRight, Check, Clock, Inbox, Loader2, ShieldCheck, X } from "lucide-react";
import { ApprovalActions } from "@/components/features/requests/approval-actions";
import { EvidenceChecklistPreview } from "@/components/features/requests/evidence-checklist-preview";
import { RequestActorLine } from "@/components/features/requests/request-actor-line";
import { RequestCard, RequestCardSkeleton } from "@/components/features/requests/request-card";
import { RequestComparison, RequestComparisonSkeleton } from "@/components/features/requests/request-comparison";
import { RequestList } from "@/components/features/requests/request-list";
import { RequestStatusBadge } from "@/components/features/requests/request-status-badge";
import { RequestTypeBadge } from "@/components/features/requests/request-type-badge";
import { OperationalKpiCard, OperationalState } from "@/components/operational-ui";
import { ResponseDialog } from "@/components/response-dialog";
import { useSession } from "@/components/session-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";
import { downloadAttachmentFile, fetchAttachmentBlob, resolveAttachment } from "@/lib/attachment-utils";
import {
  buildAssetRequestSummary,
  buildCreateAssetReviewFields as buildCreateAssetReviewDisplayFields,
  buildFieldValidationComparisonFields as buildFieldValidationComparisonDisplayFields,
  buildFieldValidationReviewFields as buildFieldValidationReviewDisplayFields,
  getPopDisplay,
  getProjectDisplay,
  getRegionDisplay,
} from "@/lib/display-adapters/request-display-adapter";
import { formatDateTime, normalizeRole, valueText } from "@/lib/domain-formatters";
import { RELATION_LABEL_FALLBACK } from "@/lib/relation-labels";

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
    field_validation_type?: string | null;
    resource_name?: string;
    resource_label?: string;
    resource_payload?: Record<string, unknown>;
    before?: Record<string, unknown>;
    device?: Record<string, unknown>;
    general_validation?: Record<string, unknown>;
    technical_validation?: Record<string, unknown>;
    field_validation?: Record<string, unknown>;
    field_inspection?: Record<string, unknown>;
    port_summary?: Record<string, unknown>;
    pop?: Record<string, unknown>;
    route?: Record<string, unknown>;
    project?: Record<string, unknown>;
    portConnection?: Record<string, unknown>;
    context?: Record<string, unknown>;
    device_ports?: Array<Record<string, unknown>>;
    port_objects?: Array<Record<string, unknown>>;
    template?: Record<string, unknown>;
    profile_name?: string | null;
    existing_port_count?: number | string | null;
    missing_port_indexes?: Array<number | string>;
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
type RequestTypeFilter =
  | "all"
  | "create_asset"
  | "update_asset"
  | "archive_asset"
  | "provision_asset"
  | "topology_connection"
  | "field_validation";
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
  const { t } = useTranslate();
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
  const [resultDialogVariant, setResultDialogVariant] = useState<"success" | "error">("success");
  const [evidencePreviewOpen, setEvidencePreviewOpen] = useState(false);
  const [evidencePreviewUrl, setEvidencePreviewUrl] = useState("");
  const [evidencePreviewLabel, setEvidencePreviewLabel] = useState("");
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [evidenceThumbUrls, setEvidenceThumbUrls] = useState<Record<string, string>>({});
  const [lookupLabels, setLookupLabels] = useState<LookupLabels>({ regions: {}, pops: {}, projects: {}, users: {} });
  const [selectedDeviceSnapshot, setSelectedDeviceSnapshot] = useState<Record<string, unknown> | null>(null);
  const [bulkSelectedIds, setBulkSelectedIds] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [bulkConfirmAction, setBulkConfirmAction] = useState<"approve" | "reject" | null>(null);
  const [bulkRejectNote, setBulkRejectNote] = useState("");
  const [bulkRejectError, setBulkRejectError] = useState("");
  const [editPayloadOpen, setEditPayloadOpen] = useState(false);
  const [editPayloadForm, setEditPayloadForm] = useState<Record<string, string>>({});
  const [editPayloadError, setEditPayloadError] = useState("");
  const [editPayloadSaving, setEditPayloadSaving] = useState(false);
  const [payloadPopOptions, setPayloadPopOptions] = useState<Array<{ id: string; label: string }>>([]);
  const [payloadProjectOptions, setPayloadProjectOptions] = useState<Array<{ id: string; label: string }>>([]);

  const filteredItems = useMemo(
    () => {
      const keyword = searchTerm.trim().toLowerCase();
      return items.filter((item) => {
        const requestType = getRequestType(item, t);
        const matchesType = typeFilter === "all" || requestType.kind === typeFilter;
        const matchesStatus = statusFilter === "all" || item.current_status === statusFilter;
        const matchesSearch =
          !keyword ||
          [
            item.request_id,
            item.id,
            getOdpName(item),
            requestType.label,
            getRequestSummary(item, lookupLabels, t),
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(keyword);
        return matchesType && matchesStatus && matchesSearch;
      });
    },
    [items, lookupLabels, searchTerm, statusFilter, typeFilter, t],
  );
  const selected = useMemo(
    () => filteredItems.find((item) => item.id === selectedId) || filteredItems[0] || null,
    [filteredItems, selectedId],
  );
  const queueSummary = useMemo(() => buildQueueSummary(items), [items]);
  const selectedType = getRequestType(selected, t);
  const evidenceRefs = useMemo(() => getRequestAttachmentRefs(selected), [selected]);
  const visibleEvidenceRefs = useMemo(() => {
    const byKey = new Map<string, EvidenceRef>();
    [
      ...filteredItems.slice(0, 20).flatMap((item) => [
        ...getRequestAttachmentRefs(item),
        ...normalizeInspectionEvidenceRefs(item.payload_snapshot?.field_inspection),
      ]),
      ...evidenceRefs,
      ...normalizeInspectionEvidenceRefs(selected?.payload_snapshot?.field_inspection),
    ].forEach((ref) => {
      if (!byKey.has(ref.key)) byKey.set(ref.key, ref);
    });
    return Array.from(byKey.values());
  }, [evidenceRefs, filteredItems, selected]);
  const attachmentLabel = selectedType.kind === "field_validation" ? t("validation.eyebrow.evidence") : t("validation.eyebrow.attachment");
  const isAdminRegionView = activeQueue === "adminregion";
  const isRejectedBySuperadmin = selected?.current_status === "rejected_by_superadmin";
  const reviewContext = useMemo(
    () => getReviewContext(t, activeQueue, selectedType, selected?.current_status),
    [activeQueue, selectedType, selected?.current_status, t],
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
      setError((err as Error).message || t("validation.result.loadFailTitle"));
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
      const message = t("validation.result.approveDescription", { target: selected.request_id || t("validation.result.related") });
      setSuccess(message);
      setDetailDrawerOpen(false);
      openResult(t("validation.result.approveSuccess"), message, false);
      await loadQueue();
    } catch (err) {
      const message = (err as Error).message || t("validation.result.approveFailed");
      setError(message);
      openResult(t("validation.result.approveFailed"), message, true);
    } finally {
      setActing(false);
    }
  }

  async function rejectSelected() {
    if (!selected) return;
    const note = rejectNote.trim();
    if (note.length < 10) {
      setRejectError(t("validation.result.rejectMinimal"));
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
      setDetailDrawerOpen(false);
      setRejectNote("");
      const message = t("validation.result.rejectDescription", { target: selected.request_id || t("validation.result.related") });
      setSuccess(message);
      openResult(t("validation.result.rejectSuccess"), message, false);
      await loadQueue();
    } catch (err) {
      const message = (err as Error).message || t("validation.result.rejectFailed");
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
      const message = t("validation.result.resubmitDescription", { target: selected.request_id || t("validation.result.related") });
      setSuccess(message);
      setDetailDrawerOpen(false);
      openResult(t("validation.result.resubmitSuccess"), message, false);
      await loadQueue();
    } catch (err) {
      const message = (err as Error).message || t("validation.result.resubmitFailed");
      setError(message);
      openResult(t("validation.result.resubmitFailed"), message, true);
    } finally {
      setActing(false);
    }
  }

  function toggleBulkSelect(id: string, checked: boolean) {
    setBulkSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function toggleBulkSelectAll(checked: boolean) {
    setBulkSelectedIds(checked ? new Set(filteredItems.map((item) => item.id)) : new Set());
  }

  const bulkSelectableIds = useMemo(
    () => new Set(filteredItems.map((item) => item.id)),
    [filteredItems],
  );
  const bulkSelectedCount = useMemo(
    () => Array.from(bulkSelectedIds).filter((id) => bulkSelectableIds.has(id)).length,
    [bulkSelectedIds, bulkSelectableIds],
  );
  const bulkAllChecked = bulkSelectedCount > 0 && bulkSelectedCount === filteredItems.length;

  async function runBulkAction() {
    if (!bulkConfirmAction || bulkSelectedCount === 0) return;
    const ids = Array.from(bulkSelectedIds).filter((id) => bulkSelectableIds.has(id));
    if (bulkConfirmAction === "reject") {
      const note = bulkRejectNote.trim();
      if (note.length < 10) {
        setBulkRejectError(t("validation.result.rejectMinimal"));
        return;
      }
      setBulkRejectError("");
    }
    setBulkActionLoading(true);
    setError("");
    setSuccess("");
    try {
      const results = await Promise.allSettled(
        ids.map((id) =>
          apiFetch(
            `/validation-requests/${id}/superadmin/${bulkConfirmAction}`,
            bulkConfirmAction === "reject"
              ? { method: "POST", token, body: JSON.stringify({ note: bulkRejectNote.trim() }) }
              : { method: "POST", token },
          ),
        ),
      );
      const failed = results.filter((result) => result.status === "rejected");
      const succeededCount = results.length - failed.length;
      setBulkConfirmOpen(false);
      setBulkConfirmAction(null);
      setBulkRejectNote("");
      setBulkRejectError("");
      setBulkSelectedIds(new Set());
      const actionWord = t(bulkConfirmAction === "approve" ? "validation.bulkDialog.actionApprove" : "validation.bulkDialog.actionReject");
      const message =
        failed.length === 0
          ? t("validation.result.bulkDescription", { succeeded: succeededCount, action: actionWord })
          : t("validation.result.bulkPartial", { succeeded: succeededCount, failed: failed.length, action: actionWord });
      setSuccess(message);
      openResult(
        t(bulkConfirmAction === "approve" ? "validation.result.bulkApproveSuccess" : "validation.result.bulkRejectSuccess"),
        message,
        false,
      );
      await loadQueue();
    } catch (err) {
      const message = (err as Error).message || t("validation.result.bulkActionFailed");
      setError(message);
      openResult(t("validation.result.bulkActionFailed"), message, true);
    } finally {
      setBulkActionLoading(false);
    }
  }

  function requestBulkConfirm(action: "approve" | "reject") {
    if (bulkSelectedCount === 0) return;
    setBulkConfirmAction(action);
    setBulkRejectNote("");
    setBulkRejectError("");
    setBulkConfirmOpen(true);
  }

  function clearBulkSelection() {
    setBulkSelectedIds(new Set());
    setBulkRejectNote("");
    setBulkRejectError("");
  }

  function openEditPayload() {
    if (!selected) return;
    const payload = getCreateAssetPayload(selected);
    setEditPayloadError("");
    setEditPayloadForm({
      device_name: String(payload.device_name || payload.name || "").trim(),
      pop_id: String(payload.pop_id || "").trim(),
      project_id: String(payload.project_id || "").trim(),
      splitter_ratio: String(payload.splitter_ratio || "").trim(),
      total_ports: String(payload.total_ports || payload.capacity_core || "").trim(),
      address: String(payload.address || "").trim(),
      longitude: String(payload.longitude || "").trim(),
      latitude: String(payload.latitude || "").trim(),
      status: String(payload.status || "installed").trim(),
    });
    setEditPayloadOpen(true);
    void loadPayloadOptions(selected.region_id);
  }

  async function loadPayloadOptions(regionId?: string | null) {
    try {
      const popQuery = regionId ? `/pops?page=1&limit=200&region_id=${encodeURIComponent(regionId)}` : "/pops?page=1&limit=200";
      const projectQuery = regionId ? `/projects?page=1&limit=200&region_id=${encodeURIComponent(regionId)}` : "/projects?page=1&limit=200";
      const [popsRes, projectsRes] = await Promise.all([
        apiFetch<{ data?: Array<{ id: string; pop_name?: string; pop_code?: string }> }>(popQuery, { token }).catch(() => ({ data: [] })),
        apiFetch<{ data?: Array<{ id: string; project_name?: string; project_code?: string }> }>(projectQuery, { token }).catch(() => ({ data: [] })),
      ]);
      setPayloadPopOptions(
        (popsRes.data || []).map((row) => ({
          id: String(row.id),
          label: [row.pop_name, row.pop_code].filter(Boolean).join(" | ") || row.id,
        })),
      );
      setPayloadProjectOptions(
        (projectsRes.data || []).map((row) => ({
          id: String(row.id),
          label: [row.project_name, row.project_code].filter(Boolean).join(" | ") || row.id,
        })),
      );
    } catch {
      // ignore
    }
  }

  async function saveAndResubmitPayload() {
    if (!selected) return;
    const name = editPayloadForm.device_name?.trim();
    if (!name) {
      setEditPayloadError(t("validation.result.deviceNameEmpty"));
      return;
    }
    setEditPayloadSaving(true);
    setEditPayloadError("");
    setError("");
    setSuccess("");
    try {
      const originalPayload = selected.payload_snapshot || {};
      const targetDevice = originalPayload.device || originalPayload.resource_payload || {};
      const nextDevice = {
        ...targetDevice,
        device_name: name,
        pop_id: editPayloadForm.pop_id && editPayloadForm.pop_id !== "__none__" ? editPayloadForm.pop_id : null,
        project_id: editPayloadForm.project_id && editPayloadForm.project_id !== "__none__" ? editPayloadForm.project_id : null,
        splitter_ratio: editPayloadForm.splitter_ratio || null,
        total_ports: editPayloadForm.total_ports ? Number(editPayloadForm.total_ports) : null,
        address: editPayloadForm.address || null,
        longitude: editPayloadForm.longitude || null,
        latitude: editPayloadForm.latitude || null,
        status: editPayloadForm.status || "installed",
      };
      const nextSnapshot = {
        ...originalPayload,
        device: originalPayload.device ? nextDevice : undefined,
        resource_payload: originalPayload.resource_payload ? nextDevice : undefined,
      };

      // 1. Update payload snapshot
      await apiFetch(`/validation-requests/${selected.id}/payload`, {
        method: "PATCH",
        token,
        body: JSON.stringify({ payload_snapshot: nextSnapshot }),
      });

      // 2. Resubmit request ke superadmin
      await apiFetch(`/validation-requests/${selected.id}/adminregion/resubmit`, { method: "POST", token });

      setEditPayloadOpen(false);
      setDetailDrawerOpen(false);
      const message = t("validation.result.resubmitPayloadSuccess", { name });
      setSuccess(message);
      openResult(t("validation.result.resubmitSuccess"), message, false);
      await loadQueue();
    } catch (err) {
      setEditPayloadError((err as Error).message || t("validation.result.resubmitPayloadFail"));
    } finally {
      setEditPayloadSaving(false);
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
    setError(t("validation.result.openEvidenceFail"));
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

  function openResult(title: string, description: string, isError: boolean) {
    setResultDialogTitle(title);
    setResultDialogDescription(description);
    setResultDialogVariant(isError ? "error" : "success");
    setResultDialogOpen(true);
  }

  function selectRequestForReview(id: string) {
    setSelectedId(id);
    if (typeof window === "undefined" || !window.matchMedia("(min-width: 1536px)").matches) {
      setDetailDrawerOpen(true);
    }
  }

  function renderSelectedDetail() {
    if (!selected) {
      return <OperationalState title={t("validation.selectRequest")} description={t("validation.selectRequestDescription")} />;
    }

    return (
      <>
        <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3 min-[1800px]:grid-cols-5">
          <InfoSlot title={t("validation.detail.requestType")}>
            <RequestTypeBadge kind={selectedType.kind} label={selectedType.label} className="max-w-full whitespace-normal break-words text-left text-[10px]" />
          </InfoSlot>
          <Info title={t("validation.detail.device")} value={getOdpName(selected)} />
          <RequestActorLine value={getSubmitterText(selected, lookupLabels)} />
          <Info title={t("validation.detail.currentOwner")} value={getNextOwnerLabel(selected.current_status, t)} />
          <Info title={t("validation.detail.updated")} value={formatDateTime(selected.updated_at)} />
        </div>
        <ActorTimelineCard item={selected} lookupLabels={lookupLabels} t={t} />

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
            t={t}
          />
        ) : null}

        {!isAdminRegionView ? (
          <div className="flex flex-wrap gap-2">
            <Button asChild type="button" size="sm" variant="outline">
              <Link href={`/audit-trail?request_id=${encodeURIComponent(selected.request_id || "")}`}>{t("validation.detail.auditTrail")}</Link>
            </Button>
            {selectedType.kind === "archive_asset" && selected.entity_id ? (
              <Button asChild type="button" size="sm" variant="outline">
                <Link
                  href={`/trash?entity_type=${encodeURIComponent("devices")}&entity_id=${encodeURIComponent(selected.entity_id || "")}`}
                >
                  {t("validation.detail.openTrashDevice")}
                </Link>
              </Button>
            ) : null}
          </div>
        ) : null}

        {selectedType.kind === "field_validation" || (selected.payload_snapshot?.device_ports || []).length ? (
          <PortSummaryCard ports={selected.payload_snapshot?.device_ports || []} t={t} />
        ) : null}
        <TechnicalSnapshotDetails item={selected} t={t} />

        {selected.adminregion_review_note ? (
          <p className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">{t("validation.detail.adminRegionNote", { note: selected.adminregion_review_note })}</p>
        ) : null}
        {selected.superadmin_review_note ? (
          <p className="rounded-md border border-rose-200 bg-rose-50 p-2 text-xs text-rose-900">{t("validation.detail.superadminNote", { note: selected.superadmin_review_note })}</p>
        ) : null}

        <ApprovalActions
          acting={acting}
          showResubmit={isRejectedBySuperadmin && isAdminRegionView}
          approveLabel={reviewContext.approveLabel}
          rejectLabel={reviewContext.rejectLabel}
          onApprove={() => void approveSelected()}
          onReject={() => setRejectDialogOpen(true)}
          onResubmit={() => void resubmitSelected()}
          onEditAndResubmit={
            isAdminRegionView && isRejectedBySuperadmin && selectedType.kind !== "field_validation"
              ? openEditPayload
              : undefined
          }
        />
      </>
    );
  }

  if (!canAdminRegionQueue && !canSuperAdminQueue) {
    return (
      <ScrollArea className="h-full min-h-0 w-full">
        <div className="pr-3">
          <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            {t("validation.accessDenied")}
          </div>
        </div>
      </ScrollArea>
    );
  }

  return (
    <ScrollArea className="h-full min-h-0 w-full">
      <div className="space-y-2 px-3 pb-3 md:px-4 md:pb-4">
        <div className="rounded-xl border border-border/60 bg-background/70 px-3 py-2 shadow-2xs">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <Badge variant="secondary" className="h-6 max-w-[46vw] truncate px-2 font-mono text-[9px] uppercase tracking-[0.15em]">
                {t("validation.approvalCenter")}
              </Badge>
              <Badge variant="outline" className="h-6 max-w-[34vw] truncate px-2 font-mono text-[9px] uppercase tracking-[0.12em]">
                {activeQueue === "adminregion" ? t("validation.adminRegionQueue") : t("validation.superadminQueue")}
              </Badge>
              <span className="hidden min-w-0 text-[11px] text-muted-foreground md:inline">
                {t("validation.headerCaption")}
              </span>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => void loadQueue()} disabled={loading || acting} className="h-7 min-h-7 shrink-0 px-2 text-xs">
              <Loader2 className={`size-3.5 sm:mr-1.5 ${loading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">{t("validation.refresh")}</span>
            </Button>
          </div>
        </div>

        {success ? <p className="rounded-md border border-emerald-200 bg-emerald-50 p-2 text-sm text-emerald-700">{success}</p> : null}
        {error ? <p className="rounded-md border border-destructive/20 bg-destructive/5 p-2 text-sm text-destructive">{error}</p> : null}

        {loading ? <RequestPageSkeleton activeQueue={activeQueue} /> : null}

        {!loading ? (
          <div className="grid min-w-0 gap-4 2xl:grid-cols-[380px_minmax(0,1fr)]">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 2xl:col-span-2">
              <OperationalKpiCard label={t("validation.kpi.queue")} value={items.length} caption={activeQueue === "adminregion" ? t("validation.kpi.queueAdminRegion") : t("validation.kpi.queueSuperadmin")} icon={Inbox} tone="blue" />
              <OperationalKpiCard label={t("validation.kpi.validation")} value={queueSummary.validation} caption={t("validation.kpi.fieldValidation")} icon={ShieldCheck} tone="emerald" />
              <OperationalKpiCard label={t("validation.kpi.assetChange")} value={queueSummary.assetChanges} caption={t("validation.kpi.createUpdateArchive")} icon={Clock} tone="amber" />
            </div>
            <RequestList
              filteredCount={filteredItems.length}
              totalCount={items.length}
              searchTerm={searchTerm}
              typeFilter={typeFilter}
              statusFilter={statusFilter}
              summarySlot={<QueueSummaryChips summary={queueSummary} t={t} />}
              checkedAll={bulkAllChecked}
              onCheckedAllChange={(checked) => toggleBulkSelectAll(checked)}
              bulkActionsSlot={
                bulkSelectedCount > 0 ? (
                  <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-2.5 py-2">
                    <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-primary">
                      {t("validation.bulkSelected", { count: bulkSelectedCount })}
                    </span>
                    <div className="ml-auto flex flex-wrap gap-1.5">
                      <Button type="button" size="sm" variant="default" className="h-7 px-2 text-xs" disabled={bulkActionLoading} onClick={() => requestBulkConfirm("approve")}>
                        <Check className="mr-1 size-3.5" />
                        {t("validation.bulkApprove")}
                      </Button>
                      <Button type="button" size="sm" variant="destructive" className="h-7 px-2 text-xs" disabled={bulkActionLoading} onClick={() => requestBulkConfirm("reject")}>
                        <X className="mr-1 size-3.5" />
                        {t("validation.bulkReject")}
                      </Button>
                      <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={clearBulkSelection}>
                        {t("common.cancel")}
                      </Button>
                    </div>
                  </div>
                ) : null
              }
              onSearchChange={setSearchTerm}
              onTypeFilterChange={(value) => setTypeFilter(value as RequestTypeFilter)}
              onStatusFilterChange={(value) => setStatusFilter(value as RequestStatusFilter)}
            >
                {filteredItems.length ? (
                  filteredItems.map((item) => {
                    const requestType = getRequestType(item, t);
                    return (
                      <RequestCard
                        key={item.id}
                        selected={selected?.id === item.id}
                        checked={bulkSelectedIds.has(item.id)}
                        onCheckedChange={(checked) => toggleBulkSelect(item.id, checked)}
                        title={getOdpName(item)}
                        typeKind={requestType.kind}
                        typeLabel={requestType.label}
                        status={item.current_status}
                        summary={getRequestSummary(item, lookupLabels, t)}
                        ownerLabel={getNextOwnerLabel(item.current_status, t)}
                        updatedAt={formatDateTime(item.updated_at)}
                        quickOpenHref={getQuickOpenHref(item)}
                        onSelect={() => selectRequestForReview(item.id)}
                        evidenceSlot={
                          <EvidenceThumbStrip
                            refs={getRequestAttachmentRefs(item)}
                            thumbUrls={evidenceThumbUrls}
                            label={requestType.kind === "field_validation" ? t("validation.eyebrow.evidence") : t("validation.eyebrow.attachment")}
                            onPreview={previewEvidence}
                          />
                        }
                      />
                    );
                  })
                ) : (
                  <OperationalState
                    title={t("validation.emptyTitle")}
                    description={t("validation.emptyDescription")}
                    actionLabel={t("validation.resetFilter")}
                    onAction={() => {
                      setSearchTerm("");
                      setTypeFilter("all");
                      setStatusFilter("all");
                    }}
                  />
                )}
            </RequestList>

            <Card className="hidden min-w-0 overflow-hidden rounded-2xl border-border/60 shadow-xs glass-inset 2xl:block">
              <CardHeader className="border-b border-border/60 bg-muted/20 px-3 py-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <CardTitle className="text-base font-semibold tracking-tight">{getOdpName(selected) || t("validation.selectRequestTitle")}</CardTitle>
                    <CardDescription className="text-xs">{selectedType.description}</CardDescription>
                  </div>
                  {selected ? (
                    <RequestStatusBadge status={selected.current_status} />
                  ) : null}
                </div>
              </CardHeader>
              <CardContent className="space-y-3 px-3 py-3">
                {renderSelectedDetail()}
              </CardContent>
            </Card>
          </div>
        ) : null}

        <Sheet open={detailDrawerOpen} onOpenChange={setDetailDrawerOpen}>
          <SheetContent side="bottom" className="max-h-[88vh] gap-0 rounded-t-lg p-0 2xl:hidden">
            <SheetHeader className="border-b px-4 py-3 text-left">
              <SheetTitle>{getOdpName(selected) || t("validation.detailRequestTitle")}</SheetTitle>
              <SheetDescription>{selectedType.description}</SheetDescription>
            </SheetHeader>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
              {selected ? (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <RequestStatusBadge status={selected.current_status} />
                    <RequestTypeBadge kind={selectedType.kind} label={selectedType.label} className="max-w-full whitespace-normal break-words text-left text-[10px]" />
                  </div>
                  {renderSelectedDetail()}
                </>
              ) : (
                <OperationalState title={t("validation.selectRequest")} description={t("validation.selectRequestMobile")} />
              )}
            </div>
          </SheetContent>
        </Sheet>

        <AlertDialog
          open={editPayloadOpen}
          onOpenChange={(open) => {
            if (editPayloadSaving) return;
            setEditPayloadOpen(open);
            if (!open) setEditPayloadError("");
          }}
        >
          <AlertDialogContent className="!w-[min(92vw,720px)] !max-w-[min(92vw,720px)]">
            <AlertDialogHeader>
              <AlertDialogTitle>{t("validation.dialog.koreksiData")}</AlertDialogTitle>
              <AlertDialogDescription>{t("validation.dialog.koreksiDescription")}</AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-device-name">{t("validation.dialog.editDeviceName")}</Label>
                <Input
                  id="edit-device-name"
                  value={editPayloadForm.device_name}
                  onChange={(e) => setEditPayloadForm((prev) => ({ ...prev, device_name: e.target.value }))}
                  placeholder={t("validation.dialog.placeholderDeviceName")}
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>{t("validation.dialog.popLabel")}</Label>
                  <Select
                    value={editPayloadForm.pop_id}
                    onValueChange={(value) => setEditPayloadForm((prev) => ({ ...prev, pop_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("validation.dialog.placeholderPop")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">{t("validation.dialog.noPop")}</SelectItem>
                      {payloadPopOptions.map((option) => (
                        <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>{t("validation.dialog.projectLabel")}</Label>
                  <Select
                    value={editPayloadForm.project_id}
                    onValueChange={(value) => setEditPayloadForm((prev) => ({ ...prev, project_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("validation.dialog.placeholderProject")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">{t("validation.dialog.noProject")}</SelectItem>
                      {payloadProjectOptions.map((option) => (
                        <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>{t("validation.dialog.statusLabel")}</Label>
                  <Select
                    value={editPayloadForm.status}
                    onValueChange={(value) => setEditPayloadForm((prev) => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("validation.dialog.placeholderStatus")} />
                    </SelectTrigger>
                    <SelectContent>
                      {["draft", "installed", "active", "inactive", "maintenance", "retired"].map((status) => (
                        <SelectItem key={status} value={status}>{status}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>{t("validation.dialog.capacityLabel")}</Label>
                  <Input
                    type="number"
                    min={1}
                    value={editPayloadForm.total_ports}
                    onChange={(e) => setEditPayloadForm((prev) => ({ ...prev, total_ports: e.target.value }))}
                    placeholder={t("validation.dialog.placeholderCapacity")}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>{t("validation.dialog.splitterRatio")}</Label>
                <Select
                  value={editPayloadForm.splitter_ratio}
                  onValueChange={(value) => setEditPayloadForm((prev) => ({ ...prev, splitter_ratio: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("validation.dialog.placeholderSplitter")} />
                  </SelectTrigger>
                  <SelectContent>
                    {["1:4", "1:8", "1:16", "1:32", "1:64"].map((ratio) => (
                      <SelectItem key={ratio} value={ratio}>{ratio}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>{t("validation.dialog.longitude")}</Label>
                  <Input
                    type="number"
                    step="any"
                    value={editPayloadForm.longitude}
                    onChange={(e) => setEditPayloadForm((prev) => ({ ...prev, longitude: e.target.value }))}
                    placeholder={t("validation.dialog.placeholderLongitude")}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("validation.dialog.latitude")}</Label>
                  <Input
                    type="number"
                    step="any"
                    value={editPayloadForm.latitude}
                    onChange={(e) => setEditPayloadForm((prev) => ({ ...prev, latitude: e.target.value }))}
                    placeholder={t("validation.dialog.placeholderLatitude")}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>{t("validation.dialog.address")}</Label>
                <Input
                  value={editPayloadForm.address}
                  onChange={(e) => setEditPayloadForm((prev) => ({ ...prev, address: e.target.value }))}
                  placeholder={t("validation.dialog.placeholderAddress")}
                />
              </div>
              {editPayloadError ? (
                <p className="rounded-md border border-destructive/20 bg-destructive/5 p-2 text-sm text-destructive">
                  {editPayloadError}
                </p>
              ) : null}
            </div>
            <AlertDialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditPayloadOpen(false)} disabled={editPayloadSaving}>
                {t("common.cancel")}
              </Button>
              <Button type="button" variant="default" onClick={() => void saveAndResubmitPayload()} disabled={editPayloadSaving}>
                {editPayloadSaving ? t("validation.dialog.saving") : t("validation.dialog.saveResubmit")}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

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
              placeholder={t("validation.rejectDialog.placeholder")}
              className="min-h-24 w-full rounded-md border bg-background p-2 text-sm outline-none ring-0"
            />
            {rejectError ? (
              <p className="rounded-md border border-destructive/20 bg-destructive/5 p-2 text-sm text-destructive">
                {rejectError}
              </p>
            ) : null}
            <AlertDialogFooter>
              <Button type="button" variant="outline" onClick={() => setRejectDialogOpen(false)} disabled={acting}>
                {t("common.cancel")}
              </Button>
              <Button type="button" variant="destructive" onClick={() => void rejectSelected()} disabled={acting}>
                {acting ? t("validation.rejectDialog.submitting") : t("validation.rejectDialog.submit")}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog
          open={bulkConfirmOpen}
          onOpenChange={(open) => {
            if (bulkActionLoading) return;
            setBulkConfirmOpen(open);
            if (!open) {
              setBulkConfirmAction(null);
              setBulkRejectNote("");
              setBulkRejectError("");
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {bulkConfirmAction === "approve" ? t("validation.bulkDialog.approveTitle") : t("validation.bulkDialog.rejectTitle")}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {t("validation.bulkDialog.confirmBody", {
                  action: t(bulkConfirmAction === "approve" ? "validation.bulkDialog.actionApprove" : "validation.bulkDialog.actionReject"),
                  count: bulkSelectedCount,
                })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            {bulkConfirmAction === "reject" ? (
              <div className="space-y-2">
                <textarea
                  value={bulkRejectNote}
                  onChange={(event) => {
                    setBulkRejectNote(event.target.value);
                    if (bulkRejectError) setBulkRejectError("");
                  }}
                  placeholder={t("validation.bulkDialog.rejectPlaceholder")}
                  className="min-h-24 w-full rounded-md border bg-background p-2 text-sm outline-none ring-0"
                />
                {bulkRejectError ? (
                  <p className="rounded-md border border-destructive/20 bg-destructive/5 p-2 text-sm text-destructive">
                    {bulkRejectError}
                  </p>
                ) : null}
              </div>
            ) : null}
            <AlertDialogFooter>
              <Button type="button" variant="outline" onClick={() => setBulkConfirmOpen(false)} disabled={bulkActionLoading}>
                {t("common.cancel")}
              </Button>
              <Button
                type="button"
                variant={bulkConfirmAction === "approve" ? "default" : "destructive"}
                onClick={() => void runBulkAction()}
                disabled={bulkActionLoading || (bulkConfirmAction === "reject" && bulkRejectNote.trim().length < 10)}
              >
                {bulkActionLoading ? t("common.processing") : t("validation.bulkDialog.continue")}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <ResponseDialog
          open={resultDialogOpen}
          title={resultDialogTitle}
          description={resultDialogDescription}
          variant={resultDialogVariant}
          actionLabel={t("common.ok")}
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
              <AlertDialogTitle>{t("validation.evidence.previewTitle", { type: attachmentLabel })}</AlertDialogTitle>
              <AlertDialogDescription>{evidencePreviewLabel || "-"}</AlertDialogDescription>
            </AlertDialogHeader>
            {evidencePreviewUrl ? (
              <div className="overflow-hidden rounded-md border bg-muted/20">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={evidencePreviewUrl} alt={evidencePreviewLabel || attachmentLabel} className="h-[60vh] w-full object-contain" />
              </div>
            ) : null}
            <AlertDialogFooter>
              <AlertDialogAction>{t("validation.evidence.close")}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </ScrollArea>
  );
}

function RequestPageSkeleton({ activeQueue }: { activeQueue: QueueType }) {
  const { t } = useTranslate();
  const kpiLabels = [t("validation.skeleton.queueLabel"), t("validation.skeleton.validationLabel"), t("validation.skeleton.assetChangeLabel")];
  return (
    <div className="grid min-w-0 gap-4 2xl:grid-cols-[380px_minmax(0,1fr)]">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 2xl:col-span-2">
        {kpiLabels.map((label) => (
          <Card key={label}>
            <CardContent className="p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
              <Skeleton className="mt-2 h-7 w-14" />
              <Skeleton className="mt-2 h-3 w-28" />
            </CardContent>
          </Card>
        ))}
      </div>
      <RequestList
        filteredCount={0}
        totalCount={0}
        searchTerm=""
        typeFilter="all"
        statusFilter="all"
        summarySlot={<Badge variant="outline">{activeQueue === "adminregion" ? t("validation.skeleton.adminQueueBadge") : t("validation.skeleton.superadminQueueBadge")}</Badge>}
        onSearchChange={() => undefined}
        onTypeFilterChange={() => undefined}
        onStatusFilterChange={() => undefined}
      >
        <RequestCardSkeleton />
        <RequestCardSkeleton />
        <RequestCardSkeleton />
      </RequestList>
      <Card className="min-w-0 overflow-hidden">
        <CardHeader className="border-b bg-muted/20 px-3 py-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3 w-56" />
            </div>
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
        </CardHeader>
        <CardContent className="space-y-3 px-3 py-3">
          <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3 min-[1800px]:grid-cols-5">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="rounded-md border bg-muted/20 p-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="mt-2 h-4 w-24" />
              </div>
            ))}
          </div>
          <RequestComparisonSkeleton />
        </CardContent>
      </Card>
    </div>
  );
}

function getReviewContext(
  t: TFn,
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
      stageLabel: isResubmission ? t("validation.review.revisiAdminRegion") : t("validation.review.adminRegionReview"),
      stageTitle: isValidation ? t("validation.review.stage.validationPemeriksaan") : t("validation.review.stage.verifikasiAwal"),
      stageDescription: isResubmission
        ? t("validation.review.stage.resubmission")
        : isValidation
          ? t("validation.review.stage.cocokkanLapangan")
          : t("validation.review.stage.lengkapiAdmin"),
      ownerLabel: t("validation.review.owner.adminRegion"),
      approveLabel: isValidation ? t("validation.review.approve.keSuperadmin") : t("validation.review.approve.teruskan"),
      rejectLabel: isValidation ? t("validation.review.reject.keValidator") : t("validation.review.reject.request"),
      rejectDialogTitle: isValidation ? t("validation.review.reject.keValidator") : t("validation.review.reject.request"),
      rejectDialogDescription: isValidation
        ? t("validation.review.rejectDialog.validation")
        : t("validation.review.rejectDialog.adminRegion"),
      toneClassName: "border-amber-200/80 bg-amber-50/60 text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/15 dark:text-amber-200",
    };
  }

  return {
    viewerRole,
    stageLabel: t("validation.review.approvalFinal"),
    stageTitle: isValidation ? t("validation.review.stage.keputusanAkhirValidasi") : t("validation.review.stage.keputusanAkhirAsset"),
    stageDescription: isValidation
      ? t("validation.review.stage.nilaiFinalAsset")
      : t("validation.review.stage.perubahanDiterapkan"),
    ownerLabel: t("validation.review.owner.superadmin"),
    approveLabel:
      requestType.kind === "create_asset"
        ? t("validation.review.approve.create")
        : requestType.kind === "update_asset"
          ? t("validation.review.approve.update")
          : requestType.kind === "provision_asset"
            ? t("validation.review.approve.provision")
            : requestType.kind === "topology_connection"
              ? t("validation.review.approve.connection")
              : requestType.kind === "archive_asset"
                ? t("validation.review.approve.archive")
                : t("validation.review.approve.final"),
    rejectLabel: t("validation.review.reject.keAdminRegion"),
    rejectDialogTitle: t("validation.review.reject.keAdminRegion"),
    rejectDialogDescription: t("validation.review.stage.rejectMinimal"),
    toneClassName: "border-validation/40 bg-validation/20 text-[oklch(0.250_0.120_200)] dark:border-validation/50 dark:bg-validation/15 dark:text-validation-foreground",
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

function getRequestAttachmentRefs(item?: ValidationRequestItem | null): EvidenceRef[] {
  if (!item) return [];
  const refs = [
    ...normalizeEvidenceRefs(item.evidence_attachments),
    ...normalizeDeviceSnapshotAttachmentRefs(item.payload_snapshot?.device),
    ...normalizeDeviceSnapshotAttachmentRefs(item.payload_snapshot?.resource_payload),
  ];
  const byKey = new Map<string, EvidenceRef>();
  refs.forEach((ref) => {
    const stableKey = ref.candidates[0] || ref.key;
    if (!byKey.has(stableKey)) byKey.set(stableKey, ref);
  });
  return Array.from(byKey.values());
}

function normalizeDeviceSnapshotAttachmentRefs(value?: Record<string, unknown> | null): EvidenceRef[] {
  if (!value) return [];
  const refs: EvidenceRef[] = [];
  const singleAttachmentId = String(value.image_attachment_id || "").trim();
  if (singleAttachmentId) {
    refs.push({ key: `image-${singleAttachmentId}`, candidates: [singleAttachmentId], available: true });
  }

  const attachments = Array.isArray(value.image_attachments) ? value.image_attachments : [];
  attachments.forEach((attachment, index) => {
    const ref = getInspectionAttachmentRef(attachment, `image-${index}`);
    if (ref) refs.push(ref);
    if (!ref && typeof attachment === "string") {
      const id = attachment.trim();
      if (id) refs.push({ key: `image-${id}-${index}`, candidates: [id], available: true });
    }
  });
  return refs;
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
    <div className="min-w-0 rounded-lg border border-border/50 bg-background px-2.5 py-2 shadow-2xs">
      <p className="font-mono text-[9px] uppercase leading-4 tracking-[0.12em] text-muted-foreground">{title}</p>
      <p className="min-w-0 break-words text-sm font-medium leading-5">{value}</p>
    </div>
  );
}

function InfoSlot({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-w-0 rounded-lg border border-border/50 bg-background px-2.5 py-2 shadow-2xs">
      <p className="font-mono text-[9px] uppercase leading-4 tracking-[0.12em] text-muted-foreground">{title}</p>
      <div className="mt-0.5 flex min-h-5 min-w-0 items-center">{children}</div>
    </div>
  );
}

function ActorTimelineCard({ item, lookupLabels, t }: { item: ValidationRequestItem; lookupLabels: LookupLabels; t: TFn }) {
  const submitterText = getSubmitterText(item, lookupLabels);
  const rows = [
    {
      actionType: item.adminregion_action_type,
      label: formatActorAction(item.adminregion_action_type, t("validation.timeline.adminRegionReview"), t),
      name: getActorText(item.adminregion_actor_name, item.adminregion_actor_email, item.adminregion_actor_user_code),
      at: item.adminregion_action_at,
    },
    {
      actionType: item.superadmin_action_type,
      label: formatActorAction(item.superadmin_action_type, t("validation.timeline.superadminReview"), t),
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
    <div className="min-w-0 rounded-md border bg-muted/20 px-2.5 py-2">
      <p className="text-[10px] uppercase leading-4 text-muted-foreground">{t("validation.timeline.header")}</p>
      <div className="mt-1 grid min-w-0 gap-1 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map((row) => (
          <div key={row.label} className="min-w-0 rounded-md border bg-background/70 px-2 py-1.5">
            <p className="text-[10px] font-medium uppercase text-muted-foreground">{row.label}</p>
            <p className="break-words text-sm font-medium">{row.name}</p>
            <p className="break-words text-[11px] text-muted-foreground">{formatDateTime(row.at)}</p>
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

function getRequestType(item: ValidationRequestItem | null, t: TFn = (key) => key) {
  const source = String(item?.payload_snapshot?.source || "").trim();
  if (isTopologyConnectionRequest(item)) {
    const operationLabel =
      source === "adminregion-update-resource"
        ? "Update"
        : source === "adminregion-archive-resource"
          ? "Archive"
          : "Create";
    return {
      kind: "topology_connection" as const,
      resourceLabel: "Topology Connection",
      operationLabel,
      label: t("validation.type.topologyConnection"),
      description: t("validation.type.topologyDescription"),
    };
  }

  if (source === "adminregion-create-device" || source === "adminregion-create-resource") {
    const resourceLabel = valueText(item?.payload_snapshot?.resource_label || "Device");
    return {
      kind: "create_asset" as const,
      resourceLabel,
      operationLabel: "Create",
      label: t("validation.type.createAsset", { resource: resourceLabel }),
      description: t("validation.type.createDescription", { resource: resourceLabel }),
    };
  }

  if (source === "adminregion-update-resource") {
    const resourceLabel = valueText(item?.payload_snapshot?.resource_label || "Asset");
    return {
      kind: "update_asset" as const,
      resourceLabel,
      operationLabel: "Update",
      label: t("validation.type.updateAsset", { resource: resourceLabel }),
      description: t("validation.type.updateDescription", { resource: resourceLabel }),
    };
  }

  if (source === "adminregion-archive-resource") {
    const resourceLabel = valueText(item?.payload_snapshot?.resource_label || "Asset");
    return {
      kind: "archive_asset" as const,
      resourceLabel,
      operationLabel: "Archive",
      label: t("validation.type.archiveAsset", { resource: resourceLabel }),
      description: t("validation.type.archiveDescription"),
    };
  }

  if (source === "adminregion-provision-device-ports") {
    return {
      kind: "provision_asset" as const,
      resourceLabel: "Device Port",
      operationLabel: "Provision",
      label: t("validation.type.provisionAsset"),
      description: t("validation.type.provisionDescription"),
    };
  }

  return {
    kind: "field_validation" as const,
    resourceLabel: "Device",
    operationLabel: "Validation",
    label: t("validation.type.fieldValidation"),
    description: t("validation.type.validationDescription"),
  };
}

function isTopologyConnectionRequest(item: ValidationRequestItem | null) {
  const resourceName = String(item?.payload_snapshot?.resource_name || "").trim();
  const entityType = String((item as { entity_type?: string | null } | null)?.entity_type || "").trim();
  return resourceName === "portConnections" || entityType === "portConnection" || Boolean(item?.payload_snapshot?.portConnection);
}

function getRequestSummary(item: ValidationRequestItem, lookupLabels: LookupLabels, t: TFn = (key) => key) {
  const requestType = getRequestType(item);
  if (requestType.kind !== "field_validation") {
    if (requestType.kind === "topology_connection") {
      const context = item.payload_snapshot?.context || {};
      return t("validation.requestSummary.topologyConnection", {
        operation: requestType.operationLabel,
        endpoint: formatTopologyEndpoint(context),
        range: formatCoreRange(getCreateAssetPayload(item)),
      });
    }
    if (requestType.kind === "provision_asset") {
      const device = item.payload_snapshot?.device || {};
      const createCount = Array.isArray(item.payload_snapshot?.port_objects) ? item.payload_snapshot.port_objects.length : 0;
      return t("validation.requestSummary.provision", { count: createCount, device: valueText(device.device_name || device.device_id || item.entity_id) });
    }
    return buildAssetRequestSummary(item, requestType, lookupLabels, t);
  }

  return `${getInspectionSummary(item.payload_snapshot?.field_inspection, t)} | ${getPortSummary(item.payload_snapshot?.device_ports || [], t)}`;
}

function getNextOwnerLabel(status?: RequestStatus | null, t: TFn = (key) => key) {
  if (status === "rejected_by_adminregion") return t("validation.owner.revisiValidator");
  if (status === "rejected_by_superadmin") return t("validation.owner.revisiAdminRegion");
  if (status === "validated") return t("validation.owner.selesai");
  if (status === "ongoing_validated" || status === "pending_async") return t("validation.owner.menungguReviewer");
  return t("validation.owner.menungguProses");
}

function getQuickOpenHref(item: ValidationRequestItem) {
  if (!item.entity_id) return "";
  const requestType = getRequestType(item);
  if (requestType.kind === "field_validation") {
    return `/data-management/list/odp/${encodeURIComponent(item.entity_id)}`;
  }
  if (requestType.kind === "provision_asset") {
    return `/data-management/list/odp/${encodeURIComponent(item.entity_id)}`;
  }
  if (requestType.kind === "topology_connection") {
    const payload = getCreateAssetPayload(item);
    const fromDeviceId = String(item.payload_snapshot?.context?.upstream_device_id || payload.from_device_id || "").trim();
    if (fromDeviceId) {
      return `/data-management/topology?tool=connection&start_device_id=${encodeURIComponent(fromDeviceId)}`;
    }
    return "/data-management/topology";
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
  t,
}: {
  summary: ReturnType<typeof buildQueueSummary>;
  t: TFn;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      <QueueSummaryChip label={t("validation.queueChip.total")} value={summary.total} tone="slate" />
      <QueueSummaryChip label={t("validation.queueChip.validation")} value={summary.validation} tone="emerald" />
      <QueueSummaryChip label={t("validation.queueChip.asset")} value={summary.assetChanges} tone="sky" />
      <QueueSummaryChip label={t("validation.queueChip.rejected")} value={summary.rejected} tone="rose" />
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
    <div className={`inline-flex min-w-0 items-center gap-1 rounded-md border px-1.5 py-0.5 ${toneClass}`}>
      <span className="text-[9px] uppercase leading-4 opacity-75">{label}</span>
      <span className="text-xs font-semibold leading-4">{value}</span>
    </div>
  );
}

function getCreateAssetReviewFields(item: ValidationRequestItem, lookupLabels: LookupLabels, t: TFn = (key) => key) {
  return buildCreateAssetReviewDisplayFields(item, lookupLabels, t);
}

function getFieldValidationReviewFields(item: ValidationRequestItem, t: TFn = (key) => key) {
  return buildFieldValidationReviewDisplayFields(item, t);
}

function buildFieldValidationComparisonFields(
  item: ValidationRequestItem,
  currentDevice: Record<string, unknown>,
  lookupLabels: LookupLabels,
  t: TFn = (key) => key,
) {
  return buildFieldValidationComparisonDisplayFields(
    item,
    currentDevice,
    lookupLabels,
    (before, after) => normalizeComparableValue(before) !== normalizeComparableValue(after),
    t,
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
    return <UpdateAssetRequestReview item={item} requestType={requestType} lookupLabels={lookupLabels} />;
  }
  if (requestType.kind === "archive_asset") {
    return <ArchiveAssetRequestReview item={item} requestType={requestType} lookupLabels={lookupLabels} />;
  }
  if (requestType.kind === "provision_asset") {
    return <ProvisionPortsRequestReview item={item} />;
  }
  if (requestType.kind === "topology_connection") {
    return <TopologyConnectionRequestReview item={item} requestType={requestType} lookupLabels={lookupLabels} />;
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
  const { t } = useTranslate();
  const fields = getCreateAssetReviewFields(item, lookupLabels, t);
  const visibleFields = fields.filter((field) => field.value !== "-");
  const identityFields = visibleFields.slice(0, 4);
  const remainingFields = visibleFields.slice(4);
  return (
    <div className="space-y-2 rounded-md border p-2.5">
      <ReviewSectionHeader
        eyebrow={t("validation.eyebrow.create")}
        title={t("validation.create.titleSuffix", { resource: requestType.resourceLabel })}
        description={t("validation.review.createDescription")}
      />
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="rounded-md border bg-muted/20 p-2">
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">{t("validation.section.identitasAsset")}</p>
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {identityFields.map((field) => (
              <Info key={field.title} title={field.title} value={field.value} />
            ))}
          </div>
        </div>
        {remainingFields.length ? (
          <div className="rounded-md border p-2">
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">{t("validation.section.konteksOperasional")}</p>
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
  lookupLabels,
}: {
  item: ValidationRequestItem;
  requestType: RequestType;
  lookupLabels: LookupLabels;
}) {
  const { t } = useTranslate();
  const diffFields = getUpdateDiffFields(item, lookupLabels, t);
  return (
    <div className="space-y-2 rounded-md border p-2.5">
      <ReviewSectionHeader
        eyebrow={t("validation.eyebrow.update")}
        title={t("validation.update.titleSuffix", { resource: requestType.resourceLabel })}
        description={t("validation.review.updateDescription")}
      />
      <div className="grid grid-cols-1 gap-2 md:grid-cols-[160px_minmax(0,1fr)]">
        <div className="rounded-md border bg-muted/20 p-2">
          <p className="text-xs font-medium text-muted-foreground">{t("validation.section.fieldBerubah")}</p>
          <p className="mt-1 text-3xl font-semibold tracking-tight">{diffFields.length}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t("validation.section.bandingkanPerubahan")}</p>
        </div>
        <div className="rounded-md border p-2">
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">{t("validation.section.perubahanField")}</p>
          {diffFields.length ? (
            <div className="space-y-1">
              {diffFields.map((field) => (
                <div key={field.key} className="grid grid-cols-1 gap-1 rounded border bg-background px-2 py-1.5 text-xs sm:grid-cols-[150px_1fr_1fr]">
                  <span className="font-medium">{field.key}</span>
                  <span className="text-muted-foreground">{t("validation.section.sebelum")} {field.before}</span>
                  <span>{t("validation.section.sesudah")} {field.after}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">{t("validation.section.tidakAdaFieldBerubah")}</p>
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
  const { t } = useTranslate();
  const fields = getCreateAssetReviewFields(item, lookupLabels, t);
  return (
    <div className="space-y-2 rounded-md border border-rose-200 bg-rose-50/40 p-2.5">
      <ReviewSectionHeader
        eyebrow={t("validation.eyebrow.archive")}
        title={t("validation.archive.titleSuffix", { resource: requestType.resourceLabel })}
        description={t("validation.review.archiveDescription")}
      />
      <div className="rounded-md border border-rose-200 bg-background/80 p-2">
        <p className="mb-1.5 text-xs font-medium text-rose-700">{t("validation.section.konfirmasiIdentitas")}</p>
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {fields.map((field) => (
            <Info key={field.title} title={field.title} value={field.value} />
          ))}
        </div>
      </div>
      <div className="rounded-md border border-rose-200 bg-rose-100/40 p-2 text-xs text-rose-900">
        {t("validation.section.arsipDariDataAktif")}
      </div>
    </div>
  );
}

function ProvisionPortsRequestReview({ item }: { item: ValidationRequestItem }) {
  const { t } = useTranslate();
  const payload = item.payload_snapshot || {};
  const device = payload.device || {};
  const template = payload.template || {};
  const ports = Array.isArray(payload.port_objects) ? payload.port_objects : [];
  return (
    <div className="space-y-2 rounded-md border border-amber-200 bg-amber-50/40 p-2.5">
      <ReviewSectionHeader
        eyebrow={t("validation.eyebrow.provision")}
        title={t("validation.tipo.title")}
        description={t("validation.review.provisionDescription")}
      />
      <div className="grid grid-cols-1 gap-2 md:grid-cols-[180px_minmax(0,1fr)]">
        <div className="rounded-md border border-amber-200 bg-background/80 p-2">
          <p className="text-xs font-medium text-muted-foreground">{t("validation.section.portDibuat")}</p>
          <p className="mt-1 text-3xl font-semibold tracking-tight">{ports.length}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("validation.section.existing", { value: valueText(payload.existing_port_count) })}
          </p>
        </div>
        <div className="rounded-md border border-amber-200 bg-background/80 p-2">
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">{t("validation.section.konteksProvisioning")}</p>
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
            <Info title={t("validation.tipo.device")} value={valueText(device.device_name || device.device_id || item.entity_id)} />
            <Info title={t("validation.tipo.type")} value={valueText(device.device_type_key)} />
            <Info title={t("validation.tipo.profile")} value={valueText(payload.profile_name || template.profile_name)} />
            <Info title={t("validation.tipo.templatePort")} value={valueText(template.total_ports)} />
            <Info title={t("validation.tipo.startIndex")} value={valueText(template.start_port_index)} />
            <Info title={t("validation.tipo.missingIndex")} value={Array.isArray(payload.missing_port_indexes) ? payload.missing_port_indexes.join(", ") : "-"} />
          </div>
        </div>
      </div>
    </div>
  );
}

function TopologyConnectionRequestReview({
  item,
  requestType,
  lookupLabels,
}: {
  item: ValidationRequestItem;
  requestType: RequestType;
  lookupLabels: LookupLabels;
}) {
  const { t } = useTranslate();
  const payload = getCreateAssetPayload(item);
  const before = item.payload_snapshot?.before || {};
  const context = item.payload_snapshot?.context || {};
  const diffFields = getTopologyConnectionDiffFields(item, lookupLabels, t);
  const isCreate = requestType.operationLabel === "Create";
  const title = isCreate ? t("validation.topo.connectionBaru") : t("validation.topo.connectionOperation", { operation: requestType.operationLabel });

  const fromDeviceType = String(context.upstream_device_type_key || "").trim().toUpperCase();
  const toDeviceType = String(context.odp_device_type_key || "").trim().toUpperCase();
  const hasRelationContext = fromDeviceType || toDeviceType;
  const fromDirection = String(context.upstream_port_direction || "").trim().toLowerCase();
  const toDirection = String(context.odp_port_direction || "").trim().toLowerCase();

  return (
    <div className="space-y-2 rounded-md border border-cyan-200 bg-cyan-50/40 p-2.5">
      <ReviewSectionHeader
        eyebrow={t("validation.eyebrow.topology")}
        title={title}
        description={t("validation.review.topologyDescription")}
      />

      {/* Device Type Relation Badge */}
      {hasRelationContext ? (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-cyan-200 bg-cyan-100/40 px-3 py-2">
          <RelationTypeBadge typeKey={fromDeviceType} label={fromDeviceType || t("validation.topo.deviceFallback")} />
          <ArrowRight className="size-4 text-muted-foreground" />
          <RelationTypeBadge typeKey={toDeviceType} label={toDeviceType || t("validation.topo.deviceFallback")} />
          <span className="text-[11px] text-muted-foreground">
            — {fromDirection === "out" ? t("validation.direction.feederOut") : fromDirection === "in" ? t("validation.direction.input") : ""}
            {fromDirection && toDirection ? " → " : ""}
            {toDirection === "in" ? t("validation.direction.distributionIn") : toDirection === "out" ? t("validation.direction.output") : ""}
          </span>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-2 lg:grid-cols-[minmax(0,1fr)_220px]">
        <div className="rounded-md border border-cyan-200 bg-background/80 p-2">
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">{t("validation.section.endpointConnection")}</p>
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            <Info
              title={t("validation.topo.fromDevice")}
              value={valueText(context.upstream_device_name || context.from_device_name || payload.from_device_name)}
            />
            <Info
              title={t("validation.topo.field.fromPort")}
              value={valueText(context.upstream_port_label || context.from_port_label || payload.from_port_label)}
            />
            <Info
              title={t("validation.topo.toDevice")}
              value={valueText(context.odp_device_name || context.to_device_name || payload.to_device_name)}
            />
            <Info
              title={t("validation.topo.field.toPort")}
              value={valueText(context.odp_port_label || context.to_port_label || payload.to_port_label)}
            />
          </div>
        </div>
        <div className="rounded-md border border-cyan-200 bg-background/80 p-2">
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">{t("validation.section.status")}</p>
          <div className="space-y-1.5">
            <Info title={t("validation.topo.operation")} value={requestType.operationLabel} />
            <Info title={t("validation.topo.connectionStatus")} value={valueText(payload.status || before.status)} />
          </div>
        </div>
      </div>

      <div className="rounded-md border border-cyan-200 bg-background/80 p-2">
        <p className="mb-1.5 text-xs font-medium text-muted-foreground">{t("validation.section.routeCableCore")}</p>
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-4">
          <Info title={t("validation.topo.field.route")} value={formatTopologyRelationValue("route_id", payload.route_id || before.route_id, lookupLabels, t)} />
          <Info title={t("validation.topo.field.cable")} value={valueText(context.cable_device_name || payload.cable_device_name || (payload.cable_device_id ? t("validation.topo.cableSelected") : before.cable_device_id ? t("validation.topo.existingCable") : "-"))} />
          <Info title={t("validation.topo.coreRange")} value={formatCoreRange(payload)} />
          <Info title={t("validation.topo.field.fiberCount")} value={valueText(payload.fiber_count || before.fiber_count)} />
        </div>
      </div>

      {/* Fiber Core Overlap Warning */}
      {hasCoreRangeConflict(payload) ? (
        <div className="rounded-md border border-amber-200 bg-amber-50/60 p-2.5">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
            <div className="space-y-0.5">
              <p className="text-xs font-medium text-amber-900">{t("validation.section.konflikCoreRange")}</p>
              <p className="text-[11px] text-amber-800">
                {t("validation.section.konflikCoreDeskripsi", { range: formatCoreRange(payload) })}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {!isCreate ? (
        <div className="rounded-md border border-cyan-200 bg-background/80 p-2">
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">{t("validation.section.beforeAfterTopology")}</p>
          {diffFields.length ? (
            <div className="space-y-1">
              {diffFields.map((field) => (
                <div key={field.key} className="grid grid-cols-1 gap-1 rounded border bg-background px-2 py-1.5 text-xs sm:grid-cols-[150px_1fr_1fr]">
                  <span className="font-medium">{field.key}</span>
                  <span className="break-words text-muted-foreground">{t("validation.section.sebelum")} {field.before}</span>
                  <span className="break-words">{t("validation.section.sesudah")} {field.after}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">{t("validation.section.tidakAdaPerubahanTeknis")}</p>
          )}
        </div>
      ) : null}
    </div>
  );
}

function RelationTypeBadge({ typeKey, label }: { typeKey: string; label: string }) {
  const colorMap: Record<string, string> = {
    OTB: "border-purple-200 bg-purple-100 text-purple-800 dark:border-purple-500/40 dark:bg-purple-500/20 dark:text-purple-200",
    ODC: "border-cyan-200 bg-cyan-100 text-cyan-800 dark:border-cyan-500/40 dark:bg-cyan-500/20 dark:text-cyan-200",
    ODP: "border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/20 dark:text-emerald-200",
    CABLE: "border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/20 dark:text-amber-200",
    POP: "border-blue-200 bg-blue-100 text-blue-800 dark:border-blue-500/40 dark:bg-blue-500/20 dark:text-blue-200",
  };
  const colorClass = colorMap[typeKey] || "border-slate-200 bg-slate-100 text-slate-800 dark:border-slate-500/40 dark:bg-slate-500/20 dark:text-slate-200";
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${colorClass}`}>
      {label}
    </span>
  );
}

function hasCoreRangeConflict(payload: Record<string, unknown>): boolean {
  const coreStart = payload.core_start;
  const coreEnd = payload.core_end;
  if (coreStart == null || coreEnd == null) return false;
  const start = Number(coreStart);
  const end = Number(coreEnd);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return false;
  return start <= end;
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
  const { t } = useTranslate();
  const fieldRows = getFieldValidationReviewFields(item, t);
  const comparisonRows = buildFieldValidationComparisonFields(
    item,
    currentDeviceSnapshot || item.payload_snapshot?.before || item.payload_snapshot?.device || {},
    lookupLabels,
    t,
  );
  const inspectionSummary = getInspectionSummary(item.payload_snapshot?.field_inspection, t);
  const portSummary = getPortSummary(item.payload_snapshot?.device_ports || [], t);
  const validationDescription =
    reviewContext.viewerRole === "adminregion"
      ? t("validation.validationDesc.adminRegion")
      : t("validation.validationDesc.superadmin");
  return (
    <div className="space-y-2">
      <div className="space-y-2 rounded-md border p-2.5">
        <ReviewSectionHeader
          eyebrow={t("validation.eyebrow.fieldValidation")}
          title={t("validation.section.identitasKapasitas")}
          description={validationDescription}
        />
        <div className={`rounded-md border px-2 py-1.5 text-xs ${reviewContext.toneClassName}`}>
          {reviewContext.viewerRole === "adminregion"
            ? t("validation.focus.adminRegionValidation")
            : t("validation.focus.superadminValidation")}
        </div>
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          <div className="rounded-md border bg-muted/20 px-2 py-1.5">
            <p className="text-xs font-medium text-muted-foreground">{t("validation.section.checklistKondisi")}</p>
            <p className="mt-1 text-sm font-semibold">{inspectionSummary}</p>
          </div>
          <div className="rounded-md border bg-muted/20 px-2 py-1.5">
            <p className="text-xs font-medium text-muted-foreground">{t("validation.section.portRedaman")}</p>
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
        <p className="mb-1.5 text-sm font-medium">{t("validation.section.temuan")}</p>
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
          className="size-9 overflow-hidden rounded-lg border border-border/60 bg-muted/30 shadow-2xs transition hover:scale-105 active:scale-95"
          title={`${label} ${index + 1}`}
        >
          {thumbUrls[ref.key] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumbUrls[ref.key]} alt={`${label} ${index + 1}`} className="size-full object-cover" />
          ) : (
            <span className="flex size-full items-center justify-center font-mono text-[9px] text-muted-foreground">IMG</span>
          )}
        </button>
      ))}
      {refs.length > availableRefs.length ? (
        <Badge variant="outline" className="h-6 px-1.5 font-mono text-[9px] uppercase tracking-normal">
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
  t,
}: {
  title: string;
  refs: EvidenceRef[];
  thumbUrls: Record<string, string>;
  isFieldValidation: boolean;
  onPreview: (candidates: string[], label: string) => Promise<void>;
  onDownload: (candidates: string[]) => Promise<void>;
  t: TFn;
}) {
  return (
    <div className="rounded-xl border border-border/60 p-2.5 shadow-2xs">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <ReviewSectionHeader
          eyebrow={t("validation.eyebrow.evidence")}
          title={t("validation.evidence.photoTitle", { title })}
          description={isFieldValidation ? t("validation.evidence.activeDescription") : t("validation.evidence.attachmentDescription")}
        />
        {isFieldValidation ? <Badge variant="outline" className="font-mono text-[9px] uppercase tracking-normal">{t("validation.evidence.requestActive")}</Badge> : null}
      </div>
      {refs.length ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {refs.map((ref, index) => (
            <div key={ref.key} className="overflow-hidden rounded-lg border border-border/60 bg-muted/30 shadow-2xs">
              <button
                type="button"
                onClick={() => void onPreview(ref.candidates, `${title} ${index + 1}`)}
                disabled={!ref.available}
                className="block aspect-[4/3] w-full overflow-hidden border-b border-border/60 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {thumbUrls[ref.key] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={thumbUrls[ref.key]} alt={`${title} ${index + 1}`} className="size-full object-cover" />
                ) : (
                  <span className="flex size-full items-center justify-center font-mono text-[9px] text-muted-foreground">{t("validation.evidence.noPreviewShort")}</span>
                )}
              </button>
              <div className="flex items-center justify-between gap-2 p-1.5">
                <span className="truncate font-mono text-[10px] text-muted-foreground">{title} {index + 1}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void onDownload(ref.candidates)}
                  disabled={!ref.available}
                  className="h-6 px-2 font-mono text-[9px] uppercase tracking-normal"
                >
                  {t("validation.evidence.download")}
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">{t("validation.section.belumAda", { type: title.toLowerCase() })}</p>
      )}
    </div>
  );
}

function RequestStageBanner({ context }: { context: ReviewContext }) {
  return (
    <div className={`rounded-xl border px-3 py-2.5 shadow-2xs ${context.toneClassName}`}>
      <div className="flex flex-wrap items-start justify-between gap-2.5">
        <div className="space-y-1">
          <Badge variant="outline" className="w-fit border-current bg-background/70 font-mono text-[9px] uppercase tracking-[0.12em]">
            {context.stageLabel}
          </Badge>
          <div>
            <p className="text-sm font-semibold leading-normal tracking-tight">{context.stageTitle}</p>
            <p className="text-xs leading-relaxed opacity-90">{context.stageDescription}</p>
          </div>
        </div>
        <p className="rounded border border-current/25 bg-background/60 px-2 py-1 font-mono text-[10px] uppercase tracking-normal">
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
    <div className="space-y-1">
      <Badge variant="outline" className="w-fit font-mono text-[9px] uppercase tracking-[0.12em]">
        {eyebrow}
      </Badge>
      <div>
        <p className="text-sm font-semibold tracking-tight text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground leading-normal">{description}</p>
      </div>
    </div>
  );
}

function PortSummaryCard({ ports, t }: { ports: Array<Record<string, unknown>>; t: TFn }) {
  return (
    <div className="rounded-md border p-2.5">
      <p className="mb-1.5 text-sm font-medium">{t("validation.portSummaryCard")}</p>
      {ports.length ? (
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-5">
          {renderPortStats(ports, t).map((stat) => (
            <div key={stat.label} className="rounded-md border bg-muted/20 px-2 py-1.5">
              <p className="text-[11px] uppercase text-muted-foreground">{stat.label}</p>
              <p className="text-base font-semibold">{stat.value}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">{t("validation.portSummary.noChanges")}</p>
      )}
    </div>
  );
}

function TechnicalSnapshotDetails({ item, t }: { item: ValidationRequestItem; t: TFn }) {
  return (
    <details className="min-w-0 rounded-md border p-2.5">
      <summary className="cursor-pointer text-sm font-medium">{t("validation.technicalSnapshots")}</summary>
      <p className="mb-2 mt-3 text-sm font-medium">{t("validation.technicalSnapshots.device")}</p>
      <pre className="max-h-48 overflow-auto rounded bg-muted/40 p-2 text-xs">{JSON.stringify(getCreateAssetPayload(item), null, 2)}</pre>
      <p className="mb-2 mt-3 text-sm font-medium">{t("validation.technicalSnapshots.ports")}</p>
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

function getUpdateDiffFields(item: ValidationRequestItem, lookupLabels: LookupLabels, t: TFn = (key) => key) {
  const changes = item.payload_snapshot?.resource_payload || {};
  const before = item.payload_snapshot?.before || {};
  return Object.entries(changes)
    .filter(([key, after]) => !areValuesEquivalent(before[key], after))
    .map(([key, after]) => ({
      key: getUpdateFieldLabel(key, t),
      before: formatUpdateFieldValue(key, before[key], lookupLabels),
      after: formatUpdateFieldValue(key, after, lookupLabels),
    }));
}

function getTopologyConnectionDiffFields(item: ValidationRequestItem, lookupLabels: LookupLabels, t: TFn = (key) => key) {
  const changes = item.payload_snapshot?.resource_payload || {};
  const before = item.payload_snapshot?.before || {};
  return Object.entries(changes)
    .filter(([key, after]) => !areValuesEquivalent(before[key], after))
    .map(([key, after]) => ({
      key: getTopologyConnectionFieldLabel(key, t),
      before: formatTopologyRelationValue(key, before[key], lookupLabels, t),
      after: formatTopologyRelationValue(key, after, lookupLabels, t),
    }));
}

function getTopologyConnectionFieldLabel(key: string, t: TFn = (key) => key) {
  const labels: Record<string, string> = {
    from_port_id: t("validation.topo.field.fromPort"),
    to_port_id: t("validation.topo.field.toPort"),
    connection_type: t("validation.topo.field.connectionType"),
    status: t("validation.topo.field.status"),
    route_id: t("validation.topo.field.route"),
    cable_device_id: t("validation.topo.field.cable"),
    core_start: t("validation.topo.field.coreStart"),
    core_end: t("validation.topo.field.coreEnd"),
    fiber_count: t("validation.topo.field.fiberCount"),
    notes: t("validation.topo.field.notes"),
  };
  return labels[key] || getUpdateFieldLabel(key, t);
}

function formatTopologyRelationValue(key: string, value: unknown, lookupLabels: LookupLabels, t: TFn = (key) => key) {
  if (key === "route_id") return valueText(value);
  if (key === "region_id") return getRegionDisplay(value, lookupLabels);
  if (key === "pop_id") return getPopDisplay(value, lookupLabels);
  if (key === "project_id") return getProjectDisplay(value, lookupLabels);
  if (key.endsWith("_port_id")) return value ? t("validation.topo.portSelected") : t("validation.topo.minus");
  if (key === "cable_device_id") return value ? t("validation.topo.cableSelected") : t("validation.topo.minus");
  return valueText(value);
}

function formatTopologyEndpoint(context: Record<string, unknown>) {
  const fromDevice = valueText(context.upstream_device_name || context.from_device_name);
  const fromPort = valueText(context.upstream_port_label || context.from_port_label);
  const toDevice = valueText(context.odp_device_name || context.to_device_name);
  const toPort = valueText(context.odp_port_label || context.to_port_label);
  return `${fromDevice} ${fromPort !== "-" ? fromPort : ""} -> ${toDevice} ${toPort !== "-" ? toPort : ""}`.replace(/\s+/g, " ").trim();
}

function formatCoreRange(payload: Record<string, unknown>) {
  const start = valueText(payload.core_start);
  const end = valueText(payload.core_end);
  if (start === "-" && end === "-") return "-";
  if (start !== "-" && end !== "-") return `${start}-${end}`;
  return start !== "-" ? start : end;
}

function getUpdateFieldLabel(key: string, t: TFn = (key) => key) {
  const labels: Record<string, string> = {
    region_id: t("validation.field.region"),
    pop_id: t("validation.field.pop"),
    project_id: t("validation.field.project"),
    tenant_id: t("validation.field.tenant"),
    device_name: t("validation.field.namaDevice"),
    status: t("validation.field.status"),
    installation_date: t("validation.field.installationDate"),
    validation_status: t("validation.field.validationStatus"),
    validation_date: t("validation.field.validationDate"),
    serial_number: t("validation.field.serialNumber"),
    management_ip: t("validation.field.managementIp"),
    total_ports: t("validation.field.totalPorts"),
    used_ports: t("validation.field.usedPorts"),
    splitter_ratio: t("validation.field.splitterRatio"),
    odp_type: t("validation.field.tipeOdp"),
    installation_type: t("validation.field.jenisInstalasi"),
    longitude: t("validation.field.longitude"),
    latitude: t("validation.field.latitude"),
    address: t("validation.field.address"),
  };
  return labels[key] || key;
}

function formatUpdateFieldValue(key: string, value: unknown, lookupLabels: LookupLabels) {
  if (key === "region_id") return getRegionDisplay(value, lookupLabels);
  if (key === "pop_id") return getPopDisplay(value, lookupLabels);
  if (key === "project_id") return getProjectDisplay(value, lookupLabels);
  return valueText(value);
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
  const before = item.payload_snapshot?.before || {};
  return {
    regionIds: uniqueIds([payload.region_id, before.region_id, item.region_id]),
    popIds: uniqueIds([payload.pop_id, before.pop_id]),
    projectIds: uniqueIds([payload.project_id, before.project_id]),
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
        return [id, label || RELATION_LABEL_FALLBACK.missing] as const;
      } catch {
        return [id, RELATION_LABEL_FALLBACK.missing] as const;
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
  const code = valueText(item.project_code);
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

function formatActorAction(value: unknown, fallback: string, t: TFn) {
  const action = String(value || "").trim().toLowerCase();
  if (action === "approved_by_adminregion") return t("validation.timeline.adminApproved");
  if (action === "rejected_by_adminregion") return t("validation.timeline.adminRejected");
  if (action === "resubmitted_by_adminregion") return t("validation.timeline.adminResubmitted");
  if (action === "approved_by_superadmin") return t("validation.timeline.superApproved");
  if (action === "rejected_by_superadmin") return t("validation.timeline.superRejected");
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

function getInspectionSummary(inspection?: Record<string, unknown> | null, t: TFn = (key) => key) {
  const checks = objectRecordValues(inspection?.condition_checks);
  if (!checks.length) return t("validation.inspection.kondisiMinus");
  const good = checks.filter((item) => ["Baik", "Bersih", "Lengkap", "Rapi"].includes(String(item.condition || ""))).length;
  return t("validation.inspection.kondisiCount", { good, total: checks.length });
}


function extractApiData(result: { data?: Record<string, unknown> } | Record<string, unknown>) {
  if (result && typeof result === "object" && "data" in result && result.data && typeof result.data === "object") {
    return result.data as Record<string, unknown>;
  }
  return result as Record<string, unknown>;
}

function renderPortStats(ports: Array<Record<string, unknown>>, t: TFn = (key) => key) {
  const rows = Array.isArray(ports) ? ports : [];
  const total = rows.length;
  const used = rows.filter((row) => String(row.status || "").toLowerCase() === "used").length;
  const idle = rows.filter((row) => String(row.status || "").toLowerCase() === "idle").length;
  const reserved = rows.filter((row) => String(row.status || "").toLowerCase() === "reserved").length;
  const down = rows.filter((row) => String(row.status || "").toLowerCase() === "down").length;
  return [
    { label: t("validation.portStat.total"), value: String(total) },
    { label: t("validation.portStat.used"), value: String(used) },
    { label: t("validation.portStat.idle"), value: String(idle) },
    { label: t("validation.portStat.reserved"), value: String(reserved) },
    { label: t("validation.portStat.down"), value: String(down) },
  ];
}

function getPortSummary(ports: Array<Record<string, unknown>>, t: TFn = (key) => key) {
  const stats = renderPortStats(ports, t);
  const total = stats.find((item) => item.label === t("validation.portStat.total"))?.value || "0";
  const used = stats.find((item) => item.label === t("validation.portStat.used"))?.value || "0";
  const idle = stats.find((item) => item.label === t("validation.portStat.idle"))?.value || "0";
  return t("validation.portSummary", { used, total, idle });
}
