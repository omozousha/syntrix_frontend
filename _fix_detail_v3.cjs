const fs = require('fs');
let p = 'app/(app)/data-management/list/[slug]/[id]/page.tsx';
let c = fs.readFileSync(p, 'utf-8');

// Find the cableTypes fetch line
const cableLine = 'apiFetch<PaginatedResponse<{ id: string; cable_type_code: string; cable_type_name: string }>>("/cableTypes?page=1&limit=200&is_active=true", { token }),';
const instLine = 'apiFetch<PaginatedResponse<InstallationTypeOption>>("/installationTypes?page=1&limit=200&is_active=true", { token }),';

// Check if routeTypes is already between them
const betweenPattern = cableLine + '\\n          ' + instLine;
const routeTypesLine = '          apiFetch<PaginatedResponse<{ id: string; route_type_name: string }>>("/routeTypes?page=1&limit=200&is_active=true", { token }),';

if (c.includes(cableLine) && !c.includes('/routeTypes')) {
  // Add routeTypes right after cableTypes
  c = c.replace(
    cableLine + '\\n          ' + instLine,
    cableLine + '\\n' + routeTypesLine + '\\n          ' + instLine
  );
  console.log('✅ routeTypes added with \\n');
} else if (c.includes(cableLine) && c.includes('/routeTypes')) {
  console.log('✅ routeTypes already present');
} else {
  console.log('❌ cableTypes line not found');
  // Search for alternative pattern
  const idx = c.indexOf('apiFetch<PaginatedResponse<{ id: string; cable_type_code');
  if (idx >= 0) {
    console.log('Found at index ' + idx);
    console.log('Context: ' + c.substring(idx, idx + 250));
  }
}

fs.writeFileSync(p, c);
console.log('Done');
