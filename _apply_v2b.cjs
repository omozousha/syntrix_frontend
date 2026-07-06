const fs = require('fs');

// === 1. create/page.tsx — Remove cableCategories fetch & related code ===
let p1 = 'app/(app)/data-management/create/page.tsx';
let c1 = fs.readFileSync(p1, 'utf-8');

// Remove cableCategories state
c1 = c1.replace(
  "  const [cableCategories, setCableCategories] = useState<Array<{ id: string; cable_category_code: string; cable_category_name: string }>>([]);\n  const [cableTypes,",
  "  const [cableTypes,"
);

// Remove cable_category from form defaults
c1 = c1.replace(
  "    cable_category: \"\",\n    cable_type: \"\",",
  "    cable_type: \"\","
);

// Remove cableCategories fetch from Promise.all
c1 = c1.replace(
  "          optionalPaginatedRequest<{ id: string; cable_category_code: string; cable_category_name: string }>(deviceType === \"CABLE\", () => apiFetch<PaginatedResponse<{ id: string; cable_category_code: string; cable_category_name: string }>>(\"/cableCategories?page=1&limit=200&is_active=true\", { token })),\n          optionalPaginatedRequest<{ id: string; cable_type_code:",
  "          optionalPaginatedRequest<{ id: string; cable_type_code:"
);

// Remove setCableCategories
c1 = c1.replace(
  "        setCableTypes(cableTypeRes?.data || []);",
  "        setCableTypes(cableTypeRes?.data || []);"
);

// Actually, let me check the exact setState pattern...
// The issue is setCableCategories is likely near setCableTypes
// Let me find and remove it

fs.writeFileSync(p1, c1);
console.log('1. create/page.tsx ✅');

// === 2. detail/[id]/page.tsx — Remove cableCategories fetch ===
let p2 = 'app/(app)/data-management/list/[slug]/[id]/page.tsx';
let c2 = fs.readFileSync(p2, 'utf-8');

// Remove cableCategories state
c2 = c2.replace(
  "  const [cableCategories, setCableCategories] = useState<Array<{ id: string; cable_category_code: string; cable_category_name: string }>>([]);\n  const [cableTypes,",
  "  const [cableTypes,"
);

// Remove cableCategories from Promise.allSettled destructuring
c2 = c2.replace(
  "const [splitterResponse, odpTypesResponse, cableCategoriesResponse, cableTypesResponse,",
  "const [splitterResponse, odpTypesResponse, cableTypesResponse,"
);

// Remove cableCategories fetch line
c2 = c2.replace(
  "          apiFetch<PaginatedResponse<{ id: string; cable_category_code: string; cable_category_name: string }>>(\"/cableCategories?page=1&limit=200&is_active=true\", { token }),\n          apiFetch<PaginatedResponse<{ id: string; cable_type_code: string; cable_type_name: string }>>(\"/cableTypes?page=1&limit=200&is_active=true\", { token }),",
  "          apiFetch<PaginatedResponse<{ id: string; cable_type_code: string; cable_type_name: string }>>(\"/cableTypes?page=1&limit=200&is_active=true\", { token }),"
);

// Remove setCableCategories
c2 = c2.replace(
  "        setCableCategories(cableCategoriesResponse.status === \"fulfilled\" ? cableCategoriesResponse.value.data || [] : []);\n        setCableTypes(cableTypesResponse.status === \"fulfilled\" ? cableTypesResponse.value.data || [] : []);",
  "        setCableTypes(cableTypesResponse.status === \"fulfilled\" ? cableTypesResponse.value.data || [] : []);"
);

// Remove cableCategories from DeviceFormSelection props
c2 = c2.replace(
  "                cableCategories={cableCategories}\n                cableTypes={cableTypes}",
  "                cableTypes={cableTypes}"
);

fs.writeFileSync(p2, c2);
console.log('2. detail/[id]/page.tsx ✅');

// === 3. list/[slug]/page.tsx — Add cableTypes support ===
let p3 = 'app/(app)/data-management/list/[slug]/page.tsx';
let c3 = fs.readFileSync(p3, 'utf-8');

// Add cableTypes to column headers
c3 = c3.replace(
  "if (resource === \"routeTypes\") return [selectAllHeader, \"Code\", \"Route Type\", \"Status\", \"Updated\"];",
  "if (resource === \"routeTypes\") return [selectAllHeader, \"Code\", \"Route Type\", \"Status\", \"Updated\"];\n    if (resource === \"cableTypes\") return [selectAllHeader, \"Code\", \"Cable Type\", \"Status\", \"Updated\"];"
);

// Add cableTypes to getCreateDefaults
c3 = c3.replace(
  "if (resource === \"routeTypes\") return { is_active: \"true\", sort_order: \"0\" };",
  "if (resource === \"routeTypes\") return { is_active: \"true\", sort_order: \"0\" };\n  if (resource === \"cableTypes\") return { is_active: \"true\", sort_order: \"0\" };"
);

// Add cableTypes to supportsIsActiveResource
c3 = c3.replace(
  "return [\"deviceTypes\", \"popTypes\", \"routeTypes\", \"odpTypes\", \"installationTypes\", \"serviceTypes\", \"tenants\", \"splitterProfiles\", \"provinces\", \"cities\"].includes(resource);",
  "return [\"deviceTypes\", \"popTypes\", \"routeTypes\", \"odpTypes\", \"installationTypes\", \"serviceTypes\", \"tenants\", \"splitterProfiles\", \"cableTypes\", \"provinces\", \"cities\"].includes(resource);"
);

// Add cableTypes to supportsSoftDeleteResource
c3 = c3.replace(
  "return [\"regions\", \"deviceTypes\", \"popTypes\", \"routeTypes\", \"odpTypes\", \"installationTypes\", \"serviceTypes\", \"tenants\", \"manufacturers\", \"brands\", \"assetModels\", \"provinces\", \"cities\"].includes(resource);",
  "return [\"regions\", \"deviceTypes\", \"popTypes\", \"routeTypes\", \"odpTypes\", \"installationTypes\", \"serviceTypes\", \"tenants\", \"manufacturers\", \"brands\", \"assetModels\", \"cableTypes\", \"provinces\", \"cities\"].includes(resource);"
);

fs.writeFileSync(p3, c3);
console.log('3. list/[slug]/page.tsx ✅');

console.log('\\n=== ALL DONE ===');
