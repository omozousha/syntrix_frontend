import { RELATION_LABEL_FALLBACK, getDeviceTypeLabel, getTenantLabel } from "@/lib/relation-labels";

type QrTenant = {
  id?: string | null;
  tenant_code?: string | null;
  tenant_name?: string | null;
} | null;

type QrDeviceContext = {
  id?: string | null;
  device_name?: string | null;
  old_device_name?: string | null;
  device_type_key?: string | null;
  tenant?: QrTenant;
} | null;

export function buildQrFallbackDisplay(device: QrDeviceContext, loading = false) {
  if (loading) {
    return {
      deviceType: RELATION_LABEL_FALLBACK.loading,
      deviceName: RELATION_LABEL_FALLBACK.loading,
      tenant: RELATION_LABEL_FALLBACK.loading,
    };
  }

  return {
    deviceType: getDeviceTypeLabel({ fallback: device?.device_type_key || "ODP" }),
    deviceName: valueOf(device?.device_name || device?.old_device_name, RELATION_LABEL_FALLBACK.missing),
    tenant: formatTenant(device?.tenant),
  };
}

function formatTenant(tenant: QrTenant | undefined) {
  const name = getTenantLabel({ relation: tenant, optional: true });
  if (name === RELATION_LABEL_FALLBACK.empty) return name;
  const code = valueOf(tenant?.tenant_code);
  return [name, code].filter(Boolean).join(" | ");
}

function valueOf(value: unknown, fallback = "") {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
}
