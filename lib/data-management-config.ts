export type DataCategory = {
  slug: string;
  label: string;
  description: string;
  resource:
    | "pops"
    | "devices"
    | "poles"
    | "customers"
    | "routes"
    | "projects"
    | "regions"
    | "deviceTypes"
    | "popTypes"
    | "manufacturers"
    | "brands"
    | "assetModels"
    | "splitterProfiles"
    | "provinces"
    | "cities";
  deviceTypeKey?: string;
  group?: "asset" | "master";
};

export const DATA_CATEGORIES: DataCategory[] = [
  { slug: "pop", label: "POP", description: "Point of Presence", resource: "pops", group: "asset" },
  { slug: "olt", label: "OLT", description: "Optical Line Terminal", resource: "devices", deviceTypeKey: "OLT", group: "asset" },
  { slug: "switch", label: "Switch", description: "Network switch asset", resource: "devices", deviceTypeKey: "SWITCH", group: "asset" },
  { slug: "router", label: "Router", description: "Routing device asset", resource: "devices", deviceTypeKey: "ROUTER", group: "asset" },
  { slug: "ont", label: "ONT", description: "Optical Network Terminal", resource: "devices", deviceTypeKey: "ONT", group: "asset" },
  { slug: "otb", label: "OTB", description: "Optical Termination Box", resource: "devices", deviceTypeKey: "OTB", group: "asset" },
  { slug: "jc", label: "JC", description: "Joint Closure asset", resource: "devices", deviceTypeKey: "JC", group: "asset" },
  { slug: "odc", label: "ODC", description: "Optical Distribution Cabinet", resource: "devices", deviceTypeKey: "ODC", group: "asset" },
  { slug: "odp", label: "ODP", description: "Optical Distribution Point", resource: "devices", deviceTypeKey: "ODP", group: "asset" },
  { slug: "cable", label: "Cable", description: "Fiber cable asset", resource: "devices", deviceTypeKey: "CABLE", group: "asset" },
  { slug: "pole", label: "Pole", description: "Tiang jaringan", resource: "poles", group: "asset" },
  { slug: "customer", label: "Customer", description: "Pelanggan dan titik layanan", resource: "customers", group: "asset" },
  { slug: "route", label: "Route", description: "Jalur jaringan", resource: "routes", group: "asset" },
  { slug: "projects", label: "Projects", description: "Proyek aktif dan arsip", resource: "projects", group: "asset" },

  { slug: "master-regions", label: "Regions", description: "Master region", resource: "regions", group: "master" },
  { slug: "master-device-types", label: "Device Types", description: "Master tipe perangkat", resource: "deviceTypes", group: "master" },
  { slug: "master-pop-types", label: "POP Types", description: "Master tipe POP", resource: "popTypes", group: "master" },
  { slug: "master-manufacturers", label: "Manufacturers", description: "Master manufacturer", resource: "manufacturers", group: "master" },
  { slug: "master-brands", label: "Brands", description: "Master brand", resource: "brands", group: "master" },
  { slug: "master-models", label: "Models", description: "Master model perangkat", resource: "assetModels", group: "master" },
  { slug: "master-splitter-profiles", label: "Splitter Profiles", description: "Master rasio splitter", resource: "splitterProfiles", group: "master" },
  { slug: "master-provinces", label: "Provinces", description: "Master provinsi", resource: "provinces", group: "master" },
  { slug: "master-cities", label: "Cities", description: "Master kota/kabupaten", resource: "cities", group: "master" },
];

export const ASSET_DATA_CATEGORIES = DATA_CATEGORIES.filter((item) => item.group !== "master");
export const MASTER_DATA_CATEGORIES = DATA_CATEGORIES.filter((item) => item.group === "master");

export function getCategoryBySlug(slug: string) {
  const found = DATA_CATEGORIES.find((item) => item.slug === slug);
  if (found) return found;

  // Fallback for dynamic device types stored in device_type_catalog.
  // Example: `xgspon` => device_type_key `XGSPON`
  if (!slug.startsWith("master-") && slug !== "pop" && slug !== "pole" && slug !== "customer" && slug !== "route" && slug !== "projects") {
    const normalized = slug.trim().replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "");
    if (normalized) {
      const label = normalized
        .split("_")
        .filter(Boolean)
        .map((part) => (part.length <= 3 ? part.toUpperCase() : part[0].toUpperCase() + part.slice(1).toLowerCase()))
        .join(" ");
      return {
        slug,
        label: label || slug.toUpperCase(),
        description: "Dynamic device type",
        resource: "devices",
        deviceTypeKey: normalized.toUpperCase(),
        group: "asset",
      } as DataCategory;
    }
  }

  return null;
}

export function buildCategoryApiPath(
  category: DataCategory,
  options?: {
    page?: number;
    limit?: number;
    q?: string;
    regionScopeId?: string;
  },
) {
  const query = new URLSearchParams();
  query.set("page", String(options?.page ?? 1));
  query.set("limit", String(options?.limit ?? 20));

  if (options?.q?.trim()) query.set("q", options.q.trim());
  if (options?.regionScopeId) query.set("region_id", options.regionScopeId);
  if (category.deviceTypeKey) query.set("device_type_key", category.deviceTypeKey);

  return `/${category.resource}?${query.toString()}`;
}
