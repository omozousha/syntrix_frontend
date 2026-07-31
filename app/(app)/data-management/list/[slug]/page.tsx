"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import QRCode from "qrcode";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Box,
  Boxes,
  Cable,
  CircleDot,
  Eye,
  HardDrive,
  Monitor,
  Network,
  Pencil,
  RadioTower,
  RotateCcw,
  Router as RouterIcon,
  Server,
  Split,
  Trash2,
  Waypoints,
  type LucideIcon,
} from "lucide-react";
import { AppLoading } from "@/components/app-loading-new";
import { DataBulkActions } from "@/components/features/data-management/device-list/data-bulk-actions";
import { DataEmptyState } from "@/components/features/data-management/device-list/data-empty-state";
import { DataListFilterBar } from "@/components/features/data-management/device-list/data-list-filter-bar";
import { DataListHeader } from "@/components/features/data-management/device-list/data-list-header";
import { OdpCreateModeDialog } from "@/components/features/data-management/device-list/odp-create-mode-dialog";
import { DataListKpiStrip } from "@/components/features/data-management/device-list/data-list-kpi-strip";
import { DataMobileList } from "@/components/features/data-management/device-list/data-mobile-list";
import { DataTableView } from "@/components/features/data-management/device-list/data-table-view";
import { MasterDataQuickEditSheet } from "@/components/features/data-management/master-data-quick-edit-sheet";
import { MasterDataUsageCheckDialog, MasterDataDeleteConfirmDialog } from "@/components/features/data-management/master-data-delete-dialog";
import { MasterDataRenameDialog } from "@/components/features/data-management/master-data-rename-dialog";
import { Badge } from "@/components/ui/badge";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import { ContextMenuItem, ContextMenuLabel, ContextMenuSeparator } from "@/components/ui/context-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useSession } from "@/components/session-context";
import { apiFetch, type PaginatedResponse } from "@/lib/api";
import { buildCategoryApiPath, getCategoryBySlug } from "@/lib/data-management-config";
import { MASTER_DATA_FORM_CONFIG } from "@/lib/master-data-form-config";
import { MasterDataFormFields, type LookupOptions } from "@/components/features/master-data/master-data-form-renderer";
import { buildDeviceListDisplay, type DeviceListLookupMaps } from "@/lib/display-adapters/device-list-display-adapter";
import { buildDeviceQrHref, drawQrLabelPdf, formatQrPopLabel, loadQrLabelLogoDataUrl, loadQrLabelSettings } from "@/lib/qr-label";
import { mapValidationStatus } from "@/lib/validation-status";
import {
  type GenericItem,
  pick,
  normalizeHexColor,
  formatDateTime,
  isArchived,
  mapLookupToOptions,
  resolveRelationName,
  sanitizeFileName,
  getApprovalRequestId,
  canWriteResource,
  supportsIsActiveResource,
  supportsSoftDeleteResource,
  supportsPopFilterResource,
  supportsProjectFilterResource,
  getRenameConfig,
  getCreateDefaults,
  buildCreatePayload,
  buildEditFormFromItem,
} from "@/lib/master-data-helpers";

const APP_BASE_URL = process.env.NEXT_PUBLIC_APP_BASE_URL?.trim() || "";

type LookupOption = { id: string; label: string };
type PopFilterOption = LookupOption & { regionId: string };
type ProjectFilterOption = LookupOption & { regionId: string; popId: string };
type ApprovalResponse = {
  approval_request?: {
    request_id?: string | null;
    id?: string | null;
  } | null;
};
type RelationMaps = {
  manufacturers: Record<string, string>;
  brands: Record<string, string>;
  provinces: Record<string, string>;
  projects: Record<string, string>;
};
type BulkActionType = "delete" | "activate" | "deactivate" | "restore";
const DEVICE_ICON_OPTIONS = [
  { value: "HardDrive", label: "Generic Device" },
  { value: "Server", label: "OLT / Server" },
  { value: "Network", label: "Switch / Network" },
  { value: "Router", label: "Router" },
  { value: "Monitor", label: "ONT / Terminal" },
  { value: "Box", label: "Box / OTB" },
  { value: "Split", label: "Joint Closure" },
  { value: "Boxes", label: "Cabinet / ODC" },
  { value: "RadioTower", label: "ODP / Field Node" },
  { value: "Cable", label: "Cable" },
  { value: "CircleDot", label: "Node" },
];
const DEVICE_ICON_MAP: Record<string, LucideIcon> = {
  Box,
  Boxes,
  Cable,
  CircleDot,
  HardDrive,
  Monitor,
  Network,
  RadioTower,
  Router: RouterIcon,
  Server,
  Split,
};

function getDeviceIcon(iconName?: string | null) {
  return DEVICE_ICON_MAP[iconName || ""] || HardDrive;
}

function renderMasterForm(
  resource: string,
  form: Record<string, string>,
  setForm: (updater: (prev: Record<string, string>) => Record<string, string>) => void,
  lookups: { manufacturers: LookupOption[]; brands: LookupOption[]; provinces: LookupOption[]; assetTypes: LookupOption[] },
  _fieldErrors: Record<string, string>,
  _setFieldError: (field: string, msg: string) => void,
  _clearFieldError: (field: string) => void,
  _onBlur: ((field: { key: string; isKeyField?: boolean }, value: string) => void) | undefined,
  isEdit: boolean,
  _rows: GenericItem[],
  _currentEditId: string | undefined,
) {
  const config = MASTER_DATA_FORM_CONFIG[resource];
  if (!config) return null;

  const onBlurInternal = (field: { key: string; isKeyField?: boolean }, value: string) => {
    if (_onBlur) _onBlur(field, value);
    if (field.isKeyField && value.trim() && config.keyField) {
      const match = _rows.find((item) => {
        const itemVal = String(item[config.keyField ?? ""] ?? "").trim().toLowerCase();
        const targetVal = value.trim().toLowerCase();
        return itemVal === targetVal && item.id !== _currentEditId;
      });
      if (match) {
        _setFieldError(field.key, `"${value.trim()}" sudah terdaftar. Gunakan nilai yang berbeda.`);
      }
    }
  };

  const lookupOptions: LookupOptions = {
    manufacturers: lookups.manufacturers,
    brands: lookups.brands,
    provinces: lookups.provinces,
    assetTypes: lookups.assetTypes,
  };

  return (
    <MasterDataFormFields
      fields={config.fields}
      form={form}
      setForm={setForm}
      fieldErrors={_fieldErrors}
      setFieldError={_setFieldError}
      clearFieldError={_clearFieldError}
      lookups={lookupOptions}
      onBlur={onBlurInternal}
      isEdit={isEdit}
    />
  );
}

