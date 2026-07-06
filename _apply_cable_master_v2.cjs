const fs = require('fs');

// === 1. cable-device-create.tsx — Replace cableCategories with routeTypes for "Kategori Kabel" ===
let p1 = 'components/features/data-management/device-form/create/cable-device-create.tsx';
let c1 = fs.readFileSync(p1, 'utf-8');

c1 = c1.replace(
  "type CableCategoryOption = { id: string; cable_category_code: string; cable_category_name: string };\ntype CableTypeOption",
  "type CableTypeOption"
);

c1 = c1.replace(
  "  cableCategories = [],\n  cableTypes = [],",
  "  cableTypes = [],"
);

c1 = c1.replace(
  "  cableCategories?: CableCategoryOption[];\n  cableTypes?: CableTypeOption[];",
  "  cableTypes?: CableTypeOption[];"
);

c1 = c1.replace(
  "        routeTypes={routeTypes}\n        cableCategories={cableCategories}\n        cableTypes={cableTypes}",
  "        routeTypes={routeTypes}\n        cableTypes={cableTypes}"
);

// Replace the "Kategori Kabel" Combobox to use routeTypes instead of cableCategories
c1 = c1.replace(
  `      {/* Kategori Kabel — from master data */}\n      <div className="space-y-1.5">\n        <FieldLabel label="Kategori Kabel" tooltip="Kategori fungsi kabel dalam jaringan. Menentukan peran kabel di topology." />\n        <Combobox\n          value={values.cable_category || "__none__"}\n          onValueChange={(v) => onChange({ cable_category: v === "__none__" ? "" : v })}\n          options={[\n            { value: "__none__", label: "Pilih kategori kabel" },\n            ...cableCategories.map((cat) => ({\n              value: cat.cable_category_code,\n              label: cat.cable_category_name,\n            })),\n          ]}\n          placeholder="Pilih kategori kabel"\n          searchPlaceholder="Cari kategori kabel..."\n        />\n      </div>`,
  `      {/* Kategori Kabel — menggunakan route_types dari master data */}\n      <div className="space-y-1.5">\n        <FieldLabel label="Kategori Kabel (Route Type)" tooltip="Kategori fungsi kabel dalam jaringan. Menggunakan data Route Types dari master data." />\n        <Combobox\n          value={values.route_type || "__none__"}\n          onValueChange={(v) => onChange({ route_type: v === "__none__" ? "" : v })}\n          options={[\n            { value: "__none__", label: "Pilih kategori kabel" },\n            ...routeTypes.map((rt) => ({\n              value: rt.route_type_code || rt.route_type_name,\n              label: rt.route_type_code ? \`\${rt.route_type_name} (\${rt.route_type_code})\` : rt.route_type_name,\n            })),\n          ]}\n          placeholder="Pilih kategori kabel"\n          searchPlaceholder="Cari kategori kabel..."\n        />\n      </div>`
);

fs.writeFileSync(p1, c1);
console.log('1. cable-device-create.tsx ✅');

// === 2. cable-device-form.tsx — Same ===
let p2 = 'components/features/data-management/device-detail/forms/cable-device-form.tsx';
let c2 = fs.readFileSync(p2, 'utf-8');

c2 = c2.replace(
  "  cableCategories?: Array<{ id: string; cable_category_code: string; cable_category_name: string }>;\n  cableTypes?:",
  "  cableTypes?:"
);

c2 = c2.replace(
  "        cableCategories={props.cableCategories}\n        cableTypes={props.cableTypes}",
  "        cableTypes={props.cableTypes}"
);

// Replace Kategori Kabel combobox in detail form
c2 = c2.replace(
  `          <ComboboxField\n            label="Kategori Kabel"\n            value={props.form.cable_category || "__none__"}\n            onValueChange={(value) => props.onChange((prev) => ({ ...prev, cable_category: value === "__none__" ? "" : value }))}\n            disabled={!props.editing}\n            searchPlaceholder="Cari kategori kabel..."\n            options={[\n              { value: "__none__", label: "Pilih kategori kabel" },\n              ...(props.cableCategories || []).map((cat) => ({\n                value: cat.cable_category_code,\n                label: cat.cable_category_name,\n              })),\n            ]}\n          />`,
  `          <ComboboxField\n            label="Kategori Kabel (Route Type)"\n            value={props.form.route_type || "__none__"}\n            onValueChange={(value) => props.onChange((prev) => ({ ...prev, route_type: value === "__none__" ? "" : value }))}\n            disabled={!props.editing}\n            searchPlaceholder="Cari kategori kabel..."\n            options={[\n              { value: "__none__", label: "Pilih kategori kabel" },\n              ...(routeTypes || []).map((rt) => ({\n                value: rt.route_type_code || rt.route_type_name,\n                label: rt.route_type_code ? \`\${rt.route_type_name} (\${rt.route_type_code})\` : rt.route_type_name,\n              })),\n            ]}\n          />`
);

// Add routeTypes prop to the function
c2 = c2.replace(
  "  cableTypes?: Array<{ id: string; cable_type_code: string; cable_type_name: string }>;",
  "  cableTypes?: Array<{ id: string; cable_type_code: string; cable_type_name: string }>;\n  routeTypes?: Array<{ id: string; route_type_code?: string | null; route_type_name: string }>;"
);

// Add routeTypes to function parameter destructuring
c2 = c2.replace(
  "  cableTypes,",
  "  cableTypes,\n  routeTypes,"
);

// Remove the hardcoded ROUTE_TYPE_OPTIONS
c2 = c2.replace(
  "const ROUTE_TYPE_OPTIONS = [\n  { value: \"distribution\", label: \"Distribution\" },\n  { value: \"backbone\", label: \"Backbone\" },\n  { value: \"feeder\", label: \"Feeder\" },\n];\n\nexport type CableDeviceFormProps",
  "export type CableDeviceFormProps"
);

