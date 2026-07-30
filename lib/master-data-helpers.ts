export type GenericItem = Record<string, unknown> & {
  id: string;
  updated_at?: string | null;
  created_at?: string | null;
};

type LookupOption = { id: string; label: string };
type ApprovalResponse = {
  approval_request?: { request_id?: string | null; id?: string | null } | null;
};

export function pick(item: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = item[key];
    if (value !== null && value !== undefined && String(value).trim() !== "") return String(value);
  }
  return "-";
}

export function renderRouteTypeTags(value: unknown) {
  const arr = Array.isArray(value) ? value.filter(Boolean) : [];
  if (!arr.length) return null;
  if (arr.includes("_NONE_")) return null;
  return arr.map((type: string) => type).join(", ");
}

export function renderDeviceTypeTags(value: unknown) {
  const arr = Array.isArray(value) ? value.filter(Boolean) : [];
  if (!arr.length) return "";
  return arr.join(", ");
}

export function parseJsonStringArray(value: string | undefined | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function normalizeHexColor(value: string) {
  const text = (value || "").trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(text)) return text.toUpperCase();
  if (/^[0-9A-Fa-f]{6}$/.test(text)) return `#${text.toUpperCase()}`;
  return "";
}

export function formatDateTime(value: string) {
  if (!value || value === "-") return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function isArchived(item: Record<string, unknown>) {
  const deletedAt = item.deleted_at;
  if (deletedAt === null || deletedAt === undefined) return false;
  return String(deletedAt).trim() !== "";
}

export function mapLookupToOptions(items: LookupOption[]) {
  return items.map((item) => ({ value: item.id, label: item.label }));
}

export function resolveRelationName(value: unknown, map: Record<string, string>) {
  if (value === null || value === undefined) return "-";
  const key = String(value).trim();
  if (!key) return "-";
  return map[key] || key;
}

export function sanitizeFileName(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "") || "devices";
}

export function getApprovalRequestId(value?: ApprovalResponse | null) {
  return value?.approval_request?.request_id || value?.approval_request?.id || "";
}

export function canWriteResource(role: string, resource: string) {
  if (!resource) return false;
  if (resource === "devices") return role === "admin" || role === "user_all_region";
  if (["pops", "projects", "poles", "customers", "routes"].includes(resource)) return role === "admin" || role === "user_all_region";
  return role === "admin";
}

export function supportsIsActiveResource(resource: string) {
  return ["deviceTypes", "topologyRelationRules", "linkBudgetParameters", "popTypes", "routeTypes", "odpTypes", "installationTypes", "serviceTypes", "tenants", "splitterProfiles", "cableTypes", "coreCapacities", "deviceCoreCapacities", "provinces", "cities"].includes(resource);
}

export function supportsSoftDeleteResource(resource: string) {
  return ["regions", "deviceTypes", "topologyRelationRules", "linkBudgetParameters", "popTypes", "routeTypes", "odpTypes", "installationTypes", "serviceTypes", "tenants", "manufacturers", "brands", "assetModels", "cableTypes", "coreCapacities", "deviceCoreCapacities", "provinces", "cities"].includes(resource);
}

export function supportsPopFilterResource(resource: string) {
  return ["devices", "poles", "customers", "routes", "projects"].includes(resource);
}

export function supportsProjectFilterResource(resource: string) {
  return ["devices", "poles", "customers", "routes"].includes(resource);
}

export function getRenameConfig(resource: string) {
  const map: Record<string, { field: string; label: string }> = {
    pops: { field: "pop_name", label: "nama POP" },
    devices: { field: "device_name", label: "nama device" },
    projects: { field: "project_name", label: "nama project" },
    poles: { field: "pole_number", label: "nomor pole" },
    customers: { field: "customer_name", label: "nama customer" },
    routes: { field: "route_name", label: "nama route" },
    regions: { field: "region_name", label: "nama region" },
    deviceTypes: { field: "device_type_name", label: "nama tipe perangkat" },
    popTypes: { field: "pop_type_name", label: "nama tipe POP" },
    routeTypes: { field: "route_type_name", label: "nama tipe route" },
    odpTypes: { field: "odp_type_name", label: "nama tipe ODP" },
    installationTypes: { field: "installation_type_name", label: "nama jenis instalasi" },
    serviceTypes: { field: "service_type_name", label: "nama jenis layanan" },
    tenants: { field: "tenant_name", label: "nama tenant" },
    manufacturers: { field: "manufacturer_name", label: "nama manufacturer" },
    brands: { field: "brand_name", label: "nama brand" },
    assetModels: { field: "model_name", label: "nama model" },
    provinces: { field: "province_name", label: "nama provinsi" },
    cities: { field: "city_name", label: "nama kota/kabupaten" },
  };
  return map[resource] || null;
}

