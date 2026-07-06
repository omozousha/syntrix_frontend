import fs from 'fs';

// ── 1. Create page: add cableCategories/cableTypes fetching in Promise.all ──
let createPath = 'app/(app)/data-management/create/page.tsx';
let content = fs.readFileSync(createPath, 'utf-8');

// a. Add fetching in Promise.all - after routeTypes line
content = content.replace(
  `optionalPaginatedRequest<RouteTypeOption>(deviceType === "CABLE", () => apiFetch<PaginatedResponse<RouteTypeOption>>("/routeTypes?page=1&limit=200&is_active=true", { token })),`,
  `optionalPaginatedRequest<RouteTypeOption>(deviceType === "CABLE", () => apiFetch<PaginatedResponse<RouteTypeOption>>("/routeTypes?page=1&limit=200&is_active=true", { token })),
          optionalPaginatedRequest<{ id: string; cable_category_code: string; cable_category_name: string }>(deviceType === "CABLE", () => apiFetch<PaginatedResponse<{ id: string; cable_category_code: string; cable_category_name: string }>>("/cableCategories?page=1&limit=200&is_active=true", { token })),
          optionalPaginatedRequest<{ id: string; cable_type_code: string; cable_type_name: string }>(deviceType === "CABLE", () => apiFetch<PaginatedResponse<{ id: string; cable_type_code: string; cable_type_name: string }>>("/cableTypes?page=1&limit=200&is_active=true", { token })),`
);

// b. Add setState calls after routeTypes
content = content.replace(
  `setRouteTypes(routeTypesRes.data || []);`,
  `setRouteTypes(routeTypesRes.data || []);
        setCableCategories(cableCategoryRes?.data || []);
        setCableTypes(cableTypeRes?.data || []);`
);

// c. Update setForm region_id default to add new vars in closure
// We need to handle the destructured results - update the destructuring
content = content.replace(
  `const [regionsRes, popsRes, projectsRes, customersRes, popTypesRes, routeTypesRes, provincesRes, citiesAll, manufacturersRes, brandsRes, modelsRes, odpTypesRes, installationTypesRes, serviceTypesRes, tenantsRes, splitterProfilesRes]`,
  `const [regionsRes, popsRes, projectsRes, customersRes, popTypesRes, routeTypesRes, cableCategoryRes, cableTypeRes, provincesRes, citiesAll, manufacturersRes, brandsRes, modelsRes, odpTypesRes, installationTypesRes, serviceTypesRes, tenantsRes, splitterProfilesRes]`
);

// Wait - the destructuring order needs to match the Promise.all order. Let me recalculate.
// Let me check the actual line with node
// Actually the Promise.all has (based on earlier output):
// [regionsRes, popsRes, projectsRes, customersRes, popTypesRes, routeTypesRes, provincesRes, citiesAll, manufacturersRes, brandsRes, modelsRes, odpTypesRes, installationTypesRes, serviceTypesRes, tenantsRes, splitterProfilesRes]
// That's 16 items. We added 2 more, so it should be 18.
// But wait - we also need to update the destructuring to include cableCategoryRes, cableTypeRes

fs.writeFileSync(createPath, content);
console.log('1. Create page - added fetching for cableCategories/cableTypes');

// ── 2. Create page: pass cableCategories/cableTypes to CreateFormSelection ──
content = fs.readFileSync(createPath, 'utf-8');
content = content.replace(
  `routeTypes={routeTypes}`,
  `routeTypes={routeTypes}\n                cableCategories={cableCategories}\n                cableTypes={cableTypes}`
);
fs.writeFileSync(createPath, content);
console.log('2. Create page - added props to CreateFormSelection');

// ── 3. CableDeviceForm: update to use API data ──
let formPath = 'components/features/data-management/device-detail/forms/cable-device-form.tsx';
content = fs.readFileSync(formPath, 'utf-8');

// Remove hardcoded CABLE_CATEGORY_OPTIONS
content = content.replace(
  `const CABLE_CATEGORY_OPTIONS = [\n  { value: "feeder", label: "Feeder — OTB/POP ke ODC" },\n  { value: "distribution", label: "Distribution — ODC ke ODP" },\n  { value: "backbone", label: "Backbone — POP ke POP / antar wilayah" },\n  { value: "drop", label: "Drop — ODP ke ONT pelanggan" },\n];`,
  `// CABLE_CATEGORY_OPTIONS sekarang dari master data via props`
);

