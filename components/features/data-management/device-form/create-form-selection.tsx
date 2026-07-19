"use client";

import {
  GenericDeviceCreate,
  OdcDeviceCreate,
  OdpDeviceCreate,
  CableDeviceCreate,
  type GenericCreateFormValues,
  type OdcCreateFormValues,
  type OdpCreateFormValues,
  type CableCreateFormValues,
} from "@/components/features/data-management/device-form/create/index";

type PopOption = { id: string; pop_name: string; pop_code: string; region_id: string };
type ProjectOption = { id: string; project_name: string; project_code?: string | null; region_id?: string | null; pop_id?: string | null };
type OdpTypeOption = { id: string; odp_type_name: string; odp_type_code?: string | null };
type InstallationTypeOption = { id: string; installation_type_name: string; installation_type_code?: string | null };
type SplitterProfileOption = { ratio_label: string; output_port_count?: number | null; allowed_device_type_keys?: string[] | null };
type ManufacturerOption = { id: string; manufacturer_name: string; manufacturer_code?: string | null };
type BrandOption = { id: string; brand_name: string; brand_code?: string | null; manufacturer_id?: string | null };
type AssetModelOption = { id: string; model_name: string; model_code?: string | null; brand_id?: string | null; manufacturer_id?: string | null };
type TenantOption = { id: string; tenant_name: string; tenant_code?: string | null };
type RouteTypeOption = { id: string; route_type_name: string; route_type_code?: string | null };

type CableTypeOption = { id: string; cable_type_code: string; cable_type_name: string };
type TopologyDeviceOption = { id: string; device_name: string; device_type_key: string };
type TopologyPortOption = { id: string; port_label?: string | null; port_index: number; status: string };
type CableConnectionDraft = { route_type: string; cable_type: string; cable_length_m: string; route_name: string };

export type CreateFormSelectionProps = {
  deviceTypeKey: string;
  values: Record<string, string>;
  pops: PopOption[];
  odpTypes: OdpTypeOption[];
  installationTypes: InstallationTypeOption[];
  tenants: TenantOption[];
  projects: ProjectOption[];
  routeTypes: RouteTypeOption[];
  cableTypes?: CableTypeOption[];
  manufacturers: ManufacturerOption[];
  brands: BrandOption[];
  assetModels: AssetModelOption[];
  topologyFrontDevices?: TopologyDeviceOption[];
  topologyRearDevices?: TopologyDeviceOption[];
  frontDevicePorts?: TopologyPortOption[];
  rearDevicePorts?: TopologyPortOption[];
  loadingTopology?: boolean;
  cableConnections?: CableConnectionDraft[];
  onCableConnectionsChange?: (next: CableConnectionDraft[]) => void;
  onChange: (patch: Record<string, string>) => void;
  onPopChange: (popId: string) => void;
};

export function CreateFormSelection({
  deviceTypeKey,
  values,
  pops,
  odpTypes,
  installationTypes,
  tenants,
  projects,
  routeTypes,
  cableTypes,
  manufacturers,
  brands,
  assetModels,
  topologyFrontDevices = [],
  topologyRearDevices = [],
  frontDevicePorts = [],
  rearDevicePorts = [],
  loadingTopology = false,
  cableConnections = [],
  onCableConnectionsChange,
  onChange,
  onPopChange,
}: CreateFormSelectionProps) {
  const dtk = deviceTypeKey.toUpperCase();

  if (dtk === "ODC") {
    return (
      <OdcDeviceCreate
        values={values as OdcCreateFormValues}
        pops={pops}
        odpTypes={odpTypes}
        installationTypes={installationTypes}
        tenants={tenants}
        projects={projects}
        routeTypes={routeTypes}
        cableTypes={cableTypes}
        manufacturers={manufacturers}
        brands={brands}
        assetModels={assetModels}
        topologyFrontDevices={topologyFrontDevices}
        topologyRearDevices={topologyRearDevices}
        frontDevicePorts={frontDevicePorts}
        rearDevicePorts={rearDevicePorts}
        loadingTopology={loadingTopology}
        cableConnections={cableConnections}
        onCableConnectionsChange={onCableConnectionsChange}
        onChange={onChange}
        onPopChange={onPopChange}
      />
    );
  }

  if (dtk === "ODP") {
    return (
      <OdpDeviceCreate
        values={values as OdpCreateFormValues}
        pops={pops}
        odpTypes={odpTypes}
        installationTypes={installationTypes}
        tenants={tenants}
        projects={projects}
        manufacturers={manufacturers}
        brands={brands}
        assetModels={assetModels}
        topologyFrontDevices={topologyFrontDevices}
        frontDevicePorts={frontDevicePorts}
        loadingTopology={loadingTopology}
        onChange={onChange}
        onPopChange={onPopChange}
      />
    );
  }

  if (dtk === "CABLE") {
    return (
      <CableDeviceCreate
        values={values as CableCreateFormValues}
        pops={pops}
        odpTypes={odpTypes}
        installationTypes={installationTypes}
        tenants={tenants}
        projects={projects}
        routeTypes={routeTypes}
        cableTypes={cableTypes}
        manufacturers={manufacturers}
        brands={brands}
        assetModels={assetModels}
        topologyFrontDevices={topologyFrontDevices}
        topologyRearDevices={topologyRearDevices}
        frontDevicePorts={frontDevicePorts}
        rearDevicePorts={rearDevicePorts}
        loadingTopology={loadingTopology}
        onChange={onChange}
        onPopChange={onPopChange}
      />
    );
  }

  // Generic fallback — OLT, ONT, SWITCH, ROUTER, JC, OTB, HH, MH, RACK, RECTIFIER, dll.
  return (
    <GenericDeviceCreate
      values={values as GenericCreateFormValues}
      pops={pops}
      odpTypes={odpTypes}
      installationTypes={installationTypes}
      tenants={tenants}
      projects={projects}
      manufacturers={manufacturers}
      brands={brands}
      assetModels={assetModels}
      topologyFrontDevices={topologyFrontDevices}
      topologyRearDevices={topologyRearDevices}
      frontDevicePorts={frontDevicePorts}
      rearDevicePorts={rearDevicePorts}
      loadingTopology={loadingTopology}
      onChange={onChange}
      onPopChange={onPopChange}
    />
  );
}
