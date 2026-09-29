"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, CheckCircle2, ClipboardCheck, Database, MapPinned, RadioTower, ShieldCheck, Timer, Users } from "lucide-react";
import { DashboardActivityFeed, type DashboardActivityItem } from "@/components/dashboard/dashboard-activity-feed";
import { DashboardBarChartCard, DashboardDonutChartCard, type DashboardChartDatum } from "@/components/dashboard/dashboard-chart-card";
import { DashboardMetricCard } from "@/components/dashboard/dashboard-metric-card";
import { DashboardMiniMap, type MapMarker } from "@/components/dashboard/dashboard-mini-map";
import { DashboardTrendLine, type TrendDatum } from "@/components/dashboard/dashboard-trend-line";
import { DashboardWorkQueue, type DashboardQueueItem } from "@/components/dashboard/dashboard-work-queue";
import { AppLoading } from "@/components/app-loading-new";
import { useSession } from "@/components/session-context";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  apiFetch,
  type DashboardSummaryResponse,
  type DevicesListResponse,
  type PaginatedResponse,
  type PopsListResponse,
  type RegionsListResponse,
} from "@/lib/api";
import { getPopLabel, getRegionLabel } from "@/lib/relation-labels";
import { useTranslate, type TFn } from "@/lib/use-locale";

type RoleKey = "superadmin" | "adminregion" | "validator";

type DeviceItem = DevicesListResponse["data"][number] & {
  validation_status?: string | null;
  validation_date?: string | null;
  last_validation_at?: string | null;
  updated_at?: string | null;
};

type RegionItem = RegionsListResponse["data"][number];

type PopItem = PopsListResponse["data"][number] & {
  updated_at?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
};

type DevicePortItem = {
  id: string;
  device_id?: string | null;
  port_label?: string | null;
  port_index?: number | null;
  status?: string | null;
  customer_id?: string | null;
  ont_device_id?: string | null;
};

type ValidationRequestItem = {
  id: string;
  request_id?: string | null;
  entity_id?: string | null;
  current_status?: string | null;
  updated_at?: string | null;
  adminregion_review_note?: string | null;
  superadmin_review_note?: string | null;
  payload_snapshot?: {
    source?: string;
    operation?: string;
    resource_name?: string;
    resource_label?: string;
    field_validation?: {
      old_device_name?: string | null;
      new_device_name?: string | null;
    } | null;
    device?: {
      device_name?: string | null;
    } | null;
  } | null;
  evidence_attachments?: Array<{ id?: string | null; attachment_id?: string | null } | string> | null;
};

type AuditLogItem = {
  id: string;
  action_name?: string | null;
  entity_type?: string | null;
  entity_id?: string | null;
  created_at?: string | null;
};

type DashboardData = {
  summary: DashboardSummaryResponse["data"] | null;
  regions: RegionItem[];
  pops: PopItem[];
  devices: DeviceItem[];
  odpDevices: DeviceItem[];
  ports: DevicePortItem[];
  adminregionRequests: ValidationRequestItem[];
  superadminRequests: ValidationRequestItem[];
  rejectedAdminregion: ValidationRequestItem[];
  rejectedSuperadmin: ValidationRequestItem[];
  evidenceMissing: ValidationRequestItem[];
  auditLogs: AuditLogItem[];
};

const EMPTY_DATA: DashboardData = {
  summary: null,
  regions: [],
  pops: [],
  devices: [],
  odpDevices: [],
  ports: [],
  adminregionRequests: [],
  superadminRequests: [],
  rejectedAdminregion: [],
  rejectedSuperadmin: [],
  evidenceMissing: [],
  auditLogs: [],
};

export default function DashboardPage() {
  const { token, me } = useSession();
  const { t } = useTranslate();
  const role = normalizeRole(me.role);
  const [data, setData] = useState<DashboardData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message?: string; fallback: "refresh" | "load" } | null>(null);
  const [regionFilterId, setRegionFilterId] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const scopeRegionIds = useMemo(() => me.app_user.user_region_scopes?.map((scope) => scope.region_id).filter(Boolean) || [], [me.app_user.user_region_scopes]);
  const singleRegionScope = regionFilterId || (scopeRegionIds.length === 1 ? scopeRegionIds[0] : "");

  const doRefresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const next = await loadDashboardData(token, role, singleRegionScope, scopeRegionIds);
      setData(next);
      setLastUpdated(new Date());
    } catch (err) {
      setError({ message: (err as Error).message, fallback: "refresh" });
    }
    setRefreshing(false);
  }, [token, role, singleRegionScope, scopeRegionIds]);

  const fastAction = useMemo(() => ({
    approve: async (id: string) => {
      setActionLoadingId(id);
      try {
        const endpoint = role === "superadmin" ? "superadmin" : "adminregion";
        await apiFetch(`/validation-requests/${id}/${endpoint}/approve`, {
          token,
          method: "POST",
          body: { note: t("dashboard.helper.fastApprove") },
        });
        const next = await loadDashboardData(token, role, singleRegionScope, scopeRegionIds);
        setData(next);
      } catch { /* silent */ }
      setActionLoadingId("");
    },
    reject: async (id: string) => {
      setActionLoadingId(id);
      try {
        const endpoint = role === "superadmin" ? "superadmin" : "adminregion";
        await apiFetch(`/validation-requests/${id}/${endpoint}/reject`, {
          token,
          method: "POST",
          body: { note: t("dashboard.helper.fastReject") },
        });
        const next = await loadDashboardData(token, role, singleRegionScope, scopeRegionIds);
        setData(next);
      } catch { /* silent */ }
      setActionLoadingId("");
    },
    loadingId: actionLoadingId,
  }), [role, token, singleRegionScope, actionLoadingId, t]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError(null);
      try {
        const next = await loadDashboardData(token, role, singleRegionScope, scopeRegionIds);
        if (!cancelled) {
          setData(next);
          setLastUpdated(new Date());
        }
      } catch (err) {
        if (!cancelled) {
          setError({ message: (err as Error).message, fallback: "load" });
          setData(EMPTY_DATA);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [role, singleRegionScope, token, regionFilterId]);

  if (loading && !data.summary) {
    return (
      <div className="h-full min-h-0 w-full pr-3">
        <AppLoading label={t("dashboard.loading")} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <DashboardHeader
        role={role}
        regionCount={scopeRegionIds.length}
        regions={data.regions.map((r) => ({ id: String(r.id), label: r.region_name || r.region_id || t("dashboard.tab.region") }))}
        regionFilter={regionFilterId}
        onRegionFilterChange={setRegionFilterId}
        onRefresh={doRefresh}
        refreshing={refreshing}
        loading={loading}
        lastUpdated={lastUpdated}
      />

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>{t("dashboard.errorTitle")}</AlertTitle>
          <AlertDescription>
            {error.message || t(error.fallback === "refresh" ? "dashboard.refreshFailed" : "dashboard.loadFailed")}
          </AlertDescription>
        </Alert>
      ) : null}

      <DashboardTabs data={data} role={role} loading={loading} singleRegionScope={singleRegionScope} />
    </div>
  );
}

