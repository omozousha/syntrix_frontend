import { apiFetch } from "@/lib/api";
import type {
  GenericItem,
  RelationRecord,
  EditableForm,
  OdpValidationRecord,
  ValidationRequestRecord,
  AttachmentRef,
  UploadResult,
  ProjectAssetItem,
} from "./types";

export const POP_STATUS_OPTIONS = ["planning", "active", "inactive", "maintenance"];
export const VALIDATION_STATUS_OPTIONS = ["unvalidated", "valid", "warning", "invalid"];
export const CUSTOMER_STATUS_OPTIONS = ["active", "suspended", "terminated", "draft"];

export function valueOf(value: unknown, fallback = "") {
  if (value == null) return fallback;
  const text = String(value);
  return text === "null" || text === "undefined" ? fallback : text;
}

export function numberValue(value: unknown) {
  if (value == null || value === "") return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatCounts(counts: Record<string, number>) {
  const entries = Object.entries(counts).filter(([, count]) => count > 0);
  if (!entries.length) return "-";
  return entries
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, count]) => `${key}: ${count}`)
    .join(", ");
}

export function buildProjectDetailHref(projectId: string, regionId = "") {
  if (!projectId) return "";
  const query = regionId ? `?region_id=${encodeURIComponent(regionId)}` : "";
  return `/data-management/list/projects/${projectId}${query}`;
}

export function getRelationRecord(value: unknown): RelationRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as RelationRecord;
}

export function buildReferenceMap(rows: Array<Record<string, unknown>> | undefined) {
  const map = new Map<string, Record<string, unknown>>();
  (rows || []).forEach((row) => {
    const id = valueOf(row.id).trim();
    if (id) map.set(id, row);
  });
  return map;
}

export function getEffectiveDeviceValidationStatus(
  item: Record<string, unknown>,
  requestStatusOverride?: string | null,
  hasFinalValidationRecord = false,
) {
  const requestStatus = String(requestStatusOverride || item.latest_validation_request_status || "").trim().toLowerCase();
  if (requestStatus && requestStatus !== "validated") return requestStatus;
  if (requestStatus === "validated") return "valid";

  const status = valueOf(item.validation_status, "unvalidated").trim().toLowerCase();
  if (["valid", "validated"].includes(status) && !hasFinalValidationRecord && !item.validation_date && !item.last_validation_at) {
    return "unvalidated";
  }

  return status || "unvalidated";
}

export function isFieldValidationRequestRecord(request: ValidationRequestRecord) {
  const snapshot = request.payload_snapshot || {};
  return Boolean(snapshot.field_validation || snapshot.field_inspection || snapshot.port_summary);
}

export function isFinalValidationRecord(record: OdpValidationRecord) {
  const requestStatus = String(record.request_status || "").trim().toLowerCase();
  return !requestStatus || requestStatus === "validated";
}

export function sanitizeFileName(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "") || "device";
}

export function nullIfEmpty(value: string) {
  const text = String(value || "").trim();
  return text ? text : null;
}

export function numberOrNull(value: string) {
  const text = String(value || "").trim();
  if (!text) return null;
  const number = Number(text);
  return Number.isFinite(number) ? number : null;
}

