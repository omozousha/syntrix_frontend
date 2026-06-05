export const RELATION_LABEL_FALLBACK = {
  loading: "Memuat...",
  missing: "Data tidak tersedia",
  empty: "-",
  accessDenied: "Tidak tersedia untuk scope akun ini",
} as const;

type RelationSource = Record<string, unknown> | null | undefined;

type RelationDisplayInput = {
  relation?: RelationSource;
  fallback?: unknown;
  loading?: boolean;
  optional?: boolean;
  fields: string[];
};

export function getRelationDisplay({
  relation,
  fallback,
  loading = false,
  optional = false,
  fields,
}: RelationDisplayInput) {
  if (loading) return RELATION_LABEL_FALLBACK.loading;

  const relationValue = firstUsableValue(relation, fields);
  if (relationValue) return relationValue;

  const fallbackValue = normalizeDisplayValue(fallback);
  if (fallbackValue && !isUuidLike(fallbackValue)) return fallbackValue;

  return optional ? RELATION_LABEL_FALLBACK.empty : RELATION_LABEL_FALLBACK.missing;
}

export function getRegionLabel(input: { relation?: RelationSource; fallback?: unknown; loading?: boolean; optional?: boolean }) {
  return getRelationDisplay({
    ...input,
    fields: ["region_name", "name"],
  });
}

export function getPopLabel(input: { relation?: RelationSource; fallback?: unknown; loading?: boolean; optional?: boolean }) {
  return getRelationDisplay({
    ...input,
    fields: ["pop_name", "name"],
  });
}

export function getTenantLabel(input: { relation?: RelationSource; fallback?: unknown; loading?: boolean; optional?: boolean }) {
  return getRelationDisplay({
    ...input,
    fields: ["tenant_name", "name"],
  });
}

export function getDeviceTypeLabel(input: { relation?: RelationSource; fallback?: unknown; loading?: boolean; optional?: boolean }) {
  return getRelationDisplay({
    ...input,
    fields: ["device_type_name", "device_type_key", "name"],
  });
}

export function getBrandLabel(input: { relation?: RelationSource; fallback?: unknown; loading?: boolean; optional?: boolean }) {
  return getRelationDisplay({
    ...input,
    fields: ["brand_name", "name"],
  });
}

export function getModelLabel(input: { relation?: RelationSource; fallback?: unknown; loading?: boolean; optional?: boolean }) {
  return getRelationDisplay({
    ...input,
    fields: ["model_name", "name"],
  });
}

export function getManufacturerLabel(input: { relation?: RelationSource; fallback?: unknown; loading?: boolean; optional?: boolean }) {
  return getRelationDisplay({
    ...input,
    fields: ["manufacturer_name", "name"],
  });
}

export function getCustomerLabel(input: { relation?: RelationSource; fallback?: unknown; loading?: boolean; optional?: boolean }) {
  return getRelationDisplay({
    ...input,
    fields: ["customer_name", "customer_number", "name"],
  });
}

export function getProjectLabel(input: { relation?: RelationSource; fallback?: unknown; loading?: boolean; optional?: boolean }) {
  return getRelationDisplay({
    ...input,
    fields: ["project_name", "project_code", "name"],
  });
}

export function isUuidLike(value: unknown) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || "").trim());
}

function firstUsableValue(source: RelationSource, fields: string[]) {
  if (!source || typeof source !== "object" || Array.isArray(source)) return "";
  for (const field of fields) {
    const value = normalizeDisplayValue(source[field]);
    if (value && !isUuidLike(value)) return value;
  }
  return "";
}

function normalizeDisplayValue(value: unknown) {
  if (value === null || value === undefined) return "";
  const text = String(value).trim();
  if (!text || text.toLowerCase() === "null" || text.toLowerCase() === "undefined") return "";
  return text;
}
