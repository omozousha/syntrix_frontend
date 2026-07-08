"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import QRCode from "qrcode";
import { useCallback, useEffect, useMemo, useState } from "react";
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
import { DataListKpiStrip } from "@/components/features/data-management/device-list/data-list-kpi-strip";
import { DataMobileList } from "@/components/features/data-management/device-list/data-mobile-list";
import { DataTableView } from "@/components/features/data-management/device-list/data-table-view";
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
import { buildDeviceListDisplay, type DeviceListLookupMaps } from "@/lib/display-adapters/device-list-display-adapter";
import { buildDeviceQrHref, drawQrLabelPdf, formatQrPopLabel, loadQrLabelLogoDataUrl, loadQrLabelSettings } from "@/lib/qr-label";
import { mapValidationStatus } from "@/lib/validation-status";

const APP_BASE_URL = process.env.NEXT_PUBLIC_APP_BASE_URL?.trim() || "";

type GenericItem = Record<string, unknown> & {
  id: string;
  updated_at?: string | null;
  created_at?: string | null;
};

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
  const [createForm, setCreateForm] = useState<Record<string, string>>({});
  const [createError, setCreateError] = useState("");
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
  const [actionLoading, setActionLoading] = useState(false);

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
    supportsPopFilter || supportsProjectFilter
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
    if (!createOpen || !category) return;
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
  }, [createOpen, category, token]);

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
    if (category.resource === "deviceTypes") return [selectAllHeader, "Icon", "Type Key", "Type Name", "Inventory Code", "Asset Group", "Status", "Updated"];
    if (category.resource === "popTypes") return [selectAllHeader, "Code", "POP Type", "Status", "Updated"];
    if (category.resource === "routeTypes") return [selectAllHeader, "Code", "Route Type", "Status", "Updated"];
    if (category.resource === "cableTypes") return [selectAllHeader, "Code", "Cable Type", "Description", "Status", "Updated"];
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
        const validation = formatValidationStatus(validationStatus);
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
          pick(item, ["inventory_type_code"]),
          pick(item, ["asset_group"]),
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
          pick(item, ["description"]),
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
    return `/data-management/list/${category?.slug}/${itemId}${queryString ? `?${queryString}` : ""}`;
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

  async function submitDelete() {
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
          return {
            deviceName: pick(row, ["device_name", "name"]),
            deviceCode: pick(row, ["device_id", "id"]),
            deviceType: pick(row, ["device_type_key"]),
            popName: formatQrPopLabel(display.pop, pick(row, ["pop_code", "pop_id"])),
            projectName: display.project,
            tenantName: display.tenant,
            qrDataUrl: await QRCode.toDataURL(buildDeviceDirectHref(category.slug, row), {
              width: 360,
              margin: 2,
              errorCorrectionLevel: "H",
            }),
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
          onCreate={() => setCreateOpen(true)}
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
                    const validation = formatValidationStatus(getDeviceDisplayValidationStatus(row));
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

      <AlertDialog open={Boolean(renameTarget)} onOpenChange={(open) => !open && setRenameTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rename {category.label}</AlertDialogTitle>
            <AlertDialogDescription>
              Perbarui nama data tanpa keluar dari halaman list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={renameValue}
            onChange={(event) => setRenameValue(event.target.value)}
            placeholder={`Masukkan ${renameConfig?.label || "nama baru"}`}
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Batal</AlertDialogCancel>
            <AlertDialogAction disabled={actionLoading} onClick={() => void submitRename()}>
              {actionLoading ? "Menyimpan..." : "Simpan"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isSoftDeleteResource ? "Arsipkan" : "Hapus"} {category.label}?</AlertDialogTitle>
            <AlertDialogDescription>
              {isSoftDeleteResource
                ? "Data akan dipindahkan ke arsip (soft delete) dan tidak tampil di list utama."
                : "Aksi ini tidak bisa dibatalkan. Data yang dipilih akan dihapus permanen."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Batal</AlertDialogCancel>
            <AlertDialogAction disabled={actionLoading} onClick={() => void submitDelete()}>
              {actionLoading ? (isSoftDeleteResource ? "Mengarsipkan..." : "Menghapus...") : (isSoftDeleteResource ? "Arsipkan" : "Hapus")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

      <Sheet open={Boolean(quickEditTarget)} onOpenChange={(open) => !open && setQuickEditTarget(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Quick Edit {category.label}</SheetTitle>
            <SheetDescription>Ubah data langsung dari list tanpa pindah halaman.</SheetDescription>
          </SheetHeader>
          <div className="grid gap-3 px-4">          {renderCreateFields(category.resource, quickEditForm, setQuickEditForm, lookupOptions)}
          {supportsIsActiveResource(category.resource) && category.resource !== "splitterProfiles" ? (
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Combobox
                  value={quickEditForm.is_active || "true"}
                  onValueChange={(value) => setQuickEditForm((prev) => ({ ...prev, is_active: value }))}
                  options={[
                    { value: "true", label: "Active" },
                    { value: "false", label: "Inactive" },
                  ]}
                />
              </div>
            ) : null}
            {quickEditError ? <p className="text-sm text-destructive">{quickEditError}</p> : null}
          </div>
          <SheetFooter className="mt-2 border-t">
            <Button type="button" variant="outline" onClick={() => setQuickEditTarget(null)} disabled={actionLoading}>
              Batal
            </Button>
            <Button type="button" onClick={() => void submitQuickEdit()} disabled={actionLoading}>
              {actionLoading ? "Menyimpan..." : "Simpan"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Create {category.label}</SheetTitle>
            <SheetDescription>Tambahkan data master baru langsung dari halaman list.</SheetDescription>
          </SheetHeader>
          <div className="grid gap-3 px-4">
            {renderCreateFields(category.resource, createForm, setCreateForm, lookupOptions)}
            {createError ? <p className="text-sm text-destructive">{createError}</p> : null}
          </div>
          <SheetFooter className="mt-2 border-t">
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)} disabled={actionLoading}>
              Batal
            </Button>
            <Button type="button" onClick={() => void submitCreate()} disabled={actionLoading}>
              {actionLoading ? "Menyimpan..." : "Simpan"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function renderCreateFields(
  resource: string,
  form: Record<string, string>,
  setForm: (updater: (prev: Record<string, string>) => Record<string, string>) => void,
  lookups: {
    manufacturers: LookupOption[];
    brands: LookupOption[];
    provinces: LookupOption[];
    assetTypes: LookupOption[];
  },
) {
  const setValue = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  if (resource === "regions") {
    return (
      <>
        <div className="space-y-1.5">
          <Label>Region Name *</Label>
          <Input value={form.region_name || ""} onChange={(e) => setValue("region_name", e.target.value)} placeholder="Contoh: Jawa Barat" />
        </div>
        <div className="space-y-1.5">
          <Label>Inventory Region Code</Label>
          <Input value={form.inventory_region_code || "Otomatis"} disabled />
          <p className="text-xs text-muted-foreground">
            Diisi otomatis dari nomor regional berikutnya yang belum dipakai.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label>Region Color</Label>
          <RegionColorPickerField value={form.region_color || ""} onChange={(value) => setValue("region_color", value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Description</Label>
          <Input value={form.description || ""} onChange={(e) => setValue("description", e.target.value)} placeholder="Deskripsi region" />
        </div>
      </>
    );
  }

  if (resource === "deviceTypes") {
    return (
      <>
        <div className="space-y-1.5">
          <Label>Device Type Key *</Label>
          <Input value={form.device_type_key || ""} onChange={(e) => setValue("device_type_key", e.target.value.toUpperCase())} placeholder="Contoh: OLT" />
        </div>
        <div className="space-y-1.5">
          <Label>Device Type Name *</Label>
          <Input value={form.device_type_name || ""} onChange={(e) => setValue("device_type_name", e.target.value)} placeholder="Contoh: Optical Line Terminal" />
        </div>
        <div className="space-y-1.5">
          <Label>Asset Group *</Label>
          <Combobox
            value={form.asset_group || "active"}
            onValueChange={(value) => setValue("asset_group", value)}
            options={[
              { value: "active", label: "active" },
              { value: "passive", label: "passive" },
              { value: "cme", label: "CME" },
              { value: "building", label: "Building" },
            ]}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Inventory Type Code</Label>
          <Input value={form.inventory_type_code || "Otomatis"} disabled />
          <p className="text-xs text-muted-foreground">
            Diisi otomatis dari nomor tipe perangkat berikutnya yang belum dipakai.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label>Icon</Label>
          <Combobox
            value={form.icon_name || "HardDrive"}
            onValueChange={(value) => setValue("icon_name", value)}
            options={DEVICE_ICON_OPTIONS}
            placeholder="Pilih icon"
            searchPlaceholder="Cari icon..."
          />
        </div>
        <div className="space-y-1.5">
          <Label>Description</Label>
          <Input
            value={form.description || ""}
            onChange={(e) => setValue("description", e.target.value)}
            placeholder="Deskripsi tipe perangkat"
          />
        </div>
      </>
    );
  }

  if (resource === "popTypes") {
    return (
      <>
        <div className="space-y-1.5">
          <Label>POP Type Name *</Label>
          <Input value={form.pop_type_name || ""} onChange={(e) => setValue("pop_type_name", e.target.value)} placeholder="Contoh: Main POP" />
        </div>
        <div className="space-y-1.5">
          <Label>POP Type Code</Label>
          <Input value={form.pop_type_code || ""} onChange={(e) => setValue("pop_type_code", e.target.value.toUpperCase())} placeholder="Contoh: MAIN_POP" />
        </div>
      </>
    );
  }

  if (resource === "routeTypes") {
    return (
      <>
        <div className="space-y-1.5">
          <Label>Route Type Name *</Label>
          <Input value={form.route_type_name || ""} onChange={(e) => setValue("route_type_name", e.target.value)} placeholder="Contoh: Backbone" />
        </div>
        <div className="space-y-1.5">
          <Label>Route Type Code</Label>
          <Input value={form.route_type_code || ""} onChange={(e) => setValue("route_type_code", e.target.value.toUpperCase())} placeholder="Contoh: BB" />
        </div>
      </>
    );
  }

  if (resource === "cableTypes") {
    return (
      <>
        <div className="space-y-1.5">
          <Label>Cable Type Name *</Label>
          <Input value={form.cable_type_name || ""} onChange={(e) => setValue("cable_type_name", e.target.value)} placeholder="Contoh: Single-mode (SM)" />
        </div>
        <div className="space-y-1.5">
          <Label>Cable Type Code</Label>
          <Input value={form.cable_type_code || ""} onChange={(e) => setValue("cable_type_code", e.target.value.toUpperCase())} placeholder="Contoh: SM" />
        </div>
        <div className="space-y-1.5">
          <Label>Description</Label>
          <Input value={form.description || ""} onChange={(e) => setValue("description", e.target.value)} placeholder="Deskripsi tipe kabel" />
        </div>
        <div className="space-y-1.5">
          <Label>Sort Order</Label>
          <Input type="number" value={form.sort_order || "0"} onChange={(e) => setValue("sort_order", e.target.value)} />
        </div>
      </>
    );
  }

  if (resource === "coreCapacities") {
    const allowedKeys = parseJsonStringArray(form.allowed_route_type_keys);
    const isAllState = allowedKeys.length === 0;
    const isNoneState = allowedKeys.includes("_NONE_");
    const routeTypeList = ["BACKBONE", "FEEDER", "DISTRIBUTION", "ACCESS", "DROP"];
    const isChecked = (key: string) => isAllState || allowedKeys.includes(key);
    const toggleRouteTypeKey = (key: string) => {
      let next: string[];
      if (isAllState) {
        // Currently ALL, unchecking one → only the other 4
        next = routeTypeList.filter((k) => k !== key);
      } else if (isNoneState) {
        // Currently NONE, checking one → only this one
        next = [key];
      } else {
        next = allowedKeys.includes(key)
          ? allowedKeys.filter((k) => k !== key)
          : [...allowedKeys, key];
      }
      // All checked → ALL (empty)
      if (next.length === routeTypeList.length) {
        setValue("allowed_route_type_keys", "[]");
      }
      // None checked → NONE
      else if (next.length === 0) {
        setValue("allowed_route_type_keys", JSON.stringify(["_NONE_"]));
      }
      else {
        setValue("allowed_route_type_keys", JSON.stringify(next));
      }
    };

    return (
      <>
        <div className="space-y-1.5">
          <Label>Core Capacity Value *</Label>
          <Input type="number" min={1} value={form.core_capacity_value || ""} onChange={(e) => setValue("core_capacity_value", e.target.value)} placeholder="Contoh: 96" />
        </div>
        <div className="space-y-1.5">
          <Label>Label *</Label>
          <Input value={form.label || ""} onChange={(e) => setValue("label", e.target.value)} placeholder="Contoh: 96 Cores" />
        </div>
        <div className="space-y-1.5">
          <Label>Description</Label>
          <Input value={form.description || ""} onChange={(e) => setValue("description", e.target.value)} placeholder="Deskripsi kapasitas core" />
        </div>
        <div className="space-y-1.5">
          <Label>Route Types</Label>
          <p className="text-xs text-muted-foreground">Pilih kategori kabel yang diizinkan. Centang semua = ALL (semua kategori). Kosongkan semua = NONE (tidak ada kategori).</p>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isChecked("BACKBONE")}
                onChange={() => toggleRouteTypeKey("BACKBONE")}
                className="size-4 cursor-pointer rounded border-input bg-background text-primary"
              />
              BACKBONE
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isChecked("FEEDER")}
                onChange={() => toggleRouteTypeKey("FEEDER")}
                className="size-4 cursor-pointer rounded border-input bg-background text-primary"
              />
              FEEDER
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isChecked("DISTRIBUTION")}
                onChange={() => toggleRouteTypeKey("DISTRIBUTION")}
                className="size-4 cursor-pointer rounded border-input bg-background text-primary"
              />
              DISTRIBUTION
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isChecked("ACCESS")}
                onChange={() => toggleRouteTypeKey("ACCESS")}
                className="size-4 cursor-pointer rounded border-input bg-background text-primary"
              />
              ACCESS
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isChecked("DROP")}
                onChange={() => toggleRouteTypeKey("DROP")}
                className="size-4 cursor-pointer rounded border-input bg-background text-primary"
              />
              DROP
            </label>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Sort Order</Label>
          <Input type="number" value={form.sort_order || "0"} onChange={(e) => setValue("sort_order", e.target.value)} />
        </div>
      </>
    );
  }

  if (resource === "odpTypes") {
    return (
      <>
        <div className="space-y-1.5">
          <Label>ODP Type Name *</Label>
          <Input value={form.odp_type_name || ""} onChange={(e) => setValue("odp_type_name", e.target.value)} placeholder="Contoh: ODP PB" />
        </div>
        <div className="space-y-1.5">
          <Label>ODP Type Code</Label>
          <Input value={form.odp_type_code || ""} onChange={(e) => setValue("odp_type_code", e.target.value.toUpperCase())} placeholder="Contoh: ODP_PB" />
        </div>
      </>
    );
  }

  if (resource === "installationTypes") {
    return (
      <>
        <div className="space-y-1.5">
          <Label>Installation Type Name *</Label>
          <Input value={form.installation_type_name || ""} onChange={(e) => setValue("installation_type_name", e.target.value)} placeholder="Contoh: Aerial" />
        </div>
        <div className="space-y-1.5">
          <Label>Installation Type Code</Label>
          <Input value={form.installation_type_code || ""} onChange={(e) => setValue("installation_type_code", e.target.value.toUpperCase())} placeholder="Contoh: AERIAL" />
        </div>
      </>
    );
  }

  if (resource === "serviceTypes") {
    return (
      <>
        <div className="space-y-1.5">
          <Label>Service Type Name *</Label>
          <Input value={form.service_type_name || ""} onChange={(e) => setValue("service_type_name", e.target.value)} placeholder="Contoh: Internet" />
        </div>
        <div className="space-y-1.5">
          <Label>Service Type Code</Label>
          <Input value={form.service_type_code || ""} onChange={(e) => setValue("service_type_code", e.target.value.toUpperCase())} placeholder="Contoh: INTERNET" />
        </div>
        <div className="space-y-1.5">
          <Label>Description</Label>
          <Input value={form.description || ""} onChange={(e) => setValue("description", e.target.value)} placeholder="Deskripsi jenis layanan" />
        </div>
        <div className="space-y-1.5">
          <Label>Sort Order</Label>
          <Input type="number" value={form.sort_order || "0"} onChange={(e) => setValue("sort_order", e.target.value)} />
        </div>
      </>
    );
  }

  if (resource === "tenants") {
    return (
      <>
        <div className="space-y-1.5">
          <Label>Tenant Name *</Label>
          <Input value={form.tenant_name || ""} onChange={(e) => setValue("tenant_name", e.target.value)} placeholder="Contoh: FiberPro" />
        </div>
        <div className="space-y-1.5">
          <Label>Tenant Code</Label>
          <Input value={form.tenant_code || ""} onChange={(e) => setValue("tenant_code", e.target.value.toUpperCase())} placeholder="Contoh: FIBERPRO" />
        </div>
        <div className="space-y-1.5">
          <Label>Description</Label>
          <Input value={form.description || ""} onChange={(e) => setValue("description", e.target.value)} placeholder="Deskripsi tenant" />
        </div>
        <div className="space-y-1.5">
          <Label>Sort Order</Label>
          <Input type="number" value={form.sort_order || "0"} onChange={(e) => setValue("sort_order", e.target.value)} />
        </div>
      </>
    );
  }

  if (resource === "manufacturers") {
    return (
      <>
        <div className="space-y-1.5">
          <Label>Manufacturer Name *</Label>
          <Input value={form.manufacturer_name || ""} onChange={(e) => setValue("manufacturer_name", e.target.value)} placeholder="Contoh: Huawei" />
        </div>
        <div className="space-y-1.5">
          <Label>Manufacturer Code</Label>
          <Input value={form.manufacturer_code || ""} onChange={(e) => setValue("manufacturer_code", e.target.value.toUpperCase())} placeholder="Contoh: HUAWEI" />
        </div>
      </>
    );
  }

  if (resource === "brands") {
    return (
      <>
        <div className="space-y-1.5">
          <Label>Brand Name *</Label>
          <Input value={form.brand_name || ""} onChange={(e) => setValue("brand_name", e.target.value)} placeholder="Contoh: MA5800" />
        </div>
        <div className="space-y-1.5">
          <Label>Brand Code</Label>
          <Input value={form.brand_code || ""} onChange={(e) => setValue("brand_code", e.target.value.toUpperCase())} placeholder="Contoh: MA5800" />
        </div>
        <div className="space-y-1.5">
          <Label>Manufacturer</Label>
          <Combobox
            value={form.manufacturer_id || "__none"}
            onValueChange={(value) => setValue("manufacturer_id", value === "__none" ? "" : value)}
            placeholder="Pilih manufacturer"
            searchPlaceholder="Cari manufacturer..."
            options={[{ value: "__none", label: "-" }, ...mapLookupToOptions(lookups.manufacturers)]}
          />
        </div>
      </>
    );
  }

  if (resource === "assetModels") {
    return (
      <>
        <div className="space-y-1.5">
          <Label>Model Name *</Label>
          <Input value={form.model_name || ""} onChange={(e) => setValue("model_name", e.target.value)} placeholder="Contoh: MA5800-X17" />
        </div>
        <div className="space-y-1.5">
          <Label>Model Code</Label>
          <Input value={form.model_code || ""} onChange={(e) => setValue("model_code", e.target.value.toUpperCase())} placeholder="Contoh: MA5800X17" />
        </div>
        <div className="space-y-1.5">
          <Label>Brand</Label>
          <Combobox
            value={form.brand_id || "__none"}
            onValueChange={(value) => setValue("brand_id", value === "__none" ? "" : value)}
            placeholder="Pilih brand"
            searchPlaceholder="Cari brand..."
            options={[{ value: "__none", label: "-" }, ...mapLookupToOptions(lookups.brands)]}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Manufacturer</Label>
          <Combobox
            value={form.manufacturer_id || "__none"}
            onValueChange={(value) => setValue("manufacturer_id", value === "__none" ? "" : value)}
            placeholder="Pilih manufacturer"
            searchPlaceholder="Cari manufacturer..."
            options={[{ value: "__none", label: "-" }, ...mapLookupToOptions(lookups.manufacturers)]}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Asset Type</Label>
          <Combobox
            value={form.asset_type_id || "__none"}
            onValueChange={(value) => setValue("asset_type_id", value === "__none" ? "" : value)}
            placeholder="Pilih asset type"
            searchPlaceholder="Cari asset type..."
            options={[{ value: "__none", label: "-" }, ...mapLookupToOptions(lookups.assetTypes)]}
          />
        </div>
      </>
    );
  }

  if (resource === "splitterProfiles") {
    const allowedKeys = parseJsonStringArray(form.allowed_device_type_keys);
    const toggleDeviceTypeKey = (key: string) => {
      const next = allowedKeys.includes(key) ? allowedKeys.filter((k) => k !== key) : [...allowedKeys, key];
      setValue("allowed_device_type_keys", JSON.stringify(next));
    };

    return (
      <>
        <div className="space-y-1.5">
          <Label>Ratio Label *</Label>
          <Input value={form.ratio_label || ""} onChange={(e) => setValue("ratio_label", e.target.value)} placeholder="Contoh: 1:8" />
        </div>
        <div className="space-y-1.5">
          <Label>Input Port Count *</Label>
          <Input type="number" min={1} value={form.input_port_count || ""} onChange={(e) => setValue("input_port_count", e.target.value)} placeholder="Contoh: 1" />
        </div>
        <div className="space-y-1.5">
          <Label>Output Port Count *</Label>
          <Input type="number" min={1} value={form.output_port_count || ""} onChange={(e) => setValue("output_port_count", e.target.value)} placeholder="Contoh: 8" />
        </div>
        <div className="space-y-1.5">
          <Label>Expected Loss (dB)</Label>
          <Input type="number" step="0.01" min={0} value={form.expected_loss_db || ""} onChange={(e) => setValue("expected_loss_db", e.target.value)} placeholder="Contoh: 10.5" />
        </div>
        <div className="space-y-1.5">
          <Label>Device Types</Label>
          <p className="text-xs text-muted-foreground">Pilih tipe perangkat yang diizinkan menggunakan splitter ratio ini.</p>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={allowedKeys.includes("ODC")}
                onChange={() => toggleDeviceTypeKey("ODC")}
                className="size-4 cursor-pointer rounded border-input bg-background text-primary"
              />
              ODC
            </label>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Notes</Label>
          <Input value={form.notes || ""} onChange={(e) => setValue("notes", e.target.value)} placeholder="Catatan splitter profile" />
        </div>
      </>
    );
  }

  if (resource === "provinces") {
    return (
      <>
        <div className="space-y-1.5">
          <Label>Province Name *</Label>
          <Input value={form.province_name || ""} onChange={(e) => setValue("province_name", e.target.value)} placeholder="Contoh: Banten" />
        </div>
      </>
    );
  }

  if (resource === "cities") {
    return (
      <>
        <div className="space-y-1.5">
          <Label>City Name *</Label>
          <Input value={form.city_name || ""} onChange={(e) => setValue("city_name", e.target.value)} placeholder="Contoh: Kota Serang" />
        </div>
        <div className="space-y-1.5">
          <Label>City Code</Label>
          <Input value={form.city_code || ""} onChange={(e) => setValue("city_code", e.target.value.toUpperCase())} placeholder="Contoh: SERANG" />
        </div>
        <div className="space-y-1.5">
          <Label>Province</Label>
          <Combobox
            value={form.province_id || "__none"}
            onValueChange={(value) => setValue("province_id", value === "__none" ? "" : value)}
            placeholder="Pilih province"
            searchPlaceholder="Cari province..."
            options={[{ value: "__none", label: "-" }, ...mapLookupToOptions(lookups.provinces)]}
          />
        </div>
      </>
    );
  }

  if (resource === "deviceCoreCapacities") {
    const allowedKeys = parseJsonStringArray(form.allowed_device_type_keys);
    const toggleDeviceTypeKey = (key: string) => {
      const next = allowedKeys.includes(key) ? allowedKeys.filter((k) => k !== key) : [...allowedKeys, key];
      setValue("allowed_device_type_keys", JSON.stringify(next));
    };

    return (
      <>
        <div className="space-y-1.5">
          <Label>Core Capacity Value *</Label>
          <Input type="number" min={1} value={form.core_capacity_value || ""} onChange={(e) => setValue("core_capacity_value", e.target.value)} placeholder="Contoh: 48" />
        </div>
        <div className="space-y-1.5">
          <Label>Label *</Label>
          <Input value={form.label || ""} onChange={(e) => setValue("label", e.target.value)} placeholder="Contoh: 48 Cores" />
        </div>
        <div className="space-y-1.5">
          <Label>Description</Label>
          <Input value={form.description || ""} onChange={(e) => setValue("description", e.target.value)} placeholder="Deskripsi kapasitas core" />
        </div>
        <div className="space-y-1.5">
          <Label>Device Types</Label>
          <p className="text-xs text-muted-foreground">Pilih tipe perangkat yang diizinkan. Kosongkan = berlaku untuk semua.</p>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={allowedKeys.includes("OTB")}
                onChange={() => toggleDeviceTypeKey("OTB")}
                className="size-4 cursor-pointer rounded border-input bg-background text-primary"
              />
              OTB
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={allowedKeys.includes("ODC")}
                onChange={() => toggleDeviceTypeKey("ODC")}
                className="size-4 cursor-pointer rounded border-input bg-background text-primary"
              />
              ODC
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={allowedKeys.includes("JC")}
                onChange={() => toggleDeviceTypeKey("JC")}
                className="size-4 cursor-pointer rounded border-input bg-background text-primary"
              />
              JC
            </label>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Sort Order</Label>
          <Input type="number" value={form.sort_order || "0"} onChange={(e) => setValue("sort_order", e.target.value)} />
        </div>
      </>
    );
  }

  return (
    <p className="text-sm text-muted-foreground">
      Form create belum tersedia untuk resource ini.
    </p>
  );
}

function getCreateDefaults(resource: string): Record<string, string> {
  if (resource === "deviceTypes") return { asset_group: "active", icon_name: "HardDrive", is_active: "true", sort_order: "0" };
  if (resource === "popTypes") return { is_active: "true", sort_order: "0" };
  if (resource === "routeTypes") return { is_active: "true", sort_order: "0" };
  if (resource === "cableTypes") return { is_active: "true", sort_order: "0" };
  if (resource === "coreCapacities") return { is_active: "true", sort_order: "0", allowed_route_type_keys: "[]" };
  if (resource === "deviceCoreCapacities") return { is_active: "true", sort_order: "0", allowed_device_type_keys: "[]" };
  if (resource === "odpTypes") return { is_active: "true", sort_order: "0" };
  if (resource === "installationTypes") return { is_active: "true", sort_order: "0" };
  if (resource === "serviceTypes") return { is_active: "true", sort_order: "0" };
  if (resource === "tenants") return { is_active: "true", sort_order: "0" };
  if (resource === "splitterProfiles") return { input_port_count: "1", output_port_count: "8", allowed_device_type_keys: "[]", is_active: "true" };
  if (resource === "provinces") return { is_active: "true" };
  if (resource === "cities") return { is_active: "true" };
  return {};
}

type OdpIssueKey =
  | "odp-without-ports"
  | "odp-pending-validation"
  | "odp-used-without-endpoint"
  | "odp-assigned-not-used"
  | "odp-down-maintenance";

type OdpIssueRow = {
  rowId: string;
  issue: OdpIssueKey;
  odpId: string;
  odpDeviceId: string;
  odpDeviceName: string;
  portLabel: string;
  portStatus: string;
  note: string;
  auditEntityType: string;
  auditEntityId: string;
};

function OdpQualityTab({ regionId, token }: { regionId: string; token: string }) {
  const issueOptions: Array<{ key: OdpIssueKey; label: string }> = [
    { key: "odp-without-ports", label: "ODP tanpa port" },
    { key: "odp-pending-validation", label: "ODP belum tervalidasi" },
    { key: "odp-used-without-endpoint", label: "Port used tanpa Customer/ONT" },
    { key: "odp-assigned-not-used", label: "Port assigned tapi status bukan used" },
    { key: "odp-down-maintenance", label: "Port down/maintenance" },
  ];
  const [issue, setIssue] = useState<OdpIssueKey>("odp-without-ports");
  const [rows, setRows] = useState<OdpIssueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError("");
      try {
        const suffix = regionId ? `&region_id=${encodeURIComponent(regionId)}` : "";
        const [devices, ports] = await Promise.all([
          fetchAllPages(`/devices?device_type_key=ODP${suffix}`, token),
          fetchAllPages(`/devicePorts?${suffix.replace(/^&/, "")}`, token),
        ]);
        if (cancelled) return;
        const result = buildOdpIssueRows(issue, devices, ports);
        setRows(result);
      } catch (err) {
        if (!cancelled) setError((err as Error).message || "Gagal memuat issue ODP.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [issue, regionId, token]);

  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return rows;
    return rows.filter((row) => [row.odpDeviceName, row.odpDeviceId, row.portLabel, row.note].join(" ").toLowerCase().includes(keyword));
  }, [rows, search]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>ODP Quality Issues</CardTitle>
        <CardDescription>Issue ODP per region aktif. Direct action ke ODP detail/field/audit trail.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {issueOptions.map((item) => (
            <Button key={item.key} type="button" size="sm" variant={issue === item.key ? "default" : "outline"} onClick={() => setIssue(item.key)}>
              {item.label}
            </Button>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari ODP ID / nama / port / catatan..." />
          <Button type="button" variant="outline" onClick={() => setSearch("")}>Reset</Button>
        </div>
        {loading ? <AppLoading label="Memuat issue ODP..." /> : null}
        {!loading && error ? <p className="text-sm text-destructive">{error}</p> : null}
        {!loading && !error ? (
          <div className="space-y-2">
            {filteredRows.length ? filteredRows.map((row) => (
              <div key={row.rowId} className="rounded-md border bg-background p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{row.odpDeviceName}</p>
                    <p className="text-xs text-muted-foreground">{row.odpDeviceId}</p>
                  </div>
                  <span className="rounded border px-2 py-0.5 text-xs">{row.portStatus || "-"}</span>
                </div>
                <p className="mt-2 text-xs"><span className="font-medium">Port:</span> {row.portLabel}</p>
                <p className="mt-1 text-xs text-muted-foreground">{row.note}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button asChild variant="outline" size="sm"><Link href={`/data-management/list/odp/${row.odpId}`}>Open ODP</Link></Button>
                  <Button asChild variant="outline" size="sm"><Link href={`/audit-trail?entity_type=${encodeURIComponent(row.auditEntityType)}&entity_id=${encodeURIComponent(row.auditEntityId)}`}>Audit Trail</Link></Button>
                </div>
              </div>
            )) : <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">Tidak ada issue pada filter saat ini.</p>}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

async function fetchAllPages(path: string, token: string) {
  let page = 1;
  const limit = 100;
  const all: GenericItem[] = [];
  while (true) {
    const joiner = path.includes("?") ? "&" : "?";
    const result = await apiFetch<PaginatedResponse<GenericItem>>(`${path}${joiner}page=${page}&limit=${limit}`, { token });
    const rows = result.data || [];
    all.push(...rows);
    if (rows.length < limit) break;
    page += 1;
    if (page > 50) break;
  }
  return all;
}

function buildOdpIssueRows(issue: OdpIssueKey, devices: GenericItem[], ports: GenericItem[]) {
  const odpMap = new Map(devices.map((item) => [item.id, item]));
  const odpPorts = ports.filter((port) => port.device_id && odpMap.has(String(port.device_id)));
  const portsByOdp = new Map<string, GenericItem[]>();
  odpPorts.forEach((port) => {
    const key = String(port.device_id);
    if (!portsByOdp.has(key)) portsByOdp.set(key, []);
    portsByOdp.get(key)?.push(port);
  });

  const toRow = (key: OdpIssueKey, odp: GenericItem | null, port: GenericItem | null, note: string): OdpIssueRow => {
    const hasPort = Boolean(port?.id);
    const odpId = String(odp?.id || port?.device_id || "");
    return {
      rowId: `${key}:${port?.id || odpId}`,
      issue: key,
      odpId,
      odpDeviceId: String(odp?.device_id || odpId || "-"),
      odpDeviceName: String(odp?.device_name || "ODP"),
      portLabel: String(port?.port_label || (port?.port_index != null ? `Port ${String(port.port_index)}` : "-")),
      portStatus: String(port?.status || odp?.status || "-"),
      note,
      auditEntityType: hasPort ? "devicePorts" : "devices",
      auditEntityId: hasPort ? String(port?.id || "") : odpId,
    };
  };

  if (issue === "odp-without-ports") return devices.filter((item) => !portsByOdp.has(item.id)).map((item) => toRow(issue, item, null, "ODP belum memiliki data port."));
  if (issue === "odp-pending-validation") {
    return devices
      .filter((item) => getDeviceDisplayValidationStatus(item) === "unvalidated")
      .map((item) => toRow(issue, item, null, "ODP belum tervalidasi."));
  }
  if (issue === "odp-used-without-endpoint") return odpPorts.filter((port) => String(port.status || "") === "used" && !port.customer_id && !port.ont_device_id).map((port) => toRow(issue, odpMap.get(String(port.device_id)) || null, port, "Port status used tanpa customer/ONT."));
  if (issue === "odp-assigned-not-used") return odpPorts.filter((port) => (port.customer_id || port.ont_device_id) && String(port.status || "") !== "used").map((port) => toRow(issue, odpMap.get(String(port.device_id)) || null, port, "Customer/ONT terisi, tapi status port bukan used."));
  return odpPorts.filter((port) => String(port.status || "") === "down" || String(port.status || "") === "maintenance").map((port) => toRow(issue, odpMap.get(String(port.device_id)) || null, port, "Port berada pada status down/maintenance."));
}

function buildEditFormFromItem(resource: string, item: GenericItem): Record<string, string> {
  const read = (...keys: string[]) => {
    for (const key of keys) {
      const value = item[key];
      if (value === null || value === undefined) continue;
      return String(value);
    }
    return "";
  };
  const readBool = (key: string, fallback = true) => {
    const value = item[key];
    if (typeof value === "boolean") return String(value);
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (normalized === "true") return "true";
      if (normalized === "false") return "false";
    }
    return String(fallback);
  };

  if (resource === "regions") {
    return {
      region_name: read("region_name"),
      region_color: read("region_color"),
      description: read("description"),
    };
  }
  if (resource === "deviceTypes") {
    return {
      device_type_key: read("device_type_key"),
      device_type_name: read("device_type_name"),
      asset_group: read("asset_group") || "active",
      icon_name: read("icon_name") || "HardDrive",
      description: read("description"),
      sort_order: read("sort_order") || "0",
      is_active: readBool("is_active", true),
    };
  }
  if (resource === "popTypes") {
    return {
      pop_type_name: read("pop_type_name"),
      pop_type_code: read("pop_type_code"),
      description: read("description"),
      sort_order: read("sort_order") || "0",
      is_active: readBool("is_active", true),
    };
  }
  if (resource === "routeTypes") {
    return {
      route_type_name: read("route_type_name"),
      route_type_code: read("route_type_code"),
      description: read("description"),
      sort_order: read("sort_order") || "0",
      is_active: readBool("is_active", true),
    };
  }
  if (resource === "cableTypes") {
    return {
      cable_type_name: read("cable_type_name"),
      cable_type_code: read("cable_type_code"),
      description: read("description"),
      sort_order: read("sort_order") || "0",
      is_active: readBool("is_active", true),
    };
  }
  if (resource === "coreCapacities") {
    const rawKeys = item.allowed_route_type_keys;
    return {
      label: read("label"),
      core_capacity_value: read("core_capacity_value"),
      description: read("description"),
      allowed_route_type_keys: JSON.stringify(Array.isArray(rawKeys) ? rawKeys : []),
      sort_order: read("sort_order") || "0",
      is_active: readBool("is_active", true),
    };
  }
  if (resource === "deviceCoreCapacities") {
    const rawKeys = item.allowed_device_type_keys;
    return {
      label: read("label"),
      core_capacity_value: read("core_capacity_value"),
      description: read("description"),
      allowed_device_type_keys: JSON.stringify(Array.isArray(rawKeys) ? rawKeys : []),
      sort_order: read("sort_order") || "0",
      is_active: readBool("is_active", true),
    };
  }
  if (resource === "odpTypes") {
    return {
      odp_type_name: read("odp_type_name"),
      odp_type_code: read("odp_type_code"),
      description: read("description"),
      sort_order: read("sort_order") || "0",
      is_active: readBool("is_active", true),
    };
  }
  if (resource === "installationTypes") {
    return {
      installation_type_name: read("installation_type_name"),
      installation_type_code: read("installation_type_code"),
      description: read("description"),
      sort_order: read("sort_order") || "0",
      is_active: readBool("is_active", true),
    };
  }
  if (resource === "serviceTypes") {
    return {
      service_type_name: read("service_type_name"),
      service_type_code: read("service_type_code"),
      description: read("description"),
      sort_order: read("sort_order") || "0",
      is_active: readBool("is_active", true),
    };
  }
  if (resource === "tenants") {
    return {
      tenant_name: read("tenant_name"),
      tenant_code: read("tenant_code"),
      description: read("description"),
      sort_order: read("sort_order") || "0",
      is_active: readBool("is_active", true),
    };
  }
  if (resource === "manufacturers") {
    return {
      manufacturer_name: read("manufacturer_name"),
      manufacturer_code: read("manufacturer_code"),
      description: read("description"),
    };
  }
  if (resource === "brands") {
    return {
      brand_name: read("brand_name"),
      brand_code: read("brand_code"),
      manufacturer_id: read("manufacturer_id"),
      description: read("description"),
    };
  }
  if (resource === "assetModels") {
    return {
      model_name: read("model_name"),
      model_code: read("model_code"),
      asset_type_id: read("asset_type_id"),
      brand_id: read("brand_id"),
      manufacturer_id: read("manufacturer_id"),
      description: read("description"),
    };
  }
  if (resource === "splitterProfiles") {
    const rawKeys = item.allowed_device_type_keys;
    return {
      ratio_label: read("ratio_label"),
      input_port_count: read("input_port_count"),
      output_port_count: read("output_port_count"),
      expected_loss_db: read("expected_loss_db"),
      allowed_device_type_keys: JSON.stringify(Array.isArray(rawKeys) ? rawKeys : []),
      notes: read("notes"),
      is_active: readBool("is_active", true),
    };
  }
  if (resource === "provinces") {
    return {
      province_name: read("province_name"),
      is_active: readBool("is_active", true),
    };
  }
  if (resource === "cities") {
    return {
      city_name: read("city_name"),
      city_code: read("city_code"),
      province_id: read("province_id"),
      is_active: readBool("is_active", true),
    };
  }
  return {};
}

function buildCreatePayload(resource: string, form: Record<string, string>) {
  const trim = (key: string) => (form[key] || "").trim();
  const payload: Record<string, unknown> = {};
  const assign = (key: string) => {
    const value = trim(key);
    if (value) payload[key] = value;
  };

  if (resource === "regions") {
    if (!trim("region_name")) return null;
    assign("region_name");
    assign("region_color");
    assign("description");
    return payload;
  }
  if (resource === "deviceTypes") {
    if (!trim("device_type_key") || !trim("device_type_name") || !trim("asset_group")) return null;
    assign("device_type_key");
    assign("device_type_name");
    assign("asset_group");
    assign("icon_name");
    assign("description");
    payload.sort_order = Number(trim("sort_order") || "0");
    payload.is_active = (trim("is_active") || "true") !== "false";
    return payload;
  }
  if (resource === "popTypes") {
    if (!trim("pop_type_name")) return null;
    assign("pop_type_name");
    assign("pop_type_code");
    assign("description");
    payload.sort_order = Number(trim("sort_order") || "0");
    payload.is_active = (trim("is_active") || "true") !== "false";
    return payload;
  }
  if (resource === "routeTypes") {
    if (!trim("route_type_name")) return null;
    assign("route_type_name");
    assign("route_type_code");
    assign("description");
    payload.sort_order = Number(trim("sort_order") || "0");
    payload.is_active = (trim("is_active") || "true") !== "false";
    return payload;
  }
  if (resource === "cableTypes") {
    if (!trim("cable_type_name")) return null;
    assign("cable_type_name");
    assign("cable_type_code");
    assign("description");
    payload.sort_order = Number(trim("sort_order") || "0");
    payload.is_active = (trim("is_active") || "true") !== "false";
    return payload;
  }
  if (resource === "coreCapacities") {
    if (!trim("label") || !trim("core_capacity_value")) return null;
    assign("label");
    payload.core_capacity_value = Number(trim("core_capacity_value"));
    assign("description");
    const parsedRouteKeys = parseJsonStringArray(form.allowed_route_type_keys);
    payload.allowed_route_type_keys = parsedRouteKeys;
    payload.sort_order = Number(trim("sort_order") || "0");
    payload.is_active = (trim("is_active") || "true") !== "false";
    return payload;
  }
  if (resource === "deviceCoreCapacities") {
    if (!trim("label") || !trim("core_capacity_value")) return null;
    assign("label");
    payload.core_capacity_value = Number(trim("core_capacity_value"));
    assign("description");
    const parsedDeviceKeys = parseJsonStringArray(form.allowed_device_type_keys);
    payload.allowed_device_type_keys = parsedDeviceKeys;
    payload.sort_order = Number(trim("sort_order") || "0");
    payload.is_active = form.is_active === "true";
    return payload;
  }
  if (resource === "odpTypes") {
    if (!trim("odp_type_name")) return null;
    assign("odp_type_name");
    assign("odp_type_code");
    assign("description");
    payload.sort_order = Number(trim("sort_order") || "0");
    payload.is_active = (trim("is_active") || "true") !== "false";
    return payload;
  }
  if (resource === "installationTypes") {
    if (!trim("installation_type_name")) return null;
    assign("installation_type_name");
    assign("installation_type_code");
    assign("description");
    payload.sort_order = Number(trim("sort_order") || "0");
    payload.is_active = (trim("is_active") || "true") !== "false";
    return payload;
  }
  if (resource === "serviceTypes") {
    if (!trim("service_type_name")) return null;
    assign("service_type_name");
    assign("service_type_code");
    assign("description");
    payload.sort_order = Number(trim("sort_order") || "0");
    payload.is_active = (trim("is_active") || "true") !== "false";
    return payload;
  }
  if (resource === "tenants") {
    if (!trim("tenant_name")) return null;
    assign("tenant_name");
    assign("tenant_code");
    assign("description");
    payload.sort_order = Number(trim("sort_order") || "0");
    payload.is_active = (trim("is_active") || "true") !== "false";
    return payload;
  }
  if (resource === "manufacturers") {
    if (!trim("manufacturer_name")) return null;
    assign("manufacturer_name");
    assign("manufacturer_code");
    assign("description");
    return payload;
  }
  if (resource === "brands") {
    if (!trim("brand_name")) return null;
    assign("brand_name");
    assign("brand_code");
    assign("manufacturer_id");
    assign("description");
    return payload;
  }
  if (resource === "assetModels") {
    if (!trim("model_name")) return null;
    assign("model_name");
    assign("model_code");
    assign("asset_type_id");
    assign("brand_id");
    assign("manufacturer_id");
    assign("description");
    return payload;
  }
  if (resource === "splitterProfiles") {
    if (!trim("ratio_label") || !trim("input_port_count") || !trim("output_port_count")) return null;
    assign("ratio_label");
    payload.input_port_count = Number(trim("input_port_count"));
    payload.output_port_count = Number(trim("output_port_count"));
    if (trim("expected_loss_db")) payload.expected_loss_db = Number(trim("expected_loss_db"));
    const parsedKeys = parseJsonStringArray(form.allowed_device_type_keys);
    payload.allowed_device_type_keys = parsedKeys;
    payload.is_active = parsedKeys.length > 0; // auto-derive: ada device type = aktif, kosong = nonaktif
    assign("notes");
    return payload;
  }
  if (resource === "provinces") {
    if (!trim("province_name")) return null;
    assign("province_name");
    payload.is_active = (trim("is_active") || "true") !== "false";
    return payload;
  }
  if (resource === "cities") {
    if (!trim("city_name")) return null;
    assign("city_name");
    assign("city_code");
    assign("province_id");
    payload.is_active = (trim("is_active") || "true") !== "false";
    return payload;
  }
  return null;
}

function pick(item: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = item[key];
    if (value !== null && value !== undefined && String(value).trim() !== "") return String(value);
  }
  return "-";
}

function renderRouteTypeTags(value: unknown) {
  const arr = Array.isArray(value) ? value.filter(Boolean) : [];
  if (!arr.length) {
    return (
      <Badge variant="secondary" className="text-xs font-normal">
        ALL
      </Badge>
    );
  }
  if (arr.includes("_NONE_")) {
    return (
      <Badge variant="outline" className="text-xs font-normal text-destructive border-destructive/50">
        NONE
      </Badge>
    );
  }
  return (
    <div className="flex flex-wrap gap-1">
      {arr.map((type: string) => (
        <Badge key={type} variant="outline" className="text-xs font-normal">
          {type}
        </Badge>
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
        <Badge key={type} variant="outline" className="text-xs font-normal">
          {type}
        </Badge>
      ))}
    </div>
  );
}

function parseJsonStringArray(value: string | undefined | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
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

function resolveRelationName(value: unknown, map: Record<string, string>) {
  if (value === null || value === undefined) return "-";
  const key = String(value).trim();
  if (!key) return "-";
  return map[key] || key;
}

function buildDeviceDirectHref(categorySlug: string, item: GenericItem) {
  return buildDeviceQrHref({
    appBaseUrl: APP_BASE_URL,
    categorySlug,
    deviceId: item.id,
    deviceTypeKey: String(item.device_type_key || ""),
  });
}

function sanitizeFileName(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "") || "devices";
}

function mapLookupToOptions(items: LookupOption[]) {
  return items.map((item) => ({ value: item.id, label: item.label }));
}

function RegionColorPickerField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const fallback = "#0EA5E9";
  const normalized = normalizeHexColor(value) || fallback;
  const swatches = Array.from(new Set([
    "#EF4444", "#F97316", "#F59E0B", "#EAB308", "#84CC16", "#22C55E", "#10B981", "#14B8A6",
    "#06B6D4", "#0EA5E9", "#3B82F6", "#6366F1", "#8B5CF6", "#A855F7", "#D946EF", "#EC4899",
    "#F43F5E", "#DC2626", "#EA580C", "#CA8A04", "#65A30D", "#16A34A", "#059669", "#0D9488",
    "#0891B2", "#0284C7", "#2563EB", "#4F46E5", "#7C3AED", "#9333EA", "#C026D3", "#DB2777",
    "#E11D48", "#374151", "#4B5563", "#6B7280", "#9CA3AF", "#64748B", "#1F2937", "#111827",
  ]));

  return (
    <div className="flex items-center gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" className="w-24 justify-start gap-2 px-2">
            <span className="size-4 rounded border" style={{ backgroundColor: normalized }} />
            <span className="text-xs">{normalized}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 space-y-3" align="start">
          <div className="space-y-1.5">
            <Label className="text-xs">Color Picker</Label>
            <Input
              type="color"
              value={normalized}
              onChange={(event) => onChange(event.target.value.toUpperCase())}
              className="h-10 w-full cursor-pointer p-1"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Quick Colors</Label>
            <div className="grid grid-cols-8 gap-1">
              {swatches.map((color) => (
                <button
                  key={color}
                  type="button"
                  className="size-6 rounded border"
                  style={{ backgroundColor: color }}
                  onClick={() => onChange(color)}
                  aria-label={`Pilih ${color}`}
                />
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Contoh: #0EA5E9"
      />
    </div>
  );
}

function normalizeHexColor(value: string) {
  const text = (value || "").trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(text)) return text.toUpperCase();
  if (/^[0-9A-Fa-f]{6}$/.test(text)) return `#${text.toUpperCase()}`;
  return "";
}

function formatDateTime(value: string) {
  if (!value || value === "-") return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatValidationStatus(value: string) {
  return mapValidationStatus(value);
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

function getRenameConfig(resource: string) {
  if (resource === "pops") return { field: "pop_name", label: "nama POP" };
  if (resource === "devices") return { field: "device_name", label: "nama device" };
  if (resource === "projects") return { field: "project_name", label: "nama project" };
  if (resource === "poles") return { field: "pole_number", label: "nomor pole" };
  if (resource === "customers") return { field: "customer_name", label: "nama customer" };
  if (resource === "routes") return { field: "route_name", label: "nama route" };
  if (resource === "regions") return { field: "region_name", label: "nama region" };
  if (resource === "deviceTypes") return { field: "device_type_name", label: "nama tipe perangkat" };
  if (resource === "popTypes") return { field: "pop_type_name", label: "nama tipe POP" };
  if (resource === "routeTypes") return { field: "route_type_name", label: "nama tipe route" };
  if (resource === "odpTypes") return { field: "odp_type_name", label: "nama tipe ODP" };
  if (resource === "installationTypes") return { field: "installation_type_name", label: "nama jenis instalasi" };
  if (resource === "serviceTypes") return { field: "service_type_name", label: "nama jenis layanan" };
  if (resource === "tenants") return { field: "tenant_name", label: "nama tenant" };
  if (resource === "manufacturers") return { field: "manufacturer_name", label: "nama manufacturer" };
  if (resource === "brands") return { field: "brand_name", label: "nama brand" };
  if (resource === "assetModels") return { field: "model_name", label: "nama model" };
  if (resource === "provinces") return { field: "province_name", label: "nama provinsi" };
  if (resource === "cities") return { field: "city_name", label: "nama kota/kabupaten" };
  return null;
}

function getApprovalRequestId(value?: ApprovalResponse | null) {
  return value?.approval_request?.request_id || value?.approval_request?.id || "";
}

function canWriteResource(role: string, resource: string) {
  if (!resource) return false;
  if (resource === "devices") {
    return role === "admin" || role === "user_all_region";
  }
  if (["pops", "projects", "poles", "customers", "routes"].includes(resource)) {
    return role === "admin" || role === "user_all_region";
  }
  return role === "admin";
}

function supportsIsActiveResource(resource: string) {
  return ["deviceTypes", "popTypes", "routeTypes", "odpTypes", "installationTypes", "serviceTypes", "tenants", "splitterProfiles", "cableTypes", "coreCapacities", "deviceCoreCapacities", "provinces", "cities"].includes(resource);
}

function supportsSoftDeleteResource(resource: string) {
  return ["regions", "deviceTypes", "popTypes", "routeTypes", "odpTypes", "installationTypes", "serviceTypes", "tenants", "manufacturers", "brands", "assetModels", "cableTypes", "coreCapacities", "deviceCoreCapacities", "provinces", "cities"].includes(resource);
}

function supportsPopFilterResource(resource: string) {
  return ["devices", "poles", "customers", "routes", "projects"].includes(resource);
}

function supportsProjectFilterResource(resource: string) {
  return ["devices", "poles", "customers", "routes"].includes(resource);
}

function isArchived(item: Record<string, unknown>) {
  const deletedAt = item.deleted_at;
  if (deletedAt === null || deletedAt === undefined) return false;
  return String(deletedAt).trim() !== "";
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
