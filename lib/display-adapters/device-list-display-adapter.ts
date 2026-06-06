import { getBrandLabel, getManufacturerLabel, getPopLabel, getProjectLabel, getRegionLabel } from "@/lib/relation-labels";

type ListRecord = Record<string, unknown>;

export type DeviceListLookupMaps = {
  pops?: Record<string, string>;
  regions?: Record<string, string>;
  projects?: Record<string, string>;
  manufacturers?: Record<string, string>;
  brands?: Record<string, string>;
};

export function buildDeviceListDisplay(item: ListRecord, lookups: DeviceListLookupMaps = {}) {
  return {
    pop: getPopDisplay(item.pop_id, lookups, item),
    region: getRegionDisplay(item.region_id, lookups, item),
    project: getProjectDisplay(item.project_id, lookups, item),
    manufacturer: getManufacturerDisplay(item.manufacturer_id, lookups, item),
    brand: getBrandDisplay(item.brand_id, lookups, item),
    primaryName: getPrimaryName(item),
    primaryCode: getPrimaryCode(item),
  };
}

export function getPopDisplay(value: unknown, lookups: DeviceListLookupMaps = {}, relation?: ListRecord) {
  const id = valueOf(value);
  return getPopLabel({ relation, fallback: id ? lookups.pops?.[id] || value : value, optional: true });
}

export function getRegionDisplay(value: unknown, lookups: DeviceListLookupMaps = {}, relation?: ListRecord) {
  const id = valueOf(value);
  return getRegionLabel({ relation, fallback: id ? lookups.regions?.[id] || value : value });
}

export function getProjectDisplay(value: unknown, lookups: DeviceListLookupMaps = {}, relation?: ListRecord) {
  const id = valueOf(value);
  return getProjectLabel({ relation, fallback: id ? lookups.projects?.[id] || value : value, optional: true });
}

export function getManufacturerDisplay(value: unknown, lookups: DeviceListLookupMaps = {}, relation?: ListRecord) {
  const id = valueOf(value);
  return getManufacturerLabel({ relation, fallback: id ? lookups.manufacturers?.[id] || value : value, optional: true });
}

export function getBrandDisplay(value: unknown, lookups: DeviceListLookupMaps = {}, relation?: ListRecord) {
  const id = valueOf(value);
  return getBrandLabel({ relation, fallback: id ? lookups.brands?.[id] || value : value, optional: true });
}

function getPrimaryName(item: ListRecord) {
  return valueOf(
    item.device_name ||
      item.pop_name ||
      item.project_name ||
      item.customer_name ||
      item.route_name ||
      item.pole_number ||
      item.city_name ||
      item.region_name ||
      item.name,
    "-",
  );
}

function getPrimaryCode(item: ListRecord) {
  return valueOf(
    item.device_id ||
      item.pop_id ||
      item.project_id ||
      item.customer_number ||
      item.route_id ||
      item.pole_id ||
      item.city_code ||
      item.region_id ||
      item.id,
    "-",
  );
}

function valueOf(value: unknown, fallback = "") {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
}