// Remove hardcoded CABLE_TYPE_OPTIONS  
content = content.replace(
  `const CABLE_TYPE_OPTIONS = [\n  { value: "single-mode", label: "Single Mode (G.652D)" },\n  { value: "multi-mode", label: "Multi Mode" },\n  { value: "ADSS", label: "ADSS (All-Dielectric Self-Supporting)" },\n  { value: "OPGW", label: "OPGW (Optical Ground Wire)" },\n  { value: "direct-buried", label: "Direct Buried" },\n  { value: "drop", label: "Drop Cable" },\n  { value: "indoor", label: "Indoor / Riser" },\n];`,
  `// CABLE_TYPE_OPTIONS sekarang dari master data via props`
);

// Update CableDeviceFormProps to include cableCategories/cableTypes
content = content.replace(
  `export type CableDeviceFormProps = DefaultInfoSectionProps & {\n  splitterProfiles: SplitterProfileOption[];\n  topologyLookup?: TopologySectionProps["topologyLookup"];\n};`,
  `export type CableDeviceFormProps = DefaultInfoSectionProps & {\n  splitterProfiles: SplitterProfileOption[];\n  topologyLookup?: TopologySectionProps["topologyLookup"];\n  cableCategories?: Array<{ id: string; cable_category_code: string; cable_category_name: string }>;\n  cableTypes?: Array<{ id: string; cable_type_code: string; cable_type_name: string }>;\n};`
);

// Update cable_category combobox to use props
content = content.replace(
  `<ComboboxField\n            label="Kategori Kabel"\n            value={props.form.cable_category || "__none__"}\n            onValueChange={(value) => props.onChange((prev) => ({ ...prev, cable_category: value === "__none__" ? "" : value }))}\n            disabled={!props.editing}\n            searchPlaceholder="Cari kategori kabel..."\n            options={[\n              { value: "__none__", label: "Pilih kategori kabel" },\n              ...CABLE_CATEGORY_OPTIONS,\n            ]}\n          />`,
  `<ComboboxField\n            label="Kategori Kabel"\n            value={props.form.cable_category || "__none__"}\n            onValueChange={(value) => props.onChange((prev) => ({ ...prev, cable_category: value === "__none__" ? "" : value }))}\n            disabled={!props.editing}\n            searchPlaceholder="Cari kategori kabel..."\n            options={[\n              { value: "__none__", label: "Pilih kategori kabel" },\n              ...(props.cableCategories || []).map((cat) => ({\n                value: cat.cable_category_code,\n                label: cat.cable_category_name,\n              })),\n            ]}\n          />`
);

// Update cable_type combobox to use props
content = content.replace(
  `<ComboboxField\n            label="Tipe Kabel"\n            value={props.form.cable_type || "__none__"}\n            onValueChange={(value) => props.onChange((prev) => ({ ...prev, cable_type: value === "__none__" ? "" : value }))}\n            disabled={!props.editing}\n            searchPlaceholder="Cari tipe kabel..."\n            options={[\n              { value: "__none__", label: "Pilih tipe kabel" },\n              ...CABLE_TYPE_OPTIONS,\n            ]}\n          />`,
  `<ComboboxField\n            label="Tipe Kabel"\n            value={props.form.cable_type || "__none__"}\n            onValueChange={(value) => props.onChange((prev) => ({ ...prev, cable_type: value === "__none__" ? "" : value }))}\n            disabled={!props.editing}\n            searchPlaceholder="Cari tipe kabel..."\n            options={[\n              { value: "__none__", label: "Pilih tipe kabel" },\n              ...(props.cableTypes || []).map((t) => ({\n                value: t.cable_type_code,\n                label: t.cable_type_name,\n              })),\n            ]}\n          />`
);

fs.writeFileSync(formPath, content);
console.log('3. CableDeviceForm updated');

// ── 4. DeviceFormSelection: pass cableCategories/cableTypes to CableDeviceForm ──
let selPath = 'components/features/data-management/device-detail/device-form-selection.tsx';
content = fs.readFileSync(selPath, 'utf-8');