export function validateCoordinateFormat(value: string, kind: "longitude" | "latitude") {
  const text = String(value || "").trim();
  if (!text) {
    return { valid: true, state: "idle" as const, message: "" };
  }

  if (text.includes(",")) {
    return { valid: false, state: "invalid" as const, message: "Gunakan titik (.) sebagai pemisah desimal, bukan koma (,)." };
  }

  if (!text.includes(".")) {
    return { valid: false, state: "invalid" as const, message: "Format harus menggunakan titik (.) desimal." };
  }

  const allowedPattern = kind === "latitude" ? /^[-0-9.]+$/ : /^[0-9.]+$/;
  if (!allowedPattern.test(text)) {
    const invalidChars = Array.from(new Set((text.match(/[^0-9.\-]/g) || []).filter((ch) => ch.trim() !== "")));
    if (invalidChars.length > 0) {
      return {
        valid: false,
        state: "invalid" as const,
        message: `Ada karakter tidak valid: ${invalidChars.join(" ")}. Gunakan hanya angka dan titik${kind === "latitude" ? ", plus minus (-) di depan" : ""}.`,
      };
    }
    if (/\s/.test(text)) {
      return { valid: false, state: "invalid" as const, message: "Koordinat tidak boleh mengandung spasi." };
    }
    return {
      valid: false,
      state: "invalid" as const,
      message: `Koordinat hanya boleh berisi angka, titik${kind === "latitude" ? ", dan minus (-) di depan" : ""}.`,
    };
  }

  if (kind === "latitude") {
    if (!text.startsWith("-")) {
      return { valid: false, state: "invalid" as const, message: "Latitude harus diawali tanda minus (-)." };
    }
    if (!/^-?\d+\.\d+$/.test(text)) {
      return { valid: false, state: "invalid" as const, message: "Latitude hanya boleh berisi angka, minus, dan titik desimal." };
    }

    const parts = text.slice(1).split(".");
    if (parts.length !== 2) {
      return { valid: false, state: "invalid" as const, message: "Latitude harus memiliki satu titik desimal." };
    }

    const [whole, decimal] = parts;
    if (whole.length !== 1) {
      return { valid: false, state: "invalid" as const, message: "Digit sebelum titik untuk latitude harus tepat 1 angka." };
    }
    if (decimal.length < 6) {
      return { valid: false, state: "invalid" as const, message: "Digit setelah titik untuk latitude minimal 6 angka." };
    }

    return {
      valid: true,
      state: "valid" as const,
      message: "Format benar.",
    };
  }

  if (text.startsWith("-")) {
    return { valid: false, state: "invalid" as const, message: "Longitude tidak boleh diawali minus (-)." };
  }
  if (!/^\d+\.\d+$/.test(text)) {
    return { valid: false, state: "invalid" as const, message: "Longitude hanya boleh berisi angka dan titik desimal." };
  }

  const parts = text.split(".");
  if (parts.length !== 2) {
    return { valid: false, state: "invalid" as const, message: "Longitude harus memiliki satu titik desimal." };
  }

  const [whole, decimal] = parts;
  if (whole.length !== 3) {
    return { valid: false, state: "invalid" as const, message: "Digit sebelum titik untuk longitude harus tepat 3 angka." };
  }
  if (decimal.length < 6) {
    return { valid: false, state: "invalid" as const, message: "Digit setelah titik untuk longitude minimal 6 angka." };
  }

  return {
    valid: true,
    state: "valid" as const,
    message: "Format benar.",
  };
}

export function csvToArray(value: string) {
  const text = String(value || "").trim();
  if (!text) return [];
  return text.split(",").map((item) => item.trim()).filter(Boolean);
}

export function arrayToCsv(value: unknown) {
  if (!Array.isArray(value)) return "";
  return value.map((item) => String(item)).join(", ");
}

export function formatPopDisplay(popName?: string, popCode?: string) {
  const name = valueOf(popName, "-");
  const code = valueOf(popCode);
  if (name === "-" || !code || name.includes(code)) return name;
  return `${name} (${code})`;
}

export function formatDeviceRelationLabel(item?: Record<string, unknown> | null) {
  if (!item) return "";
  const name = valueOf(item.device_name);
  const inventory = valueOf(item.device_id);
  const type = valueOf(item.device_type_key);
  const primary = name || inventory;
  if (!primary) return "";
  const suffix = [type, inventory && inventory !== primary ? inventory : ""].filter(Boolean).join(" | ");
  return suffix ? `${primary} (${suffix})` : primary;
}

export function hasRouteGeometry(value: unknown) {
  if (!value) return false;
  if (typeof value === "string") return value.trim().length > 0 && value.trim() !== "{}";
  if (typeof value === "object") return Object.keys(value as Record<string, unknown>).length > 0;
  return false;
}

export function formatDistanceMeters(value: unknown) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return "-";
  if (number >= 1000) return `${(number / 1000).toLocaleString("id-ID", { maximumFractionDigits: 2 })} km`;
  return `${number.toLocaleString("id-ID", { maximumFractionDigits: 0 })} m`;
}

