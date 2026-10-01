"use client";

import { buildOdpValidationIdentityFields } from "@/lib/display-adapters/validation-history-display-adapter";
import { useTranslate, type TFn } from "@/lib/use-locale";

type OdpFieldInspectionPayload = {
  initial_photos?: Record<string, { label?: string; attachment?: { id?: string | null; attachment_id?: string | null; name?: string | null } }>;
  condition_checks?: Record<string, { label?: string; condition?: string | null; note?: string | null; attachment?: { id?: string | null; attachment_id?: string | null; name?: string | null } }>;
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

type OdpValidationPortSnapshot = {
  id?: string | null;
  port_index?: number | null;
  port_label?: string | null;
  status?: string | null;
  attenuation_db?: number | null;
  notes?: string | null;
};

export function OdpInspectionSummary({ inspection }: { inspection?: OdpFieldInspectionPayload | null }) {
  const { t } = useTranslate();
  const photos = Object.values(inspection?.initial_photos || {});
  const checks = Object.values(inspection?.condition_checks || {});
  if (!photos.length && !checks.length) return null;

  return (
    <div className="mt-2 rounded-md border bg-muted/10 p-2">
      <p className="mb-1.5 text-xs font-medium">{t("odpInspect.title")}</p>
      {photos.length ? (
        <div className="mb-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2 xl:grid-cols-4">
          {photos.map((item, index) => (
            <div key={`${item.label || "photo"}-${index}`} className="rounded border bg-background px-2 py-1.5 text-xs">
              <p className="truncate font-medium">{item.label || t("odpInspect.photoFallback")}</p>
              <p className="mt-1 text-muted-foreground">{t("odpInspect.photoPrefix")} {item.attachment ? t("odpInspect.present") : "-"}</p>
            </div>
          ))}
        </div>
      ) : null}
      {checks.length ? (
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 xl:grid-cols-4">
          {checks.map((item, index) => (
            <div key={`${item.label || "condition"}-${index}`} className="rounded border bg-background px-2 py-1.5 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-medium">{item.label || t("odpInspect.checkFallback")}</span>
                <span className={isGoodOdpInspectionCondition(item.condition) ? "text-emerald-700" : "text-amber-700"}>
                  {item.condition || "-"}
                </span>
              </div>
              {item.note ? <p className="mt-1 text-muted-foreground">{t("odpInspect.notePrefix")} {item.note}</p> : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function OdpValidationWorkflowTimeline({
  status,
  updatedAt,
}: {
  status: string;
  updatedAt?: string | null;
}) {
  const { t, locale } = useTranslate();
  const steps = getOdpWorkflowSteps(status, t);
  const updatedLabel = formatDateTime(valueOf(updatedAt), locale);
  return (
    <div className="rounded-md border p-2.5">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">{t("odpTimeline.title")}</p>
        <span className="text-xs text-muted-foreground">{t("odpTimeline.update", { value: updatedLabel })}</span>
      </div>
      <div className="grid grid-cols-1 gap-1.5 md:grid-cols-3">
        {steps.map((step) => (
          <div key={step.label} className={`rounded-md border px-2 py-1.5 text-xs ${step.className}`}>
            <p className="font-medium">{step.label}</p>
            <p className="mt-0.5">{step.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function OdpFieldValidationSummary({ validation }: { validation?: OdpFieldValidationPayload | null }) {
  const { t, locale } = useTranslate();
  const numberLocale = locale === "en" ? "en-US" : "id-ID";
  if (!validation || !Object.keys(validation).length) return null;

  const fields = buildOdpValidationIdentityFields(validation, (value) => formatDate(value, numberLocale), t);

  return (
    <div className="mt-2 rounded-md border bg-muted/10 p-2">
      <p className="mb-1.5 text-xs font-medium">{t("odpIdentity.title")}</p>
      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
        {fields.map((field) => (
          <RelationInfo key={field.label} label={field.label} value={field.value} />
        ))}
      </div>
    </div>
  );
}

export function OdpPortSnapshotSummary({ ports }: { ports?: OdpValidationPortSnapshot[] | null }) {
  const { t } = useTranslate();
  if (!ports?.length) return null;

  return (
    <div className="mt-2 rounded-md border bg-muted/10 p-2">
      <p className="mb-1.5 text-xs font-medium">{t("odpPort.title")}</p>
      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 xl:grid-cols-4">
        {ports.map((port, index) => (
          <div key={`${port.id || port.port_index || index}`} className="rounded border bg-background px-2 py-1.5 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate font-medium">{port.port_label || `Port ${port.port_index || index + 1}`}</span>
              <span className="text-muted-foreground">{port.status || "-"}</span>
            </div>
            <p className="mt-1 text-muted-foreground">
              {t("odpPort.attenuationPrefix")} {port.attenuation_db == null ? "-" : `${port.attenuation_db} dB`}
            </p>
            {port.notes ? <p className="mt-1 text-muted-foreground">{t("odpPort.notePrefix")} {port.notes}</p> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

export function formatOdpInspectionSummary(inspection: OdpFieldInspectionPayload | null | undefined, t: TFn) {
  const checks = Object.values(inspection?.condition_checks || {});
  if (!checks.length) return "-";
  const good = checks.filter((item) => isGoodOdpInspectionCondition(item.condition)).length;
  return t("odpInspect.summary", { good, total: checks.length });
}

function getOdpWorkflowSteps(status: string, t: TFn) {
  const raw = String(status || "").trim();
  const submitted = { label: "Validator", value: "Submitted", className: "border-emerald-200 bg-emerald-50 text-emerald-800" };
  if (raw === "rejected_by_adminregion") {
    return [
      submitted,
      { label: "Admin Region", value: "Rejected", className: "border-rose-200 bg-rose-50 text-rose-800" },
      { label: "Superadmin", value: t("odpWf.notYet"), className: "border-slate-200 bg-slate-50 text-slate-700" },
    ];
  }
  if (raw === "ongoing_validated") {
    return [
      submitted,
      { label: "Admin Region", value: t("odpWf.waitingReview"), className: "border-amber-200 bg-amber-50 text-amber-800" },
      { label: "Superadmin", value: t("odpWf.notYet"), className: "border-slate-200 bg-slate-50 text-slate-700" },
    ];
  }
  if (raw === "rejected_by_superadmin") {
    return [
      submitted,
      { label: "Admin Region", value: "Approved", className: "border-emerald-200 bg-emerald-50 text-emerald-800" },
      { label: "Superadmin", value: "Rejected", className: "border-rose-200 bg-rose-50 text-rose-800" },
    ];
  }
  if (raw === "validated") {
    return [
      submitted,
      { label: "Admin Region", value: "Approved", className: "border-emerald-200 bg-emerald-50 text-emerald-800" },
      { label: "Superadmin", value: t("odpWf.approvedFinal"), className: "border-emerald-200 bg-emerald-50 text-emerald-800" },
    ];
  }
  return [
    submitted,
    { label: "Admin Region", value: raw === "pending_async" ? "Approved" : t("odpWf.waiting"), className: raw === "pending_async" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-slate-50 text-slate-700" },
    { label: "Superadmin", value: raw === "pending_async" ? t("odpWf.waitingFinalApproval") : t("odpWf.notYet"), className: raw === "pending_async" ? "border-blue-200 bg-blue-50 text-blue-800" : "border-slate-200 bg-slate-50 text-slate-700" },
  ];
}

function isGoodOdpInspectionCondition(value?: string | null) {
  return ["Baik", "Bersih", "Lengkap", "Rapi"].includes(String(value || ""));
}

function RelationInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-muted/20 p-2">
      <p className="text-[10px] font-medium uppercase text-muted-foreground">{label}</p>
      <p className="mt-0.5 truncate font-medium">{value}</p>
    </div>
  );
}

function valueOf(value: unknown, fallback = "") {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
}

function formatDate(value: string, locale: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(date);
}

function formatDateTime(value: string, locale: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
