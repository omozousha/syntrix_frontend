"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
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
  Plus,
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
import { SimpleTable } from "@/components/simple-table";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useSession } from "@/components/session-context";
import { apiFetch, type PaginatedResponse } from "@/lib/api";
import { buildCategoryApiPath, getCategoryBySlug } from "@/lib/data-management-config";
import { mapValidationStatus } from "@/lib/validation-status";

type GenericItem = Record<string, unknown> & {
  id: string;
  updated_at?: string | null;
  created_at?: string | null;
};

type LookupOption = { id: string; label: string };
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
  const slug = (params?.slug || "").toLowerCase();
  const category = getCategoryBySlug(slug);
  const { token, me } = useSession();

  const [rows, setRows] = useState<GenericItem[]>([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [provinceFilter, setProvinceFilter] = useState(searchParams.get("province_id") || "__all");
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
  const isOdpCategory = category?.resource === "devices" && String(category?.deviceTypeKey || "").toUpperCase() === "ODP";
  const renameConfig = getRenameConfig(category?.resource || "");
  const createDefaults = useMemo(() => getCreateDefaults(category?.resource || ""), [category?.resource]);
  const [activeTab, setActiveTab] = useState<"list" | "quality">("list");

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
  }, [category, token, page, limit, search, effectiveRegionScopeId, provinceFilter, refreshSeed, archiveView, isSoftDeleteResource]);

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
                label: String(item.manufacturer_name || item.manufacturer_code || item.id),
              }));
            }),
          );
        }
        if (activeCategory.resource === "assetModels") {
          tasks.push(
            apiFetch<PaginatedResponse<GenericItem>>("/brands?page=1&limit=200", { token }).then((res) => {
              next.brands = (res.data || []).map((item) => ({
                id: String(item.id),
                label: String(item.brand_name || item.brand_code || item.id),
              }));
            }),
          );
          tasks.push(
            apiFetch<PaginatedResponse<GenericItem>>("/assetTypes?page=1&limit=200", { token }).then((res) => {
              next.assetTypes = (res.data || []).map((item) => ({
                id: String(item.id),
                label: String(item.type_name || item.type_code || item.id),
              }));
            }),
          );
        }
        if (activeCategory.resource === "cities") {
          tasks.push(
            apiFetch<PaginatedResponse<GenericItem>>("/provinces?page=1&limit=200", { token }).then((res) => {
              next.provinces = (res.data || []).map((item) => ({
                id: String(item.id),
                label: String(item.province_name || item.id),
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
      setRelationMaps({ manufacturers: {}, brands: {}, provinces: {} });
      return;
    }

    let cancelled = false;
    async function loadRelationMaps() {
      try {
        const next: RelationMaps = { manufacturers: {}, brands: {}, provinces: {} };
        const tasks: Array<Promise<void>> = [];

        if (needsManufacturer) {
          tasks.push(
            apiFetch<PaginatedResponse<GenericItem>>("/manufacturers?page=1&limit=300", { token }).then((res) => {
              (res.data || []).forEach((item) => {
                next.manufacturers[String(item.id)] = String(item.manufacturer_name || item.manufacturer_code || item.id);
              });
            }),
          );
        }
        if (needsBrand) {
          tasks.push(
            apiFetch<PaginatedResponse<GenericItem>>("/brands?page=1&limit=300", { token }).then((res) => {
              (res.data || []).forEach((item) => {
                next.brands[String(item.id)] = String(item.brand_name || item.brand_code || item.id);
              });
            }),
          );
        }
        if (needsProvince) {
          tasks.push(
            apiFetch<PaginatedResponse<GenericItem>>("/provinces?page=1&limit=300", { token }).then((res) => {
              (res.data || []).forEach((item) => {
                next.provinces[String(item.id)] = String(item.province_name || item.id);
              });
            }),
          );
        }

        await Promise.all(tasks);
        if (!cancelled) setRelationMaps(next);
      } catch {
        if (!cancelled) setRelationMaps({ manufacturers: {}, brands: {}, provinces: {} });
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
    if (category.resource === "devices") return [selectAllHeader, "Device ID", "Name", "Type", "Status", "Validation", "Updated"];
    if (category.resource === "poles") return [selectAllHeader, "Pole ID", "Pole Number", "Region", "Status", "Updated"];
    if (category.resource === "customers") return [selectAllHeader, "Customer ID", "Name", "Service", "Status", "Updated"];
    if (category.resource === "routes") return [selectAllHeader, "Route ID", "Route Name", "Region", "Status", "Updated"];
    if (category.resource === "regions") return [selectAllHeader, "Region ID", "Inventory Code", "Region Name", "Color", "Updated"];
    if (category.resource === "deviceTypes") return [selectAllHeader, "Icon", "Type Key", "Type Name", "Inventory Code", "Asset Group", "Status", "Updated"];
    if (category.resource === "popTypes") return [selectAllHeader, "Code", "POP Type", "Status", "Updated"];
    if (category.resource === "routeTypes") return [selectAllHeader, "Code", "Route Type", "Status", "Updated"];
    if (category.resource === "manufacturers") return [selectAllHeader, "Code", "Manufacturer", "Updated"];
    if (category.resource === "brands") return [selectAllHeader, "Code", "Brand", "Manufacturer", "Updated"];
    if (category.resource === "assetModels") return [selectAllHeader, "Code", "Model", "Brand", "Updated"];
    if (category.resource === "splitterProfiles") return [selectAllHeader, "Ratio", "Input", "Output", "Loss (dB)", "Status", "Updated"];
    if (category.resource === "provinces") return [selectAllHeader, "Province", "Status", "Updated"];
    if (category.resource === "cities") return [selectAllHeader, "Code", "City", "Province", "Updated"];
    return [selectAllHeader, "Project ID", "Project Name", "Status", "Region", "Updated"];
  }, [category, selectAllHeader]);

  const tableRows = useMemo(() => {
    if (!category) return [];
    return rows.map((item) => {
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
        const validation = formatValidationStatus(pick(item, ["validation_status"]));
        return [
          selectCell,
          pick(item, ["device_id"]),
          pick(item, ["device_name", "name"]),
          pick(item, ["device_type_key"]),
          pick(item, ["status"]),
          <span key={`validation-${item.id}`} className={`inline-flex rounded border px-2 py-0.5 text-xs ${validation.className}`}>{validation.label}</span>,
          formatDateTime(pick(item, ["updated_at", "created_at"])),
        ];
      }
      if (category.resource === "poles") {
        return [
          selectCell,
          pick(item, ["pole_id"]),
          pick(item, ["pole_number", "name"]),
          pick(item, ["region_id"]),
          pick(item, ["status"]),
          formatDateTime(pick(item, ["updated_at", "created_at"])),
        ];
      }
      if (category.resource === "customers") {
        return [
          selectCell,
          pick(item, ["customer_id", "customer_code"]),
          pick(item, ["customer_name", "name"]),
          pick(item, ["service_type"]),
          pick(item, ["status"]),
          formatDateTime(pick(item, ["updated_at", "created_at"])),
        ];
      }
      if (category.resource === "routes") {
        return [
          selectCell,
          pick(item, ["route_id"]),
          pick(item, ["route_name", "name"]),
          pick(item, ["region_id"]),
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
          resolveRelationName(item.manufacturer_id, relationMaps.manufacturers),
          formatDateTime(pick(item, ["updated_at", "created_at"])),
        ];
      }
      if (category.resource === "assetModels") {
        return [
          selectCell,
          pick(item, ["model_code"]),
          withArchivedLabel(item, pick(item, ["model_name"])),
          resolveRelationName(item.brand_id, relationMaps.brands),
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
        pick(item, ["region_id"]),
        formatDateTime(pick(item, ["updated_at", "created_at"])),
      ];
    });
  }, [category, rows, selectedIds, relationMaps]);

  const selectedRowIndices = useMemo(() => {
    const set = new Set<number>();
    rows.forEach((row, index) => {
      if (selectedIds.has(row.id)) set.add(index);
    });
    return set;
  }, [rows, selectedIds]);

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
      <ScrollArea className="h-full min-h-0 w-full">
        <div className="space-y-3 pr-3">
          <p className="text-sm text-destructive">Kategori tidak ditemukan.</p>
          <Button asChild variant="outline">
            <Link href="/data-management">
              <ArrowLeft className="mr-2 size-4" />
              Kembali ke Data Management
            </Link>
          </Button>
        </div>
      </ScrollArea>
    );
  }

  return (
    <ScrollArea className="h-full min-h-0 w-full">
      <div className="space-y-4 pr-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold tracking-tight">{category.label} List</h2>
            <p className="text-sm text-muted-foreground">
              {category.description}
              {effectiveRegionScopeId ? " • Filter region aktif" : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {canCreateMaster ? (
              <Button type="button" onClick={() => setCreateOpen(true)}>
                <Plus className="mr-2 size-4" />
                Add {category.label}
              </Button>
            ) : null}
            <Button asChild variant="outline">
              <Link href={isMasterCategory ? "/master-data" : "/data-management"}>
                <ArrowLeft className="mr-2 size-4" />
                Kembali
              </Link>
            </Button>
          </div>
        </div>

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
            <CardDescription>Total data: {total}. Klik kanan pada baris untuk aksi cepat.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/20 px-3 py-2 text-sm">
              <span className="text-muted-foreground">Item terpilih: {selectedIds.size}</span>
              <div className="flex flex-wrap items-center gap-2">
                {canWrite && selectedIds.size > 0 ? (
                  <>
                    {isSoftDeleteResource && rows.some((row) => selectedIds.has(row.id) && isArchived(row)) ? (
                      <Button type="button" variant="outline" size="sm" onClick={() => requestBulkAction("restore")} disabled={actionLoading}>
                        <RotateCcw className="mr-1 size-4" />
                        Restore Selected
                      </Button>
                    ) : null}
                    {canBulkToggleStatus ? (
                      <>
                        <Button type="button" variant="outline" size="sm" onClick={() => requestBulkAction("activate")} disabled={actionLoading}>
                          Activate
                        </Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => requestBulkAction("deactivate")} disabled={actionLoading}>
                          Deactivate
                        </Button>
                      </>
                    ) : null}
                    <Button type="button" variant="destructive" size="sm" onClick={() => requestBulkAction("delete")} disabled={actionLoading}>
                      <Trash2 className="mr-1 size-4" />
                      {isSoftDeleteResource ? "Bulk Archive" : "Bulk Delete"}
                    </Button>
                  </>
                ) : null}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedIds(new Set())}
                  disabled={selectedIds.size === 0 || actionLoading}
                >
                  Clear Selection
                </Button>
              </div>
            </div>
            <div className={`grid grid-cols-1 gap-3 ${category.resource === "cities" || isSoftDeleteResource ? "sm:grid-cols-4" : "sm:grid-cols-3"}`}>
              <Input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder={category.resource === "cities" ? "Cari city..." : "Cari data..."}
              />
              {category.resource === "cities" ? (
                <Combobox
                  value={provinceFilter}
                  onValueChange={(value) => {
                    setProvinceFilter(value);
                    setPage(1);
                    setSearch("");
                    setSearchInput("");
                  }}
                  placeholder="Filter province"
                  searchPlaceholder="Cari province..."
                  options={[
                    { value: "__all", label: "Semua province" },
                    ...Object.entries(relationMaps.provinces)
                      .sort((a, b) => a[1].localeCompare(b[1], "id"))
                      .map(([id, name]) => ({ value: id, label: name })),
                  ]}
                />
              ) : null}
              {isSoftDeleteResource ? (
                <Combobox
                  value={archiveView}
                  onValueChange={(value) => {
                    if (!value || (value !== "active" && value !== "archived" && value !== "all")) return;
                    setArchiveView(value);
                    setSelectedIds(new Set());
                    setPage(1);
                  }}
                  options={[
                    { value: "active", label: "Active Only" },
                    { value: "archived", label: "Archived Only" },
                    { value: "all", label: "Active + Archived" },
                  ]}
                />
              ) : null}
              <Combobox
                value={String(limit)}
                onValueChange={(value) => {
                  setPage(1);
                  setLimit(Number(value));
                }}
                placeholder="Rows per page"
                searchPlaceholder="Cari jumlah..."
                options={[
                  { value: "10", label: "10 / halaman" },
                  { value: "20", label: "20 / halaman" },
                  { value: "50", label: "50 / halaman" },
                ]}
              />
              <Button
                onClick={() => {
                  setPage(1);
                  setSearch(searchInput.trim());
                }}
              >
                Terapkan Filter
              </Button>
            </div>

            {success ? (
              <p className="rounded-md border border-emerald-200 bg-emerald-50 p-2 text-sm text-emerald-700">{success}</p>
            ) : null}

            {loading ? (
              <AppLoading label="Sedang memuat data list..." />
            ) : error ? (
              <AppLoading label={error} />
            ) : (
              <>
                <div className="space-y-2 md:hidden">
                  {rows.map((row) => {
                    const validation = formatValidationStatus(pick(row, ["validation_status"]));
                    const primaryName =
                      category?.resource === "devices"
                        ? pick(row, ["device_name", "name"])
                        : category?.resource === "pops"
                          ? pick(row, ["pop_name", "name"])
                          : category?.resource === "projects"
                            ? pick(row, ["project_name", "name"])
                            : pick(row, ["name", "region_name", "customer_name", "route_name", "city_name"]);
                    const primaryCode =
                      category?.resource === "devices"
                        ? pick(row, ["device_id"])
                        : category?.resource === "pops"
                          ? pick(row, ["pop_id"])
                          : category?.resource === "projects"
                            ? pick(row, ["project_id"])
                            : pick(row, ["region_id", "city_code", "customer_id", "route_id", "id"]);

                    return (
                      <div key={row.id} className="rounded-md border bg-card p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 space-y-0.5">
                            <p className="truncate text-sm font-semibold">{primaryName || "-"}</p>
                            <p className="truncate text-xs text-muted-foreground">{primaryCode || "-"}</p>
                          </div>
                          {category?.resource === "devices" ? (
                            <span className={`inline-flex rounded border px-2 py-0.5 text-[11px] ${validation.className}`}>
                              {validation.label}
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                          <span>Status: {pick(row, ["status", "status_pop", "is_active"]) || "-"}</span>
                          <span>{formatDateTime(pick(row, ["updated_at", "created_at"]))}</span>
                        </div>
                        <div className={`mt-3 grid gap-2 ${isOdpCategory && canTraceTopology ? "grid-cols-2" : "grid-cols-1"}`}>
                          <Button type="button" variant="outline" size="sm" onClick={() => router.push(getDetailHref(row.id))}>
                            <Eye className="mr-1.5 size-3.5" />
                            Detail
                          </Button>
                          {isOdpCategory && canTraceTopology ? (
                            <Button type="button" variant="outline" size="sm" onClick={() => router.push(getTraceHref(row))}>
                              <Waypoints className="mr-1.5 size-3.5" />
                              Trace
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className={isOdpCategory ? "hidden md:block" : ""}>
                  <TooltipProvider>
                    <SimpleTable
                      headers={headers}
                      rows={tableRows}
                      tableLabel={`${category.label} Columns`}
                      enableColumnVisibility
                      enableSorting
                      disableSortColumns={[0]}
                      selectedRowIndices={selectedRowIndices}
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
                  </TooltipProvider>
                </div>
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
          <div className="grid gap-3 px-4">
            {renderCreateFields(category.resource, quickEditForm, setQuickEditForm, lookupOptions)}
            {supportsIsActiveResource(category.resource) ? (
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
    </ScrollArea>
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
  if (resource === "splitterProfiles") return { input_port_count: "1", output_port_count: "8", is_active: "true" };
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
                  <Button asChild variant="outline" size="sm"><Link href={`/field/odp/${row.odpId}`}>Field View</Link></Button>
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
  if (issue === "odp-pending-validation") return devices.filter((item) => String(item.validation_status || "unvalidated") === "unvalidated").map((item) => toRow(issue, item, null, "ODP belum tervalidasi."));
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
    return {
      ratio_label: read("ratio_label"),
      input_port_count: read("input_port_count"),
      output_port_count: read("output_port_count"),
      expected_loss_db: read("expected_loss_db"),
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
    assign("notes");
    payload.is_active = (trim("is_active") || "true") !== "false";
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
  return ["deviceTypes", "popTypes", "routeTypes", "splitterProfiles", "provinces", "cities"].includes(resource);
}

function supportsSoftDeleteResource(resource: string) {
  return ["regions", "deviceTypes", "popTypes", "routeTypes", "manufacturers", "brands", "assetModels", "provinces", "cities"].includes(resource);
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
