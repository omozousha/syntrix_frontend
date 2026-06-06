import { RELATION_LABEL_FALLBACK, getRegionLabel } from "@/lib/relation-labels";

type RegionRecord = {
  id?: string | null;
  region_name?: string | null;
  region_id?: string | null;
  region_code?: string | null;
};

export function buildRegionCardDisplay(region: RegionRecord | null | undefined) {
  const name = getRegionLabel({ relation: region || null });
  const code = valueOf(region?.region_code || region?.region_id);
  return {
    name,
    code,
    comboboxLabel: code && name !== RELATION_LABEL_FALLBACK.missing ? `${name} (${code})` : name,
  };
}

function valueOf(value: unknown, fallback = "") {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
}
