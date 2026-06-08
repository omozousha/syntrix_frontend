"use client";

import { Badge } from "@/components/ui/badge";
import { AppLoading } from "@/components/app-loading-new";
import { mapValidationStatus } from "@/lib/validation-status";
import {
  OdpFieldValidationSummary,
  OdpInspectionSummary,
  OdpPortSnapshotSummary,
  OdpValidationWorkflowTimeline,
  formatOdpInspectionSummary,
} from "@/components/features/data-management/device-detail/odp-validation-history-sections";
import { ValidationEvidenceAction } from "@/components/features/data-management/device-detail/validation-evidence-action";

type OdpValidationChecklistKey = "physical_ok" | "splitter_ok" | "port_mapping_ok" | "qr_label_ok" | "label_ok";

type OdpFieldInspectionPayload = {
  initial_photos?: Record<string, { label?: string; attachment?: { id?: string | null; attachment_id?: string | null; name?: string | null } }>;
  condition_checks?: Record<string, { label?: string; condition?: string | null; note?: string | null; attachment?: { id?: string | null; attachment_id?: string | null; name?: string | null } }>;
};

type OdpEvidenceAttachment = {
  id?: string | null;
  attachment_id?: string | null;
  name?: string | null;
  original_name?: string | null;
};

type OdpValidationPortSnapshot = {
  id?: string | null;
  port_index?: number | null;
  port_label?: string | null;
  status?: string | null;
  attenuation_db?: number | null;
  notes?: string | null;
};

type OdpFieldValidationPayload = {
  validation_date?: string | null;
  inventory_id?: string | null;
  old_device_name?: string | null;
  new_device_name?: string | null;
  pop_id?: string | null;
  pop_name?: string | null;
  longitude?: string | number | null;
  latitude?: string | number | null;
  odp_type?: string | null;
  installation_type?: string | null;
  splitter_ratio?: string | null;
  total_ports?: number | null;
};