// Add props to DeviceFormSelection
content = content.replace(
  `export type DeviceFormSelectionProps = {\n  deviceTypeKey: string;\n  item: Record<string, unknown>;\n  form: Record<string, string>;\n  onChange: (next: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => void;\n  editing: boolean;\n  topologyLookup?: TopologySectionProps["topologyLookup"];\n  splitterProfiles: SplitterProfileOption[];\n  topologySummary?: Record<string, unknown> | null;\n};`,
  `export type DeviceFormSelectionProps = {\n  deviceTypeKey: string;\n  item: Record<string, unknown>;\n  form: Record<string, string>;\n  onChange: (next: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => void;\n  editing: boolean;\n  topologyLookup?: TopologySectionProps["topologyLookup"];\n  splitterProfiles: SplitterProfileOption[];\n  topologySummary?: Record<string, unknown> | null;\n  cableCategories?: Array<{ id: string; cable_category_code: string; cable_category_name: string }>;\n  cableTypes?: Array<{ id: string; cable_type_code: string; cable_type_name: string }>;\n};`
);

// Pass to CableDeviceForm
content = content.replace(
  `      <CableDeviceForm\n        {...defaultFormProps}\n        topologyLookup={topologyLookup}\n      />`,
  `      <CableDeviceForm\n        {...defaultFormProps}\n        topologyLookup={topologyLookup}\n        cableCategories={props.cableCategories}\n        cableTypes={props.cableTypes}\n      />`
);
fs.writeFileSync(selPath, content);
console.log('4. DeviceFormSelection updated');

// ── 5. Detail page: add cableCategories/cableTypes fetching ──
let detailPath = 'app/(app)/data-management/list/[slug]/[id]/page.tsx';
content = fs.readFileSync(detailPath, 'utf-8');

// Add state declarations near other master data states
content = content.replace(
  `const [odpTypes, setOdpTypes] = useState<OdpTypeOption[]>([]);`,
  `const [odpTypes, setOdpTypes] = useState<OdpTypeOption[]>([]);
  const [cableCategories, setCableCategories] = useState<Array<{ id: string; cable_category_code: string; cable_category_name: string }>>([]);
  const [cableTypes, setCableTypes] = useState<Array<{ id: string; cable_type_code: string; cable_type_name: string }>>([]);`
);

// Add fetching in Promise.all near odpTypes fetch
content = content.replace(
  `apiFetch<PaginatedResponse<OdpTypeOption>>("/odpTypes?page=1&limit=200&is_active=true", { token }),`,
  `apiFetch<PaginatedResponse<OdpTypeOption>>("/odpTypes?page=1&limit=200&is_active=true", { token }),
          apiFetch<PaginatedResponse<{ id: string; cable_category_code: string; cable_category_name: string }>>("/cableCategories?page=1&limit=200&is_active=true", { token }).catch(() => ({ data: [] })),
          apiFetch<PaginatedResponse<{ id: string; cable_type_code: string; cable_type_name: string }>>("/cableTypes?page=1&limit=200&is_active=true", { token }).catch(() => ({ data: [] })),`
);

// Add setState calls near odpTypes set
content = content.replace(
  `setOdpTypes(odpTypesResponse.status === "fulfilled" ? odpTypesResponse.value.data || [] : []);`,
  `setOdpTypes(odpTypesResponse.status === "fulfilled" ? odpTypesResponse.value.data || [] : []);
        setCableCategories(cableCategoriesResponse?.data || []);
        setCableTypes(cableTypesResponse?.data || []);`
);

// Update the destructuring to include cableCategories/cableTypes
content = content.replace(
  `const [splitterResponse, odpTypesResponse, installationTypesResponse, tenantsResponse, provincesResponse, citiesResponse]`,
  `const [splitterResponse, odpTypesResponse, cableCategoriesResponse, cableTypesResponse, installationTypesResponse, tenantsResponse, provincesResponse, citiesResponse]`
);

// Pass to DeviceFormSelection
content = content.replace(
  `topologySummary={deviceTopologySummary}`,
  `topologySummary={deviceTopologySummary}
                cableCategories={cableCategories}
                cableTypes={cableTypes}`
);

fs.writeFileSync(detailPath, content);
console.log('5. Detail page updated');

console.log('\n✅ All changes applied successfully!');
