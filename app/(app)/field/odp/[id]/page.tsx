"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Camera, Download, RefreshCw, Save } from "lucide-react";
import { AppLoading } from "@/components/app-loading-new";
import { useSession } from "@/components/session-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
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
};
type OntOption = {
  id: string;
  device_id?: string | null;
  device_name?: string | null;
  device_type_key?: string | null;
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

type ValidationStatus = "valid" | "warning" | "invalid";
type ChecklistKey = "physical_ok" | "splitter_ok" | "port_mapping_ok" | "qr_label_ok" | "label_ok";
type ValidationDraft = Record<ChecklistKey, boolean> & {
  status: ValidationStatus;
  findings: string;
  evidenceFile: File | null;
  deviceNameNew: string;
  splitterRatio: string;
  totalPortsActual: string;
  odpType: string;
  installationType: string;
  portStatuses: Record<string, string>;
  portAttenuations: Record<string, string>;
};
type ValidationRecord = {
  id: string;
  validation_id?: string | null;
  status?: ValidationStatus | null;
  validated_at?: string | null;
  findings?: string | null;
  evidence_attachment_id?: string | null;
  payload?: {
    checklist?: Partial<Record<ChecklistKey, boolean>>;
    field_validation?: {
      new_device_name?: string | null;
      pop_name?: string | null;
      odp_type?: string | null;
      installation_type?: string | null;
      splitter_ratio?: string | null;
      total_ports?: number | null;
    };
    port_summary?: {
      total?: number;
      used?: number;
      idle?: number;
      reserved?: number;
      down?: number;
    };
  } | null;
};
type ValidationRequestItem = {
  id: string;
  request_id?: string | null;
  current_status?: string | null;
  finding_note?: string | null;
  checklist?: Partial<Record<ChecklistKey, boolean>> | null;
  payload_snapshot?: {
    field_validation?: {
      new_device_name?: string | null;
      pop_name?: string | null;
      odp_type?: string | null;
      installation_type?: string | null;
      splitter_ratio?: string | null;
      total_ports?: number | null;
    };
    port_summary?: {
      total?: number;
      used?: number;
      idle?: number;
      reserved?: number;
      down?: number;
    };
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
const CHECKLIST: Array<{ key: ChecklistKey; label: string }> = [
  { key: "physical_ok", label: "Fisik ODP OK" },
  { key: "splitter_ok", label: "Splitter OK" },
  { key: "port_mapping_ok", label: "Mapping port OK" },
  { key: "qr_label_ok", label: "QR terpasang" },
  { key: "label_ok", label: "Label terbaca" },
];

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
  const [loading, setLoading] = useState(true);
  const [savingPortId, setSavingPortId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [successDialogText, setSuccessDialogText] = useState("");
  const [reloadAfterSuccessDialog, setReloadAfterSuccessDialog] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectDialogMessage, setRejectDialogMessage] = useState("");
  const [validationPreviewUrls, setValidationPreviewUrls] = useState<Record<string, string>>({});
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewRecordId, setPreviewRecordId] = useState("");
  const [lastValidationDialogOpen, setLastValidationDialogOpen] = useState(false);
  const [lastValidationSnapshot, setLastValidationSnapshot] = useState<ValidationRecord | null>(null);
  const [draft, setDraft] = useState<ValidationDraft>(buildDefaultValidationDraft());

  const summary = useMemo(() => summarizePorts(ports, device), [ports, device]);
  const isOdp = String(device?.device_type_key || "").toUpperCase() === "ODP";
  const checkedCount = CHECKLIST.filter((item) => draft[item.key]).length;
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

  useEffect(() => {
    if (!message) return;
    setSuccessDialogText(message);
    setSuccessDialogOpen(true);
  }, [message]);

  useEffect(() => {
    if (!id || !token) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const [deviceResult, portResult, validationResult, customersResult, ontResult, odpTypesResult, installationTypesResult, requestResult] = await Promise.all([
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
      let evidenceAttachmentId: string | null = null;
      let evidenceAttachmentCode: string | null = null;
      let uploadedEvidenceName: string | null = null;
      if (draft.evidenceFile) {
        const upload = await uploadAttachment({
          token,
          file: draft.evidenceFile,
          entityId: device.id,
        });
        evidenceAttachmentId = upload.id || null;
        evidenceAttachmentCode = upload.attachment_id || null;
        uploadedEvidenceName = upload.original_name || null;
      }

      const totalPortsActual = normalizePortCapacity(draft.totalPortsActual, summary.total || 8);
      const validationPortPayload = buildValidationPortPayload(ports, draft, totalPortsActual);
      const portSummary = summarizeValidationPortPayload(validationPortPayload);
      const evidenceAttachments = evidenceAttachmentId
        ? [{ id: evidenceAttachmentId, attachment_id: evidenceAttachmentCode || undefined, name: uploadedEvidenceName || undefined }]
        : [];
      await apiFetch("/validation-requests", {
        method: "POST",
        token,
        body: {
          entity_id: device.id,
          checklist: {
            physical_ok: draft.physical_ok,
            splitter_ok: draft.splitter_ok,
            port_mapping_ok: draft.port_mapping_ok,
            qr_label_ok: draft.qr_label_ok,
            label_ok: draft.label_ok,
          },
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
              total_ports: totalPortsActual,
              used_ports: portSummary.used,
              address: device.address || null,
              longitude: device.longitude ?? null,
              latitude: device.latitude ?? null,
            },
            field_validation: {
              validation_date: new Date().toISOString().slice(0, 10),
              inventory_id: device.device_id || null,
              old_device_name: device.device_name || null,
              new_device_name: draft.deviceNameNew.trim() && draft.deviceNameNew.trim() !== String(device.device_name || "").trim() ? draft.deviceNameNew.trim() : null,
              pop_id: device.pop_id || null,
              pop_name: getPopDisplayName(pop),
              address: device.address || null,
              longlat: [device.longitude, device.latitude].filter((value) => value != null && value !== "").join(", ") || null,
              odp_type: nullIfEmpty(draft.odpType),
              installation_type: nullIfEmpty(draft.installationType),
              splitter_ratio: nullIfEmpty(draft.splitterRatio),
              total_ports: totalPortsActual,
              port_summary: portSummary,
            },
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
    <ScrollArea className="h-full min-h-0 w-full">
      <div className="w-full space-y-4 px-3 pb-3 md:px-4 md:pb-4">
        <div className="grid gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-between">
          <div className="grid gap-2 sm:flex sm:flex-wrap sm:items-center">
            <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
              <Link href={`/data-management/list/odp/${device.id}`}>
                <ArrowLeft className="mr-2 size-4" />
                Detail ODP
              </Link>
            </Button>
            <Badge variant="outline" className="w-fit">QR Scan Result</Badge>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={() => location.reload()} className="w-full sm:w-auto">
            <RefreshCw className="mr-2 size-4" />
            Refresh
          </Button>
        </div>

        {message ? <p className="rounded-md border border-emerald-200 bg-emerald-50 p-2 text-sm text-emerald-700">{message}</p> : null}
        {error ? <p className="rounded-md border border-destructive/20 bg-destructive/5 p-2 text-sm text-destructive">{error}</p> : null}

        <Card>
          <CardHeader className="px-3 py-2">
            <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={isOdp ? "default" : "outline"}>{device.device_type_key || "-"}</Badge>
                  <Badge variant="outline" className={deviceValidationUi.className}>{deviceValidationUi.label}</Badge>
                  {latestRequest && requestValidationUi ? <Badge variant="outline" className={requestValidationUi.className}>Request: {requestValidationUi.label}</Badge> : null}
                  {device.validation_date ? <Badge variant="outline">Validated {formatDate(device.validation_date)}</Badge> : null}
                </div>
                <div>
                  <CardTitle className="text-xl md:text-2xl">{device.device_name || "ODP"}</CardTitle>
                  <CardDescription className="break-all">{device.device_id || device.id}</CardDescription>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:min-w-[520px] lg:grid-cols-5">
                <Metric label="Total" value={summary.total} />
                <Metric label="Used" value={summary.used} />
                <Metric label="Idle" value={summary.idle} />
                <Metric label="Reserved" value={summary.reserved} />
                <Metric label="Down" value={summary.down} />
              </div>
            </div>
          </CardHeader>
        </Card>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px] xl:items-start">
          <div className="space-y-4">
            <Card>
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
            </Card>

            <Card>
              <CardHeader className="px-3 py-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">Port ODP</CardTitle>
                    <CardDescription>Status, redaman, dan catatan aktual per port.</CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                    <LegendDot className="bg-emerald-500" label="used" />
                    <LegendDot className="bg-slate-300" label="idle" />
                    <LegendDot className="bg-amber-400" label="reserved" />
                    <LegendDot className="bg-rose-500" label="down" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                {buildValidationPortIndexes(draft.totalPortsActual, summary.total || 8).length ? (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">
                    {buildValidationPortIndexes(draft.totalPortsActual, summary.total || 8).map((portIndex) => {
                      const port = ports.find((item) => Number(item.port_index) === portIndex);
                      const key = String(portIndex);
                      return (
                      <div key={port?.id || `draft-port-${key}`} className="rounded-md border bg-background p-3">
                        <div className="mb-3 flex items-center justify-between gap-2">
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
                              if (port) void updatePort(port, { status });
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
                                  const changes: Partial<DevicePort> = { customer_id: customerId };
                                  if (customerId) changes.status = "used";
                                  if (!customerId && !port.ont_device_id) changes.status = "idle";
                                  void updatePort(port, changes);
                                }}
                                disabled={savingPortId === port.id}
                                triggerClassName="h-9"
                                options={[
                                  { value: "__none__", label: "Tanpa customer" },
                                  ...customers.map((item) => ({
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
                                  const changes: Partial<DevicePort> = { ont_device_id: ontDeviceId };
                                  if (ontDeviceId) changes.status = "used";
                                  if (!ontDeviceId && !port.customer_id) changes.status = "idle";
                                  void updatePort(port, changes);
                                }}
                                disabled={savingPortId === port.id}
                                triggerClassName="h-9"
                                options={[
                                  { value: "__none__", label: "Tanpa ONT" },
                                  ...ontDevices
                                    .filter((item) => !device?.region_id || !item.region_id || item.region_id === device.region_id)
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
                            <Label>Redaman Port</Label>
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
                  </div>
                ) : (
                  <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">Port ODP belum tersedia.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="px-3 py-2">
                <CardTitle className="text-base">Histori Validasi</CardTitle>
                <CardDescription>Record validasi lapangan terbaru untuk ODP ini.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 px-3 pb-3">
                {validations.length ? (
                  validations.map((record) => (
                    <div key={record.id} className="rounded-md border bg-background p-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <Badge variant={record.status === "valid" ? "default" : "outline"}>{record.status || "-"}</Badge>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {record.validation_id || record.id} - {formatDateTime(record.validated_at)}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={!record.evidence_attachment_id}
                          onClick={() => void downloadEvidence(record)}
                        >
                          <Download className="mr-1.5 size-3.5" />
                          Evidence
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
                      <p className="mt-2 text-xs text-muted-foreground">
                        Checklist {countChecked(record.payload?.checklist)}/{CHECKLIST.length} - Used {record.payload?.port_summary?.used ?? "-"} - Idle{" "}
                        {record.payload?.port_summary?.idle ?? "-"}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">Belum ada histori validasi.</p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="xl:sticky xl:top-4">
            <CardHeader className="px-3 py-2">
              <CardTitle className="text-base">Submit Validasi</CardTitle>
              <CardDescription>Checklist aktual, temuan, dan evidence lapangan.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 px-3 pb-3">
              {lastValidationSnapshot ? (
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
                  <p className="text-xs text-muted-foreground">
                    Checklist {countChecked(lastValidationSnapshot.payload?.checklist)}/{CHECKLIST.length}
                  </p>
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
                      onClick={() => setDraft(buildDefaultValidationDraft())}
                    >
                      Reset Form
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                  Form ini untuk validasi baru. Data histori akan muncul setelah submit pertama.
                </div>
              )}

              <div className="rounded-md border bg-background p-3">
                <p className="mb-3 text-sm font-medium">Identitas dan Kapasitas Aktual</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-1">
                  <InfoField label="Tanggal Validasi" value={formatDate(new Date().toISOString())} />
                  <InfoField label="ID Inventory" value={device.device_id || "-"} />
                  <InfoField label="Nama ODP Lama" value={device.device_name || "-"} />
                  <InfoField label="POP" value={getPopDisplayName(pop) || String(device.pop_id || "-")} />
                  <InfoField label="Alamat" value={device.address || "-"} />
                  <InfoField label="Longlat" value={[device.longitude, device.latitude].filter((value) => value != null && value !== "").join(", ") || "-"} />
                  <div className="space-y-1">
                    <Label>Nama ODP Baru</Label>
                    <Input
                      value={draft.deviceNameNew}
                      onChange={(event) => setDraft((prev) => ({ ...prev, deviceNameNew: event.target.value }))}
                      disabled={submitting}
                      placeholder="Nama ODP sesuai lapangan"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Tipe ODP</Label>
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
                    <Label>Jenis Instalasi</Label>
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
                    <Label>Kapasitas ODP</Label>
                    <Input
                      type="number"
                      min={1}
                      max={64}
                      value={draft.totalPortsActual}
                      onChange={(event) => setDraft((prev) => ({ ...prev, totalPortsActual: event.target.value }))}
                      disabled={submitting}
                      placeholder="8 / 16"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Kapasitas Splitter</Label>
                    <Input
                      value={draft.splitterRatio}
                      onChange={(event) => setDraft((prev) => ({ ...prev, splitterRatio: event.target.value }))}
                      disabled={submitting}
                      placeholder="Contoh: 1:8"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-1">
                {CHECKLIST.map((item) => (
                  <label key={item.key} className="flex min-h-11 items-center gap-2 rounded-md border bg-background p-3 text-sm">
                    <input
                      type="checkbox"
                      checked={draft[item.key]}
                      disabled={submitting}
                      onChange={(event) => {
                        const checked = event.target.checked;
                        setDraft((prev) => {
                          const nextChecklist = {
                            physical_ok: item.key === "physical_ok" ? checked : prev.physical_ok,
                            splitter_ok: item.key === "splitter_ok" ? checked : prev.splitter_ok,
                            port_mapping_ok: item.key === "port_mapping_ok" ? checked : prev.port_mapping_ok,
                            qr_label_ok: item.key === "qr_label_ok" ? checked : prev.qr_label_ok,
                            label_ok: item.key === "label_ok" ? checked : prev.label_ok,
                          };
                          return {
                            ...prev,
                            ...nextChecklist,
                            status: deriveStatusFromChecklist(nextChecklist),
                          };
                        });
                      }}
                      className="size-4"
                    />
                    {item.label}
                  </label>
                ))}
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[180px_1fr] xl:grid-cols-1">
                <div className="space-y-1">
                  <Label>Status</Label>
                  <Combobox
                    value={draft.status}
                    onValueChange={(status) => {
                      const nextStatus = status as ValidationStatus;
                      if (nextStatus === "valid") {
                        const nextChecklist = {
                          physical_ok: true,
                          splitter_ok: true,
                          port_mapping_ok: true,
                          qr_label_ok: true,
                          label_ok: true,
                        };
                        setDraft((prev) => ({ ...prev, ...nextChecklist, status: "valid" }));
                        return;
                      }
                      if (nextStatus === "invalid") {
                        const nextChecklist = {
                          physical_ok: false,
                          splitter_ok: false,
                          port_mapping_ok: false,
                          qr_label_ok: false,
                          label_ok: false,
                        };
                        setDraft((prev) => ({ ...prev, ...nextChecklist, status: "invalid" }));
                        return;
                      }
                      setDraft((prev) => ({ ...prev, status: "warning" }));
                    }}
                    disabled={submitting}
                    options={[
                      { value: "valid", label: "Valid" },
                      { value: "warning", label: "Warning" },
                      { value: "invalid", label: "Invalid" },
                    ]}
                  />
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
              </div>

              <div className="grid grid-cols-1 gap-2">
                <Input
                  key={draft.evidenceFile?.name || "empty-evidence"}
                  type="file"
                  accept="image/*"
                  disabled={submitting}
                  onChange={(event) => setDraft((prev) => ({ ...prev, evidenceFile: event.target.files?.[0] || null }))}
                />
                <Button type="button" onClick={() => void submitValidation()} disabled={submitting} className="h-11 w-full sm:h-10">
                  {submitting ? <RefreshCw className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
                  Submit Validasi
                </Button>
              </div>
              {draft.evidenceFile ? (
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Camera className="size-3.5" />
                  {draft.evidenceFile.name}
                </p>
              ) : null}
              <p className="text-xs text-muted-foreground">
                Checklist tercentang: {checkedCount}/{CHECKLIST.length}. Status valid otomatis saat semua checklist tercentang.
              </p>
            </CardContent>
          </Card>
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
                <p className="text-xs text-muted-foreground">Checklist</p>
                <div className="mt-2 grid gap-1.5">
                  {CHECKLIST.map((item) => {
                    const checked = Boolean(lastValidationSnapshot.payload?.checklist?.[item.key]);
                    return (
                      <div key={`latest-${item.key}`} className="flex items-center justify-between gap-2 rounded border px-2 py-1.5 text-xs">
                        <span>{item.label}</span>
                        <span className={checked ? "text-emerald-700" : "text-rose-700"}>{checked ? "OK" : "Belum"}</span>
                      </div>
                    );
                  })}
                </div>
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
      <AlertDialog
        open={successDialogOpen}
        onOpenChange={(open) => {
          setSuccessDialogOpen(open);
          if (!open && reloadAfterSuccessDialog) {
            location.reload();
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Berhasil</AlertDialogTitle>
            <AlertDialogDescription>{successDialogText}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>Tutup</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ScrollArea>
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

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-muted/20 px-3 py-2">
      <p className="text-[11px] font-medium uppercase text-muted-foreground">{label}</p>
      <p className="break-words text-sm">{value || "-"}</p>
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

function countChecked(checklist?: Partial<Record<ChecklistKey, boolean>>) {
  if (!checklist) return 0;
  return CHECKLIST.filter((item) => Boolean(checklist[item.key])).length;
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

function deriveStatusFromChecklist(checklist: Partial<Record<ChecklistKey, boolean>>) {
  const checked = CHECKLIST.filter((item) => Boolean(checklist[item.key])).length;
  if (checked === CHECKLIST.length) return "valid" as ValidationStatus;
  if (checked === 0) return "invalid" as ValidationStatus;
  return "warning" as ValidationStatus;
}

function mapValidationRequestToRecord(item: ValidationRequestItem): ValidationRecord {
  return {
    id: item.id,
    validation_id: item.request_id || item.id,
    status: mapRequestStatusToValidationStatus(item.current_status),
    validated_at: item.updated_at || item.created_at || null,
    findings: item.finding_note || null,
    evidence_attachment_id:
      item.evidence_attachments?.[0]?.id ||
      item.evidence_attachments?.[0]?.attachment_id ||
      null,
    payload: {
      checklist: item.checklist || {},
      field_validation: item.payload_snapshot?.field_validation || {},
      port_summary: item.payload_snapshot?.port_summary || {},
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
    physical_ok: false,
    splitter_ok: false,
    port_mapping_ok: false,
    qr_label_ok: false,
    label_ok: false,
    status: "invalid",
    findings: "",
    evidenceFile: null,
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
  const checklist = snapshot.payload?.checklist || {};
  const fieldValidation = snapshot.payload?.field_validation || {};
  const nextChecklist = {
    physical_ok: Boolean(checklist.physical_ok),
    splitter_ok: Boolean(checklist.splitter_ok),
    port_mapping_ok: Boolean(checklist.port_mapping_ok),
    qr_label_ok: Boolean(checklist.qr_label_ok),
    label_ok: Boolean(checklist.label_ok),
  };
  return {
    ...nextChecklist,
    status: deriveStatusFromChecklist(nextChecklist),
    findings: snapshot.findings || "",
    evidenceFile: null,
    deviceNameNew: String(fieldValidation.new_device_name || ""),
    splitterRatio: String(fieldValidation.splitter_ratio || ""),
    totalPortsActual: String(fieldValidation.total_ports || 8),
    odpType: String(fieldValidation.odp_type || ""),
    installationType: String(fieldValidation.installation_type || ""),
    portStatuses: {},
    portAttenuations: {},
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
