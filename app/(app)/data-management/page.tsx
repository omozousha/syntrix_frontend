"use client";

import { useEffect, useMemo, useState } from "react";
import { Building2, Cable, Database, FolderKanban, Globe2, MapPin, Network } from "lucide-react";
import { AddDataMenu } from "@/components/add-data-menu";
import { AppLoading } from "@/components/app-loading-new";
import {
  AssetSummaryLoading,
  AssetSummaryStrip,
  DataQualityPanel,
  FocusedRegionCard,
  RegionCardGrid,
} from "@/components/features/data-management/asset-overview";
import { useSession } from "@/components/session-context";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiFetch, type PaginatedResponse, type RegionsListResponse } from "@/lib/api";
import { ASSET_DATA_CATEGORIES, buildCategoryApiPath, deviceTypeKeyToSlug, type DataCategory } from "@/lib/data-management-config";
import { formatDateTime, normalizeRole } from "@/lib/domain-formatters";

type GenericItem = {
  id: string;
  updated_at?: string | null;
  created_at?: string | null;
};

type CategorySummary = {
  total: number;
  latestUpdatedAt: string | null;
};

type DeviceTypeCatalog = {
  id: string;
  device_type_key: string;
  device_type_name?: string | null;
  description?: string | null;
  sort_order?: number;
  is_active?: boolean;
};

type CoreStat = {
  key: string;
  label: string;
  value: number;
  unit?: string;
  caption?: string;
  latestUpdatedAt?: string | null;
};

type RegionCoreSummary = {
  pops: number;
  routes: number;
  routeDistanceMeters: number;
  cableDevices: number;
  projects: number;
  devices: number;
  popLatestUpdatedAt: string | null;
  deviceLatestUpdatedAt: string | null;
  routeLatestUpdatedAt: string | null;
};

type RegionCategorySummary = Record<string, CategorySummary>;

type DataQualityKpi = {
  key: string;
  label: string;
  value: number;
  note: string;
};

type DataQualityIssue = {
  key: string;
  label: string;
  value: number;
  severity: "high" | "medium" | "low";
  note: string;
  href: string;
};

type DataQualityIssueGroup = {
  key: string;
  title: string;
  description: string;
  issues: DataQualityIssue[];
};

type DataQualityIntegrityIssue = {
  key: string;
  type: string;
  severity: "critical" | "warning" | "info";
  title: string;
  message: string;
  actionHint: string;
  entityType: string;
  entityId: string;
};

type DataQualityReport = {
  kpis: DataQualityKpi[];
  odpIssues: DataQualityIssue[];
  issueGroups: DataQualityIssueGroup[];
  integrityIssues: DataQualityIntegrityIssue[];
  health: {
    totalIssues: number;
    criticalIssues: number;
    warningIssues: number;
    topologyIssues: number;
    coreIssues: number;
  };
};

type RouteItem = GenericItem & {
  distance_meters?: number | string | null;
};

type DeviceLinkItem = GenericItem & {
  route_id?: string | null;
  cable_device_id?: string | null;
};

type DeviceQualityItem = GenericItem & {
  device_type_key?: string | null;
  validation_status?: string | null;
  validation_date?: string | null;
  last_validation_at?: string | null;
};

type DevicePortQualityItem = GenericItem & {
  region_id?: string | null;
  device_id?: string | null;
  status?: string | null;
  customer_id?: string | null;
  ont_device_id?: string | null;
};

type TopologyIntegrityResponse = {
  data: {
    metrics: {
      overlap_core_conflicts: number;
      orphan_port_connections: number;
      same_device_connections: number;
      cross_region_connections?: number;
      orphan_fiber_cores: number;
      over_capacity_ports: number;
      customer_assigned_to_not_used_ports?: number;
      duplicate_ont_assignments?: number;
      routes_missing_endpoint_assets?: number;
      odp_invalid_splitter_ratios?: number;
      odp_splitter_total_port_mismatches?: number;
      device_actual_port_count_mismatches?: number;
      cable_fiber_core_count_mismatches?: number;
      fiber_cores_missing_tube_color?: number;
      fiber_cores_missing_core_color?: number;
      fiber_core_color_mismatches?: number;
      fiber_cores_loss_warnings?: number;
      damaged_active_fiber_cores?: number;
      active_connection_missing_fiber_cores?: number;
      active_connection_fiber_core_status_mismatches?: number;
      used_fiber_cores_without_active_connection?: number;
      fiber_cores_out_of_cable_capacity?: number;
      pending_legacy_device_links: number;
    };
    issues?: Array<{
      type?: string;
      severity?: string;
      entity_type?: string;
      entity_id?: string;
      title?: string;
      message?: string;
      action_hint?: string;
    }>;
  };
};

const REGION_PAGE_SIZE = 8;

