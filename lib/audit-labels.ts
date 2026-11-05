/**
 * Audit Trail Labels & Filter Constants
 * Modul terpusat untuk label aksi, entity, dan filter presets halaman Audit Trail.
 * Memudahkan maintenance ketika ada aksi validasi/audit log baru tanpa mengedit page.tsx.
 */
import type { TFn } from "@/lib/use-locale";

export function getActionOptions(t: TFn) {
  return [
    { value: "__all", label: t("audit.opt.all") },
    { value: "create:,update:,delete:,soft_delete:,restore:,purge:", label: t("audit.opt.assetChange") },
    { value: ":devices,validation_request_,provision_ports:devices", label: t("audit.opt.device") },
    { value: "create:", label: t("audit.opt.create") },
    { value: "update:", label: t("audit.opt.update") },
    { value: "delete:,soft_delete:", label: t("audit.opt.delete") },
    { value: "restore:", label: t("audit.opt.restore") },
    { value: "purge:", label: t("audit.opt.purge") },
    { value: "validation_request_submitted,validation_request_resubmitted_by_validator", label: t("audit.opt.valValidator") },
    {
      value:
        "validation_request_approved_by_adminregion,validation_request_rejected_by_adminregion,validation_request_resubmitted_by_adminregion",
      label: t("audit.opt.approvalAdmin"),
    },
    {
      value: "validation_request_approved_by_superadmin,validation_request_rejected_by_superadmin",
      label: t("audit.opt.approvalSuper"),
    },
    { value: "account:", label: t("audit.opt.account") },
    { value: "notification:", label: t("audit.opt.notification") },
    { value: "attachment:", label: t("audit.opt.attachment") },
    { value: "import:", label: t("audit.opt.import") },
  ];
}

export const EXACT_ACTION_FILTERS = new Set([
  "validation_request_submitted,validation_request_resubmitted_by_validator",
  "validation_request_approved_by_adminregion,validation_request_rejected_by_adminregion,validation_request_resubmitted_by_adminregion",
  "validation_request_approved_by_superadmin,validation_request_rejected_by_superadmin",
]);

export function getActionLabel(action: string, t: TFn): string | undefined {
  switch (action) {
    case "account:login_success":
      return t("audit.lbl.loginSuccess");
    case "account:user_register":
      return t("audit.lbl.userRegister");
    case "account:bootstrap_admin":
      return t("audit.lbl.bootstrapAdmin");
    case "account:profile_update":
      return t("audit.lbl.profileUpdate");
    case "account:password_change":
      return t("audit.lbl.passwordChange");
    case "account:password_reset_requested":
      return t("audit.lbl.passwordReset");
    case "account:avatar_orphan_cleanup":
      return t("audit.lbl.avatarCleanup");
    case "attachment:upload":
      return t("audit.lbl.attachmentUpload");
    case "provision_ports:devices":
      return t("audit.lbl.provisionPorts");
    case "validation_request_submitted":
      return t("audit.lbl.valSubmitted");
    case "validation_request_resubmitted_by_validator":
      return t("audit.lbl.valResubmittedValidator");
    case "validation_request_submitted_by_adminregion":
      return t("audit.lbl.valSubmittedAdmin");
    case "asset_create_request_submitted_by_adminregion":
      return t("audit.lbl.assetCreateAdmin");
    case "asset_update_request_submitted_by_adminregion":
      return t("audit.lbl.assetUpdateAdmin");
    case "validation_request_approved_by_adminregion":
      return t("audit.lbl.valApprovedAdmin");
    case "validation_request_rejected_by_adminregion":
      return t("audit.lbl.valRejectedAdmin");
    case "validation_request_resubmitted_by_adminregion":
      return t("audit.lbl.valResubmittedAdmin");
    case "validation_request_approved_by_superadmin":
      return t("audit.lbl.valApprovedSuper");
    case "validation_request_rejected_by_superadmin":
      return t("audit.lbl.valRejectedSuper");
    case "validation_request_applied_to_asset":
      return t("audit.lbl.valApplied");
    case "notification:validation_reminder_sent":
      return t("audit.lbl.valReminder");
    default:
      return undefined;
  }
}

export const ENTITY_LABELS: Record<string, string> = {
  app_user: "Account",
  attachments: "Attachment",
  import_job: "Import Job",
  validation_requests: "Validation Request",
  devicePorts: "Device Port",
  deviceTypes: "Device Type",
  popTypes: "POP Type",
  assetModels: "Asset Model",
};

export const AUDIT_RESOURCE_LABELS: Record<string, string> = {
  app_user: "Account",
  assetModels: "Asset Model",
  attachments: "Attachment",
  customers: "Customer",
  devicePorts: "Device Port",
  devices: "Device",
  deviceTypes: "Device Type",
  import_job: "Import Job",
  poles: "Pole",
  popTypes: "POP Type",
  pops: "POP",
  projects: "Project",
  regions: "Region",
  routes: "Route",
  validation_requests: "Validation Request",
};
