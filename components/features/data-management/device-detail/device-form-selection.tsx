import {
  type EditableForm,
  type DeviceForm,
  type RelationLabels,
  type SplitterProfileOption,
  type OdpTypeOption,
  type InstallationTypeOption,
  type TenantOption,
  type PopLookupOption,
  type ProjectLookupOption,
  type OdpFieldValidationPayload,
  type ProvinceOption,
  type CityOption,
} from "./sections/index";
import {
  type TopologyLookupData,
  emptyTopologyLookup,
} from "./sections/device-topology-helpers";
import {
  GenericDeviceForm,
  OdcDeviceForm,
  OdpDeviceForm,
  CableDeviceForm,
  OtbDeviceForm,
  type OdcDeviceFormProps,
  type OtbDeviceFormProps,
} from "./forms/index";

export type DeviceFormSelectionProps = {
  form: EditableForm;
  onChange: (next: EditableForm | ((prev: EditableForm) => EditableForm)) => void;
  editing: boolean;
  relationLabels: RelationLabels;
  relationLoading?: boolean;
  deviceTypeKey: string;
  splitterProfiles: SplitterProfileOption[];
  odpTypes: OdpTypeOption[];
  installationTypes: InstallationTypeOption[];
  tenants: TenantOption[];
  popOptions: PopLookupOption[];
  projectOptions: ProjectLookupOption[];
  projectHref?: string;
  latestFieldValidation?: OdpFieldValidationPayload | null;
  effectiveValidationStatus: string;
  provinces: ProvinceOption[];
  cities: CityOption[];
  topologyLookup?: TopologyLookupData;
  topologySummary?: Record<string, unknown> | null;
  cableTypes?: Array<{ id: string; cable_type_code: string; cable_type_name: string }>;
  routeTypes?: Array<{ id: string; route_type_code?: string | null; route_type_name: string }>;
  coreCapacities?: Array<{ core_capacity_value: number; label: string }>;
  // ODC chain summary props
  odcChainSummary?: OdcDeviceFormProps["odcChainSummary"];
  odcChainLoading?: boolean;
  onOdcChainRefresh?: () => void;
  // OTB chain summary props
  otbChainSummary?: OtbDeviceFormProps["otbChainSummary"];
  otbChainLoading?: boolean;
  onOtbChainRefresh?: () => void;
};

export function DeviceFormSelection(props: DeviceFormSelectionProps) {
  const deviceTypeKey = props.deviceTypeKey.toUpperCase();

  const topologyLookup = props.topologyLookup || emptyTopologyLookup();
  const form = props.form as DeviceForm;

  if (deviceTypeKey === "ODP") {
    return (
      <OdpDeviceForm
        form={form}
        onChange={props.onChange}
        editing={props.editing}
        relationLabels={props.relationLabels}
        relationLoading={props.relationLoading}
        splitterProfiles={props.splitterProfiles}
        tenants={props.tenants}
        popOptions={props.popOptions}
        projectOptions={props.projectOptions}
        projectHref={props.projectHref}
        effectiveValidationStatus={props.effectiveValidationStatus}
        provinces={props.provinces}
        cities={props.cities}
        odpTypes={props.odpTypes}
        installationTypes={props.installationTypes}
        latestFieldValidation={props.latestFieldValidation}
        topologyLookup={topologyLookup}
      />
    );
  }

  if (deviceTypeKey === "CABLE") {
    return (
      <CableDeviceForm
        form={form}
        onChange={props.onChange}
        editing={props.editing}
        relationLabels={props.relationLabels}
        relationLoading={props.relationLoading}
        splitterProfiles={props.splitterProfiles}
        tenants={props.tenants}
        popOptions={props.popOptions}
        projectOptions={props.projectOptions}
        projectHref={props.projectHref}
        effectiveValidationStatus={props.effectiveValidationStatus}
        provinces={props.provinces}
        cities={props.cities}
        topologyLookup={topologyLookup}
        cableTypes={props.cableTypes}
        routeTypes={props.routeTypes}
        coreCapacities={props.coreCapacities}
      />
    );
  }

  if (deviceTypeKey === "OTB") {
    return (
      <OtbDeviceForm
        form={form}
        onChange={props.onChange}
        editing={props.editing}
        relationLabels={props.relationLabels}
        relationLoading={props.relationLoading}
        splitterProfiles={props.splitterProfiles}
        tenants={props.tenants}
        popOptions={props.popOptions}
        projectOptions={props.projectOptions}
        projectHref={props.projectHref}
        effectiveValidationStatus={props.effectiveValidationStatus}
        provinces={props.provinces}
        cities={props.cities}
        topologyLookup={topologyLookup}
        otbChainSummary={props.otbChainSummary}
        otbChainLoading={props.otbChainLoading}
        onOtbChainRefresh={props.onOtbChainRefresh}
      />
    );
  }

  if (deviceTypeKey === "ODC") {
    return (
      <OdcDeviceForm
        form={form}
        onChange={props.onChange}
        editing={props.editing}
        relationLabels={props.relationLabels}
        relationLoading={props.relationLoading}
        splitterProfiles={props.splitterProfiles}
        tenants={props.tenants}
        popOptions={props.popOptions}
        projectOptions={props.projectOptions}
        projectHref={props.projectHref}
        effectiveValidationStatus={props.effectiveValidationStatus}
        provinces={props.provinces}
        cities={props.cities}
        topologyLookup={topologyLookup}
        topologySummary={props.topologySummary as any || null}
        odcChainSummary={props.odcChainSummary}
        odcChainLoading={props.odcChainLoading}
        onOdcChainRefresh={props.onOdcChainRefresh}
      />
    );
  }

  return (
    <GenericDeviceForm
      form={form}
      onChange={props.onChange}
      editing={props.editing}
      relationLabels={props.relationLabels}
      relationLoading={props.relationLoading}
      splitterProfiles={props.splitterProfiles}
      tenants={props.tenants}
      popOptions={props.popOptions}
      projectOptions={props.projectOptions}
      projectHref={props.projectHref}
      effectiveValidationStatus={props.effectiveValidationStatus}
      provinces={props.provinces}
      cities={props.cities}
      topologyLookup={topologyLookup}
    />
  );
}
