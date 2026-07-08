"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppLoading } from "@/components/app-loading-new";
import { useSession } from "@/components/session-context";
import {
  CreateFormCardHeader,
  CreateFormPageHeader,
} from "@/components/features/data-management/device-form/create-form-chrome";
import { CreateFormStatusAlerts } from "@/components/features/data-management/device-form/create-form-status-alerts";
import {
  CreateApprovalDialog,
  CreateResponseDialog,
  type CreateApprovalNotice,
  type CreateResponseDialogState,
} from "@/components/features/data-management/device-form/create-submit-dialog";
import { CustomerCreateForm } from "@/components/features/data-management/device-form/customer-create-form";
import { CreateLocationFields } from "@/components/features/data-management/device-form/create-location-fields";
import { CreateOperationalFields } from "@/components/features/data-management/device-form/create-operational-fields";
import { CreateFormSelection } from "@/components/features/data-management/device-form/create-form-selection";
import { CreateStickyFooter } from "@/components/features/data-management/device-form/create-sticky-footer";
import {
  ImageAttachmentField,
  SupportDocumentField,
} from "@/components/features/data-management/device-form/media-attachment-fields";
import {
  PopCreateIdentityFields,
  PopCreateOperationalFields,
} from "@/components/features/data-management/device-form/pop-create-form";
import { ProjectCreateForm } from "@/components/features/data-management/device-form/project-create-form";
import {
  AutoFilledBadge,
  Field,
  FieldLabel,
} from "@/components/features/data-management/device-form/form-field-grid";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch, type PaginatedResponse, type RegionsListResponse } from "@/lib/api";
import { deviceTypeKeyToSlug } from "@/lib/data-management-config";
import { normalizeDeviceName, normalizePopName } from "@/lib/name-normalization";

type PopOption = {
  id: string;
  pop_name: string;
  pop_code: string;
  region_id: string;
  address?: string | null;
  city?: string | null;
  city_id?: string | null;
  province?: string | null;
  province_id?: string | null;
  longitude?: number | string | null;
  latitude?: number | string | null;
};
type ProjectOption = {
  id: string;
  project_name: string;
  project_code?: string | null;
  region_id?: string | null;
  pop_id?: string | null;
};
type CustomerOption = {
  id: string;
  customer_name: string;
  customer_id?: string | null;
  customer_number?: string | null;
  region_id?: string | null;
  pop_id?: string | null;
  project_id?: string | null;
  address?: string | null;
  province?: string | null;
  province_id?: string | null;
  city?: string | null;
  city_id?: string | null;
  longitude?: number | string | null;
  latitude?: number | string | null;
  installation_date?: string | null;
  status?: string | null;
};
type PopTypeOption = { id: string; pop_type_name: string; pop_type_code?: string | null };
type RouteTypeOption = { id: string; route_type_name: string; route_type_code?: string | null };
type ProvinceOption = { id: string; province_name: string };
type CityOption = { id: string; city_name: string; province_id?: string | null };
type ManufacturerOption = { id: string; manufacturer_name: string; manufacturer_code?: string | null };
type BrandOption = { id: string; brand_name: string; brand_code?: string | null; manufacturer_id?: string | null };
type AssetModelOption = {
  id: string;
  model_name: string;
  model_code?: string | null;
  brand_id?: string | null;
  manufacturer_id?: string | null;
};
type OdpTypeOption = { id: string; odp_type_name: string; odp_type_code?: string | null };
type InstallationTypeOption = { id: string; installation_type_name: string; installation_type_code?: string | null };
type ServiceTypeOption = { id: string; service_type_name: string; service_type_code?: string | null };
type TenantOption = { id: string; tenant_name: string; tenant_code?: string | null };
type SplitterProfileOption = {
  id: string;
  ratio_label: string;
  output_port_count?: number | null;
  allowed_device_type_keys?: string[] | null;
  is_active?: boolean | null;
};
type ApprovalResponse = {
  approval_request?: {
    request_id?: string | null;
    id?: string | null;
  } | null;
};

type CustomFieldDefinition = {
  id: string;
  entity_type: "pop" | "device";
  region_id: string | null;
  device_type_key: string | null;
  pop_type: string | null;
  field_key: string;
  field_label: string;
  field_type: "text" | "textarea" | "number" | "boolean" | "date" | "datetime" | "select" | "multiselect" | "json";
  options: unknown;
  is_required: boolean;
  layout_span: number;
  sort_order: number;
  help_text: string | null;
  default_value: unknown;
  is_active: boolean;
};

const CORE_TYPES = new Set(["OTB", "ODC", "JC", "CABLE"]);
const PORT_TYPES = new Set(["OLT", "ODC", "SWITCH", "ROUTER", "ONT", "ODP"]);
const PASSIVE_TYPES = new Set(["OTB", "ODC", "JC", "ODP", "CABLE"]);
const MAX_IMAGE_ATTACHMENTS = 10;
const MAX_IMAGE_FILE_SIZE_BYTES = 5 * 1024 * 1024;

function emptyPaginatedResponse<T>(): PaginatedResponse<T> {
  return {
    success: true,
    message: "",
    data: [],
  };
}

function optionalPaginatedRequest<T>(
  enabled: boolean,
  request: () => Promise<PaginatedResponse<T>>,
): Promise<PaginatedResponse<T>> {
  if (!enabled) return Promise.resolve(emptyPaginatedResponse<T>());
  return request().catch(() => emptyPaginatedResponse<T>());
}

function toOptions(
  items: Array<{ value: string; label: string }>,
): ComboboxOption[] {
  return items.map((item) => ({ value: item.value, label: item.label }));
}

