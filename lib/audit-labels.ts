/**
 * Audit Trail Labels & Filter Constants
 * Modul terpusat untuk label aksi, entity, dan filter presets halaman Audit Trail.
 * Memudahkan maintenance ketika ada aksi validasi/audit log baru tanpa mengedit page.tsx.
 */

export const ACTION_OPTIONS = [
  { value: "__all", label: "Semua aksi" },
  { value: "create:,update:,delete:,soft_delete:,restore:,purge:", label: "Asset Change" },
  { value: ":devices,validation_request_,provision_ports:devices", label: "Device" },
  { value: "create:", label: "Create Data" },
  { value: "update:", label: "Update Data" },
  { value: "delete:,soft_delete:", label: "Hapus Data" },
  { value: "restore:", label: "Restore" },
  { value: "purge:", label: "Purge" },
  { value: "validation_request_submitted,validation_request_resubmitted_by_validator", label: "Validasi Validator" },
  {
    value:
      "validation_request_approved_by_adminregion,validation_request_rejected_by_adminregion,validation_request_resubmitted_by_adminregion",
    label: "Approval Admin Region",
  },
  {
    value: "validation_request_approved_by_superadmin,validation_request_rejected_by_superadmin",
    label: "Approval Superadmin",
  },
  { value: "account:", label: "Account" },
  { value: "notification:", label: "Notification" },
  { value: "attachment:", label: "Attachment" },
  { value: "import:", label: "Import" },
];

export const EXACT_ACTION_FILTERS = new Set([
  "validation_request_submitted,validation_request_resubmitted_by_validator",
  "validation_request_approved_by_adminregion,validation_request_rejected_by_adminregion,validation_request_resubmitted_by_adminregion",
  "validation_request_approved_by_superadmin,validation_request_rejected_by_superadmin",
]);

export const ACTION_LABELS: Record<string, string> = {
  "account:login_success": "Login successful",
  "account:user_register": "Account created",
  "account:bootstrap_admin": "Bootstrap admin created",
  "account:profile_update": "Profile updated",
  "account:password_change": "Password changed",
  "account:password_reset_requested": "Password reset requested",
  "account:avatar_orphan_cleanup": "Avatar orphan cleanup",
  "attachment:upload": "Attachment uploaded",
  "provision_ports:devices": "Provision port device",
  validation_request_submitted: "Validator submit validasi device",
  validation_request_resubmitted_by_validator: "Validator resubmit validasi device",
  validation_request_submitted_by_adminregion: "Admin Region submit validasi device",
  asset_create_request_submitted_by_adminregion: "Admin Region submit create asset",
  asset_update_request_submitted_by_adminregion: "Admin Region submit update asset",
  validation_request_approved_by_adminregion: "Admin Region approve validasi device",
  validation_request_rejected_by_adminregion: "Admin Region reject validasi device",
  validation_request_resubmitted_by_adminregion: "Admin Region resubmit validasi device",
  validation_request_approved_by_superadmin: "Superadmin approve validasi device",
  validation_request_rejected_by_superadmin: "Superadmin reject validasi device",
  validation_request_applied_to_asset: "Perubahan validasi diterapkan ke asset",
  "notification:validation_reminder_sent": "Validation reminder sent",
};

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
