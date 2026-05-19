"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowUp, Download, RefreshCw, Save } from "lucide-react";
import { AppLoading } from "@/components/app-loading-new";
import { ResponseDialog } from "@/components/response-dialog";
import { useSession } from "@/components/session-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { apiFetch, type PaginatedResponse } from "@/lib/api";
import { downloadAttachmentFile, fetchAttachmentBlob } from "@/lib/attachment-utils";
import { mapValidationStatus } from "@/lib/validation-status";

type DeviceItem = Record<string, unknown> & {
  id: string;
  device_id?: string | null;
  device_name?: string | null;
  device_type_key?: string | null;
  region_id?: string | null;
  validation_status?: string | null;
  validation_date?: string | null;
  total_ports?: number | null;
  used_ports?: number | null;
  splitter_ratio?: string | null;
  pop_id?: string | null;
  address?: string | null;
  longitude?: number | string | null;
  latitude?: number | string | null;
  image_attachments?: unknown;
};

type DevicePort = {
  id: string;
  port_index: number;
  port_label?: string | null;
  port_type?: string | null;
  status?: string | null;
  customer_id?: string | null;
  ont_device_id?: string | null;
  notes?: string | null;
};
type CustomerOption = {
  id: string;
  customer_id?: string | null;
  customer_name?: string | null;
  customer_number?: string | null;
  pop_id?: string | null;
};
type OntOption = {
  id: string;
  device_id?: string | null;
  device_name?: string | null;
  device_type_key?: string | null;
  customer_id?: string | null;
  pop_id?: string | null;
  region_id?: string | null;
};
type PopItem = {
  id: string;
  pop_id?: string | null;
  pop_code?: string | null;
  pop_name?: string | null;
};
type OdpTypeOption = { id: string; odp_type_name: string; odp_type_code?: string | null };
type InstallationTypeOption = { id: string; installation_type_name: string; installation_type_code?: string | null };
type SplitterProfileOption = {
  id: string;
  ratio_label: string;
  output_port_count?: number | null;
  is_active?: boolean | null;
};

type ValidationStatus = "valid" | "warning" | "invalid";
type ValidationDraft = {
  findings: string;
  initialPhotos: Record<InspectionPhotoKey, File | null>;
  conditionChecks: Record<ConditionCheckKey, ConditionCheckDraft>;
  deviceNameNew: string;
  splitterRatio: string;
  totalPortsActual: string;
  odpType: string;
  installationType: string;
  portStatuses: Record<string, string>;
  portAttenuations: Record<string, string>;
};
type InspectionPhotoKey = "overall_near" | "overall_far_pole" | "inside_closeup" | "side_views";
type ConditionCheckKey = "box_odp" | "label_odp" | "cleanliness" | "pigtail_adapter" | "cable_neatness";
type ConditionCheckDraft = {
  condition: string;
  note: string;
  photo: File | null;
};
type UploadedEvidenceRef = { id?: string | null; attachment_id?: string | null; name?: string | null };
type ValidationPortSnapshot = {
  id?: string | null;
  port_index?: number | null;
  port_label?: string | null;
  status?: string | null;
  attenuation_db?: number | null;
  notes?: string | null;
};
type FormSectionKey = "summary" | "identity" | "initial_inspection" | "condition_check" | "ports" | "review_submit";
type ValidationIssue = {
  section: FormSectionKey;
  message: string;
};
type SectionProgress = {
  completed: number;
  total: number;
  detail: string;
  issues: number;
};
type FieldInspectionSnapshot = {
  initial_photos?: Record<string, { label?: string; attachment?: UploadedEvidenceRef }>;
  condition_checks?: Record<string, { label?: string; condition?: string | null; note?: string | null; attachment?: UploadedEvidenceRef }>;
};
type FieldValidationSnapshot = {
  validation_date?: string | null;
  inventory_id?: string | null;
  old_device_name?: string | null;
  new_device_name?: string | null;
  pop_id?: string | null;
  pop_name?: string | null;
  odp_type?: string | null;
  installation_type?: string | null;
  longitude?: number | string | null;
  latitude?: number | string | null;
  splitter_ratio?: string | null;
  total_ports?: number | null;
};
type ValidationRecord = {
  id: string;
  validation_id?: string | null;
  status?: ValidationStatus | null;
  request_status?: string | null;
  validated_at?: string | null;
  findings?: string | null;
  evidence_attachment_id?: string | null;
  evidence_attachments?: UploadedEvidenceRef[] | null;
  payload?: {
    checklist?: Record<string, boolean>;
    field_inspection?: FieldInspectionSnapshot;
    field_validation?: FieldValidationSnapshot;
    port_summary?: {
      total?: number;
      used?: number;
      idle?: number;
      reserved?: number;
      down?: number;
    };
    device_ports?: ValidationPortSnapshot[];
  } | null;
};
type ValidationRequestItem = {
  id: string;
  request_id?: string | null;
  current_status?: string | null;
  finding_note?: string | null;
  checklist?: Record<string, boolean> | null;
    payload_snapshot?: {
    field_inspection?: FieldInspectionSnapshot;
    field_validation?: FieldValidationSnapshot;
    port_summary?: {
      total?: number;
      used?: number;
      idle?: number;
      reserved?: number;
      down?: number;
    };
    device_ports?: ValidationPortSnapshot[];
  } | null;
  evidence_attachments?: Array<{ id?: string | null; attachment_id?: string | null; name?: string | null }> | null;
  adminregion_review_note?: string | null;
  superadmin_review_note?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};
type UploadResult = {
  id: string;
  attachment_id: string;
  original_name: string;
  mime_type: string;
  file_category: string;
  size_bytes: number;
};

const PORT_STATUS_OPTIONS = ["idle", "used", "reserved", "down", "maintenance"];
const INITIAL_PHOTO_ITEMS: Array<{ key: InspectionPhotoKey; label: string }> = [
  { key: "overall_near", label: "Foto keseluruhan ODP jarak dekat" },
  { key: "overall_far_pole", label: "Foto keseluruhan ODP jarak jauh dengan tiang" },
  { key: "inside_closeup", label: "Foto bagian dalam ODP close up" },
  { key: "side_views", label: "Foto tampak kanan dan kiri" },
];
const CONDITION_CHECK_ITEMS: Array<{ key: ConditionCheckKey; label: string; options: string[] }> = [
  { key: "box_odp", label: "Box ODP", options: ["Baik", "Rusak"] },
  { key: "label_odp", label: "Label ODP", options: ["Baik", "Rusak"] },
  { key: "cleanliness", label: "Kebersihan ODP", options: ["Bersih", "Kotor"] },
  { key: "pigtail_adapter", label: "Pigtail dan Adapter", options: ["Lengkap", "Tidak lengkap"] },
  { key: "cable_neatness", label: "Kerapihan Kabel", options: ["Rapi", "Tidak rapi"] },
];
const GOOD_CONDITION_VALUES = new Set(["Baik", "Bersih", "Lengkap", "Rapi"]);
const FORM_SECTIONS: Array<{ key: FormSectionKey; label: string; shortLabel: string }> = [
  { key: "summary", label: "Ringkasan ODP", shortLabel: "Ringkasan" },
  { key: "identity", label: "Identitas & Kapasitas Aktual", shortLabel: "Identitas" },
  { key: "initial_inspection", label: "Pemeriksaan Awal", shortLabel: "Foto Awal" },
  { key: "condition_check", label: "Checklist Kondisi", shortLabel: "Kondisi" },
  { key: "ports", label: "Port & Redaman", shortLabel: "Port" },
  { key: "review_submit", label: "Review & Submit", shortLabel: "Submit" },
];
const FORM_SECTION_LABELS = FORM_SECTIONS.reduce<Record<FormSectionKey, string>>((acc, item) => {
  acc[item.key] = item.label;
  return acc;
}, {} as Record<FormSectionKey, string>);

