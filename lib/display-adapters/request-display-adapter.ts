import { valueText } from "@/lib/domain-formatters";
import { getPopLabel, getProjectLabel, getRegionLabel } from "@/lib/relation-labels";
import type { MessageKey } from "@/lib/locales";

// Adapter rows are pure display data; callers pass `t` from useTranslate(), with a
// key-passthrough default so non-UI call sites keep compiling.
type TFn = (key: MessageKey, vars?: Record<string, string | number>) => string;

export type RequestLookupLabels = {
  regions: Record<string, string>;
  pops: Record<string, string>;
  projects: Record<string, string>;
  users: Record<string, string>;
};

type RequestTypeDisplay = {
  kind: string;
  operationLabel: string;
  resourceLabel: string;
};

type RequestRecord = Record<string, unknown> & {
  region_id?: string | null;
  payload_snapshot?: {
    field_validation_type?: string | null;
    resource_name?: string | null;
    resource_payload?: Record<string, unknown>;
    before?: Record<string, unknown>;
    device?: Record<string, unknown>;
    general_validation?: Record<string, unknown>;
    technical_validation?: Record<string, unknown>;
    field_validation?: Record<string, unknown>;
    field_inspection?: Record<string, unknown>;
    port_summary?: Record<string, unknown>;
    pop?: Record<string, unknown>;
    route?: Record<string, unknown>;
    project?: Record<string, unknown>;
    portConnection?: Record<string, unknown>;
    context?: Record<string, unknown>;
    device_ports?: Array<Record<string, unknown>>;
  } | null;
};

type ReviewField = { title: string; value: string };
type FieldValidationRenderer = {
  reviewFields: (context: FieldValidationContext) => ReviewField[];
  comparisonPairs: (context: FieldValidationContext) => Array<[string, unknown, unknown]>;
};
type FieldValidationContext = {
  item: RequestRecord;
  field: Record<string, unknown>;
  technical: Record<string, unknown>;
  summary: Record<string, unknown>;
  currentDevice: Record<string, unknown>;
  lookupLabels: RequestLookupLabels;
  t: TFn;
};