export default function DataManagementPage() {
  const { token, me } = useSession();
  const normalizedRole = useMemo(() => normalizeRole(me.role), [me.role]);
  const isSuperadmin = normalizedRole === "superadmin";
  const isAdminRegion = normalizedRole === "adminregion";
  const isValidator = normalizedRole === "validator";
  const canViewQuality = !isValidator;

  const [regions, setRegions] = useState<RegionsListResponse["data"]>([]);
  const [assetCategories, setAssetCategories] = useState<DataCategory[]>(ASSET_DATA_CATEGORIES);
  const focusedAssetCategories = useMemo(
    () => (isValidator ? assetCategories.filter((category) => category.slug === "odp") : assetCategories),
    [assetCategories, isValidator],
  );
  const [globalSummary, setGlobalSummary] = useState<Record<string, CategorySummary>>({});
  const [regionSummaryCache, setRegionSummaryCache] = useState<Record<string, RegionCoreSummary>>({});
  const [regionSummaryLoadingIds, setRegionSummaryLoadingIds] = useState<Set<string>>(new Set());
  const [regionDetailsCache, setRegionDetailsCache] = useState<Record<string, RegionCategorySummary>>({});
  const [regionDetailsLoadingIds, setRegionDetailsLoadingIds] = useState<Set<string>>(new Set());
  const [openRegionIds, setOpenRegionIds] = useState<Set<string>>(new Set());
  const [searchRegion, setSearchRegion] = useState("");
  const [regionPage, setRegionPage] = useState(1);
  const [activeTab, setActiveTab] = useState("overview");
  const [qualityRegionId, setQualityRegionId] = useState("all");
  const [focusedRegionId, setFocusedRegionId] = useState("");
  const [qualityCache, setQualityCache] = useState<Record<string, DataQualityReport>>({});
  const [qualityLoading, setQualityLoading] = useState(false);
  const [qualityError, setQualityError] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const scopeRegionIds = useMemo(
    () => new Set((me.app_user.user_region_scopes || []).map((scope) => scope.region_id)),
    [me.app_user.user_region_scopes],
  );

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError("");
      try {
        const [regionsRes, deviceTypesRes] = await Promise.all([
          apiFetch<RegionsListResponse>("/regions?page=1&limit=200", { token }),
          apiFetch<PaginatedResponse<DeviceTypeCatalog>>("/deviceTypes?page=1&limit=200&is_active=true", { token }),
        ]);

        let nextRegions = regionsRes.data || [];
        if (!isSuperadmin) {
          nextRegions = nextRegions.filter((region) => scopeRegionIds.has(region.id));
        }

        const staticAssetCategories = ASSET_DATA_CATEGORIES.filter((item) => !item.deviceTypeKey);
        const dynamicDeviceCategories = (deviceTypesRes.data || [])
          .filter((item) => item.device_type_key)
          .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
          .map((item) => ({
            slug: deviceTypeKeyToSlug(item.device_type_key),
            label: item.device_type_name || item.device_type_key,
            description: item.description || "Network device asset",
            resource: "devices" as const,
            deviceTypeKey: item.device_type_key,
            group: "asset" as const,
          }));

        const nextAssetCategories = [...staticAssetCategories, ...dynamicDeviceCategories];

        const nextGlobalSummary = await fetchGlobalSummaryForScope(
          token,
          nextAssetCategories,
          nextRegions,
          isSuperadmin,
        );

        if (cancelled) return;

        setRegions(nextRegions);
        setAssetCategories(nextAssetCategories);
        setRegionSummaryCache({});
        setRegionDetailsCache({});
        setOpenRegionIds(new Set());
        setGlobalSummary(nextGlobalSummary);
      } catch (err) {
        if (cancelled) return;
        setError((err as Error).message || "Gagal memuat ringkasan data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [token, isSuperadmin, scopeRegionIds]);

  const subtitle = useMemo(() => {
    if (isSuperadmin) return "Superadmin - Semua region";
    if (isAdminRegion) return `Admin Region - ${scopeRegionIds.size} region scope`;
    return `Validator Field - ${scopeRegionIds.size} region scope`;
  }, [isSuperadmin, isAdminRegion, scopeRegionIds.size]);

  const filteredRegions = useMemo(() => {
    const keyword = searchRegion.trim().toLowerCase();
    if (!keyword) return regions;
    return regions.filter((region) => {
      const regionName = (region.region_name || "").toLowerCase();
      const regionCode = (region.region_id || "").toLowerCase();
      return regionName.includes(keyword) || regionCode.includes(keyword);
    });
  }, [regions, searchRegion]);

  const totalRegionPages = Math.max(1, Math.ceil(filteredRegions.length / REGION_PAGE_SIZE));
  const safeRegionPage = Math.min(regionPage, totalRegionPages);
  const pagedRegions = useMemo(() => {
    const start = (safeRegionPage - 1) * REGION_PAGE_SIZE;
    return filteredRegions.slice(start, start + REGION_PAGE_SIZE);
  }, [filteredRegions, safeRegionPage]);

  useEffect(() => {
    setRegionPage(1);
  }, [searchRegion]);

  useEffect(() => {
    if (!canViewQuality && activeTab === "quality") {
      setActiveTab("overview");
    }
  }, [canViewQuality, activeTab]);

  useEffect(() => {
    if (!regions.length) {
      setFocusedRegionId("");
      return;
    }
    setFocusedRegionId((prev) => (prev && regions.some((region) => region.id === prev) ? prev : regions[0].id));
  }, [regions]);

  useEffect(() => {
    if (!pagedRegions.length || !assetCategories.length) return;
    let cancelled = false;

    async function run() {
      const missingRegions = pagedRegions.filter((region) => !regionSummaryCache[region.id]);
      if (!missingRegions.length) return;

      const missingIds = new Set(missingRegions.map((region) => region.id));
      setRegionSummaryLoadingIds((prev) => new Set([...prev, ...missingIds]));

      try {
        const popPath = categoryPath(assetCategories, "pop");
        const routePath = categoryPath(assetCategories, "route");
        const projectPath = categoryPath(assetCategories, "projects");

        const entries = await Promise.all(
          missingRegions.map(async (region) => {
            const [popSummary, routeSummary, projectSummary, deviceSummary] = await Promise.all([
              fetchSummaryByPath(`${popPath}&region_id=${encodeURIComponent(region.id)}`, token),
              fetchSummaryByPath(`${routePath}&region_id=${encodeURIComponent(region.id)}`, token),
              fetchSummaryByPath(`${projectPath}&region_id=${encodeURIComponent(region.id)}`, token),
              fetchSummaryByPath(`/devices?page=1&limit=1&region_id=${encodeURIComponent(region.id)}`, token),
            ]);
            const routeMetrics = await fetchRouteMetrics(token, region.id);
            return [
              region.id,
              {
                pops: popSummary.total,
                routes: routeSummary.total,
                routeDistanceMeters: routeMetrics.routeDistanceMeters,
                cableDevices: routeMetrics.linkedCableCount,
                projects: projectSummary.total,
                devices: deviceSummary.total,
                popLatestUpdatedAt: popSummary.latestUpdatedAt,
                deviceLatestUpdatedAt: deviceSummary.latestUpdatedAt,
                routeLatestUpdatedAt: routeMetrics.latestUpdatedAt || routeSummary.latestUpdatedAt,
              } satisfies RegionCoreSummary,
            ] as const;
          }),
        );

        if (cancelled) return;

        setRegionSummaryCache((prev) => {
          const next = { ...prev };
          entries.forEach(([regionId, summary]) => {
            next[regionId] = summary;
          });
          return next;
        });
      } catch {
        // Keep silent, card-level loading will fallback to 0 on next render.
      } finally {
        if (!cancelled) {
          setRegionSummaryLoadingIds((prev) => {
            const next = new Set(prev);
            missingIds.forEach((id) => next.delete(id));
            return next;
          });
        }
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [pagedRegions, token, assetCategories, regionSummaryCache]);

  const activeDeviceTypesCount = useMemo(
    () => assetCategories.filter((category) => category.resource === "devices" && category.deviceTypeKey).length,
    [assetCategories],
  );

  const coreStats = useMemo<CoreStat[]>(
    () => [
      {
        key: "regions",
        label: "Region",
        value: regions.length,
      },
      {
        key: "pop",
        label: "POP",
        value: globalSummary.pop?.total ?? 0,
        latestUpdatedAt: globalSummary.pop?.latestUpdatedAt,
      },
      {
        key: "devices",
        label: "Devices",
        value: globalSummary.devices?.total ?? 0,
        latestUpdatedAt: globalSummary.devices?.latestUpdatedAt,
      },
      {
        key: "route-length",
        label: "Route Length",
        value: metersToKilometers(globalSummary.routeMetrics?.total ?? 0),
        unit: "km",
        caption: `Routes: ${globalSummary.route?.total ?? 0}`,
        latestUpdatedAt: globalSummary.routeMetrics?.latestUpdatedAt || globalSummary.route?.latestUpdatedAt,
      },
      {
        key: "cable-devices",
        label: "Cable Devices",
        value: globalSummary.cable?.total ?? 0,
        caption: "Inventory",
        latestUpdatedAt: globalSummary.cable?.latestUpdatedAt,
      },
      {
        key: "projects",
        label: "Projects",
        value: globalSummary.projects?.total ?? 0,
        latestUpdatedAt: globalSummary.projects?.latestUpdatedAt,
      },
      {
        key: "device-types",
        label: "Device Types",
        value: activeDeviceTypesCount,
        caption: "Master catalog",
      },
    ],
    [regions.length, globalSummary, activeDeviceTypesCount],
  );
  const visibleCoreStats = useMemo(
    () => (isSuperadmin ? coreStats : coreStats.filter((item) => item.key !== "regions")),
    [coreStats, isSuperadmin],
  );
  const summaryStats = useMemo(
    () =>
      visibleCoreStats.map((stat) => ({
        key: stat.key,
        label: stat.label,
        value: formatStatValue(stat.value, stat.unit),
        caption: stat.caption || `Update: ${formatDateTime(stat.latestUpdatedAt)}`,
        icon: getStatIcon(stat.key),
        tone: getStatTone(stat.key),
      })),
    [visibleCoreStats],
  );

  const focusedRegion = useMemo(
    () => regions.find((region) => region.id === focusedRegionId) || null,
    [regions, focusedRegionId],
  );
  const focusedRegionSummary = focusedRegion ? regionSummaryCache[focusedRegion.id] : null;
  const focusedRegionLoading = focusedRegion ? regionSummaryLoadingIds.has(focusedRegion.id) && !focusedRegionSummary : false;
  const focusedRegionDetail = focusedRegion ? regionDetailsCache[focusedRegion.id] : null;
  const focusedRegionDetailLoading = focusedRegion ? regionDetailsLoadingIds.has(focusedRegion.id) && !focusedRegionDetail : false;
  const focusedRegionLastUpdated = focusedRegionSummary
    ? latestDate(
        focusedRegionSummary.popLatestUpdatedAt,
        focusedRegionSummary.deviceLatestUpdatedAt,
        focusedRegionSummary.routeLatestUpdatedAt,
      )
    : null;

  const qualityKey = useMemo(() => qualityRegionId || "all", [qualityRegionId]);

  const regionOptions = useMemo(
    () => [
      { value: "all", label: "Semua Region" },
      ...regions.map((region) => ({
        value: region.id,
        label: `${region.region_name} (${region.region_id})`,
      })),
    ],
    [regions],
  );

  useEffect(() => {
    if (activeTab !== "quality") return;
    if (qualityCache[qualityKey]) return;
    let cancelled = false;

    async function run() {
      setQualityLoading(true);
      setQualityError("");
      try {
        const suffix = qualityRegionId === "all" ? "" : `&region_id=${encodeURIComponent(qualityRegionId)}`;
        const [pops, devices, devicePorts, topologyIntegrity] = await Promise.all([
          fetchAllPaginated<GenericItem>(`/pops?page=1&limit=100${suffix}`, token, 100),
          fetchAllPaginated<DeviceQualityItem>(`/devices?page=1&limit=100${suffix}`, token, 100),
          fetchAllPaginated<DevicePortQualityItem>(`/devicePorts?page=1&limit=100${suffix}`, token, 100),
          apiFetch<TopologyIntegrityResponse>(`/topology/integrity${qualityRegionId === "all" ? "" : `?region_id=${encodeURIComponent(qualityRegionId)}`}`, { token }),
        ]);

        if (cancelled) return;
        setQualityCache((prev) => ({
          ...prev,
          [qualityKey]: buildDataQualityReport(pops, devices, devicePorts, topologyIntegrity.data, qualityRegionId),
        }));
      } catch (err) {
        if (cancelled) return;
        setQualityError((err as Error).message || "Gagal memuat Data Quality KPI.");
      } finally {
        if (!cancelled) setQualityLoading(false);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [activeTab, qualityKey, qualityCache, qualityRegionId, token]);

  useEffect(() => {
    if (!assetCategories.length || !openRegionIds.size) return;
    let cancelled = false;

    async function run() {
      const missingIds = Array.from(openRegionIds).filter((id) => !regionDetailsCache[id]);
      if (!missingIds.length) return;

      setRegionDetailsLoadingIds((prev) => new Set([...prev, ...missingIds]));
      try {
        const entries = await Promise.all(
          missingIds.map(async (regionId) => {
            const categorySummaries = await Promise.all(
              assetCategories.map((category) =>
                fetchSummaryByPath(
                  `${buildCategoryApiPath(category, { page: 1, limit: 1 })}&region_id=${encodeURIComponent(regionId)}`,
                  token,
                ),
              ),
            );

            const summaryMap: RegionCategorySummary = {};
            assetCategories.forEach((category, index) => {
              summaryMap[category.slug] = categorySummaries[index];
            });
            return [regionId, summaryMap] as const;
          }),
        );

        if (cancelled) return;
        setRegionDetailsCache((prev) => {
          const next = { ...prev };
          entries.forEach(([regionId, summaryMap]) => {
            next[regionId] = summaryMap;
          });
          return next;
        });
      } finally {
        if (!cancelled) {
          setRegionDetailsLoadingIds((prev) => {
            const next = new Set(prev);
            missingIds.forEach((id) => next.delete(id));
            return next;
          });
        }
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [assetCategories, openRegionIds, regionDetailsCache, token]);

  useEffect(() => {
    if (!focusedRegion || !assetCategories.length) return;
    const regionId = focusedRegion.id;
    const needSummary = !regionSummaryCache[regionId];
    const needDetail = !regionDetailsCache[regionId];
    if (!needSummary && !needDetail) return;
    let cancelled = false;

    async function run() {
      if (needSummary) {
        setRegionSummaryLoadingIds((prev) => new Set([...prev, regionId]));
      }
      if (needDetail) {
        setRegionDetailsLoadingIds((prev) => new Set([...prev, regionId]));
      }
      try {
        const popPath = categoryPath(assetCategories, "pop");
        const routePath = categoryPath(assetCategories, "route");
        const projectPath = categoryPath(assetCategories, "projects");

        const [popSummary, routeSummary, projectSummary, deviceSummary, routeMetrics, categorySummaries] = await Promise.all([
          fetchSummaryByPath(`${popPath}&region_id=${encodeURIComponent(regionId)}`, token),
          fetchSummaryByPath(`${routePath}&region_id=${encodeURIComponent(regionId)}`, token),
          fetchSummaryByPath(`${projectPath}&region_id=${encodeURIComponent(regionId)}`, token),
          fetchSummaryByPath(`/devices?page=1&limit=1&region_id=${encodeURIComponent(regionId)}`, token),
          fetchRouteMetrics(token, regionId),
          needDetail
            ? Promise.all(
                assetCategories.map((category) =>
                  fetchSummaryByPath(
                    `${buildCategoryApiPath(category, { page: 1, limit: 1 })}&region_id=${encodeURIComponent(regionId)}`,
                    token,
                  ),
                ),
              )
            : Promise.resolve([]),
        ]);

        if (cancelled) return;

        if (needSummary) {
          setRegionSummaryCache((prev) => ({
            ...prev,
            [regionId]: {
              pops: popSummary.total,
              routes: routeSummary.total,
              routeDistanceMeters: routeMetrics.routeDistanceMeters,
              cableDevices: routeMetrics.linkedCableCount,
              projects: projectSummary.total,
              devices: deviceSummary.total,
              popLatestUpdatedAt: popSummary.latestUpdatedAt,
              deviceLatestUpdatedAt: deviceSummary.latestUpdatedAt,
              routeLatestUpdatedAt: routeMetrics.latestUpdatedAt || routeSummary.latestUpdatedAt,
            },
          }));
        }

        if (needDetail) {
          const summaryMap: RegionCategorySummary = {};
          assetCategories.forEach((category, index) => {
            summaryMap[category.slug] = categorySummaries[index];
          });
          setRegionDetailsCache((prev) => ({
            ...prev,
            [regionId]: summaryMap,
          }));
        }
      } finally {
        if (!cancelled) {
          if (needSummary) {
            setRegionSummaryLoadingIds((prev) => {
              const next = new Set(prev);
              next.delete(regionId);
              return next;
            });
          }
          if (needDetail) {
            setRegionDetailsLoadingIds((prev) => {
              const next = new Set(prev);
              next.delete(regionId);
              return next;
            });
          }
        }
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [focusedRegion, assetCategories, token, regionSummaryCache, regionDetailsCache]);

  const activeQualityReport = qualityCache[qualityKey];
  const activeQualityKpis = activeQualityReport?.kpis || [];
  const activeOdpIssues = activeQualityReport?.odpIssues || [];
  const activeQualityIssueGroups = activeQualityReport?.issueGroups || [];
  const activeQualityHealth = activeQualityReport?.health || null;
  const activeIntegrityIssues = activeQualityReport?.integrityIssues || [];

  async function handleRefreshQuality() {
    const nextCache = { ...qualityCache };
    delete nextCache[qualityKey];
    setQualityCache(nextCache);
    setQualityError("");
    setQualityLoading(true);
    try {
      const suffix = qualityRegionId === "all" ? "" : `&region_id=${encodeURIComponent(qualityRegionId)}`;
      const [pops, devices, devicePorts, topologyIntegrity] = await Promise.all([
        fetchAllPaginated<GenericItem>(`/pops?page=1&limit=100${suffix}`, token, 100),
        fetchAllPaginated<DeviceQualityItem>(`/devices?page=1&limit=100${suffix}`, token, 100),
        fetchAllPaginated<DevicePortQualityItem>(`/devicePorts?page=1&limit=100${suffix}`, token, 100),
        apiFetch<TopologyIntegrityResponse>(`/topology/integrity${qualityRegionId === "all" ? "" : `?region_id=${encodeURIComponent(qualityRegionId)}`}`, { token }),
      ]);
      setQualityCache((prev) => ({ ...prev, [qualityKey]: buildDataQualityReport(pops, devices, devicePorts, topologyIntegrity.data, qualityRegionId) }));
    } catch (err) {
      setQualityError((err as Error).message || "Gagal memuat Data Quality KPI.");
    } finally {
      setQualityLoading(false);
    }
  }

  return (
    <ScrollArea className="h-full min-h-0 w-full">
      <div className="space-y-4 px-3 pb-3 md:px-4 md:pb-4">
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{subtitle}</Badge>
                {!isSuperadmin ? <Badge variant="secondary">{regions.length} region scope</Badge> : null}
              </div>
              <div className="space-y-1">
                <h2 className="text-2xl font-semibold tracking-tight">Asset Overview</h2>
                <p className="max-w-2xl text-sm text-muted-foreground">
                  Ringkasan aset pasif, kualitas data, dan relasi inventory berdasarkan scope akun.
                </p>
              </div>
            </div>
            <AddDataMenu
              canCreatePop={isSuperadmin || isAdminRegion}
              canCreateDevice={isSuperadmin || isAdminRegion}
              canManageMaster={isSuperadmin}
            />
          </div>
        </div>

        {loading ? <AssetSummaryLoading /> : null}
        {!loading && error ? <AppLoading label={error} variant="error" /> : null}

        {!loading && !error ? (
          <div className="space-y-3">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-3">
              <TabsList className={`inline-grid w-fit max-w-full overflow-x-auto ${canViewQuality ? "grid-cols-2" : "grid-cols-1"}`}>
                <TabsTrigger value="overview">{isValidator ? "Validator Home" : "Overview"}</TabsTrigger>
                {canViewQuality ? <TabsTrigger value="quality">Data Quality</TabsTrigger> : null}
              </TabsList>

              <TabsContent value="overview" className="space-y-3">
                {!isValidator ? <AssetSummaryStrip title={isSuperadmin ? "Ringkasan Global" : "Ringkasan Scope Region"} stats={summaryStats} /> : null}

                {isSuperadmin ? (
                  <RegionCardGrid
                    regions={pagedRegions}
                    allRegionsCount={regions.length}
                    assetCategories={assetCategories}
                    regionSummaryCache={regionSummaryCache}
                    regionSummaryLoadingIds={regionSummaryLoadingIds}
                    regionDetailsCache={regionDetailsCache}
                    regionDetailsLoadingIds={regionDetailsLoadingIds}
                    openRegionIds={openRegionIds}
                    searchRegion={searchRegion}
                    safeRegionPage={safeRegionPage}
                    totalRegionPages={totalRegionPages}
                    onSearchRegionChange={setSearchRegion}
                    onRegionOpenChange={(regionId, nextOpen) => {
                      setOpenRegionIds((prev) => {
                        const next = new Set(prev);
                        if (nextOpen) next.add(regionId);
                        else next.delete(regionId);
                        return next;
                      });
                    }}
                    onPrevPage={() => setRegionPage((prev) => Math.max(1, prev - 1))}
                    onNextPage={() => setRegionPage((prev) => Math.min(totalRegionPages, prev + 1))}
                    formatDateTime={formatDateTime}
                    formatKilometers={formatKilometers}
                    latestDate={latestDate}
                  />
                ) : null}

                {!isSuperadmin ? (
                  <FocusedRegionCard
                    title={isAdminRegion ? "Inventory Region" : "Area Kerja Validator"}
                    focusedRegion={focusedRegion}
                    regions={regions}
                    focusedRegionId={focusedRegionId}
                    focusedRegionDetail={focusedRegionDetail}
                    focusedRegionDetailLoading={focusedRegionDetailLoading}
                    focusedRegionLastUpdated={focusedRegionLastUpdated}
                    focusedAssetCategories={focusedAssetCategories}
                    isAdminRegion={isAdminRegion}
                    onFocusedRegionChange={setFocusedRegionId}
                    formatDateTime={formatDateTime}
                  />
                ) : null}
              </TabsContent>

            {canViewQuality ? (
              <TabsContent value="quality" className="space-y-3">
                <DataQualityPanel
                  regionOptions={regionOptions}
                  qualityRegionId={qualityRegionId}
                  qualityLoading={qualityLoading}
                  qualityError={qualityError}
                  kpis={activeQualityKpis}
                  issues={activeOdpIssues}
                  issueGroups={activeQualityIssueGroups}
                  health={activeQualityHealth}
                  integrityIssues={activeIntegrityIssues}
                  onRegionChange={setQualityRegionId}
                  onRefresh={() => void handleRefreshQuality()}
                />
              </TabsContent>
            ) : null}
            </Tabs>
          </div>
        ) : null}
      </div>
    </ScrollArea>
  );
}

function categoryPath(categories: DataCategory[], slug: string) {
  const category = categories.find((item) => item.slug === slug);
  if (!category) return "/devices?page=1&limit=1";
  return buildCategoryApiPath(category, { page: 1, limit: 1 });
}

async function fetchSummaryByPath(path: string, token: string): Promise<CategorySummary> {
  const payload = await apiFetch<PaginatedResponse<GenericItem>>(path, { token });
  const first = payload.data?.[0];
  return {
    total: payload.meta?.total ?? payload.data?.length ?? 0,
    latestUpdatedAt: first?.updated_at || first?.created_at || null,
  };
}

function mergeCategorySummaries(summaries: CategorySummary[]): CategorySummary {
  return {
    total: summaries.reduce((acc, item) => acc + item.total, 0),
    latestUpdatedAt: latestDate(...summaries.map((item) => item.latestUpdatedAt)),
  };
}

async function fetchGlobalSummaryForScope(
  token: string,
  categories: DataCategory[],
  regions: RegionsListResponse["data"],
  isSuperadmin: boolean,
): Promise<Record<string, CategorySummary>> {
  const popPath = categoryPath(categories, "pop");
  const routePath = categoryPath(categories, "route");
  const cablePath = categoryPath(categories, "cable");
  const projectPath = categoryPath(categories, "projects");

  if (isSuperadmin) {
    const [devices, pop, route, cable, projects, routeMetrics] = await Promise.all([
      fetchSummaryByPath("/devices?page=1&limit=1", token),
      fetchSummaryByPath(popPath, token),
      fetchSummaryByPath(routePath, token),
      fetchSummaryByPath(cablePath, token),
      fetchSummaryByPath(projectPath, token),
      fetchRouteMetrics(token),
    ]);

    return {
      devices,
      pop,
      route,
      cable,
      projects,
      routeMetrics: {
        total: routeMetrics.routeDistanceMeters,
        latestUpdatedAt: routeMetrics.latestUpdatedAt,
      },
    };
  }

  const entries = await Promise.all(
    regions.map(async (region) => {
      const regionId = encodeURIComponent(region.id);
      const [devices, pop, route, cable, projects, routeMetrics] = await Promise.all([
        fetchSummaryByPath(`/devices?page=1&limit=1&region_id=${regionId}`, token),
        fetchSummaryByPath(`${popPath}&region_id=${regionId}`, token),
        fetchSummaryByPath(`${routePath}&region_id=${regionId}`, token),
        fetchSummaryByPath(`${cablePath}&region_id=${regionId}`, token),
        fetchSummaryByPath(`${projectPath}&region_id=${regionId}`, token),
        fetchRouteMetrics(token, region.id),
      ]);

      return {
        devices,
        pop,
        route,
        cable,
        projects,
        routeMetrics: {
          total: routeMetrics.routeDistanceMeters,
          latestUpdatedAt: routeMetrics.latestUpdatedAt,
        },
      };
    }),
  );

  return {
    devices: mergeCategorySummaries(entries.map((item) => item.devices)),
    pop: mergeCategorySummaries(entries.map((item) => item.pop)),
    route: mergeCategorySummaries(entries.map((item) => item.route)),
    cable: mergeCategorySummaries(entries.map((item) => item.cable)),
    projects: mergeCategorySummaries(entries.map((item) => item.projects)),
    routeMetrics: mergeCategorySummaries(entries.map((item) => item.routeMetrics)),
  };
}

function latestDate(...values: Array<string | null | undefined>) {
  const valid = values
    .filter((value): value is string => Boolean(value))
    .map((value) => new Date(value))
    .filter((date) => !Number.isNaN(date.getTime()));
  if (!valid.length) return null;
  const latest = new Date(Math.max(...valid.map((date) => date.getTime())));
  return latest.toISOString();
}

async function fetchAllPaginated<T>(pathWithPage: string, token: string, limit = 100) {
  const rows: T[] = [];
  let page = 1;

  while (true) {
    const path = pathWithPage.replace(/page=\d+/i, `page=${page}`).replace(/limit=\d+/i, `limit=${limit}`);
    const payload = await apiFetch<PaginatedResponse<T>>(path, { token });
    const pageRows = payload.data || [];
    rows.push(...pageRows);

    const total = payload.meta?.total ?? 0;
    if (!pageRows.length) break;
    if (total && rows.length >= total) break;
    if (!total && pageRows.length < limit) break;
    page += 1;
  }

  return rows;
}

async function fetchRouteMetrics(token: string, regionId?: string) {
  const suffix = regionId ? `&region_id=${encodeURIComponent(regionId)}` : "";
  const [routes, links] = await Promise.all([
    fetchAllPaginated<RouteItem>(`/routes?page=1&limit=100${suffix}`, token, 100),
    fetchAllPaginated<DeviceLinkItem>(`/deviceLinks?page=1&limit=100${suffix}`, token, 100),
  ]);

  const routeDistanceMeters = routes.reduce((acc, route) => acc + normalizeNumber(route.distance_meters), 0);
  const latestUpdatedAt = latestDate(
    ...routes.map((route) => route.updated_at || route.created_at || null),
    ...links.map((link) => link.updated_at || link.created_at || null),
  );

  const linkedCableSet = new Set(
    links
      .filter((link) => link.route_id && link.cable_device_id)
      .map((link) => String(link.cable_device_id)),
  );

  return {
    routeDistanceMeters,
    linkedCableCount: linkedCableSet.size,
    latestUpdatedAt,
  };
}

function normalizeNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function metersToKilometers(value: number) {
  return Math.round((value / 1000) * 10) / 10;
}

function formatKilometers(valueMeters: number) {
  return `${metersToKilometers(valueMeters).toLocaleString("id-ID", { maximumFractionDigits: 1 })} km`;
}

function formatStatValue(value: number, unit?: string) {
  if (unit === "km") {
    return value.toLocaleString("id-ID", { maximumFractionDigits: 1 });
  }
  return value.toLocaleString("id-ID");
}

function getStatIcon(key: string) {
  const icons = {
    regions: Globe2,
    pop: MapPin,
    devices: Database,
    "route-length": Network,
    "cable-devices": Cable,
    projects: FolderKanban,
    "device-types": Building2,
  };
  return icons[key as keyof typeof icons] || Database;
}

function getStatTone(key: string): "blue" | "emerald" | "amber" | "rose" | "slate" {
  if (key === "devices" || key === "device-types") return "blue";
  if (key === "pop" || key === "regions") return "emerald";
  if (key === "route-length" || key === "cable-devices") return "amber";
  if (key === "projects") return "slate";
  return "blue";
}

function buildDataQualityReport(
  pops: GenericItem[],
  devices: DeviceQualityItem[],
  devicePorts: DevicePortQualityItem[],
  topologyIntegrity?: TopologyIntegrityResponse["data"],
  regionId = "all",
): DataQualityReport {
  const topologyMetrics = topologyIntegrity?.metrics;
  const popMissingGeo = pops.filter((item) => !hasAnyValue(item, ["latitude", "longitude"])).length;
  const deviceMissingPop = devices.filter((item) => !hasAnyValue(item, ["pop_id", "pop_uuid", "pop_ref_id"])).length;
  const deviceMissingImage = devices.filter((item) => !hasImageAttachment(item)).length;
  const deviceMissingGeo = devices.filter((item) => !hasAnyValue(item, ["latitude", "longitude"])).length;
  const deviceMissingSerial = devices.filter((item) => !hasAnyValue(item, ["serial_number"])).length;
  const pendingValidation = [...pops, ...devices].filter((item) => !isValidated(item)).length;
  const odpDevices = devices.filter((item) => String(item.device_type_key || "").toUpperCase() === "ODP");
  const odpIds = new Set(odpDevices.map((item) => item.id));
  const odpPorts = devicePorts.filter((port) => port.device_id && odpIds.has(port.device_id));
  const portDeviceIds = new Set(odpPorts.map((port) => port.device_id).filter(Boolean));
  const odpWithoutPorts = odpDevices.filter((item) => !portDeviceIds.has(item.id)).length;
  const odpPendingValidation = odpDevices.filter((item) => !isValidated(item)).length;
  const usedWithoutEndpoint = odpPorts.filter(
    (port) => port.status === "used" && !hasAnyValue(port, ["customer_id", "ont_device_id"]),
  ).length;
  const assignedNotUsed = odpPorts.filter(
    (port) => hasAnyValue(port, ["customer_id", "ont_device_id"]) && port.status !== "used",
  ).length;
  const downOrMaintenancePorts = odpPorts.filter((port) => port.status === "down" || port.status === "maintenance").length;
  const issueBaseHref = `/data-management/odp-quality${regionId === "all" ? "" : `?region_id=${encodeURIComponent(regionId)}`}`;
  const withIssueHref = (issueKey: string) =>
    `${issueBaseHref}${issueBaseHref.includes("?") ? "&" : "?"}issue=${encodeURIComponent(issueKey)}`;
  const topologyHref = `/data-management/topology${regionId === "all" ? "" : `?region_id=${encodeURIComponent(regionId)}`}`;
  const metric = (key: keyof NonNullable<TopologyIntegrityResponse["data"]["metrics"]>) => topologyMetrics?.[key] ?? 0;

  const kpis: DataQualityKpi[] = [
    { key: "pop-missing-geo", label: "POP Missing Geo", value: popMissingGeo, note: "POP belum punya latitude/longitude." },
    { key: "device-missing-pop", label: "Device Missing POP", value: deviceMissingPop, note: "Perangkat belum terhubung ke POP." },
    { key: "device-missing-image", label: "Device Missing Image", value: deviceMissingImage, note: "Perangkat belum ada image attachment." },
    { key: "device-missing-geo", label: "Device Missing Geo", value: deviceMissingGeo, note: "Perangkat belum punya koordinat." },
    { key: "device-missing-serial", label: "Device Missing Serial", value: deviceMissingSerial, note: "Perangkat belum memiliki serial number." },
    { key: "pending-validation", label: "Pending Validation", value: pendingValidation, note: "POP/device belum memiliki validasi final." },
    { key: "odp-total", label: "ODP Total", value: odpDevices.length, note: "Total perangkat ODP pada filter ini." },
    { key: "odp-pending-validation", label: "ODP Pending Validation", value: odpPendingValidation, note: "ODP belum tervalidasi lapangan." },
    { key: "odp-port-mismatch", label: "ODP Port Mismatch", value: usedWithoutEndpoint + assignedNotUsed, note: "Port ODP dengan status/assignment tidak konsisten." },
    {
      key: "topology-core-overlap",
      label: "Topology Core Overlap",
      value: topologyMetrics?.overlap_core_conflicts ?? 0,
      note: "Konflik rentang core pada cable yang sama.",
    },
    {
      key: "fiber-core-occupancy-drift",
      label: "Core Occupancy Drift",
      value:
        metric("active_connection_missing_fiber_cores")
        + metric("active_connection_fiber_core_status_mismatches")
        + metric("used_fiber_cores_without_active_connection"),
      note: "Status core belum sinkron dengan connection approved.",
    },
    {
      key: "fiber-core-color-health",
      label: "Core Color Health",
      value:
        metric("fiber_cores_missing_tube_color")
        + metric("fiber_cores_missing_core_color")
        + metric("fiber_core_color_mismatches"),
      note: "Tray/tube/core color perlu dilengkapi atau disesuaikan.",
    },
    {
      key: "topology-orphan-connections",
      label: "Topology Orphan Connection",
      value: topologyMetrics?.orphan_port_connections ?? 0,
      note: "Koneksi port yang endpoint port-nya tidak valid.",
    },
    {
      key: "legacy-links-pending",
      label: "Legacy Links Pending",
      value: topologyMetrics?.pending_legacy_device_links ?? 0,
      note: "device_links lama belum ditransisikan ke actual topology.",
    },
  ];

  const odpIssues: DataQualityIssue[] = [
    {
      key: "odp-without-ports",
      label: "ODP tanpa port",
      value: odpWithoutPorts,
      severity: odpWithoutPorts ? "high" : "low",
      note: "ODP sudah ada, tetapi belum punya data port. Generate port dari detail ODP.",
      href: withIssueHref("odp-without-ports"),
    },
    {
      key: "odp-pending-validation",
      label: "ODP belum tervalidasi",
      value: odpPendingValidation,
      severity: odpPendingValidation ? "medium" : "low",
      note: "ODP belum punya validasi final dari field team.",
      href: withIssueHref("odp-pending-validation"),
    },
    {
      key: "odp-used-without-endpoint",
      label: "Port used tanpa Customer/ONT",
      value: usedWithoutEndpoint,
      severity: usedWithoutEndpoint ? "high" : "low",
      note: "Port berstatus used tetapi belum diikat ke customer atau ONT.",
      href: withIssueHref("odp-used-without-endpoint"),
    },
    {
      key: "odp-assigned-not-used",
      label: "Port assigned tapi status bukan used",
      value: assignedNotUsed,
      severity: assignedNotUsed ? "high" : "low",
      note: "Customer/ONT sudah terisi, tetapi status port belum used.",
      href: withIssueHref("odp-assigned-not-used"),
    },
    {
      key: "odp-down-maintenance",
      label: "Port down/maintenance",
      value: downOrMaintenancePorts,
      severity: downOrMaintenancePorts ? "medium" : "low",
      note: "Port ODP sedang down atau maintenance.",
      href: withIssueHref("odp-down-maintenance"),
    },
  ];

  const topologyIssues: DataQualityIssue[] = [
    {
      key: "overlap-core-conflicts",
      label: "Core range overlap",
      value: metric("overlap_core_conflicts"),
      severity: metric("overlap_core_conflicts") ? "high" : "low",
      note: "Dua connection atau lebih memakai rentang core yang saling bertabrakan pada cable yang sama.",
      href: topologyHref,
    },
    {
      key: "orphan-port-connections",
      label: "Connection endpoint invalid",
      value: metric("orphan_port_connections"),
      severity: metric("orphan_port_connections") ? "high" : "low",
      note: "Connection mengarah ke port yang tidak ditemukan atau tidak valid.",
      href: topologyHref,
    },
    {
      key: "cross-region-connections",
      label: "Cross-region connection",
      value: metric("cross_region_connections"),
      severity: metric("cross_region_connections") ? "high" : "low",
      note: "Connection punya region yang tidak konsisten dengan endpoint port.",
      href: topologyHref,
    },
    {
      key: "same-device-connections",
      label: "Same-device connection",
      value: metric("same_device_connections"),
      severity: metric("same_device_connections") ? "medium" : "low",
      note: "Connection memakai dua port di device yang sama dan perlu dicek apakah valid secara operasional.",
      href: topologyHref,
    },
    {
      key: "pending-legacy-links",
      label: "Legacy links pending",
      value: metric("pending_legacy_device_links"),
      severity: metric("pending_legacy_device_links") ? "medium" : "low",
      note: "Device links lama belum ditransisikan ke port connection source of truth.",
      href: topologyHref,
    },
  ];

  const coreIssues: DataQualityIssue[] = [
    {
      key: "active-connection-missing-fiber-cores",
      label: "Connection core belum tersedia",
      value: metric("active_connection_missing_fiber_cores"),
      severity: metric("active_connection_missing_fiber_cores") ? "high" : "low",
      note: "Active/cutover connection memakai cable/core range, tetapi row fiber core belum tersedia.",
      href: topologyHref,
    },
    {
      key: "active-connection-fiber-core-status-mismatches",
      label: "Status core tidak sinkron",
      value: metric("active_connection_fiber_core_status_mismatches"),
      severity: metric("active_connection_fiber_core_status_mismatches") ? "medium" : "low",
      note: "Core yang dipakai connection aktif belum tercatat sebagai used atau mapping endpoint-nya belum cocok.",
      href: topologyHref,
    },
    {
      key: "used-fiber-cores-without-active-connection",
      label: "Core used tanpa connection",
      value: metric("used_fiber_cores_without_active_connection"),
      severity: metric("used_fiber_cores_without_active_connection") ? "medium" : "low",
      note: "Core masih berstatus used padahal tidak terikat ke active/cutover connection.",
      href: topologyHref,
    },
    {
      key: "fiber-core-color-mismatches",
      label: "Tube/core color mismatch",
      value: metric("fiber_core_color_mismatches"),
      severity: metric("fiber_core_color_mismatches") ? "medium" : "low",
      note: "Warna tube atau core berbeda dari standar 12-color cycle yang dipakai.",
      href: topologyHref,
    },
    {
      key: "fiber-cores-loss-warnings",
      label: "Attenuation warning",
      value: metric("fiber_cores_loss_warnings"),
      severity: metric("fiber_cores_loss_warnings") ? "medium" : "low",
      note: "Core punya nilai loss di atas threshold operasional.",
      href: topologyHref,
    },
    {
      key: "damaged-active-fiber-cores",
      label: "Damaged core masih aktif",
      value: metric("damaged_active_fiber_cores"),
      severity: metric("damaged_active_fiber_cores") ? "high" : "low",
      note: "Core damaged masih memiliki connection atau endpoint mapping aktif.",
      href: topologyHref,
    },
  ];

  const inventoryIssues: DataQualityIssue[] = [
    {
      key: "device-actual-port-count-mismatches",
      label: "Port count mismatch",
      value: metric("device_actual_port_count_mismatches"),
      severity: metric("device_actual_port_count_mismatches") ? "medium" : "low",
      note: "Jumlah device_ports aktif berbeda dari total_ports pada device.",
      href: topologyHref,
    },
    {
      key: "cable-fiber-core-count-mismatches",
      label: "Cable core count mismatch",
      value: metric("cable_fiber_core_count_mismatches"),
      severity: metric("cable_fiber_core_count_mismatches") ? "medium" : "low",
      note: "Jumlah fiber_cores berbeda dari capacity_core pada cable device.",
      href: topologyHref,
    },
    {
      key: "routes-missing-endpoint-assets",
      label: "Route endpoint belum lengkap",
      value: metric("routes_missing_endpoint_assets"),
      severity: metric("routes_missing_endpoint_assets") ? "medium" : "low",
      note: "Route belum punya start/end asset lengkap untuk topology dan maps.",
      href: topologyHref,
    },
  ];

  const issueGroups: DataQualityIssueGroup[] = [
    {
      key: "topology",
      title: "Topology Integrity",
      description: "Kesehatan connection, route, dan transisi source of truth.",
      issues: topologyIssues,
    },
    {
      key: "core",
      title: "Core Management",
      description: "Occupancy, warna tube/core, damaged core, dan attenuation inventory.",
      issues: coreIssues,
    },
    {
      key: "odp",
      title: "ODP Operations",
      description: "Kesiapan ODP, port, assignment, dan status validasi lapangan.",
      issues: odpIssues,
    },
    {
      key: "inventory",
      title: "Inventory Completeness",
      description: "Kelengkapan port/core/route agar trace dan As-Built siap dipakai.",
      issues: inventoryIssues,
    },
  ];
  const allIssues = issueGroups.flatMap((group) => group.issues);
  const totalIssues = allIssues.reduce((sum, issue) => sum + issue.value, 0);
  const criticalIssues = allIssues.filter((issue) => issue.severity === "high").reduce((sum, issue) => sum + issue.value, 0);
  const warningIssues = allIssues.filter((issue) => issue.severity === "medium").reduce((sum, issue) => sum + issue.value, 0);
  const integrityIssues = (topologyIntegrity?.issues || []).slice(0, 50).map((issue, index) => ({
    key: `${issue.type || "issue"}-${issue.entity_id || index}`,
    type: issue.type || "unknown",
    severity: normalizeIntegritySeverity(issue.severity),
    title: issue.title || "Integrity issue",
    message: issue.message || "-",
    actionHint: issue.action_hint || "-",
    entityType: issue.entity_type || "-",
    entityId: issue.entity_id || "-",
  }));

  return {
    kpis,
    odpIssues,
    issueGroups,
    integrityIssues,
    health: {
      totalIssues,
      criticalIssues,
      warningIssues,
      topologyIssues: topologyIssues.reduce((sum, issue) => sum + issue.value, 0),
      coreIssues: coreIssues.reduce((sum, issue) => sum + issue.value, 0),
    },
  };
}

function normalizeIntegritySeverity(value?: string): "critical" | "warning" | "info" {
  const normalized = String(value || "").toLowerCase();
  if (normalized === "critical") return "critical";
  if (normalized === "warning") return "warning";
  return "info";
}

function hasAnyValue(item: Record<string, unknown>, keys: string[]) {
  return keys.some((key) => {
    const value = item[key];
    if (value === null || value === undefined) return false;
    if (typeof value === "string") return value.trim() !== "";
    return true;
  });
}

function hasImageAttachment(item: Record<string, unknown>) {
  if (hasAnyValue(item, ["image_attachment_id"])) return true;
  const attachments = item.image_attachments;
  if (Array.isArray(attachments)) return attachments.length > 0;
  if (typeof attachments === "string") {
    try {
      const parsed = JSON.parse(attachments);
      return Array.isArray(parsed) && parsed.length > 0;
    } catch {
      return false;
    }
  }
  return false;
}

function isValidated(item: Record<string, unknown>) {
  return hasAnyValue(item, ["validation_date", "last_validation_at"]);
}