export default function DataManagementListPage() {
  const router = useRouter();
  const params = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();
  const popQueryParam = searchParams.get("pop_id") || "__all";
  const projectQueryParam = searchParams.get("project_id") || "__all";
  const slug = (params?.slug || "").toLowerCase();
  const category = useMemo(() => getCategoryBySlug(slug), [slug]);
  const { token, me } = useSession();

  const [rows, setRows] = useState<GenericItem[]>([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [provinceFilter, setProvinceFilter] = useState(searchParams.get("province_id") || "__all");
  const [directionFilter, setDirectionFilter] = useState("__all");
  const [popFilterOptions, setPopFilterOptions] = useState<PopFilterOption[]>([]);
  const [popFilterLoading, setPopFilterLoading] = useState(true);
  const [projectFilterOptions, setProjectFilterOptions] = useState<ProjectFilterOption[]>([]);
  const [projectFilterLoading, setProjectFilterLoading] = useState(true);
  const [archiveView, setArchiveView] = useState<"active" | "archived" | "all">("active");
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [refreshSeed, setRefreshSeed] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [renameTarget, setRenameTarget] = useState<GenericItem | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<GenericItem | null>(null);
  const [bulkActionRequest, setBulkActionRequest] = useState<{ action: BulkActionType; count: number } | null>(null);
  const [quickEditTarget, setQuickEditTarget] = useState<GenericItem | null>(null);
  const [quickEditForm, setQuickEditForm] = useState<Record<string, string>>({});
  const [quickEditError, setQuickEditError] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [odpModeDialogOpen, setOdpModeDialogOpen] = useState(false);
  const [createForm, setCreateForm] = useState<Record<string, string>>({});
  const [createError, setCreateError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  function setFieldError(field: string, msg: string) {
    setFieldErrors((prev) => ({ ...prev, [field]: msg }));
  }
  function clearFieldError(field: string) {
    setFieldErrors((prev) => { const next = { ...prev }; delete next[field]; return next; });
  }
  const [downloadingQr, setDownloadingQr] = useState(false);
  const [lookupOptions, setLookupOptions] = useState<{
    manufacturers: LookupOption[];
    brands: LookupOption[];
    provinces: LookupOption[];
    assetTypes: LookupOption[];
  }>({
    manufacturers: [],
    brands: [],
    provinces: [],
    assetTypes: [],
  });
  const [relationMaps, setRelationMaps] = useState<RelationMaps>({
    manufacturers: {},
    brands: {},
    provinces: {},
    projects: {},
  });
  const [usageCheck, setUsageCheck] = useState<{
    total: number;
    by_type: Record<string, { count: number; sample: Array<{ id: string; label: string }> }>;
  } | null>(null);
  const [usageLoading, setUsageLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const forceDeleteRef = useRef(false);

  const regionScopeIds = useMemo(
    () =>
      me.role === "user_region"
        ? (me.app_user.user_region_scopes || [])
            .map((scope) => String(scope.region_id || "").trim())
            .filter(Boolean)
        : [],
    [me],
  );
  const explicitRegionId = (searchParams.get("region_id") || "").trim();
  const isExplicitRegionInScope = regionScopeIds.includes(explicitRegionId);
  const defaultScopedRegionId = regionScopeIds[0] || "";
  const effectiveRegionScopeId =
    me.role === "user_region"
      ? (isExplicitRegionInScope ? explicitRegionId : defaultScopedRegionId)
      : explicitRegionId;
  const canWrite = canWriteResource(me.role, category?.resource || "");
  const canTraceTopology = me.role === "admin" || me.role === "user_all_region";
  const isMasterCategory = category?.group === "master";
  const canCreateMaster = canWrite && isMasterCategory && me.role === "admin";
  const canBulkToggleStatus = supportsIsActiveResource(category?.resource || "");
  const isSoftDeleteResource = supportsSoftDeleteResource(category?.resource || "");
  const supportsPopFilter = supportsPopFilterResource(category?.resource || "");
  const supportsProjectFilter = supportsProjectFilterResource(category?.resource || "");
  const supportsQrBulkDownload = category?.resource === "devices";
  const isOdpCategory = category?.resource === "devices" && String(category?.deviceTypeKey || "").toUpperCase() === "ODP";
  const renameConfig = getRenameConfig(category?.resource || "");
  const createDefaults = useMemo(() => getCreateDefaults(category?.resource || ""), [category?.resource]);
  const [activeTab, setActiveTab] = useState<"list" | "quality">("list");
  const handleFieldBlur = useCallback(
    async (field: { key: string; isKeyField?: boolean }, value: string) => {
      if (!field.isKeyField || !value.trim() || !category) return;
      try {
        const queryPath = `/${category.resource}?q=${encodeURIComponent(value.trim())}&limit=5`;
        const res = await apiFetch<PaginatedResponse<GenericItem>>(queryPath, { token });
        const match = (res.data || []).find((item) => {
          const itemVal = String(item[field.key] ?? "").trim().toLowerCase();
          const targetVal = value.trim().toLowerCase();
          const currentEditingId = quickEditTarget?.id || undefined;
          return itemVal === targetVal && item.id !== currentEditingId;
        });
        if (match) {
          setFieldError(field.key, `"${value.trim()}" sudah terdaftar. Gunakan nilai yang berbeda.`);
        }
      } catch {
        // Ignored on blur error
      }
    },
    [category, token, quickEditTarget],
  );
  const selectedPopLabel = useMemo(
    () => popFilterOptions.find((option) => option.id === popQueryParam)?.label || "",
    [popQueryParam, popFilterOptions],
  );
  const selectedProjectLabel = useMemo(
    () => projectFilterOptions.find((option) => option.id === projectQueryParam)?.label || "",
    [projectQueryParam, projectFilterOptions],
  );
  const popLabelById = useMemo(
    () =>
      popFilterOptions.reduce<Record<string, string>>((accumulator, option) => {
        accumulator[option.id] = option.label;
        return accumulator;
      }, {}),
    [popFilterOptions],
  );
  const listDisplayLookups = useMemo<DeviceListLookupMaps>(
    () => ({
      pops: popLabelById,
      projects: relationMaps.projects,
      manufacturers: relationMaps.manufacturers,
      brands: relationMaps.brands,
    }),
    [popLabelById, relationMaps],
  );
  const filterGridClass =
    category?.resource === "topologyRelationRules"
      ? "sm:grid-cols-4"
      : supportsPopFilter || supportsProjectFilter
      ? "sm:grid-cols-2 lg:grid-cols-5 xl:grid-cols-6"
      : category?.resource === "cities" || isSoftDeleteResource
      ? "sm:grid-cols-4"
      : "sm:grid-cols-3";
  const applyPopFilter = useCallback(
    (nextValue: string) => {
      setSelectedIds(new Set());
      setPage(1);

      const nextParams = new URLSearchParams(queryString);
      if (nextValue && nextValue !== "__all") nextParams.set("pop_id", nextValue);
      else nextParams.delete("pop_id");
      nextParams.delete("project_id");

      const nextQuery = nextParams.toString();
      if (nextQuery === queryString) return;
      router.replace(`/data-management/list/${slug}${nextQuery ? `?${nextQuery}` : ""}`, { scroll: false });
    },
    [queryString, router, slug],
  );
  const applyProjectFilter = useCallback(
    (nextValue: string) => {
      setSelectedIds(new Set());
      setPage(1);

      const nextParams = new URLSearchParams(queryString);
      if (nextValue && nextValue !== "__all") nextParams.set("project_id", nextValue);
      else nextParams.delete("project_id");

      const nextQuery = nextParams.toString();
      if (nextQuery === queryString) return;
      router.replace(`/data-management/list/${slug}${nextQuery ? `?${nextQuery}` : ""}`, { scroll: false });
    },
    [queryString, router, slug],
  );
  const resetListFilters = useCallback(() => {
    setSearch("");
    setSearchInput("");
    setProvinceFilter("__all");
    setDirectionFilter("__all");
    setArchiveView("active");
    setSelectedIds(new Set());
    setPage(1);

    const nextParams = new URLSearchParams(queryString);
    nextParams.delete("pop_id");
    nextParams.delete("project_id");
    nextParams.delete("province_id");
    const nextQuery = nextParams.toString();
    if (nextQuery === queryString) return;
    router.replace(`/data-management/list/${slug}${nextQuery ? `?${nextQuery}` : ""}`, { scroll: false });
  }, [queryString, router, slug]);

  useEffect(() => {
    if (category?.slug === "odp" && searchParams.get("triggerCreate") === "true") {
      setOdpModeDialogOpen(true);
      const nextParams = new URLSearchParams(window.location.search);
      nextParams.delete("triggerCreate");
      const nextQuery = nextParams.toString();
      router.replace(`/data-management/list/odp${nextQuery ? `?${nextQuery}` : ""}`, { scroll: false });
    }
  }, [category, searchParams, router]);

  useEffect(() => {
    if (!category) return;
    const activeCategory = category;
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError("");
      try {
        const basePath = buildCategoryApiPath(activeCategory, {
          page,
          limit,
          q: search,
          regionScopeId: effectiveRegionScopeId,
          popId: supportsPopFilter && popQueryParam !== "__all" ? popQueryParam : undefined,
          projectId: supportsProjectFilter && projectQueryParam !== "__all" ? projectQueryParam : undefined,
        });
        let path =
          activeCategory.resource === "cities" && provinceFilter !== "__all"
            ? `${basePath}&province_id=${encodeURIComponent(provinceFilter)}`
            : activeCategory.resource === "topologyRelationRules" && directionFilter !== "__all"
            ? `${basePath}&direction=${encodeURIComponent(directionFilter)}`
            : basePath;
        if (isSoftDeleteResource && archiveView !== "active") {
          path = `${path}&include_deleted=true`;
        }

        const result = await apiFetch<PaginatedResponse<GenericItem>>(
          path,
          { token },
        );
        if (cancelled) return;
        let nextRows = result.data || [];
        if (isSoftDeleteResource && archiveView === "archived") {
          nextRows = nextRows.filter((item) => isArchived(item));
        }
        setRows(nextRows);
        setTotal(archiveView === "active" ? (result.meta?.total ?? nextRows.length) : nextRows.length);
      } catch (err) {
        if (cancelled) return;
        setError((err as Error).message || "Gagal memuat data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [category, token, page, limit, search, effectiveRegionScopeId, provinceFilter, refreshSeed, archiveView, isSoftDeleteResource, supportsPopFilter, popQueryParam, supportsProjectFilter, projectQueryParam]);

  useEffect(() => {
    if (!supportsPopFilter) {
      setPopFilterOptions([]);
      setPopFilterLoading(false);
      return;
    }

    let cancelled = false;
    async function loadPopFilterOptions() {
      setPopFilterLoading(true);
      try {
        const query = new URLSearchParams({ page: "1", limit: "500" });
        if (effectiveRegionScopeId) query.set("region_id", effectiveRegionScopeId);
        const result = await apiFetch<PaginatedResponse<GenericItem>>(`/pops?${query.toString()}`, { token });
        if (cancelled) return;
        setPopFilterOptions(
          (result.data || []).map((item) => ({
            id: String(item.id),
            label: [item.pop_name, item.pop_code || item.pop_id].filter(Boolean).join(" | ") || "POP tidak tersedia",
            regionId: String(item.region_id || ""),
          })),
        );
      } catch {
        if (!cancelled) setPopFilterOptions([]);
      } finally {
        if (!cancelled) setPopFilterLoading(false);
      }
    }

    void loadPopFilterOptions();
    return () => {
      cancelled = true;
    };
  }, [effectiveRegionScopeId, supportsPopFilter, token]);

  useEffect(() => {
    if (!supportsPopFilter || popQueryParam === "__all" || popFilterLoading) return;
    const selectedPop = popFilterOptions.find((option) => option.id === popQueryParam);
    if (!selectedPop) {
      applyPopFilter("__all");
      return;
    }
    if (effectiveRegionScopeId && selectedPop.regionId && selectedPop.regionId !== effectiveRegionScopeId) {
      applyPopFilter("__all");
    }
  }, [applyPopFilter, effectiveRegionScopeId, supportsPopFilter, popQueryParam, popFilterLoading, popFilterOptions]);

  useEffect(() => {
    if (!supportsProjectFilter) {
      setProjectFilterOptions([]);
      setProjectFilterLoading(false);
      return;
    }

    let cancelled = false;
    async function loadProjectFilterOptions() {
      setProjectFilterLoading(true);
      try {
        const query = new URLSearchParams({ page: "1", limit: "500" });
        if (effectiveRegionScopeId) query.set("region_id", effectiveRegionScopeId);
        if (supportsPopFilter && popQueryParam !== "__all") query.set("pop_id", popQueryParam);
        const result = await apiFetch<PaginatedResponse<GenericItem>>(`/projects?${query.toString()}`, { token });
        if (cancelled) return;
        const options = (result.data || []).map((item) => ({
          id: String(item.id),
          label: [item.project_name, item.project_code || item.project_id].filter(Boolean).join(" | ") || "Project tidak tersedia",
          regionId: String(item.region_id || ""),
          popId: String(item.pop_id || ""),
        }));
        setProjectFilterOptions(options);
        setRelationMaps((previous) => ({
          ...previous,
          projects: options.reduce<Record<string, string>>((accumulator, option) => {
            accumulator[option.id] = option.label;
            return accumulator;
          }, {}),
        }));
      } catch {
        if (!cancelled) setProjectFilterOptions([]);
      } finally {
        if (!cancelled) setProjectFilterLoading(false);
      }
    }

    void loadProjectFilterOptions();
    return () => {
      cancelled = true;
    };
  }, [effectiveRegionScopeId, supportsProjectFilter, supportsPopFilter, popQueryParam, token]);

  useEffect(() => {
    if (!supportsProjectFilter || projectQueryParam === "__all" || projectFilterLoading) return;
    const selectedProject = projectFilterOptions.find((option) => option.id === projectQueryParam);
    if (!selectedProject) {
      applyProjectFilter("__all");
      return;
    }
    if (effectiveRegionScopeId && selectedProject.regionId && selectedProject.regionId !== effectiveRegionScopeId) {
      applyProjectFilter("__all");
      return;
    }
    if (supportsPopFilter && popQueryParam !== "__all" && selectedProject.popId && selectedProject.popId !== popQueryParam) {
      applyProjectFilter("__all");
    }
  }, [applyProjectFilter, effectiveRegionScopeId, supportsProjectFilter, supportsPopFilter, projectQueryParam, projectFilterLoading, projectFilterOptions, popQueryParam]);

  useEffect(() => {
    if (!createOpen) return;
    setCreateForm(createDefaults);
    setCreateError("");
  }, [createDefaults, createOpen]);

  useEffect(() => {
    if (category?.resource === "cities") {
      setPage(1);
    }
  }, [provinceFilter, category?.resource]);

  useEffect(() => {
    if ((!createOpen && !quickEditTarget) || !category) return;
    const activeCategory = category;

    async function loadLookups() {
      try {
        const tasks: Array<Promise<void>> = [];
        const next = {
          manufacturers: [] as LookupOption[],
          brands: [] as LookupOption[],
          provinces: [] as LookupOption[],
          assetTypes: [] as LookupOption[],
        };

        if (activeCategory.resource === "brands" || activeCategory.resource === "assetModels") {
          tasks.push(
            apiFetch<PaginatedResponse<GenericItem>>("/manufacturers?page=1&limit=200", { token }).then((res) => {
              next.manufacturers = (res.data || []).map((item) => ({
                id: String(item.id),
                label: String(item.manufacturer_name || item.manufacturer_code || "Manufacturer tidak tersedia"),
              }));
            }),
          );
        }
        if (activeCategory.resource === "assetModels") {
          tasks.push(
            apiFetch<PaginatedResponse<GenericItem>>("/brands?page=1&limit=200", { token }).then((res) => {
              next.brands = (res.data || []).map((item) => ({
                id: String(item.id),
                label: String(item.brand_name || item.brand_code || "Brand tidak tersedia"),
              }));
            }),
          );
          tasks.push(
            apiFetch<PaginatedResponse<GenericItem>>("/assetTypes?page=1&limit=200", { token }).then((res) => {
              next.assetTypes = (res.data || []).map((item) => ({
                id: String(item.id),
                label: String(item.type_name || item.type_code || "Asset type tidak tersedia"),
              }));
            }),
          );
        }
        if (activeCategory.resource === "cities") {
          tasks.push(
            apiFetch<PaginatedResponse<GenericItem>>("/provinces?page=1&limit=200", { token }).then((res) => {
              next.provinces = (res.data || []).map((item) => ({
                id: String(item.id),
                label: String(item.province_name || "Province tidak tersedia"),
              }));
            }),
          );
        }

        if (!tasks.length) return;
        await Promise.all(tasks);
        setLookupOptions(next);
      } catch {
        setLookupOptions({
          manufacturers: [],
          brands: [],
          provinces: [],
          assetTypes: [],
        });
      }
    }

    void loadLookups();
  }, [createOpen, quickEditTarget, category, token]);

  useEffect(() => {
    if (!category) return;
    const needsManufacturer = category.resource === "brands";
    const needsBrand = category.resource === "assetModels";
    const needsProvince = category.resource === "cities";
    if (!needsManufacturer && !needsBrand && !needsProvince) {
      setRelationMaps((previous) => ({ ...previous, manufacturers: {}, brands: {}, provinces: {} }));
      return;
    }

    let cancelled = false;
    async function loadRelationMaps() {
      try {
        const next = { manufacturers: {}, brands: {}, provinces: {} } as Omit<RelationMaps, "projects">;
        const tasks: Array<Promise<void>> = [];

        if (needsManufacturer) {
          tasks.push(
            apiFetch<PaginatedResponse<GenericItem>>("/manufacturers?page=1&limit=300", { token }).then((res) => {
              (res.data || []).forEach((item) => {
                next.manufacturers[String(item.id)] = String(item.manufacturer_name || item.manufacturer_code || "Manufacturer tidak tersedia");
              });
            }),
          );
        }
        if (needsBrand) {
          tasks.push(
            apiFetch<PaginatedResponse<GenericItem>>("/brands?page=1&limit=300", { token }).then((res) => {
              (res.data || []).forEach((item) => {
                next.brands[String(item.id)] = String(item.brand_name || item.brand_code || "Brand tidak tersedia");
              });
            }),
          );
        }
        if (needsProvince) {
          tasks.push(
            apiFetch<PaginatedResponse<GenericItem>>("/provinces?page=1&limit=300", { token }).then((res) => {
              (res.data || []).forEach((item) => {
                next.provinces[String(item.id)] = String(item.province_name || "Province tidak tersedia");
              });
            }),
          );
        }

        await Promise.all(tasks);
        if (!cancelled) setRelationMaps((previous) => ({ ...previous, ...next }));
      } catch {
        if (!cancelled) setRelationMaps((previous) => ({ ...previous, manufacturers: {}, brands: {}, provinces: {} }));
      }
    }

    void loadRelationMaps();
    return () => {
      cancelled = true;
    };
  }, [category, token]);

  useEffect(() => {
    const visibleIds = new Set(rows.map((row) => row.id));
    setSelectedIds((prev) => new Set(Array.from(prev).filter((id) => visibleIds.has(id))));
  }, [rows]);

  const allCurrentRowsSelected = rows.length > 0 && rows.every((row) => selectedIds.has(row.id));
  const someCurrentRowsSelected = rows.some((row) => selectedIds.has(row.id));

  const selectAllHeader = useMemo(
    () => (
      <div className="flex items-center justify-center" onClick={(event) => event.stopPropagation()}>
        <input
          type="checkbox"
          checked={allCurrentRowsSelected}
          ref={(node) => {
            if (!node) return;
            node.indeterminate = !allCurrentRowsSelected && someCurrentRowsSelected;
          }}
          onChange={(event) => {
            const checked = event.target.checked;
            setSelectedIds((prev) => {
              const next = new Set(prev);
              if (checked) rows.forEach((row) => next.add(row.id));
              else rows.forEach((row) => next.delete(row.id));
              return next;
            });
          }}
          aria-label="Select all rows"
          className="size-4 cursor-pointer rounded border-input bg-background text-primary"
        />
      </div>
    ),
    [allCurrentRowsSelected, someCurrentRowsSelected, rows],
  );

  const headers = useMemo(() => {
    if (!category) return [];
    if (category.resource === "pops") return [selectAllHeader, "POP ID", "Code", "Name", "Status", "Updated"];
    if (category.resource === "devices") {
      if (category.deviceTypeKey === "CABLE") return [selectAllHeader, "Device ID", "Name", "Type", "Kategori", "POP", "Status", "Validation", "Updated"];
      return [selectAllHeader, "Device ID", "Name", "Type", "POP", "Status", "Validation", "Updated"];
    }
    if (category.resource === "poles") return [selectAllHeader, "Pole ID", "Pole Number", "Region", "POP", "Status", "Updated"];
    if (category.resource === "customers") return [selectAllHeader, "CID", "Name", "Service", "POP", "Status", "Updated"];
    if (category.resource === "routes") return [selectAllHeader, "Route ID", "Route Name", "Region", "POP", "Status", "Updated"];
    if (category.resource === "regions") return [selectAllHeader, "Region ID", "Inventory Code", "Region Name", "Color", "Updated"];
    if (category.resource === "deviceTypes") return [selectAllHeader, "Icon", "Type Key", "Type Name", "Group", "Topology Role", "Layout", "Assignable", "Status", "Updated"];
    if (category.resource === "topologyRelationRules") return [selectAllHeader, "Source", "Direction", "Allowed Peer", "Role", "Same POP", "Required on Create", "Status", "Updated"];
    if (category.resource === "linkBudgetParameters") return [selectAllHeader, "Key", "Label", "Value", "Unit", "Status", "Updated"];
    if (category.resource === "popTypes") return [selectAllHeader, "Code", "POP Type", "Status", "Updated"];
    if (category.resource === "routeTypes") return [selectAllHeader, "Code", "Route Type", "Status", "Updated"];
    if (category.resource === "cableTypes") return [selectAllHeader, "Code", "Cable Type", "Role", "Core Count", "1310nm", "Status", "Updated"];
    if (category.resource === "closureTypes") return [selectAllHeader, "Code", "Closure Type", "Max Core", "Environment", "Tray", "Status", "Updated"];
    if (category.resource === "coreCapacities") return [selectAllHeader, "Value", "Label", "Description", "Route Types", "Status", "Updated"];
    if (category.resource === "deviceCoreCapacities") return [selectAllHeader, "Value", "Label", "Description", "Device Types", "Status", "Updated"];
    if (category.resource === "odpTypes") return [selectAllHeader, "Code", "ODP Type", "Status", "Updated"];
    if (category.resource === "installationTypes") return [selectAllHeader, "Code", "Installation Type", "Status", "Updated"];
    if (category.resource === "serviceTypes") return [selectAllHeader, "Code", "Service Type", "Status", "Updated"];
    if (category.resource === "tenants") return [selectAllHeader, "Code", "Tenant", "Status", "Updated"];
    if (category.resource === "manufacturers") return [selectAllHeader, "Code", "Manufacturer", "Updated"];
    if (category.resource === "brands") return [selectAllHeader, "Code", "Brand", "Manufacturer", "Updated"];
    if (category.resource === "assetModels") return [selectAllHeader, "Code", "Model", "Brand", "Updated"];
    if (category.resource === "splitterProfiles") return [selectAllHeader, "Ratio", "Input", "Output", "Loss (dB)", "Device Types", "Status", "Updated"];
    if (category.resource === "provinces") return [selectAllHeader, "Province", "Status", "Updated"];
    if (category.resource === "cities") return [selectAllHeader, "Code", "City", "Province", "Updated"];
    return [selectAllHeader, "Project ID", "Project Name", "Status", "Region", "POP", "Updated"];
  }, [category, selectAllHeader]);

  const tableRows = useMemo(() => {
    if (!category) return [];
    return rows.map((item) => {
      const display = buildDeviceListDisplay(item, listDisplayLookups);
      const selectCell = (
        <div className="flex items-center justify-center" onClick={(event) => event.stopPropagation()}>
          <input
            type="checkbox"
            checked={selectedIds.has(item.id)}
            onChange={(event) => {
              const checked = event.target.checked;
              setSelectedIds((prev) => {
                const next = new Set(prev);
                if (checked) next.add(item.id);
                else next.delete(item.id);
                return next;
              });
            }}
            aria-label={`Select ${category.label} ${pick(item, ["pop_name", "device_name", "project_name", "route_name", "customer_name", "pole_number", "id"])}`}
            className="size-4 cursor-pointer rounded border-input bg-background text-primary"
          />
        </div>
      );

      if (category.resource === "pops") {
        return [
          selectCell,
          pick(item, ["pop_id"]),
          pick(item, ["pop_code"]),
          pick(item, ["pop_name", "name"]),
          pick(item, ["status_pop", "status"]),
          formatDateTime(pick(item, ["updated_at", "created_at"])),
        ];
      }
      if (category.resource === "devices") {
        const validationStatus = getDeviceDisplayValidationStatus(item);
        const validation = mapValidationStatus(validationStatus);
        const validationTitle = getDeviceValidationTitle(item, validation.label);
        const isCable = category.deviceTypeKey === "CABLE";
        const baseCells = [
          selectCell,
          pick(item, ["device_id"]),
          pick(item, ["device_name", "name"]),
          pick(item, ["device_type_key"]),
        ];
        const extraCableCells = isCable ? [pick(item, ["route_type"])] : [];
        const remainingCells = [
          display.pop,
          pick(item, ["status"]),
          <span key={`validation-${item.id}`} title={validationTitle} className={`inline-flex rounded border px-2 py-0.5 text-xs ${validation.className}`}>{validation.label}</span>,
          formatDateTime(pick(item, ["updated_at", "created_at"])),
        ];
        return [...baseCells, ...extraCableCells, ...remainingCells];
      }
      if (category.resource === "poles") {
        return [
          selectCell,
          pick(item, ["pole_id"]),
          pick(item, ["pole_number", "name"]),
          display.region,
          display.pop,
          pick(item, ["status"]),
          formatDateTime(pick(item, ["updated_at", "created_at"])),
        ];
      }
      if (category.resource === "customers") {
        return [
          selectCell,
          pick(item, ["customer_number"]),
          pick(item, ["customer_name", "name"]),
          pick(item, ["service_type"]),
          display.pop,
          pick(item, ["status"]),
          formatDateTime(pick(item, ["updated_at", "created_at"])),
        ];
      }
      if (category.resource === "routes") {
        return [
          selectCell,
          pick(item, ["route_id"]),
          pick(item, ["route_name", "name"]),
          display.region,
          display.pop,
          pick(item, ["status"]),
          formatDateTime(pick(item, ["updated_at", "created_at"])),
        ];
      }
      if (category.resource === "regions") {
        const colorText = pick(item, ["region_color"]);
        const colorHex = normalizeHexColor(colorText) || "#E2E8F0";
        return [
          selectCell,
          pick(item, ["region_id"]),
          pick(item, ["inventory_region_code"]),
          withArchivedLabel(item, pick(item, ["region_name"])),
          <div key={`region-color-${String(item.id)}`} className="flex items-center justify-center">
            <span
              className="inline-block size-5 rounded border"
              style={{ backgroundColor: colorHex }}
              title={colorText === "-" ? "No color" : colorText}
            />
          </div>,
          formatDateTime(pick(item, ["updated_at", "created_at"])),
        ];
      }
      if (category.resource === "deviceTypes") {
        return [
          selectCell,
          renderDeviceIconCell(pick(item, ["icon_name"])),
          pick(item, ["device_type_key"]),
          withArchivedLabel(item, pick(item, ["device_type_name"])),
          pick(item, ["asset_group"]),
          pick(item, ["topology_role"]),
          pick(item, ["layout_type"]),
          pick(item, ["is_assignable"]),
          pick(item, ["is_active"]),
          formatDateTime(pick(item, ["updated_at", "created_at"])),
        ];
      }
      if (category.resource === "topologyRelationRules") {
        return [
          selectCell,
          pick(item, ["source_device_type_key"]),
          pick(item, ["direction"]),
          pick(item, ["allowed_peer_device_type_key"]),
          pick(item, ["connection_role"]),
          pick(item, ["requires_same_pop"]),
          pick(item, ["is_required_on_create"]),
          pick(item, ["is_active"]),
          formatDateTime(pick(item, ["updated_at", "created_at"])),
        ];
      }
      if (category.resource === "linkBudgetParameters") {
        return [
          selectCell,
          pick(item, ["parameter_key"]),
          withArchivedLabel(item, pick(item, ["parameter_label"])),
          pick(item, ["parameter_value"]),
          pick(item, ["unit"]),
          pick(item, ["is_active"]),
          formatDateTime(pick(item, ["updated_at", "created_at"])),
        ];
      }
      if (category.resource === "popTypes") {
        return [
          selectCell,
          pick(item, ["pop_type_code"]),
          withArchivedLabel(item, pick(item, ["pop_type_name"])),
          pick(item, ["is_active"]),
          formatDateTime(pick(item, ["updated_at", "created_at"])),
        ];
      }
      if (category.resource === "routeTypes") {
        return [
          selectCell,
          pick(item, ["route_type_code"]),
          withArchivedLabel(item, pick(item, ["route_type_name"])),
          pick(item, ["is_active"]),
          formatDateTime(pick(item, ["updated_at", "created_at"])),
        ];
      }
      if (category.resource === "cableTypes") {
        return [
          selectCell,
          pick(item, ["cable_type_code"]),
          withArchivedLabel(item, pick(item, ["cable_type_name"])),
          pick(item, ["cable_role"]),
          pick(item, ["core_count"]),
          pick(item, ["attenuation_1310_db_per_km"]),
          pick(item, ["is_active"]),
          formatDateTime(pick(item, ["updated_at", "created_at"])),
        ];
      }
      if (category.resource === "coreCapacities") {
        return [
          selectCell,
          pick(item, ["core_capacity_value"]),
          withArchivedLabel(item, pick(item, ["label"])),
          pick(item, ["description"]),
          renderRouteTypeTags(item.allowed_route_type_keys),
          pick(item, ["is_active"]),
          formatDateTime(pick(item, ["updated_at", "created_at"])),
        ];
      }
      if (category.resource === "deviceCoreCapacities") {
        return [
          selectCell,
          pick(item, ["core_capacity_value"]),
          withArchivedLabel(item, pick(item, ["label"])),
          pick(item, ["description"]),
          renderDeviceTypeTags(item.allowed_device_type_keys),
          pick(item, ["is_active"]),
          formatDateTime(pick(item, ["updated_at", "created_at"])),
        ];
      }
      if (category.resource === "odpTypes") {
        return [
          selectCell,
          pick(item, ["odp_type_code"]),
          withArchivedLabel(item, pick(item, ["odp_type_name"])),
          pick(item, ["is_active"]),
          formatDateTime(pick(item, ["updated_at", "created_at"])),
        ];
      }
      if (category.resource === "installationTypes") {
        return [
          selectCell,
          pick(item, ["installation_type_code"]),
          withArchivedLabel(item, pick(item, ["installation_type_name"])),
          pick(item, ["is_active"]),
          formatDateTime(pick(item, ["updated_at", "created_at"])),
        ];
      }
      if (category.resource === "serviceTypes") {
        return [
          selectCell,
          pick(item, ["service_type_code"]),
          withArchivedLabel(item, pick(item, ["service_type_name"])),
          pick(item, ["is_active"]),
          formatDateTime(pick(item, ["updated_at", "created_at"])),
        ];
      }
      if (category.resource === "tenants") {
        return [
          selectCell,
          pick(item, ["tenant_code"]),
          withArchivedLabel(item, pick(item, ["tenant_name"])),
          pick(item, ["is_active"]),
          formatDateTime(pick(item, ["updated_at", "created_at"])),
        ];
      }
      if (category.resource === "closureTypes") {
        return [
          selectCell,
          pick(item, ["closure_type_code"]),
          withArchivedLabel(item, pick(item, ["closure_type_name"])),
          pick(item, ["max_core_capacity"]),
          pick(item, ["environment_rating"]),
          pick(item, ["tray_count"]),
          pick(item, ["is_active"]),
          formatDateTime(pick(item, ["updated_at", "created_at"])),
        ];
      }
      if (category.resource === "manufacturers") {
        return [
          selectCell,
          pick(item, ["manufacturer_code"]),
          withArchivedLabel(item, pick(item, ["manufacturer_name"])),
          formatDateTime(pick(item, ["updated_at", "created_at"])),
        ];
      }
      if (category.resource === "brands") {
        return [
          selectCell,
          pick(item, ["brand_code"]),
          withArchivedLabel(item, pick(item, ["brand_name"])),
          display.manufacturer,
          formatDateTime(pick(item, ["updated_at", "created_at"])),
        ];
      }
      if (category.resource === "assetModels") {
        return [
          selectCell,
          pick(item, ["model_code"]),
          withArchivedLabel(item, pick(item, ["model_name"])),
          display.brand,
          formatDateTime(pick(item, ["updated_at", "created_at"])),
        ];
      }
      if (category.resource === "splitterProfiles") {
        return [
          selectCell,
          withArchivedLabel(item, pick(item, ["ratio_label"])),
          pick(item, ["input_port_count"]),
          pick(item, ["output_port_count"]),
          pick(item, ["expected_loss_db"]),
          renderDeviceTypeTags(item.allowed_device_type_keys),
          pick(item, ["is_active"]),
          formatDateTime(pick(item, ["updated_at", "created_at"])),
        ];
      }
      if (category.resource === "provinces") {
        return [
          selectCell,
          withArchivedLabel(item, pick(item, ["province_name"])),
          pick(item, ["is_active"]),
          formatDateTime(pick(item, ["updated_at", "created_at"])),
        ];
      }
      if (category.resource === "cities") {
        return [
          selectCell,
          pick(item, ["city_code"]),
          withArchivedLabel(item, pick(item, ["city_name"])),
          resolveRelationName(item.province_id, relationMaps.provinces),
          formatDateTime(pick(item, ["updated_at", "created_at"])),
        ];
      }
      return [
        selectCell,
        pick(item, ["project_id"]),
        pick(item, ["project_name", "name"]),
        pick(item, ["status"]),
        display.region,
        display.pop,
        formatDateTime(pick(item, ["updated_at", "created_at"])),
      ];
    });
  }, [category, rows, selectedIds, relationMaps, listDisplayLookups]);

  const selectedRowIndices = useMemo(() => {
    const set = new Set<number>();
    rows.forEach((row, index) => {
      if (selectedIds.has(row.id)) set.add(index);
    });
    return set;
  }, [rows, selectedIds]);
  const selectedRows = useMemo(() => rows.filter((row) => selectedIds.has(row.id)), [rows, selectedIds]);

  function getDetailHref(itemId: string) {
    const base = isMasterCategory ? `/master-data/list` : `/data-management/list`;
    return `${base}/${category?.slug}/${itemId}${queryString ? `?${queryString}` : ""}`;
  }

  function getTraceHref(item: GenericItem) {
    const params = new URLSearchParams();
    params.set("start_device_id", String(item.id));
    const regionId = pick(item, ["region_id"]);
    if (regionId && regionId !== "-") params.set("region_id", regionId);
    return `/data-management/topology?${params.toString()}`;
  }

  function openRename(item: GenericItem) {
    if (!renameConfig) return;
    setRenameTarget(item);
    setRenameValue(String(item[renameConfig.field] || "").trim());
  }

  async function submitRename() {
    if (!renameTarget || !category || !renameConfig) return;
    if (!renameValue.trim()) {
      setError("Nama tidak boleh kosong.");
      return;
    }

    setActionLoading(true);
    setError("");
    setSuccess("");
    try {
      const result = await apiFetch<{ data?: ApprovalResponse }>(`/${category.resource}/${renameTarget.id}`, {
        method: "PATCH",
        token,
        body: JSON.stringify({
          [renameConfig.field]: renameValue.trim(),
        }),
      });
      setRenameTarget(null);
      if (result.data?.approval_request) {
        const requestId = getApprovalRequestId(result.data);
        setSuccess(`${category.label} rename dikirim ke approval superadmin${requestId ? ` (${requestId})` : ""}.`);
      } else {
        setRefreshSeed((prev) => prev + 1);
      }
    } catch (err) {
      setError((err as Error).message || "Gagal melakukan rename.");
    } finally {
      setActionLoading(false);
    }
  }

  async function doDelete() {
    if (!deleteTarget || !category) return;
    setActionLoading(true);
    setError("");
    setSuccess("");
    try {
      const result = await apiFetch<{ data?: ApprovalResponse }>(`/${category.resource}/${deleteTarget.id}`, {
        method: "DELETE",
        token,
      });
      setDeleteTarget(null);
      if (result.data?.approval_request) {
        const requestId = getApprovalRequestId(result.data);
        setSuccess(`${category.label} ${isSoftDeleteResource ? "archive" : "delete"} dikirim ke approval superadmin${requestId ? ` (${requestId})` : ""}.`);
      } else {
        setRefreshSeed((prev) => prev + 1);
      }
    } catch (err) {
      setError((err as Error).message || "Gagal menghapus data.");
    } finally {
      setActionLoading(false);
    }
  }

  async function forceDelete() {
    forceDeleteRef.current = true;
    setUsageCheck(null);
    await doDelete();
  }

  async function submitDelete() {
    if (!deleteTarget || !category) return;

    if (category.group === "master" && !forceDeleteRef.current) {
      setUsageLoading(true);
      try {
        const res = await apiFetch<{
          data?: {
            total: number;
            by_type: Record<string, { count: number; sample: Array<{ id: string; label: string }> }>;
          }
        }>(`/${category.resource}/${deleteTarget.id}/usage-check`, { token });
        if (res.data?.total && res.data.total > 0) {
          setUsageCheck(res.data);
          return;
        }
      } catch {
        // ignore
      } finally {
        setUsageLoading(false);
      }
    }
    forceDeleteRef.current = false;
    setUsageCheck(null);
    await doDelete();
  }

  function openQuickEdit(item: GenericItem) {
    if (!category) return;
    setQuickEditTarget(item);
    setQuickEditError("");
    setQuickEditForm(buildEditFormFromItem(category.resource, item));
  }

  async function submitQuickEdit() {
    if (!category || !quickEditTarget) return;
    setQuickEditError("");

    const payload = buildCreatePayload(category.resource, quickEditForm);
    if (!payload) {
      setQuickEditError("Field wajib belum lengkap. Mohon periksa kembali.");
      return;
    }

    setActionLoading(true);
    setSuccess("");
    try {
      const result = await apiFetch<{ data?: ApprovalResponse }>(`/${category.resource}/${quickEditTarget.id}`, {
        method: "PATCH",
        token,
        body: JSON.stringify(payload),
      });
      setQuickEditTarget(null);
      if (result.data?.approval_request) {
        const requestId = getApprovalRequestId(result.data);
        setSuccess(`${category.label} update dikirim ke approval superadmin${requestId ? ` (${requestId})` : ""}.`);
      } else {
        setRefreshSeed((prev) => prev + 1);
      }
    } catch (err) {
      setQuickEditError((err as Error).message || "Gagal memperbarui data.");
    } finally {
      setActionLoading(false);
    }
  }

  function requestBulkAction(action: BulkActionType) {
    if (!category || selectedIds.size === 0) return;
    if ((action === "activate" || action === "deactivate") && !supportsIsActiveResource(category.resource)) return;
    if (action === "restore" && !isSoftDeleteResource) return;
    const selectedRows = rows.filter((row) => selectedIds.has(row.id));
    if (!selectedRows.length) return;
    setBulkActionRequest({ action, count: selectedRows.length });
  }

  async function runBulkActionConfirmed() {
    if (!category || !bulkActionRequest) return;
    const action = bulkActionRequest.action;
    const selectedRows = rows.filter((row) => selectedIds.has(row.id));
    if (!selectedRows.length) {
      setBulkActionRequest(null);
      return;
    }

    setActionLoading(true);
    setError("");
    try {
      await Promise.all(
        selectedRows.map((row) => {
          if (action === "delete") {
            return apiFetch(`/${category.resource}/${row.id}`, {
              method: "DELETE",
              token,
            });
          }
          if (action === "restore") {
            return apiFetch(`/${category.resource}/${row.id}/restore`, {
              method: "POST",
              token,
            });
          }
          return apiFetch(`/${category.resource}/${row.id}`, {
            method: "PATCH",
            token,
            body: JSON.stringify({
              is_active: action === "activate",
            }),
          });
        }),
      );
      setSelectedIds(new Set());
      setBulkActionRequest(null);
      setRefreshSeed((prev) => prev + 1);
    } catch (err) {
      setError((err as Error).message || "Bulk action gagal diproses.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleBulkDownloadQr() {
    if (!category || category.resource !== "devices") return;
    if (!selectedRows.length) {
      setError("Pilih minimal 1 device untuk download QR.");
      return;
    }

    setDownloadingQr(true);
    setError("");
    setSuccess("");
    try {
      const [logoDataUrl, qrLabelSetting] = await Promise.all([
        loadQrLabelLogoDataUrl(token).catch(() => ""),
        loadQrLabelSettings(token).catch(() => null),
      ]);
      const qrRows = await Promise.all(
        selectedRows.map(async (row) => {
          const display = buildDeviceListDisplay(row, listDisplayLookups);
          const deviceId = pick(row, ["id"]);
          return {
            deviceName: pick(row, ["device_name", "name"]),
            deviceCode: pick(row, ["device_id", "id"]),
            deviceType: pick(row, ["device_type_key"]),
            popName: formatQrPopLabel(display.pop, pick(row, ["pop_code", "pop_id"])),
            projectName: display.project,
            tenantName: display.tenant,
            qrDataUrl: await QRCode.toDataURL(
              buildDeviceQrHref({
                appBaseUrl: APP_BASE_URL,
                categorySlug: category.slug,
                deviceId,
                deviceTypeKey: pick(row, ["device_type_key"]),
              }),
              {
                width: 360,
                margin: 2,
                errorCorrectionLevel: "H",
              },
            ),
            logoDataUrl,
            footerText: qrLabelSetting?.footer_text || undefined,
          };
        }),
      );
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      await drawQrLabelPdf(doc, qrRows);
      doc.save(`${sanitizeFileName(category.slug)}-qr-labels-${new Date().toISOString().slice(0, 10)}.pdf`);
      setSuccess(`${qrRows.length} QR device berhasil dibuat dalam PDF.`);
    } catch (err) {
      setError((err as Error).message || "Gagal membuat bulk QR download.");
    } finally {
      setDownloadingQr(false);
    }
  }

  async function submitRestore(item: GenericItem) {
    if (!category || !isSoftDeleteResource) return;
    setActionLoading(true);
    setError("");
    try {
      await apiFetch(`/${category.resource}/${item.id}/restore`, {
        method: "POST",
        token,
      });
      setRefreshSeed((prev) => prev + 1);
    } catch (err) {
      setError((err as Error).message || "Gagal restore data.");
    } finally {
      setActionLoading(false);
    }
  }

  async function submitCreate() {
    if (!category || !canCreateMaster) return;
    setCreateError("");

    const payload = buildCreatePayload(category.resource, createForm);
    if (!payload) {
      setCreateError("Field wajib belum lengkap. Mohon periksa kembali.");
      return;
    }

    setActionLoading(true);
    try {
      await apiFetch(`/${category.resource}`, {
        method: "POST",
        token,
        body: JSON.stringify(payload),
      });
      setCreateOpen(false);
      setRefreshSeed((prev) => prev + 1);
    } catch (err) {
      setCreateError((err as Error).message || "Gagal membuat data baru.");
    } finally {
      setActionLoading(false);
    }
  }

  if (!category) {
    return (
      <div className="h-full min-h-0 w-full overflow-auto">
        <div className="space-y-3 pr-3">
          <p className="text-sm text-destructive">Kategori tidak ditemukan.</p>
          <Button asChild variant="outline">
            <Link href="/data-management">
              <ArrowLeft className="mr-2 size-4" />
              Kembali ke Data Management
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 w-full overflow-auto">
      <div className="space-y-4 pr-3">
        <DataListHeader
          label={category.label}
          description={category.description}
          isRegionScoped={Boolean(effectiveRegionScopeId)}
          canCreateMaster={canCreateMaster}
          isMasterCategory={isMasterCategory}
          onCreate={() => {
            if (isOdpCategory && category?.supportsBulkImport) {
              setOdpModeDialogOpen(true);
            } else {
              setCreateOpen(true);
            }
          }}
        />

        <DataListKpiStrip
          total={total}
          categoryLabel={category.label}
          selectedCount={selectedIds.size}
          supportsPopFilter={supportsPopFilter}
          isPopFilterActive={popQueryParam !== "__all"}
          selectedPopLabel={selectedPopLabel}
          canWrite={canWrite}
          role={me.role}
        />

        {isOdpCategory ? (
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "list" | "quality")}>
            <TabsList className="w-full justify-start md:w-auto">
              <TabsTrigger value="list">Data ODP</TabsTrigger>
              <TabsTrigger value="quality">ODP Quality Issues</TabsTrigger>
            </TabsList>
          </Tabs>
        ) : null}

        {!isOdpCategory || activeTab === "list" ? (
        <Card>
          <CardHeader>
            <CardTitle>Data {category.label}</CardTitle>
            <CardDescription>
              Total data: {total}. Klik kanan pada baris untuk aksi cepat.
              {supportsPopFilter && popQueryParam !== "__all" && selectedPopLabel ? ` Filter POP: ${selectedPopLabel}.` : ""}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <DataBulkActions
              selectedCount={selectedIds.size}
              selectedDownloadCount={selectedRows.length}
              supportsQrBulkDownload={supportsQrBulkDownload}
              downloadingQr={downloadingQr}
              actionLoading={actionLoading}
              canWrite={canWrite}
              canRestoreSelected={isSoftDeleteResource && rows.some((row) => selectedIds.has(row.id) && isArchived(row))}
              canBulkToggleStatus={canBulkToggleStatus}
              isSoftDeleteResource={isSoftDeleteResource}
              onDownloadQr={() => void handleBulkDownloadQr()}
              onRestore={() => requestBulkAction("restore")}
              onActivate={() => requestBulkAction("activate")}
              onDeactivate={() => requestBulkAction("deactivate")}
              onDelete={() => requestBulkAction("delete")}
              onClearSelection={() => setSelectedIds(new Set())}
            />
            <DataListFilterBar
              filterGridClass={filterGridClass}
              categoryResource={category.resource}
              searchInput={searchInput}
              provinceFilter={provinceFilter}
              provinceOptions={Object.entries(relationMaps.provinces)
                .sort((a, b) => a[1].localeCompare(b[1], "id"))
                .map(([id, name]) => ({ id, label: name }))}
              directionFilter={directionFilter}
              supportsPopFilter={supportsPopFilter}
              popFilterValue={popQueryParam}
              popFilterLoading={popFilterLoading}
              popFilterOptions={popFilterOptions}
              supportsProjectFilter={supportsProjectFilter}
              projectFilterValue={projectQueryParam}
              projectFilterLoading={projectFilterLoading}
              projectFilterOptions={projectFilterOptions}
              hasRegionScope={Boolean(effectiveRegionScopeId)}
              isSoftDeleteResource={isSoftDeleteResource}
              archiveView={archiveView}
              limit={limit}
              onSearchInputChange={setSearchInput}
              onProvinceFilterChange={(value) => {
                setProvinceFilter(value);
                setPage(1);
                setSearch("");
                setSearchInput("");
              }}
              onDirectionFilterChange={(value) => {
                setDirectionFilter(value);
                setPage(1);
                setSearch("");
                setSearchInput("");
              }}
              onPopFilterChange={applyPopFilter}
              onProjectFilterChange={applyProjectFilter}
              onArchiveViewChange={(value) => {
                setArchiveView(value);
                setSelectedIds(new Set());
                setPage(1);
              }}
              onLimitChange={(value) => {
                setPage(1);
                setLimit(value);
              }}
              onApplyFilter={() => {
                setPage(1);
                setSearch(searchInput.trim());
              }}
              onResetFilters={resetListFilters}
            />

            {success ? (
              <p className="rounded-md border border-emerald-200 bg-emerald-50 p-2 text-sm text-emerald-700">{success}</p>
            ) : null}
            {supportsPopFilter && popQueryParam !== "__all" && selectedPopLabel ? (
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="font-normal">
                  POP: {selectedPopLabel}
                </Badge>
              </div>
            ) : null}
            {supportsProjectFilter && projectQueryParam !== "__all" && selectedProjectLabel ? (
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="font-normal">
                  Project: {selectedProjectLabel}
                </Badge>
              </div>
            ) : null}

            {loading ? (
              <AppLoading label="Sedang memuat data list..." />
            ) : error ? (
              <DataEmptyState
                title="Gagal memuat data"
                description={error}
                variant="error"
                actionLabel="Coba lagi"
                onAction={() => setRefreshSeed((prev) => prev + 1)}
              />
            ) : rows.length === 0 ? (
              <DataEmptyState
                title="Tidak ada data"
                description={
                supportsPopFilter && popQueryParam !== "__all" && selectedPopLabel
                  ? `Tidak ada ${category.label} pada POP ${selectedPopLabel}.`
                  : supportsProjectFilter && projectQueryParam !== "__all" && selectedProjectLabel
                    ? `Tidak ada ${category.label} pada Project ${selectedProjectLabel}.`
                  : "Tidak ada data pada filter saat ini."
                }
                actionLabel="Reset Filter"
                onAction={resetListFilters}
              />
            ) : (
              <>
                <DataMobileList
                  rows={rows}
                  showValidationBadge={category?.resource === "devices"}
                  supportsPopFilter={supportsPopFilter}
                  canTraceTopology={isOdpCategory && canTraceTopology}
                  getPrimaryName={(row) => buildDeviceListDisplay(row, listDisplayLookups).primaryName}
                  getPrimaryCode={(row) => buildDeviceListDisplay(row, listDisplayLookups).primaryCode}
                  getStatus={(row) => pick(row, ["status", "status_pop", "is_active"])}
                  getUpdatedAt={(row) => formatDateTime(pick(row, ["updated_at", "created_at"]))}
                  getPopLabel={(row) => buildDeviceListDisplay(row, listDisplayLookups).pop}
                  getValidationBadge={(row) => {
                    const validation = mapValidationStatus(getDeviceDisplayValidationStatus(row));
                    return {
                      label: validation.label,
                      className: validation.className,
                      title: getDeviceValidationTitle(row, validation.label),
                    };
                  }}
                  onOpenDetail={(row) => router.push(getDetailHref(row.id))}
                  onOpenTrace={(row) => router.push(getTraceHref(row))}
                />
                <DataTableView
                  headers={headers}
                  rows={tableRows}
                  tableLabel={`${category.label} Columns`}
                  selectedRowIndices={selectedRowIndices}
                  hiddenOnMobile={isOdpCategory}
                  onRowClick={(rowIndex) => {
                    const row = rows[rowIndex];
                    if (!row) return;
                    setSelectedIds((prev) => {
                      const next = new Set(prev);
                      if (next.has(row.id)) next.delete(row.id);
                      else next.add(row.id);
                      return next;
                    });
                  }}
                  onRowDoubleClick={(rowIndex) => {
                    const row = rows[rowIndex];
                    if (!row) return;
                    if (isMasterCategory && canWrite) {
                      openQuickEdit(row);
                      return;
                    }
                    router.push(getDetailHref(row.id));
                  }}
                  rowContextMenu={(rowIndex) => {
                    const rowItem = rows[rowIndex];
                    if (!rowItem) return null;
                    return (
                      <>
                        <ContextMenuLabel>{category.label} Actions</ContextMenuLabel>
                        <ContextMenuItem onSelect={() => router.push(getDetailHref(rowItem.id))}>
                          <Eye className="mr-1 size-4" />
                          Detail
                        </ContextMenuItem>
                        {category.resource === "devices" && canTraceTopology ? (
                          <>
                            <ContextMenuItem onSelect={() => router.push(getTraceHref(rowItem))}>
                              <Waypoints className="mr-1 size-4" />
                              Trace Device
                            </ContextMenuItem>
                          </>
                        ) : null}
                        {canWrite && renameConfig ? (
                          <ContextMenuItem onSelect={() => openRename(rowItem)}>
                            <Pencil className="mr-1 size-4" />
                            Rename
                          </ContextMenuItem>
                        ) : null}
                        {canWrite && isMasterCategory ? (
                          <ContextMenuItem onSelect={() => openQuickEdit(rowItem)}>
                            <Pencil className="mr-1 size-4" />
                            Quick Edit
                          </ContextMenuItem>
                        ) : null}
                        {canWrite && isSoftDeleteResource && isArchived(rowItem) ? (
                          <ContextMenuItem onSelect={() => void submitRestore(rowItem)}>
                            <RotateCcw className="mr-1 size-4" />
                            Restore
                          </ContextMenuItem>
                        ) : null}
                        {canWrite ? (
                          <>
                            <ContextMenuSeparator />
                            {!isSoftDeleteResource || !isArchived(rowItem) ? (
                              <ContextMenuItem variant="destructive" onSelect={() => setDeleteTarget(rowItem)}>
                                <Trash2 className="mr-1 size-4" />
                                {isSoftDeleteResource ? "Archive" : "Delete"}
                              </ContextMenuItem>
                            ) : null}
                          </>
                        ) : null}
                      </>
                    );
                  }}
                />
              </>
            )}

            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                disabled={page <= 1 || loading}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              >
                Prev
              </Button>
              <span className="text-sm text-muted-foreground">Page {page}</span>
              <Button
                variant="outline"
                disabled={loading || page * limit >= total}
                onClick={() => setPage((prev) => prev + 1)}
              >
                Next
              </Button>
            </div>
          </CardContent>
        </Card>
        ) : null}

        {isOdpCategory && activeTab === "quality" ? (
          <OdpQualityTab regionId={effectiveRegionScopeId} token={token} />
        ) : null}
      </div>

      <MasterDataRenameDialog
        open={Boolean(renameTarget)}
        onClose={() => setRenameTarget(null)}
        categoryLabel={category.label}
        label={renameConfig?.label || "nama baru"}
        value={renameValue}
        onValueChange={setRenameValue}
        actionLoading={actionLoading}
        onConfirm={() => void submitRename()}
      />

      <MasterDataUsageCheckDialog
        usageCheck={usageCheck}
        onForceDelete={() => void forceDelete()}
        onClose={() => setUsageCheck(null)}
      />

      <MasterDataDeleteConfirmDialog
        deleteTarget={deleteTarget}
        isSoftDeleteResource={isSoftDeleteResource}
        categoryLabel={category.label}
        actionLoading={actionLoading}
        usageLoading={usageLoading}
        onSubmitDelete={() => void submitDelete()}
        onClose={() => setDeleteTarget(null)}
      />

      <AlertDialog open={Boolean(bulkActionRequest)} onOpenChange={(open) => !open && setBulkActionRequest(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {bulkActionRequest?.action === "delete"
                ? `${isSoftDeleteResource ? "Arsipkan" : "Hapus"} data terpilih?`
                : bulkActionRequest?.action === "restore"
                  ? "Restore data terpilih?"
                  : `${bulkActionRequest?.action === "activate" ? "Aktifkan" : "Nonaktifkan"} data terpilih?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {bulkActionRequest?.action === "delete"
                ? `${isSoftDeleteResource ? "Data akan dipindahkan ke arsip." : "Data akan dihapus permanen."} Jumlah: ${bulkActionRequest?.count || 0} item.`
                : bulkActionRequest?.action === "restore"
                  ? `Data terarsip akan dikembalikan ke status aktif. Jumlah: ${bulkActionRequest?.count || 0} item.`
                  : `Perubahan status akan diterapkan ke ${bulkActionRequest?.count || 0} item.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Batal</AlertDialogCancel>
            <AlertDialogAction disabled={actionLoading} onClick={() => void runBulkActionConfirmed()}>
              {actionLoading ? "Memproses..." : "Lanjutkan"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <MasterDataQuickEditSheet
        open={Boolean(quickEditTarget)}
        onOpenChange={(open) => !open && setQuickEditTarget(null)}
        categoryLabel={category.label}
        formContent={renderMasterForm(category.resource, quickEditForm, setQuickEditForm, lookupOptions, fieldErrors, setFieldError, clearFieldError, handleFieldBlur, true, rows, quickEditTarget?.id)}
        showStatus={supportsIsActiveResource(category.resource) && category.resource !== "splitterProfiles"}
        statusValue={quickEditForm.is_active || "true"}
        onStatusChange={(value) => setQuickEditForm((prev) => ({ ...prev, is_active: value }))}
        error={quickEditError}
        actionLoading={actionLoading}
        hasFieldErrors={Object.keys(fieldErrors).length > 0}
        onSave={() => void submitQuickEdit()}
      />

      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Create {category.label}</SheetTitle>
            <SheetDescription>Tambahkan data master baru langsung dari halaman list.</SheetDescription>
          </SheetHeader>
          <div className="grid gap-3 px-4">
            {renderMasterForm(category.resource, createForm, setCreateForm, lookupOptions, fieldErrors, setFieldError, clearFieldError, handleFieldBlur, false, rows, undefined)}
            {createError ? <p className="text-sm text-destructive">{createError}</p> : null}
          </div>
          <SheetFooter className="mt-2 border-t">
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)} disabled={actionLoading || Object.keys(fieldErrors).length > 0}>
              Batal
            </Button>
            <Button type="button" onClick={() => void submitCreate()} disabled={actionLoading || Object.keys(fieldErrors).length > 0}>
              {actionLoading ? "Menyimpan..." : "Simpan"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <OdpCreateModeDialog
        open={odpModeDialogOpen}
        onOpenChange={setOdpModeDialogOpen}
        onSingleMode={() => setCreateOpen(true)}
      />
    </div>
  );
}

function withArchivedLabel(item: Record<string, unknown>, text: string) {
  if (!isArchived(item)) return text;
  return (
    <span className="inline-flex items-center gap-1.5">
      <span>{text}</span>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex">
            <AlertTriangle className="size-3.5 text-red-500" />
          </span>
        </TooltipTrigger>
        <TooltipContent side="top">Archived</TooltipContent>
      </Tooltip>
    </span>
  );
}

function getDeviceDisplayValidationStatus(item: GenericItem) {
  const requestStatus = pick(item, ["latest_validation_request_status"]);
  if (requestStatus !== "-") return requestStatus;

  const status = pick(item, ["validation_status"]).trim().toLowerCase();
  const hasFinalValidationDate = pick(item, ["validation_date"]) !== "-" || pick(item, ["last_validation_at"]) !== "-";
  if (["valid", "validated", "verified", "ok"].includes(status) && !hasFinalValidationDate) return "unvalidated";

  return status || "unvalidated";
}

function getDeviceValidationTitle(item: GenericItem, fallbackLabel: string) {
  const requestStatus = pick(item, ["latest_validation_request_status"]);
  if (requestStatus === "-") return fallbackLabel;

  const requestCode = pick(item, ["latest_validation_request_code"]);
  const submittedBy = pick(item, ["latest_validation_submitted_by_name"]);
  const submittedAt = formatDateTime(pick(item, ["latest_validation_submitted_at"]));
  return [
    fallbackLabel,
    requestCode !== "-" ? `Request: ${requestCode}` : null,
    submittedBy !== "-" ? `Validator: ${submittedBy}` : null,
    submittedAt !== "-" ? `Submit: ${submittedAt}` : null,
  ].filter(Boolean).join(" | ");
}

function renderRouteTypeTags(value: unknown) {
  const arr = Array.isArray(value) ? value.filter(Boolean) : [];
  if (!arr.length) {
    return <Badge variant="secondary" className="text-xs font-normal">ALL</Badge>;
  }
  if (arr.includes("_NONE_")) {
    return <Badge variant="outline" className="text-xs font-normal text-destructive border-destructive/50">NONE</Badge>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {arr.map((type: string) => (
        <Badge key={type} variant="outline" className="text-xs font-normal">{type}</Badge>
      ))}
    </div>
  );
}

function renderDeviceTypeTags(value: unknown) {
  const arr = Array.isArray(value) ? value.filter(Boolean) : [];
  if (!arr.length) return <span className="text-xs text-muted-foreground">-</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {arr.map((type: string) => (
        <Badge key={type} variant="outline" className="text-xs font-normal">{type}</Badge>
      ))}
    </div>
  );
}

function renderDeviceIconCell(iconName: string) {
  const normalized = iconName === "-" ? "HardDrive" : iconName;
  const DeviceIcon = getDeviceIcon(normalized);
  return (
    <div className="flex items-center justify-center" title={normalized}>
      <DeviceIcon className="size-4 text-muted-foreground" />
    </div>
  );
}