export function countAttachmentRefs(attachments: unknown, primaryAttachmentId: unknown) {
  const ids = new Set<string>();
  const primary = valueOf(primaryAttachmentId).trim();
  if (primary) ids.add(primary);

  if (Array.isArray(attachments)) {
    attachments.forEach((attachment) => {
      if (typeof attachment === "string") {
        const id = attachment.trim();
        if (id) ids.add(id);
        return;
      }
      if (attachment && typeof attachment === "object") {
        const row = attachment as Record<string, unknown>;
        const id = valueOf(row.id || row.attachment_id || row.storage_file_id).trim();
        if (id) ids.add(id);
      }
    });
  }

  return ids.size;
}

export function formatDateTime(value: string) {
  if (!value || value === "-") return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function mapValidationRequestStatusToFieldStatus(status?: string | null): OdpValidationRecord["status"] {
  if (status === "validated") return "valid";
  if (status === "pending_async" || status === "ongoing_validated") return "warning";
  if (status === "rejected_by_adminregion" || status === "rejected_by_superadmin") return "invalid";
  return "invalid";
}

export function formatDate(value: string) {
  if (!value || value === "-") return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
  }).format(date);
}

export function normalizeValidationPayload(statusRaw: string, dateRaw: string) {
  const status = nullIfEmpty(statusRaw)?.toLowerCase() || null;
  const date = nullIfEmpty(dateRaw);

  if (!status) {
    return { validation_status: null, validation_date: null };
  }

  if (status === "unvalidated") {
    return { validation_status: status, validation_date: null };
  }

  if (date) {
    return { validation_status: status, validation_date: date };
  }

  return { validation_status: status, validation_date: currentDateISO() };
}

export function currentDateISO() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function extractImageAttachments(value: unknown, primaryId: string, fallbackTimestamp?: string): AttachmentRef[] {
  const refs: AttachmentRef[] = [];
  const seen = new Set<string>();

  const pushRef = (id: string, name?: string, timestamp?: string) => {
    const cleanId = valueOf(id);
    if (!cleanId || seen.has(cleanId)) return;
    seen.add(cleanId);
    refs.push({ id: cleanId, name: name ? valueOf(name) : undefined, timestamp });
  };

  if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item === "string") {
        pushRef(item, undefined, fallbackTimestamp);
        continue;
      }
      if (item && typeof item === "object") {
        const row = item as Record<string, unknown>;
        const attachmentId = valueOf(row.id || row.attachment_id);
        const attachmentName = valueOf(row.file_name || row.filename || row.original_name);
        const ts = valueOf(row.created_at || row.uploaded_at || fallbackTimestamp);
        if (attachmentId) pushRef(attachmentId, attachmentName || undefined, ts || undefined);
      }
    }
  }

  if (primaryId) {
    pushRef(primaryId, undefined, fallbackTimestamp);
  }

  return refs;
}

export function mergeAttachmentRefs(refs: AttachmentRef[]) {
  const merged = new Map<string, AttachmentRef>();
  refs.forEach((ref) => {
    const id = valueOf(ref.id);
    if (!id || merged.has(id)) return;
    merged.set(id, { id, name: ref.name, timestamp: ref.timestamp });
  });
  return Array.from(merged.values());
}

export function extractValidationEvidenceAttachments(record: OdpValidationRecord): AttachmentRef[] {
  const refs: AttachmentRef[] = [];
  const seen = new Set<string>();
  const recordTimestamp = valueOf(record.validated_at || record.updated_at || record.created_at);

  const pushRef = (id: unknown, name?: unknown, timestamp?: unknown) => {
    const cleanId = valueOf(id);
    if (!cleanId || seen.has(cleanId)) return;
    seen.add(cleanId);
    refs.push({
      id: cleanId,
      name: valueOf(name) || undefined,
      timestamp: valueOf(timestamp) || recordTimestamp || undefined,
    });
  };

  (record.evidence_attachments || []).forEach((attachment, index) => {
    const attObj = attachment as Record<string, unknown>;
    pushRef(
      attachment.id || attachment.attachment_id,
      attachment.name || `validation-evidence-${index + 1}`,
      attObj?.created_at || attObj?.uploaded_at || recordTimestamp,
    );
  });
  pushRef(record.evidence_attachment_id, "validation-evidence", recordTimestamp);

  const inspection = record.payload?.field_inspection || {};
  Object.values(inspection.initial_photos || {}).forEach((item) => {
    pushInspectionAttachmentRef(item, pushRef, recordTimestamp);
  });
  Object.values(inspection.condition_checks || {}).forEach((item) => {
    pushInspectionAttachmentRef(item, pushRef, recordTimestamp);
  });

  return refs;
}