export default function CreateDataManagementPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { token, me } = useSession();

  const kind = (params.get("kind") || "device").toLowerCase();
  const selectedType = (params.get("type") || "OLT").toUpperCase();
  const deviceType = selectedType || "OLT";
  const isPop = kind === "pop";
  const isProject = kind === "project";
  const isCustomer = kind === "customer";
  const isDevice = !isPop && !isProject && !isCustomer;

  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const submitLockRef = useRef(false);
  const [approvalNotice, setApprovalNotice] = useState<CreateApprovalNotice | null>(null);
  const [createResponseDialog, setCreateResponseDialog] = useState<CreateResponseDialogState | null>(null);

  const [regions, setRegions] = useState<RegionsListResponse["data"]>([]);
  const [pops, setPops] = useState<PopOption[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
    const [activeTab, setActiveTab] = useState("identitas");
  const [missingTabFields, setMissingTabFields] = useState<Record<string, string[]>>({});
  const [autoFillNotice, setAutoFillNotice] = useState("");
  const [popTypes, setPopTypes] = useState<PopTypeOption[]>([]);
  const [routeTypes, setRouteTypes] = useState<RouteTypeOption[]>([]);
  const [cableTypes, setCableTypes] = useState<Array<{ id: string; cable_type_code: string; cable_type_name: string }>>([]);
  const [coreCapacities, setCoreCapacities] = useState<Array<{ core_capacity_value: number; label: string; allowed_route_type_keys?: string[] | null }>>([]);
  const [deviceCoreCapacities, setDeviceCoreCapacities] = useState<Array<{ core_capacity_value: number; label: string; allowed_device_type_keys?: string[] | null }>>([]);
  const [provinces, setProvinces] = useState<ProvinceOption[]>([]);
  const [cities, setCities] = useState<CityOption[]>([]);
  const [manufacturers, setManufacturers] = useState<ManufacturerOption[]>([]);
  const [brands, setBrands] = useState<BrandOption[]>([]);
  const [assetModels, setAssetModels] = useState<AssetModelOption[]>([]);
  const [odpTypes, setOdpTypes] = useState<OdpTypeOption[]>([]);
  const [installationTypes, setInstallationTypes] = useState<InstallationTypeOption[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceTypeOption[]>([]);
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [splitterProfiles, setSplitterProfiles] = useState<SplitterProfileOption[]>([]);
  const [topologyFrontDevices, setTopologyFrontDevices] = useState<Array<{ id: string; device_name: string; device_type_key: string }>>([]);
  const [topologyRearDevices, setTopologyRearDevices] = useState<Array<{ id: string; device_name: string; device_type_key: string }>>([]);
  const [frontDevicePorts, setFrontDevicePorts] = useState<Array<{ id: string; port_label?: string | null; port_index: number; status: string }>>([]);
  const [rearDevicePorts, setRearDevicePorts] = useState<Array<{ id: string; port_label?: string | null; port_index: number; status: string }>>([]);
  const [loadingTopology, setLoadingTopology] = useState(false);
  const [cableConnections, setCableConnections] = useState<Array<{ route_type: string; cable_type: string; cable_length_m: string; route_name: string }>>([]);
  const [loaded, setLoaded] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const [supportFiles, setSupportFiles] = useState<File[]>([]);
  const [customDefinitions, setCustomDefinitions] = useState<CustomFieldDefinition[]>([]);
  const [customValues, setCustomValues] = useState<Record<string, string>>({});
  const [customDialogOpen, setCustomDialogOpen] = useState(false);
  const [customDraft, setCustomDraft] = useState({
    field_label: "",
    field_key: "",
    field_type: "text",
    layout_span: "12",
    is_required: "false",
    help_text: "",
    options_csv: "",
  });

  const [form, setForm] = useState({
    pop_name: "",
    pop_code: "",
    tenant: "",
    pln_cid_number: "",
    pln_payment_method: "",
    pln_phase: "",
    pln_wattage: "",
    pop_type: "",
    pop_type_id: "",
    tanggal_pop_aktif: "",
    tags: "",
    status_pop: "planning",
    validation_status: "unvalidated",
    validation_date: "",
    region_id: "",
    address: "",
    city: "",
    city_id: "",
    province: "",
    province_id: "",
    longitude: "",
    latitude: "",
    device_name: "",
    device_type_key: deviceType,
    asset_group: PASSIVE_TYPES.has(deviceType) ? "passive" : "active",
    installation_date: "",
    pop_id: "",
    project_id: "",
    customer_id: "",
    tenant_id: "",
    manufacturer_id: "",
    brand_id: "",
    model_id: "",
    serial_number: "",
    status: "draft",
    capacity_core: "",
    used_core: "",
    total_ports: "",
    used_ports: "",
    front_device_id: "",
    front_port_id: "",
    rear_device_id: "",
    rear_port_id: "",
    splitter_ratio: "",
    odp_type: "",
    installation_type: "",
    management_ip: "",
    feeder_port_count: "",
    distribution_port_count: "",
    cable_type: "",
    cable_category: "",
    cable_length_m: "",
    route_name: "",
    route_type: "",
    route_coordinates: "",
    route_file_url: "",

    project_name: "",
    project_status: "planning",
    project_description: "",
    bast_number: "",
    spk_number: "",
    vendor_name: "",
    start_date: "",
    end_date: "",
    budget_value: "",
    customer_name: "",
    customer_number: "",
    service_type_id: "",
    service_type: "",
    customer_status: "prospect",
    contact_name: "",
    contact_phone: "",
    email: "",
    customer_project_id: "",
  });

  const scopeRegionIds = useMemo(
    () => new Set((me.app_user.user_region_scopes || []).map((scope) => scope.region_id)),
    [me.app_user.user_region_scopes],
  );
  const isFixedRegionRole = me.role === "user_all_region" || me.role === "user_region";
  const selectedRegionLabel = regions.find((region) => region.id === form.region_id)?.region_name || "-";
  const hasCoreCapacities = isDevice && (form.device_type_key === "OTB" || form.device_type_key === "ODC" || form.device_type_key === "JC" || form.device_type_key === "CABLE");
  const isCableDevice = isDevice && form.device_type_key === "CABLE";
  const isOntDevice = isDevice && form.device_type_key === "ONT";
  const hasCustomerAutoFill = isOntDevice && Boolean(form.customer_id);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const needsPops = isDevice || isProject || isCustomer;
        const needsProjects = isDevice || isCustomer;
        const needsDeviceMasterData = isDevice;
        const needsCustomerMasterData = isCustomer;
        const needsTenantMasterData = isDevice || isPop;

        const [regionsRes, popsRes, projectsRes, customersRes, popTypesRes, routeTypesRes, cableTypeRes, coreCapacityRes, deviceCoreCapacityRes, provincesRes, citiesAll, manufacturersRes, brandsRes, modelsRes, odpTypesRes, installationTypesRes, serviceTypesRes, tenantsRes, splitterProfilesRes] = await Promise.all([
          apiFetch<RegionsListResponse>("/regions?page=1&limit=200", { token }),
          optionalPaginatedRequest<PopOption>(needsPops, () => apiFetch<PaginatedResponse<PopOption>>("/pops?page=1&limit=500", { token })),
          optionalPaginatedRequest<ProjectOption>(needsProjects, () => apiFetch<PaginatedResponse<ProjectOption>>("/projects?page=1&limit=500", { token })),
          emptyPaginatedResponse<CustomerOption>(),
          optionalPaginatedRequest<PopTypeOption>(isPop, () => apiFetch<PaginatedResponse<PopTypeOption>>("/popTypes?page=1&limit=200&is_active=true", { token })),
          optionalPaginatedRequest<RouteTypeOption>(deviceType === "CABLE" || deviceType === "ODC", () => apiFetch<PaginatedResponse<RouteTypeOption>>("/routeTypes?page=1&limit=200&is_active=true", { token })),
          optionalPaginatedRequest<{ id: string; cable_type_code: string; cable_type_name: string }>(deviceType === "CABLE" || deviceType === "ODC", () => apiFetch<PaginatedResponse<{ id: string; cable_type_code: string; cable_type_name: string }>>("/cableTypes?page=1&limit=200&is_active=true", { token })),
          optionalPaginatedRequest<{ core_capacity_value: number; label: string; allowed_route_type_keys?: string[] | null }>(deviceType === "CABLE", () => apiFetch<PaginatedResponse<{ core_capacity_value: number; label: string; allowed_route_type_keys?: string[] | null }>>("/coreCapacities?page=1&limit=200&is_active=true", { token })),
          optionalPaginatedRequest<{ core_capacity_value: number; label: string; allowed_device_type_keys?: string[] | null }>(hasCoreCapacities, () => apiFetch<PaginatedResponse<{ core_capacity_value: number; label: string; allowed_device_type_keys?: string[] | null }>>("/deviceCoreCapacities?page=1&limit=200&is_active=true", { token })),
          apiFetch<PaginatedResponse<ProvinceOption>>("/provinces?page=1&limit=500&is_active=true", { token }),
          fetchAllPaginated<CityOption>("/cities?is_active=true", token),
          optionalPaginatedRequest<ManufacturerOption>(needsDeviceMasterData, () => apiFetch<PaginatedResponse<ManufacturerOption>>("/manufacturers?page=1&limit=500", { token })),
          optionalPaginatedRequest<BrandOption>(needsDeviceMasterData, () => apiFetch<PaginatedResponse<BrandOption>>("/brands?page=1&limit=500", { token })),
          optionalPaginatedRequest<AssetModelOption>(needsDeviceMasterData, () => apiFetch<PaginatedResponse<AssetModelOption>>("/assetModels?page=1&limit=1000", { token })),
          optionalPaginatedRequest<OdpTypeOption>(needsDeviceMasterData, () => apiFetch<PaginatedResponse<OdpTypeOption>>("/odpTypes?page=1&limit=200&is_active=true", { token })),
          optionalPaginatedRequest<InstallationTypeOption>(needsDeviceMasterData, () => apiFetch<PaginatedResponse<InstallationTypeOption>>("/installationTypes?page=1&limit=200&is_active=true", { token })),
          optionalPaginatedRequest<ServiceTypeOption>(needsCustomerMasterData, () => apiFetch<PaginatedResponse<ServiceTypeOption>>("/serviceTypes?page=1&limit=200&is_active=true", { token })),
          optionalPaginatedRequest<TenantOption>(needsTenantMasterData, () => apiFetch<PaginatedResponse<TenantOption>>("/tenants?page=1&limit=200&is_active=true", { token })),
          optionalPaginatedRequest<SplitterProfileOption>(needsDeviceMasterData, () => apiFetch<PaginatedResponse<SplitterProfileOption>>("/splitterProfiles?page=1&limit=200&is_active=true", { token })),
        ]);

        if (cancelled) return;

        let nextRegions = regionsRes.data || [];
        if (me.role === "user_region" || me.role === "user_all_region") {
          nextRegions = nextRegions.filter((region) => scopeRegionIds.has(region.id));
        }

        setRegions(nextRegions);
        setPops(popsRes.data || []);
        setProjects(projectsRes.data || []);
        setCustomers(customersRes.data || []);
        setPopTypes(popTypesRes.data || []);
        setRouteTypes(routeTypesRes.data || []);
        setCableTypes(cableTypeRes?.data || []);
        setCoreCapacities(coreCapacityRes?.data || []);
        setDeviceCoreCapacities(deviceCoreCapacityRes?.data || []);
        setProvinces(provincesRes.data || []);
        setCities(citiesAll || []);
        setManufacturers(manufacturersRes.data || []);
        setBrands(brandsRes.data || []);
        setAssetModels(modelsRes.data || []);
        setOdpTypes(odpTypesRes.data || []);
        setInstallationTypes(installationTypesRes.data || []);
        setServiceTypes(serviceTypesRes.data || []);
        setTenants(tenantsRes.data || []);
        setSplitterProfiles(splitterProfilesRes.data || []);
        setForm((prev) => ({
          ...prev,
          region_id: prev.region_id || nextRegions[0]?.id || "",
        }));
      } catch (err) {
        if (cancelled) return;
        setErrorMessage((err as Error).message);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [token, me.role, scopeRegionIds, deviceType, isCustomer, isDevice, isPop, isProject]);

  const needsTopology = isDevice && (form.device_type_key === "OTB" || form.device_type_key === "ODC" || form.device_type_key === "CABLE" || form.device_type_key === "JC" || form.device_type_key === "ODP");

  // ── Fetch topology device candidates by POP ────────────────────────────
  useEffect(() => {
    if (!needsTopology || !form.pop_id) {
      setTopologyFrontDevices([]);
      setTopologyRearDevices([]);
      setFrontDevicePorts([]);
      setRearDevicePorts([]);
      return;
    }

    let cancelled = false;
    setLoadingTopology(true);

    async function loadTopologyDevices() {
      try {
        // Backend pakai _eq (single value), jadi fetch per device type & combine
        async function loadFront() {
          if (form.device_type_key === "OTB") {
            const [oltRes, switchRes] = await Promise.all([
              apiFetch<PaginatedResponse<{ id: string; device_name: string; device_type_key: string }>>(
                `/devices?pop_id=${form.pop_id}&limit=200&status=active&device_type_key=OLT`,
                { token },
              ),
              apiFetch<PaginatedResponse<{ id: string; device_name: string; device_type_key: string }>>(
                `/devices?pop_id=${form.pop_id}&limit=200&status=active&device_type_key=SWITCH`,
                { token },
              ),
            ]);
            return [...(oltRes.data || []), ...(switchRes.data || [])];
          }
          if (form.device_type_key === "ODC" || form.device_type_key === "CABLE" || form.device_type_key === "JC") {
            const otbRes = await apiFetch<PaginatedResponse<{ id: string; device_name: string; device_type_key: string }>>(
              `/devices?pop_id=${form.pop_id}&limit=200&status=active&device_type_key=OTB`,
              { token },
            );
            return otbRes.data || [];
          }
          if (form.device_type_key === "ODP") {
            const odcRes = await apiFetch<PaginatedResponse<{ id: string; device_name: string; device_type_key: string }>>(
              `/devices?pop_id=${form.pop_id}&limit=200&status=active&device_type_key=ODC`,
              { token },
            );
            return odcRes.data || [];
          }
          return [];
        }

        async function loadRear() {
          if (form.device_type_key === "OTB" || form.device_type_key === "CABLE") {
            const [odcRes, jcRes] = await Promise.all([
              apiFetch<PaginatedResponse<{ id: string; device_name: string; device_type_key: string }>>(
                `/devices?pop_id=${form.pop_id}&limit=200&status=active&device_type_key=ODC`,
                { token },
              ),
              apiFetch<PaginatedResponse<{ id: string; device_name: string; device_type_key: string }>>(
                `/devices?pop_id=${form.pop_id}&limit=200&status=active&device_type_key=JC`,
                { token },
              ),
            ]);
            return [...(odcRes.data || []), ...(jcRes.data || [])];
          }
          if (form.device_type_key === "ODC") {
            const odpRes = await apiFetch<PaginatedResponse<{ id: string; device_name: string; device_type_key: string }>>(
              `/devices?pop_id=${form.pop_id}&limit=200&status=active&device_type_key=ODP`,
              { token },
            );
            return odpRes.data || [];
          }
          if (form.device_type_key === "JC") {
            const [hhRes, mhRes] = await Promise.all([
              apiFetch<PaginatedResponse<{ id: string; device_name: string; device_type_key: string }>>(
                `/devices?pop_id=${form.pop_id}&limit=200&status=active&device_type_key=HH`,
                { token },
              ),
              apiFetch<PaginatedResponse<{ id: string; device_name: string; device_type_key: string }>>(
                `/devices?pop_id=${form.pop_id}&limit=200&status=active&device_type_key=MH`,
                { token },
              ),
            ]);
            return [...(hhRes.data || []), ...(mhRes.data || [])];
          }
          return [];
        }

        const [frontDevices, rearDevices] = await Promise.all([loadFront(), loadRear()]);
        if (!cancelled) {
          setTopologyFrontDevices(frontDevices);
          setTopologyRearDevices(rearDevices);
        }
      } catch {
        if (!cancelled) {
          setTopologyFrontDevices([]);
          setTopologyRearDevices([]);
        }
      } finally {
        if (!cancelled) setLoadingTopology(false);
      }
    }

    void loadTopologyDevices();
    return () => {
      cancelled = true;
    };
  }, [needsTopology, form.pop_id, form.device_type_key, token]);

  // ── Fetch ports when front device changes ───────────────────────────────
  useEffect(() => {
    if (!needsTopology || !form.front_device_id) {
      setFrontDevicePorts([]);
      return;
    }

    let cancelled = false;

    async function loadFrontPorts() {
      try {
        const res = await apiFetch<PaginatedResponse<{ id: string; port_label?: string | null; port_index: number; status: string }>>(
          `/devicePorts?device_id=${form.front_device_id}&status=idle&limit=200`,
          { token },
        );
        if (!cancelled) setFrontDevicePorts(res.data || []);
      } catch {
        if (!cancelled) setFrontDevicePorts([]);
      }
    }

    void loadFrontPorts();
    return () => {
      cancelled = true;
    };
  }, [needsTopology, form.front_device_id, token]);

  // ── Fetch ports when rear device changes ────────────────────────────────
  useEffect(() => {
    if (!needsTopology || !form.rear_device_id) {
      setRearDevicePorts([]);
      return;
    }

    let cancelled = false;

    async function loadRearPorts() {
      try {
        const res = await apiFetch<PaginatedResponse<{ id: string; port_label?: string | null; port_index: number; status: string }>>(
          `/devicePorts?device_id=${form.rear_device_id}&status=idle&limit=200`,
          { token },
        );
        if (!cancelled) setRearDevicePorts(res.data || []);
      } catch {
        if (!cancelled) setRearDevicePorts([]);
      }
    }

    void loadRearPorts();
    return () => {
      cancelled = true;
    };
  }, [needsTopology, form.rear_device_id, token]);

  useEffect(() => {
    if (!isOntDevice) return;

    let cancelled = false;
    async function loadCustomersByPop() {
      if (!form.pop_id) {
        setCustomers([]);
        setForm((prev) => (prev.customer_id ? { ...prev, customer_id: "" } : prev));
        return;
      }

      setLoadingCustomers(true);
      try {
        const query = new URLSearchParams({ page: "1", limit: "500", pop_id: form.pop_id });
        if (form.region_id) query.set("region_id", form.region_id);
        const result = await apiFetch<PaginatedResponse<CustomerOption>>(`/customers?${query.toString()}`, { token });
        if (cancelled) return;

        const rows = result.data || [];
        setCustomers(rows);
        setForm((prev) => {
          if (!prev.customer_id) return prev;
          return rows.some((customer) => customer.id === prev.customer_id) ? prev : { ...prev, customer_id: "" };
        });
      } catch {
        if (cancelled) return;
        setCustomers([]);
        setForm((prev) => (prev.customer_id ? { ...prev, customer_id: "" } : prev));
      } finally {
        if (!cancelled) setLoadingCustomers(false);
      }
    }

    void loadCustomersByPop();
    return () => {
      cancelled = true;
    };
  }, [isOntDevice, form.pop_id, form.region_id, token]);

  useEffect(() => {
    if (!isDevice || !form.project_id) return;
    const selectedProject = projects.find((project) => project.id === form.project_id);
    if (!selectedProject) return;
    const regionMismatch = form.region_id && selectedProject.region_id && selectedProject.region_id !== form.region_id;
    const popMismatch = form.pop_id && selectedProject.pop_id && selectedProject.pop_id !== form.pop_id;
    if (regionMismatch || popMismatch) {
      setForm((previous) => ({ ...previous, project_id: "" }));
    }
  }, [isDevice, form.project_id, form.region_id, form.pop_id, projects]);

  useEffect(() => {
    let cancelled = false;
    if (!isPop && !isDevice) {
      setCustomDefinitions([]);
      setCustomValues({});
      return () => {
        cancelled = true;
      };
    }

    async function loadCustomDefinitions() {
      try {
        const entityType = isPop ? "pop" : "device";
        const response = await apiFetch<PaginatedResponse<CustomFieldDefinition>>(
          `/customFields?page=1&limit=500&entity_type=${entityType}&is_active=true`,
          { token },
        );

        if (cancelled) return;

        const rows = (response.data || [])
          .filter((field) => !field.region_id || field.region_id === form.region_id)
          .filter((field) => {
            if (isPop) return !field.pop_type || field.pop_type === form.pop_type;
            return !field.device_type_key || field.device_type_key?.toUpperCase() === form.device_type_key.toUpperCase();
          })
          .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

        setCustomDefinitions(rows);
        setCustomValues((prev) => {
          const next = { ...prev };
          rows.forEach((row) => {
            if (next[row.field_key] == null && row.default_value != null) {
              next[row.field_key] = stringifyDefaultValue(row.default_value);
            }
          });
          return next;
        });
      } catch {
      }
    }

    if (!form.region_id) return;
    void loadCustomDefinitions();
    return () => {
      cancelled = true;
    };
  }, [token, isPop, isDevice, form.region_id, form.pop_type, form.device_type_key]);

  const showCoreFields = isDevice && CORE_TYPES.has(form.device_type_key);
  const showPortFields = isDevice && PORT_TYPES.has(form.device_type_key) && !["ONT", "OLT", "SWITCH", "ROUTER"].includes(form.device_type_key);
  const showCoreWarning_create = showCoreFields && Boolean(form.capacity_core) && Boolean(form.used_core) && Number.isFinite(Number(form.capacity_core)) && Number.isFinite(Number(form.used_core)) && Number(form.used_core) > Number(form.capacity_core);
  const showPortWarning_create = showPortFields && Boolean(form.total_ports) && Boolean(form.used_ports) && Number.isFinite(Number(form.total_ports)) && Number.isFinite(Number(form.used_ports)) && Number(form.used_ports) > Number(form.total_ports);
  const showSplitterField = isDevice && (form.device_type_key === "ODP" || form.device_type_key === "ODC");
  const selectedSplitterProfile = useMemo(
    () => splitterProfiles.find((item) => item.ratio_label === form.splitter_ratio) || null,
    [splitterProfiles, form.splitter_ratio],
  );
  const selectedSplitterOutputPort = selectedSplitterProfile?.output_port_count ?? null;
  const showDeviceImageField = isDevice;
  const sectionSpanClass = "md:col-span-2 xl:col-span-3";
  const sectionLabelClass =
    "rounded-md border bg-muted/40 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground";
  const formGridClass = isPop || isProject || isCustomer
    ? "grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 lg:gap-4"
    : "grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3 lg:gap-3";
  const buildListTarget = (basePath: string, regionId: string) => {
    const nextRegionId = regionId.trim();
    if (!nextRegionId) return basePath;
    const joiner = basePath.includes("?") ? "&" : "?";
    return `${basePath}${joiner}region_id=${encodeURIComponent(nextRegionId)}`;
  };

  const openApprovalNotice = (entityLabel: string, requestId: string, redirectTo: string) => {
    const suffix = requestId ? ` (${requestId})` : "";
    const description = `${entityLabel} berhasil dikirim ke approval superadmin${suffix}. Data belum masuk asset utama sampai superadmin approve.`;
    setSuccessMessage(description);
    setApprovalNotice({
      title: "Request approval terkirim",
      description,
      redirectTo,
    });
  };

  useEffect(() => {
    const urls = imageFiles.map((file) => URL.createObjectURL(file));
    setImagePreviewUrls(urls);
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [imageFiles]);

  useEffect(() => {
    if (!showSplitterField) return;
    const total = Number(selectedSplitterOutputPort || 0);
    if (!Number.isFinite(total) || total <= 0) return;

    const nextTotal = total >= 16 ? 8 : total;
    setForm((prev) => {
      if (prev.total_ports === String(nextTotal)) return prev;
      return {
        ...prev,
        total_ports: String(nextTotal),
      };
    });
  }, [showSplitterField, selectedSplitterOutputPort]);

  function handleImageFilesChange(files: FileList | null) {
    const list = Array.from(files || []);
    if (!list.length) {
      setImageFiles([]);
      return;
    }
    if (list.length > MAX_IMAGE_ATTACHMENTS) {
      setErrorMessage(`Maksimal ${MAX_IMAGE_ATTACHMENTS} gambar per data.`);
      return;
    }
    const invalidSize = list.find((file) => file.size > MAX_IMAGE_FILE_SIZE_BYTES);
    if (invalidSize) {
      setErrorMessage(`File "${invalidSize.name}" melebihi batas 5MB.`);
      return;
    }
    const invalidType = list.find((file) => !file.type.startsWith("image/"));
    if (invalidType) {
      setErrorMessage(`File "${invalidType.name}" bukan format gambar.`);
      return;
    }
    setErrorMessage("");
    setImageFiles(list);
  }

  function removeImageAt(index: number) {
    setImageFiles((prev) => prev.filter((_, idx) => idx !== index));
  }

  function clearImages() {
    setImageFiles([]);
  }

  function getMissingDeviceFields() {
    const missing: Record<string, string[]> = {};

    // Identitas & Relasi fields
    const identitasMissing: string[] = [];
    if (!form.device_name) identitasMissing.push("Device Name");
    if (!form.pop_id) identitasMissing.push("POP");
    if (!form.region_id) identitasMissing.push("Region");
    if (form.device_type_key === "ODP") {
      if (!form.odp_type) identitasMissing.push("Tipe ODP");
      if (!form.installation_type) identitasMissing.push("Jenis Instalasi");
    }
    if (identitasMissing.length > 0) missing.identitas = identitasMissing;

    // Lokasi field format checks
    const lokasiMissing: string[] = [];
    if (!isCableDevice) {
      if (form.latitude && !validateCoordinateFormat(form.latitude, "latitude").valid) {
        lokasiMissing.push("Latitude (format salah)");
      }
      if (form.longitude && !validateCoordinateFormat(form.longitude, "longitude").valid) {
        lokasiMissing.push("Longitude (format salah)");
      }
    }
    if (lokasiMissing.length > 0) missing.lokasi = lokasiMissing;

    return missing;
  }

  async function submit() {
    if (saving || submitLockRef.current || approvalNotice) return;
    submitLockRef.current = true;
    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      if (!isProject && !isCableDevice) {
        const latitudeValidation = validateCoordinateFormat(form.latitude, "latitude");
        if (!latitudeValidation.valid) {
          throw new Error(`Latitude tidak valid: ${latitudeValidation.message}`);
        }
        const longitudeValidation = validateCoordinateFormat(form.longitude, "longitude");
        if (!longitudeValidation.valid) {
          throw new Error(`Longitude tidak valid: ${longitudeValidation.message}`);
        }
      }
      if (isCustomer) {
        const cidValidation = validateCid(form.customer_number);
        if (!cidValidation.valid) {
          throw new Error(`CID tidak valid: ${cidValidation.message}`);
        }
      }

      const normalizedValidation = normalizeValidationPayload(form.validation_status, form.validation_date);

      if (isPop) {
        if (!form.pop_name || !form.pop_code || !form.region_id) {
          throw new Error("POP Name, POP Code, dan Region wajib diisi.");
        }

        const payload: Record<string, unknown> = {
          pop_name: normalizePopName(form.pop_name),
          pop_code: form.pop_code.trim().toUpperCase(),
          tenant: nullIfEmpty(form.tenant),
          pln_cid_number: nullIfEmpty(form.pln_cid_number),
          pln_payment_method: nullIfEmpty(form.pln_payment_method),
          pln_phase: nullIfEmpty(form.pln_phase),
          pln_wattage: numberOrNull(form.pln_wattage),
          pop_type: nullIfEmpty(form.pop_type),
          pop_type_id: nullIfEmpty(form.pop_type_id),
          tanggal_pop_aktif: nullIfEmpty(form.tanggal_pop_aktif),
          tags: csvToTags(form.tags),
          support_doc: {},
          custom_fields: buildCustomFieldsPayload(customDefinitions, customValues),
          image_attachment_id: null,
          image_attachments: [],
          status_pop: form.status_pop,
          validation_status: normalizedValidation.validation_status,
          validation_date: normalizedValidation.validation_date,
          region_id: form.region_id,
          address: nullIfEmpty(form.address),
          city: nullIfEmpty(form.city),
          city_id: nullIfEmpty(form.city_id),
          province: nullIfEmpty(form.province),
          province_id: nullIfEmpty(form.province_id),
          longitude: numberOrNull(form.longitude),
          latitude: numberOrNull(form.latitude),
        };

        if (imageFiles.length) {
          const uploadedImages = await Promise.all(
            imageFiles.map((file) =>
              uploadAttachment({
                token,
                file,
                fileCategory: "image",
                entityType: "pop",
              }),
            ),
          );
          payload.image_attachment_id = uploadedImages[0]?.id || null;
          payload.image_attachments = uploadedImages.map((item) => ({
            id: item.id,
            attachment_id: item.attachment_id,
            original_name: item.original_name,
            mime_type: item.mime_type,
            file_category: item.file_category,
            size_bytes: item.size_bytes,
          }));
        }

        if (supportFiles.length) {
          const uploads = await Promise.all(
            supportFiles.map((file) =>
              uploadAttachment({
                token,
                file,
                fileCategory: detectSupportFileCategory(file.name),
                entityType: "pop",
              }),
            ),
          );

          payload.support_doc = {
            attachments: uploads.map((item) => ({
              id: item.id,
              attachment_id: item.attachment_id,
              original_name: item.original_name,
              mime_type: item.mime_type,
              file_category: item.file_category,
              size_bytes: item.size_bytes,
            })),
          };
        }

        const createdPop = await apiFetch<{ data?: ApprovalResponse }>("/pops", {
          method: "POST",
          token,
          body: JSON.stringify(payload),
        });

        if (createdPop.data?.approval_request) {
          const requestId = getApprovalRequestId(createdPop.data);
          openApprovalNotice("POP", requestId, buildListTarget("/data-management/list/pop", form.region_id));
          return;
        }

        setSuccessMessage("POP berhasil dibuat.");
        router.push(buildListTarget("/data-management/list/pop", form.region_id));
        return;
      }

      if (isProject) {
        if (!form.project_name || !form.region_id) {
          throw new Error("Project Name dan Region wajib diisi.");
        }

        const payload: Record<string, unknown> = {
          project_name: form.project_name.trim(),
          description: nullIfEmpty(form.project_description),
          status: form.project_status || "planning",
          region_id: form.region_id,
          pop_id: nullIfEmpty(form.pop_id),
          bast_number: nullIfEmpty(form.bast_number),
          spk_number: nullIfEmpty(form.spk_number),
          image_attachment_id: null,
          image_attachments: [],
          support_doc: {},
          vendor_name: nullIfEmpty(form.vendor_name),
          start_date: nullIfEmpty(form.start_date),
          end_date: nullIfEmpty(form.end_date),
          budget_value: numberOrNull(form.budget_value),
          tags: csvToTags(form.tags),
          custom_fields: {},
        };

        if (imageFiles.length) {
          const uploadedImages = await Promise.all(
            imageFiles.map((file) =>
              uploadAttachment({
                token,
                file,
                fileCategory: "image",
                entityType: "project",
              }),
            ),
          );
          payload.image_attachment_id = uploadedImages[0]?.id || null;
          payload.image_attachments = uploadedImages.map((item) => ({
            id: item.id,
            attachment_id: item.attachment_id,
            original_name: item.original_name,
            mime_type: item.mime_type,
            file_category: item.file_category,
            size_bytes: item.size_bytes,
          }));
        }

        if (supportFiles.length) {
          const uploads = await Promise.all(
            supportFiles.map((file) =>
              uploadAttachment({
                token,
                file,
                fileCategory: detectSupportFileCategory(file.name),
                entityType: "project",
              }),
            ),
          );

          payload.support_doc = {
            attachments: uploads.map((item) => ({
              id: item.id,
              attachment_id: item.attachment_id,
              original_name: item.original_name,
              mime_type: item.mime_type,
              file_category: item.file_category,
              size_bytes: item.size_bytes,
            })),
          };
        }

        const createdProject = await apiFetch<{ data?: ApprovalResponse }>("/projects", {
          method: "POST",
          token,
          body: JSON.stringify(payload),
        });

        if (createdProject.data?.approval_request) {
          const requestId = getApprovalRequestId(createdProject.data);
          openApprovalNotice("Project", requestId, buildListTarget("/data-management/list/projects", form.region_id));
          return;
        }

        setSuccessMessage("Project berhasil dibuat.");
        router.push(buildListTarget("/data-management/list/projects", form.region_id));
        return;
      }

      if (isCustomer) {
        const missingCustomerFields = getMissingCustomerRequiredFields(form);
        if (missingCustomerFields.length) {
          throw new Error(`Field wajib belum lengkap: ${formatFieldList(missingCustomerFields)}.`);
        }

        const payload: Record<string, unknown> = {
          customer_name: form.customer_name.trim(),
          customer_number: nullIfEmpty(form.customer_number),
          service_type_id: nullIfEmpty(form.service_type_id),
          service_type: nullIfEmpty(form.service_type),
          status: form.customer_status || "prospect",
          longitude: numberOrNull(form.longitude),
          latitude: numberOrNull(form.latitude),
          address: nullIfEmpty(form.address),
          province: nullIfEmpty(form.province),
          province_id: nullIfEmpty(form.province_id),
          city: nullIfEmpty(form.city),
          city_id: nullIfEmpty(form.city_id),
          region_id: form.region_id,
          pop_id: form.pop_id,
          project_id: nullIfEmpty(form.customer_project_id),
          installation_date: nullIfEmpty(form.installation_date),
          tags: csvToTags(form.tags),
          custom_fields: {},
        };

        await apiFetch("/customers", {
          method: "POST",
          token,
          body: JSON.stringify(payload),
        });

        setCreateResponseDialog({
          title: "Customer Berhasil Dibuat",
          description: "Data customer sudah tersimpan dan siap digunakan untuk relasi layanan.",
          variant: "success",
          actionLabel: "Lihat Customer",
          redirectTo: buildListTarget("/data-management/list/customer", form.region_id),
        });
        return;
      }

      if (!form.device_name || !form.region_id || !form.device_type_key) {
        throw new Error(
          form.device_type_key === "ODP"
            ? "Nama ODP, Device Type, dan Region wajib diisi."
            : "Device Name, Device Type, dan Region wajib diisi.",
        );
      }
      if (form.device_type_key === "ODP" && (!form.odp_type || !form.installation_type)) {
        throw new Error("Tipe ODP dan Jenis Instalasi wajib dipilih.");
      }

      const payload: Record<string, unknown> = {
        device_name: normalizeDeviceName(form.device_name) || null,
        device_type_key: form.device_type_key,
        asset_group: PASSIVE_TYPES.has(form.device_type_key) ? "passive" : "active",
        region_id: form.region_id,
        pop_id: nullIfEmpty(form.pop_id),
        project_id: nullIfEmpty(form.project_id),
        customer_id: isOntDevice ? nullIfEmpty(form.customer_id) : null,
        tenant_id: nullIfEmpty(form.tenant_id),
        manufacturer_id: nullIfEmpty(form.manufacturer_id),
        brand_id: nullIfEmpty(form.brand_id),
        model_id: nullIfEmpty(form.model_id),
        serial_number: nullIfEmpty(form.serial_number),
        status: form.status,
        installation_date: nullIfEmpty(form.installation_date),
        validation_status: "unvalidated",
        validation_date: null,
        address: nullIfEmpty(form.address),
        ...(isCableDevice ? {} : {
          longitude: numberOrNull(form.longitude),
          latitude: numberOrNull(form.latitude),
        }),
        custom_fields: buildCustomFieldsPayload(customDefinitions, customValues),
        image_attachment_id: null,
        image_attachments: [],
      };

      if (showDeviceImageField && imageFiles.length) {
        const uploadedImages = await Promise.all(
          imageFiles.map((file) =>
            uploadAttachment({
              token,
              file,
              fileCategory: "image",
              entityType: "device",
            }),
          ),
        );
        payload.image_attachment_id = uploadedImages[0]?.id || null;
        payload.image_attachments = uploadedImages.map((item) => ({
          id: item.id,
          attachment_id: item.attachment_id,
          original_name: item.original_name,
          mime_type: item.mime_type,
          file_category: item.file_category,
          size_bytes: item.size_bytes,
        }));
      }

      if (showCoreFields) {
        payload.capacity_core = numberOrNull(form.capacity_core);
        payload.used_core = numberOrNull(form.used_core);
      }
      if (showPortFields) {
        payload.total_ports = numberOrNull(form.total_ports);
        payload.used_ports = numberOrNull(form.used_ports);
      }
      if (showSplitterField) {
        payload.splitter_ratio = nullIfEmpty(form.splitter_ratio);
        payload.odp_type = nullIfEmpty(form.odp_type);
        payload.installation_type = nullIfEmpty(form.installation_type);
      }

      // Topology relations (front/rear port connections)
      if (form.front_device_id) payload.front_device_id = form.front_device_id;
      if (form.front_port_id) payload.front_port_id = form.front_port_id;
      if (form.rear_device_id) payload.rear_device_id = form.rear_device_id;
      if (form.rear_port_id) payload.rear_port_id = form.rear_port_id;

      // Cable connections array (ODC distribution cables)
      if (cableConnections.length > 0) {
        payload.cable_connections = cableConnections.map((conn) => ({
          route_type: conn.route_type || null,
          cable_type: conn.cable_type || null,
          cable_length_m: numberOrNull(conn.cable_length_m),
          route_name: conn.route_name || null,
        }));
      }

      // Per-type extra fields
      if (form.device_type_key === "OLT" || form.device_type_key === "ONT" || form.device_type_key === "SWITCH" || form.device_type_key === "ROUTER") {
        payload.management_ip = form.management_ip || null;
      }
      if (form.device_type_key === "ODC") {
        payload.feeder_port_count = numberOrNull(form.feeder_port_count);
        payload.distribution_port_count = numberOrNull(form.distribution_port_count);
      }
      if (form.device_type_key === "CABLE") {
        payload.cable_type = nullIfEmpty(form.cable_type);
        payload.cable_category = nullIfEmpty(form.cable_category);
        payload.cable_length_m = numberOrNull(form.cable_length_m);
        payload.route_name = nullIfEmpty(form.route_name);
        payload.route_type = nullIfEmpty(form.route_type);
        payload.route_coordinates = form.route_coordinates ? JSON.parse(form.route_coordinates) : null;
        payload.route_file_url = nullIfEmpty(form.route_file_url);
      }

      const createdDevice = await apiFetch<{ data?: ApprovalResponse }>("/devices", {
        method: "POST",
        token,
        body: JSON.stringify(payload),
      });

      if (createdDevice.data?.approval_request) {
        const requestId = getApprovalRequestId(createdDevice.data);
        openApprovalNotice("Device", requestId, buildListTarget(`/data-management/list/${deviceTypeKeyToSlug(form.device_type_key)}`, form.region_id));
        return;
      }

      setCreateResponseDialog({
        title: isOntDevice ? "ONT Berhasil Dibuat" : "Device Berhasil Dibuat",
        description: isOntDevice
          ? form.customer_id
            ? "Data ONT sudah tersimpan dengan relasi customer dan data lokasi hasil auto-fill."
            : "Data ONT sudah tersimpan. Customer reference dapat dilengkapi dari detail ONT bila diperlukan."
          : "Data device sudah tersimpan dan siap digunakan.",
        variant: "success",
        actionLabel: isOntDevice ? "Lihat ONT" : "Lihat Device",
        redirectTo: buildListTarget(`/data-management/list/${deviceTypeKeyToSlug(form.device_type_key)}`, form.region_id),
      });
    } catch (err) {
      const message = (err as Error).message;
      setErrorMessage(message);
      setCreateResponseDialog({
        title: getCreateErrorTitle({
          isPop,
          isProject,
          isCustomer,
          isOntDevice,
          deviceTypeKey: form.device_type_key,
        }),
        description: message,
        variant: "destructive",
        actionLabel: "Perbaiki Form",
      });
      submitLockRef.current = false;
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollArea className="h-full min-h-0 w-full">
      <div className="space-y-4 pr-3">
      <CreateFormPageHeader
        flags={{ isPop, isProject, isCustomer }}
        deviceTypeKey={form.device_type_key}
      />

      <CreateFormStatusAlerts errorMessage={errorMessage} successMessage={successMessage} />

      <Card>
        <CreateFormCardHeader flags={{ isPop, isProject, isCustomer }} />
        <CardContent className="space-y-5">
          {!loaded ? <AppLoading label="Sedang memuat data region dan POP..." /> : null}
          {isDevice ? (
            <div className="space-y-1.5">
              <FieldLabel label="Device Type" tooltip="Tipe perangkat dikunci sesuai pilihan tombol Add Device." />
              <div className="flex h-10 items-center rounded-md border bg-muted/30 px-3 text-sm font-medium">
                {form.device_type_key}
              </div>
            </div>
          ) : null}

          {isDevice ? (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="flex items-center gap-2 mb-4 overflow-x-auto">
                <TabsList>
                  <TabsTrigger value="identitas" className="relative text-xs sm:text-sm">
                    Identitas & Relasi
                    {missingTabFields.identitas?.length > 0 ? (
                      <Badge variant="destructive" className="ml-1.5 h-4 px-1 text-[9px]">
                        {missingTabFields.identitas.length}
                      </Badge>
                    ) : null}
                  </TabsTrigger>
                  <TabsTrigger value="teknis" className="relative text-xs sm:text-sm">
                    Teknis & Kapasitas
                    {missingTabFields.teknis?.length > 0 ? (
                      <Badge variant="destructive" className="ml-1.5 h-4 px-1 text-[9px]">
                        {missingTabFields.teknis.length}
                      </Badge>
                    ) : null}
                  </TabsTrigger>
                  <TabsTrigger value="lokasi" className="relative text-xs sm:text-sm">
                    Lokasi
                    {missingTabFields.lokasi?.length > 0 ? (
                      <Badge variant="destructive" className="ml-1.5 h-4 px-1 text-[9px]">
                        {missingTabFields.lokasi.length}
                      </Badge>
                    ) : null}
                  </TabsTrigger>
                  <TabsTrigger value="operasional" className="relative text-xs sm:text-sm">
                    Operasional & Lampiran
                    {missingTabFields.operasional?.length > 0 ? (
                      <Badge variant="destructive" className="ml-1.5 h-4 px-1 text-[9px]">
                        {missingTabFields.operasional.length}
                      </Badge>
                    ) : null}
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* ── Tab 1: Identitas & Relasi ──────────────────────────── */}
              <TabsContent value="identitas" className="mt-0">
                <div className={formGridClass}>
                  <div className={`${sectionSpanClass} ${sectionLabelClass}`}>
                    Identitas & Relasi
                  </div>
                  <CreateFormSelection
                    deviceTypeKey={form.device_type_key}
                    values={form}
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
                    onChange={(patch) => setForm((previous) => ({ ...previous, ...patch }))}
                    onPopChange={(nextPopId) => {
                      if (form.customer_id && form.pop_id !== nextPopId) {
                        setAutoFillNotice("Customer reference dikosongkan karena POP berubah. Pilih customer dari POP baru untuk mengisi ulang data lokasi.");
                      }
                      if (nextPopId) {
                        const selectedPop = pops.find((p) => p.id === nextPopId);
                        if (selectedPop && (selectedPop.address || selectedPop.city || selectedPop.province)) {
                          setForm((p) => ({
                            ...p,
                            pop_id: nextPopId,
                            customer_id: "",
                            address: selectedPop.address || p.address,
                            city: selectedPop.city || p.city,
                            city_id: selectedPop.city_id || p.city_id,
                            province: selectedPop.province || p.province,
                            province_id: selectedPop.province_id || p.province_id,
                            longitude: selectedPop.longitude != null ? String(selectedPop.longitude) : p.longitude,
                            latitude: selectedPop.latitude != null ? String(selectedPop.latitude) : p.latitude,
                          }));
                          setAutoFillNotice("Lokasi otomatis terisi dari data POP. Review dan koreksi bila diperlukan sebelum menyimpan.");
                          return;
                        }
                      }
                      setForm((p) => ({ ...p, pop_id: nextPopId, customer_id: "" }));
                    }}
                  />
                  {isOntDevice ? (
                    <div className="space-y-1.5 col-span-full md:col-span-2 xl:col-span-3">
                      <FieldLabel label="Customer Reference (opsional)" tooltip="Customer yang tampil hanya customer dengan POP yang sama dengan POP ONT." />
                      <p className="text-xs text-muted-foreground">
                        Memilih customer akan mengisi otomatis lokasi ONT dari data customer terkait. Field tetap bisa dikoreksi sebelum disimpan.
                      </p>
                      <Combobox
                        value={form.customer_id || "__none__"}
                        onValueChange={(value) => {
                          if (value === "__none__") {
                            setForm((p) => ({ ...p, customer_id: "" }));
                            setAutoFillNotice("Customer reference dilepas. Data lokasi yang sudah terisi tidak dihapus otomatis, silakan review kembali sebelum menyimpan.");
                            return;
                          }
                          const selectedCustomer = customers.find((customer) => customer.id === value) || null;
                          const selectedLabel = selectedCustomer?.customer_name || selectedCustomer?.customer_number || "customer terpilih";
                          setForm((p) => ({
                            ...p,
                            customer_id: value,
                            region_id: selectedCustomer?.region_id || p.region_id,
                            pop_id: selectedCustomer?.pop_id || p.pop_id,
                            project_id: selectedCustomer?.project_id || p.project_id,
                            address: selectedCustomer?.address || p.address,
                            province: selectedCustomer?.province || p.province,
                            province_id: selectedCustomer?.province_id || p.province_id,
                            city: selectedCustomer?.city || p.city,
                            city_id: selectedCustomer?.city_id || p.city_id,
                            longitude: valueToFormText(selectedCustomer?.longitude) || p.longitude,
                            latitude: valueToFormText(selectedCustomer?.latitude) || p.latitude,
                            installation_date: selectedCustomer?.installation_date || p.installation_date,
                            status: mapCustomerStatusToDeviceStatus(selectedCustomer?.status) || p.status,
                          }));
                          setAutoFillNotice(`Data lokasi, tanggal instalasi, dan status ONT diisi otomatis dari ${selectedLabel}.`);
                        }}
                        options={toOptions([
                          { value: "__none__", label: form.pop_id ? "Tanpa customer" : "Pilih POP terlebih dahulu" },
                          ...customers
                            .filter((customer) => customer.pop_id === form.pop_id)
                            .map((customer) => ({
                              value: customer.id,
                              label: [
                                customer.customer_name,
                                customer.customer_number ? `CID ${customer.customer_number}` : customer.customer_id,
                              ].filter(Boolean).join(" - ") || "Customer tidak tersedia",
                            })),
                        ])}
                        placeholder={form.pop_id ? "Pilih customer" : "Pilih POP terlebih dahulu"}
                        searchPlaceholder="Cari customer..."
                        emptyText={form.pop_id ? "Tidak ada customer pada POP ini." : "Pilih POP terlebih dahulu."}
                        disabled={!form.pop_id || loadingCustomers}
                      />
                      {autoFillNotice ? (
                        <Alert className="border-blue-200 bg-blue-50/70 py-2 text-blue-950 dark:border-blue-900/60 dark:bg-blue-950/25 dark:text-blue-100">
                          <AlertTitle className="flex items-center gap-2 text-xs">
                            <Badge variant="outline" className="h-4 rounded px-1.5 text-[9px] uppercase tracking-normal">
                              Auto-fill
                            </Badge>
                            Review data otomatis
                          </AlertTitle>
                          <AlertDescription className="text-xs">{autoFillNotice}</AlertDescription>
                        </Alert>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="space-y-1.5">
                    <FieldLabel label="Region" tooltip={isFixedRegionRole ? "Region terkunci mengikuti scope akun." : "Region wajib dipilih."} required />
                    {isFixedRegionRole ? (
                      <Input value={selectedRegionLabel} disabled />
                    ) : (
                      <Combobox
                        value={form.region_id || "__none__"}
                        onValueChange={(v) => setForm((p) => ({ ...p, region_id: v === "__none__" ? "" : v }))}
                        options={toOptions([
                          { value: "__none__", label: "Pilih region" },
                          ...regions.map((region) => ({
                            value: region.id,
                            label: region.region_name,
                          })),
                        ])}
                        placeholder="Pilih region"
                        searchPlaceholder="Cari region..."
                      />
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* ── Tab 2: Teknis & Kapasitas ──────────────────────────── */}
              <TabsContent value="teknis" className="mt-0">
                <div className={formGridClass}>
                  <div className={`${sectionSpanClass} ${sectionLabelClass}`}>
                    Teknis & Kapasitas
                  </div>
                  {showCoreFields ? (
                    <>
                      <div className="space-y-1.5">
                        <FieldLabel label="Capacity Core" tooltip={form.device_type_key === "CABLE" ? "Pilih kapasitas core kabel dari master data." : "Pilih kapasitas core perangkat dari master data."} required />
                        <Combobox
                          value={form.capacity_core || "__none__"}
                          onValueChange={(v) => setForm((p) => ({ ...p, capacity_core: v === "__none__" ? "" : v }))}
                          options={[
                            { value: "__none__", label: "Pilih kapasitas core" },
                            ...(form.device_type_key === "CABLE" ? coreCapacities : deviceCoreCapacities)
                              .filter((cc) => {
                                if (form.device_type_key === "CABLE") {
                                  const allowedKeys = (cc as any).allowed_route_type_keys || [];
                                  if (!allowedKeys.length || !form.route_type) return true;
                                  return allowedKeys.includes(form.route_type);
                                }
                                const allowedKeys = (cc as any).allowed_device_type_keys || [];
                                if (!allowedKeys.length) return true;
                                return allowedKeys.includes(form.device_type_key);
                              })
                              .map((cc) => ({
                                value: String(cc.core_capacity_value),
                                label: `${cc.core_capacity_value} Core${(cc as any).label ? ` — ${(cc as any).label}` : ""}`,
                              })),
                          ]}
                          placeholder="Pilih kapasitas core"
                          searchPlaceholder="Cari kapasitas core..."
                        />
                      </div>
                      {/* Used Core — hanya untuk device selain OTB yang ada di CORE_TYPES */}
                      {form.device_type_key !== "OTB" ? (
                        <Field
                          label="Used Core"
                          type="number"
                          value={form.used_core}
                          onChange={(v) => setForm((p) => ({ ...p, used_core: v }))}
                        />
                      ) : null}
                      {showCoreWarning_create && form.device_type_key !== "OTB" ? (
                        <p className="col-span-full text-xs text-amber-600 dark:text-amber-400">
                          &#9888; Used core ({form.used_core}) melebihi kapasitas core ({form.capacity_core}).
                        </p>
                      ) : null}
                    </>
                  ) : null}

                  {/* ── Relasi Topologi (OTB) ─────────────────────────── */}
                  {needsTopology && form.device_type_key === "OTB" ? (
                    <>
                      <div className={`${sectionSpanClass} ${sectionLabelClass}`}>
                        Relasi Topologi
                      </div>

                      {/* Front Port */}
                      <div className="space-y-1.5">
                        <FieldLabel label="Front Port (Hulu)" tooltip="Pilih perangkat OLT/SWITCH di POP yang sama sebagai sumber koneksi hulu." />
                        <Combobox
                          value={form.front_device_id || "__none__"}
                          onValueChange={(v) => {
                            const deviceId = v === "__none__" ? "" : v;
                            setForm((p) => ({ ...p, front_device_id: deviceId, front_port_id: "" }));
                          }}
                          options={toOptions([
                            { value: "__none__", label: form.pop_id ? "Pilih device hulu" : "Pilih POP terlebih dahulu" },
                            ...topologyFrontDevices.map((d) => ({
                              value: d.id,
                              label: `${d.device_name} (${d.device_type_key})`,
                            })),
                          ])}
                          placeholder={form.pop_id ? "Pilih device hulu" : "Pilih POP terlebih dahulu"}
                          searchPlaceholder="Cari device hulu..."
                          disabled={loadingTopology || !form.pop_id}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <FieldLabel label="Port Hulu" tooltip="Pilih port idle dari device hulu yang terpilih." />
                        <Combobox
                          value={form.front_port_id || "__none__"}
                          onValueChange={(v) => setForm((p) => ({ ...p, front_port_id: v === "__none__" ? "" : v }))}
                          options={toOptions([
                            { value: "__none__", label: form.front_device_id ? "Pilih port hulu" : "Pilih device hulu terlebih dahulu" },
                            ...frontDevicePorts.map((port) => ({
                              value: port.id,
                              label: port.port_label || `Port #${port.port_index}`,
                            })),
                          ])}
                          placeholder={form.front_device_id ? "Pilih port hulu" : "Pilih device hulu terlebih dahulu"}
                          searchPlaceholder="Cari port hulu..."
                          disabled={!form.front_device_id}
                        />
                      </div>

                      {/* Rear Port */}
                      <div className="space-y-1.5">
                        <FieldLabel label="Rear Port (Hilir)" tooltip="Pilih perangkat ODC/JC di POP yang sama sebagai tujuan koneksi hilir." />
                        <Combobox
                          value={form.rear_device_id || "__none__"}
                          onValueChange={(v) => {
                            const deviceId = v === "__none__" ? "" : v;
                            setForm((p) => ({ ...p, rear_device_id: deviceId, rear_port_id: "" }));
                          }}
                          options={toOptions([
                            { value: "__none__", label: form.pop_id ? "Pilih device hilir" : "Pilih POP terlebih dahulu" },
                            ...topologyRearDevices.map((d) => ({
                              value: d.id,
                              label: `${d.device_name} (${d.device_type_key})`,
                            })),
                          ])}
                          placeholder={form.pop_id ? "Pilih device hilir" : "Pilih POP terlebih dahulu"}
                          searchPlaceholder="Cari device hilir..."
                          disabled={loadingTopology || !form.pop_id}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <FieldLabel label="Port Hilir" tooltip="Pilih port idle dari device hilir yang terpilih." />
                        <Combobox
                          value={form.rear_port_id || "__none__"}
                          onValueChange={(v) => setForm((p) => ({ ...p, rear_port_id: v === "__none__" ? "" : v }))}
                          options={toOptions([
                            { value: "__none__", label: form.rear_device_id ? "Pilih port hilir" : "Pilih device hilir terlebih dahulu" },
                            ...rearDevicePorts.map((port) => ({
                              value: port.id,
                              label: port.port_label || `Port #${port.port_index}`,
                            })),
                          ])}
                          placeholder={form.rear_device_id ? "Pilih port hilir" : "Pilih device hilir terlebih dahulu"}
                          searchPlaceholder="Cari port hilir..."
                          disabled={!form.rear_device_id}
                        />
                      </div>
                    </>
                  ) : null}

                  {/* ── Relasi Topologi (CABLE) ──────────────────────── */}
                  {needsTopology && form.device_type_key === "CABLE" ? (
                    <>
                      <div className={`${sectionSpanClass} ${sectionLabelClass}`}>
                        Relasi Topologi Kabel
                      </div>

                      {/* Front Port — OTB */}
                      <div className="space-y-1.5">
                        <FieldLabel label="Front Port (OTB)" tooltip="Pilih perangkat OTB di POP yang sama sebagai sumber koneksi hulu (feeder/backbone)." />
                        <Combobox
                          value={form.front_device_id || "__none__"}
                          onValueChange={(v) => {
                            const deviceId = v === "__none__" ? "" : v;
                            setForm((p) => ({ ...p, front_device_id: deviceId, front_port_id: "" }));
                          }}
                          options={toOptions([
                            { value: "__none__", label: form.pop_id ? "Pilih OTB hulu" : "Pilih POP terlebih dahulu" },
                            ...topologyFrontDevices.map((d) => ({
                              value: d.id,
                              label: `${d.device_name} (${d.device_type_key})`,
                            })),
                          ])}
                          placeholder={form.pop_id ? "Pilih OTB hulu" : "Pilih POP terlebih dahulu"}
                          searchPlaceholder="Cari OTB hulu..."
                          disabled={loadingTopology || !form.pop_id}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <FieldLabel label="Port OTB" tooltip="Pilih port idle dari OTB yang terpilih." />
                        <Combobox
                          value={form.front_port_id || "__none__"}
                          onValueChange={(v) => setForm((p) => ({ ...p, front_port_id: v === "__none__" ? "" : v }))}
                          options={toOptions([
                            { value: "__none__", label: form.front_device_id ? "Pilih port OTB" : "Pilih OTB terlebih dahulu" },
                            ...frontDevicePorts.map((port) => ({
                              value: port.id,
                              label: port.port_label || `Port #${port.port_index}`,
                            })),
                          ])}
                          placeholder={form.front_device_id ? "Pilih port OTB" : "Pilih OTB terlebih dahulu"}
                          searchPlaceholder="Cari port OTB..."
                          disabled={!form.front_device_id}
                        />
                      </div>

                      {/* Rear Port — ODC/JC */}
                      <div className="space-y-1.5">
                        <FieldLabel label="Rear Port (ODC/JC)" tooltip="Pilih perangkat ODC atau JC di POP yang sama sebagai tujuan koneksi hilir kabel." />
                        <Combobox
                          value={form.rear_device_id || "__none__"}
                          onValueChange={(v) => {
                            const deviceId = v === "__none__" ? "" : v;
                            setForm((p) => ({ ...p, rear_device_id: deviceId, rear_port_id: "" }));
                          }}
                          options={toOptions([
                            { value: "__none__", label: form.pop_id ? "Pilih ODC/JC hilir" : "Pilih POP terlebih dahulu" },
                            ...topologyRearDevices.map((d) => ({
                              value: d.id,
                              label: `${d.device_name} (${d.device_type_key})`,
                            })),
                          ])}
                          placeholder={form.pop_id ? "Pilih ODC/JC hilir" : "Pilih POP terlebih dahulu"}
                          searchPlaceholder="Cari device hilir..."
                          disabled={loadingTopology || !form.pop_id}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <FieldLabel label="Port ODC/JC" tooltip="Pilih port idle dari device hilir yang terpilih." />
                        <Combobox
                          value={form.rear_port_id || "__none__"}
                          onValueChange={(v) => setForm((p) => ({ ...p, rear_port_id: v === "__none__" ? "" : v }))}
                          options={toOptions([
                            { value: "__none__", label: form.rear_device_id ? "Pilih port hilir" : "Pilih device hilir terlebih dahulu" },
                            ...rearDevicePorts.map((port) => ({
                              value: port.id,
                              label: port.port_label || `Port #${port.port_index}`,
                            })),
                          ])}
                          placeholder={form.rear_device_id ? "Pilih port hilir" : "Pilih device hilir terlebih dahulu"}
                          searchPlaceholder="Cari port hilir..."
                          disabled={!form.rear_device_id}
                        />
                      </div>
                    </>
                  ) : null}

                  {/* ── Relasi Topologi (ODC) ─────────────────────────── */}
                  {needsTopology && form.device_type_key === "ODC" ? (
                    <>
                      <div className={`${sectionSpanClass} ${sectionLabelClass}`}>
                        Relasi Topologi
                      </div>

                      {/* Front Port — OTB */}
                      <div className="space-y-1.5">
                        <FieldLabel label="Front Port (OTB)" tooltip="Pilih perangkat OTB di POP yang sama sebagai sumber koneksi hulu (feeder)." />
                        <Combobox
                          value={form.front_device_id || "__none__"}
                          onValueChange={(v) => {
                            const deviceId = v === "__none__" ? "" : v;
                            setForm((p) => ({ ...p, front_device_id: deviceId, front_port_id: "" }));
                          }}
                          options={toOptions([
                            { value: "__none__", label: form.pop_id ? "Pilih OTB hulu" : "Pilih POP terlebih dahulu" },
                            ...topologyFrontDevices.map((d) => ({
                              value: d.id,
                              label: `${d.device_name} (${d.device_type_key})`,
                            })),
                          ])}
                          placeholder={form.pop_id ? "Pilih OTB hulu" : "Pilih POP terlebih dahulu"}
                          searchPlaceholder="Cari OTB hulu..."
                          disabled={loadingTopology || !form.pop_id}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <FieldLabel label="Port OTB" tooltip="Pilih port idle dari OTB yang terpilih." />
                        <Combobox
                          value={form.front_port_id || "__none__"}
                          onValueChange={(v) => setForm((p) => ({ ...p, front_port_id: v === "__none__" ? "" : v }))}
                          options={toOptions([
                            { value: "__none__", label: form.front_device_id ? "Pilih port OTB" : "Pilih OTB terlebih dahulu" },
                            ...frontDevicePorts.map((port) => ({
                              value: port.id,
                              label: port.port_label || `Port #${port.port_index}`,
                            })),
                          ])}
                          placeholder={form.front_device_id ? "Pilih port OTB" : "Pilih OTB terlebih dahulu"}
                          searchPlaceholder="Cari port OTB..."
                          disabled={!form.front_device_id}
                        />
                      </div>

                      {/* Cable Connections — multiple */}
                      <div className={`${sectionSpanClass} space-y-2`}>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-muted-foreground">Kabel Distribusi</span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setCableConnections((prev) => [
                                ...prev,
                                { route_type: "", cable_type: "", cable_length_m: "", route_name: "" },
                              ])
                            }
                          >
                            + Tambah Kabel
                          </Button>
                        </div>
                        {cableConnections.length === 0 ? (
                          <p className="text-xs text-muted-foreground">Belum ada kabel distribusi. Klik "Tambah Kabel" untuk menambahkan.</p>
                        ) : (
                          <div className="space-y-2">
                            {cableConnections.map((conn, idx) => (
                              <div
                                key={idx}
                                className="grid grid-cols-1 gap-2 rounded-md border bg-muted/20 p-2 md:grid-cols-4"
                              >
                                <div className="space-y-1">
                                  <label className="text-[10px] font-medium text-muted-foreground">Route Type</label>
                                  <Combobox
                                    value={conn.route_type || "__none__"}
                                    onValueChange={(v) =>
                                      setCableConnections((prev) => {
                                        const next = [...prev];
                                        next[idx] = { ...next[idx], route_type: v === "__none__" ? "" : v };
                                        return next;
                                      })
                                    }
                                    options={toOptions([
                                      { value: "__none__", label: "Pilih route type" },
                                      ...routeTypes.map((rt) => ({
                                        value: rt.route_type_name,
                                        label: rt.route_type_name,
                                      })),
                                    ])}
                                    searchPlaceholder="Cari route type..."
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[10px] font-medium text-muted-foreground">Cable Type</label>
                                  <Combobox
                                    value={conn.cable_type || "__none__"}
                                    onValueChange={(v) =>
                                      setCableConnections((prev) => {
                                        const next = [...prev];
                                        next[idx] = { ...next[idx], cable_type: v === "__none__" ? "" : v };
                                        return next;
                                      })
                                    }
                                    options={toOptions([
                                      { value: "__none__", label: "Pilih cable type" },
                                      ...cableTypes.map((ct) => ({
                                        value: ct.cable_type_name,
                                        label: ct.cable_type_name,
                                      })),
                                    ])}
                                    searchPlaceholder="Cari cable type..."
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[10px] font-medium text-muted-foreground">Panjang (m)</label>
                                  <input
                                    type="number"
                                    className="flex h-8 w-full rounded-md border border-input bg-transparent px-2 text-xs ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    value={conn.cable_length_m}
                                    onChange={(e) =>
                                      setCableConnections((prev) => {
                                        const next = [...prev];
                                        next[idx] = { ...next[idx], cable_length_m: e.target.value };
                                        return next;
                                      })
                                    }
                                    placeholder="0"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[10px] font-medium text-muted-foreground">Nama Rute</label>
                                  <div className="flex gap-1">
                                    <input
                                      className="flex h-8 w-full rounded-md border border-input bg-transparent px-2 text-xs ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                      value={conn.route_name}
                                      onChange={(e) =>
                                        setCableConnections((prev) => {
                                          const next = [...prev];
                                          next[idx] = { ...next[idx], route_name: e.target.value };
                                          return next;
                                        })
                                      }
                                      placeholder="Nama rute"
                                    />
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0 text-destructive"
                                      onClick={() =>
                                        setCableConnections((prev) => prev.filter((_, i) => i !== idx))
                                      }
                                    >
                                      ✕
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Rear Port — ODP (opsional) */}
                      <div className="space-y-1.5">
                        <FieldLabel label="Rear Port (ODP, opsional)" tooltip="Pilih perangkat ODP di POP yang sama sebagai tujuan koneksi hilir. Detail relasi bisa diatur di detail device ODC." />
                        <Combobox
                          value={form.rear_device_id || "__none__"}
                          onValueChange={(v) => {
                            const deviceId = v === "__none__" ? "" : v;
                            setForm((p) => ({ ...p, rear_device_id: deviceId, rear_port_id: "" }));
                          }}
                          options={toOptions([
                            { value: "__none__", label: form.pop_id ? "Pilih ODP hilir (opsional)" : "Pilih POP terlebih dahulu" },
                            ...topologyRearDevices.map((d) => ({
                              value: d.id,
                              label: `${d.device_name} (${d.device_type_key})`,
                            })),
                          ])}
                          placeholder={form.pop_id ? "Pilih ODP hilir" : "Pilih POP terlebih dahulu"}
                          searchPlaceholder="Cari ODP hilir..."
                          disabled={loadingTopology || !form.pop_id}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <FieldLabel label="Port ODP (opsional)" tooltip="Pilih port idle dari ODP yang terpilih." />
                        <Combobox
                          value={form.rear_port_id || "__none__"}
                          onValueChange={(v) => setForm((p) => ({ ...p, rear_port_id: v === "__none__" ? "" : v }))}
                          options={toOptions([
                            { value: "__none__", label: form.rear_device_id ? "Pilih port ODP (opsional)" : "Pilih ODP terlebih dahulu" },
                            ...rearDevicePorts.map((port) => ({
                              value: port.id,
                              label: port.port_label || `Port #${port.port_index}`,
                            })),
                          ])}
                          placeholder={form.rear_device_id ? "Pilih port ODP" : "Pilih ODP terlebih dahulu"}
                          searchPlaceholder="Cari port ODP..."
                          disabled={!form.rear_device_id}
                        />
                      </div>
                    </>
                  ) : null}

                  {/* ── Relasi Topologi (JC) ─────────────────────────── */}
                  {needsTopology && form.device_type_key === "JC" ? (
                    <>
                      <div className={`${sectionSpanClass} ${sectionLabelClass}`}>
                        Relasi Topologi
                      </div>

                      {/* Front Port — OTB */}
                      <div className="space-y-1.5">
                        <FieldLabel label="Front Port (OTB)" tooltip="Pilih perangkat OTB di POP yang sama sebagai sumber koneksi hulu." />
                        <Combobox
                          value={form.front_device_id || "__none__"}
                          onValueChange={(v) => {
                            const deviceId = v === "__none__" ? "" : v;
                            setForm((p) => ({ ...p, front_device_id: deviceId, front_port_id: "" }));
                          }}
                          options={toOptions([
                            { value: "__none__", label: form.pop_id ? "Pilih OTB hulu" : "Pilih POP terlebih dahulu" },
                            ...topologyFrontDevices.map((d) => ({
                              value: d.id,
                              label: `${d.device_name} (${d.device_type_key})`,
                            })),
                          ])}
                          placeholder={form.pop_id ? "Pilih OTB hulu" : "Pilih POP terlebih dahulu"}
                          searchPlaceholder="Cari OTB hulu..."
                          disabled={loadingTopology || !form.pop_id}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <FieldLabel label="Port OTB" tooltip="Pilih port idle dari OTB yang terpilih." />
                        <Combobox
                          value={form.front_port_id || "__none__"}
                          onValueChange={(v) => setForm((p) => ({ ...p, front_port_id: v === "__none__" ? "" : v }))}
                          options={toOptions([
                            { value: "__none__", label: form.front_device_id ? "Pilih port OTB" : "Pilih OTB terlebih dahulu" },
                            ...frontDevicePorts.map((port) => ({
                              value: port.id,
                              label: port.port_label || `Port #${port.port_index}`,
                            })),
                          ])}
                          placeholder={form.front_device_id ? "Pilih port OTB" : "Pilih OTB terlebih dahulu"}
                          searchPlaceholder="Cari port OTB..."
                          disabled={!form.front_device_id}
                        />
                      </div>

                      {/* Rear Port — HH/MH (opsional) */}
                      <div className="space-y-1.5">
                        <FieldLabel label="Rear Port (HH/MH, opsional)" tooltip="Pilih perangkat HH/MH di POP yang sama sebagai tujuan koneksi hilir. Detail relasi bisa diatur di detail device JC." />
                        <Combobox
                          value={form.rear_device_id || "__none__"}
                          onValueChange={(v) => {
                            const deviceId = v === "__none__" ? "" : v;
                            setForm((p) => ({ ...p, rear_device_id: deviceId, rear_port_id: "" }));
                          }}
                          options={toOptions([
                            { value: "__none__", label: form.pop_id ? "Pilih HH/MH hilir (opsional)" : "Pilih POP terlebih dahulu" },
                            ...topologyRearDevices.map((d) => ({
                              value: d.id,
                              label: `${d.device_name} (${d.device_type_key})`,
                            })),
                          ])}
                          placeholder={form.pop_id ? "Pilih HH/MH hilir" : "Pilih POP terlebih dahulu"}
                          searchPlaceholder="Cari HH/MH hilir..."
                          disabled={loadingTopology || !form.pop_id}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <FieldLabel label="Port HH/MH (opsional)" tooltip="Pilih port idle dari HH/MH yang terpilih." />
                        <Combobox
                          value={form.rear_port_id || "__none__"}
                          onValueChange={(v) => setForm((p) => ({ ...p, rear_port_id: v === "__none__" ? "" : v }))}
                          options={toOptions([
                            { value: "__none__", label: form.rear_device_id ? "Pilih port HH/MH (opsional)" : "Pilih HH/MH terlebih dahulu" },
                            ...rearDevicePorts.map((port) => ({
                              value: port.id,
                              label: port.port_label || `Port #${port.port_index}`,
                            })),
                          ])}
                          placeholder={form.rear_device_id ? "Pilih port HH/MH" : "Pilih HH/MH terlebih dahulu"}
                          searchPlaceholder="Cari port HH/MH..."
                          disabled={!form.rear_device_id}
                        />
                      </div>
                    </>
                  ) : null}

                  {/* ── Relasi Topologi (ODP) ─────────────────────────── */}
                  {needsTopology && form.device_type_key === "ODP" ? (
                    <>
                      <div className={`${sectionSpanClass} ${sectionLabelClass}`}>
                        Relasi Topologi
                      </div>

                      {/* Front Port — ODC */}
                      <div className="space-y-1.5">
                        <FieldLabel label="Front Port (ODC)" tooltip="Pilih perangkat ODC di POP yang sama sebagai sumber koneksi hulu. (Auto-populate jika ODC sudah punya rear port)." />
                        <Combobox
                          value={form.front_device_id || "__none__"}
                          onValueChange={(v) => {
                            const deviceId = v === "__none__" ? "" : v;
                            setForm((p) => ({ ...p, front_device_id: deviceId, front_port_id: "" }));
                          }}
                          options={toOptions([
                            { value: "__none__", label: form.pop_id ? "Pilih ODC hulu" : "Pilih POP terlebih dahulu" },
                            ...topologyFrontDevices.map((d) => ({
                              value: d.id,
                              label: `${d.device_name} (${d.device_type_key})`,
                            })),
                          ])}
                          placeholder={form.pop_id ? "Pilih ODC hulu" : "Pilih POP terlebih dahulu"}
                          searchPlaceholder="Cari ODC hulu..."
                          disabled={loadingTopology || !form.pop_id}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <FieldLabel label="Port ODC" tooltip="Pilih port idle dari ODC yang terpilih." />
                        <Combobox
                          value={form.front_port_id || "__none__"}
                          onValueChange={(v) => setForm((p) => ({ ...p, front_port_id: v === "__none__" ? "" : v }))}
                          options={toOptions([
                            { value: "__none__", label: form.front_device_id ? "Pilih port ODC" : "Pilih ODC terlebih dahulu" },
                            ...frontDevicePorts.map((port) => ({
                              value: port.id,
                              label: port.port_label || `Port #${port.port_index}`,
                            })),
                          ])}
                          placeholder={form.front_device_id ? "Pilih port ODC" : "Pilih ODC terlebih dahulu"}
                          searchPlaceholder="Cari port ODC..."
                          disabled={!form.front_device_id}
                        />
                      </div>

                      {/* Rear Port — info ke ODP Operations */}
                      <div className={`${sectionSpanClass} space-y-1.5`}>
                        <div className="rounded-md border border-blue-200 bg-blue-50/50 px-3 py-2 text-xs text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/25 dark:text-blue-200">
                          <span className="font-semibold">Rear Port (ONT-Customer):</span> Atur di <strong>detail device ODP → ODP Operations</strong>. Front port yang dipilih di sini akan otomatis tersambung ke ODP Operations.
                        </div>
                      </div>
                    </>
                  ) : null}

                  {showPortFields ? (
                    <>
                      <Field
                        label={form.device_type_key === "ODP" ? "Kapasitas ODP" : form.device_type_key === "ODC" ? "Total Port Cabinet" : "Total Ports"}
                        type="number"
                        value={form.total_ports}
                        onChange={(v) => setForm((p) => ({ ...p, total_ports: v }))}
                      />
                      <Field
                        label={form.device_type_key === "ODP" ? "Port Aktif" : form.device_type_key === "ODC" ? "Port Terpakai" : "Used Ports"}
                        type="number"
                        value={form.used_ports}
                        onChange={(v) => setForm((p) => ({ ...p, used_ports: v }))}
                      />
                      {showPortWarning_create ? (
                        <p className="col-span-full text-xs text-amber-600 dark:text-amber-400">
                          &#9888; {form.device_type_key === "ODP" ? "Port Aktif" : form.device_type_key === "ODC" ? "Port Terpakai" : "Used Ports"} ({form.used_ports}) melebihi {form.device_type_key === "ODP" ? "Kapasitas ODP" : form.device_type_key === "ODC" ? "Total Port Cabinet" : "Total Ports"} ({form.total_ports}).
                        </p>
                      ) : null}
                    </>
                  ) : null}
                  {showSplitterField ? (
                    <>
                      <FieldLabel label={form.device_type_key === "ODP" ? "Kapasitas Splitter" : "Splitter Profile"} tooltip="Pilih rasio splitter dari master data." />
                      {autoFillNotice ? (
                        <p className="text-xs text-muted-foreground">Pilihan splitter akan mengisi rekomendasi kapasitas port.</p>
                      ) : null}
                      <Combobox
                        value={form.splitter_ratio || "__none__"}
                        onValueChange={(value) => {
                          const ratioValue = value === "__none__" ? "" : value;
                          const profile = splitterProfiles.find((item) => item.ratio_label === ratioValue) || null;
                          const output = Number(profile?.output_port_count || 0);
                          const autoTotal = Number.isFinite(output) && output > 0 ? (output >= 16 ? 8 : output) : 0;
                          setForm((p) => ({
                            ...p,
                            splitter_ratio: ratioValue,
                            total_ports: autoTotal ? String(autoTotal) : p.total_ports,
                          }));
                        }}
                        options={toOptions([
                          { value: "__none__", label: "Pilih splitter ratio" },
                          ...splitterProfiles
                            .filter((sp) => (sp.allowed_device_type_keys || []).includes(form.device_type_key))
                            .map((item) => ({
                              value: item.ratio_label,
                              label: item.output_port_count ? `${item.ratio_label} (${item.output_port_count} port)` : item.ratio_label,
                            })),
                        ])}
                        placeholder="Pilih splitter ratio"
                        searchPlaceholder="Cari splitter ratio..."
                      />
                    </>
                  ) : null}
                  {form.device_type_key === "ODC" ? (
                    <>
                      <Field label="Feeder Port Count" type="number" value={form.feeder_port_count} onChange={(v) => setForm((p) => ({ ...p, feeder_port_count: v }))} />
                      <Field label="Distribution Port Count" type="number" value={form.distribution_port_count} onChange={(v) => setForm((p) => ({ ...p, distribution_port_count: v }))} />
                    </>
                  ) : null}
                  {(form.device_type_key === "OLT" || form.device_type_key === "ONT" || form.device_type_key === "SWITCH" || form.device_type_key === "ROUTER") ? (
                    <Field
                      label="Management IP"
                      value={form.management_ip}
                      onChange={(v) => setForm((p) => ({ ...p, management_ip: v }))}
                      placeholder="10.0.0.1"
                    />
                  ) : null}
                </div>
              </TabsContent>

              {/* ── Tab 3: Lokasi ────────────────────────────────────────── */}
              <TabsContent value="lokasi" className="mt-0">
                {!isCableDevice ? (
                  <div className={formGridClass}>
                    <div className={`${sectionSpanClass} ${sectionLabelClass}`}>
                      Lokasi
                    </div>
                    <CreateLocationFields
                      values={{
                        address: form.address,
                        province: form.province,
                        province_id: form.province_id,
                        city: form.city,
                        city_id: form.city_id,
                        longitude: form.longitude,
                        latitude: form.latitude,
                      }}
                      provinces={provinces}
                      cities={cities}
                      sectionSpanClass={sectionSpanClass}
                      showCoordinates={true}
                      badge={hasCustomerAutoFill ? <AutoFilledBadge /> : null}
                      onChange={(patch) => setForm((previous) => ({ ...previous, ...patch }))}
                    />
                  </div>
                ) : (
                  <div className={formGridClass}>
                    <div className={`${sectionSpanClass} ${sectionLabelClass}`}>
                      Lokasi
                    </div>
                    <p className="text-xs text-muted-foreground col-span-full">
                      Kabel tidak memiliki data lokasi spesifik. Informasi posisi kabel tercakup pada data rute dan koordinat rute di tab Teknis.
                    </p>
                  </div>
                )}
              </TabsContent>

              {/* ── Tab 4: Operasional & Lampiran ────────────────────────── */}
              <TabsContent value="operasional" className="mt-0 space-y-5">
                <div className={formGridClass}>
                  <div className={`${sectionSpanClass} ${sectionLabelClass}`}>
                    Operasional
                  </div>
                  <CreateOperationalFields
                    flags={{ isPop: false, isProject: false, isCustomer: false, isDevice: true }}
                    values={{
                      status_pop: form.status_pop,
                      project_status: form.project_status,
                      customer_status: form.customer_status,
                      status: form.status,
                      installation_date: form.installation_date,
                      validation_status: form.validation_status,
                      validation_date: form.validation_date,
                    }}
                    hasCustomerAutoFill={hasCustomerAutoFill}
                    onChange={(patch) => setForm((previous) => ({ ...previous, ...patch }))}
                  />
                </div>

                {showDeviceImageField ? (
                  <div className="space-y-1.5">
                    <div className={sectionLabelClass}>Lampiran Gambar</div>
                    <ImageAttachmentField
                      label="Image Attachments"
                      tooltip="Upload maksimal 10 foto perangkat (masing-masing max 5MB). Gambar pertama jadi primary image."
                      files={imageFiles}
                      previewUrls={imagePreviewUrls}
                      onChange={handleImageFilesChange}
                      onRemove={removeImageAt}
                      onClear={clearImages}
                    />
                  </div>
                ) : null}

                {isPop || isDevice ? (
                  <div className="space-y-3 rounded-lg border p-3">
                    <Separator />
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">Custom Fields</p>
                        <p className="text-xs text-muted-foreground">Khusus untuk data Device yang sedang dibuat.</p>
                      </div>
                      <Button type="button" variant="outline" size="sm" onClick={() => setCustomDialogOpen(true)}>
                        Add Custom Field
                      </Button>
                    </div>
                    {customDefinitions.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Belum ada custom field untuk konteks ini.</p>
                    ) : (
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {customDefinitions.map((field) => (
                          <div key={field.id} className={field.layout_span === 12 ? "sm:col-span-2 space-y-1.5" : "space-y-1.5"}>
                            <FieldLabel label={field.field_label} tooltip={field.help_text || "Custom field untuk data ini."} />
                            {renderCustomFieldInput({
                              field,
                              value: customValues[field.field_key] || "",
                              onChange: (value) => setCustomValues((prev) => ({ ...prev, [field.field_key]: value })),
                            })}
                            {field.help_text ? <p className="text-xs text-muted-foreground">{field.help_text}</p> : null}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : null}


              </TabsContent>
            </Tabs>
          ) : (
            // Non-device entities (POP, Project, Customer) - keep existing layout
            <div className={formGridClass}>
              {isPop ? (
                <PopCreateIdentityFields
                  values={{
                    pop_name: form.pop_name,
                    pop_code: form.pop_code,
                  }}
                  onChange={(patch) => setForm((previous) => ({ ...previous, ...patch }))}
                />
              ) : null}
              {isProject ? (
                <ProjectCreateForm
                  values={{
                    project_name: form.project_name,
                    vendor_name: form.vendor_name,
                    bast_number: form.bast_number,
                    spk_number: form.spk_number,
                    pop_id: form.pop_id,
                    region_id: form.region_id,
                    project_description: form.project_description,
                    start_date: form.start_date,
                    end_date: form.end_date,
                    budget_value: form.budget_value,
                  }}
                  pops={pops}
                  sectionSpanClass={sectionSpanClass}
                  onChange={(patch) => setForm((previous) => ({ ...previous, ...patch }))}
                />
              ) : null}
              {isCustomer ? (
                <CustomerCreateForm
                  values={{
                    customer_name: form.customer_name,
                    customer_number: form.customer_number,
                    service_type_id: form.service_type_id,
                    service_type: form.service_type,
                    pop_id: form.pop_id,
                    customer_project_id: form.customer_project_id,
                    region_id: form.region_id,
                  }}
                  serviceTypes={serviceTypes}
                  pops={pops}
                  projects={projects}
                  onChange={(patch) => setForm((previous) => ({ ...previous, ...patch }))}
                />
              ) : null}
              <div className="space-y-1.5">
                <FieldLabel label="Region" tooltip={isFixedRegionRole ? "Region terkunci mengikuti scope akun." : "Region wajib dipilih."} />
                {isFixedRegionRole ? (
                  <Input value={selectedRegionLabel} disabled />
                ) : (
                  <Combobox
                    value={form.region_id || "__none__"}
                    onValueChange={(v) => setForm((p) => ({ ...p, region_id: v === "__none__" ? "" : v }))}
                    options={toOptions([
                      { value: "__none__", label: "Pilih region" },
                      ...regions.map((region) => ({
                        value: region.id,
                        label: region.region_name,
                      })),
                    ])}
                    placeholder="Pilih region"
                    searchPlaceholder="Cari region..."
                  />
                )}
              </div>
              <div className={`${sectionSpanClass} ${sectionLabelClass}`}>
                Validasi & Operasional
              </div>
              <CreateOperationalFields
                flags={{ isPop, isProject, isCustomer, isDevice }}
                values={{
                  status_pop: form.status_pop,
                  project_status: form.project_status,
                  customer_status: form.customer_status,
                  status: form.status,
                  installation_date: form.installation_date,
                  validation_status: form.validation_status,
                  validation_date: form.validation_date,
                }}
                hasCustomerAutoFill={hasCustomerAutoFill}
                onChange={(patch) => setForm((previous) => ({ ...previous, ...patch }))}
              />
              {isPop || isProject || showDeviceImageField ? (
                <div className={`${sectionSpanClass} ${sectionLabelClass}`}>
                  Lampiran Gambar
                </div>
              ) : null}
              {isPop ? (
                <>
                  <PopCreateOperationalFields
                    values={{
                      tenant: form.tenant,
                      pln_cid_number: form.pln_cid_number,
                      pln_payment_method: form.pln_payment_method,
                      pln_phase: form.pln_phase,
                      pln_wattage: form.pln_wattage,
                      pop_type_id: form.pop_type_id,
                      pop_type: form.pop_type,
                      tanggal_pop_aktif: form.tanggal_pop_aktif,
                      tags: form.tags,
                    }}
                    popTypes={popTypes}
                    tenants={tenants}
                    sectionSpanClass={sectionSpanClass}
                    onChange={(patch) => setForm((previous) => ({ ...previous, ...patch }))}
                  />
                  <div className={`space-y-1.5 ${sectionSpanClass}`}>
                    <ImageAttachmentField
                      label="Image Attachments"
                      tooltip="Upload maksimal 10 foto POP (masing-masing max 5MB)."
                      files={imageFiles}
                      previewUrls={imagePreviewUrls}
                      onChange={handleImageFilesChange}
                      onRemove={removeImageAt}
                      onClear={clearImages}
                    />
                  </div>
                  <div className={`space-y-1.5 ${sectionSpanClass}`}>
                    <SupportDocumentField
                      label="Support Documents"
                      tooltip="Upload dokumen pendukung POP: image, excel, word, atau pdf."
                      files={supportFiles}
                      onChange={setSupportFiles}
                    />
                  </div>
                </>
              ) : null}
              {isProject ? (
                <>
                  <div className={`space-y-1.5 ${sectionSpanClass}`}>
                    <ImageAttachmentField
                      label="Image Attachments"
                      tooltip="Upload maksimal 10 foto project (masing-masing max 5MB)."
                      files={imageFiles}
                      previewUrls={imagePreviewUrls}
                      onChange={handleImageFilesChange}
                      onRemove={removeImageAt}
                      onClear={clearImages}
                    />
                  </div>
                  <div className={`space-y-1.5 ${sectionSpanClass}`}>
                    <SupportDocumentField
                      label="Document Attachments"
                      tooltip="Upload dokumen pendukung project."
                      files={supportFiles}
                      onChange={setSupportFiles}
                    />
                  </div>
                </>
              ) : null}
              {isProject || isCustomer ? (
                <Field
                  label="Tags (comma separated)"
                  value={form.tags}
                  onChange={(v) => setForm((p) => ({ ...p, tags: v }))}
                  placeholder="backbone,west,phase-1"
                  containerClassName={sectionSpanClass}
                />
              ) : null}
              {isDevice && showDeviceImageField ? (
                <div className={`space-y-1.5 ${sectionSpanClass}`}>
                  <ImageAttachmentField
                    label="Image Attachments"
                    tooltip="Upload maksimal 10 foto perangkat (masing-masing max 5MB)."
                    files={imageFiles}
                    previewUrls={imagePreviewUrls}
                    onChange={handleImageFilesChange}
                    onRemove={removeImageAt}
                    onClear={clearImages}
                  />
                </div>
              ) : null}
              {!isCableDevice ? (
                <>
                  <div className={`${sectionSpanClass} ${sectionLabelClass}`}>
                    Lokasi
                  </div>
                  <CreateLocationFields
                    values={{
                      address: form.address,
                      province: form.province,
                      province_id: form.province_id,
                      city: form.city,
                      city_id: form.city_id,
                      longitude: form.longitude,
                      latitude: form.latitude,
                    }}
                    provinces={provinces}
                    cities={cities}
                    sectionSpanClass={sectionSpanClass}
                    showCoordinates={true}
                    badge={hasCustomerAutoFill ? <AutoFilledBadge /> : null}
                    onChange={(patch) => setForm((previous) => ({ ...previous, ...patch }))}
                  />
                </>
              ) : null}
            </div>
          )}{isPop ? (
            <div className="space-y-3 rounded-lg border p-3">
              <Separator />
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">Custom Fields</p>
                  <p className="text-xs text-muted-foreground">Khusus untuk data POP yang sedang dibuat.</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => setCustomDialogOpen(true)}>
                  Add Custom Field
                </Button>
              </div>

              {customDefinitions.length === 0 ? (
                <p className="text-xs text-muted-foreground">Belum ada custom field untuk konteks ini.</p>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {customDefinitions.map((field) => (
                    <div key={field.id} className={field.layout_span === 12 ? "sm:col-span-2 space-y-1.5" : "space-y-1.5"}>
                      <FieldLabel label={field.field_label} tooltip={field.help_text || "Custom field untuk data ini."} />
                      {renderCustomFieldInput({
                        field,
                        value: customValues[field.field_key] || "",
                        onChange: (value) => setCustomValues((prev) => ({ ...prev, [field.field_key]: value })),
                      })}
                      {field.help_text ? <p className="text-xs text-muted-foreground">{field.help_text}</p> : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          {!isDevice ? (
            <div className="flex justify-end">
              <Button onClick={() => void submit()} disabled={saving || Boolean(approvalNotice)}>
                {saving ? "Menyimpan..." : isPop ? "Simpan POP" : isProject ? "Simpan Project" : "Simpan Customer"}
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

        <CreateStickyFooter
          flags={{ isDevice, isPop, isProject, isCustomer }}
          saving={saving}
          canSave={!approvalNotice}
          missingCount={Object.values(getMissingDeviceFields()).flat().length}
          onSave={() => {
            const missing = getMissingDeviceFields();
            setMissingTabFields(missing);
            const totalMissing = Object.values(missing).flat().length;
            if (totalMissing > 0) {
              const firstMissingTab = Object.entries(missing).find(([, fields]) => fields.length > 0);
              if (firstMissingTab) setActiveTab(firstMissingTab[0]);
              setErrorMessage(`Ada ${totalMissing} field wajib yang belum diisi. Lengkapi field yang ditandai di setiap tab.`);
              return;
            }
            void submit();
          }}
        />

        <CreateApprovalDialog
          notice={approvalNotice}
          onClose={(target) => {
            setApprovalNotice(null);
            router.push(target);
          }}
        />

        <CreateResponseDialog
          state={createResponseDialog}
          onClose={() => setCreateResponseDialog(null)}
          onAction={(target) => {
            setCreateResponseDialog(null);
            if (target) {
              router.push(target);
            }
          }}
        />

        <AlertDialog open={customDialogOpen && (isPop || isDevice)} onOpenChange={setCustomDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Add Custom Field</AlertDialogTitle>
            <AlertDialogDescription>
              Tambahkan field kustom untuk form ini (span/title/jenis field).
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field
              label="Title"
              value={customDraft.field_label}
              onChange={(v) => setCustomDraft((p) => ({ ...p, field_label: v }))}
              placeholder="Contoh: Rack Label"
            />
            <Field
              label="Field Key"
              value={customDraft.field_key}
              onChange={(v) => setCustomDraft((p) => ({ ...p, field_key: slugifyFieldKey(v) }))}
              placeholder="rack_label"
            />
            <div className="space-y-1.5">
              <Label>Field Type</Label>
              <Combobox
                value={customDraft.field_type}
                onValueChange={(v) => setCustomDraft((p) => ({ ...p, field_type: v }))}
                options={toOptions(
                  ["text", "textarea", "number", "boolean", "date", "datetime", "select", "multiselect", "json"].map((type) => ({
                    value: type,
                    label: type,
                  })),
                )}
                searchPlaceholder="Cari tipe field..."
              />
            </div>
            <div className="space-y-1.5">
              <Label>Layout Span</Label>
              <Combobox
                value={customDraft.layout_span}
                onValueChange={(v) => setCustomDraft((p) => ({ ...p, layout_span: v }))}
                options={toOptions([
                  { value: "6", label: "Half (6)" },
                  { value: "12", label: "Full (12)" },
                ])}
                searchPlaceholder="Cari layout span..."
              />
            </div>
            <div className="space-y-1.5">
              <Label>Required</Label>
              <Combobox
                value={customDraft.is_required}
                onValueChange={(v) => setCustomDraft((p) => ({ ...p, is_required: v }))}
                options={toOptions([
                  { value: "false", label: "No" },
                  { value: "true", label: "Yes" },
                ])}
                searchPlaceholder="Cari opsi..."
              />
            </div>
            <Field
              label="Options (CSV)"
              value={customDraft.options_csv}
              onChange={(v) => setCustomDraft((p) => ({ ...p, options_csv: v }))}
              placeholder="Untuk select/multiselect"
            />
            <Field
              label="Help Text"
              value={customDraft.help_text}
              onChange={(v) => setCustomDraft((p) => ({ ...p, help_text: v }))}
              placeholder="Petunjuk singkat"
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                try {
                  const built = buildDraftCustomField(customDraft, isPop ? "pop" : "device");
                  setCustomDefinitions((prev) => [...prev, built]);
                  setCustomDialogOpen(false);
                  setCustomDraft({
                    field_label: "",
                    field_key: "",
                    field_type: "text",
                    layout_span: "12",
                    is_required: "false",
                    help_text: "",
                    options_csv: "",
                  });
                } catch (err) {
                  setErrorMessage((err as Error).message);
                }
              }}
            >
              Tambah
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
        </AlertDialog>
      </div>
    </ScrollArea>
  );
}

function nullIfEmpty(value: string) {
  return value.trim() ? value.trim() : null;
}

function valueToFormText(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function mapCustomerStatusToDeviceStatus(customerStatus?: string | null): string {
  if (!customerStatus) return "";
  const statusMap: Record<string, string> = {
    active: "active",
    prospect: "draft",
    suspend: "inactive",
    inactive: "inactive",
    terminated: "inactive",
  };
  return statusMap[customerStatus.toLowerCase()] || "";
}

function normalizeValidationPayload(statusRaw: string, dateRaw: string) {
  const status = nullIfEmpty(statusRaw)?.toLowerCase() || "unvalidated";
  const date = nullIfEmpty(dateRaw);

  if (status === "unvalidated") {
    return { validation_status: status, validation_date: null };
  }

  return {
    validation_status: status,
    validation_date: date || currentDateISO(),
  };
}

function currentDateISO() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function numberOrNull(value: string) {
  if (!value.trim()) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function validateCid(value: string) {
  const text = String(value || "").trim();
  if (!text) {
    return { valid: true, state: "idle" as const, message: "" };
  }
  if (!/^\d+$/.test(text)) {
    return { valid: false, state: "invalid" as const, message: "CID hanya boleh berisi angka." };
  }
  if (text.length !== 8) {
    return { valid: false, state: "invalid" as const, message: "CID wajib tepat 8 digit." };
  }
  return { valid: true, state: "valid" as const, message: "CID valid." };
}

function getCreateErrorTitle({
  isPop,
  isProject,
  isCustomer,
  isOntDevice,
  deviceTypeKey,
}: {
  isPop: boolean;
  isProject: boolean;
  isCustomer: boolean;
  isOntDevice: boolean;
  deviceTypeKey: string;
}) {
  if (isPop) return "Create POP Gagal";
  if (isProject) return "Create Project Gagal";
  if (isCustomer) return "Create Customer Gagal";
  if (isOntDevice) return "Create ONT Gagal";
  if (deviceTypeKey === "ODP") return "Create ODP Gagal";
  return "Create Device Gagal";
}

function getMissingCustomerRequiredFields(form: Record<string, string>) {
  const requiredFields = [
    ["customer_name", "Customer Name"],
    ["pop_id", "POP"],
    ["region_id", "Region"],
    ["customer_status", "Status"],
    ["installation_date", "Installation Date"],
    ["address", "Address"],
    ["province_id", "Province"],
    ["city_id", "City/Kabupaten"],
    ["longitude", "Longitude"],
    ["latitude", "Latitude"],
  ] as const;

  return requiredFields
    .filter(([key]) => !String(form[key] || "").trim())
    .map(([, label]) => label);
}

function formatFieldList(fields: string[]) {
  if (fields.length <= 1) return fields[0] || "";
  if (fields.length === 2) return `${fields[0]} dan ${fields[1]}`;
  return `${fields.slice(0, -1).join(", ")}, dan ${fields[fields.length - 1]}`;
}

function getApprovalRequestId(value?: ApprovalResponse | null) {
  return value?.approval_request?.request_id || value?.approval_request?.id || "";
}

function validateCoordinateFormat(value: string, kind: "longitude" | "latitude") {
  const text = String(value || "").trim();
  if (!text) {
    return { valid: true, state: "idle" as const, message: "" };
  }

  if (text.includes(",")) {
    return { valid: false, state: "invalid" as const, message: "Gunakan titik (.) sebagai pemisah desimal, bukan koma (,)." };
  }

  if (!text.includes(".")) {
    return { valid: false, state: "invalid" as const, message: "Format harus menggunakan titik (.) desimal." };
  }

  const allowedPattern = kind === "latitude" ? /^[-0-9.]+$/ : /^[0-9.]+$/;
  if (!allowedPattern.test(text)) {
    const invalidChars = Array.from(new Set((text.match(/[^0-9.\-]/g) || []).filter((ch) => ch.trim() !== "")));
    if (invalidChars.length > 0) {
      return {
        valid: false,
        state: "invalid" as const,
        message: `Ada karakter tidak valid: ${invalidChars.join(" ")}. Gunakan hanya angka dan titik${kind === "latitude" ? ", plus minus (-) di depan" : ""}.`,
      };
    }
    if (/\s/.test(text)) {
      return { valid: false, state: "invalid" as const, message: "Koordinat tidak boleh mengandung spasi." };
    }
    return {
      valid: false,
      state: "invalid" as const,
      message: `Koordinat hanya boleh berisi angka, titik${kind === "latitude" ? ", dan minus (-) di depan" : ""}.`,
    };
  }

  if (kind === "latitude") {
    if (!text.startsWith("-")) {
      return { valid: false, state: "invalid" as const, message: "Latitude harus diawali tanda minus (-)." };
    }

    if (!/^-?\d+\.\d+$/.test(text)) {
      return { valid: false, state: "invalid" as const, message: "Latitude hanya boleh berisi angka, minus, dan titik desimal." };
    }

    const parts = text.slice(1).split(".");
    if (parts.length !== 2) {
      return { valid: false, state: "invalid" as const, message: "Latitude harus memiliki satu titik desimal." };
    }

    const [whole, decimal] = parts;
    if (whole.length !== 1) {
      return { valid: false, state: "invalid" as const, message: "Digit sebelum titik untuk latitude harus tepat 1 angka." };
    }
    if (decimal.length < 6) {
      return { valid: false, state: "invalid" as const, message: "Digit setelah titik untuk latitude minimal 6 angka." };
    }
    return {
      valid: true,
      state: "valid" as const,
      message: "Format benar.",
    };
  }

  if (text.startsWith("-")) {
    return { valid: false, state: "invalid" as const, message: "Longitude tidak boleh diawali minus (-)." };
  }
  if (!/^\d+\.\d+$/.test(text)) {
    return { valid: false, state: "invalid" as const, message: "Longitude hanya boleh berisi angka dan titik desimal." };
  }

  const parts = text.split(".");
  if (parts.length !== 2) {
    return { valid: false, state: "invalid" as const, message: "Longitude harus memiliki satu titik desimal." };
  }

  const [whole, decimal] = parts;
  if (whole.length !== 3) {
    return { valid: false, state: "invalid" as const, message: "Digit sebelum titik untuk longitude harus tepat 3 angka." };
  }
  if (decimal.length < 6) {
    return { valid: false, state: "invalid" as const, message: "Digit setelah titik untuk longitude minimal 6 angka." };
  }

  return {
    valid: true,
    state: "valid" as const,
    message: "Format benar.",
  };
}

async function fetchAllPaginated<T>(basePath: string, token: string, pageSize = 100) {
  const all: T[] = [];
  let page = 1;
  let total = Number.POSITIVE_INFINITY;

  while (all.length < total) {
    const separator = basePath.includes("?") ? "&" : "?";
    const response = await apiFetch<PaginatedResponse<T>>(
      `${basePath}${separator}page=${page}&limit=${pageSize}`,
      { token },
    );

    const rows = response.data || [];
    all.push(...rows);
    total = response.meta?.total ?? all.length;

    if (!rows.length || page * pageSize >= total) break;
    page += 1;
  }

  return all;
}

function csvToTags(value: string) {
  if (!value.trim()) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function slugifyFieldKey(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function buildDraftCustomField(
  draft: {
    field_label: string;
    field_key: string;
    field_type: string;
    layout_span: string;
    is_required: string;
    help_text: string;
    options_csv: string;
  },
  entityType: "pop" | "device",
): CustomFieldDefinition {
  const fieldLabel = draft.field_label.trim();
  const fieldKey = slugifyFieldKey(draft.field_key || fieldLabel);
  if (!fieldLabel) throw new Error("Title custom field wajib diisi.");
  if (!fieldKey) throw new Error("Field key custom field tidak valid.");

  return {
    id: `local-${entityType}-${fieldKey}-${Date.now()}`,
    entity_type: entityType,
    region_id: null,
    device_type_key: null,
    pop_type: null,
    field_key: fieldKey,
    field_label: fieldLabel,
    field_type: draft.field_type as CustomFieldDefinition["field_type"],
    options: draft.options_csv
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
    is_required: draft.is_required === "true",
    layout_span: Number(draft.layout_span) === 6 ? 6 : 12,
    sort_order: 9999,
    help_text: draft.help_text.trim() || null,
    default_value: null,
    is_active: true,
  };
}

function buildCustomFieldsPayload(definitions: CustomFieldDefinition[], values: Record<string, string>) {
  const result: Record<string, unknown> = {};
  for (const field of definitions) {
    const raw = values[field.field_key];
    if (raw == null || raw === "") {
      if (field.is_required) {
        throw new Error(`Custom field "${field.field_label}" wajib diisi.`);
      }
      continue;
    }

    if (field.field_type === "number") {
      const number = Number(raw);
      if (!Number.isFinite(number)) throw new Error(`Custom field "${field.field_label}" harus berupa angka.`);
      result[field.field_key] = number;
      continue;
    }

    if (field.field_type === "boolean") {
      result[field.field_key] = raw === "true";
      continue;
    }

    if (field.field_type === "multiselect") {
      result[field.field_key] = raw
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      continue;
    }

    if (field.field_type === "json") {
      try {
        result[field.field_key] = JSON.parse(raw);
      } catch {
        throw new Error(`Custom field "${field.field_label}" harus JSON valid.`);
      }
      continue;
    }

    result[field.field_key] = raw;
  }
  return result;
}

function stringifyDefaultValue(value: unknown) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

function normalizeFieldOptions(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item)).filter(Boolean);
}

function renderCustomFieldInput({
  field,
  value,
  onChange,
}: {
  field: CustomFieldDefinition;
  value: string;
  onChange: (nextValue: string) => void;
}) {
  if (field.field_type === "textarea" || field.field_type === "json") {
    return (
      <Textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={field.field_type === "json" ? '{"key":"value"}' : ""}
      />
    );
  }

  if (field.field_type === "boolean") {
    return (
      <Combobox
        value={value || "false"}
        onValueChange={onChange}
        options={toOptions([
          { value: "true", label: "True" },
          { value: "false", label: "False" },
        ])}
        searchPlaceholder="Cari opsi..."
      />
    );
  }

  if (field.field_type === "select") {
    const options = normalizeFieldOptions(field.options);
    return (
      <Combobox
        value={value || "__none__"}
        onValueChange={(next) => onChange(next === "__none__" ? "" : next)}
        options={toOptions([
          { value: "__none__", label: "Pilih" },
          ...options.map((option) => ({ value: option, label: option })),
        ])}
        placeholder="Pilih nilai"
        searchPlaceholder="Cari nilai..."
      />
    );
  }

  if (field.field_type === "multiselect") {
    const options = normalizeFieldOptions(field.options);
    return (
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={options.length ? `Gunakan koma. Opsi: ${options.join(", ")}` : "Pisahkan dengan koma"}
      />
    );
  }

  return (
    <Input
      type={field.field_type === "number" ? "number" : field.field_type === "date" ? "date" : field.field_type === "datetime" ? "datetime-local" : "text"}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

type UploadResult = {
  id: string;
  attachment_id: string;
  original_name: string;
  mime_type: string;
  file_category: string;
  size_bytes: number;
};

async function uploadAttachment({
  token,
  file,
  fileCategory,
  entityType,
}: {
  token: string;
  file: File;
  fileCategory: string;
  entityType: string;
}) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("file_category", fileCategory);
  formData.append("entity_type", entityType);

  const response = await apiFetch<{ data: UploadResult }>("/attachments/upload", {
    method: "POST",
    token,
    body: formData,
  });

  return response.data;
}

function detectSupportFileCategory(fileName: string) {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  if (["xls", "xlsx", "csv"].includes(ext)) return "excel";
  if (["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"].includes(ext)) return "image";
  if (["pdf", "doc", "docx"].includes(ext)) return "document";
  return "document";
}
