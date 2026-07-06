const fs = require('fs');
let p = 'app/(app)/data-management/list/[slug]/[id]/page.tsx';
let c = fs.readFileSync(p, 'utf-8');

// The routeTypes fetch is missing from Promise.allSettled.
// Add it between cableTypes and installationTypes.
const search = 'apiFetch<PaginatedResponse<{ id: string; cable_type_code: string; cable_type_name: string }>>("/cableTypes?page=1&limit=200&is_active=true", { token }),\n          apiFetch<PaginatedResponse<InstallationTypeOption>>("/installationTypes?page=1&limit=200&is_active=true", { token }),';
const replace = 'apiFetch<PaginatedResponse<{ id: string; cable_type_code: string; cable_type_name: string }>>("/cableTypes?page=1&limit=200&is_active=true", { token }),\n          apiFetch<PaginatedResponse<{ id: string; route_type_code?: string | null; route_type_name: string }>>("/routeTypes?page=1&limit=200&is_active=true", { token }),\n          apiFetch<PaginatedResponse<InstallationTypeOption>>("/installationTypes?page=1&limit=200&is_active=true", { token }),';

if (c.includes(search)) {
  c = c.replace(search, replace);
  console.log('✅ routeTypes fetch added');
} else {
  console.log('❌ Pattern not found. Trying alternative...');
  // Try alternative pattern
  const altSearch = 'apiFetch<PaginatedResponse<{ id: string; cable_type_code: string; cable_type_name: string }>>("/cableTypes?page=1&limit=200&is_active=true", { token }),\n          apiFetch<PaginatedResponse<';
  if (c.includes(altSearch)) {
    const idx = c.indexOf(altSearch);
    const chunk = c.substring(idx, idx + 300);
    console.log('Context around cableTypes fetch:');
    console.log(chunk.substring(0, 250));
  }
}

// Also fix the error catch block - add setRouteTypes([])
const catchSearch = 'setCableTypes([]);\n        setInstallationTypes';
const catchReplace = 'setCableTypes([]);\n        setRouteTypes([]);\n        setInstallationTypes';
if (c.includes(catchSearch)) {
  c = c.replace(catchSearch, catchReplace);
  console.log('✅ setRouteTypes added to catch block');
} else {
  console.log('❌ Catch block pattern not found');
}

fs.writeFileSync(p, c);
console.log('Done');