export function pushInspectionAttachmentRef(
  item: { label?: string; attachment?: { id?: string | null; attachment_id?: string | null; name?: string | null; created_at?: string | null } } | undefined,
  pushRef: (id: unknown, name?: unknown, timestamp?: unknown) => void,
  fallbackTimestamp?: string,
) {
  if (!item) return;
  pushRef(
    item.attachment?.id || item.attachment?.attachment_id,
    item.attachment?.name || item.label,
    item.attachment?.created_at || fallbackTimestamp,
  );
}

export async function uploadAttachment({
  token,
  file,
  fileCategory,
  entityType,
  entityId,
}: {
  token: string;
  file: File;
  fileCategory: string;
  entityType: string;
  entityId?: string;
}) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("file_category", fileCategory);
  formData.append("entity_type", entityType);
  if (entityId) {
    formData.append("entity_id", entityId);
  }

  const response = await apiFetch<{ data: UploadResult }>("/attachments/upload", {
    method: "POST",
    token,
    body: formData,
  });

  return response.data;
}

export function getOdpPortStatusClass(status?: string | null) {
  if (status === "used") return "bg-emerald-500";
  if (status === "reserved") return "bg-amber-400";
  if (status === "down" || status === "maintenance") return "bg-rose-500";
  return "bg-slate-300";
}

export function summarizeOdpPorts(ports: import("./types").DevicePort[], device: GenericItem) {
  const total = ports.length || Number(device.total_ports || 0) || 0;
  const used = ports.filter((port) => port.status === "used").length || Number(device.used_ports || 0) || 0;
  const reserved = ports.filter((port) => port.status === "reserved").length;
  const down = ports.filter((port) => port.status === "down" || port.status === "maintenance").length;
  return {
    total,
    used,
    idle: Math.max(0, total - used - reserved - down),
    reserved,
    down,
  };
}

export function formatProjectAssetName(asset: ProjectAssetItem) {
  return valueOf(asset.device_name, valueOf(asset.device_id, asset.id));
}

