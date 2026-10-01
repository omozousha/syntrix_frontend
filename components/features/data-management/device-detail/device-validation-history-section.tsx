"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AppLoading } from "@/components/app-loading-new";
import { mapValidationStatus } from "@/lib/validation-status";
import { useTranslate } from "@/lib/use-locale";
import { ValidationEvidenceAction } from "@/components/features/data-management/device-detail/validation-evidence-action";

type EvidenceAttachment = {
  id?: string | null;
  attachment_id?: string | null;
};

type GenericValidationRecord = {
  id: string;
  validation_id?: string | null;
  status?: "valid" | "warning" | "invalid" | null;
  request_status?: string | null;
  validated_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  findings?: string | null;
  validator_name?: string | null;
  validator_email?: string | null;
  validator_user_code?: string | null;
  adminregion_actor_name?: string | null;
  adminregion_actor_email?: string | null;
  adminregion_actor_user_code?: string | null;
  adminregion_action_at?: string | null;
  superadmin_actor_name?: string | null;
  superadmin_actor_email?: string | null;
  superadmin_actor_user_code?: string | null;
  superadmin_action_at?: string | null;
  adminregion_review_note?: string | null;
  superadmin_review_note?: string | null;
  evidence_attachment_id?: string | null;
  evidence_attachments?: EvidenceAttachment[] | null;
  payload?: {
    field_validation_type?: string | null;
    field_validation?: Record<string, unknown>;
    general_validation?: Record<string, unknown>;
    technical_validation?: Record<string, unknown>;
    relation_summary?: Record<string, unknown>;
    core_summary?: Record<string, unknown>;
    port_summary?: Record<string, unknown>;
  } | null;
};

type DeviceValidationHistorySectionProps = {
  deviceTypeLabel: string;
  records: GenericValidationRecord[];
  loading: boolean;
  onDownloadEvidence: (record: GenericValidationRecord) => void;
};

export function DeviceValidationHistorySection({
  deviceTypeLabel,
  records,
  loading,
  onDownloadEvidence,
}: DeviceValidationHistorySectionProps) {
  const { t } = useTranslate();
  return (
    <Card>
      <CardHeader className="px-3 py-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-sm">{t("validationHistory.title")}</CardTitle>
            <CardDescription className="text-xs">
              {t("validationHistory.description", { type: deviceTypeLabel || "device" })}
            </CardDescription>
          </div>
          <Badge variant="outline">{t("validationHistory.recordCount", { count: records.length })}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 px-3 pb-3 pt-0">
        {loading ? (
          <AppLoading label={t("validationHistory.loading")} />
        ) : records.length ? (
          records.map((record) => (
            <GenericValidationHistoryCard
              key={record.id}
              record={record}
              deviceTypeLabel={deviceTypeLabel}
              onDownloadEvidence={() => onDownloadEvidence(record)}
            />
          ))
        ) : (
          <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            {t("validationHistory.empty", { type: deviceTypeLabel || "device" })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function GenericValidationHistoryCard({
  record,
  deviceTypeLabel,
  onDownloadEvidence,
}: {
  record: GenericValidationRecord;
  deviceTypeLabel: string;
  onDownloadEvidence: () => void;
}) {
  const { t, locale } = useTranslate();
  const evidenceCount = countEvidence(record);
  const validationType = valueOf(record.payload?.field_validation_type, deviceTypeLabel || "DEVICE");
  const sectionCandidates: Array<[string, Record<string, unknown> | undefined]> = [
    ["General", record.payload?.general_validation],
    ["Technical", record.payload?.technical_validation],
    ["Legacy Fields", record.payload?.field_validation],
    ["Ports", record.payload?.port_summary],
    ["Core", record.payload?.core_summary],
    ["Relation", record.payload?.relation_summary],
  ];
  const sectionCounts = sectionCandidates.filter(
    (entry): entry is [string, Record<string, unknown>] => Boolean(entry[1] && Object.keys(entry[1]).length > 0),
  );

  return (
    <div className="rounded-md border bg-background p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={record.status === "valid" ? "default" : "outline"}>{record.status || "-"}</Badge>
            {record.request_status ? (
              <Badge variant="outline" className={mapValidationStatus(record.request_status).className}>
                {mapValidationStatus(record.request_status).label}
              </Badge>
            ) : null}
            <Badge variant="secondary">{validationType}</Badge>
            <p className="text-xs text-muted-foreground">
              {record.validation_id || t("validationHistory.validationFallback")} - {formatDateTime(valueOf(record.validated_at || record.updated_at || record.created_at), locale)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span>Validator: {actorLabel(record, "validator")}</span>
            <span>Adminregion: {actorLabel(record, "adminregion")}</span>
            <span>Superadmin: {actorLabel(record, "superadmin")}</span>
          </div>
          <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
            {record.adminregion_action_at ? <span>{t("validationHistory.adminregionAction")} {formatDateTime(record.adminregion_action_at, locale)}</span> : null}
            {record.superadmin_action_at ? <span>{t("validationHistory.superadminAction")} {formatDateTime(record.superadmin_action_at, locale)}</span> : null}
            {record.adminregion_review_note ? <span>{t("validationHistory.adminregionNote")}</span> : null}
            {record.superadmin_review_note ? <span>{t("validationHistory.superadminNote")}</span> : null}
          </div>
          {sectionCounts.length ? (
            <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
              {sectionCounts.map(([label, value]) => (
                <span key={label}>
                  {label}: {Object.keys(value).length}
                </span>
              ))}
            </div>
          ) : null}
          {record.findings ? <p className="text-sm">{record.findings}</p> : null}
        </div>
        <ValidationEvidenceAction evidenceCount={evidenceCount} onDownload={onDownloadEvidence} />
      </div>
    </div>
  );
}

function countEvidence(record: GenericValidationRecord) {
  const directTotal = (record.evidence_attachments || []).filter((item) => item.id || item.attachment_id).length;
  return directTotal + (record.evidence_attachment_id ? 1 : 0);
}

function actorLabel(record: GenericValidationRecord, role: "validator" | "adminregion" | "superadmin") {
  const values = role === "validator"
    ? [record.validator_name, record.validator_user_code || record.validator_email]
    : role === "adminregion"
      ? [record.adminregion_actor_name, record.adminregion_actor_user_code || record.adminregion_actor_email]
      : [record.superadmin_actor_name, record.superadmin_actor_user_code || record.superadmin_actor_email];
  return values
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join(" - ") || "-";
}

function valueOf(value: unknown, fallback = "") {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
}

function formatDateTime(value: string, locale: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