export function getCreateDefaults(resource: string): Record<string, string> {
  if (resource === "deviceTypes") return { asset_group: "active", icon_name: "HardDrive", topology_role: "termination_panel", supports_ports: "false", supports_splitter: "false", supports_core_management: "false", supports_joint_closure: "false", layout_type: "summary_only", default_front_label: "Hulu", default_rear_label: "Hilir", is_assignable: "false", is_active: "true", sort_order: "0" };
  if (resource === "topologyRelationRules") return { direction: "front", connection_role: "physical_fiber", requires_same_pop: "true", requires_same_project: "false", is_required_on_create: "false", is_active: "true", sort_order: "0" };
  if (resource === "linkBudgetParameters") return { unit: "dB", is_active: "true", sort_order: "0" };
  if (resource === "popTypes") return { is_active: "true", sort_order: "0" };
  if (resource === "routeTypes") return { is_active: "true", sort_order: "0" };
  if (resource === "cableTypes") return { cable_role: "distribution", attenuation_1310_db_per_km: "0.35", attenuation_1490_db_per_km: "0.25", attenuation_1550_db_per_km: "0.25", is_active: "true", sort_order: "0" };
  if (resource === "coreCapacities") return { is_active: "true", sort_order: "0", allowed_route_type_keys: "[]" };
  if (resource === "deviceCoreCapacities") return { is_active: "true", sort_order: "0", allowed_device_type_keys: "[]" };
  if (resource === "odpTypes") return { is_active: "true", sort_order: "0" };
  if (resource === "installationTypes") return { is_active: "true", sort_order: "0" };
  if (resource === "serviceTypes") return { is_active: "true", sort_order: "0" };
  if (resource === "tenants") return { is_active: "true", sort_order: "0" };
  if (resource === "splitterProfiles") return { input_port_count: "1", output_port_count: "8", allowed_device_type_keys: "[]", is_active: "true" };
  if (resource === "provinces") return { is_active: "true" };
  if (resource === "cities") return { is_active: "true" };
  return {};
}