const FIELD_VALIDATION_RENDERERS: Record<string, FieldValidationRenderer> = {
  ODP: {
    reviewFields: ({ field, summary, t }) => [
      { title: t("validation.field.validationDate"), value: valueText(field.validation_date) },
      { title: t("validation.adapter.inventoryId"), value: valueText(field.inventory_id) },
      { title: t("validation.adapter.oldDeviceName"), value: valueText(field.old_device_name) },
      { title: t("validation.adapter.newDeviceName"), value: valueText(field.new_device_name) },
      { title: t("validation.field.pop"), value: getPopLabel({ fallback: field.pop_name, optional: true }) },
      { title: t("validation.field.longitude"), value: valueText(field.longitude) },
      { title: t("validation.field.latitude"), value: valueText(field.latitude) },
      { title: t("validation.field.tipeOdp"), value: valueText(field.odp_type) },
      { title: t("validation.field.jenisInstalasi"), value: valueText(field.installation_type) },
      { title: t("validation.adapter.splitter"), value: valueText(field.splitter_ratio) },
      { title: t("validation.adapter.capacity"), value: valueText(field.total_ports) },
      { title: t("validation.adapter.activePort"), value: valueText(summary.used) },
      { title: t("validation.adapter.emptyPort"), value: valueText(summary.empty ?? summary.idle) },
      { title: t("validation.adapter.brokenPort"), value: valueText(summary.broken ?? summary.down) },
    ],
    comparisonPairs: ({ field, currentDevice, lookupLabels, t }) => {
      const currentPop = currentDevice.pop_name || getPopDisplay(currentDevice.pop_id, lookupLabels);
      return [
        [t("validation.adapter.oldDeviceName"), currentDevice.device_name || field.old_device_name, field.old_device_name],
        [t("validation.adapter.newDeviceName"), null, field.new_device_name],
        [t("validation.field.pop"), currentPop, field.pop_name || getPopDisplay(field.pop_id, lookupLabels)],
        [t("validation.field.longitude"), currentDevice.longitude, field.longitude],
        [t("validation.field.latitude"), currentDevice.latitude, field.latitude],
        [t("validation.field.tipeOdp"), currentDevice.odp_type, field.odp_type],
        [t("validation.field.jenisInstalasi"), currentDevice.installation_type, field.installation_type],
        [t("validation.adapter.splitter"), currentDevice.splitter_ratio, field.splitter_ratio],
        [t("validation.adapter.capacity"), currentDevice.total_ports, field.total_ports],
      ];
    },
  },
  ODC: {
    reviewFields: ({ field, technical, t }) => [
      ...buildGenericDeviceReviewFields("ODC", field, t),
      { title: t("validation.adapter.splitter"), value: valueText(technical.splitter_ratio ?? field.splitter_ratio) },
      { title: t("validation.adapter.totalPort"), value: valueText(technical.total_ports ?? field.total_ports) },
      { title: t("validation.adapter.usedPort"), value: valueText(technical.used_ports ?? field.used_ports) },
      { title: t("validation.adapter.coreCapacity"), value: valueText(technical.capacity_core ?? field.capacity_core) },
      { title: t("validation.adapter.usedCore"), value: valueText(technical.used_core ?? field.used_core) },
    ],
    comparisonPairs: ({ field, technical, currentDevice, lookupLabels, t }) => [
      ...buildGenericDeviceComparisonPairs("ODC", field, currentDevice, lookupLabels, t),
      [t("validation.adapter.splitter"), currentDevice.splitter_ratio, technical.splitter_ratio ?? field.splitter_ratio],
      [t("validation.adapter.totalPort"), currentDevice.total_ports, technical.total_ports ?? field.total_ports],
      [t("validation.adapter.usedPort"), currentDevice.used_ports, technical.used_ports ?? field.used_ports],
      [t("validation.adapter.coreCapacity"), currentDevice.capacity_core, technical.capacity_core ?? field.capacity_core],
      [t("validation.adapter.usedCore"), currentDevice.used_core, technical.used_core ?? field.used_core],
    ],
  },
  CABLE: {
    reviewFields: ({ field, technical, t }) => [
      ...buildGenericDeviceReviewFields("Cable", field, t),
      { title: t("validation.adapter.coreCapacity"), value: valueText(technical.capacity_core ?? field.capacity_core) },
      { title: t("validation.adapter.usedCore"), value: valueText(technical.used_core ?? field.used_core) },
    ],
    comparisonPairs: ({ field, technical, currentDevice, lookupLabels, t }) => [
      ...buildGenericDeviceComparisonPairs("Cable", field, currentDevice, lookupLabels, t),
      [t("validation.adapter.coreCapacity"), currentDevice.capacity_core, technical.capacity_core ?? field.capacity_core],
      [t("validation.adapter.usedCore"), currentDevice.used_core, technical.used_core ?? field.used_core],
    ],
  },
  GENERIC: {
    reviewFields: ({ item, field, technical, t }) => [
      ...buildGenericDeviceReviewFields(getFieldValidationType(item), field, t),
      ...buildTechnicalReviewFields(technical, t),
    ],
    comparisonPairs: ({ item, field, technical, currentDevice, lookupLabels, t }) => [
      ...buildGenericDeviceComparisonPairs(getFieldValidationType(item), field, currentDevice, lookupLabels, t),
      ...buildTechnicalComparisonPairs(technical, currentDevice, t),
    ],
  },
};

export function buildAssetRequestSummary(
  item: RequestRecord,
  requestType: RequestTypeDisplay,
  lookupLabels: RequestLookupLabels,
  t: TFn = (key) => key,
) {
  const payload = getCreateAssetPayload(item);
  return t("validation.adapter.assetSummary", {
    operation: requestType.operationLabel,
    resource: requestType.resourceLabel,
    status: valueText(payload.status || payload.status_pop),
    region: getRegionDisplay(payload.region_name || payload.region_id || item.region_id, lookupLabels),
  });
}