type OdpValidationRecord = {
  id: string;
  validation_id?: string | null;
  status?: "valid" | "warning" | "invalid" | null;
  validated_at?: string | null;
  validator_user_id?: string | null;
  validator_name?: string | null;
  validator_email?: string | null;
  validator_user_code?: string | null;
  findings?: string | null;
  payload?: {
    checklist?: Partial<Record<OdpValidationChecklistKey, boolean>>;
    field_inspection?: OdpFieldInspectionPayload;
    field_validation?: OdpFieldValidationPayload;
    port_summary?: {
      total?: number;
      used?: number;
      idle?: number;
      reserved?: number;
      down?: number;
    };
    device_ports?: OdpValidationPortSnapshot[];
    direct_link?: string;
  } | null;
  evidence_attachment_id?: string | null;
  evidence_attachments?: OdpEvidenceAttachment[] | null;
  request_status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type ValidatorOption = {
  id: string;
  full_name?: string | null;
  email?: string | null;
  user_code?: string | null;
};

type AttachmentRef = {
  id: string;
  name?: string;
};

export function OdpValidationHistorySection({
  records,
  validators,
  loading,
  latestRequestStatus,
  latestUpdatedAt,
  latestRejectNote,
  onDownloadEvidence,
}: {
  records: OdpValidationRecord[];
  validators: ValidatorOption[];
  loading: boolean;
  latestRequestStatus?: string | null;
  latestUpdatedAt?: string | null;
  latestRejectNote?: string | null;
  onDownloadEvidence: (record: OdpValidationRecord) => void;
}) {
  return (
    <div className="space-y-2">
      {latestRequestStatus ? (
        <OdpValidationWorkflowTimeline status={latestRequestStatus} updatedAt={latestUpdatedAt || null} />
      ) : null}
      {latestRejectNote ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 p-2 text-xs text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/25 dark:text-rose-100">
          <p className="font-medium">Reject note terakhir</p>
          <p className="mt-1">{latestRejectNote}</p>
        </div>
      ) : null}
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">Histori Validasi</p>
        <p className="text-xs text-muted-foreground">{records.length} record terbaru</p>
      </div>
      {loading ? (
        <AppLoading label="Memuat histori validasi..." />
      ) : records.length ? (
        <div className="space-y-2">
          {records.map((record, index) => (
            <OdpValidationHistoryCard
              key={record.id}
              record={record}
              recordIndex={index}
              validators={validators}
              onDownloadEvidence={() => onDownloadEvidence(record)}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
          Belum ada histori validasi lapangan untuk ODP ini.
        </div>
      )}
    </div>
  );
}

function OdpValidationHistoryCard({
  record,
  recordIndex,
  validators,
  onDownloadEvidence,
}: {
  record: OdpValidationRecord;
  recordIndex: number;
  validators: ValidatorOption[];
  onDownloadEvidence: () => void;
}) {
  const evidenceCount = extractValidationImageAttachments(record, recordIndex).length;
  const validation = record.payload?.field_validation;

  return (
    <div className="rounded-md border bg-background p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={record.status === "valid" ? "default" : "outline"}>{record.status || "-"}</Badge>
            {record.request_status ? (
              <Badge variant="outline" className={mapValidationStatus(record.request_status).className}>
                {mapValidationStatus(record.request_status).label}
              </Badge>
            ) : null}
            <p className="text-xs text-muted-foreground">
              {record.validation_id || "Validasi"} - {formatDateTime(valueOf(record.validated_at || record.created_at))}
            </p>
          </div>
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span>Nama: {valueOf(validation?.new_device_name || validation?.old_device_name, "-")}</span>
            <span>Validator: {getValidatorLabel(record, validators)}</span>
            <span>Tanggal validasi: {formatDate(valueOf(validation?.validation_date))}</span>
          </div>
          {record.findings ? <p className="mt-2 text-sm">{record.findings}</p> : null}
        </div>
      </div>
      <div className="mt-3">
        <ValidationEvidenceAction evidenceCount={evidenceCount} onDownload={onDownloadEvidence} />
      </div>
      <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
        <span>Kondisi {formatOdpInspectionSummary(record.payload?.field_inspection)}</span>
        <span>Splitter {valueOf(record.payload?.field_validation?.splitter_ratio, "-")}</span>
        <span>Total {record.payload?.port_summary?.total ?? "-"}</span>
        <span>Used {record.payload?.port_summary?.used ?? "-"}</span>
        <span>Idle {record.payload?.port_summary?.idle ?? "-"}</span>
        <span>Down {record.payload?.port_summary?.down ?? "-"}</span>
      </div>
      <OdpFieldValidationSummary validation={record.payload?.field_validation} />
      <OdpPortSnapshotSummary ports={record.payload?.device_ports} />
      <OdpInspectionSummary inspection={record.payload?.field_inspection} />
    </div>
  );
}

function extractValidationImageAttachments(record: OdpValidationRecord, recordIndex: number): AttachmentRef[] {
  const refs: AttachmentRef[] = [];
  const seen = new Set<string>();
  const baseName = record.validation_id || `validation-${recordIndex + 1}`;
  const pushRef = (id: unknown, name: unknown) => {
    const normalizedId = String(id || "").trim();
    if (!normalizedId || seen.has(normalizedId)) return;
    seen.add(normalizedId);
    refs.push({ id: normalizedId, name: String(name || `${baseName}-evidence-${refs.length + 1}`) });
  };

  (record.evidence_attachments || []).forEach((attachment, index) => {
    pushRef(attachment.id || attachment.attachment_id, attachment.original_name || attachment.name || `${baseName}-evidence-${index + 1}`);
  });
  pushRef(record.evidence_attachment_id, `${baseName}-evidence`);

  Object.values(record.payload?.field_inspection?.initial_photos || {}).forEach((item) => {
    pushRef(item.attachment?.id || item.attachment?.attachment_id, item.attachment?.name || item.label);
  });
  Object.values(record.payload?.field_inspection?.condition_checks || {}).forEach((item) => {
    pushRef(item.attachment?.id || item.attachment?.attachment_id, item.attachment?.name || item.label);
  });

  return refs;
}

function getValidatorLabel(record: OdpValidationRecord, validators: ValidatorOption[]) {
  const directName = [record.validator_name, record.validator_email, record.validator_user_code]
    .map((value) => String(value || "").trim())
    .find((value) => value && !/^[0-9a-f-]{32,36}$/i.test(value));
  if (directName) return directName;

  const id = String(record.validator_user_id || "").trim();
  if (!id) return "-";
  const validator = validators.find((item) => item.id === id);
  return validator
    ? [validator.full_name, validator.user_code || validator.email].filter(Boolean).join(" - ")
    : "-";
}

function valueOf(value: unknown, fallback = "") {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
}

function formatDateTime(value: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatDate(value: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(date);
}