// Remove the dead comment
c2 = c2.replace(
  "// ── Cable Type Options (sementara inline, nanti dari master data) ─────────\n\n\n\n",
  ""
);

// Update Route Type combobox in detail form to use routeTypes prop
c2 = c2.replace(
  `            options={[\n              { value: "__none__", label: "Pilih tipe route" },\n              ...ROUTE_TYPE_OPTIONS,\n            ]}`,
  `            options={[\n              { value: "__none__", label: "Pilih tipe route" },\n              ...(routeTypes || []).map((rt) => ({\n                value: rt.route_type_code || rt.route_type_name,\n                label: rt.route_type_code ? \`\${rt.route_type_name} (\${rt.route_type_code})\` : rt.route_type_name,\n              })),\n            ]}`
);

fs.writeFileSync(p2, c2);
console.log('2. cable-device-form.tsx ✅');

// === 3. create-form-selection.tsx — Remove cableCategories prop ===
let p3 = 'components/features/data-management/device-form/create-form-selection.tsx';
let c3 = fs.readFileSync(p3, 'utf-8');

c3 = c3.replace(
  "type CableCategoryOption = { id: string; cable_category_code: string; cable_category_name: string };\ntype CableTypeOption",
  "type CableTypeOption"
);

c3 = c3.replace(
  "  cableCategories?: CableCategoryOption[];\n  cableTypes?: CableTypeOption[];",
  "  cableTypes?: CableTypeOption[];"
);

c3 = c3.replace(
  "  cableCategories,\n  cableTypes,",
  "  cableTypes,"
);

c3 = c3.replace(
  "        cableCategories={cableCategories}\n        cableTypes={cableTypes}",
  "        cableTypes={cableTypes}"
);

fs.writeFileSync(p3, c3);
console.log('3. create-form-selection.tsx ✅');

// === 4. device-form-selection.tsx — Remove cableCategories prop ===
let p4 = 'components/features/data-management/device-detail/device-form-selection.tsx';
let c4 = fs.readFileSync(p4, 'utf-8');

c4 = c4.replace(
  "  cableCategories?: Array<{ id: string; cable_category_code: string; cable_category_name: string }>;\n  cableTypes?:",
  "  cableTypes?:"
);

c4 = c4.replace(
  "        cableCategories={props.cableCategories}\n        cableTypes={props.cableTypes}",
  "        cableTypes={props.cableTypes}"
);

fs.writeFileSync(p4, c4);
console.log('4. device-form-selection.tsx ✅');

// === 5. device-technical-helpers.tsx — Remove cable_category from CableEditableForm ===
let p5 = 'components/features/data-management/device-detail/sections/device-technical-helpers.tsx';
let c5 = fs.readFileSync(p5, 'utf-8');

c5 = c5.replace(
  "  cable_category: string;\n  cable_type: string;",
  "  cable_type: string;"
);

fs.writeFileSync(p5, c5);
console.log('5. device-technical-helpers.tsx ✅');

// === 6. device-topology-helpers.tsx — Remove cable_category from DeviceLookupOption ===
let p6 = 'components/features/data-management/device-detail/sections/device-topology-helpers.tsx';
let c6 = fs.readFileSync(p6, 'utf-8');

c6 = c6.replace(
  "  cable_category?: string | null;",
  ""
);

fs.writeFileSync(p6, c6);
console.log('6. device-topology-helpers.tsx ✅');

// === 7. odc-topology-section.tsx — Use route_type instead of cable_category ===
let p7 = 'components/features/data-management/device-detail/forms/sections/odc-topology-section.tsx';
let c7 = fs.readFileSync(p7, 'utf-8');

c7 = c7.replace(
  `(!d.cable_category || d.cable_category === "feeder")`,
  `(!d.route_type || d.route_type === "FEEDER")`
);

fs.writeFileSync(p7, c7);
console.log('7. odc-topology-section.tsx ✅');

// === 8. odp-topology-section.tsx — Use route_type instead of cable_category ===
let p8 = 'components/features/data-management/device-detail/forms/sections/odp-topology-section.tsx';
let c8 = fs.readFileSync(p8, 'utf-8');

c8 = c8.replace(
  `(!d.cable_category || d.cable_category === "feeder")`,
  `(!d.route_type || d.route_type === "FEEDER")`
);

fs.writeFileSync(p8, c8);
console.log('8. odp-topology-section.tsx ✅');

// === 9. data-management-config.ts — Add cableTypes to DATA_CATEGORIES ===
let p9 = 'lib/data-management-config.ts';
let c9 = fs.readFileSync(p9, 'utf-8');

// Add cableTypes to the resource union type
c9 = c9.replace(
  '| "splitterProfiles"\n    | "provinces"\n    | "cities";',
  '| "splitterProfiles"\n    | "cableTypes"\n    | "provinces"\n    | "cities";'
);

// Add cableTypes category entry before master-splitter-profiles
c9 = c9.replace(
  '{ slug: "master-splitter-profiles", label: "Splitter Profiles", description: "Master rasio splitter", resource: "splitterProfiles", group: "master" },',
  '{ slug: "master-cable-types", label: "Cable Types", description: "Master tipe kabel fiber optik", resource: "cableTypes", group: "master" },\n  { slug: "master-splitter-profiles", label: "Splitter Profiles", description: "Master rasio splitter", resource: "splitterProfiles", group: "master" },'
);

fs.writeFileSync(p9, c9);
console.log('9. data-management-config.ts ✅');

console.log('\\n=== ALL DONE ===');
