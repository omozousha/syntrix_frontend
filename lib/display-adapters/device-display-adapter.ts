import { getDeviceTypeLabel, getPopLabel, getProjectLabel, getRegionLabel } from "@/lib/relation-labels";

type DeviceRecord = Record<string, unknown>;

export type DeviceRelationLabels = {
  region?: string;
  pop?: string;
  popCode?: string;
  project?: string;
  serviceType?: string;
  loading?: boolean;
};

export function buildDeviceOperationalSummaryDisplay(item: DeviceRecord, relationLabels: DeviceRelationLabels = {}) {
  return {
    deviceName: valueOf(item.device_name, "-"),
    inventoryId: valueOf(item.device_id || item.device_code, "-"),
    deviceType: getDeviceTypeLabel({
      relation: getRelationRecord(item.device_type),
      fallback: item.device_type_key,
    }),
    region: getRegionLabel({
      relation: getRelationRecord(item.region),
      fallback: relationLabels.region,
      loading: relationLabels.loading,
    }),
    pop: getPopLabel({
      relation: getRelationRecord(item.pop),
      fallback: relationLabels.pop,
      loading: relationLabels.loading,
      optional: true,
    }),
    installationDate: valueOf(item.installation_date),
    updatedAt: valueOf(item.updated_at || item.created_at),
  };
}

export function buildCustomerRelationDisplay(item: DeviceRecord, relationLabels: DeviceRelationLabels = {}) {
  return {
    pop: getPopLabel({ fallback: relationLabels.pop, optional: true }),
    project: getProjectLabel({ fallback: relationLabels.project, optional: true }),
    region: getRegionLabel({ fallback: relationLabels.region }),
    serviceType: valueOf(relationLabels.serviceType || item.service_type, "-"),
  };
}

export function buildDeviceQrRelationDisplay(item: DeviceRecord, relationLabels: DeviceRelationLabels = {}) {
  return {
    popName: getPopLabel({ fallback: relationLabels.pop || item.pop_name, optional: true }),
    popCode: valueOf(relationLabels.popCode || item.pop_code, ""),
  };
}

function getRelationRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function valueOf(value: unknown, fallback = "") {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
}
