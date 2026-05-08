"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, RefreshCcw } from "lucide-react";
import { AddDataMenu } from "@/components/add-data-menu";
import { AppLoading } from "@/components/app-loading-new";
import { useSession } from "@/components/session-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiFetch, type PaginatedResponse, type RegionsListResponse } from "@/lib/api";
import { ASSET_DATA_CATEGORIES, buildCategoryApiPath, type DataCategory } from "@/lib/data-management-config";

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

type DataQualityReport = {
  kpis: DataQualityKpi[];
  odpIssues: DataQualityIssue[];
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
      orphan_fiber_cores: number;
      over_capacity_ports: number;
      pending_legacy_device_links: number;
    };
  };
};

const REGION_PAGE_SIZE = 8;

function deviceTypeKeyToSlug(key: string) {
  return key.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

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

        const globalRequests = await Promise.all([
          fetchSummaryByPath("/devices?page=1&limit=1", token),
          fetchSummaryByPath(categoryPath(nextAssetCategories, "pop"), token),
          fetchSummaryByPath(categoryPath(nextAssetCategories, "route"), token),
          fetchSummaryByPath(categoryPath(nextAssetCategories, "cable"), token),
          fetchSummaryByPath(categoryPath(nextAssetCategories, "projects"), token),
          fetchRouteMetrics(token),
        ]);

        if (cancelled) return;

        setRegions(nextRegions);
        setAssetCategories(nextAssetCategories);
        setRegionSummaryCache({});
        setRegionDetailsCache({});
        setOpenRegionIds(new Set());
        setGlobalSummary({
          devices: globalRequests[0],
          pop: globalRequests[1],
          route: globalRequests[2],
          cable: globalRequests[3],
          projects: globalRequests[4],
          routeMetrics: {
            total: globalRequests[5].routeDistanceMeters,
            latestUpdatedAt: globalRequests[5].latestUpdatedAt,
          },
        });
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
    if (isAdminRegion) return "Admin Region - Hanya region scope akun";
    return `Validator Field - Scope ${scopeRegionIds.size} region`;
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
      },
    ],
    [regions.length, globalSummary, activeDeviceTypesCount],
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
          [qualityKey]: buildDataQualityReport(pops, devices, devicePorts, topologyIntegrity.data.metrics, qualityRegionId),
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
      setQualityCache((prev) => ({ ...prev, [qualityKey]: buildDataQualityReport(pops, devices, devicePorts, topologyIntegrity.data.metrics, qualityRegionId) }));
    } catch (err) {
      setQualityError((err as Error).message || "Gagal memuat Data Quality KPI.");
    } finally {
      setQualityLoading(false);
    }
  }

  return (
    <ScrollArea className="h-full min-h-0 w-full">
      <div className="space-y-4 px-3 pb-3 md:px-4 md:pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold tracking-tight">Asset Overview</h2>
            <Badge variant="outline">{subtitle}</Badge>
          </div>
          <AddDataMenu
            canCreatePop={isSuperadmin || isAdminRegion}
            canCreateDevice={isSuperadmin || isAdminRegion}
            canManageMaster={isSuperadmin}
          />
        </div>

        {loading ? <SummaryLoading /> : null}
        {!loading && error ? <AppLoading label={error} /> : null}

        {!loading && !error ? (
          <div className="space-y-3">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-3">
            <TabsList className={`grid w-full justify-start overflow-x-auto sm:w-auto ${canViewQuality ? "grid-cols-2" : "grid-cols-1"}`}>
              <TabsTrigger value="overview">{isValidator ? "Validator Home" : "Overview"}</TabsTrigger>
              {canViewQuality ? <TabsTrigger value="quality">Data Quality</TabsTrigger> : null}
            </TabsList>

            <TabsContent value="overview" className="space-y-3">
              <section className="space-y-2">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {isValidator ? "Ringkasan Field" : "Summary"}
                </h3>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-7">
                {(isSuperadmin ? coreStats : coreStats.filter((item) => item.key !== "regions")).map((stat) => (
                  <Card key={stat.key} className="overflow-hidden">
                    <CardHeader className="px-3 py-2">
                      <CardTitle className="text-sm font-semibold">{stat.label}</CardTitle>
                    </CardHeader>
                      <CardContent className="px-3 pb-3 pt-0">
                        <p className="text-2xl font-bold leading-none">{formatStatValue(stat.value, stat.unit)}</p>
                        {stat.caption ? <p className="mt-1 text-[11px] text-muted-foreground">{stat.caption}</p> : null}
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          Update: {formatDateTime(stat.latestUpdatedAt)}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>

              {isSuperadmin ? (
                <section className="space-y-2">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Region Cards</h3>
                  <div className="w-full sm:w-72">
                    <Input
                      value={searchRegion}
                      onChange={(event) => setSearchRegion(event.target.value)}
                      placeholder="Search region..."
                    />
                  </div>
                </div>

                {pagedRegions.length === 0 ? (
                  <Card>
                    <CardContent className="py-6 text-sm text-muted-foreground">
                      {regions.length === 0
                        ? "Belum ada region yang tersedia untuk akun ini."
                        : "Region tidak ditemukan. Coba kata kunci lain."}
                    </CardContent>
                  </Card>
                ) : (
                  <>
                  <div className="grid grid-cols-1 gap-2 lg:grid-cols-2 xl:grid-cols-4">
                    {pagedRegions.map((region) => {
                      const summary = regionSummaryCache[region.id];
                      const isLoadingCard = regionSummaryLoadingIds.has(region.id) && !summary;
                      const isOpen = openRegionIds.has(region.id);
                      const regionDetail = regionDetailsCache[region.id];
                      const regionDetailLoading = regionDetailsLoadingIds.has(region.id) && !regionDetail;
                      const regionLastUpdated = latestDate(summary?.popLatestUpdatedAt, summary?.deviceLatestUpdatedAt, summary?.routeLatestUpdatedAt);
                      return (
                        <Collapsible
                          key={region.id}
                          open={isOpen}
                          onOpenChange={(nextOpen) => {
                            setOpenRegionIds((prev) => {
                              const next = new Set(prev);
                              if (nextOpen) next.add(region.id);
                              else next.delete(region.id);
                              return next;
                            });
                          }}
                        >
                          <Card>
                            <CollapsibleTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                className="h-auto w-full justify-start p-0 text-left hover:bg-transparent"
                              >
                                <CardHeader className="w-full space-y-1 px-3 py-3">
                                  <CardTitle className="flex items-start justify-between gap-2 text-sm">
                                    <span className="truncate">{region.region_name}</span>
                                    <div className="flex items-center gap-1">
                                      <Badge variant="outline" className="text-[10px] uppercase">
                                        {region.region_id}
                                      </Badge>
                                      <ChevronDown className={`size-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
                                    </div>
                                  </CardTitle>
                                  <div className="space-y-1 text-[11px] text-muted-foreground">
                                    <p>
                                      POP {isLoadingCard ? "..." : summary?.pops ?? 0} | Devices {isLoadingCard ? "..." : summary?.devices ?? 0}
                                    </p>
                                    <p>
                                      Route {isLoadingCard ? "..." : formatKilometers(summary?.routeDistanceMeters ?? 0)} | Cable on Route{" "}
                                      {isLoadingCard ? "..." : summary?.cableDevices ?? 0}
                                    </p>
                                    <p>Update terakhir: {formatDateTime(regionLastUpdated)}</p>
                                  </div>
                                </CardHeader>
                              </Button>
                            </CollapsibleTrigger>

                            <CollapsibleContent>
                              <CardContent className="space-y-2 px-3 pb-3 pt-0">
                                <div className="grid grid-cols-2 gap-1.5">
                                  {assetCategories.map((category) => {
                                    const value = regionDetail?.[category.slug]?.total;
                                    const href = `/data-management/list/${category.slug}?region_id=${encodeURIComponent(region.id)}`;
                                    return (
                                      <QuickCountButton
                                        key={category.slug}
                                        href={href}
                                        label={category.label}
                                        value={regionDetailLoading ? undefined : value ?? 0}
                                      />
                                    );
                                  })}
                                </div>
                              </CardContent>
                            </CollapsibleContent>
                          </Card>
                        </Collapsible>
                      );
                    })}
                  </div>

                    <div className="flex items-center justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setRegionPage((prev) => Math.max(1, prev - 1))}
                        disabled={safeRegionPage <= 1}
                      >
                        Prev
                      </Button>
                      <span className="text-xs text-muted-foreground">
                        Page {safeRegionPage} / {totalRegionPages}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setRegionPage((prev) => Math.min(totalRegionPages, prev + 1))}
                        disabled={safeRegionPage >= totalRegionPages}
                      >
                        Next
                      </Button>
                    </div>
                  </>
                )}
                </section>
              ) : null}

              {!isSuperadmin ? (
                <section className="space-y-2">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      {isAdminRegion ? "Region Aktif" : "Area Kerja Validator"}
                    </h3>
                    {regions.length > 1 ? (
                      <div className="w-full sm:w-80">
                        <Combobox
                          value={focusedRegionId}
                          onValueChange={setFocusedRegionId}
                          options={regions.map((region) => ({
                            value: region.id,
                            label: `${region.region_name} (${region.region_id})`,
                          }))}
                        />
                      </div>
                    ) : null}
                  </div>

                  {!focusedRegion ? (
                    <Card>
                      <CardContent className="py-6 text-sm text-muted-foreground">
                        Belum ada region yang tersedia untuk akun ini.
                      </CardContent>
                    </Card>
                  ) : (
                    <Card>
                      <CardHeader className="space-y-1 px-3 py-3">
                        <CardTitle className="flex items-start justify-between gap-2 text-sm">
                          <span className="truncate">{focusedRegion.region_name}</span>
                          <Badge variant="outline" className="text-[10px] uppercase">
                            {focusedRegion.region_id}
                          </Badge>
                        </CardTitle>
                        <div className="space-y-1 text-[11px] text-muted-foreground">
                          <p>
                            POP {focusedRegionLoading ? "..." : focusedRegionSummary?.pops ?? 0} | Devices{" "}
                            {focusedRegionLoading ? "..." : focusedRegionSummary?.devices ?? 0}
                          </p>
                          <p>
                            Route {focusedRegionLoading ? "..." : formatKilometers(focusedRegionSummary?.routeDistanceMeters ?? 0)} | Cable on
                            Route {focusedRegionLoading ? "..." : ` ${focusedRegionSummary?.cableDevices ?? 0}`}
                          </p>
                          <p>Update terakhir: {formatDateTime(focusedRegionLastUpdated)}</p>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3 px-3 pb-3 pt-0">
                        <div className="grid grid-cols-3 gap-1.5">
                          {focusedAssetCategories.map((category) => {
                            const value = focusedRegionDetail?.[category.slug]?.total;
                            const href = `/data-management/list/${category.slug}?region_id=${encodeURIComponent(focusedRegion.id)}`;
                            return (
                              <QuickCountButton
                                key={category.slug}
                                href={href}
                                label={category.label}
                                value={focusedRegionDetailLoading ? undefined : value ?? 0}
                              />
                            );
                          })}
                        </div>

                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                          {isAdminRegion ? (
                            <>
                              <Button asChild variant="outline" size="sm" className="justify-between">
                                <Link href="/requests">
                                  <span>Approval Queue</span>
                                  <span>Open</span>
                                </Link>
                              </Button>
                              <Button asChild variant="outline" size="sm" className="justify-between">
                                <Link href={`/data-management/list/odp?region_id=${encodeURIComponent(focusedRegion.id)}`}>
                                  <span>List ODP</span>
                                  <span>Open</span>
                                </Link>
                              </Button>
                              <Button asChild variant="outline" size="sm" className="justify-between">
                                <Link href={`/data-management/odp-quality?region_id=${encodeURIComponent(focusedRegion.id)}`}>
                                  <span>ODP Quality</span>
                                  <span>Open</span>
                                </Link>
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button asChild variant="outline" size="sm" className="justify-between">
                                <Link href={`/data-management/list/odp?region_id=${encodeURIComponent(focusedRegion.id)}`}>
                                  <span>Pilih ODP</span>
                                  <span>Open</span>
                                </Link>
                              </Button>
                              <Button asChild variant="outline" size="sm" className="justify-between">
                                <Link href={`/data-management/odp-quality?region_id=${encodeURIComponent(focusedRegion.id)}`}>
                                  <span>Issue ODP</span>
                                  <span>Open</span>
                                </Link>
                              </Button>
                              <Button asChild variant="outline" size="sm" className="justify-between">
                                <Link href={`/maps?region_id=${encodeURIComponent(focusedRegion.id)}`}>
                                  <span>Peta Region</span>
                                  <span>Open</span>
                                </Link>
                              </Button>
                            </>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </section>
              ) : null}
            </TabsContent>

            {canViewQuality ? <TabsContent value="quality" className="space-y-3">
              <section className="space-y-2">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Data Quality KPI</h3>
                  <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                    <div className="w-full sm:w-72">
                      <Combobox value={qualityRegionId} onValueChange={setQualityRegionId} options={regionOptions} />
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={() => void handleRefreshQuality()} disabled={qualityLoading}>
                      <RefreshCcw className={`mr-1 size-4 ${qualityLoading ? "animate-spin" : ""}`} />
                      Refresh
                    </Button>
                  </div>
                </div>

                {qualityError ? (
                  <AppLoading label={qualityError} />
                ) : qualityLoading && activeQualityKpis.length === 0 ? (
                  <QualityLoading />
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                      {activeQualityKpis.map((kpi) => (
                        <Card key={kpi.key}>
                          <CardHeader className="px-3 py-2">
                            <CardTitle className="text-sm font-semibold">{kpi.label}</CardTitle>
                          </CardHeader>
                          <CardContent className="px-3 pb-3 pt-0">
                            <p className="text-2xl font-bold leading-none">{kpi.value}</p>
                            <p className="mt-1 text-[11px] text-muted-foreground">{kpi.note}</p>
                          </CardContent>
                        </Card>
                      ))}
                      {!activeQualityKpis.length ? (
                        <Card className="sm:col-span-2 xl:col-span-3">
                          <CardContent className="py-6 text-sm text-muted-foreground">Belum ada data KPI untuk filter ini.</CardContent>
                        </Card>
                      ) : null}
                    </div>

                    <Card>
                      <CardHeader className="px-3 py-2">
                        <CardTitle className="text-sm font-semibold">ODP Quality Issues</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 px-3 pb-3 pt-0">
                        {activeOdpIssues.length ? (
                          activeOdpIssues.map((issue) => (
                            <div key={issue.key} className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge variant={issue.severity === "high" ? "destructive" : issue.severity === "medium" ? "secondary" : "outline"}>
                                    {issue.severity}
                                  </Badge>
                                  <p className="text-sm font-medium">{issue.label}</p>
                                </div>
                                <p className="mt-1 text-xs text-muted-foreground">{issue.note}</p>
                              </div>
                              <Button asChild variant="outline" size="sm" className="justify-between sm:min-w-32">
                                <Link href={issue.href}>
                                  <span>{issue.value}</span>
                                  <span>Open</span>
                                </Link>
                              </Button>
                            </div>
                          ))
                        ) : (
                          <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">Belum ada issue ODP untuk filter ini.</p>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )}
              </section>
            </TabsContent> : null}
            </Tabs>
          </div>
        ) : null}
      </div>
    </ScrollArea>
  );
}

function QuickCountButton({ href, label, value }: { href: string; label: string; value?: number }) {
  return (
    <Button asChild variant="outline" size="sm" className="h-8 justify-between px-2 text-[11px]">
      <Link href={href}>
        <span className="truncate font-medium">{label}</span>
        {typeof value === "number" ? (
          <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-[10px]">
            {value}
          </Badge>
        ) : (
          <Skeleton className="ml-2 h-5 w-8" />
        )}
      </Link>
    </Button>
  );
}

function SummaryLoading() {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-7">
        {Array.from({ length: 7 }).map((_, index) => (
          <Card key={index}>
            <CardHeader className="px-3 py-2">
              <Skeleton className="h-4 w-20" />
            </CardHeader>
            <CardContent className="px-3 pb-3 pt-0">
              <Skeleton className="h-8 w-16" />
              <Skeleton className="mt-2 h-3 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index}>
            <CardHeader className="px-3 py-3">
              <Skeleton className="h-4 w-28" />
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-1.5 px-3 pb-3 pt-0">
              {Array.from({ length: 4 }).map((__, cardIndex) => (
                <Skeleton key={cardIndex} className="h-8 w-full" />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function QualityLoading() {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <Card key={index}>
          <CardHeader className="px-3 py-2">
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent className="px-3 pb-3 pt-0">
            <Skeleton className="h-8 w-14" />
            <Skeleton className="mt-2 h-3 w-48" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function normalizeRole(role: string) {
  if (role === "admin") return "superadmin";
  if (role === "user_all_region") return "adminregion";
  if (role === "user_region") return "validator";
  return role;
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

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
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

function buildDataQualityReport(
  pops: GenericItem[],
  devices: DeviceQualityItem[],
  devicePorts: DevicePortQualityItem[],
  topologyMetrics?: TopologyIntegrityResponse["data"]["metrics"],
  regionId = "all",
): DataQualityReport {
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

  return {
    kpis,
    odpIssues,
  };
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
  if (hasAnyValue(item, ["validation_date", "last_validation_at"])) return true;
  const status = String(item.validation_status || "").trim().toLowerCase();
  return ["valid", "validated", "verified", "ok"].includes(status);
}