export default function OdpFieldValidationPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id || "";
  const { token, me } = useSession();
  const [device, setDevice] = useState<DeviceItem | null>(null);
  const [ports, setPorts] = useState<DevicePort[]>([]);
  const [validations, setValidations] = useState<ValidationRecord[]>([]);
  const [validationRequests, setValidationRequests] = useState<ValidationRequestItem[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [ontDevices, setOntDevices] = useState<OntOption[]>([]);
  const [pop, setPop] = useState<PopItem | null>(null);
  const [odpTypes, setOdpTypes] = useState<OdpTypeOption[]>([]);
  const [installationTypes, setInstallationTypes] = useState<InstallationTypeOption[]>([]);
  const [splitterProfiles, setSplitterProfiles] = useState<SplitterProfileOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingPortId, setSavingPortId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [successDialogText, setSuccessDialogText] = useState("");
  const [reloadAfterSuccessDialog, setReloadAfterSuccessDialog] = useState(false);
  const [validationDialogOpen, setValidationDialogOpen] = useState(false);
  const [validationDialogMessage, setValidationDialogMessage] = useState("");
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectDialogMessage, setRejectDialogMessage] = useState("");
  const [validationPreviewUrls, setValidationPreviewUrls] = useState<Record<string, string>>({});
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewRecordId, setPreviewRecordId] = useState("");
  const [lastValidationDialogOpen, setLastValidationDialogOpen] = useState(false);
  const [lastValidationSnapshot, setLastValidationSnapshot] = useState<ValidationRecord | null>(null);
  const [draft, setDraft] = useState<ValidationDraft>(buildDefaultValidationDraft());
  const [portStatusFilter, setPortStatusFilter] = useState("all");
  const [activeSection, setActiveSection] = useState<FormSectionKey>("summary");
  const [showScrollTop, setShowScrollTop] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);

  const summary = useMemo(() => summarizePorts(ports, device), [ports, device]);
  const isOdp = String(device?.device_type_key || "").toUpperCase() === "ODP";
  const inspectionStatus = deriveStatusFromConditionChecks(draft.conditionChecks);
  const inspectionSummary = summarizeConditionChecks(draft.conditionChecks);
  const previewableRecords = useMemo(
    () =>
      validations
        .filter((record) => Boolean(validationPreviewUrls[record.id]))
        .map((record) => ({
          id: record.id,
          label: record.validation_id || record.id,
          url: validationPreviewUrls[record.id],
        })),
    [validations, validationPreviewUrls],
  );
  const activePreview = previewableRecords.find((item) => item.id === previewRecordId) || previewableRecords[0] || null;
  const latestRequest = validationRequests[0] || null;
  const deviceValidationUi = mapValidationStatus(String(device?.validation_status || "unvalidated"));
  const requestValidationUi = latestRequest ? mapValidationStatus(latestRequest.current_status) : null;
  const latestRequestStatus = String(latestRequest?.current_status || "");
  const isRejectedByAdminregion = latestRequestStatus === "rejected_by_adminregion";
  const isRejectedBySuperadmin = latestRequestStatus === "rejected_by_superadmin";
  const isPendingSuperadmin = latestRequestStatus === "pending_async";
  const latestRejectNote = isRejectedByAdminregion
    ? latestRequest?.adminregion_review_note
    : isRejectedBySuperadmin
      ? latestRequest?.superadmin_review_note
      : null;
  const submitBlockedMessage = isPendingSuperadmin
    ? "Request sedang menunggu review superadmin. Tunggu keputusan sebelum submit ulang."
    : isRejectedBySuperadmin
      ? "Request ditolak superadmin. Adminregion perlu review dan resubmit ke superadmin."
      : "";
  const isSubmitBlocked = Boolean(submitBlockedMessage);
  const submitButtonLabel = isRejectedByAdminregion ? "Resubmit Validasi" : "Submit Validasi";
  const validationPortIndexes = useMemo(
    () => buildValidationPortIndexes(draft.totalPortsActual, summary.total || 8),
    [draft.totalPortsActual, summary.total],
  );
  const filteredValidationPortIndexes = useMemo(
    () =>
      validationPortIndexes.filter((portIndex) => {
        if (portStatusFilter === "all") return true;
        const port = ports.find((item) => Number(item.port_index) === portIndex);
        const key = String(portIndex);
        return String(draft.portStatuses[key] || port?.status || "idle") === portStatusFilter;
      }),
    [draft.portStatuses, portStatusFilter, ports, validationPortIndexes],
  );
  const selectedSplitterProfile = useMemo(
    () => splitterProfiles.find((item) => item.ratio_label === draft.splitterRatio) || null,
    [splitterProfiles, draft.splitterRatio],
  );
  const odpCapacityOptions = useMemo(() => {
    const selectedOutput = Number(selectedSplitterProfile?.output_port_count || 0);
    if (Number.isFinite(selectedOutput) && selectedOutput > 0) {
      if (selectedOutput < 16) return [selectedOutput];
      const presets = [8, 16, 32, 64].filter((value) => value <= selectedOutput);
      if (!presets.includes(selectedOutput)) presets.push(selectedOutput);
      return Array.from(new Set(presets)).sort((a, b) => a - b);
    }

    const outputs = splitterProfiles
      .map((item) => Number(item.output_port_count || 0))
      .filter((value) => Number.isFinite(value) && value > 0);
    return Array.from(new Set(outputs.concat([8, 16]))).sort((a, b) => a - b);
  }, [selectedSplitterProfile, splitterProfiles]);
  const validationIssues = useMemo(
    () => getDraftValidationIssues(draft, summary.total || Number(device?.total_ports || 0)),
    [draft, device?.total_ports, summary.total],
  );
  const sectionProgress = useMemo(
    () => buildSectionProgress({ draft, validationPortIndexes, validationIssues, hasDevice: Boolean(device) }),
    [draft, validationIssues, validationPortIndexes, device],
  );

  useEffect(() => {
    if (!message) return;
    setSuccessDialogText(message);
    setSuccessDialogOpen(true);
  }, [message]);

  useEffect(() => {
    const viewport = scrollAreaRef.current?.querySelector<HTMLElement>('[data-slot="scroll-area-viewport"]');
    if (!viewport) return;
    const updateScrollTopVisibility = () => setShowScrollTop(viewport.scrollTop > 360);
    updateScrollTopVisibility();
    viewport.addEventListener("scroll", updateScrollTopVisibility, { passive: true });
    return () => viewport.removeEventListener("scroll", updateScrollTopVisibility);
  }, [loading, device?.id]);

  function scrollToTop() {
    const viewport = scrollAreaRef.current?.querySelector<HTMLElement>('[data-slot="scroll-area-viewport"]');
    viewport?.scrollTo({ top: 0, behavior: "smooth" });
  }

  useEffect(() => {
    if (!id || !token) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const [deviceResult, portResult, validationResult, customersResult, ontResult, odpTypesResult, installationTypesResult, splitterProfilesResult, requestResult] = await Promise.all([
          apiFetch<{ data: DeviceItem }>(`/devices/${id}`, { token }),
          apiFetch<PaginatedResponse<DevicePort>>(`/devicePorts?page=1&limit=200&device_id=${encodeURIComponent(id)}`, { token }),
          apiFetch<PaginatedResponse<ValidationRecord>>(
            `/validations?page=1&limit=5&entity_type=device&entity_id=${encodeURIComponent(id)}&validation_type=field-audit`,
            { token },
          ),
          apiFetch<PaginatedResponse<CustomerOption>>("/customers?page=1&limit=500", { token }),
          apiFetch<PaginatedResponse<OntOption>>("/devices?page=1&limit=500&device_type_key=ONT", { token }),
          optionalPaginatedRequest<OdpTypeOption>(() => apiFetch<PaginatedResponse<OdpTypeOption>>("/odpTypes?page=1&limit=200&is_active=true", { token })),
          optionalPaginatedRequest<InstallationTypeOption>(() => apiFetch<PaginatedResponse<InstallationTypeOption>>("/installationTypes?page=1&limit=200&is_active=true", { token })),
          optionalPaginatedRequest<SplitterProfileOption>(() => apiFetch<PaginatedResponse<SplitterProfileOption>>("/splitterProfiles?page=1&limit=200&is_active=true", { token })),
          apiFetch<{ data: ValidationRequestItem[] }>(`/validation-requests?entity_id=${encodeURIComponent(id)}`, { token }),
        ]);
        if (cancelled) return;
        const loadedDevice = deviceResult.data;
        const loadedPop = loadedDevice.pop_id
          ? await optionalResourceRequest<PopItem>(() => apiFetch<{ data: PopItem }>(`/pops/${encodeURIComponent(String(loadedDevice.pop_id))}`, { token }))
          : null;
        if (cancelled) return;
        if (me.role === "user_region") {
          const allowedRegionIds = new Set((me.app_user.user_region_scopes || []).map((scope) => scope.region_id));
          const deviceRegionId = String(loadedDevice.region_id || "");
          if (!deviceRegionId || !allowedRegionIds.has(deviceRegionId)) {
            router.replace(
              `/field/access-denied?reason=region_mismatch&device_id=${encodeURIComponent(String(loadedDevice.device_id || loadedDevice.id || ""))}&region_id=${encodeURIComponent(deviceRegionId)}`,
            );
            return;
          }
        }
        const requestItems = requestResult.data || [];
        const mappedRequestValidations = requestItems.map(mapValidationRequestToRecord);
        const latestRequestValidation = mappedRequestValidations[0] || null;
        const latestLegacyValidation = validationResult.data?.[0] || null;
        const latestSnapshot = latestRequestValidation || latestLegacyValidation;
        setDevice(loadedDevice);
        setPop(loadedPop);
        const loadedPorts = (portResult.data || []).sort((a, b) => Number(a.port_index) - Number(b.port_index));
        setPorts(loadedPorts);
        setValidations(mappedRequestValidations.length ? mappedRequestValidations : validationResult.data || []);
        setCustomers(customersResult.data || []);
        setOntDevices((ontResult.data || []).filter((item) => String(item.device_type_key || "").toUpperCase() === "ONT"));
        setOdpTypes(odpTypesResult.data || []);
        setInstallationTypes(installationTypesResult.data || []);
        setSplitterProfiles(splitterProfilesResult.data || []);
        setValidationRequests(requestItems);
        setLastValidationSnapshot(latestSnapshot);
        setDraft(buildDefaultValidationDraft(loadedDevice, loadedPorts));
      } catch (err) {
        if (!cancelled) setError((err as Error).message || "Gagal memuat ODP.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [id, token, me.role, me.app_user.user_region_scopes, router]);

  async function refreshValidations() {
    const result = await apiFetch<{ data: ValidationRequestItem[] }>(`/validation-requests?entity_id=${encodeURIComponent(id)}`, { token });
    const requestItems = result.data || [];
    const mapped = requestItems.map(mapValidationRequestToRecord);
    setValidationRequests(requestItems);
    setValidations(mapped);
    setLastValidationSnapshot(mapped[0] || null);
  }

  useEffect(() => {
    if (!token || !validations.length) {
      setValidationPreviewUrls({});
      return;
    }

    let cancelled = false;
    const objectUrls: string[] = [];

    async function loadValidationPreviews() {
      const next: Record<string, string> = {};
      await Promise.all(
        validations.map(async (record) => {
          if (!record.evidence_attachment_id) return;
          try {
            const { blob } = await fetchAttachmentBlob(record.evidence_attachment_id, token, "preview");
            const url = URL.createObjectURL(blob);
            objectUrls.push(url);
            next[record.id] = url;
          } catch {
            // ignore broken preview
          }
        }),
      );
      if (cancelled) return;
      setValidationPreviewUrls(next);
    }

    void loadValidationPreviews();
    return () => {
      cancelled = true;
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [validations, token]);

  async function updatePort(port: DevicePort, changes: Partial<DevicePort>) {
    setSavingPortId(port.id);
    setError("");
    setMessage("");
    setReloadAfterSuccessDialog(false);
    try {
      const payload: Record<string, unknown> = {};
      if (changes.status !== undefined) payload.status = changes.status;
      if (changes.notes !== undefined) payload.notes = changes.notes || null;
      if (changes.customer_id !== undefined) payload.customer_id = changes.customer_id || null;
      if (changes.ont_device_id !== undefined) payload.ont_device_id = changes.ont_device_id || null;
      const result = await apiFetch<{ data: DevicePort }>(`/devicePorts/${port.id}`, {
        method: "PATCH",
        token,
        body: payload,
      });
      setPorts((prev) =>
        prev
          .map((item) => (item.id === port.id ? { ...item, ...result.data } : item))
          .sort((a, b) => Number(a.port_index) - Number(b.port_index)),
      );
      if (changes.status !== undefined) {
        setDraft((prev) => ({
          ...prev,
          portStatuses: {
            ...prev.portStatuses,
            [String(port.port_index)]: String(changes.status || "idle"),
          },
        }));
      }
      setMessage(`Port ${formatOdpPortLabel(port)} tersimpan.`);
    } catch (err) {
      const messageText = (err as Error).message || "Gagal menyimpan port.";
      setError(messageText);
      if (messageText.includes("status=used requires customer_id or ont_device_id")) {
        setRejectDialogMessage("Status port tidak bisa disimpan sebagai used. Isi Customer atau ONT terlebih dahulu.");
        setRejectDialogOpen(true);
      }
    } finally {
      setSavingPortId("");
    }
  }

  async function submitValidation() {
    if (!device) return;
    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      const firstIssue = getDraftValidationIssues(draft, summary.total || Number(device.total_ports || 0))[0];
      if (firstIssue) {
        setActiveSection(firstIssue.section);
        setValidationDialogMessage(`${FORM_SECTION_LABELS[firstIssue.section]}: ${firstIssue.message}`);
        setValidationDialogOpen(true);
        return;
      }
      const evidenceAttachments: UploadedEvidenceRef[] = [];
      const fieldInspection = await uploadInspectionEvidence({ token, deviceId: device.id, draft, evidenceAttachments });

      const totalPortsActual = normalizePortCapacity(draft.totalPortsActual, summary.total || 8);
      const validationPortPayload = buildValidationPortPayload(ports, draft, totalPortsActual);
      const portSummary = summarizeValidationPortPayload(validationPortPayload);
      const checklist = buildLegacyChecklistFromInspection(draft.conditionChecks, validationPortPayload);
      await apiFetch("/validation-requests", {
        method: "POST",
        token,
        body: {
          entity_id: device.id,
          checklist,
          finding_note: draft.findings.trim() || null,
          evidence_attachments: evidenceAttachments,
          payload_snapshot: {
            source: "field-mode",
            device: {
              id: device.id,
              ...(draft.deviceNameNew.trim() && draft.deviceNameNew.trim() !== String(device.device_name || "").trim()
                ? { device_name: draft.deviceNameNew.trim() }
                : {}),
              splitter_ratio: nullIfEmpty(draft.splitterRatio),
              odp_type: nullIfEmpty(draft.odpType),
              installation_type: nullIfEmpty(draft.installationType),
              total_ports: totalPortsActual,
              used_ports: portSummary.used,
              address: device.address || null,
              longitude: device.longitude ?? null,
              latitude: device.latitude ?? null,
            },
            field_validation: {
              validation_date: new Date().toISOString().slice(0, 10),
              validation_status: inspectionStatus,
              inventory_id: device.device_id || null,
              old_device_name: device.device_name || null,
              new_device_name: draft.deviceNameNew.trim() && draft.deviceNameNew.trim() !== String(device.device_name || "").trim() ? draft.deviceNameNew.trim() : null,
              pop_id: device.pop_id || null,
              pop_name: getPopDisplayName(pop),
              address: device.address || null,
              longitude: device.longitude ?? null,
              latitude: device.latitude ?? null,
              odp_type: nullIfEmpty(draft.odpType),
              installation_type: nullIfEmpty(draft.installationType),
              splitter_ratio: nullIfEmpty(draft.splitterRatio),
              total_ports: totalPortsActual,
              port_summary: portSummary,
            },
            field_inspection: fieldInspection,
            port_summary: portSummary,
            device_ports: validationPortPayload,
          },
        },
      });
      await refreshValidations();
      setDraft(buildDefaultValidationDraft(device, ports));
      setReloadAfterSuccessDialog(true);
      setMessage("Request validasi ODP berhasil dikirim.");
    } catch (err) {
      setError((err as Error).message || "Gagal submit validasi.");
    } finally {
      setSubmitting(false);
    }
  }

  async function downloadEvidence(record: ValidationRecord) {
    if (!record.evidence_attachment_id) return;
    try {
      await downloadAttachmentFile(record.evidence_attachment_id, token);
    } catch (err) {
      setError((err as Error).message || "Gagal download evidence.");
    }
  }

  if (loading) {
    return <AppLoading label="Memuat field validation ODP..." />;
  }

  if (error && !device) {
    return (
      <div className="mx-auto max-w-2xl space-y-3 p-4">
        <p className="text-sm text-destructive">{error}</p>
        <Button asChild variant="outline">
          <Link href="/data-management">Kembali</Link>
        </Button>
      </div>
    );
  }

  if (!device) return null;

  return (
    <ScrollArea ref={scrollAreaRef} className="h-full min-h-0 w-full overflow-x-hidden">
      <div className="w-full max-w-full space-y-4 overflow-x-hidden px-3 pb-3 md:px-4 md:pb-4">
        <div className="grid gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm" className="min-w-0 flex-1 sm:flex-none">
              <Link href={`/data-management/list/odp/${device.id}`}>
                <ArrowLeft className="mr-2 size-4" />
                Detail ODP
              </Link>
            </Button>
            <Button type="button" variant="ghost" size="icon" onClick={() => location.reload()} className="shrink-0 sm:hidden" title="Refresh">
              <RefreshCw className="size-4" />
            </Button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Badge variant="outline" className="w-fit">QR Scan Result</Badge>
            <Button type="button" variant="ghost" size="sm" onClick={() => location.reload()} className="hidden sm:inline-flex">
            <RefreshCw className="mr-2 size-4" />
            Refresh
            </Button>
          </div>
        </div>

        {message ? <p className="rounded-md border border-emerald-200 bg-emerald-50 p-2 text-sm text-emerald-700">{message}</p> : null}
        {error ? <p className="rounded-md border border-destructive/20 bg-destructive/5 p-2 text-sm text-destructive">{error}</p> : null}

        <ValidationSectionTabs
          activeSection={activeSection}
          progress={sectionProgress}
          onSectionChange={(section) => setActiveSection(section)}
        />

        {activeSection === "summary" ? (
          <OdpSummaryReadOnlySection
            device={device}
            isOdp={isOdp}
            deviceValidationUi={deviceValidationUi}
            requestValidationUi={requestValidationUi}
            summary={summary}
          />
        ) : null}

        <div className="grid gap-4">
          {activeSection === "summary" || activeSection === "ports" ? <div className="space-y-4">
            {activeSection === "summary" ? <Card>
              <CardHeader className="px-3 py-2">
                <CardTitle className="text-base">Status Request Validasi</CardTitle>
                <CardDescription>Progress approval validator - adminregion - superadmin.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 px-3 pb-3">
                {latestRequest ? (
                  <div className="rounded-md border bg-muted/20 p-3 text-sm">
                    <p className="font-medium">#{latestRequest.request_id || latestRequest.id}</p>
                    <p className="text-muted-foreground">Status: {requestValidationUi?.label || "-"}</p>
                    {latestRequest.adminregion_review_note ? (
                      <p className="mt-2 rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900">
                        Catatan Admin Region: {latestRequest.adminregion_review_note}
                      </p>
                    ) : null}
                    {latestRequest.superadmin_review_note ? (
                      <p className="mt-2 rounded-md border border-rose-300 bg-rose-50 p-2 text-xs text-rose-900">
                        Catatan Superadmin: {latestRequest.superadmin_review_note}
                      </p>
                    ) : null}
                    <p className="mt-2 text-xs text-muted-foreground">Update terakhir: {formatDateTime(latestRequest.updated_at)}</p>
                  </div>
                ) : (
                  <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">Belum ada request validasi untuk ODP ini.</p>
                )}
              </CardContent>
            </Card> : null}

            {activeSection === "ports" ? <PortEditorSection visibleCount={filteredValidationPortIndexes.length} totalCount={validationPortIndexes.length}>
              <CardContent className="space-y-2 px-3 pb-3">
                <Combobox
                  value={portStatusFilter}
                  onValueChange={setPortStatusFilter}
                  triggerClassName="h-9 text-xs"
                  options={[
                    { value: "all", label: "Semua status port" },
                    ...PORT_STATUS_OPTIONS.map((status) => ({ value: status, label: status })),
                  ]}
                  searchPlaceholder="Filter status port..."
                />
                <div className="rounded-md border border-blue-200 bg-blue-50/70 px-3 py-2 text-xs text-blue-950 dark:border-blue-900/60 dark:bg-blue-950/25 dark:text-blue-100">
                  <div className="mb-1 flex flex-wrap items-center gap-2 font-medium">
                    <Badge variant="outline" className="h-4 rounded px-1.5 text-[9px] uppercase tracking-normal">
                      Auto-fill
                    </Badge>
                    Relasi port mengikuti POP ODP
                  </div>
                  <p className="text-blue-900/80 dark:text-blue-100/80">
                    Pilih customer untuk mengisi ONT terkait jika tersedia di POP yang sama. Pilih ONT akan mengisi customer terkait. Status idle otomatis
                    mengosongkan customer dan ONT.
                  </p>
                </div>
                {validationPortIndexes.length ? (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">
                    {filteredValidationPortIndexes.map((portIndex) => {
                      const port = ports.find((item) => Number(item.port_index) === portIndex);
                      const key = String(portIndex);
                      return (
                      <div key={port?.id || `draft-port-${key}`} className="rounded-md border bg-background p-2.5 sm:p-3">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{port ? formatOdpPortLabel(port) : `#${portIndex}`}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              {port ? describePortAssignmentState(port) : "Port baru dari kapasitas aktual"}
                            </p>
                          </div>
                          <span className={`h-3 w-3 shrink-0 rounded-full ${statusDot(draft.portStatuses[key] || port?.status)}`} />
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                          <Combobox
                            value={draft.portStatuses[key] || port?.status || "idle"}
                            onValueChange={(status) => {
                              setDraft((prev) => ({
                                ...prev,
                                portStatuses: { ...prev.portStatuses, [key]: status },
                              }));
                              if (port) {
                                const changes: Partial<DevicePort> =
                                  status === "idle"
                                    ? { status, customer_id: null, ont_device_id: null }
                                    : { status };
                                void updatePort(port, changes);
                              }
                            }}
                            disabled={savingPortId === port?.id}
                            triggerClassName="h-9"
                            options={PORT_STATUS_OPTIONS.map((status) => ({ value: status, label: status }))}
                          />
                          {port ? (
                            <>
                              <Combobox
                                value={port.customer_id || "__none__"}
                                onValueChange={(value) => {
                                  const customerId = value === "__none__" ? null : value;
                                  const linkedOnt = customerId ? findOntForCustomer(ontDevices, customerId, device?.pop_id, port.ont_device_id) : null;
                                  const currentOnt = port.ont_device_id
                                    ? ontDevices.find((item) => item.id === port.ont_device_id) || null
                                    : null;
                                  const currentOntMatchesCustomer =
                                    currentOnt?.customer_id &&
                                    customerId &&
                                    currentOnt.customer_id === customerId &&
                                    isSamePop(currentOnt.pop_id, device?.pop_id);
                                  const changes: Partial<DevicePort> = {
                                    customer_id: customerId,
                                    ont_device_id: customerId
                                      ? linkedOnt?.id || (currentOntMatchesCustomer ? port.ont_device_id : null)
                                      : port.ont_device_id || null,
                                  };
                                  if (customerId || changes.ont_device_id) changes.status = "used";
                                  if (!customerId && !changes.ont_device_id) changes.status = "idle";
                                  void updatePort(port, changes);
                                }}
                                disabled={savingPortId === port.id}
                                triggerClassName="h-9"
                                options={[
                                  { value: "__none__", label: "Tanpa customer" },
                                  ...customers
                                    .filter((item) => isSamePop(item.pop_id, device?.pop_id))
                                    .map((item) => ({
                                      value: item.id,
                                      label: [item.customer_name, item.customer_id || item.customer_number].filter(Boolean).join(" - ") || item.id,
                                    })),
                                ]}
                                searchPlaceholder="Cari customer..."
                              />
                              <Combobox
                                value={port.ont_device_id || "__none__"}
                                onValueChange={(value) => {
                                  const ontDeviceId = value === "__none__" ? null : value;
                                  const selectedOnt = ontDeviceId
                                    ? ontDevices.find((item) => item.id === ontDeviceId) || null
                                    : null;
                                  const changes: Partial<DevicePort> = {
                                    ont_device_id: ontDeviceId,
                                    customer_id: selectedOnt && isSamePop(selectedOnt.pop_id, device?.pop_id)
                                      ? selectedOnt.customer_id || port.customer_id || null
                                      : port.customer_id || null,
                                  };
                                  if (ontDeviceId || changes.customer_id) changes.status = "used";
                                  if (!ontDeviceId && !changes.customer_id) changes.status = "idle";
                                  void updatePort(port, changes);
                                }}
                                disabled={savingPortId === port.id}
                                triggerClassName="h-9"
                                options={[
                                  { value: "__none__", label: "Tanpa ONT" },
                                  ...ontDevices
                                    .filter((item) => isSamePop(item.pop_id, device?.pop_id))
                                    .map((item) => ({
                                      value: item.id,
                                      label: [item.device_name, item.device_id].filter(Boolean).join(" - ") || item.id,
                                    })),
                                ]}
                                searchPlaceholder="Cari ONT..."
                              />
                            </>
                          ) : null}
                          <div className="space-y-1">
                            <RequiredLabel>Redaman Port</RequiredLabel>
                            <Input
                              value={draft.portAttenuations[key] || ""}
                              onChange={(event) =>
                                setDraft((prev) => ({
                                  ...prev,
                                  portAttenuations: { ...prev.portAttenuations, [key]: event.target.value },
                                }))
                              }
                              disabled={submitting}
                              placeholder="dB"
                              className="h-9"
                            />
                          </div>
                          <Input
                            key={`${port?.id || key}-${port?.notes || ""}`}
                            defaultValue={port?.notes || ""}
                            onBlur={(event) => {
                              if (port && event.target.value !== (port.notes || "")) {
                                void updatePort(port, { notes: event.target.value });
                              }
                            }}
                            disabled={!port || savingPortId === port.id}
                            placeholder="Catatan port"
                            className="h-9"
                          />
                        </div>
                      </div>
                    );
                    })}
                    {!filteredValidationPortIndexes.length ? (
                      <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">Tidak ada port dengan status filter ini.</p>
                    ) : null}
                  </div>
                ) : (
                  <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">Port ODP belum tersedia.</p>
                )}
              </CardContent>
            </PortEditorSection> : null}

            {activeSection === "summary" ? <Card>
              <CardHeader className="px-3 py-2">
                <CardTitle className="text-base">Histori Validasi</CardTitle>
                <CardDescription>Record validasi lapangan terbaru untuk ODP ini.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 px-3 pb-3">
                {validations.length ? (
                  validations.map((record) => {
                    const fieldValidation = record.payload?.field_validation || {};
                    const evidenceCount = countValidationEvidence(record);
                    return (
                    <div key={record.id} className="rounded-md border bg-background p-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge variant={record.status === "valid" ? "default" : "outline"}>{record.status || "-"}</Badge>
                            {record.request_status ? (
                              <Badge variant="outline" className={mapValidationStatus(record.request_status).className}>
                                {mapValidationStatus(record.request_status).label}
                              </Badge>
                            ) : null}
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {record.validation_id || record.id} - {formatDateTime(record.validated_at)}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                            <span>Nama: {valueText(fieldValidation.new_device_name || fieldValidation.old_device_name)}</span>
                            <span>Tanggal: {formatDate(String(fieldValidation.validation_date || ""))}</span>
                            <span>Evidence: {evidenceCount}</span>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={!evidenceCount}
                          onClick={() => void downloadEvidence(record)}
                        >
                          <Download className="mr-1.5 size-3.5" />
                          Evidence ({evidenceCount})
                        </Button>
                      </div>
                      {record.findings ? <p className="mt-2 text-sm">{record.findings}</p> : null}
                      {validationPreviewUrls[record.id] ? (
                        <button
                          type="button"
                          className="mt-2 overflow-hidden rounded-md border"
                          onClick={() => {
                            setPreviewRecordId(record.id);
                            setPreviewOpen(true);
                          }}
                        >
                          <Image
                            src={validationPreviewUrls[record.id]}
                            alt={`Evidence ${record.validation_id || record.id}`}
                            width={80}
                            height={80}
                            unoptimized
                            className="size-16 object-cover"
                          />
                        </button>
                      ) : null}
                      <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                        <span>Kondisi {formatInspectionSummary(record.payload?.field_inspection)}</span>
                        <span>Splitter {valueText(fieldValidation.splitter_ratio)}</span>
                        <span>Total {record.payload?.port_summary?.total ?? "-"}</span>
                        <span>Used {record.payload?.port_summary?.used ?? "-"}</span>
                        <span>Idle {record.payload?.port_summary?.idle ?? "-"}</span>
                        <span>Down {record.payload?.port_summary?.down ?? "-"}</span>
                      </div>
                      <FieldValidationSnapshotSummary validation={record.payload?.field_validation} />
                      <PortSnapshotSummary ports={record.payload?.device_ports} />
                      <InspectionSnapshotSummary inspection={record.payload?.field_inspection} />
                    </div>
                  );
                  })
                ) : (
                  <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">Belum ada histori validasi.</p>
                )}
              </CardContent>
            </Card> : null}
          </div> : null}

          {["identity", "initial_inspection", "condition_check", "review_submit"].includes(activeSection) ? <Card className="order-1">
            <CardHeader className="px-3 py-2">
              <CardTitle className="text-base">{FORM_SECTION_LABELS[activeSection]}</CardTitle>
              <CardDescription>Workspace validasi teknis ODP berbasis section.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 px-3 pb-3">
              {latestRejectNote ? (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                  <p className="font-medium">{isRejectedByAdminregion ? "Catatan reject adminregion" : "Catatan reject superadmin"}</p>
                  <p className="mt-1">{latestRejectNote}</p>
                  {isRejectedByAdminregion ? (
                    <p className="mt-2 text-amber-800">
                      Submit ulang akan memakai data asset saat ini dan mengganti snapshot request aktif.
                    </p>
                  ) : null}
                </div>
              ) : null}
              {submitBlockedMessage ? (
                <p className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">{submitBlockedMessage}</p>
              ) : null}
              {activeSection === "review_submit" && lastValidationSnapshot ? (
                <div className="space-y-2 rounded-md border bg-muted/20 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-medium text-muted-foreground">Validasi Terakhir</p>
                    <Badge variant={lastValidationSnapshot.status === "valid" ? "default" : "outline"}>
                      {lastValidationSnapshot.status || "-"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {lastValidationSnapshot.validation_id || lastValidationSnapshot.id} - {formatDateTime(lastValidationSnapshot.validated_at)}
                  </p>
                  {lastValidationSnapshot.findings ? (
                    <p className="text-xs text-muted-foreground">Temuan: {lastValidationSnapshot.findings}</p>
                  ) : null}
                  <p className="text-xs text-muted-foreground">Kondisi {formatInspectionSummary(lastValidationSnapshot.payload?.field_inspection)}</p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={submitting}
                      onClick={() => setLastValidationDialogOpen(true)}
                    >
                      Lihat Detail
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={submitting}
                      onClick={() => setDraft(buildDraftFromSnapshot(lastValidationSnapshot))}
                    >
                      Gunakan Data Terakhir
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={submitting}
                      onClick={() => setDraft(buildDefaultValidationDraft(device, ports))}
                    >
                      Reset Form
                    </Button>
                  </div>
                </div>
              ) : activeSection === "review_submit" ? (
                <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                  Form ini untuk validasi baru. Data histori akan muncul setelah submit pertama.
                </div>
              ) : null}

              {activeSection === "identity" ? <IdentityCapacitySection inspectionStatus={inspectionStatus}>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  <InfoField label="Tanggal Validasi" value={formatDate(new Date().toISOString())} />
                  <InfoField label="ID Inventory" value={device.device_id || "-"} />
                  <InfoField label="Nama ODP Lama" value={device.device_name || "-"} />
                  <InfoField label="POP" value={getPopDisplayName(pop) || String(device.pop_id || "-")} />
                  <InfoField label="Alamat" value={device.address || "-"} />
                  <InfoField label="Longitude" value={device.longitude == null ? "-" : String(device.longitude)} />
                  <InfoField label="Latitude" value={device.latitude == null ? "-" : String(device.latitude)} />
                  <div className="space-y-1">
                    <RequiredLabel>Nama ODP Baru</RequiredLabel>
                    <Input
                      value={draft.deviceNameNew}
                      onChange={(event) => setDraft((prev) => ({ ...prev, deviceNameNew: event.target.value }))}
                      disabled={submitting}
                      placeholder="Nama ODP sesuai lapangan"
                    />
                  </div>
                  <div className="space-y-1">
                    <RequiredLabel>Tipe ODP</RequiredLabel>
                    <Combobox
                      value={draft.odpType}
                      onValueChange={(value) => setDraft((prev) => ({ ...prev, odpType: value }))}
                      disabled={submitting}
                      options={odpTypes.map((item) => ({
                        value: item.odp_type_name,
                        label: [item.odp_type_name, item.odp_type_code].filter(Boolean).join(" - "),
                      }))}
                      placeholder="Contoh: ODP Pole Box"
                      searchPlaceholder="Cari tipe ODP..."
                    />
                  </div>
                  <div className="space-y-1">
                    <RequiredLabel>Jenis Instalasi</RequiredLabel>
                    <Combobox
                      value={draft.installationType}
                      onValueChange={(value) => setDraft((prev) => ({ ...prev, installationType: value }))}
                      disabled={submitting}
                      options={installationTypes.map((item) => ({
                        value: item.installation_type_name,
                        label: [item.installation_type_name, item.installation_type_code].filter(Boolean).join(" - "),
                      }))}
                      placeholder="Contoh: Aerial"
                      searchPlaceholder="Cari jenis instalasi..."
                    />
                  </div>
                  <div className="space-y-1">
                    <RequiredLabel>Kapasitas ODP</RequiredLabel>
                    <Combobox
                      value={draft.totalPortsActual}
                      onValueChange={(value) => setDraft((prev) => ({ ...prev, totalPortsActual: value }))}
                      disabled={submitting}
                      options={odpCapacityOptions.map((port) => ({
                        value: String(port),
                        label: `${port} port`,
                      }))}
                      placeholder="Pilih kapasitas ODP"
                      searchPlaceholder="Cari kapasitas ODP..."
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <RequiredLabel>Kapasitas Splitter</RequiredLabel>
                      <Badge variant="outline" className="h-4 rounded px-1.5 text-[9px] uppercase tracking-normal text-blue-700 dark:text-blue-300">
                        Auto-fill
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Pilihan splitter akan mengisi rekomendasi kapasitas ODP. Koreksi kapasitas jika hasil inspeksi lapangan berbeda.
                    </p>
                    <Combobox
                      value={draft.splitterRatio}
                      onValueChange={(value) => {
                        const profile = splitterProfiles.find((item) => item.ratio_label === value) || null;
                        const output = Number(profile?.output_port_count || 0);
                        const autoTotal = Number.isFinite(output) && output > 0 ? (output >= 16 ? 8 : output) : 0;
                        setDraft((prev) => ({
                          ...prev,
                          splitterRatio: value,
                          totalPortsActual: autoTotal ? String(autoTotal) : prev.totalPortsActual,
                        }));
                      }}
                      disabled={submitting}
                      options={splitterProfiles.map((item) => ({
                        value: item.ratio_label,
                        label: item.output_port_count ? `${item.ratio_label} (${item.output_port_count} port)` : item.ratio_label,
                      }))}
                      placeholder="Pilih kapasitas splitter"
                      searchPlaceholder="Cari kapasitas splitter..."
                    />
                  </div>
                </div>
              </IdentityCapacitySection> : null}

              {activeSection === "initial_inspection" ? <InitialInspectionSection>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {INITIAL_PHOTO_ITEMS.map((item) => (
                    <EvidenceFileInput
                      key={item.key}
                      label={item.label}
                      file={draft.initialPhotos[item.key]}
                      disabled={submitting}
                      onChange={(file) =>
                        setDraft((prev) => ({
                          ...prev,
                          initialPhotos: { ...prev.initialPhotos, [item.key]: file },
                        }))
                      }
                    />
                  ))}
                </div>
              </InitialInspectionSection> : null}

              {activeSection === "condition_check" ? <ConditionChecklistSection>
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                  {CONDITION_CHECK_ITEMS.map((item) => {
                    const check = draft.conditionChecks[item.key];
                    return (
                      <div key={item.key} className="rounded-md border p-2">
                        <div className="mb-2 flex flex-wrap items-center gap-1.5">
                          <p className="text-sm font-medium">{item.label}</p>
                          <RequiredBadge />
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                          <div className="space-y-1">
                            <RequiredLabel>Kondisi</RequiredLabel>
                            <Combobox
                              value={check.condition}
                              onValueChange={(condition) => setDraft((prev) => ({
                                ...prev,
                                conditionChecks: {
                                  ...prev.conditionChecks,
                                  [item.key]: { ...prev.conditionChecks[item.key], condition },
                                },
                              }))}
                              disabled={submitting}
                              options={item.options.map((option) => ({ value: option, label: option }))}
                              placeholder="Pilih kondisi"
                              searchPlaceholder="Cari kondisi..."
                            />
                          </div>
                          <div className="space-y-1">
                            <RequiredLabel badgeText="If issue">Keterangan</RequiredLabel>
                            <Input
                              value={check.note}
                              onChange={(event) => setDraft((prev) => ({
                                ...prev,
                                conditionChecks: {
                                  ...prev.conditionChecks,
                                  [item.key]: { ...prev.conditionChecks[item.key], note: event.target.value },
                                },
                              }))}
                              disabled={submitting}
                              placeholder="Keterangan lapangan"
                            />
                          </div>
                          <EvidenceFileInput
                            label="Foto"
                            file={check.photo}
                            disabled={submitting}
                            compact
                            onChange={(file) =>
                              setDraft((prev) => ({
                                ...prev,
                                conditionChecks: {
                                  ...prev.conditionChecks,
                                  [item.key]: { ...prev.conditionChecks[item.key], photo: file },
                                },
                              }))
                            }
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ConditionChecklistSection> : null}

              {activeSection === "review_submit" ? <div className="grid grid-cols-1 gap-2">
                <div className="rounded-md border bg-muted/20 p-3">
                  <p className="text-xs font-medium text-muted-foreground">Ringkasan Checklist Kondisi</p>
                  <p className="mt-1 text-sm">
                    {inspectionSummary.good}/{CONDITION_CHECK_ITEMS.length} kondisi baik, {inspectionSummary.issue} perlu perhatian.
                  </p>
                </div>
                <div className="space-y-1">
                  <Label>Temuan</Label>
                  <Input
                    value={draft.findings}
                    onChange={(event) => setDraft((prev) => ({ ...prev, findings: event.target.value }))}
                    disabled={submitting}
                    placeholder="Catatan kondisi lapangan"
                  />
                </div>
              </div> : null}

              {activeSection === "review_submit" ? <ReviewSubmitSummary
                draft={draft}
                validationIssues={validationIssues}
                validationPortIndexes={validationPortIndexes}
                inspectionSummary={inspectionSummary}
              /> : null}

              {activeSection === "review_submit" ? <div className="grid grid-cols-1 gap-2">
                <Button type="button" onClick={() => void submitValidation()} disabled={submitting || isSubmitBlocked} className="h-11 w-full sm:h-10">
                  {submitting ? <RefreshCw className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
                  {submitButtonLabel}
                </Button>
              </div> : null}
              {activeSection === "review_submit" ? <p className="text-xs text-muted-foreground">Evidence diambil dari foto pemeriksaan awal dan checklist kondisi. Semua item wajib diisi sebelum submit.</p> : null}
            </CardContent>
          </Card> : null}
        </div>
      </div>
      <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Status Port Ditolak</AlertDialogTitle>
            <AlertDialogDescription>
              {rejectDialogMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>Tutup</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={validationDialogOpen} onOpenChange={setValidationDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Field wajib belum lengkap</AlertDialogTitle>
            <AlertDialogDescription>{validationDialogMessage}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>Tutup</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={lastValidationDialogOpen} onOpenChange={setLastValidationDialogOpen}>
        <AlertDialogContent className="sm:max-w-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Detail Validasi Terakhir</AlertDialogTitle>
            <AlertDialogDescription>
              {lastValidationSnapshot
                ? `${lastValidationSnapshot.validation_id || lastValidationSnapshot.id} - ${formatDateTime(lastValidationSnapshot.validated_at)}`
                : "Tidak ada data validasi terakhir."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {lastValidationSnapshot ? (
            <div className="space-y-3 text-sm">
              <div className="rounded-md border bg-muted/20 p-3">
                <p className="text-xs text-muted-foreground">Status</p>
                <p className="font-medium">{lastValidationSnapshot.status || "-"}</p>
              </div>
              <div className="rounded-md border bg-background p-3">
                <p className="text-xs text-muted-foreground">Pemeriksaan Lapangan</p>
                <InspectionSnapshotSummary inspection={lastValidationSnapshot.payload?.field_inspection} />
              </div>
              <div className="grid grid-cols-2 gap-2 rounded-md border bg-background p-3 text-xs">
                <p>Total: {lastValidationSnapshot.payload?.port_summary?.total ?? "-"}</p>
                <p>Used: {lastValidationSnapshot.payload?.port_summary?.used ?? "-"}</p>
                <p>Idle: {lastValidationSnapshot.payload?.port_summary?.idle ?? "-"}</p>
                <p>Down: {lastValidationSnapshot.payload?.port_summary?.down ?? "-"}</p>
              </div>
              <div className="rounded-md border bg-background p-3">
                <p className="text-xs text-muted-foreground">Temuan</p>
                <p className="mt-1 text-sm">{lastValidationSnapshot.findings || "-"}</p>
              </div>
            </div>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogAction>Tutup</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <AlertDialogContent className="!w-[min(92vw,960px)] !max-w-[min(92vw,960px)] p-3 sm:p-4">
          <AlertDialogHeader>
            <AlertDialogTitle>Preview Evidence</AlertDialogTitle>
            <AlertDialogDescription>{activePreview?.label || "-"}</AlertDialogDescription>
          </AlertDialogHeader>
          {activePreview ? (
            <div className="space-y-3">
              <div className="overflow-hidden rounded-md border bg-muted/20">
                <Image
                  src={activePreview.url}
                  alt={`Evidence ${activePreview.label}`}
                  width={1200}
                  height={800}
                  unoptimized
                  className="h-[60vh] w-full object-contain"
                />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {previewableRecords.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setPreviewRecordId(item.id)}
                    className={`overflow-hidden rounded-md border ${item.id === activePreview.id ? "ring-2 ring-primary/40" : ""}`}
                  >
                    <Image src={item.url} alt={item.label} width={56} height={56} unoptimized className="size-14 object-cover" />
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogAction>Tutup</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <ResponseDialog
        open={successDialogOpen}
        title="Berhasil"
        description={successDialogText}
        variant="success"
        actionLabel="Tutup"
        onOpenChange={(open) => {
          setSuccessDialogOpen(open);
          if (!open && reloadAfterSuccessDialog) {
            location.reload();
          }
        }}
        onAction={() => {
          setSuccessDialogOpen(false);
          if (reloadAfterSuccessDialog) {
            location.reload();
          }
        }}
      />
      {showScrollTop ? (
        <Button
          type="button"
          size="icon"
          variant="secondary"
          className="fixed bottom-[calc(env(safe-area-inset-bottom)+5rem)] right-4 z-50 size-10 rounded-full border shadow-lg sm:hidden"
          onClick={scrollToTop}
          title="Kembali ke atas"
        >
          <ArrowUp className="size-4" />
        </Button>
      ) : null}
    </ScrollArea>
  );
}

function ValidationSectionTabs({
  activeSection,
  progress,
  onSectionChange,
}: {
  activeSection: FormSectionKey;
  progress: Record<FormSectionKey, SectionProgress>;
  onSectionChange: (section: FormSectionKey) => void;
}) {
  return (
    <Tabs value={activeSection} onValueChange={(value) => onSectionChange(value as FormSectionKey)} className="sticky top-0 z-20 -mx-1 max-w-full bg-background/95 py-1 backdrop-blur">
      <div className="max-w-full overflow-hidden pb-1">
        <TabsList className="grid h-auto w-full grid-cols-3 justify-start rounded-md bg-muted/70 p-1 md:inline-flex md:w-fit">
          {FORM_SECTIONS.map((section) => {
            const itemProgress = progress[section.key];
            const hasIssue = itemProgress.issues > 0;
            return (
              <TabsTrigger key={section.key} value={section.key} className="min-w-0 flex-col items-start gap-0.5 px-2 py-1.5 text-left md:min-w-[112px]">
                <span className="flex w-full items-center justify-between gap-1 text-xs">
                  <span className="truncate">{section.shortLabel}</span>
                  {hasIssue ? (
                    <Badge variant="outline" className="h-4 rounded px-1 text-[9px] leading-none text-rose-700">
                      {itemProgress.issues}
                    </Badge>
                  ) : null}
                </span>
                <span className="text-[10px] font-normal text-muted-foreground">{itemProgress.detail}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>
      </div>
    </Tabs>
  );
}

function ReviewSubmitSummary({
  draft,
  validationIssues,
  validationPortIndexes,
  inspectionSummary,
}: {
  draft: ValidationDraft;
  validationIssues: ValidationIssue[];
  validationPortIndexes: number[];
  inspectionSummary: ReturnType<typeof summarizeConditionChecks>;
}) {
  const attenuationCount = validationPortIndexes.filter((portIndex) => (draft.portAttenuations[String(portIndex)] || "").trim()).length;
  return (
    <div className="space-y-3 rounded-md border bg-background p-3">
      <div>
        <p className="text-sm font-medium">Review Teknis Sebelum Submit</p>
        <p className="text-xs text-muted-foreground">Periksa ringkasan section dan selesaikan blocking issue sebelum mengirim request.</p>
      </div>
      <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2 xl:grid-cols-4">
        <InfoField label="Nama Baru" value={draft.deviceNameNew || "-"} />
        <InfoField label="Tipe ODP" value={draft.odpType || "-"} />
        <InfoField label="Kapasitas" value={draft.totalPortsActual ? `${draft.totalPortsActual} port` : "-"} />
        <InfoField label="Splitter" value={draft.splitterRatio || "-"} />
        <InfoField label="Foto Awal" value={`${countInitialPhotos(draft)}/${INITIAL_PHOTO_ITEMS.length}`} />
        <InfoField label="Kondisi Baik" value={`${inspectionSummary.good}/${CONDITION_CHECK_ITEMS.length}`} />
        <InfoField label="Issue Kondisi" value={String(inspectionSummary.issue)} />
        <InfoField label="Redaman" value={`${attenuationCount}/${validationPortIndexes.length}`} />
      </div>
      {validationIssues.length ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
          <p className="font-medium">Blocking issue</p>
          <div className="mt-1 grid gap-1">
            {validationIssues.slice(0, 6).map((issue, index) => (
              <p key={`${issue.section}-${index}`}>{FORM_SECTION_LABELS[issue.section]}: {issue.message}</p>
            ))}
            {validationIssues.length > 6 ? <p>+{validationIssues.length - 6} issue lain.</p> : null}
          </div>
        </div>
      ) : (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-800">
          Semua section wajib sudah lengkap. Request siap disubmit.
        </p>
      )}
    </div>
  );
}

function OdpSummaryReadOnlySection({
  device,
  isOdp,
  deviceValidationUi,
  requestValidationUi,
  summary,
}: {
  device: DeviceItem;
  isOdp: boolean;
  deviceValidationUi: ReturnType<typeof mapValidationStatus>;
  requestValidationUi: ReturnType<typeof mapValidationStatus> | null;
  summary: ReturnType<typeof summarizePorts>;
}) {
  return (
    <Card>
      <CardHeader className="px-3 py-2">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
          <div className="min-w-0 space-y-2">
            <OdpMobileStatusHeader
              deviceType={device.device_type_key || "-"}
              isOdp={isOdp}
              deviceStatus={deviceValidationUi}
              requestStatus={requestValidationUi}
              validationDate={device.validation_date}
            />
            <div>
              <CardTitle className="text-xl md:text-2xl">{device.device_name || "ODP"}</CardTitle>
              <CardDescription className="break-all">{device.device_id || device.id}</CardDescription>
            </div>
          </div>
          <div className="grid grid-flow-col auto-cols-[minmax(104px,1fr)] gap-2 overflow-x-auto pb-1 sm:grid-flow-row sm:grid-cols-3 sm:overflow-visible sm:pb-0 lg:min-w-[520px] lg:grid-cols-5">
            <Metric label="Total" value={summary.total} />
            <Metric label="Used" value={summary.used} />
            <Metric label="Idle" value={summary.idle} />
            <Metric label="Reserved" value={summary.reserved} />
            <Metric label="Down" value={summary.down} />
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}

function PortEditorSection({
  visibleCount,
  totalCount,
  children,
}: {
  visibleCount: number;
  totalCount: number;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="px-3 py-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base">Port ODP</CardTitle>
            <CardDescription>Status, redaman, dan catatan aktual per port. {visibleCount}/{totalCount} tampil.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
            <LegendDot className="bg-emerald-500" label="used" />
            <LegendDot className="bg-slate-300" label="idle" />
            <LegendDot className="bg-amber-400" label="reserved" />
            <LegendDot className="bg-rose-500" label="down" />
          </div>
        </div>
      </CardHeader>
      {children}
    </Card>
  );
}

function IdentityCapacitySection({ inspectionStatus, children }: { inspectionStatus: ValidationStatus; children: ReactNode }) {
  return (
    <div className="rounded-md border bg-background p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-sm font-medium">Identitas dan Kapasitas Aktual</p>
        <Badge variant="outline" className="shrink-0">{inspectionStatus}</Badge>
      </div>
      {children}
    </div>
  );
}

function InitialInspectionSection({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-md border bg-background p-3">
      <p className="mb-3 text-sm font-medium">Pemeriksaan Awal</p>
      {children}
    </div>
  );
}

function ConditionChecklistSection({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-md border bg-background p-3">
      <p className="mb-3 text-sm font-medium">Checklist Kondisi</p>
      {children}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border bg-muted/30 p-2 sm:p-3">
      <p className="text-[11px] font-medium uppercase text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold sm:text-2xl">{value}</p>
    </div>
  );
}

function OdpMobileStatusHeader({
  deviceType,
  isOdp,
  deviceStatus,
  requestStatus,
  validationDate,
}: {
  deviceType: string;
  isOdp: boolean;
  deviceStatus: ReturnType<typeof mapValidationStatus>;
  requestStatus: ReturnType<typeof mapValidationStatus> | null;
  validationDate?: string | null;
}) {
  return (
    <div className="rounded-md border bg-muted/20 p-2 sm:border-0 sm:bg-transparent sm:p-0">
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant={isOdp ? "default" : "outline"}>{deviceType}</Badge>
        <Badge variant="outline" className={deviceStatus.className}>{deviceStatus.label}</Badge>
        {requestStatus ? <Badge variant="outline" className={requestStatus.className}>Request: {requestStatus.label}</Badge> : null}
      </div>
      {validationDate ? (
        <p className="mt-1 text-[11px] text-muted-foreground">Validated {formatDate(validationDate)}</p>
      ) : null}
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-muted/20 px-3 py-2">
      <p className="text-[11px] font-medium uppercase text-muted-foreground">{label}</p>
      <p className="break-words text-sm">{value || "-"}</p>
    </div>
  );
}

function EvidenceFileInput({
  label,
  file,
  disabled,
  onChange,
  compact = false,
}: {
  label: string;
  file: File | null;
  disabled: boolean;
  onChange: (file: File | null) => void;
  compact?: boolean;
}) {
  return (
    <div className={`rounded-md border bg-muted/10 p-2 ${compact ? "" : "sm:p-3"}`}>
      <RequiredLabel>{label}</RequiredLabel>
      <Input
        key={file?.name || `empty-${label}`}
        type="file"
        accept="image/*"
        disabled={disabled}
        onChange={(event) => onChange(event.target.files?.[0] || null)}
        className="mt-1.5 h-10 text-xs"
      />
      <p className={`mt-1 truncate text-xs ${file ? "text-foreground" : "text-muted-foreground"}`}>
        {file ? file.name : "Belum ada foto"}
      </p>
    </div>
  );
}

function FieldValidationSnapshotSummary({ validation }: { validation?: FieldValidationSnapshot | null }) {
  if (!validation || !Object.keys(validation).length) return null;
  const fields = [
    { label: "Inventory", value: valueText(validation.inventory_id) },
    { label: "Nama Lama", value: valueText(validation.old_device_name) },
    { label: "Nama Baru", value: valueText(validation.new_device_name) },
    { label: "POP", value: valueText(validation.pop_name || validation.pop_id) },
    { label: "Tipe ODP", value: valueText(validation.odp_type) },
    { label: "Instalasi", value: valueText(validation.installation_type) },
    { label: "Kapasitas", value: valueText(validation.total_ports) },
    { label: "Longitude", value: valueText(validation.longitude) },
    { label: "Latitude", value: valueText(validation.latitude) },
  ];

  return (
    <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
      {fields.map((field) => (
        <InfoField key={field.label} label={field.label} value={field.value} />
      ))}
    </div>
  );
}

function PortSnapshotSummary({ ports }: { ports?: ValidationPortSnapshot[] | null }) {
  if (!ports?.length) return null;

  return (
    <div className="mt-2 rounded-md border bg-muted/10 p-2">
      <p className="mb-1.5 text-xs font-medium">Snapshot Port & Redaman</p>
      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {ports.map((port, index) => (
          <div key={`${port.id || port.port_index || index}`} className="rounded border bg-background px-2 py-1.5 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate font-medium">{port.port_label || `Port ${port.port_index || index + 1}`}</span>
              <span className="text-muted-foreground">{port.status || "-"}</span>
            </div>
            <p className="mt-1 text-muted-foreground">Redaman: {port.attenuation_db == null ? "-" : `${port.attenuation_db} dB`}</p>
            {port.notes ? <p className="mt-1 text-muted-foreground">Catatan: {port.notes}</p> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function countValidationEvidence(record: ValidationRecord) {
  const ids = new Set<string>();
  const push = (value: unknown) => {
    const id = String(value || "").trim();
    if (id) ids.add(id);
  };
  (record.evidence_attachments || []).forEach((attachment) => push(attachment.id || attachment.attachment_id));
  push(record.evidence_attachment_id);
  Object.values(record.payload?.field_inspection?.initial_photos || {}).forEach((item) => push(item.attachment?.id || item.attachment?.attachment_id));
  Object.values(record.payload?.field_inspection?.condition_checks || {}).forEach((item) => push(item.attachment?.id || item.attachment?.attachment_id));
  return ids.size;
}

function valueText(value: unknown) {
  if (value == null || value === "") return "-";
  return String(value);
}

function RequiredLabel({ children, badgeText = "Required" }: { children: string; badgeText?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Label>{children}</Label>
      <RequiredBadge label={badgeText} />
    </div>
  );
}

function RequiredBadge({ label = "Required" }: { label?: string }) {
  return (
    <Badge variant="outline" className="h-4 rounded px-1.5 text-[9px] font-medium leading-none text-rose-700">
      {label}
    </Badge>
  );
}

function InspectionSnapshotSummary({ inspection }: { inspection?: FieldInspectionSnapshot | null }) {
  const photos = Object.values(inspection?.initial_photos || {});
  const checks = Object.values(inspection?.condition_checks || {});
  if (!photos.length && !checks.length) {
    return <p className="mt-2 text-xs text-muted-foreground">Belum ada detail pemeriksaan format baru.</p>;
  }

  return (
    <div className="mt-2 space-y-2">
      {photos.length ? (
        <div className="grid gap-1.5">
          {photos.map((item, index) => (
            <div key={`${item.label || "photo"}-${index}`} className="flex items-center justify-between gap-2 rounded border px-2 py-1.5 text-xs">
              <span>{item.label || "Foto pemeriksaan"}</span>
              <span className={item.attachment ? "text-emerald-700" : "text-rose-700"}>{item.attachment ? "Ada foto" : "Belum ada"}</span>
            </div>
          ))}
        </div>
      ) : null}
      {checks.length ? (
        <div className="grid gap-1.5">
          {checks.map((item, index) => (
            <div key={`${item.label || "condition"}-${index}`} className="rounded border px-2 py-1.5 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span>{item.label || "Checklist kondisi"}</span>
                <span className={isGoodCondition(item.condition) ? "text-emerald-700" : "text-amber-700"}>{item.condition || "-"}</span>
              </div>
              {item.note ? <p className="mt-1 text-muted-foreground">Keterangan: {item.note}</p> : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function summarizePorts(ports: DevicePort[], device: DeviceItem | null) {
  const total = ports.length || Number(device?.total_ports || 0) || 0;
  const used = ports.filter((port) => port.status === "used").length || Number(device?.used_ports || 0) || 0;
  const reserved = ports.filter((port) => port.status === "reserved").length;
  const down = ports.filter((port) => port.status === "down" || port.status === "maintenance").length;
  return {
    total,
    used,
    idle: Math.max(0, total - used - reserved - down),
    reserved,
    down,
  };
}

function normalizePortCapacity(value: string, fallback: number) {
  const parsed = Number(value);
  if (Number.isInteger(parsed) && parsed > 0) return Math.min(parsed, 64);
  return Math.max(1, Math.min(Number(fallback) || 8, 64));
}

function buildValidationPortIndexes(value: string, fallback: number) {
  const total = normalizePortCapacity(value, fallback);
  return Array.from({ length: total }, (_, index) => index + 1);
}

function buildPortStatusMap(ports: DevicePort[]) {
  return ports.reduce<Record<string, string>>((acc, port) => {
    acc[String(port.port_index)] = port.status || "idle";
    return acc;
  }, {});
}

function buildValidationPortPayload(ports: DevicePort[], draft: ValidationDraft, totalPorts: number) {
  return Array.from({ length: totalPorts }, (_, index) => {
    const portIndex = index + 1;
    const existing = ports.find((port) => Number(port.port_index) === portIndex);
    const key = String(portIndex);
    const attenuationValue = nullIfEmpty(draft.portAttenuations[key]);
    const attenuationDb = attenuationValue == null ? null : Number(attenuationValue);
    return {
      id: existing?.id || null,
      port_index: portIndex,
      port_label: existing?.port_label || `#${portIndex}`,
      status: draft.portStatuses[key] || existing?.status || "idle",
      customer_id: existing?.customer_id || null,
      ont_device_id: existing?.ont_device_id || null,
      notes: (existing?.notes || "").trim() || null,
      attenuation_db: Number.isFinite(attenuationDb) ? attenuationDb : null,
    };
  });
}

function summarizeValidationPortPayload(ports: Array<{ status?: string | null }>) {
  const total = ports.length;
  const used = ports.filter((port) => port.status === "used").length;
  const reserved = ports.filter((port) => port.status === "reserved").length;
  const down = ports.filter((port) => port.status === "down" || port.status === "maintenance").length;
  return {
    total,
    used,
    idle: Math.max(0, total - used - reserved - down),
    reserved,
    down,
    broken: down,
    empty: Math.max(0, total - used - reserved - down),
  };
}

function nullIfEmpty(value?: string | null) {
  const text = String(value || "").trim();
  return text ? text : null;
}

function statusDot(status?: string | null) {
  if (status === "used") return "bg-emerald-500";
  if (status === "reserved") return "bg-amber-400";
  if (status === "down" || status === "maintenance") return "bg-rose-500";
  return "bg-slate-300";
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`size-2 rounded-full ${className}`} />
      {label}
    </span>
  );
}

function formatOdpPortLabel(port: DevicePort) {
  const index = Number(port.port_index);
  if (Number.isFinite(index) && index > 0) return `#${index}`;
  return "#-";
}

function describePortAssignmentState(port: DevicePort) {
  if (port.customer_id || port.ont_device_id) return "Endpoint terhubung";
  return "Belum terhubung customer/ONT";
}

function isSamePop(candidatePopId?: string | null, odpPopId?: string | null) {
  const expected = String(odpPopId || "").trim();
  if (!expected) return false;
  return String(candidatePopId || "").trim() === expected;
}

function findOntForCustomer(ontDevices: OntOption[], customerId: string, odpPopId?: string | null, preferredOntId?: string | null) {
  if (preferredOntId) {
    const preferred = ontDevices.find((item) => item.id === preferredOntId && item.customer_id === customerId && isSamePop(item.pop_id, odpPopId));
    if (preferred) return preferred;
  }
  return ontDevices.find((item) => item.customer_id === customerId && isSamePop(item.pop_id, odpPopId)) || null;
}

function mapValidationRequestToRecord(item: ValidationRequestItem): ValidationRecord {
  return {
    id: item.id,
    validation_id: item.request_id || item.id,
    status: mapRequestStatusToValidationStatus(item.current_status),
    request_status: item.current_status || null,
    validated_at: item.updated_at || item.created_at || null,
    findings: item.finding_note || null,
    evidence_attachment_id:
      item.evidence_attachments?.[0]?.id ||
      item.evidence_attachments?.[0]?.attachment_id ||
      null,
    evidence_attachments: item.evidence_attachments || [],
    payload: {
      checklist: item.checklist || {},
      field_inspection: item.payload_snapshot?.field_inspection || {},
      field_validation: item.payload_snapshot?.field_validation || {},
      port_summary: item.payload_snapshot?.port_summary || {},
      device_ports: item.payload_snapshot?.device_ports || [],
    },
  };
}

function mapRequestStatusToValidationStatus(status?: string | null): ValidationStatus {
  if (status === "validated") return "valid";
  if (status === "pending_async" || status === "ongoing_validated") return "warning";
  return "invalid";
}

function buildDefaultValidationDraft(device?: DeviceItem | null, ports: DevicePort[] = []): ValidationDraft {
  return {
    findings: "",
    initialPhotos: buildEmptyInitialPhotos(),
    conditionChecks: buildEmptyConditionChecks(),
    deviceNameNew: String(device?.device_name || ""),
    splitterRatio: String(device?.splitter_ratio || ""),
    totalPortsActual: String(ports.length || device?.total_ports || 8),
    odpType: "",
    installationType: "",
    portStatuses: buildPortStatusMap(ports),
    portAttenuations: {},
  };
}

function buildDraftFromSnapshot(snapshot: ValidationRecord): ValidationDraft {
  const fieldValidation = snapshot.payload?.field_validation || {};
  const conditionChecks = buildConditionChecksFromSnapshot(snapshot.payload?.field_inspection);
  return {
    findings: snapshot.findings || "",
    initialPhotos: buildEmptyInitialPhotos(),
    conditionChecks,
    deviceNameNew: String(fieldValidation.new_device_name || ""),
    splitterRatio: String(fieldValidation.splitter_ratio || ""),
    totalPortsActual: String(fieldValidation.total_ports || 8),
    odpType: String(fieldValidation.odp_type || ""),
    installationType: String(fieldValidation.installation_type || ""),
    portStatuses: {},
    portAttenuations: {},
  };
}

function buildEmptyInitialPhotos(): Record<InspectionPhotoKey, File | null> {
  return INITIAL_PHOTO_ITEMS.reduce((acc, item) => {
    acc[item.key] = null;
    return acc;
  }, {} as Record<InspectionPhotoKey, File | null>);
}

function buildEmptyConditionChecks(): Record<ConditionCheckKey, ConditionCheckDraft> {
  return CONDITION_CHECK_ITEMS.reduce((acc, item) => {
    acc[item.key] = { condition: "", note: "", photo: null };
    return acc;
  }, {} as Record<ConditionCheckKey, ConditionCheckDraft>);
}

function buildConditionChecksFromSnapshot(inspection?: FieldInspectionSnapshot | null): Record<ConditionCheckKey, ConditionCheckDraft> {
  const checks = buildEmptyConditionChecks();
  const snapshotChecks = inspection?.condition_checks || {};
  for (const item of CONDITION_CHECK_ITEMS) {
    const snapshot = snapshotChecks[item.key];
    checks[item.key] = {
      condition: String(snapshot?.condition || ""),
      note: String(snapshot?.note || ""),
      photo: null,
    };
  }
  return checks;
}

function isGoodCondition(value?: string | null) {
  return GOOD_CONDITION_VALUES.has(String(value || ""));
}

function summarizeConditionChecks(checks: Record<ConditionCheckKey, ConditionCheckDraft>) {
  const rows = CONDITION_CHECK_ITEMS.map((item) => checks[item.key]);
  const filled = rows.filter((item) => item.condition).length;
  const good = rows.filter((item) => isGoodCondition(item.condition)).length;
  return {
    filled,
    good,
    issue: Math.max(0, filled - good),
  };
}

function countInitialPhotos(draft: ValidationDraft) {
  return INITIAL_PHOTO_ITEMS.filter((item) => draft.initialPhotos[item.key]).length;
}

function getDraftValidationIssues(draft: ValidationDraft, fallbackTotalPorts: number): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!draft.deviceNameNew.trim()) issues.push({ section: "identity", message: "Nama ODP Baru wajib diisi." });
  if (!draft.odpType.trim()) issues.push({ section: "identity", message: "Tipe ODP wajib dipilih." });
  if (!draft.installationType.trim()) issues.push({ section: "identity", message: "Jenis instalasi wajib dipilih." });
  if (!draft.totalPortsActual.trim()) issues.push({ section: "identity", message: "Kapasitas ODP wajib dipilih." });
  if (!draft.splitterRatio.trim()) issues.push({ section: "identity", message: "Kapasitas splitter wajib dipilih." });

  const totalPorts = normalizePortCapacity(draft.totalPortsActual, fallbackTotalPorts || 8);
  if (!Number.isInteger(totalPorts) || totalPorts <= 0) issues.push({ section: "identity", message: "Kapasitas ODP tidak valid." });

  for (const item of INITIAL_PHOTO_ITEMS) {
    if (!draft.initialPhotos[item.key]) issues.push({ section: "initial_inspection", message: `${item.label} wajib dilampirkan.` });
  }

  for (const item of CONDITION_CHECK_ITEMS) {
    const check = draft.conditionChecks[item.key];
    if (!check.condition) issues.push({ section: "condition_check", message: `Kondisi ${item.label} wajib dipilih.` });
    if (!check.photo) issues.push({ section: "condition_check", message: `Foto ${item.label} wajib dilampirkan.` });
    if (!isGoodCondition(check.condition) && !check.note.trim()) {
      issues.push({ section: "condition_check", message: `Keterangan ${item.label} wajib diisi jika kondisi bermasalah.` });
    }
  }

  for (const portIndex of buildValidationPortIndexes(draft.totalPortsActual, fallbackTotalPorts || 8)) {
    const value = draft.portAttenuations[String(portIndex)] || "";
    if (!value.trim()) {
      issues.push({ section: "ports", message: `Redaman port ${portIndex} wajib diisi.` });
      continue;
    }
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) issues.push({ section: "ports", message: `Redaman port ${portIndex} harus berupa angka.` });
  }

  return issues;
}

function buildSectionProgress({
  draft,
  validationPortIndexes,
  validationIssues,
  hasDevice,
}: {
  draft: ValidationDraft;
  validationPortIndexes: number[];
  validationIssues: ValidationIssue[];
  hasDevice: boolean;
}): Record<FormSectionKey, SectionProgress> {
  const issueCount = (section: FormSectionKey) => validationIssues.filter((issue) => issue.section === section).length;
  const identityFields = [draft.deviceNameNew, draft.odpType, draft.installationType, draft.totalPortsActual, draft.splitterRatio];
  const identityCompleted = identityFields.filter((value) => String(value || "").trim()).length;
  const conditionCompleted = CONDITION_CHECK_ITEMS.filter((item) => {
    const check = draft.conditionChecks[item.key];
    return Boolean(check.condition && check.photo && (isGoodCondition(check.condition) || check.note.trim()));
  }).length;
  const attenuationCompleted = validationPortIndexes.filter((portIndex) => {
    const value = draft.portAttenuations[String(portIndex)] || "";
    return value.trim() && Number.isFinite(Number(value));
  }).length;

  return {
    summary: {
      completed: hasDevice ? 1 : 0,
      total: 1,
      detail: hasDevice ? "ready" : "loading",
      issues: issueCount("summary"),
    },
    identity: {
      completed: identityCompleted,
      total: identityFields.length,
      detail: `${identityCompleted}/${identityFields.length}`,
      issues: issueCount("identity"),
    },
    initial_inspection: {
      completed: countInitialPhotos(draft),
      total: INITIAL_PHOTO_ITEMS.length,
      detail: `${countInitialPhotos(draft)}/${INITIAL_PHOTO_ITEMS.length}`,
      issues: issueCount("initial_inspection"),
    },
    condition_check: {
      completed: conditionCompleted,
      total: CONDITION_CHECK_ITEMS.length,
      detail: `${conditionCompleted}/${CONDITION_CHECK_ITEMS.length}`,
      issues: issueCount("condition_check"),
    },
    ports: {
      completed: attenuationCompleted,
      total: validationPortIndexes.length,
      detail: `${attenuationCompleted}/${validationPortIndexes.length}`,
      issues: issueCount("ports"),
    },
    review_submit: {
      completed: validationIssues.length ? 0 : 1,
      total: 1,
      detail: validationIssues.length ? `${validationIssues.length} issue` : "ready",
      issues: validationIssues.length,
    },
  };
}

function deriveStatusFromConditionChecks(checks: Record<ConditionCheckKey, ConditionCheckDraft>): ValidationStatus {
  const summary = summarizeConditionChecks(checks);
  if (summary.filled < CONDITION_CHECK_ITEMS.length) return "invalid";
  if (summary.issue > 0) return "warning";
  return "valid";
}

function formatInspectionSummary(inspection?: FieldInspectionSnapshot | null) {
  const checks = Object.values(inspection?.condition_checks || {});
  if (!checks.length) return "-";
  const good = checks.filter((item) => isGoodCondition(item.condition)).length;
  return `${good}/${checks.length} baik`;
}

function buildLegacyChecklistFromInspection(checks: Record<ConditionCheckKey, ConditionCheckDraft>, ports: Array<Record<string, unknown>>) {
  const hasDownPort = ports.some((port) => ["down", "maintenance"].includes(String(port.status || "").toLowerCase()));
  return {
    physical_ok: isGoodCondition(checks.box_odp.condition) && isGoodCondition(checks.cleanliness.condition),
    splitter_ok: isGoodCondition(checks.pigtail_adapter.condition),
    port_mapping_ok: !hasDownPort,
    qr_label_ok: isGoodCondition(checks.label_odp.condition),
    label_ok: isGoodCondition(checks.label_odp.condition) && isGoodCondition(checks.cable_neatness.condition),
  };
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
  }).format(date);
}

function getPopDisplayName(pop?: PopItem | null) {
  if (!pop) return "";
  return [pop.pop_name, pop.pop_code || pop.pop_id].filter(Boolean).join(" - ");
}

async function uploadAttachment({ token, file, entityId }: { token: string; file: File; entityId: string }) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("file_category", "evidence");
  formData.append("entity_type", "device");
  formData.append("entity_id", entityId);

  const response = await apiFetch<{ data: UploadResult }>("/attachments/upload", {
    method: "POST",
    token,
    body: formData,
  });

  return response.data;
}

async function uploadInspectionEvidence({
  token,
  deviceId,
  draft,
  evidenceAttachments,
}: {
  token: string;
  deviceId: string;
  draft: ValidationDraft;
  evidenceAttachments: UploadedEvidenceRef[];
}) {
  const initial_photos: Record<string, { label: string; attachment?: UploadedEvidenceRef }> = {};
  const condition_checks: Record<string, { label: string; condition: string | null; note: string | null; attachment?: UploadedEvidenceRef }> = {};

  for (const item of INITIAL_PHOTO_ITEMS) {
    const file = draft.initialPhotos[item.key];
    if (!file) {
      initial_photos[item.key] = { label: item.label };
      continue;
    }
    const upload = await uploadAttachment({ token, file, entityId: deviceId });
    const attachment = { id: upload.id, attachment_id: upload.attachment_id, name: upload.original_name };
    evidenceAttachments.push(attachment);
    initial_photos[item.key] = { label: item.label, attachment };
  }

  for (const item of CONDITION_CHECK_ITEMS) {
    const check = draft.conditionChecks[item.key];
    let attachment: UploadedEvidenceRef | undefined;
    if (check.photo) {
      const upload = await uploadAttachment({ token, file: check.photo, entityId: deviceId });
      attachment = { id: upload.id, attachment_id: upload.attachment_id, name: upload.original_name };
      evidenceAttachments.push(attachment);
    }
    condition_checks[item.key] = {
      label: item.label,
      condition: nullIfEmpty(check.condition),
      note: nullIfEmpty(check.note),
      ...(attachment ? { attachment } : {}),
    };
  }

  return { initial_photos, condition_checks };
}

function optionalPaginatedRequest<T>(request: () => Promise<PaginatedResponse<T>>): Promise<PaginatedResponse<T>> {
  return request().catch(() => ({
    success: true,
    message: "",
    data: [],
  }));
}

function optionalResourceRequest<T>(request: () => Promise<{ data: T }>): Promise<T | null> {
  return request().then((result) => result.data).catch(() => null);
}
