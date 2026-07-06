const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'app/(app)/data-management/list/[slug]/[id]/page.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

// Find and replace the cableTypes API call to add routeTypes right after
const oldPattern = 'apiFetch<PaginatedResponse<{ id: string; cable_type_code: string; cable_type_name: string }>>("/cableTypes?page=1&limit=200&is_active=true", { token }),\n          apiFetch<PaginatedResponse<InstallationTypeOption>>("/installationTypes?page=1&limit=200&is_active=true", { token }),';

const newPattern = 'apiFetch<PaginatedResponse<{ id: string; cable_type_code: string; cable_type_name: string }>>("/cableTypes?page=1&limit=200&is_active=true", { token }),\n          apiFetch<PaginatedResponse<{ id: string; route_type_code: string; route_type_name: string }>>("/routeTypes?page=1&limit=200&is_active=true", { token }),\n          apiFetch<PaginatedResponse<InstallationTypeOption>>("/installationTypes?page=1&limit=200&is_active=true", { token }),';

if (content.includes(oldPattern)) {
  content = content.replace(oldPattern, newPattern);
  console.log('✅ Route types API call added successfully');
} else {
  console.log('❌ Pattern not found with \\n. Trying \\r\\n variant...');
  const oldPatternCRLF = oldPattern.replace(/\n/g, '\r\n');
  const newPatternCRLF = newPattern.replace(/\n/g, '\r\n');
  if (content.includes(oldPatternCRLF)) {
    content = content.replace(oldPatternCRLF, newPatternCRLF);
    console.log('✅ Route types API call added with CRLF');
  } else {
    console.log('❌ Pattern not found with either line ending variant');
    // Try to find the cableTypes line
    const cableTypesIdx = content.indexOf('"/cableTypes?');
    if (cableTypesIdx >= 0) {
      const context = content.substring(cableTypesIdx, cableTypesIdx + 300);
      console.log('Context around cableTypes:');
      console.log(JSON.stringify(context));
    }
  }
}

fs.writeFileSync(filePath, content, 'utf-8');
console.log('✅ File saved');