export function buildCreateAssetReviewFields(
  item: RequestRecord,
  lookupLabels: RequestLookupLabels,
  t: TFn = (key) => key,
) {
  const payload = getCreateAssetPayload(item);
  const resourceName = String(item.payload_snapshot?.resource_name || "").trim();
  const common = [
    { title: t("validation.field.region"), value: getRegionDisplay(payload.region_name || payload.region_id || item.region_id, lookupLabels) },
    { title: t("validation.field.pop"), value: getPopDisplay(payload.pop_name || payload.pop_id, lookupLabels) },
    { title: t("validation.field.status"), value: valueText(payload.status || payload.status_pop) },
  ];

  if (resourceName === "pops" || item.payload_snapshot?.pop) {
    return [
      { title: t("validation.adapter.popName"), value: valueText(payload.pop_name) },
      { title: t("validation.adapter.popCode"), value: valueText(payload.pop_code) },
      ...common,
      { title: t("validation.adapter.popType"), value: valueText(payload.pop_type) },
      { title: t("validation.field.longitude"), value: valueText(payload.longitude) },
      { title: t("validation.field.latitude"), value: valueText(payload.latitude) },
      { title: t("validation.field.address"), value: valueText(payload.address) },
    ];
  }

  if (resourceName === "routes" || item.payload_snapshot?.route) {
    return [
      { title: t("validation.adapter.routeName"), value: valueText(payload.route_name) },
      { title: t("validation.adapter.routeType"), value: valueText(payload.route_type) },
      ...common,
      { title: t("validation.field.project"), value: getProjectDisplay(payload.project_id, lookupLabels) },
      { title: t("validation.adapter.distance"), value: valueText(payload.distance_meters) },
    ];
  }

  if (resourceName === "projects" || item.payload_snapshot?.project) {
    return [
      { title: t("validation.adapter.projectName"), value: valueText(payload.project_name) },
      ...common,
      { title: t("validation.adapter.vendor"), value: valueText(payload.vendor_name) },
      { title: t("validation.adapter.bast"), value: valueText(payload.bast_number) },
      { title: t("validation.adapter.spk"), value: valueText(payload.spk_number) },
      { title: t("validation.adapter.startDate"), value: valueText(payload.start_date) },
      { title: t("validation.adapter.endDate"), value: valueText(payload.end_date) },
      { title: t("validation.adapter.budget"), value: valueText(payload.budget_value) },
    ];
  }

  if (resourceName === "portConnections" || item.payload_snapshot?.portConnection) {
    const context = item.payload_snapshot?.context || {};
    return [
      { title: t("validation.topo.fromDevice"), value: valueText(context.upstream_device_name) },
      { title: t("validation.topo.field.fromPort"), value: valueText(context.upstream_port_label) },
      { title: t("validation.topo.toDevice"), value: valueText(context.odp_device_name) },
      { title: t("validation.topo.field.toPort"), value: valueText(context.odp_port_label) },
      ...common,
      { title: t("validation.topo.field.connectionType"), value: valueText(payload.connection_type) },
      { title: t("validation.topo.field.cable"), value: valueText(context.cable_device_id ? t("validation.topo.cableSelected") : "-") },
      { title: t("validation.topo.field.coreStart"), value: valueText(payload.core_start) },
      { title: t("validation.topo.field.coreEnd"), value: valueText(payload.core_end) },
      { title: t("validation.topo.field.fiberCount"), value: valueText(payload.fiber_count) },
    ];
  }

  return [
    { title: t("validation.adapter.deviceType"), value: valueText(payload.device_type_key) },
    { title: t("validation.field.deviceName"), value: valueText(payload.device_name) },
    ...common,
    { title: t("validation.field.project"), value: getProjectDisplay(payload.project_id, lookupLabels) },
    { title: t("validation.field.tipeOdp"), value: valueText(payload.odp_type) },
    { title: t("validation.field.jenisInstalasi"), value: valueText(payload.installation_type) },
    { title: t("validation.adapter.totalPort"), value: valueText(payload.total_ports) },
    { title: t("validation.adapter.usedPort"), value: valueText(payload.used_ports) },
    { title: t("validation.adapter.splitter"), value: valueText(payload.splitter_ratio) },
    { title: t("validation.field.serialNumber"), value: valueText(payload.serial_number) },
    { title: t("validation.field.longitude"), value: valueText(payload.longitude) },
    { title: t("validation.field.latitude"), value: valueText(payload.latitude) },
    { title: t("validation.field.address"), value: valueText(payload.address) },
  ];
}