export function buildCreatePayload(resource: string, form: Record<string, string>) {
  const trim = (key: string) => (form[key] || "").trim();
  const payload: Record<string, unknown> = {};
  const assign = (key: string) => { const value = trim(key); if (value) payload[key] = value; };

  if (resource === "regions") {
    if (!trim("region_name")) return null;
    assign("region_name"); assign("region_color"); assign("description");
    return payload;
  }
  if (resource === "deviceTypes") {
    if (!trim("device_type_key") || !trim("device_type_name") || !trim("asset_group")) return null;
    assign("device_type_key"); assign("device_type_name"); assign("asset_group");
    assign("icon_name"); assign("topology_role");
    payload.is_passive = payload.asset_group === "passive";
    payload.is_active_device = (trim("is_active_device") || "false") === "true";
    payload.supports_ports = (trim("supports_ports") || "false") === "true";
    payload.supports_splitter = (trim("supports_splitter") || "false") === "true";
    payload.supports_core_management = (trim("supports_core_management") || "false") === "true";
    payload.supports_joint_closure = (trim("supports_joint_closure") || "false") === "true";
    assign("layout_type"); assign("default_front_label"); assign("default_rear_label");
    payload.is_assignable = (trim("is_assignable") || "false") === "true";
    assign("description"); assign("inventory_type_code");
    payload.sort_order = Number(trim("sort_order") || "0");
    payload.is_active = (trim("is_active") || "true") !== "false";
    return payload;
  }
  if (resource === "topologyRelationRules") {
    if (!trim("source_device_type_key") || !trim("direction") || !trim("allowed_peer_device_type_key")) return null;
    assign("source_device_type_key"); assign("direction"); assign("allowed_peer_device_type_key");
    assign("connection_role"); assign("route_type");
    payload.requires_same_pop = (trim("requires_same_pop") || "true") === "true";
    payload.requires_same_project = (trim("requires_same_project") || "false") === "true";
    payload.is_required_on_create = (trim("is_required_on_create") || "false") === "true";
    assign("description");
    payload.sort_order = Number(trim("sort_order") || "0");
    payload.is_active = (trim("is_active") || "true") !== "false";
    return payload;
  }
  if (resource === "linkBudgetParameters") {
    if (!trim("parameter_key") || !trim("parameter_label") || !trim("parameter_value")) return null;
    assign("parameter_key"); assign("parameter_label");
    if (trim("parameter_value")) payload.parameter_value = Number(trim("parameter_value"));
    assign("unit"); assign("description");
    payload.sort_order = Number(trim("sort_order") || "0");
    payload.is_active = (trim("is_active") || "true") !== "false";
    return payload;
  }
  if (resource === "popTypes") {
    if (!trim("pop_type_name")) return null;
    assign("pop_type_name"); assign("pop_type_code"); assign("description");
    payload.sort_order = Number(trim("sort_order") || "0");
    payload.is_active = (trim("is_active") || "true") !== "false";
    return payload;
  }
  if (resource === "routeTypes") {
    if (!trim("route_type_name")) return null;
    assign("route_type_name"); assign("route_type_code"); assign("description");
    payload.sort_order = Number(trim("sort_order") || "0");
    payload.is_active = (trim("is_active") || "true") !== "false";
    return payload;
  }
  if (resource === "cableTypes") {
    if (!trim("cable_type_name")) return null;
    assign("cable_type_name"); assign("cable_type_code"); assign("cable_role");
    if (trim("core_count")) payload.core_count = Number(trim("core_count"));
    if (trim("attenuation_1310_db_per_km")) payload.attenuation_1310_db_per_km = Number(trim("attenuation_1310_db_per_km"));
    if (trim("attenuation_1490_db_per_km")) payload.attenuation_1490_db_per_km = Number(trim("attenuation_1490_db_per_km"));
    if (trim("attenuation_1550_db_per_km")) payload.attenuation_1550_db_per_km = Number(trim("attenuation_1550_db_per_km"));
    assign("description");
    payload.sort_order = Number(trim("sort_order") || "0");
    payload.is_active = (trim("is_active") || "true") !== "false";
    return payload;
  }
  if (resource === "coreCapacities") {
    if (!trim("label") || !trim("core_capacity_value")) return null;
    assign("label"); payload.core_capacity_value = Number(trim("core_capacity_value"));
    assign("description");
    payload.allowed_route_type_keys = parseJsonStringArray(form.allowed_route_type_keys);
    payload.sort_order = Number(trim("sort_order") || "0");
    payload.is_active = (trim("is_active") || "true") !== "false";
    return payload;
  }
  if (resource === "deviceCoreCapacities") {
    if (!trim("label") || !trim("core_capacity_value")) return null;
    assign("label"); payload.core_capacity_value = Number(trim("core_capacity_value"));
    assign("description");
    payload.allowed_device_type_keys = parseJsonStringArray(form.allowed_device_type_keys);
    payload.sort_order = Number(trim("sort_order") || "0");
    payload.is_active = form.is_active === "true";
    return payload;
  }
  if (resource === "odpTypes") {
    if (!trim("odp_type_name")) return null;
    assign("odp_type_name"); assign("odp_type_code"); assign("description");
    payload.sort_order = Number(trim("sort_order") || "0");
    payload.is_active = (trim("is_active") || "true") !== "false";
    return payload;
  }
  if (resource === "installationTypes") {
    if (!trim("installation_type_name")) return null;
    assign("installation_type_name"); assign("installation_type_code"); assign("description");
    payload.sort_order = Number(trim("sort_order") || "0");
    payload.is_active = (trim("is_active") || "true") !== "false";
    return payload;
  }
  if (resource === "serviceTypes") {
    if (!trim("service_type_name")) return null;
    assign("service_type_name"); assign("service_type_code"); assign("description");
    payload.sort_order = Number(trim("sort_order") || "0");
    payload.is_active = (trim("is_active") || "true") !== "false";
    return payload;
  }
  if (resource === "tenants") {
    if (!trim("tenant_name")) return null;
    assign("tenant_name"); assign("tenant_code"); assign("description");
    payload.sort_order = Number(trim("sort_order") || "0");
    payload.is_active = (trim("is_active") || "true") !== "false";
    return payload;
  }
  if (resource === "manufacturers") {
    if (!trim("manufacturer_name")) return null;
    assign("manufacturer_name"); assign("manufacturer_code"); assign("description");
    return payload;
  }
  if (resource === "brands") {
    if (!trim("brand_name")) return null;
    assign("brand_name"); assign("brand_code"); assign("manufacturer_id"); assign("description");
    return payload;
  }
  if (resource === "assetModels") {
    if (!trim("model_name")) return null;
    assign("model_name"); assign("model_code"); assign("asset_type_id"); assign("brand_id"); assign("manufacturer_id"); assign("description");
    if (trim("capacity_core")) payload.capacity_core = Number(trim("capacity_core"));
    if (trim("total_ports")) payload.total_ports = Number(trim("total_ports"));
    if (trim("tray_config")) {
      try {
        payload.tray_config = JSON.parse(trim("tray_config"));
      } catch (e) {
        payload.tray_config = trim("tray_config");
      }
    }
    return payload;
  }
  if (resource === "splitterProfiles") {
    if (!trim("ratio_label") || !trim("input_port_count") || !trim("output_port_count")) return null;
    assign("ratio_label");
    payload.input_port_count = Number(trim("input_port_count"));
    payload.output_port_count = Number(trim("output_port_count"));
    if (trim("expected_loss_db")) payload.expected_loss_db = Number(trim("expected_loss_db"));
    payload.allowed_device_type_keys = parseJsonStringArray(form.allowed_device_type_keys);
    payload.is_active = (payload.allowed_device_type_keys as string[]).length > 0;
    assign("notes");
    return payload;
  }
  if (resource === "provinces") {
    if (!trim("province_name")) return null;
    assign("province_name"); payload.is_active = (trim("is_active") || "true") !== "false";
    return payload;
  }
  if (resource === "cities") {
    if (!trim("city_name")) return null;
    assign("city_name"); assign("city_code"); assign("province_id");
    payload.is_active = (trim("is_active") || "true") !== "false";
    return payload;
  }
  return null;
}

