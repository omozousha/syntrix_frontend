export type ValidationStatusUi = {
  label: string;
  className: string;
};

export function mapValidationStatus(value: string | null | undefined): ValidationStatusUi {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw || raw === "-") {
    return { label: "Unvalidated", className: "border-slate-300 bg-slate-50 text-slate-700" };
  }
  if (raw === "valid" || raw === "validated") {
    return { label: "Validated", className: "border-emerald-300 bg-emerald-50 text-emerald-700" };
  }
  if (raw === "pending_async") {
    return { label: "Pending Superadmin", className: "border-blue-300 bg-blue-50 text-blue-700" };
  }
  if (raw === "ongoing_validated") {
    return { label: "Ongoing Adminregion", className: "border-amber-300 bg-amber-50 text-amber-700" };
  }
  if (raw === "rejected_by_adminregion") {
    return { label: "Rejected Adminregion", className: "border-rose-300 bg-rose-50 text-rose-700" };
  }
  if (raw === "rejected_by_superadmin") {
    return { label: "Rejected Superadmin", className: "border-rose-300 bg-rose-50 text-rose-700" };
  }
  if (raw === "warning") {
    return { label: "Warning", className: "border-amber-300 bg-amber-50 text-amber-700" };
  }
  if (raw === "invalid") {
    return { label: "Invalid", className: "border-rose-300 bg-rose-50 text-rose-700" };
  }
  return { label: raw.replaceAll("_", " "), className: "border-slate-300 bg-slate-50 text-slate-700" };
}

