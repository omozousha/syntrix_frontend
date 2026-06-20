import { valueText } from "@/lib/domain-formatters";
import { getPopLabel, getProjectLabel, getRegionLabel } from "@/lib/relation-labels";

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
    resource_name?: string | null;
    resource_payload?: Record<string, unknown>;
    before?: Record<string, unknown>;
    device?: Record<string, unknown>;
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

export function buildAssetRequestSummary(
  item: RequestRecord,
  requestType: RequestTypeDisplay,
  lookupLabels: RequestLookupLabels,
) {
  const payload = getCreateAssetPayload(item);
  return `${requestType.operationLabel} ${requestType.resourceLabel} | Status ${valueText(payload.status || payload.status_pop)} | Region ${getRegionDisplay(payload.region_name || payload.region_id || item.region_id, lookupLabels)}`;
}

export function buildCreateAssetReviewFields(
  item: RequestRecord,
  lookupLabels: RequestLookupLabels,
) {
  const payload = getCreateAssetPayload(item);
  const resourceName = String(item.payload_snapshot?.resource_name || "").trim();
  const common = [
    { title: "Region", value: getRegionDisplay(payload.region_name || payload.region_id || item.region_id, lookupLabels) },
    { title: "POP", value: getPopDisplay(payload.pop_name || payload.pop_id, lookupLabels) },
    { title: "Status", value: valueText(payload.status || payload.status_pop) },
  ];

  if (resourceName === "pops" || item.payload_snapshot?.pop) {
    return [
      { title: "POP Name", value: valueText(payload.pop_name) },
      { title: "POP Code", value: valueText(payload.pop_code) },
      ...common,
      { title: "POP Type", value: valueText(payload.pop_type) },
      { title: "Longitude", value: valueText(payload.longitude) },
      { title: "Latitude", value: valueText(payload.latitude) },
      { title: "Address", value: valueText(payload.address) },
    ];
  }

  if (resourceName === "routes" || item.payload_snapshot?.route) {
    return [
      { title: "Route Name", value: valueText(payload.route_name) },
      { title: "Route Type", value: valueText(payload.route_type) },
      ...common,
      { title: "Project", value: getProjectDisplay(payload.project_id, lookupLabels) },
      { title: "Distance", value: valueText(payload.distance_meters) },
    ];
  }

  if (resourceName === "projects" || item.payload_snapshot?.project) {
    return [
      { title: "Project Name", value: valueText(payload.project_name) },
      ...common,
      { title: "Vendor", value: valueText(payload.vendor_name) },
      { title: "BAST", value: valueText(payload.bast_number) },
      { title: "SPK", value: valueText(payload.spk_number) },
      { title: "Start Date", value: valueText(payload.start_date) },
      { title: "End Date", value: valueText(payload.end_date) },
      { title: "Budget", value: valueText(payload.budget_value) },
    ];
  }

  if (resourceName === "portConnections" || item.payload_snapshot?.portConnection) {
    const context = item.payload_snapshot?.context || {};
    return [
      { title: "From Device", value: valueText(context.upstream_device_name) },
      { title: "From Port", value: valueText(context.upstream_port_label) },
      { title: "To Device", value: valueText(context.odp_device_name) },
      { title: "To Port", value: valueText(context.odp_port_label) },
      ...common,
      { title: "Connection Type", value: valueText(payload.connection_type) },
      { title: "Cable", value: valueText(context.cable_device_id ? "Cable selected" : "-") },
      { title: "Core Start", value: valueText(payload.core_start) },
      { title: "Core End", value: valueText(payload.core_end) },
      { title: "Fiber Count", value: valueText(payload.fiber_count) },
    ];
  }

  return [
    { title: "Device Type", value: valueText(payload.device_type_key) },
    { title: "Device Name", value: valueText(payload.device_name) },
    ...common,
    { title: "Project", value: getProjectDisplay(payload.project_id, lookupLabels) },
    { title: "Tipe ODP", value: valueText(payload.odp_type) },
    { title: "Jenis Instalasi", value: valueText(payload.installation_type) },
    { title: "Total Port", value: valueText(payload.total_ports) },
    { title: "Used Port", value: valueText(payload.used_ports) },
    { title: "Splitter Ratio", value: valueText(payload.splitter_ratio) },
    { title: "Serial Number", value: valueText(payload.serial_number) },
    { title: "Longitude", value: valueText(payload.longitude) },
    { title: "Latitude", value: valueText(payload.latitude) },
    { title: "Address", value: valueText(payload.address) },
  ];
}

export function buildFieldValidationReviewFields(item: RequestRecord) {
  const field = item.payload_snapshot?.field_validation || {};
  const summary = item.payload_snapshot?.port_summary || {};
  return [
    { title: "Tanggal Validasi", value: valueText(field.validation_date) },
    { title: "ID Inventory", value: valueText(field.inventory_id) },
    { title: "Nama ODP Lama", value: valueText(field.old_device_name) },
    { title: "Nama ODP Baru", value: valueText(field.new_device_name) },
    { title: "POP", value: getPopLabel({ fallback: field.pop_name, optional: true }) },
    { title: "Longitude", value: valueText(field.longitude) },
    { title: "Latitude", value: valueText(field.latitude) },
    { title: "Tipe ODP", value: valueText(field.odp_type) },
    { title: "Jenis Instalasi", value: valueText(field.installation_type) },
    { title: "Splitter", value: valueText(field.splitter_ratio) },
    { title: "Kapasitas", value: valueText(field.total_ports) },
    { title: "Port Aktif", value: valueText(summary.used) },
    { title: "Port Kosong", value: valueText(summary.empty ?? summary.idle) },
    { title: "Port Rusak", value: valueText(summary.broken ?? summary.down) },
  ];
}

export function buildFieldValidationComparisonFields(
  field: Record<string, unknown>,
  currentDevice: Record<string, unknown>,
  lookupLabels: RequestLookupLabels,
  isChanged: (before: unknown, after: unknown) => boolean,
) {
  const currentPop = currentDevice.pop_name || getPopDisplay(currentDevice.pop_id, lookupLabels);
  const pairs = [
    ["Nama ODP Lama", currentDevice.device_name || field.old_device_name, field.old_device_name],
    ["Nama ODP Baru", null, field.new_device_name],
    ["POP", currentPop, field.pop_name || getPopDisplay(field.pop_id, lookupLabels)],
    ["Longitude", currentDevice.longitude, field.longitude],
    ["Latitude", currentDevice.latitude, field.latitude],
    ["Tipe ODP", currentDevice.odp_type, field.odp_type],
    ["Jenis Instalasi", currentDevice.installation_type, field.installation_type],
    ["Splitter", currentDevice.splitter_ratio, field.splitter_ratio],
    ["Kapasitas", currentDevice.total_ports, field.total_ports],
  ];

  return pairs
    .map(([label, before, after]) => ({
      label: String(label),
      before: valueText(before),
      after: valueText(after),
      changed: isChanged(before, after),
    }))
    .filter((field) => field.label === "Nama ODP Lama" || field.label === "Nama ODP Baru" || field.before !== "-" || field.after !== "-");
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
