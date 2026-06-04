export type NormalizedRole = "superadmin" | "adminregion" | "validator" | string;

export type VerificationInput = {
  nhost_email_verified?: boolean | null;
  email_verified?: boolean | null;
  verification_status?: string | null;
};

export type VerificationState = "verified" | "pending" | "unverified" | "unknown";

export const ROLE_LABELS: Record<string, string> = {
  admin: "Superadmin",
  superadmin: "Superadmin",
  user_all_region: "Admin Region",
  adminregion: "Admin Region",
  user_region: "Validator",
  validator: "Validator",
};

export function normalizeRole(role?: string | null): NormalizedRole {
  if (role === "admin") return "superadmin";
  if (role === "user_all_region") return "adminregion";
  if (role === "user_region") return "validator";
  return role || "";
}

export function formatRoleLabel(role?: string | null) {
  const value = role || "";
  return ROLE_LABELS[value] || ROLE_LABELS[normalizeRole(value)] || value || "-";
}

export function formatDateTime(value?: string | null, fallback = "-") {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatDate(value?: string | null, fallback = "-") {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(date);
}

export function shortId(value: string) {
  return value.length > 13 ? `${value.slice(0, 8)}...${value.slice(-4)}` : value;
}

export function valueText(value: unknown, fallback = "-") {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "boolean") return value ? "Ya" : "Tidak";
  return String(value);
}

export function getVerificationState(user: VerificationInput): VerificationState {
  if (typeof user.nhost_email_verified === "boolean") {
    if (user.nhost_email_verified) return "verified";
    return user.verification_status === "pending" ? "pending" : "unverified";
  }
  if (user.verification_status === "verified") return "verified";
  if (user.verification_status === "pending") return "pending";
  if (user.verification_status === "unverified") return "unverified";
  if (typeof user.email_verified === "boolean") return user.email_verified ? "verified" : "unverified";
  return "unknown";
}