export function buildEditableForm(item: GenericItem, resource: string, topologySummary?: import("./types").DeviceTopologySummary | null): EditableForm {
  if (resource === "customers") {
    return {
      customer_name: valueOf(item.customer_name || item.name),
      customer_number: valueOf(item.customer_number || item.customer_code),
      status: valueOf(item.status, "active"),
      service_type_id: valueOf(item.service_type_id),
      service_type: valueOf(item.service_type),
      pop_id: valueOf(item.pop_id),
      project_id: valueOf(item.project_id),
      region_id: valueOf(item.region_id),
      installation_date: valueOf(item.installation_date),
      contact_name: valueOf(item.contact_name),
      contact_phone: valueOf(item.contact_phone),
      email: valueOf(item.email),
      address: valueOf(item.address),
      province_id: valueOf(item.province_id),
      city_id: valueOf(item.city_id),
      province: valueOf(item.province),
      city: valueOf(item.city),
      longitude: valueOf(item.longitude),
      latitude: valueOf(item.latitude),
      tags: arrayToCsv(item.tags),
    };
  }

  if (resource === "pops") {
    const custom = (item.custom_fields || {}) as Record<string, unknown>;
    return {
      pop_id: valueOf(item.pop_id),
      pop_name: valueOf(item.pop_name),
      pop_code: valueOf(item.pop_code),
      status_pop: valueOf(item.status_pop, "planning"),
      validation_status: valueOf(item.validation_status, "unvalidated"),
      validation_date: valueOf(item.validation_date),
      tenant: valueOf(item.tenant),
      pop_type: valueOf(item.pop_type),
      pop_type_id: valueOf(item.pop_type_id),
      tanggal_pop_aktif: valueOf(item.tanggal_pop_aktif),
      pln_cid_number: valueOf(item.pln_cid_number),
      pln_payment_method: valueOf(item.pln_payment_method),
      pln_phase: valueOf(item.pln_phase),
      pln_wattage: valueOf(item.pln_wattage),
      address: valueOf(item.address),
      city: valueOf(item.city),
      province: valueOf(item.province),
      longitude: valueOf(item.longitude),
      latitude: valueOf(item.latitude),
      tags: arrayToCsv(item.tags),
      pbb_nop: valueOf(custom.pbb_nop),
      building_status: valueOf(custom.building_status),
      lease_start_date: valueOf(custom.lease_start_date),
      lease_end_date: valueOf(custom.lease_end_date),
      annual_lease_cost: valueOf(custom.annual_lease_cost),
      landlord_name: valueOf(custom.landlord_name),
      landlord_contact: valueOf(custom.landlord_contact),
      permit_number: valueOf(custom.permit_number),
      legal_notes: valueOf(custom.legal_notes),
    };
  }

  if (resource === "devices") {
    const isOdc = valueOf(item.device_type_key).toUpperCase() === "ODC";
    const upConn = isOdc ? topologySummary?.odc_relations?.upstream?.[0] : null;
    const specs = (item.specifications || {}) as Record<string, unknown>;

    return {
      device_id: valueOf(item.device_id),
      device_code: valueOf(item.device_code),
      device_name: valueOf(item.device_name),
      device_name_alias: valueOf(item.device_name_alias),
      device_type_key: valueOf(item.device_type_key),
      asset_group: valueOf(item.asset_group),
      status: valueOf(item.status, "draft"),
      installation_date: valueOf(item.installation_date),
      validation_status: valueOf(item.validation_status, "unvalidated"),
      validation_date: valueOf(item.validation_date),
      region_id: valueOf(item.region_id),
      pop_id: valueOf(item.pop_id),
      project_id: valueOf(item.project_id),
      tenant_id: valueOf(item.tenant_id),
      manufacturer_id: valueOf(item.manufacturer_id),
      brand_id: valueOf(item.brand_id),
      model_id: valueOf(item.model_id),
      serial_number: valueOf(item.serial_number),
      management_ip: valueOf(item.management_ip),
      capacity_core: valueOf(item.capacity_core),
      used_core: valueOf(item.used_core),
      total_ports: valueOf(item.total_ports),
      used_ports: valueOf(item.used_ports),
      splitter_ratio: valueOf(item.splitter_ratio),
      odp_type: valueOf(item.odp_type),
      installation_type: valueOf(item.installation_type),
      notes: valueOf(item.notes),
      address: valueOf(item.address),
      longitude: valueOf(item.longitude),
      latitude: valueOf(item.latitude),
      tags: arrayToCsv(item.tags),
      // ODC upstream connection fields
      upstream_device_id: upConn?.peer_device?.id || "",
      upstream_cable_id: upConn?.cable_device?.id || "",
      upstream_core_start: upConn?.core_start != null ? String(upConn.core_start) : "",
      upstream_core_end: upConn?.core_end != null ? String(upConn.core_end) : "",
      // ODP topology fields (direct columns on devices table)
      source_odc_id: valueOf(item.source_odc_id),
      source_odc_port_id: valueOf(item.source_odc_port_id),
      feeder_cable_id: valueOf(item.feeder_cable_id),
      feeder_core_start: valueOf(item.feeder_core_start),
      feeder_core_end: valueOf(item.feeder_core_end),
      // OLT uplink fields (direct columns on devices table)
      uplink_switch_id: valueOf(item.uplink_switch_id),
      uplink_router_id: valueOf(item.uplink_router_id),
      // ODC port count fields
      feeder_port_count: valueOf(item.feeder_port_count),
      distribution_port_count: valueOf(item.distribution_port_count),
      // JC & Rack specifications fields
      from_cable_id: valueOf(specs.from_cable_id),
      to_cable_id: valueOf(specs.to_cable_id),
      core_start: specs.core_start != null ? String(specs.core_start) : "",
      core_end: specs.core_end != null ? String(specs.core_end) : "",
      splice_tray_count: specs.splice_tray_count != null ? String(specs.splice_tray_count) : "",
      rack_device_id: valueOf(specs.rack_device_id),
      rack_unit_position: specs.rack_unit_position != null ? String(specs.rack_unit_position) : "",
      u_height: specs.u_height != null ? String(specs.u_height) : "1",
    };
  }

  return {};
}

