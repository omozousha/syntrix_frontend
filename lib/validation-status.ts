import type { TFn } from "@/lib/use-locale";

export type ValidationStatusUi = {
  label: string;
  className: string;
};

export function mapValidationStatus(value: string | null | undefined, t?: TFn): ValidationStatusUi {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw || raw === "-") {
    return { label: t ? t("validation.status.unvalidated") : "Unvalidated", className: "border-slate-300 bg-slate-50 text-slate-700" };
  }
  if (raw === "valid" || raw === "validated") {
    return { label: t ? t("validation.status.validated") : "Validated", className: "border-emerald-300 bg-emerald-50 text-emerald-700" };
  }
  if (raw === "pending_async") {
    return { label: t ? t("validation.status.pendingSuperadmin") : "Pending Superadmin", className: "border-blue-300 bg-blue-50 text-blue-700" };
  }
  if (raw === "ongoing_validated") {
    return { label: t ? t("validation.status.ongoingAdminRegion") : "Ongoing Admin Region", className: "border-amber-300 bg-amber-50 text-amber-700" };
  }
  if (raw === "rejected_by_adminregion") {
    return { label: t ? t("validation.status.rejectedAdminRegion") : "Rejected Admin Region", className: "border-rose-300 bg-rose-50 text-rose-700" };
  }
  if (raw === "rejected_by_superadmin") {
    return { label: t ? t("validation.status.rejectedSuperadmin") : "Rejected Superadmin", className: "border-rose-300 bg-rose-50 text-rose-700" };
  }
  if (raw === "warning") {
    return { label: t ? t("validation.status.warning") : "Warning", className: "border-amber-300 bg-amber-50 text-amber-700" };
  }
  if (raw === "invalid") {
    return { label: t ? t("validation.status.invalid") : "Invalid", className: "border-rose-300 bg-rose-50 text-rose-700" };
  }
  return { label: t ? t("validation.status.unvalidated") : raw.replaceAll("_", " "), className: "border-slate-300 bg-slate-50 text-slate-700" };
}
