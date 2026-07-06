const fs = require('fs');
let p = 'app/(app)/data-management/list/[slug]/[id]/page.tsx';
let c = fs.readFileSync(p, 'utf-8');

// Add routeTypes state
c = c.replace(
  'const [cableTypes, setCableTypes] = useState<Array<{ id: string; cable_type_code: string; cable_type_name: string }>>([]);\n  const [installationTypes, setInstallationTypes]',
  'const [cableTypes, setCableTypes] = useState<Array<{ id: string; cable_type_code: string; cable_type_name: string }>>([]);\n  const [routeTypes, setRouteTypes] = useState<Array<{ id: string; route_type_code?: string | null; route_type_name: string }>>([]);\n  const [installationTypes, setInstallationTypes]'
);

// Add routeTypes to Promise.allSettled destructuring
c = c.replace(
  'const [splitterResponse, odpTypesResponse, cableTypesResponse, installationTypesResponse, tenantsResponse, provincesResponse, citiesResponse]',
  'const [splitterResponse, odpTypesResponse, cableTypesResponse, routeTypesResponse, installationTypesResponse, tenantsResponse, provincesResponse, citiesResponse]'
);

// Add routeTypes fetch in Promise.allSettled
c = c.replace(
  'apiFetch<PaginatedResponse<{ id: string; cable_type_code: string; cable_type_name: string }>>("/cableTypes?page=1&limit=200&is_active=true", { token }),\n          apiFetch<PaginatedResponse<{ id: string; installation_type_code: string; installation_type_name: string }>>("/installationTypes?page=1&limit=200&is_active=true", { token }),',
  'apiFetch<PaginatedResponse<{ id: string; cable_type_code: string; cable_type_name: string }>>("/cableTypes?page=1&limit=200&is_active=true", { token }),\n          apiFetch<PaginatedResponse<{ id: string; route_type_code?: string | null; route_type_name: string }>>("/routeTypes?page=1&limit=200&is_active=true", { token }),\n          apiFetch<PaginatedResponse<{ id: string; installation_type_code: string; installation_type_name: string }>>("/installationTypes?page=1&limit=200&is_active=true", { token }),'
);

// Add setRouteTypes
c = c.replace(
  'setCableTypes(cableTypesResponse.status === "fulfilled" ? cableTypesResponse.value.data || [] : []);\n        setInstallationTypes(',
  'setCableTypes(cableTypesResponse.status === "fulfilled" ? cableTypesResponse.value.data || [] : []);\n        setRouteTypes(routeTypesResponse.status === "fulfilled" ? routeTypesResponse.value.data || [] : []);\n        setInstallationTypes('
);

// Add routeTypes to error catch cleanup
c = c.replace(
  'setCableTypes([]);\n        setInstallationTypes',
  'setCableTypes([]);\n        setRouteTypes([]);\n        setInstallationTypes'
);

// Add routeTypes to DeviceFormSelection props
c = c.replace(
  'cableTypes={cableTypes}\n      />',
  'cableTypes={cableTypes}\n        routeTypes={routeTypes}\n      />'
);

fs.writeFileSync(p, c);
console.log('✅ detail page fixed');