export function buildUpdatePayload(form: EditableForm, resource: string, originalItem?: GenericItem | null): Record<string, unknown> {
  if (resource === "customers") {
    return {
      customer_name: nullIfEmpty(form.customer_name),
      customer_number: nullIfEmpty(form.customer_number),
      status: nullIfEmpty(form.status),
      service_type_id: nullIfEmpty(form.service_type_id),
      service_type: nullIfEmpty(form.service_type),
      pop_id: nullIfEmpty(form.pop_id),
      project_id: nullIfEmpty(form.project_id),
      region_id: nullIfEmpty(form.region_id),
      installation_date: nullIfEmpty(form.installation_date),
      contact_name: nullIfEmpty(form.contact_name),
      contact_phone: nullIfEmpty(form.contact_phone),
      email: nullIfEmpty(form.email),
      address: nullIfEmpty(form.address),
      province_id: nullIfEmpty(form.province_id),
      city_id: nullIfEmpty(form.city_id),
      province: nullIfEmpty(form.province),
      city: nullIfEmpty(form.city),
      longitude: numberOrNull(form.longitude),
      latitude: numberOrNull(form.latitude),
      tags: csvToArray(form.tags),
    };
  }

  const normalizedValidation = normalizeValidationPayload(form.validation_status, form.validation_date);

  if (resource === "pops") {
    const normalizedPopCode = nullIfEmpty(form.pop_code)?.toUpperCase() || null;
    if (normalizedPopCode && !/^[A-Z]{3}$/.test(normalizedPopCode)) {
      throw new Error("POP Code harus tepat 3 huruf A-Z (contoh: CBO).");
    }

    const originalCustom = (originalItem?.custom_fields || {}) as Record<string, unknown>;
    const customFields = {
      ...originalCustom,
      pbb_nop: nullIfEmpty(form.pbb_nop),
      building_status: nullIfEmpty(form.building_status),
      lease_start_date: nullIfEmpty(form.lease_start_date),
      lease_end_date: nullIfEmpty(form.lease_end_date),
      annual_lease_cost: numberOrNull(form.annual_lease_cost),
      landlord_name: nullIfEmpty(form.landlord_name),
      landlord_contact: nullIfEmpty(form.landlord_contact),
      permit_number: nullIfEmpty(form.permit_number),
      legal_notes: nullIfEmpty(form.legal_notes),
    };

    return {
      pop_name: normalizePopName(form.pop_name) || null,
      pop_code: normalizedPopCode,
      status_pop: nullIfEmpty(form.status_pop),
      validation_status: normalizedValidation.validation_status,
      validation_date: normalizedValidation.validation_date,
      tenant: nullIfEmpty(form.tenant),
      pop_type: nullIfEmpty(form.pop_type),
      pop_type_id: nullIfEmpty(form.pop_type_id),
      tanggal_pop_aktif: nullIfEmpty(form.tanggal_pop_aktif),
      pln_cid_number: nullIfEmpty(form.pln_cid_number),
      pln_payment_method: nullIfEmpty(form.pln_payment_method),
      pln_phase: nullIfEmpty(form.pln_phase),
      pln_wattage: numberOrNull(form.pln_wattage),
      address: nullIfEmpty(form.address),
      city: nullIfEmpty(form.city),
      province: nullIfEmpty(form.province),
      longitude: numberOrNull(form.longitude),
      latitude: numberOrNull(form.latitude),
      tags: csvToArray(form.tags),
      custom_fields: Object.keys(customFields).length > 0 ? customFields : null,
    };
  }

  if (resource === "devices") {
    // Reconstruct and merge specifications JSONB
    const originalSpecs = (originalItem?.specifications || {}) as Record<string, unknown>;
    const specs = { ...originalSpecs };

    if (form.from_cable_id !== undefined) {
      if (form.from_cable_id) specs.from_cable_id = form.from_cable_id;
      else delete specs.from_cable_id;
    }
    if (form.to_cable_id !== undefined) {
      if (form.to_cable_id) specs.to_cable_id = form.to_cable_id;
      else delete specs.to_cable_id;
    }
    if (form.core_start !== undefined) {
      if (form.core_start) specs.core_start = numberOrNull(form.core_start);
      else delete specs.core_start;
    }
    if (form.core_end !== undefined) {
      if (form.core_end) specs.core_end = numberOrNull(form.core_end);
      else delete specs.core_end;
    }
    if (form.splice_tray_count !== undefined) {
      if (form.splice_tray_count) specs.splice_tray_count = numberOrNull(form.splice_tray_count);
      else delete specs.splice_tray_count;
    }

    if (form.rack_device_id !== undefined) {
      if (form.rack_device_id) {
        specs.rack_device_id = form.rack_device_id;
        if (form.rack_unit_position) specs.rack_unit_position = numberOrNull(form.rack_unit_position);
        if (form.u_height) specs.u_height = numberOrNull(form.u_height);
      } else {
        delete specs.rack_device_id;
        delete specs.rack_unit_position;
        delete specs.u_height;
      }
    }

    return {
      device_name: normalizeDeviceName(form.device_name) || null,
      status: nullIfEmpty(form.status),
      installation_date: nullIfEmpty(form.installation_date),
      region_id: nullIfEmpty(form.region_id),
      pop_id: nullIfEmpty(form.pop_id),
      project_id: nullIfEmpty(form.project_id),
      tenant_id: nullIfEmpty(form.tenant_id),
      manufacturer_id: nullIfEmpty(form.manufacturer_id),
      brand_id: nullIfEmpty(form.brand_id),
      model_id: nullIfEmpty(form.model_id),
      serial_number: nullIfEmpty(form.serial_number),
      management_ip: nullIfEmpty(form.management_ip),
      capacity_core: numberOrNull(form.capacity_core),
      used_core: numberOrNull(form.used_core),
      total_ports: numberOrNull(form.total_ports),
      used_ports: numberOrNull(form.used_ports),
      splitter_ratio: nullIfEmpty(form.splitter_ratio),
      odp_type: nullIfEmpty(form.odp_type),
      installation_type: nullIfEmpty(form.installation_type),
      // ODP topology fields (direct columns on devices table)
      source_odc_id: nullIfEmpty(form.source_odc_id),
      source_odc_port_id: nullIfEmpty(form.source_odc_port_id),
      feeder_cable_id: nullIfEmpty(form.feeder_cable_id),
      feeder_core_start: numberOrNull(form.feeder_core_start),
      feeder_core_end: numberOrNull(form.feeder_core_end),
      // OLT uplink fields (direct columns on devices table)
      uplink_switch_id: nullIfEmpty(form.uplink_switch_id),
      uplink_router_id: nullIfEmpty(form.uplink_router_id),
      // ODC port count fields
      feeder_port_count: numberOrNull(form.feeder_port_count),
      distribution_port_count: numberOrNull(form.distribution_port_count),
      notes: nullIfEmpty(form.notes),
      address: nullIfEmpty(form.address),
      longitude: numberOrNull(form.longitude),
      latitude: numberOrNull(form.latitude),
      tags: csvToArray(form.tags),
      specifications: Object.keys(specs).length > 0 ? specs : {},
    };
  }

  return {};
}

// ponytail: re-export to avoid circular import with lib/name-normalization; upgrade: keep single source in helpers.
import { normalizeDeviceName, normalizePopName } from "@/lib/name-normalization";