export function buildFieldValidationReviewFields(item: RequestRecord, t: TFn = (key) => key) {
  const context = buildFieldValidationContext(item, {}, {
    regions: {},
    pops: {},
    projects: {},
    users: {},
  }, t);
  return getFieldValidationRenderer(item).reviewFields(context);
}

export function buildFieldValidationComparisonFields(
  item: RequestRecord,
  currentDevice: Record<string, unknown>,
  lookupLabels: RequestLookupLabels,
  isChanged: (before: unknown, after: unknown) => boolean,
  t: TFn = (key) => key,
) {
  const context = buildFieldValidationContext(item, currentDevice, lookupLabels, t);
  const isOdp = getFieldValidationType(item) === "ODP";
  // ODP rows carry a renamed device name; keep them visible even when both sides render "-".
  const alwaysKeep = [t("validation.adapter.oldDeviceName"), t("validation.adapter.newDeviceName")];
  return getFieldValidationRenderer(item)
    .comparisonPairs(context)
    .map(([label, before, after]) => ({
      label: String(label),
      before: valueText(before),
      after: valueText(after),
      changed: isChanged(before, after),
    }))
    .filter((field) => {
      if (isOdp && alwaysKeep.includes(field.label)) {
        return true;
      }
      return field.before !== "-" || field.after !== "-";
    });
}

function buildFieldValidationContext(
  item: RequestRecord,
  currentDevice: Record<string, unknown>,
  lookupLabels: RequestLookupLabels,
  t: TFn = (key) => key,
): FieldValidationContext {
  const field = item.payload_snapshot?.field_validation || {};
  const summary = item.payload_snapshot?.port_summary || {};
  const technical = item.payload_snapshot?.technical_validation || {};
  return {
    item,
    field,
    technical,
    summary,
    currentDevice,
    lookupLabels,
    t,
  };
}

function getFieldValidationRenderer(item: RequestRecord) {
  const type = getFieldValidationType(item);
  return FIELD_VALIDATION_RENDERERS[type] || FIELD_VALIDATION_RENDERERS.GENERIC;
}

function getFieldValidationType(item: RequestRecord) {
  const payload = item.payload_snapshot || {};
  const field = payload.field_validation || {};
  const device = payload.device || {};
  const rawType = payload.field_validation_type || device.device_type_key || field.device_type_key;
  const normalized = String(rawType || "").trim().toUpperCase();
  if (normalized) return normalized;
  return field.odp_type || field.installation_type || field.splitter_ratio ? "ODP" : "DEVICE";
}

function buildGenericDeviceReviewFields(
  deviceTypeLabel: string,
  field: Record<string, unknown>,
  t: TFn = (key) => key,
) {
  return [
    { title: t("validation.adapter.deviceType"), value: valueText(deviceTypeLabel) },
    { title: t("validation.field.validationDate"), value: valueText(field.validation_date) },
    { title: t("validation.adapter.inventoryId"), value: valueText(field.inventory_id) },
    { title: t("validation.field.deviceName"), value: valueText(field.new_device_name || field.old_device_name) },
    { title: t("validation.adapter.statusDevice"), value: valueText(field.device_status) },
    { title: t("validation.field.pop"), value: getPopLabel({ fallback: field.pop_name, optional: true }) },
    { title: t("validation.field.longitude"), value: valueText(field.longitude) },
    { title: t("validation.field.latitude"), value: valueText(field.latitude) },
  ];
}

