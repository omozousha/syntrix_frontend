"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, CircleHelp, ImagePlus, Trash2, X, XCircle } from "lucide-react";
import { AppLoading } from "@/components/app-loading-new";
import { useSession } from "@/components/session-context";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { apiFetch, type PaginatedResponse, type RegionsListResponse } from "@/lib/api";

type PopOption = {
  id: string;
  pop_name: string;
  pop_code: string;
  region_id: string;
};
type ProjectOption = {
  id: string;
  project_name: string;
  project_code?: string | null;
  region_id?: string | null;
  pop_id?: string | null;
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
type SplitterProfileOption = {
  id: string;
  ratio_label: string;
  output_port_count?: number | null;
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
const PORT_TYPES = new Set(["OLT", "SWITCH", "ROUTER", "ONT", "ODP"]);
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
  const isRoute = kind === "route";
  const isProject = kind === "project";
  const isCustomer = kind === "customer";
  const isDevice = !isPop && !isRoute && !isProject && !isCustomer;

  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const submitLockRef = useRef(false);
  const [approvalNotice, setApprovalNotice] = useState<{
    title: string;
    description: string;
    redirectTo: string;
  } | null>(null);

  const [regions, setRegions] = useState<RegionsListResponse["data"]>([]);
  const [pops, setPops] = useState<PopOption[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [popTypes, setPopTypes] = useState<PopTypeOption[]>([]);
  const [routeTypes, setRouteTypes] = useState<RouteTypeOption[]>([]);
  const [provinces, setProvinces] = useState<ProvinceOption[]>([]);
  const [cities, setCities] = useState<CityOption[]>([]);
  const [manufacturers, setManufacturers] = useState<ManufacturerOption[]>([]);
  const [brands, setBrands] = useState<BrandOption[]>([]);
  const [assetModels, setAssetModels] = useState<AssetModelOption[]>([]);
  const [odpTypes, setOdpTypes] = useState<OdpTypeOption[]>([]);
  const [installationTypes, setInstallationTypes] = useState<InstallationTypeOption[]>([]);
  const [splitterProfiles, setSplitterProfiles] = useState<SplitterProfileOption[]>([]);
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
    manufacturer_id: "",
    brand_id: "",
    model_id: "",
    serial_number: "",
    status: "draft",
    capacity_core: "",
    used_core: "",
    total_ports: "",
    used_ports: "",
    splitter_ratio: "",
    odp_type: "",
    installation_type: "",
    route_name: "",
    route_type: "",
    route_status: "planning",
    route_project_id: "",
    distance_meters: "",
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

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const needsPops = isDevice || isRoute || isProject || isCustomer;
        const needsProjects = isRoute || isCustomer;
        const needsDeviceMasterData = isDevice;

        const [regionsRes, popsRes, projectsRes, popTypesRes, routeTypesRes, provincesRes, citiesAll, manufacturersRes, brandsRes, modelsRes, odpTypesRes, installationTypesRes, splitterProfilesRes] = await Promise.all([
          apiFetch<RegionsListResponse>("/regions?page=1&limit=200", { token }),
          optionalPaginatedRequest<PopOption>(needsPops, () => apiFetch<PaginatedResponse<PopOption>>("/pops?page=1&limit=500", { token })),
          optionalPaginatedRequest<ProjectOption>(needsProjects, () => apiFetch<PaginatedResponse<ProjectOption>>("/projects?page=1&limit=500", { token })),
          optionalPaginatedRequest<PopTypeOption>(isPop, () => apiFetch<PaginatedResponse<PopTypeOption>>("/popTypes?page=1&limit=200&is_active=true", { token })),
          optionalPaginatedRequest<RouteTypeOption>(isRoute, () => apiFetch<PaginatedResponse<RouteTypeOption>>("/routeTypes?page=1&limit=200&is_active=true", { token })),
          apiFetch<PaginatedResponse<ProvinceOption>>("/provinces?page=1&limit=500&is_active=true", { token }),
          fetchAllPaginated<CityOption>("/cities?is_active=true", token),
          optionalPaginatedRequest<ManufacturerOption>(needsDeviceMasterData, () => apiFetch<PaginatedResponse<ManufacturerOption>>("/manufacturers?page=1&limit=500", { token })),
          optionalPaginatedRequest<BrandOption>(needsDeviceMasterData, () => apiFetch<PaginatedResponse<BrandOption>>("/brands?page=1&limit=500", { token })),
          optionalPaginatedRequest<AssetModelOption>(needsDeviceMasterData, () => apiFetch<PaginatedResponse<AssetModelOption>>("/assetModels?page=1&limit=1000", { token })),
          optionalPaginatedRequest<OdpTypeOption>(needsDeviceMasterData, () => apiFetch<PaginatedResponse<OdpTypeOption>>("/odpTypes?page=1&limit=200&is_active=true", { token })),
          optionalPaginatedRequest<InstallationTypeOption>(needsDeviceMasterData, () => apiFetch<PaginatedResponse<InstallationTypeOption>>("/installationTypes?page=1&limit=200&is_active=true", { token })),
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
        setPopTypes(popTypesRes.data || []);
        setRouteTypes(routeTypesRes.data || []);
        setProvinces(provincesRes.data || []);
        setCities(citiesAll || []);
        setManufacturers(manufacturersRes.data || []);
        setBrands(brandsRes.data || []);
        setAssetModels(modelsRes.data || []);
        setOdpTypes(odpTypesRes.data || []);
        setInstallationTypes(installationTypesRes.data || []);
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
  }, [token, me.role, scopeRegionIds, isCustomer, isDevice, isPop, isProject, isRoute]);

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
  const showPortFields = isDevice && PORT_TYPES.has(form.device_type_key);
  const showSplitterField = isDevice && form.device_type_key === "ODP";
  const selectedSplitterProfile = useMemo(
    () => splitterProfiles.find((item) => item.ratio_label === form.splitter_ratio) || null,
    [splitterProfiles, form.splitter_ratio],
  );
  const selectedSplitterOutputPort = selectedSplitterProfile?.output_port_count ?? null;
  const needsPortPresetSelector = showSplitterField && Number(selectedSplitterOutputPort || 0) >= 16;
  const splitterPortPresetOptions = useMemo(() => {
    const total = Number(selectedSplitterOutputPort || 0);
    if (!Number.isFinite(total) || total <= 0) return [] as number[];
    if (total < 16) return [total];

    const presets = [8, 16, 32, 64].filter((value) => value <= total);
    if (!presets.includes(total)) presets.push(total);
    return Array.from(new Set(presets)).sort((a, b) => a - b);
  }, [selectedSplitterOutputPort]);
  const showDeviceImageField = isDevice;
  const sectionSpanClass = "md:col-span-2 xl:col-span-3";
  const sectionLabelClass =
    "rounded-md border bg-muted/40 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground";
  const formGridClass = isPop || isRoute || isProject || isCustomer
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

  async function submit() {
    if (saving || submitLockRef.current || approvalNotice) return;
    submitLockRef.current = true;
    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      if (!isProject) {
        const latitudeValidation = validateCoordinateFormat(form.latitude, "latitude");
        if (!latitudeValidation.valid) {
          throw new Error(`Latitude tidak valid: ${latitudeValidation.message}`);
        }
        const longitudeValidation = validateCoordinateFormat(form.longitude, "longitude");
        if (!longitudeValidation.valid) {
          throw new Error(`Longitude tidak valid: ${longitudeValidation.message}`);
        }
      }

      const normalizedValidation = normalizeValidationPayload(form.validation_status, form.validation_date);

      if (isPop) {
        if (!form.pop_name || !form.pop_code || !form.region_id) {
          throw new Error("POP Name, POP Code, dan Region wajib diisi.");
        }

        const payload: Record<string, unknown> = {
          pop_name: form.pop_name.trim(),
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

      if (isRoute) {
        if (!form.route_name || !form.region_id) {
          throw new Error("Route Name dan Region wajib diisi.");
        }

        const payload: Record<string, unknown> = {
          route_name: form.route_name.trim(),
          route_type: nullIfEmpty(form.route_type),
          status: form.route_status || "planning",
          region_id: form.region_id,
          pop_id: nullIfEmpty(form.pop_id),
          project_id: nullIfEmpty(form.route_project_id),
          distance_meters: numberOrNull(form.distance_meters),
          tags: csvToTags(form.tags),
          custom_fields: {},
        };

        const createdRoute = await apiFetch<{ data?: ApprovalResponse }>("/routes", {
          method: "POST",
          token,
          body: JSON.stringify(payload),
        });

        if (createdRoute.data?.approval_request) {
          const requestId = getApprovalRequestId(createdRoute.data);
          openApprovalNotice("Route", requestId, buildListTarget("/data-management/list/route", form.region_id));
          return;
        }

        setSuccessMessage("Route berhasil dibuat.");
        router.push(buildListTarget("/data-management/list/route", form.region_id));
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
        if (!form.customer_name || !form.region_id) {
          throw new Error("Customer Name dan Region wajib diisi.");
        }

        const payload: Record<string, unknown> = {
          customer_name: form.customer_name.trim(),
          customer_number: nullIfEmpty(form.customer_number),
          service_type: nullIfEmpty(form.service_type),
          status: form.customer_status || "prospect",
          contact_name: nullIfEmpty(form.contact_name),
          contact_phone: nullIfEmpty(form.contact_phone),
          email: nullIfEmpty(form.email),
          longitude: numberOrNull(form.longitude),
          latitude: numberOrNull(form.latitude),
          address: nullIfEmpty(form.address),
          region_id: form.region_id,
          pop_id: nullIfEmpty(form.pop_id),
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

        setSuccessMessage("Customer berhasil dibuat.");
        router.push(buildListTarget("/data-management/list/customer", form.region_id));
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
        device_name: form.device_name.trim() || null,
        device_type_key: form.device_type_key,
        asset_group: PASSIVE_TYPES.has(form.device_type_key) ? "passive" : "active",
        region_id: form.region_id,
        pop_id: nullIfEmpty(form.pop_id),
        manufacturer_id: nullIfEmpty(form.manufacturer_id),
        brand_id: nullIfEmpty(form.brand_id),
        model_id: nullIfEmpty(form.model_id),
        serial_number: nullIfEmpty(form.serial_number),
        status: form.status,
        installation_date: nullIfEmpty(form.installation_date),
        validation_status: normalizedValidation.validation_status,
        validation_date: normalizedValidation.validation_date,
        address: nullIfEmpty(form.address),
        longitude: numberOrNull(form.longitude),
        latitude: numberOrNull(form.latitude),
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

      const createdDevice = await apiFetch<{ data?: ApprovalResponse }>("/devices", {
        method: "POST",
        token,
        body: JSON.stringify(payload),
      });

      if (createdDevice.data?.approval_request) {
        const requestId = getApprovalRequestId(createdDevice.data);
        openApprovalNotice("Device", requestId, buildListTarget(`/data-management/list/${toDeviceSlug(form.device_type_key)}`, form.region_id));
        return;
      }

      setSuccessMessage("Device berhasil dibuat.");
      router.push(buildListTarget(`/data-management/list/${toDeviceSlug(form.device_type_key)}`, form.region_id));
    } catch (err) {
      setErrorMessage((err as Error).message);
      submitLockRef.current = false;
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollArea className="h-full min-h-0 w-full">
      <div className="space-y-4 pr-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            {isPop
              ? "Create POP"
              : isRoute
              ? "Create Route"
              : isProject
              ? "Create Project"
              : isCustomer
              ? "Create Customer"
              : `Create ${form.device_type_key}`}
          </h2>
          <p className="text-sm text-muted-foreground">
            Form menyesuaikan tipe data yang dipilih dari dialog Data Management.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/data-management">
            <ArrowLeft className="mr-2 size-4" />
            Kembali
          </Link>
        </Button>
      </div>

      {errorMessage ? (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : null}
      {successMessage ? (
        <Alert>
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{isPop ? "POP Form" : isRoute ? "Route Form" : isProject ? "Project Form" : isCustomer ? "Customer Form" : "Device Form"}</CardTitle>
          <CardDescription className="flex items-center gap-2">
            {isPop
              ? "Field wajib disesuaikan dengan data POP."
              : isRoute
              ? "Field route untuk baseline topology dan perhitungan panjang jalur."
              : isProject
              ? "Field project untuk konteks delivery dan as-built lifecycle."
              : isCustomer
              ? "Field customer untuk data pelanggan dan lokasi layanan."
              : "Field wajib disesuaikan dengan data perangkat."}
            <Badge variant="outline" className="font-normal">Compact Mode</Badge>
          </CardDescription>
        </CardHeader>
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

          <div className={formGridClass}>
            <div className={`${sectionSpanClass} ${sectionLabelClass}`}>
              Informasi Utama
            </div>
            {isPop ? (
              <>
                <Field label="POP Name" value={form.pop_name} onChange={(v) => setForm((p) => ({ ...p, pop_name: v }))} />
                <Field label="POP Code (3 huruf)" value={form.pop_code} onChange={(v) => setForm((p) => ({ ...p, pop_code: v.toUpperCase() }))} />
              </>
            ) : null}

            {isDevice ? (
              <>
                <Field label={form.device_type_key === "ODP" ? "Nama ODP" : "Device Name"} value={form.device_name} onChange={(v) => setForm((p) => ({ ...p, device_name: v }))} />
                {form.device_type_key === "ODP" ? (
                  <>
                    <div className="space-y-1.5">
                      <FieldLabel label="Tipe ODP" tooltip="Pilih tipe ODP dari master data." />
                      <Combobox
                        value={form.odp_type || "__none__"}
                        onValueChange={(value) => setForm((p) => ({ ...p, odp_type: value === "__none__" ? "" : value }))}
                        options={toOptions([
                          { value: "__none__", label: "Pilih tipe ODP" },
                          ...odpTypes.map((item) => ({
                            value: item.odp_type_name,
                            label: [item.odp_type_name, item.odp_type_code].filter(Boolean).join(" - "),
                          })),
                        ])}
                        placeholder="Pilih tipe ODP"
                        searchPlaceholder="Cari tipe ODP..."
                      />
                    </div>
                    <div className="space-y-1.5">
                      <FieldLabel label="Jenis Instalasi" tooltip="Pilih jenis instalasi dari master data." />
                      <Combobox
                        value={form.installation_type || "__none__"}
                        onValueChange={(value) => setForm((p) => ({ ...p, installation_type: value === "__none__" ? "" : value }))}
                        options={toOptions([
                          { value: "__none__", label: "Pilih jenis instalasi" },
                          ...installationTypes.map((item) => ({
                            value: item.installation_type_name,
                            label: [item.installation_type_name, item.installation_type_code].filter(Boolean).join(" - "),
                          })),
                        ])}
                        placeholder="Pilih jenis instalasi"
                        searchPlaceholder="Cari jenis instalasi..."
                      />
                    </div>
                  </>
                ) : null}
                <div className="space-y-1.5">
                  <FieldLabel label="POP (opsional)" tooltip="Hubungkan device ke POP jika perangkat berada di POP tertentu." />
                  <Combobox
                    value={form.pop_id || "__none__"}
                    onValueChange={(v) => setForm((p) => ({ ...p, pop_id: v === "__none__" ? "" : v }))}
                    options={toOptions([
                      { value: "__none__", label: "None" },
                      ...pops
                        .filter((p) => !form.region_id || p.region_id === form.region_id)
                        .map((pop) => ({
                          value: pop.id,
                          label: `${pop.pop_name} (${pop.pop_code})`,
                        })),
                    ])}
                    placeholder="Pilih POP"
                    searchPlaceholder="Cari POP..."
                  />
                </div>
              </>
            ) : null}

            {isRoute ? (
              <>
                <Field label="Route Name" value={form.route_name} onChange={(v) => setForm((p) => ({ ...p, route_name: v }))} />
                <div className="space-y-1.5">
                  <FieldLabel label="Route Type" tooltip="Pilih dari master Route Types. Kelola opsinya di Tata Kelola Master Data." />
                  <Combobox
                    value={form.route_type || "__none__"}
                    onValueChange={(value) => setForm((p) => ({ ...p, route_type: value === "__none__" ? "" : value }))}
                    options={toOptions([
                      { value: "__none__", label: "None" },
                      ...routeTypes.map((item) => ({
                        value: item.route_type_code || item.route_type_name,
                        label: item.route_type_code ? `${item.route_type_name} (${item.route_type_code})` : item.route_type_name,
                      })),
                    ])}
                    placeholder="Pilih route type"
                    searchPlaceholder="Cari route type..."
                  />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel label="POP (opsional)" tooltip="Titik POP utama untuk route ini." />
                  <Combobox
                    value={form.pop_id || "__none__"}
                    onValueChange={(v) => setForm((p) => ({ ...p, pop_id: v === "__none__" ? "" : v }))}
                    options={toOptions([
                      { value: "__none__", label: "None" },
                      ...pops
                        .filter((p) => !form.region_id || p.region_id === form.region_id)
                        .map((pop) => ({
                          value: pop.id,
                          label: `${pop.pop_name} (${pop.pop_code})`,
                        })),
                    ])}
                    placeholder="Pilih POP"
                    searchPlaceholder="Cari POP..."
                  />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel label="Project (opsional)" tooltip="Project delivery yang menaungi route ini." />
                  <Combobox
                    value={form.route_project_id || "__none__"}
                    onValueChange={(v) => setForm((p) => ({ ...p, route_project_id: v === "__none__" ? "" : v }))}
                    options={toOptions([
                      { value: "__none__", label: "None" },
                      ...projects
                        .filter((item) => !form.region_id || !item.region_id || item.region_id === form.region_id)
                        .map((item) => ({
                          value: item.id,
                          label: item.project_name || item.project_code || item.id,
                        })),
                    ])}
                    placeholder="Pilih project"
                    searchPlaceholder="Cari project..."
                  />
                </div>
                <Field
                  label="Distance (meters)"
                  type="number"
                  value={form.distance_meters}
                  onChange={(v) => setForm((p) => ({ ...p, distance_meters: v }))}
                />
              </>
            ) : null}

            {isProject ? (
              <>
                <Field label="Project Name" value={form.project_name} onChange={(v) => setForm((p) => ({ ...p, project_name: v }))} />
                <Field label="Vendor Name" value={form.vendor_name} onChange={(v) => setForm((p) => ({ ...p, vendor_name: v }))} />
                <Field label="BAST Number" value={form.bast_number} onChange={(v) => setForm((p) => ({ ...p, bast_number: v }))} />
                <Field label="SPK Number" value={form.spk_number} onChange={(v) => setForm((p) => ({ ...p, spk_number: v }))} />
                <div className="space-y-1.5">
                  <FieldLabel label="POP (opsional)" tooltip="POP utama project." />
                  <Combobox
                    value={form.pop_id || "__none__"}
                    onValueChange={(v) => setForm((p) => ({ ...p, pop_id: v === "__none__" ? "" : v }))}
                    options={toOptions([
                      { value: "__none__", label: "None" },
                      ...pops
                        .filter((p) => !form.region_id || p.region_id === form.region_id)
                        .map((pop) => ({
                          value: pop.id,
                          label: `${pop.pop_name} (${pop.pop_code})`,
                        })),
                    ])}
                    placeholder="Pilih POP"
                    searchPlaceholder="Cari POP..."
                  />
                </div>
                <Field
                  label="Description"
                  value={form.project_description}
                  onChange={(v) => setForm((p) => ({ ...p, project_description: v }))}
                  containerClassName={sectionSpanClass}
                />
                <Field label="Start Date" type="date" value={form.start_date} onChange={(v) => setForm((p) => ({ ...p, start_date: v }))} />
                <Field label="End Date" type="date" value={form.end_date} onChange={(v) => setForm((p) => ({ ...p, end_date: v }))} />
                <Field label="Budget Value" type="number" value={form.budget_value} onChange={(v) => setForm((p) => ({ ...p, budget_value: v }))} />
              </>
            ) : null}

            {isCustomer ? (
              <>
                <Field label="Customer Name" value={form.customer_name} onChange={(v) => setForm((p) => ({ ...p, customer_name: v }))} />
                <Field label="Customer Number" value={form.customer_number} onChange={(v) => setForm((p) => ({ ...p, customer_number: v }))} />
                <Field label="Service Type" value={form.service_type} onChange={(v) => setForm((p) => ({ ...p, service_type: v }))} placeholder="internet / metro / dedicated" />
                <Field label="Contact Name" value={form.contact_name} onChange={(v) => setForm((p) => ({ ...p, contact_name: v }))} />
                <Field label="Contact Phone" value={form.contact_phone} onChange={(v) => setForm((p) => ({ ...p, contact_phone: v }))} />
                <Field label="Email" type="email" value={form.email} onChange={(v) => setForm((p) => ({ ...p, email: v }))} />
                <div className="space-y-1.5">
                  <FieldLabel label="POP (opsional)" tooltip="POP atau site terdekat dengan lokasi customer." />
                  <Combobox
                    value={form.pop_id || "__none__"}
                    onValueChange={(v) => setForm((p) => ({ ...p, pop_id: v === "__none__" ? "" : v }))}
                    options={toOptions([
                      { value: "__none__", label: "None" },
                      ...pops
                        .filter((p) => !form.region_id || p.region_id === form.region_id)
                        .map((pop) => ({
                          value: pop.id,
                          label: `${pop.pop_name} (${pop.pop_code})`,
                        })),
                    ])}
                    placeholder="Pilih POP"
                    searchPlaceholder="Cari POP..."
                  />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel label="Project (opsional)" tooltip="Project delivery atau aktivasi yang terkait dengan customer ini." />
                  <Combobox
                    value={form.customer_project_id || "__none__"}
                    onValueChange={(v) => setForm((p) => ({ ...p, customer_project_id: v === "__none__" ? "" : v }))}
                    options={toOptions([
                      { value: "__none__", label: "None" },
                      ...projects
                        .filter((item) => !form.region_id || !item.region_id || item.region_id === form.region_id)
                        .map((item) => ({
                          value: item.id,
                          label: item.project_name || item.project_code || item.id,
                        })),
                    ])}
                    placeholder="Pilih project"
                    searchPlaceholder="Cari project..."
                  />
                </div>
              </>
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

            <div className="space-y-1.5">
              <FieldLabel
                label="Status"
                tooltip={
                  isPop
                    ? "Status operasional POP."
                    : isRoute
                    ? "Status progress route."
                    : isProject
                    ? "Status progress project."
                    : isCustomer
                    ? "Status layanan customer."
                    : "Status lifecycle perangkat."
                }
              />
              <Combobox
                value={isPop ? form.status_pop : isRoute ? form.route_status : isProject ? form.project_status : isCustomer ? form.customer_status : form.status}
                onValueChange={(v) =>
                  setForm((p) =>
                    isPop
                      ? { ...p, status_pop: v }
                      : isRoute
                      ? { ...p, route_status: v }
                      : isProject
                      ? { ...p, project_status: v }
                      : isCustomer
                      ? { ...p, customer_status: v }
                      : { ...p, status: v },
                  )
                }
                options={
                  isPop
                    ? toOptions([
                        { value: "planning", label: "planning" },
                        { value: "active", label: "active" },
                        { value: "inactive", label: "inactive" },
                        { value: "maintenance", label: "maintenance" },
                      ])
                    : isRoute
                    ? toOptions([
                        { value: "planning", label: "planning" },
                        { value: "active", label: "active" },
                        { value: "maintenance", label: "maintenance" },
                        { value: "closed", label: "closed" },
                      ])
                    : isProject
                    ? toOptions([
                        { value: "planning", label: "planning" },
                        { value: "running", label: "running" },
                        { value: "done", label: "done" },
                        { value: "hold", label: "hold" },
                        { value: "cancelled", label: "cancelled" },
                      ])
                    : isCustomer
                    ? toOptions([
                        { value: "prospect", label: "prospect" },
                        { value: "active", label: "active" },
                        { value: "suspend", label: "suspend" },
                        { value: "inactive", label: "inactive" },
                        { value: "terminated", label: "terminated" },
                      ])
                    : toOptions([
                        { value: "draft", label: "draft" },
                        { value: "installed", label: "installed" },
                        { value: "active", label: "active" },
                        { value: "inactive", label: "inactive" },
                        { value: "maintenance", label: "maintenance" },
                        { value: "retired", label: "retired" },
                      ])
                }
                placeholder="Pilih status"
                searchPlaceholder="Cari status..."
              />
            </div>

            {isDevice || isCustomer ? (
              <Field
                label="Installation Date"
                type="date"
                value={form.installation_date}
                onChange={(v) => setForm((p) => ({ ...p, installation_date: v }))}
              />
            ) : null}

            {isPop || isDevice ? (
              <>
                <div className="space-y-1.5">
                  <FieldLabel label="Validation Status" tooltip="Status hasil validasi lapangan/meja. Jika bukan unvalidated, sebaiknya isi Validation Date." />
                  <Combobox
                    value={form.validation_status}
                    onValueChange={(v) => setForm((p) => ({ ...p, validation_status: v }))}
                    options={toOptions([
                      { value: "unvalidated", label: "unvalidated" },
                      { value: "valid", label: "valid" },
                      { value: "warning", label: "warning" },
                      { value: "invalid", label: "invalid" },
                    ])}
                    placeholder="Pilih status validasi"
                    searchPlaceholder="Cari status validasi..."
                  />
                </div>

                <Field
                  label="Validation Date"
                  type="date"
                  value={form.validation_date}
                  onChange={(v) => setForm((p) => ({ ...p, validation_date: v }))}
                />
              </>
            ) : null}

            {isPop || isProject || showDeviceImageField ? (
              <div className={`${sectionSpanClass} ${sectionLabelClass}`}>
                Lampiran Gambar
              </div>
            ) : null}

            {isDevice ? (
              <>
                <div className={`${sectionSpanClass} ${sectionLabelClass}`}>
                  Identitas Perangkat
                </div>
                <div className="space-y-1.5">
                  <FieldLabel label="Manufacturer" tooltip="Pilih manufacturer dari master data." />
                  <Combobox
                    value={form.manufacturer_id || "__none__"}
                    onValueChange={(value) => {
                      if (value === "__none__") {
                        setForm((p) => ({ ...p, manufacturer_id: "", brand_id: "", model_id: "" }));
                        return;
                      }
                      setForm((p) => ({ ...p, manufacturer_id: value, brand_id: "", model_id: "" }));
                    }}
                    options={toOptions([
                      { value: "__none__", label: "Pilih manufacturer" },
                      ...manufacturers.map((item) => ({
                        value: item.id,
                        label: item.manufacturer_name || item.manufacturer_code || item.id,
                      })),
                    ])}
                    placeholder="Pilih manufacturer"
                    searchPlaceholder="Cari manufacturer..."
                  />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel label="Brand" tooltip="Pilih brand dari master data (opsional filter by manufacturer)." />
                  <Combobox
                    value={form.brand_id || "__none__"}
                    onValueChange={(value) => {
                      if (value === "__none__") {
                        setForm((p) => ({ ...p, brand_id: "", model_id: "" }));
                        return;
                      }
                      setForm((p) => ({ ...p, brand_id: value, model_id: "" }));
                    }}
                    options={toOptions([
                      { value: "__none__", label: "Pilih brand" },
                      ...brands
                        .filter((item) => !form.manufacturer_id || !item.manufacturer_id || item.manufacturer_id === form.manufacturer_id)
                        .map((item) => ({
                          value: item.id,
                          label: item.brand_name || item.brand_code || item.id,
                        })),
                    ])}
                    placeholder="Pilih brand"
                    searchPlaceholder="Cari brand..."
                  />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel label="Model" tooltip="Pilih model dari master data (opsional filter by brand/manufacturer)." />
                  <Combobox
                    value={form.model_id || "__none__"}
                    onValueChange={(value) => setForm((p) => ({ ...p, model_id: value === "__none__" ? "" : value }))}
                    options={toOptions([
                      { value: "__none__", label: "Pilih model" },
                      ...assetModels
                        .filter((item) => !form.brand_id || !item.brand_id || item.brand_id === form.brand_id)
                        .filter((item) => !form.manufacturer_id || !item.manufacturer_id || item.manufacturer_id === form.manufacturer_id)
                        .map((item) => ({
                          value: item.id,
                          label: item.model_name || item.model_code || item.id,
                        })),
                    ])}
                    placeholder="Pilih model"
                    searchPlaceholder="Cari model..."
                  />
                </div>
                <Field
                  label="Serial Number"
                  value={form.serial_number}
                  onChange={(v) => setForm((p) => ({ ...p, serial_number: v }))}
                  placeholder="Nomor serial perangkat"
                />
              </>
            ) : null}

            {isPop ? (
              <>
                <Field label="Tenant" value={form.tenant} onChange={(v) => setForm((p) => ({ ...p, tenant: v }))} />
                <Field
                  label="PLN CID Number"
                  value={form.pln_cid_number}
                  onChange={(v) => setForm((p) => ({ ...p, pln_cid_number: v }))}
                />
                <Field
                  label="PLN Payment Method"
                  value={form.pln_payment_method}
                  onChange={(v) => setForm((p) => ({ ...p, pln_payment_method: v }))}
                  placeholder="prepaid / postpaid"
                />
                <Field
                  label="PLN Phase"
                  value={form.pln_phase}
                  onChange={(v) => setForm((p) => ({ ...p, pln_phase: v }))}
                  placeholder="1 phase / 3 phase"
                />
                <Field
                  label="PLN Wattage"
                  type="number"
                  value={form.pln_wattage}
                  onChange={(v) => setForm((p) => ({ ...p, pln_wattage: v }))}
                />
                <div className="space-y-1.5">
                  <FieldLabel label="POP Type" tooltip="Pilih dari master POP Types. Kelola opsinya di Tata Kelola Master Data." />
                  <Combobox
                    value={form.pop_type_id || "__none__"}
                    onValueChange={(value) => {
                      if (value === "__none__") {
                        setForm((p) => ({ ...p, pop_type_id: "", pop_type: "" }));
                        return;
                      }
                      const selected = popTypes.find((item) => item.id === value);
                      setForm((p) => ({
                        ...p,
                        pop_type_id: value,
                        pop_type: selected?.pop_type_name || p.pop_type,
                      }));
                    }}
                    options={toOptions([
                      { value: "__none__", label: "None" },
                      ...popTypes.map((item) => ({
                        value: item.id,
                        label: item.pop_type_code ? `${item.pop_type_name} (${item.pop_type_code})` : item.pop_type_name,
                      })),
                    ])}
                    placeholder="Pilih POP type"
                    searchPlaceholder="Cari POP type..."
                  />
                </div>
                <Field
                  label="Tanggal POP Aktif"
                  type="date"
                  value={form.tanggal_pop_aktif}
                  onChange={(v) => setForm((p) => ({ ...p, tanggal_pop_aktif: v }))}
                />
                <Field
                  label="Tags (comma separated)"
                  value={form.tags}
                  onChange={(v) => setForm((p) => ({ ...p, tags: v }))}
                  placeholder="jabodebek,core,premium"
                  containerClassName={sectionSpanClass}
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
                  <FieldLabel label="Support Documents" tooltip="Upload dokumen pendukung POP: image, excel, word, atau pdf." />
                  <Input
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.xls,.xlsx,image/*"
                    onChange={(event) => setSupportFiles(Array.from(event.target.files || []))}
                  />
                  <p className="text-xs text-muted-foreground">Format: image, excel, word, pdf</p>
                  {supportFiles.length ? (
                    <ul className="space-y-1 text-xs text-muted-foreground">
                      {supportFiles.map((file) => (
                        <li key={`${file.name}-${file.size}`}>{file.name}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </>
            ) : null}

            {isProject ? (
              <>
                <div className={`space-y-1.5 ${sectionSpanClass}`}>
                  <ImageAttachmentField
                    label="Image Attachments"
                    tooltip="Upload maksimal 10 foto project (masing-masing max 5MB). Gambar pertama jadi primary image."
                    files={imageFiles}
                    previewUrls={imagePreviewUrls}
                    onChange={handleImageFilesChange}
                    onRemove={removeImageAt}
                    onClear={clearImages}
                  />
                </div>
                <div className={`space-y-1.5 ${sectionSpanClass}`}>
                  <FieldLabel label="Document Attachments" tooltip="Upload dokumen pendukung project: image, excel, word, atau pdf." />
                  <Input
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.xls,.xlsx,image/*"
                    onChange={(event) => setSupportFiles(Array.from(event.target.files || []))}
                  />
                  <p className="text-xs text-muted-foreground">Format: image, excel, word, pdf</p>
                  {supportFiles.length ? (
                    <ul className="space-y-1 text-xs text-muted-foreground">
                      {supportFiles.map((file) => (
                        <li key={`${file.name}-${file.size}`}>{file.name}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </>
            ) : null}

            {isRoute || isProject || isCustomer ? (
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
                  tooltip="Upload maksimal 10 foto perangkat (masing-masing max 5MB). Gambar pertama jadi primary image."
                  files={imageFiles}
                  previewUrls={imagePreviewUrls}
                  onChange={handleImageFilesChange}
                  onRemove={removeImageAt}
                  onClear={clearImages}
                />
              </div>
            ) : null}

            {showCoreFields ? (
              <>
                <Field
                  label="Capacity Core"
                  type="number"
                  value={form.capacity_core}
                  onChange={(v) => setForm((p) => ({ ...p, capacity_core: v }))}
                />
                <Field
                  label="Used Core"
                  type="number"
                  value={form.used_core}
                  onChange={(v) => setForm((p) => ({ ...p, used_core: v }))}
                />
              </>
            ) : null}

            {showPortFields ? (
              <>
                {needsPortPresetSelector ? (
                  <div className="space-y-1.5">
                    <FieldLabel
                      label={form.device_type_key === "ODP" ? "Kapasitas ODP" : "Total Ports"}
                      tooltip="Untuk splitter ratio 1:16 ke atas, pilih jumlah port aktual terpasang di lapangan."
                    />
                    <Combobox
                      value={form.total_ports || "__none__"}
                      onValueChange={(value) => setForm((p) => ({ ...p, total_ports: value === "__none__" ? "" : value }))}
                      options={toOptions([
                        { value: "__none__", label: "Pilih total port" },
                        ...splitterPortPresetOptions.map((port) => ({ value: String(port), label: `${port} port` })),
                      ])}
                      placeholder="Pilih total port"
                      searchPlaceholder="Cari total port..."
                    />
                  </div>
                ) : (
                  <Field
                    label={form.device_type_key === "ODP" ? "Kapasitas ODP" : "Total Ports"}
                    type="number"
                    value={form.total_ports}
                    onChange={(v) => setForm((p) => ({ ...p, total_ports: v }))}
                  />
                )}
                <Field
                  label={form.device_type_key === "ODP" ? "Port Aktif" : "Used Ports"}
                  type="number"
                  value={form.used_ports}
                  onChange={(v) => setForm((p) => ({ ...p, used_ports: v }))}
                />
              </>
            ) : null}

            {showSplitterField ? (
              <div className="space-y-1.5">
                <FieldLabel label={form.device_type_key === "ODP" ? "Kapasitas Splitter" : "Splitter Ratio"} tooltip="Pilih rasio splitter dari master data." />
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
                    ...splitterProfiles.map((item) => ({
                      value: item.ratio_label,
                      label: item.output_port_count ? `${item.ratio_label} (${item.output_port_count} port)` : item.ratio_label,
                    })),
                  ])}
                  placeholder="Pilih splitter ratio"
                  searchPlaceholder="Cari splitter ratio..."
                />
              </div>
            ) : null}

            <div className={`${sectionSpanClass} ${sectionLabelClass}`}>
              Lokasi
            </div>
            <Field
              label="Address"
              value={form.address}
              onChange={(v) => setForm((p) => ({ ...p, address: v }))}
              containerClassName={sectionSpanClass}
            />
            <div className="space-y-1.5">
              <FieldLabel label="Province (Master)" tooltip="Pilih provinsi dari master data." />
              <Combobox
                value={form.province_id || "__none__"}
                onValueChange={(value) => {
                  if (value === "__none__") {
                    setForm((p) => ({ ...p, province_id: "", province: "", city_id: "", city: "" }));
                    return;
                  }
                  const selected = provinces.find((item) => item.id === value);
                  setForm((p) => ({
                    ...p,
                    province_id: value,
                    province: selected?.province_name || p.province,
                    city_id: "",
                    city: "",
                  }));
                }}
                options={toOptions([
                  { value: "__none__", label: "Pilih provinsi" },
                  ...provinces.map((item) => ({
                    value: item.id,
                    label: item.province_name,
                  })),
                ])}
                placeholder="Pilih provinsi"
                searchPlaceholder="Cari provinsi..."
              />
            </div>
            <div className="space-y-1.5">
              <FieldLabel label="City/Kabupaten (Master)" tooltip="Pilih kota/kabupaten berdasarkan provinsi." />
              <Combobox
                key={`city-${form.province_id || "none"}`}
                value={form.city_id || "__none__"}
                onValueChange={(value) => {
                  if (value === "__none__") {
                    setForm((p) => ({ ...p, city_id: "", city: "" }));
                    return;
                  }
                  const selected = cities.find((item) => item.id === value);
                  setForm((p) => ({
                    ...p,
                    city_id: value,
                    city: selected?.city_name || p.city,
                  }));
                }}
                disabled={!form.province_id}
                options={toOptions([
                  { value: "__none__", label: "Pilih kota/kabupaten" },
                  ...cities
                    .filter((item) => !form.province_id || item.province_id === form.province_id)
                    .map((item) => ({
                      value: item.id,
                      label: item.city_name,
                    })),
                ])}
                placeholder="Pilih kota/kabupaten"
                searchPlaceholder="Cari kota/kabupaten..."
              />
            </div>
            {!isProject ? (
              <>
                <CoordinateField
                  label="Longitude"
                  value={form.longitude}
                  onChange={(v) => setForm((p) => ({ ...p, longitude: v }))}
                  kind="longitude"
                />
                <CoordinateField
                  label="Latitude"
                  value={form.latitude}
                  onChange={(v) => setForm((p) => ({ ...p, latitude: v }))}
                  kind="latitude"
                />
              </>
            ) : null}
          </div>

          {isPop || isDevice ? (
            <div className="space-y-3 rounded-lg border p-3">
              <Separator />
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">Custom Fields</p>
                  <p className="text-xs text-muted-foreground">Khusus untuk data {isPop ? "POP" : "Device"} yang sedang dibuat.</p>
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

          <div className="flex justify-end">
            <Button onClick={() => void submit()} disabled={saving || Boolean(approvalNotice)}>
              {saving ? "Menyimpan..." : isPop ? "Simpan POP" : isRoute ? "Simpan Route" : isProject ? "Simpan Project" : isCustomer ? "Simpan Customer" : "Simpan Device"}
            </Button>
          </div>
        </CardContent>
      </Card>

        <AlertDialog open={Boolean(approvalNotice)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{approvalNotice?.title || "Request approval terkirim"}</AlertDialogTitle>
              <AlertDialogDescription>
                {approvalNotice?.description}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction
                onClick={() => {
                  const target = approvalNotice?.redirectTo || "/data-management";
                  setApprovalNotice(null);
                  router.push(target);
                }}
              >
                Kembali ke list
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

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

function ImageAttachmentField({
  label,
  tooltip,
  files,
  previewUrls,
  onChange,
  onRemove,
  onClear,
}: {
  label: string;
  tooltip: string;
  files: File[];
  previewUrls: string[];
  onChange: (files: FileList | null) => void;
  onRemove: (index: number) => void;
  onClear: () => void;
}) {
  return (
    <div className="space-y-2">
      <FieldLabel label={label} tooltip={tooltip} />
      <Input type="file" accept="image/*" multiple onChange={(event) => onChange(event.target.files)} />
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <ImagePlus className="size-3.5" />
        Maksimal {MAX_IMAGE_ATTACHMENTS} file, masing-masing max 5MB.
      </div>

      {files.length ? (
        <div className="space-y-2 rounded-lg border bg-muted/20 p-2">
          <div className="flex items-center justify-between">
            <Badge variant="secondary">{files.length} file dipilih</Badge>
            <Button type="button" variant="ghost" size="sm" onClick={onClear}>
              <Trash2 className="mr-1 size-4" />
              Clear
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 sm:gap-2 md:grid-cols-5 lg:grid-cols-6">
            {files.map((file, index) => (
              <div key={`${file.name}-${file.size}-${index}`} className="relative overflow-hidden rounded-md border bg-background">
                {previewUrls[index] ? (
                  <Image
                    src={previewUrls[index]}
                    alt={file.name}
                    width={320}
                    height={96}
                    unoptimized
                    className="h-14 w-full object-cover sm:h-16 md:h-20"
                  />
                ) : (
                  <div className="h-14 w-full bg-muted sm:h-16 md:h-20" />
                )}
                <div className="space-y-1 p-1.5">
                  <p className="truncate text-[10px] text-muted-foreground">{file.name}</p>
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="destructive"
                  className="absolute right-1 top-1 size-5 sm:size-6"
                  onClick={() => onRemove(index)}
                >
                  <X className="size-3 sm:size-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  tooltip,
  containerClassName,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  tooltip?: string;
  containerClassName?: string;
}) {
  return (
    <div className={`space-y-1.5 ${containerClassName || ""}`}>
      <FieldLabel label={label} tooltip={tooltip || getDefaultTooltip(label)} />
      <Input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </div>
  );
}

function CoordinateField({
  label,
  value,
  onChange,
  kind,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  kind: "longitude" | "latitude";
}) {
  const validation = validateCoordinateFormat(value, kind);
  const placeholder = kind === "latitude" ? "-6.200000" : "106.816666";

  return (
    <div className="space-y-1.5">
      <FieldLabel
        label={label}
        tooltip={
          kind === "latitude"
            ? "Format: -x.xxxxxx (contoh: -6.200000). Wajib minus di depan, minimal 6 digit desimal."
            : "Format: xxx.xxxxxx (contoh: 106.816666). Tiga digit di depan, minimal 6 digit desimal."
        }
      />
      <Input type="text" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
      {validation.state !== "idle" ? (
        <Badge variant="outline" className={`${validation.state === "valid" ? "border-emerald-300 text-emerald-700" : "border-rose-300 text-rose-700"} h-4 w-fit gap-0.5 px-1.5 text-[10px]`}>
          {validation.state === "valid" ? <CheckCircle2 className="mr-0.5 size-3" /> : <XCircle className="mr-0.5 size-3" />}
          {validation.message}
        </Badge>
      ) : null}
    </div>
  );
}

function FieldLabel({ label, tooltip }: { label: string; tooltip?: string | null }) {
  if (!tooltip) {
    return <Label>{label}</Label>;
  }

  return (
    <div className="flex items-center gap-1.5">
      <Label>{label}</Label>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" className="text-muted-foreground hover:text-foreground" aria-label={`Info ${label}`}>
              <CircleHelp className="size-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={6}>
            {tooltip}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

function getDefaultTooltip(label: string) {
  const map: Record<string, string> = {
    "POP Name": "Nama POP yang mudah dikenali di lapangan dan laporan.",
    "POP Code (3 huruf)": "Kode singkat 3 huruf unik per POP, contoh CBO.",
    "Device Name": "Nama perangkat sesuai penamaan operasional.",
    "Customer Name": "Nama pelanggan atau titik layanan.",
    "Customer Number": "Nomor pelanggan dari sistem billing/CRM jika tersedia.",
    "Service Type": "Jenis layanan customer, misalnya internet, metro, atau dedicated.",
    "Contact Name": "Nama PIC customer yang dapat dihubungi.",
    "Contact Phone": "Nomor telepon PIC customer.",
    "BAST Number": "Nomor BAST untuk referensi serah terima project.",
    "SPK Number": "Nomor SPK untuk referensi kontrak pekerjaan.",
    "Validation Date": "Tanggal validasi terakhir untuk data ini.",
    Tenant: "Nama tenant/penyewa site POP jika ada.",
    "PLN CID Number": "Nomor pelanggan listrik PLN untuk POP.",
    "PLN Payment Method": "Metode pembayaran listrik, misalnya prepaid/postpaid.",
    "PLN Phase": "Jenis phase listrik, misalnya 1 phase atau 3 phase.",
    "PLN Wattage": "Daya listrik terpasang pada POP dalam watt.",
    "POP Type": "Klasifikasi POP, misalnya core/distribution/edge.",
    "Tanggal POP Aktif": "Tanggal POP mulai beroperasi aktif.",
    "Tags (comma separated)": "Tag dipisahkan koma untuk pencarian/filter data.",
    "Capacity Core": "Total kapasitas core pada perangkat.",
    "Used Core": "Jumlah core yang sudah dipakai.",
    "Total Ports": "Total port yang tersedia pada perangkat.",
    "Used Ports": "Jumlah port yang sudah terpakai.",
    "Splitter Ratio": "Rasio splitter perangkat ODP, misalnya 1:8.",
    Address: "Alamat lengkap lokasi POP/perangkat.",
    City: "Kota/Kabupaten lokasi.",
    Province: "Provinsi lokasi.",
    Longitude: "Koordinat bujur lokasi.",
    Latitude: "Koordinat lintang lokasi.",
    Title: "Judul yang ditampilkan untuk custom field.",
    "Field Key": "Kode internal custom field (snake_case), dipakai sebagai key data.",
    "Options (CSV)": "Opsi nilai untuk select/multiselect, pisahkan dengan koma.",
    "Help Text": "Bantuan singkat yang akan tampil sebagai tooltip field.",
  };
  return map[label] || "";
}

function nullIfEmpty(value: string) {
  return value.trim() ? value.trim() : null;
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

function toDeviceSlug(type: string) {
  const normalized = type.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return normalized || "olt";
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
      <textarea
        className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring min-h-20 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
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