export function buildEditFormFromItem(resource: string, item: GenericItem): Record<string, string> {
  const read = (...keys: string[]) => {
    for (const key of keys) {
      const value = item[key];
      if (value === null || value === undefined) continue;
      return String(value);
    }
    return "";
  };
  const readBool = (key: string, fallback = true) => {
    const value = item[key];
    if (typeof value === "boolean") return String(value);
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (normalized === "true") return "true";
      if (normalized === "false") return "false";
    }
    return String(fallback);
  };

  if (resource === "regions") return { region_name: read("region_name"), region_color: read("region_color"), description: read("description") };
  if (resource === "deviceTypes") return { id: read("id"), device_type_key: read("device_type_key"), device_type_name: read("device_type_name"), asset_group: read("asset_group") || "active", icon_name: read("icon_name") || "HardDrive", topology_role: read("topology_role") || "termination_panel", is_passive: readBool("is_passive", false), is_active_device: readBool("is_active_device", false), supports_ports: readBool("supports_ports", false), supports_splitter: readBool("supports_splitter", false), supports_core_management: readBool("supports_core_management", false), supports_joint_closure: readBool("supports_joint_closure", false), layout_type: read("layout_type") || "summary_only", default_front_label: read("default_front_label") || "Hulu", default_rear_label: read("default_rear_label") || "Hilir", is_assignable: readBool("is_assignable", false), description: read("description"), inventory_type_code: read("inventory_type_code"), sort_order: read("sort_order") || "0", is_active: readBool("is_active", true) };
  if (resource === "topologyRelationRules") return { source_device_type_key: read("source_device_type_key"), direction: read("direction") || "front", allowed_peer_device_type_key: read("allowed_peer_device_type_key"), connection_role: read("connection_role") || "physical_fiber", route_type: read("route_type"), requires_same_pop: readBool("requires_same_pop", true), requires_same_project: readBool("requires_same_project", false), is_required_on_create: readBool("is_required_on_create", false), description: read("description"), sort_order: read("sort_order") || "0", is_active: readBool("is_active", true) };
  if (resource === "linkBudgetParameters") return { parameter_key: read("parameter_key"), parameter_label: read("parameter_label"), parameter_value: read("parameter_value"), unit: read("unit") || "dB", description: read("description"), sort_order: read("sort_order") || "0", is_active: readBool("is_active", true) };
  if (resource === "popTypes") return { pop_type_name: read("pop_type_name"), pop_type_code: read("pop_type_code"), description: read("description"), sort_order: read("sort_order") || "0", is_active: readBool("is_active", true) };
  if (resource === "routeTypes") return { route_type_name: read("route_type_name"), route_type_code: read("route_type_code"), description: read("description"), sort_order: read("sort_order") || "0", is_active: readBool("is_active", true) };
  if (resource === "cableTypes") return { cable_type_code: read("cable_type_code"), cable_type_name: read("cable_type_name"), cable_role: read("cable_role") || "distribution", core_count: read("core_count"), attenuation_1310_db_per_km: read("attenuation_1310_db_per_km") || "0.35", attenuation_1490_db_per_km: read("attenuation_1490_db_per_km") || "0.25", attenuation_1550_db_per_km: read("attenuation_1550_db_per_km") || "0.25", description: read("description"), sort_order: read("sort_order") || "0", is_active: readBool("is_active", true) };
  if (resource === "coreCapacities") return { label: read("label"), core_capacity_value: read("core_capacity_value"), description: read("description"), allowed_route_type_keys: JSON.stringify(Array.isArray(item.allowed_route_type_keys) ? item.allowed_route_type_keys : []), sort_order: read("sort_order") || "0", is_active: readBool("is_active", true) };
  if (resource === "deviceCoreCapacities") return { label: read("label"), core_capacity_value: read("core_capacity_value"), description: read("description"), allowed_device_type_keys: JSON.stringify(Array.isArray(item.allowed_device_type_keys) ? item.allowed_device_type_keys : []), sort_order: read("sort_order") || "0", is_active: readBool("is_active", true) };
  if (resource === "odpTypes") return { odp_type_name: read("odp_type_name"), odp_type_code: read("odp_type_code"), description: read("description"), sort_order: read("sort_order") || "0", is_active: readBool("is_active", true) };
  if (resource === "installationTypes") return { installation_type_name: read("installation_type_name"), installation_type_code: read("installation_type_code"), description: read("description"), sort_order: read("sort_order") || "0", is_active: readBool("is_active", true) };
  if (resource === "serviceTypes") return { service_type_name: read("service_type_name"), service_type_code: read("service_type_code"), description: read("description"), sort_order: read("sort_order") || "0", is_active: readBool("is_active", true) };
  if (resource === "tenants") return { tenant_name: read("tenant_name"), tenant_code: read("tenant_code"), description: read("description"), sort_order: read("sort_order") || "0", is_active: readBool("is_active", true) };
  if (resource === "manufacturers") return { manufacturer_name: read("manufacturer_name"), manufacturer_code: read("manufacturer_code"), description: read("description") };
  if (resource === "brands") return { brand_name: read("brand_name"), brand_code: read("brand_code"), manufacturer_id: read("manufacturer_id"), description: read("description") };
  if (resource === "assetModels") return { model_name: read("model_name"), model_code: read("model_code"), asset_type_id: read("asset_type_id"), brand_id: read("brand_id"), manufacturer_id: read("manufacturer_id"), capacity_core: read("capacity_core"), total_ports: read("total_ports"), tray_config: item.tray_config ? (typeof item.tray_config === 'string' ? item.tray_config : JSON.stringify(item.tray_config, null, 2)) : "", description: read("description") };
  if (resource === "splitterProfiles") return { ratio_label: read("ratio_label"), input_port_count: read("input_port_count"), output_port_count: read("output_port_count"), expected_loss_db: read("expected_loss_db"), allowed_device_type_keys: JSON.stringify(Array.isArray(item.allowed_device_type_keys) ? item.allowed_device_type_keys : []), notes: read("notes"), is_active: readBool("is_active", true) };
  if (resource === "provinces") return { province_name: read("province_name"), is_active: readBool("is_active", true) };
  if (resource === "cities") return { city_name: read("city_name"), city_code: read("city_code"), province_id: read("province_id"), is_active: readBool("is_active", true) };
  return {};
}