function buildGenericDeviceComparisonPairs(
  deviceTypeLabel: string,
  field: Record<string, unknown>,
  currentDevice: Record<string, unknown>,
  lookupLabels: RequestLookupLabels,
  t: TFn = (key) => key,
): Array<[string, unknown, unknown]> {
  const currentPop = currentDevice.pop_name || getPopDisplay(currentDevice.pop_id, lookupLabels);
  return [
    [t("validation.adapter.deviceType"), currentDevice.device_type_key, deviceTypeLabel],
    [t("validation.field.deviceName"), currentDevice.device_name || field.old_device_name, field.new_device_name || field.old_device_name],
    [t("validation.adapter.statusDevice"), currentDevice.status, field.device_status],
    [t("validation.field.pop"), currentPop, field.pop_name || getPopDisplay(field.pop_id, lookupLabels)],
    [t("validation.field.longitude"), currentDevice.longitude, field.longitude],
    [t("validation.field.latitude"), currentDevice.latitude, field.latitude],
    [t("validation.field.address"), currentDevice.address, field.address],
  ];
}

function buildTechnicalReviewFields(technical: Record<string, unknown>, t: TFn = (key) => key) {
  return Object.entries(technical)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([key, value]) => ({ title: getTechnicalFieldLabel(key, t), value: valueText(value) }));
}

function buildTechnicalComparisonPairs(
  technical: Record<string, unknown>,
  currentDevice: Record<string, unknown>,
  t: TFn = (key) => key,
): Array<[string, unknown, unknown]> {
  return Object.entries(technical)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([key, value]) => [getTechnicalFieldLabel(key, t), currentDevice[key], value]);
}

function getTechnicalFieldLabel(key: string, t: TFn = (key) => key) {
  const labels: Record<string, string> = {
    splitter_ratio: t("validation.adapter.splitter"),
    total_ports: t("validation.adapter.totalPort"),
    used_ports: t("validation.adapter.usedPort"),
    capacity_core: t("validation.adapter.coreCapacity"),
    used_core: t("validation.adapter.usedCore"),
    management_ip: t("validation.field.managementIp"),
    serial_number: t("validation.field.serialNumber"),
    address: t("validation.field.address"),
  };
  return labels[key] || key.replace(/_/g, " ");
}

export function getRegionDisplay(value: unknown, lookupLabels: RequestLookupLabels) {
  const id = String(value || "").trim();
  return getRegionLabel({ fallback: id ? lookupLabels.regions[id] || value : value });
}

export function getPopDisplay(value: unknown, lookupLabels: RequestLookupLabels) {
  const id = String(value || "").trim();
  return getPopLabel({ fallback: id ? lookupLabels.pops[id] || value : value, optional: true });
}

export function getProjectDisplay(value: unknown, lookupLabels: RequestLookupLabels) {
  const id = String(value || "").trim();
  return getProjectLabel({ fallback: id ? lookupLabels.projects[id] || value : value, optional: true });
}

function getCreateAssetPayload(item: RequestRecord) {
  return (
    nonEmptyObject(item.payload_snapshot?.resource_payload) ||
    item.payload_snapshot?.device ||
    item.payload_snapshot?.pop ||
    item.payload_snapshot?.route ||
    item.payload_snapshot?.project ||
    item.payload_snapshot?.portConnection ||
    item.payload_snapshot?.before ||
    {}
  );
}

function nonEmptyObject(value?: Record<string, unknown>) {
  if (!value || !Object.keys(value).length) return null;
  return value;
}