function DashboardTabs({
  data,
  role,
  loading,
  singleRegionScope,
}: {
  data: DashboardData;
  role: RoleKey;
  loading: boolean;
  singleRegionScope: string;
}) {
  const { t } = useTranslate();
  const showRegionTab = role === "superadmin";
  const showDeviceTab = role !== "validator";
  const tabColumns = role === "validator" ? "grid-cols-3" : showRegionTab ? "grid-cols-2 sm:grid-cols-5" : "grid-cols-2 sm:grid-cols-4";
  return (
    <Tabs defaultValue="overview" className="space-y-4">
      <TabsList className={`grid h-auto w-full gap-1 ${tabColumns}`}>
        <TabsTrigger value="overview" className="h-auto min-h-9 whitespace-normal px-2 py-2 text-center text-xs leading-tight sm:text-sm">
          {t("dashboard.tab.overview")}
        </TabsTrigger>
        {showRegionTab ? (
          <TabsTrigger value="region" className="h-auto min-h-9 whitespace-normal px-2 py-2 text-center text-xs leading-tight sm:text-sm">
            {t("dashboard.tab.region")}
          </TabsTrigger>
        ) : null}
        <TabsTrigger value="pop" className="h-auto min-h-9 whitespace-normal px-2 py-2 text-center text-xs leading-tight sm:text-sm">
          {t("dashboard.tab.pop")}
        </TabsTrigger>
        {showDeviceTab ? (
          <TabsTrigger value="device" className="h-auto min-h-9 whitespace-normal px-2 py-2 text-center text-xs leading-tight sm:text-sm">
            {t("dashboard.tab.device")}
          </TabsTrigger>
        ) : null}
        <TabsTrigger value="workflow" className="h-auto min-h-9 whitespace-normal px-2 py-2 text-center text-xs leading-tight sm:text-sm">
          <span className="sm:hidden">{t("dashboard.tab.kpiMobile")}</span>
          <span className="hidden sm:inline">{t("dashboard.tab.workflow")}</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-4">
        {role === "validator" ? <ValidatorOverviewDashboard data={data} loading={loading} singleRegionScope={singleRegionScope} /> : <AssetOverviewDashboard data={data} loading={loading} />}
      </TabsContent>
      {showRegionTab ? (
        <TabsContent value="region" className="space-y-4">
          <RegionDashboardTab data={data} loading={loading} />
        </TabsContent>
      ) : null}
      <TabsContent value="pop" className="space-y-4">
        <PopDashboardTab data={data} loading={loading} />
      </TabsContent>
      {showDeviceTab ? (
        <TabsContent value="device" className="space-y-4">
          <DeviceDashboardTab data={data} loading={loading} />
        </TabsContent>
      ) : null}
      <TabsContent value="workflow" className="space-y-4">
        {role === "superadmin" ? <SuperadminDashboard data={data} loading={loading} /> : null}
        {role === "adminregion" ? <AdminregionDashboard data={data} loading={loading} singleRegionScope={singleRegionScope} /> : null}
        {role === "validator" ? <ValidatorDashboard data={data} loading={loading} singleRegionScope={singleRegionScope} /> : null}
      </TabsContent>
    </Tabs>
  );
}

