import fs from 'fs';

// 1. CableDeviceForm - remove dead comments
let p = 'components/features/data-management/device-detail/forms/cable-device-form.tsx';
let c = fs.readFileSync(p, 'utf-8');
c = c.replace(
  '// CABLE_CATEGORY_OPTIONS sekarang dari master data via props\n\n',
  '\n'
);
c = c.replace(
  '// CABLE_TYPE_OPTIONS sekarang dari master data via props\n\n',
  '\n'
);
fs.writeFileSync(p, c);
console.log('1. Cleaned CableDeviceForm');

// 2. Detail page - remove .catch() from cableCategories fetch
let p2 = 'app/(app)/data-management/list/[slug]/[id]/page.tsx';
let c2 = fs.readFileSync(p2, 'utf-8');
c2 = c2.replace(
  '.catch(() => ({ data: [] })),\n          apiFetch<PaginatedResponse<{ id: string; cable_type_code: string; cable_type_name: string }>>("/cableTypes?page=1&limit=200&is_active=true", { token }).catch(() => ({ data: [] })),',
  ',\n          apiFetch<PaginatedResponse<{ id: string; cable_type_code: string; cable_type_name: string }>>("/cableTypes?page=1&limit=200&is_active=true", { token }),'
);
fs.writeFileSync(p2, c2);
console.log('2. Cleaned detail page');

console.log('Done');