function DashboardHeader({
  role,
  regionCount,
  regions,
  regionFilter,
  onRegionFilterChange,
  onRefresh,
  refreshing,
  loading,
  lastUpdated,
}: {
  role: RoleKey;
  regionCount: number;
  regions?: { id: string; label: string }[];
  regionFilter?: string;
  onRegionFilterChange?: (id: string) => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  loading?: boolean;
  lastUpdated?: Date | null;
}) {
  const { t } = useTranslate();
  const copy = getRoleCopy(role, t);
  const regionOptions = regions ? [{ value: "__all__", label: t("dashboard.regionFilterPlaceholder") }, ...regions.map((r) => ({ value: r.id, label: r.label }))] : [];
  return (
    <div className="rounded-[2rem] border border-border/40 bg-gradient-to-br from-muted/10 to-muted/5 p-2 shadow-[0_1px_3px_rgba(0,0,0,0.04)] dark:bg-gradient-to-br dark:from-white/[0.02] dark:to-transparent">
      <div className="flex flex-col gap-3 rounded-[calc(2rem-0.5rem)] border border-border/60 bg-background/80 p-3.5 sm:p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-xl dark:bg-background/40 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <Badge variant="secondary" className="font-mono text-[9px] uppercase tracking-[0.18em]">{copy.badge}</Badge>
            <Badge variant="outline" className="font-mono text-[9px] uppercase tracking-[0.18em]">{regionCount ? t("dashboard.regionScope", { count: regionCount }) : t("dashboard.globalScope")}</Badge>
          </div>
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">{copy.title}</h2>
          <p className="max-w-3xl text-xs sm:text-sm text-muted-foreground">{copy.description}</p>
        </div>
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
          <span className="hidden font-mono text-xs tabular-nums text-muted-foreground sm:inline">
            {lastUpdated ? formatTimeAgo(lastUpdated, t) : ""}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={refreshing}
            onClick={onRefresh}
            className="h-9 px-2 text-xs"
            aria-label={t("dashboard.refresh")}
          >
            {refreshing ? t("dashboard.refreshing") : "⟳"}
          </Button>
          {regions && onRegionFilterChange ? (
            <Select value={regionFilter || "__all__"} onValueChange={(v) => onRegionFilterChange(v === "__all__" ? "" : v)} disabled={refreshing || loading}>
              <SelectTrigger className="h-9 w-full sm:w-[180px] text-xs sm:text-sm">
                <SelectValue placeholder={t("dashboard.regionFilterPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {regionOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
          <Button asChild size="sm" className="w-full sm:w-auto">
            <Link href={copy.primaryHref}>{copy.primaryAction}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function AssetOverviewDashboard({ data, loading }: { data: DashboardData; loading: boolean }) {
  const { t } = useTranslate();
  const s = data.summary;
  const odpStats = getOdpStatsFromSummary(s);
  const portStats = getPortStatsFromSummary(s);
  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <DashboardMetricCard label={t("dashboard.metric.regions")} value={s?.regions?.total ?? data.regions.length} caption={t("dashboard.caption.regions")} badge={t("dashboard.badge.scope")} icon={MapPinned} loading={loading} />
        <DashboardMetricCard label={t("dashboard.metric.pops")} value={s?.pops?.total ?? 0} caption={t("dashboard.caption.pops")} badge="POP" tone="blue" icon={Database} loading={loading} />
        <DashboardMetricCard label={t("dashboard.metric.devices")} value={s?.devices?.total ?? 0} caption={t("dashboard.caption.devices")} badge={t("dashboard.badge.inventory")} tone="green" icon={RadioTower} loading={loading} />
        <DashboardMetricCard label={t("dashboard.metric.odp")} value={odpStats.total} caption={t("dashboard.caption.odp", { validated: odpStats.validated, unvalidated: odpStats.unvalidated })} badge={t("dashboard.badge.field")} tone="amber" icon={ClipboardCheck} loading={loading} />
        <DashboardMetricCard label={t("dashboard.metric.ports")} value={portStats.total} caption={t("dashboard.caption.ports", { problem: portStats.problem })} badge={t("dashboard.badge.capacity")} tone={portStats.problem ? "amber" : "green"} icon={Activity} loading={loading} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <DashboardDonutChartCard
          title={t("dashboard.chart.deviceType.title")}
          description={t("dashboard.chart.deviceType.description")}
          data={toChartFromSummary(s?.devices?.byType, t)}
          emptyLabel={t("dashboard.chart.deviceType.empty")}
          loading={loading}
        />
        <DashboardBarChartCard
          title={t("dashboard.chart.popDistribution.title")}
          description={t("dashboard.chart.popDistribution.description")}
          data={toChartFromSummary(s?.pops?.topByDevice, t)}
          emptyLabel={t("dashboard.chart.popDistribution.empty")}
          loading={loading}
        />
        <DashboardDonutChartCard
          title={t("dashboard.chart.odpValidation.title")}
          description={t("dashboard.chart.odpValidation.description")}
          data={odpValidationFromSummary(s, data, t)}
          emptyLabel={t("dashboard.chart.odpValidation.empty")}
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <DashboardTrendLine
          title={t("dashboard.chart.auditActivityTrend.title")}
          description={t("dashboard.chart.auditActivityTrend.description")}
          data={weeklyAuditTrend(data.auditLogs)}
          loading={loading}
        />
        <DashboardMiniMap
          title={t("dashboard.chart.popLocationMap.title")}
          description={t("dashboard.chart.popLocationMap.description")}
          markers={buildMapMarkers(data.pops, data.odpDevices)}
          loading={loading}
        />
      </div>
    </>
  );
}

function ValidatorOverviewDashboard({
  data,
  loading,
  singleRegionScope,
}: {
  data: DashboardData;
  loading: boolean;
  singleRegionScope: string;
}) {
  const { t } = useTranslate();
  const odpStats = getOdpStatsFromSummary(data.summary);
  const regionSuffix = singleRegionScope ? `&region_id=${encodeURIComponent(singleRegionScope)}` : "";
  const rejected = requestItems(data.rejectedAdminregion, "rejected_adminregion", t);
  const pendingOdp = data.odpDevices
    .filter((item) => !isValidated(item))
    .slice(0, 6)
    .map((item) => ({
      id: `pending:${item.id}`,
      title: item.device_name || item.device_id || "ODP",
      description: t("dashboard.helper.pendingFinal", { id: item.device_id || t("dashboard.helper.inventoryNotReady") }),
      href: `/data-management/list/odp/${item.id}`,
      badge: item.validation_status || "unvalidated",
      tone: "amber" as const,
    }));

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardMetricCard label={t("dashboard.metric.regionScope")} value={data.summary?.regions?.total ?? (data.regions.length || 1)} caption={formatRegionScope(data.regions, t)} badge={t("dashboard.badge.scope")} tone="blue" icon={MapPinned} loading={loading} />
        <DashboardMetricCard label={t("dashboard.metric.popCoverage")} value={data.summary?.pops?.total ?? data.pops.length} caption={t("dashboard.caption.popCoverage")} badge="POP" icon={Database} loading={loading} />
        <DashboardMetricCard label={t("dashboard.metric.odpQueue")} value={odpStats.unvalidated} caption={t("dashboard.caption.odpQueue")} badge={t("dashboard.badge.validate")} tone="amber" icon={RadioTower} loading={loading} />
        <DashboardMetricCard label={t("dashboard.metric.rejected")} value={data.rejectedAdminregion.length} caption={t("dashboard.caption.rejected")} badge={t("dashboard.badge.fix")} tone={data.rejectedAdminregion.length ? "red" : "green"} icon={AlertTriangle} loading={loading} />
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="p-3 pb-2">
          <CardTitle className="text-base">{t("dashboard.fieldFocus.title")}</CardTitle>
          <CardDescription>{t("dashboard.fieldFocus.description")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 p-3 pt-0">
          <Button asChild>
            <Link href={`/data-management/list/odp${singleRegionScope ? `?region_id=${encodeURIComponent(singleRegionScope)}` : ""}`}>{t("dashboard.fieldFocus.openOdpQueue")}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/data-management/list/odp?validation_status=unvalidated${regionSuffix}`}>{t("dashboard.fieldFocus.odpBelumValid")}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/requests">{t("dashboard.fieldFocus.requests")}</Link>
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <DashboardDonutChartCard
          title={t("dashboard.chart.odpValidation.title")}
          description={t("dashboard.chart.odpValidationWorkflow.description")}
          data={odpValidationFromSummary(data.summary, data, t)}
          emptyLabel={t("dashboard.chart.odpValidationWorkflow.empty")}
          loading={loading}
        />
        <DashboardBarChartCard
          title={t("dashboard.chart.topPopByOdp.title")}
          description={t("dashboard.chart.topPopByOdp.description")}
          data={toChartFromSummary(data.summary?.pops?.topByOdp, t)}
          emptyLabel={t("dashboard.chart.topPopByOdp.empty")}
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <DashboardWorkQueue
          title={t("dashboard.queue.validationPriority.title")}
          description={t("dashboard.queue.validationPriority.description")}
          items={[...rejected, ...pendingOdp]}
          emptyLabel={t("dashboard.queue.validationPriority.empty")}
          icon={ClipboardCheck}
          loading={loading}
        />
        <DashboardWorkQueue
          title={t("dashboard.queue.popCoverageAttention.title")}
          description={t("dashboard.queue.popCoverageAttention.description")}
          items={popWithoutDeviceFromSummary(data.summary, t)}
          emptyLabel={t("dashboard.queue.popCoverageAttention.empty")}
          icon={Database}
          loading={loading}
        />
      </div>
    </>
  );
}

function RegionDashboardTab({ data, loading }: { data: DashboardData; loading: boolean }) {
  const { t } = useTranslate();
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <DashboardBarChartCard
        title={t("dashboard.chart.devicePerRegion.title")}
        description={t("dashboard.chart.devicePerRegion.description")}
        data={toChartFromSummary(data.summary?.devices?.byRegion, t)}
        emptyLabel={t("dashboard.chart.devicePerRegion.empty")}
        loading={loading}
      />
      <DashboardBarChartCard
        title={t("dashboard.chart.popPerRegion.title")}
        description={t("dashboard.chart.popPerRegion.description")}
        data={toChartFromSummary(data.summary?.pops?.byRegion, t)}
        emptyLabel={t("dashboard.chart.popPerRegion.empty")}
        loading={loading}
      />
      <RegionHealthCard data={data} loading={loading} />
      <DashboardBarChartCard
        title={t("dashboard.chart.odpPerRegion.title")}
        description={t("dashboard.chart.odpPerRegion.description")}
        data={toChartFromSummary(data.summary?.odp?.byRegion, t)}
        emptyLabel={t("dashboard.chart.odpPerRegion.empty")}
        loading={loading}
      />
    </div>
  );
}

function PopDashboardTab({ data, loading }: { data: DashboardData; loading: boolean }) {
  const { t } = useTranslate();
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <DashboardDonutChartCard
        title={t("dashboard.chart.popStatus.title")}
        description={t("dashboard.chart.popStatus.description")}
        data={toChartFromSummary(data.summary?.pops?.byStatus, t)}
        emptyLabel={t("dashboard.chart.popStatus.empty")}
        loading={loading}
      />
      <DashboardBarChartCard
        title={t("dashboard.chart.topPopByDevice.title")}
        description={t("dashboard.chart.topPopByDevice.description")}
        data={toChartFromSummary(data.summary?.pops?.topByDevice, t)}
        emptyLabel={t("dashboard.chart.topPopByDevice.empty")}
        loading={loading}
      />
      <DashboardBarChartCard
        title={t("dashboard.chart.topPopByOdp.title")}
        description={t("dashboard.chart.topPopByOdp.description")}
        data={toChartFromSummary(data.summary?.pops?.topByOdp, t)}
        emptyLabel={t("dashboard.chart.topPopByOdp.empty")}
        loading={loading}
      />
      <DashboardWorkQueue
        title={t("dashboard.queue.popCoverageAttention.title")}
        description={t("dashboard.queue.popCoverageAttention.description")}
        items={popWithoutDeviceFromSummary(data.summary, t)}
        emptyLabel={t("dashboard.queue.popCoverageAttention.empty")}
        icon={Database}
        loading={loading}
      />
    </div>
  );
}

function DeviceDashboardTab({ data, loading }: { data: DashboardData; loading: boolean }) {
  const { t } = useTranslate();
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <DashboardDonutChartCard
        title={t("dashboard.chart.deviceTypeComposition.title")}
        description={t("dashboard.chart.deviceTypeComposition.description")}
        data={toChartFromSummary(data.summary?.devices?.byType, t)}
        emptyLabel={t("dashboard.chart.deviceTypeComposition.empty")}
        loading={loading}
      />
      <DashboardBarChartCard
        title={t("dashboard.chart.deviceStatus.title")}
        description={t("dashboard.chart.deviceStatus.description")}
        data={toChartFromSummary(data.summary?.devices?.byStatus, t)}
        emptyLabel={t("dashboard.chart.deviceStatus.empty")}
        loading={loading}
      />
      <DashboardDonutChartCard
        title={t("dashboard.chart.odpValidationWorkflow.title")}
        description={t("dashboard.chart.odpValidationWorkflow.description")}
        data={odpValidationFromSummary(data.summary, data, t)}
        emptyLabel={t("dashboard.chart.odpValidationWorkflow.empty")}
        loading={loading}
      />
      <DashboardBarChartCard
        title={t("dashboard.chart.portUtilization.title")}
        description={t("dashboard.chart.portUtilization.description")}
        data={toChartFromSummary(data.summary?.ports?.byStatus, t)}
        emptyLabel={t("dashboard.chart.portUtilization.empty")}
        loading={loading}
      />
    </div>
  );
}

function SuperadminDashboard({ data, loading }: { data: DashboardData; loading: boolean }) {
  const { t } = useTranslate();
  const odpStats = getOdpStatsFromSummary(data.summary);
  const portStats = getPortStatsFromSummary(data.summary);
  const riskItems = buildRiskItems(data, t);
  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <DashboardMetricCard label={t("dashboard.metric.finalApproval")} value={data.superadminRequests.length} caption={t("dashboard.caption.finalApproval")} badge={t("dashboard.badge.queue")} tone="blue" icon={ShieldCheck} loading={loading} />
        <DashboardMetricCard label={t("dashboard.metric.rejected")} value={data.rejectedAdminregion.length + data.rejectedSuperadmin.length} caption={t("dashboard.caption.rejectedRisk")} badge={t("dashboard.badge.risk")} tone="red" icon={AlertTriangle} loading={loading} />
        <DashboardMetricCard label={t("dashboard.metric.odpValidated")} value={odpStats.validated} caption={t("dashboard.caption.odpValidatedCount", { unvalidated: odpStats.unvalidated })} badge="ODP" tone="green" icon={CheckCircle2} loading={loading} />
        <DashboardMetricCard label={t("dashboard.metric.portIssue")} value={portStats.problem} caption={t("dashboard.caption.portIssueCount")} badge={t("dashboard.badge.quality")} tone={portStats.problem ? "amber" : "green"} icon={RadioTower} loading={loading} />
        <DashboardMetricCard label={t("dashboard.metric.auditEvents")} value={data.auditLogs.length} caption={t("dashboard.caption.auditEvents")} badge={t("dashboard.badge.recent")} icon={Activity} loading={loading} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <DashboardWorkQueue
          title={t("dashboard.queue.approvalCommand.title")}
          description={t("dashboard.queue.approvalCommand.description")}
          items={[
            ...requestItems(data.superadminRequests, "pending_superadmin", t),
            ...requestItems(data.rejectedSuperadmin, "rejected_superadmin", t),
          ]}
          emptyLabel={t("dashboard.queue.approvalCommand.empty")}
          icon={ClipboardCheck}
          loading={loading}
        />
        <DashboardWorkQueue
          title={t("dashboard.queue.operationalRisk.title")}
          description={t("dashboard.queue.operationalRisk.description")}
          items={riskItems}
          emptyLabel={t("dashboard.queue.operationalRisk.empty")}
          icon={AlertTriangle}
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <RegionHealthCard data={data} loading={loading} />
        <DashboardActivityFeed
          title={t("dashboard.activity.recentGovernance.title")}
          description={t("dashboard.activity.recentGovernance.description")}
          items={auditItems(data.auditLogs, t)}
          emptyLabel={t("dashboard.activity.recentGovernance.empty")}
          loading={loading}
        />
      </div>
    </>
  );
}

function AdminregionDashboard({ data, loading, singleRegionScope }: { data: DashboardData; loading: boolean; singleRegionScope: string }) {
  const { t } = useTranslate();
  const odpStats = getOdpStatsFromSummary(data.summary);
  const portStats = getPortStatsFromSummary(data.summary);
  const regionSuffix = singleRegionScope ? `&region_id=${encodeURIComponent(singleRegionScope)}` : "";
  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <DashboardMetricCard label={t("dashboard.metric.needReview")} value={data.adminregionRequests.length} caption={t("dashboard.caption.needReview")} badge={t("dashboard.badge.today")} tone="blue" icon={ClipboardCheck} loading={loading} />
        <DashboardMetricCard label={t("dashboard.metric.rejected")} value={data.rejectedSuperadmin.length} caption={t("dashboard.caption.rejectedSuperadminCount")} badge={t("dashboard.badge.followUp")} tone="red" icon={AlertTriangle} loading={loading} />
        <DashboardMetricCard label={t("dashboard.metric.validatedOdp")} value={odpStats.validated} caption={t("dashboard.caption.validatedOdpCount", { unvalidated: odpStats.unvalidated })} badge={t("dashboard.badge.progress")} tone="green" icon={CheckCircle2} loading={loading} />
        <DashboardMetricCard label={t("dashboard.metric.evidenceIssue")} value={data.evidenceMissing.length} caption={t("dashboard.caption.evidenceIssueCount")} badge={t("dashboard.badge.quality")} tone={data.evidenceMissing.length ? "amber" : "green"} icon={Database} loading={loading} />
        <DashboardMetricCard label={t("dashboard.metric.portIssue")} value={portStats.problem} caption={t("dashboard.caption.portIssueOps")} badge={t("dashboard.badge.ops")} tone={portStats.problem ? "amber" : "green"} icon={RadioTower} loading={loading} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <DashboardWorkQueue
          title={t("dashboard.queue.myRegionReview.title")}
          description={t("dashboard.queue.myRegionReview.description")}
          items={[
            ...requestItems(data.adminregionRequests, "pending_adminregion", t),
            ...requestItems(data.rejectedSuperadmin, "rejected_superadmin", t),
          ]}
          emptyLabel={t("dashboard.queue.myRegionReview.empty")}
          icon={ClipboardCheck}
          loading={loading}
        />
        <DashboardWorkQueue
          title={t("dashboard.queue.fieldQuality.title")}
          description={t("dashboard.queue.fieldQuality.description")}
          items={[
            qualityItem(t("dashboard.quality.unvalidated"), odpStats.unvalidated, `/data-management/list/odp?validation_status=unvalidated${regionSuffix}`, "medium", t),
            qualityItem(t("dashboard.quality.evidenceMissing"), data.evidenceMissing.length, "/requests", "high", t),
            qualityItem(t("dashboard.quality.portIssue"), portStats.downMaintenance, `/data-management/list/odp${regionSuffix}`, "medium", t),
          ].filter(Boolean) as DashboardQueueItem[]}
          emptyLabel={t("dashboard.queue.fieldQuality.empty")}
          icon={AlertTriangle}
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ValidationProgressCard odpStats={odpStats} loading={loading} />
        <DashboardActivityFeed
          title={t("dashboard.activity.validatorActivity.title")}
          description={t("dashboard.activity.validatorActivity.description")}
          items={requestActivityItems([...data.adminregionRequests, ...data.rejectedAdminregion], t)}
          emptyLabel={t("dashboard.activity.validatorActivity.empty")}
          loading={loading}
        />
      </div>
    </>
  );
}

function ValidatorDashboard({ data, loading, singleRegionScope }: { data: DashboardData; loading: boolean; singleRegionScope: string }) {
  const { t } = useTranslate();
  const odpStats = getOdpStatsFromSummary(data.summary);
  const regionSuffix = singleRegionScope ? `&region_id=${encodeURIComponent(singleRegionScope)}` : "";
  const rejected = requestItems(data.rejectedAdminregion, "rejected_adminregion", t);
  const openOdpItems = data.odpDevices
    .filter((item) => !isValidated(item))
    .slice(0, 6)
    .map((item) => ({
      id: item.id,
      title: item.device_name || item.device_id || "ODP",
      description: t("dashboard.helper.pendingFinal", { id: item.device_id || t("dashboard.helper.inventoryNotReady") }),
      href: `/data-management/list/odp/${item.id}`,
      badge: item.validation_status || "unvalidated",
      tone: "amber" as const,
    }));

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardMetricCard label={t("dashboard.metric.tugasValidasi")} value={odpStats.unvalidated} caption={t("dashboard.caption.tugasValidasi")} badge={t("dashboard.badge.queue")} tone="blue" icon={RadioTower} loading={loading} />
        <DashboardMetricCard label={t("dashboard.metric.rejected")} value={data.rejectedAdminregion.length} caption={t("dashboard.caption.rejectedFix")} badge={t("dashboard.badge.fix")} tone="red" icon={AlertTriangle} loading={loading} />
        <DashboardMetricCard label={t("dashboard.metric.submitted")} value={data.adminregionRequests.length} caption={t("dashboard.caption.submitted")} badge={t("dashboard.badge.review")} tone="amber" icon={Timer} loading={loading} />
        <DashboardMetricCard label={t("dashboard.metric.validatedDone")} value={odpStats.validated} caption={t("dashboard.caption.validatedDone")} badge={t("dashboard.badge.done")} tone="green" icon={CheckCircle2} loading={loading} />
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="p-3 pb-2">
          <CardTitle className="text-base">{t("dashboard.mobileFieldCommand.title")}</CardTitle>
          <CardDescription>{t("dashboard.mobileFieldCommand.description")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 p-3 pt-0">
          <Button asChild>
            <Link href={`/data-management/list/odp${singleRegionScope ? `?region_id=${encodeURIComponent(singleRegionScope)}` : ""}`}>{t("dashboard.queue.openOdpQueue")}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/data-management/list/odp?validation_status=unvalidated${regionSuffix}`}>{t("dashboard.fieldFocus.odpBelumValid")}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/requests">{t("dashboard.queue.openRequests")}</Link>
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <DashboardWorkQueue
          title={t("dashboard.queue.todayTasks.title")}
          description={t("dashboard.queue.todayTasks.description")}
          items={[...rejected, ...openOdpItems]}
          emptyLabel={t("dashboard.queue.todayTasks.empty")}
          icon={MapPinned}
          loading={loading}
        />
        <DashboardWorkQueue
          title={t("dashboard.queue.submitStatus.title")}
          description={t("dashboard.queue.submitStatus.description")}
          items={requestItems(data.adminregionRequests, "pending_adminregion", t)}
          emptyLabel={t("dashboard.queue.submitStatus.empty")}
          icon={ClipboardCheck}
          loading={loading}
        />
      </div>
    </>
  );
}

function RegionHealthCard({ data, loading }: { data: DashboardData; loading: boolean }) {
  const { t } = useTranslate();
  const odpStats = getOdpStatsFromSummary(data.summary);
  const portStats = getPortStatsFromSummary(data.summary);
  const rows = [
    { label: t("dashboard.regionHealth.odpTotal"), value: odpStats.total },
    { label: t("dashboard.regionHealth.validated"), value: odpStats.validated },
    { label: t("dashboard.regionHealth.unvalidated"), value: odpStats.unvalidated },
    { label: t("dashboard.regionHealth.portIssue"), value: portStats.problem },
  ];
  return (
    <Card>
      <CardHeader className="p-3 pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="size-4" />
          {t("dashboard.regionHealth.title")}
        </CardTitle>
        <CardDescription>{t("dashboard.regionHealth.description")}</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-2 p-3 pt-0">
        {rows.map((row) => (
          <div key={row.label} className="rounded-md border bg-background p-3">
            <p className="text-xs uppercase text-muted-foreground">{row.label}</p>
            {loading ? <Skeleton className="mt-2 h-6 w-14" /> : <p className="mt-1 text-xl font-semibold">{row.value}</p>}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function ValidationProgressCard({ odpStats, loading }: { odpStats: { total: number; validated: number; unvalidated: number }; loading: boolean }) {
  const { t } = useTranslate();
  const percent = odpStats.total ? Math.round((odpStats.validated / odpStats.total) * 100) : 0;
  return (
    <Card>
      <CardHeader className="p-3 pb-2">
        <CardTitle className="text-base">{t("dashboard.odpValidationProgress.title")}</CardTitle>
        <CardDescription>{t("dashboard.odpValidationProgress.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 p-3 pt-0">
        {loading ? <Skeleton className="h-16 w-full" /> : (
          <>
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-3xl font-semibold">{percent}%</p>
                <p className="text-xs text-muted-foreground">{t("dashboard.odpValidationProgress.validated", { validated: odpStats.validated, total: odpStats.total })}</p>
              </div>
              <Badge variant={percent >= 80 ? "secondary" : "outline"}>{percent >= 80 ? t("dashboard.odpValidationProgress.healthy") : t("dashboard.odpValidationProgress.needsWork")}</Badge>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${percent}%` }} />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

async function loadDashboardData(token: string, role: RoleKey, regionId: string, userRegionScope?: string[]): Promise<DashboardData> {
  const suffix = regionId ? `&region_id=${encodeURIComponent(regionId)}` : "";
  const scopeRegionIds = userRegionScope || [];
  const isValidator = role === "validator";
  const [summary, regions, pops, odpDevices, adminregionRequests, superadminRequests, rejectedAdminregion, rejectedSuperadmin, evidenceMissing, auditLogs] = await Promise.all([
    safeFetch<DashboardSummaryResponse>(`/dashboard/summary${regionId ? `?region_id=${encodeURIComponent(regionId)}` : ""}`, token),
    safeFetch<PaginatedResponse<RegionItem>>(`/regions?page=1&limit=200`, token),
    safeFetch<PaginatedResponse<PopItem>>(`/pops?page=1&limit=200${suffix}`, token),
    isValidator ? fetchAllPaginated<DeviceItem>(`/devices?page=1&limit=200&device_type_key=ODP${suffix}`, token, 200) : Promise.resolve([]),
    role === "adminregion" || role === "validator" ? safeFetch<{ data: ValidationRequestItem[] }>("/validation-requests?queue=adminregion", token) : Promise.resolve(null),
    role === "superadmin" || role === "adminregion" ? safeFetch<{ data: ValidationRequestItem[] }>("/validation-requests?queue=superadmin", token) : Promise.resolve(null),
    safeFetch<{ data: ValidationRequestItem[] }>(`/validation-requests/quality-queue?queue=rejected_adminregion${suffix}`, token),
    safeFetch<{ data: ValidationRequestItem[] }>(`/validation-requests/quality-queue?queue=rejected_superadmin${suffix}`, token),
    safeFetch<{ data: ValidationRequestItem[] }>(`/validation-requests/quality-queue?queue=evidence_missing${suffix}`, token),
    role === "superadmin" ? safeFetch<PaginatedResponse<AuditLogItem>>("/auditLogs?page=1&limit=8", token) : Promise.resolve(null),
  ]);

  return {
    summary: summary?.data || null,
    regions: (() => {
      const all = regions?.data || [];
      if (scopeRegionIds?.length) return all.filter((r: RegionItem) => scopeRegionIds.includes(r.id)).slice(0, 200);
      return all.slice(0, 200);
    })(),
    pops: (pops?.data || []).slice(0, 200),
    devices: [],
    odpDevices: isValidator ? (odpDevices || []).slice(0, 200) : [],
    ports: [],
    adminregionRequests: adminregionRequests?.data || [],
    superadminRequests: superadminRequests?.data || [],
    rejectedAdminregion: rejectedAdminregion?.data || [],
    rejectedSuperadmin: rejectedSuperadmin?.data || [],
    evidenceMissing: evidenceMissing?.data || [],
    auditLogs: auditLogs?.data || [],
  };
}

async function safeFetch<T>(path: string, token: string) {
  try {
    return await apiFetch<T>(path, { token });
  } catch {
    return null;
  }
}

async function fetchAllPaginated<T>(pathWithPage: string, token: string, limit = 500) {
  const buildUrl = (page: number) => pathWithPage
    .replace(/page=\d+/i, `page=${page}`)
    .replace(/limit=\d+/i, `limit=${limit}`);

  const first = await safeFetch<PaginatedResponse<T>>(buildUrl(1), token);
  const firstRows = first?.data || [];
  const total = first?.meta?.total ?? 0;

  if (!firstRows.length) return [];
  if (total <= firstRows.length) return firstRows;

  const remainingPages = Math.ceil((total - firstRows.length) / limit);
  const pagePromises: Promise<PaginatedResponse<T> | null>[] = [];
  for (let p = 2; p <= 2 + remainingPages - 1; p++) {
    pagePromises.push(safeFetch<PaginatedResponse<T>>(buildUrl(p), token));
  }

  const rest = await Promise.all(pagePromises);
  const allRows = [firstRows];
  for (const r of rest) {
    if (r?.data?.length) allRows.push(r.data);
  }
  return allRows.flat();
}

function formatTimeAgo(date: Date, t: TFn): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return t("dashboard.timeAgo", { time: `${seconds}d` });
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return t("dashboard.timeAgo", { time: `${minutes}m` });
  return t("dashboard.timeAgo", { time: `${Math.floor(minutes / 60)}j` });
}

function formatRegionScope(regions: RegionItem[], t: TFn) {
  if (!regions.length) return t("dashboard.helper.regionScope");
  if (regions.length === 1) return getRegionLabel({ relation: regions[0], fallback: t("dashboard.helper.oneRegionActive") });
  return regions
    .slice(0, 2)
    .map((region) => getRegionLabel({ relation: region }))
    .join(", ")
    .concat(regions.length > 2 ? ` +${regions.length - 2}` : "");
}

function getOdpStatsFromSummary(s?: DashboardSummaryResponse["data"] | null) {
  if (!s?.odp) return { total: 0, validated: 0, unvalidated: 0 };
  return { total: s.odp.total, validated: s.odp.validated, unvalidated: s.odp.unvalidated };
}

function getPortStatsFromSummary(s?: DashboardSummaryResponse["data"] | null) {
  if (!s?.ports) return { total: 0, downMaintenance: 0, reserved: 0, problem: 0 };
  return {
    total: s.ports.total,
    downMaintenance: s.ports.downMaintenance,
    reserved: s.ports.reserved,
    problem: s.ports.downMaintenance + s.ports.reserved,
  };
}

const CHART_MAX_ITEMS = 6;

function toChartFromSummary(rows: Array<{ label?: string; value?: number; href?: string }> | null | undefined, t: TFn): DashboardChartDatum[] {
  const items = (rows || [])
    .filter((x) => x?.value && x?.value > 0)
    .map((x) => ({ label: x.label || t("dashboard.helper.lainnya"), value: Number(x.value) || 0, href: x.href }));

  if (items.length <= CHART_MAX_ITEMS) return items;

  const top = items.slice(0, CHART_MAX_ITEMS - 1);
  const rest = items.slice(CHART_MAX_ITEMS - 1);
  const restValue = rest.reduce((sum, item) => sum + item.value, 0);
  return [
    ...top,
    { label: t("dashboard.helper.lainnya"), value: restValue, color: "var(--chart-3)", href: "/data-management/list/devices" },
  ];
}

function odpValidationFromSummary(s: DashboardSummaryResponse["data"] | null | undefined, data: DashboardData | undefined, t: TFn): DashboardChartDatum[] {
  const odp = s?.odp;
  const items: DashboardChartDatum[] = [];
  if (!odp) return items;
  if (odp.validated) items.push({ label: t("dashboard.chart.legend.odpValidated"), value: odp.validated, color: "#16a34a", href: "/data-management/list/odp?status=validated" });
  if (odp.unvalidated) items.push({ label: t("dashboard.chart.legend.odpUnvalidated"), value: odp.unvalidated, color: "#f59e0b", href: "/data-management/list/odp?status=unvalidated" });
  if (data?.adminregionRequests?.length) items.push({ label: t("dashboard.chart.legend.pendingAdminRegion"), value: data.adminregionRequests.length, color: "#2563eb", href: "/requests" });
  if (data?.superadminRequests?.length) items.push({ label: t("dashboard.chart.legend.pendingSuperadmin"), value: data.superadminRequests.length, color: "#7c3aed", href: "/requests" });
  const rejected = (data?.rejectedAdminregion?.length || 0) + (data?.rejectedSuperadmin?.length || 0);
  if (rejected) items.push({ label: t("dashboard.chart.legend.rejected"), value: rejected, color: "#dc2626", href: "/requests" });
  return items;
}

function popWithoutDeviceFromSummary(s: DashboardSummaryResponse["data"] | null | undefined, t: TFn): DashboardQueueItem[] {
  return (s?.pops?.withoutDevice || []).slice(0, 6).map((pop) => ({
    id: `pop-wd:${pop.pop_id}`,
    title: pop.pop_name || pop.pop_code || "POP",
    description: t("dashboard.pop.noDeviceDesc", { pop: pop.pop_code || "POP" }),
    href: "/data-management",
    badge: t("dashboard.pop.noDevice"),
    tone: "amber" as const,
  }));
}

function weeklyAuditTrend(logs: AuditLogItem[]): TrendDatum[] {
  const weeks: Record<string, number> = {};
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i * 7);
    const key = d.toISOString().slice(0, 10);
    weeks[key] = 0;
  }
  (logs || []).forEach((log) => {
    if (!log.created_at) return;
    const d = new Date(log.created_at);
    const key = d.toISOString().slice(0, 10);
    if (key in weeks) weeks[key] = (weeks[key] || 0) + 1;
  });
  const keys = Object.keys(weeks).sort();
  return keys.map((k) => {
    const d = new Date(k);
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return { label: `${month}/${day}`, value: weeks[k] };
  });
}

function buildMapMarkers(pops: PopItem[], odpDevices: DeviceItem[]): MapMarker[] {
  const markers: MapMarker[] = [];
  pops.forEach((pop) => {
    const lat = Number(pop.latitude);
    const lng = Number(pop.longitude);
    if (!isFinite(lat) || !isFinite(lng)) return;
    markers.push({
      id: `pop:${pop.id}`,
      lat,
      lng,
      label: pop.pop_name || pop.pop_code || getRegionLabel({ fallback: pop.region_id, optional: true }) || "POP",
      type: "pop",
    });
  });
  return markers;
}

function isValidated(item: DeviceItem) {
  return Boolean(
    item.validation_status === "valid" ||
    item.validation_date ||
    item.last_validation_at
  );
}

function requestItems(
  items: ValidationRequestItem[],
  kind: "pending_adminregion" | "pending_superadmin" | "rejected_adminregion" | "rejected_superadmin",
  t: TFn,
  onFastAction?: {
    approve: (id: string) => Promise<void>;
    reject: (id: string) => Promise<void>;
    loadingId: string;
  },
): DashboardQueueItem[] {
  const canAct = kind === "pending_adminregion" || kind === "pending_superadmin";
  return items.slice(0, 8).map((item) => ({
    id: `${kind}:${item.id}`,
    title: getRequestTitle(item, t),
    description: getRequestDescription(item, t),
    href: kind === "pending_adminregion" || kind === "pending_superadmin" || kind === "rejected_superadmin" ? "/requests" : `/data-management/list/odp/${item.entity_id || ""}`,
    badge: statusLabel(item.current_status || kind, t),
    tone: kind.includes("rejected") ? "red" : "blue",
    onApprove: canAct && onFastAction ? () => onFastAction.approve(item.id) : undefined,
    onReject: canAct && onFastAction ? () => onFastAction.reject(item.id) : undefined,
    actionLoading: onFastAction?.loadingId === item.id,
  }));
}

function requestActivityItems(items: ValidationRequestItem[], t: TFn): DashboardActivityItem[] {
  return items.slice(0, 6).map((item) => ({
    id: item.id,
    title: getRequestTitle(item, t),
    description: getRequestDescription(item, t),
    timestamp: item.updated_at,
    href: "/requests",
  }));
}

function auditItems(items: AuditLogItem[], t: TFn): DashboardActivityItem[] {
  return items.map((item) => ({
    id: item.id,
    title: formatAction(item.action_name, t),
    description: `${item.entity_type || t("dashboard.helper.entity")} ${item.entity_id || ""}`.trim(),
    timestamp: item.created_at,
    href: item.entity_type && item.entity_id ? `/audit-trail?entity_type=${encodeURIComponent(item.entity_type)}&entity_id=${encodeURIComponent(item.entity_id)}` : "/audit-trail",
  }));
}

function buildRiskItems(data: DashboardData, t: TFn) {
  const odpStats = getOdpStatsFromSummary(data.summary);
  const portStats = getPortStatsFromSummary(data.summary);
  return [
    qualityItem(t("dashboard.quality.unvalidated"), odpStats.unvalidated, "/data-management/list/odp?validation_status=unvalidated", "medium", t),
    qualityItem(t("dashboard.quality.evidenceMissing"), data.evidenceMissing.length, "/requests", "high", t),
    qualityItem(t("dashboard.quality.portIssue"), portStats.problem, "/data-management/list/odp", "high", t),
    qualityItem(t("dashboard.quality.rejectedWorkflow"), data.rejectedAdminregion.length + data.rejectedSuperadmin.length, "/requests", "high", t),
  ].filter(Boolean) as DashboardQueueItem[];
}

function qualityItem(title: string, value: number, href: string, severity: "high" | "medium", t: TFn): DashboardQueueItem | null {
  if (!value) return null;
  return {
    id: `${title}:${href}`,
    title,
    description: t("dashboard.quality.itemNeedsFollowUp", { value }),
    href,
    badge: severity === "high" ? t("dashboard.queue.badge.high") : t("dashboard.queue.badge.medium"),
    tone: severity === "high" ? "red" : "amber",
  };
}

function getRequestTitle(item: ValidationRequestItem, t: TFn) {
  return (
    item.payload_snapshot?.field_validation?.new_device_name ||
    item.payload_snapshot?.field_validation?.old_device_name ||
    item.payload_snapshot?.device?.device_name ||
    item.payload_snapshot?.resource_name ||
    item.request_id ||
    t("dashboard.helper.validationRequest")
  );
}

function getRequestDescription(item: ValidationRequestItem, t: TFn) {
  const operation = item.payload_snapshot?.operation || item.payload_snapshot?.source || t("dashboard.request.request");
  const note = item.adminregion_review_note || item.superadmin_review_note;
  return note ? `${operation}: ${note}` : `${operation} - ${item.request_id || t("dashboard.request.related")}`;
}

function statusLabel(value: string, t: TFn) {
  if (value === "ongoing_validated" || value === "pending_adminregion") return t("dashboard.helper.pendingAdminRegion");
  if (value === "pending_async" || value === "pending_superadmin") return t("dashboard.helper.pendingSuperadmin");
  if (value === "rejected_by_adminregion" || value === "rejected_adminregion") return t("dashboard.helper.rejectedAdminRegion");
  if (value === "rejected_by_superadmin" || value === "rejected_superadmin") return t("dashboard.helper.rejectedSuperadmin");
  return value.replaceAll("_", " ");
}

function formatAction(value: string | null | undefined, t: TFn) {
  if (!value) return t("dashboard.helper.auditActivity");
  return value.replaceAll("_", " ");
}

function normalizeRole(role: string): RoleKey {
  if (role === "admin") return "superadmin";
  if (role === "user_all_region") return "adminregion";
  return "validator";
}

function getRoleCopy(role: RoleKey, t: TFn) {
  if (role === "superadmin") {
    return {
      badge: t("dashboard.badge.superadmin"),
      title: t("dashboard.title.networkAsset"),
      description: t("dashboard.description.superadmin"),
      primaryAction: t("dashboard.primaryAction.superadmin"),
      primaryHref: "/data-management",
    };
  }
  if (role === "adminregion") {
    return {
      badge: t("dashboard.badge.adminregion"),
      title: t("dashboard.title.regionalAsset"),
      description: t("dashboard.description.adminregion"),
      primaryAction: t("dashboard.primaryAction.adminregion"),
      primaryHref: "/data-management/list/odp",
    };
  }
  return {
    badge: t("dashboard.badge.validator"),
    title: t("dashboard.title.fieldOdp"),
    description: t("dashboard.description.validator"),
    primaryAction: t("dashboard.primaryAction.validator"),
    primaryHref: "/data-management/list/odp",
  };
}
