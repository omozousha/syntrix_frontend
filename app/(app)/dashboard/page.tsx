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
  const role = normalizeRole(me.role);
  const [data, setData] = useState<DashboardData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [regionFilterId, setRegionFilterId] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const scopeRegionIds = useMemo(() => me.app_user.user_region_scopes?.map((scope) => scope.region_id).filter(Boolean) || [], [me.app_user.user_region_scopes]);
  const singleRegionScope = regionFilterId || (scopeRegionIds.length === 1 ? scopeRegionIds[0] : "");

  const doRefresh = useCallback(async () => {
    setRefreshing(true);
    setError("");
    try {
      const next = await loadDashboardData(token, role, singleRegionScope, scopeRegionIds);
      setData(next);
      setLastUpdated(new Date());
    } catch (err) {
      setError((err as Error).message || "Gagal refresh dashboard.");
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
          body: { note: "Fast approve from dashboard" },
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
          body: { note: "Fast reject from dashboard" },
        });
        const next = await loadDashboardData(token, role, singleRegionScope, scopeRegionIds);
        setData(next);
      } catch { /* silent */ }
      setActionLoadingId("");
    },
    loadingId: actionLoadingId,
  }), [role, token, singleRegionScope, actionLoadingId]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError("");
      try {
        const next = await loadDashboardData(token, role, singleRegionScope, scopeRegionIds);
        if (!cancelled) {
          setData(next);
          setLastUpdated(new Date());
        }
      } catch (err) {
        if (!cancelled) {
          setError((err as Error).message || "Gagal memuat dashboard.");
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
      <ScrollArea className="h-full min-h-0 w-full">
        <div className="pr-3">
          <AppLoading label="Sedang memuat dashboard operasional..." />
        </div>
      </ScrollArea>
    );
  }

  return (
    <ScrollArea className="h-full min-h-0 w-full">
      <div className="space-y-4 pr-3">
<DashboardHeader
          role={role}
          regionCount={scopeRegionIds.length}
          regions={data.regions.map((r) => ({ id: String(r.id), label: r.region_name || r.region_id || "Region" }))}
          regionFilter={regionFilterId}
          onRegionFilterChange={setRegionFilterId}
          onRefresh={doRefresh}
          refreshing={refreshing}
          loading={loading}
          lastUpdated={lastUpdated}
        />

        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Dashboard belum lengkap</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <DashboardTabs data={data} role={role} loading={loading} singleRegionScope={singleRegionScope} />
      </div>
    </ScrollArea>
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
  const showRegionTab = role === "superadmin";
  const showDeviceTab = role !== "validator";
  const tabColumns = role === "validator" ? "grid-cols-3" : showRegionTab ? "grid-cols-2 sm:grid-cols-5" : "grid-cols-2 sm:grid-cols-4";
  return (
    <Tabs defaultValue="overview" className="space-y-4">
      <TabsList className={`grid h-auto w-full gap-1 ${tabColumns}`}>
        <TabsTrigger value="overview" className="h-auto min-h-9 whitespace-normal px-2 py-2 text-center text-xs leading-tight sm:text-sm">
          Overview
        </TabsTrigger>
        {showRegionTab ? (
          <TabsTrigger value="region" className="h-auto min-h-9 whitespace-normal px-2 py-2 text-center text-xs leading-tight sm:text-sm">
            Region
          </TabsTrigger>
        ) : null}
        <TabsTrigger value="pop" className="h-auto min-h-9 whitespace-normal px-2 py-2 text-center text-xs leading-tight sm:text-sm">
          POP
        </TabsTrigger>
        {showDeviceTab ? (
          <TabsTrigger value="device" className="h-auto min-h-9 whitespace-normal px-2 py-2 text-center text-xs leading-tight sm:text-sm">
            Device
          </TabsTrigger>
        ) : null}
        <TabsTrigger value="workflow" className="h-auto min-h-9 whitespace-normal px-2 py-2 text-center text-xs leading-tight sm:text-sm">
          <span className="sm:hidden">KPI</span>
          <span className="hidden sm:inline">KPI & Workflow</span>
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
  const copy = getRoleCopy(role);
  const regionOptions = regions ? [{ value: "__all__", label: "Semua region" }, ...regions.map((r) => ({ value: r.id, label: r.label }))] : [];
  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-muted/20 p-3 md:flex-row md:items-center md:justify-between">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{copy.badge}</Badge>
          <Badge variant="outline">{regionCount ? `${regionCount} region scope` : "Global scope"}</Badge>
        </div>
        <h2 className="text-2xl font-semibold tracking-tight">{copy.title}</h2>
        <p className="max-w-3xl text-sm text-muted-foreground">{copy.description}</p>
      </div>
      <div className="flex items-center gap-2">
        <span className="hidden text-xs text-muted-foreground sm:inline">
          {lastUpdated ? `${formatTimeAgo(lastUpdated)}` : ""}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={refreshing}
          onClick={onRefresh}
          className="h-9 px-2 text-xs"
          aria-label="Refresh dashboard"
        >
          {refreshing ? "..." : "⟳"}
        </Button>
        {regions && onRegionFilterChange ? (
          <Select value={regionFilter || "__all__"} onValueChange={(v) => onRegionFilterChange(v === "__all__" ? "" : v)} disabled={refreshing || loading}>
            <SelectTrigger className="h-9 w-[180px] text-sm">
              <SelectValue placeholder="Semua region" />
            </SelectTrigger>
            <SelectContent>
              {regionOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
        <Button asChild size="sm" className="w-full md:w-auto">
          <Link href={copy.primaryHref}>{copy.primaryAction}</Link>
        </Button>
      </div>
    </div>
  );
}

function AssetOverviewDashboard({ data, loading }: { data: DashboardData; loading: boolean }) {
  const s = data.summary;
  const odpStats = getOdpStatsFromSummary(s);
  const portStats = getPortStatsFromSummary(s);
  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <DashboardMetricCard label="Regions" value={s?.regions?.total ?? data.regions.length} caption="Region aktif sesuai scope user." badge="Scope" icon={MapPinned} loading={loading} />
        <DashboardMetricCard label="POPs" value={s?.pops?.total ?? 0} caption="POP yang menjadi titik agregasi jaringan." badge="POP" tone="blue" icon={Database} loading={loading} />
        <DashboardMetricCard label="Devices" value={s?.devices?.total ?? 0} caption="Total perangkat dalam scope dashboard." badge="Inventory" tone="green" icon={RadioTower} loading={loading} />
        <DashboardMetricCard label="ODP" value={odpStats.total} caption={`${odpStats.validated} validated, ${odpStats.unvalidated} belum valid.`} badge="Field" tone="amber" icon={ClipboardCheck} loading={loading} />
        <DashboardMetricCard label="Ports" value={portStats.total} caption={`${portStats.problem} port perlu perhatian.`} badge="Capacity" tone={portStats.problem ? "amber" : "green"} icon={Activity} loading={loading} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <DashboardDonutChartCard
          title="Device Type Composition"
          description="Komposisi perangkat aktif pada scope dashboard."
          data={toChartFromSummary(s?.devices?.byType)}
          emptyLabel="Belum ada data device untuk chart komposisi."
          loading={loading}
        />
        <DashboardBarChartCard
          title="POP Distribution"
          description="Sebaran device per POP teratas."
          data={toChartFromSummary(s?.pops?.topByDevice)}
          emptyLabel="Belum ada relasi device ke POP untuk ditampilkan."
          loading={loading}
        />
        <DashboardDonutChartCard
          title="ODP Validation"
          description="Distribusi status validasi ODP pada scope dashboard."
          data={odpValidationFromSummary(s, data)}
          emptyLabel="Belum ada data ODP untuk validasi."
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <DashboardTrendLine
          title="Audit Activity Trend"
          description="Tren aktivitas audit mingguan (7 hari terakhir)."
          data={weeklyAuditTrend(data.auditLogs)}
          loading={loading}
        />
        <DashboardMiniMap
          title="POP Location Map"
          description="Lokasi POP pada scope dashboard."
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
  const odpStats = getOdpStatsFromSummary(data.summary);
  const regionSuffix = singleRegionScope ? `&region_id=${encodeURIComponent(singleRegionScope)}` : "";
  const rejected = requestItems(data.rejectedAdminregion, "rejected_adminregion");
  const pendingOdp = data.odpDevices
    .filter((item) => !isValidated(item))
    .slice(0, 6)
    .map((item) => ({
      id: `pending:${item.id}`,
      title: item.device_name || item.device_id || "ODP",
      description: `${item.device_id || "Inventory belum tersedia"} belum memiliki validasi final.`,
      href: `/data-management/list/odp/${item.id}`,
      badge: item.validation_status || "unvalidated",
      tone: "amber" as const,
    }));

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardMetricCard label="Region Scope" value={data.summary?.regions?.total ?? (data.regions.length || 1)} caption={formatRegionScope(data.regions)} badge="Scope" tone="blue" icon={MapPinned} loading={loading} />
        <DashboardMetricCard label="POP Coverage" value={data.summary?.pops?.total ?? data.pops.length} caption="POP yang menjadi konteks area validasi." badge="POP" icon={Database} loading={loading} />
        <DashboardMetricCard label="ODP Queue" value={odpStats.unvalidated} caption="ODP yang belum valid final." badge="Validate" tone="amber" icon={RadioTower} loading={loading} />
        <DashboardMetricCard label="Rejected" value={data.rejectedAdminregion.length} caption="Validasi yang perlu diperbaiki dari catatan reviewer." badge="Fix" tone={data.rejectedAdminregion.length ? "red" : "green"} icon={AlertTriangle} loading={loading} />
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="p-3 pb-2">
          <CardTitle className="text-base">Field Focus</CardTitle>
          <CardDescription>Mulai dari POP dan ODP dalam scope region, lalu buka form validasi dari queue.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 p-3 pt-0">
          <Button asChild>
            <Link href={`/data-management/list/odp${singleRegionScope ? `?region_id=${encodeURIComponent(singleRegionScope)}` : ""}`}>Open ODP Queue</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/data-management/odp-quality?issue=odp-pending-validation${regionSuffix}`}>ODP Belum Valid</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/data-management/odp-quality?issue=odp-rejected-adminregion${regionSuffix}`}>Rejected</Link>
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <DashboardDonutChartCard
          title="ODP Validation"
          description="Status validasi ODP pada scope validator."
          data={odpValidationFromSummary(data.summary, data)}
          emptyLabel="Belum ada ODP dalam scope validator."
          loading={loading}
        />
        <DashboardBarChartCard
          title="POP by ODP"
          description="POP dengan ODP terbanyak dalam area kerja validator."
          data={toChartFromSummary(data.summary?.pops?.topByOdp)}
          emptyLabel="Belum ada ODP yang terhubung ke POP."
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <DashboardWorkQueue
          title="Prioritas Validasi"
          description="Rejected dan ODP belum valid yang paling cepat ditindaklanjuti."
          items={[...rejected, ...pendingOdp]}
          emptyLabel="Tidak ada prioritas validasi aktif dari data yang tersedia."
          icon={ClipboardCheck}
          loading={loading}
        />
        <DashboardWorkQueue
          title="POP Coverage Attention"
          description="POP tanpa relasi device pada scope data dashboard."
          items={popWithoutDeviceFromSummary(data.summary)}
          emptyLabel="Semua POP dalam scope memiliki relasi device."
          icon={Database}
          loading={loading}
        />
      </div>
    </>
  );
}

function RegionDashboardTab({ data, loading }: { data: DashboardData; loading: boolean }) {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <DashboardBarChartCard
        title="Device Per Region"
        description="Distribusi perangkat berdasarkan region."
        data={toChartFromSummary(data.summary?.devices?.byRegion)}
        emptyLabel="Belum ada data region/device untuk ditampilkan."
        loading={loading}
      />
      <DashboardBarChartCard
        title="POP Per Region"
        description="Distribusi POP berdasarkan region."
        data={toChartFromSummary(data.summary?.pops?.byRegion)}
        emptyLabel="Belum ada data POP per region."
        loading={loading}
      />
      <RegionHealthCard data={data} loading={loading} />
      <DashboardBarChartCard
        title="ODP Per Region"
        description="Sebaran ODP untuk membaca coverage field node."
        data={toChartFromSummary(data.summary?.odp?.byRegion)}
        emptyLabel="Belum ada data ODP per region."
        loading={loading}
      />
    </div>
  );
}

function PopDashboardTab({ data, loading }: { data: DashboardData; loading: boolean }) {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <DashboardDonutChartCard
        title="POP Status"
        description="Komposisi status POP pada scope dashboard."
        data={toChartFromSummary(data.summary?.pops?.byStatus)}
        emptyLabel="Belum ada status POP untuk ditampilkan."
        loading={loading}
      />
      <DashboardBarChartCard
        title="Top POP by Device"
        description="POP dengan jumlah device terbanyak."
        data={toChartFromSummary(data.summary?.pops?.topByDevice)}
        emptyLabel="Belum ada device yang terhubung ke POP."
        loading={loading}
      />
      <DashboardBarChartCard
        title="Top POP by ODP"
        description="POP dengan jumlah ODP terbanyak."
        data={toChartFromSummary(data.summary?.pops?.topByOdp)}
        emptyLabel="Belum ada ODP yang terhubung ke POP."
        loading={loading}
      />
      <DashboardWorkQueue
        title="POP Coverage Attention"
        description="POP yang belum memiliki device pada data scope saat ini."
        items={popWithoutDeviceFromSummary(data.summary)}
        emptyLabel="Semua POP dalam scope memiliki relasi device."
        icon={Database}
        loading={loading}
      />
    </div>
  );
}

function DeviceDashboardTab({ data, loading }: { data: DashboardData; loading: boolean }) {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <DashboardDonutChartCard
        title="Device Type"
        description="Komposisi jenis perangkat inventory."
        data={toChartFromSummary(data.summary?.devices?.byType)}
        emptyLabel="Belum ada data device."
        loading={loading}
      />
      <DashboardBarChartCard
        title="Device Status"
        description="Status perangkat yang tercatat pada inventory."
        data={toChartFromSummary(data.summary?.devices?.byStatus)}
        emptyLabel="Belum ada status device."
        loading={loading}
      />
      <DashboardDonutChartCard
        title="ODP Validation"
        description="Validasi ODP berdasarkan status workflow terbaru."
        data={odpValidationFromSummary(data.summary, data)}
        emptyLabel="Belum ada ODP dalam scope."
        loading={loading}
      />
      <DashboardBarChartCard
        title="Port Utilization"
        description="Distribusi status port pada scope dashboard."
        data={toChartFromSummary(data.summary?.ports?.byStatus)}
        emptyLabel="Belum ada data port."
        loading={loading}
      />
    </div>
  );
}

function SuperadminDashboard({ data, loading }: { data: DashboardData; loading: boolean }) {
  const odpStats = getOdpStatsFromSummary(data.summary);
  const portStats = getPortStatsFromSummary(data.summary);
  const riskItems = buildRiskItems(data);
  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <DashboardMetricCard label="Final Approval" value={data.superadminRequests.length} caption="Request menunggu keputusan superadmin." badge="Queue" tone="blue" icon={ShieldCheck} loading={loading} />
        <DashboardMetricCard label="Rejected" value={data.rejectedAdminregion.length + data.rejectedSuperadmin.length} caption="Request yang perlu tindak lanjut role terkait." badge="Risk" tone="red" icon={AlertTriangle} loading={loading} />
        <DashboardMetricCard label="ODP Validated" value={odpStats.validated} caption={`${odpStats.unvalidated} ODP belum valid final.`} badge="ODP" tone="green" icon={CheckCircle2} loading={loading} />
        <DashboardMetricCard label="Port Issue" value={portStats.problem} caption="Port down, maintenance, atau assignment tidak konsisten." badge="Quality" tone={portStats.problem ? "amber" : "green"} icon={RadioTower} loading={loading} />
        <DashboardMetricCard label="Audit Events" value={data.auditLogs.length} caption="Aktivitas terbaru yang tersedia untuk governance." badge="Recent" icon={Activity} loading={loading} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <DashboardWorkQueue
          title="Approval Command Queue"
          description="Prioritas request yang membutuhkan keputusan final atau tindak lanjut."
          items={[
            ...requestItems(data.superadminRequests, "pending_superadmin"),
            ...requestItems(data.rejectedSuperadmin, "rejected_superadmin"),
          ]}
          emptyLabel="Tidak ada request final yang perlu diproses."
          icon={ClipboardCheck}
          loading={loading}
        />
        <DashboardWorkQueue
          title="Operational Risk"
          description="Issue ODP yang paling baik dicek sebelum menjadi backlog."
          items={riskItems}
          emptyLabel="Tidak ada risiko operasional utama dari data yang tersedia."
          icon={AlertTriangle}
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <RegionHealthCard data={data} loading={loading} />
        <DashboardActivityFeed
          title="Recent Governance Activity"
          description="Aktivitas audit terbaru untuk approval dan perubahan asset."
          items={auditItems(data.auditLogs)}
          emptyLabel="Belum ada aktivitas audit terbaru."
          loading={loading}
        />
      </div>
    </>
  );
}

function AdminregionDashboard({ data, loading, singleRegionScope }: { data: DashboardData; loading: boolean; singleRegionScope: string }) {
  const odpStats = getOdpStatsFromSummary(data.summary);
  const portStats = getPortStatsFromSummary(data.summary);
  const regionSuffix = singleRegionScope ? `&region_id=${encodeURIComponent(singleRegionScope)}` : "";
  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <DashboardMetricCard label="Need Review" value={data.adminregionRequests.length} caption="Submission validator menunggu review region." badge="Today" tone="blue" icon={ClipboardCheck} loading={loading} />
        <DashboardMetricCard label="Rejected Superadmin" value={data.rejectedSuperadmin.length} caption="Perlu review ulang sebelum resubmit final." badge="Follow up" tone="red" icon={AlertTriangle} loading={loading} />
        <DashboardMetricCard label="Validated ODP" value={odpStats.validated} caption={`${odpStats.unvalidated} ODP masih perlu validasi.`} badge="Progress" tone="green" icon={CheckCircle2} loading={loading} />
        <DashboardMetricCard label="Evidence Issue" value={data.evidenceMissing.length} caption="Request aktif dengan evidence kurang." badge="Quality" tone={data.evidenceMissing.length ? "amber" : "green"} icon={Database} loading={loading} />
        <DashboardMetricCard label="Port Issue" value={portStats.problem} caption="Port down/maintenance atau mismatch assignment." badge="Ops" tone={portStats.problem ? "amber" : "green"} icon={RadioTower} loading={loading} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <DashboardWorkQueue
          title="My Region Review Queue"
          description="Request yang sedang menunggu keputusan admin region."
          items={[
            ...requestItems(data.adminregionRequests, "pending_adminregion"),
            ...requestItems(data.rejectedSuperadmin, "rejected_superadmin"),
          ]}
          emptyLabel="Tidak ada request regional yang perlu diproses."
          icon={ClipboardCheck}
          loading={loading}
        />
        <DashboardWorkQueue
          title="Field Quality Queue"
          description="Issue lapangan yang perlu ditindaklanjuti oleh tim regional."
          items={[
            qualityItem("ODP belum tervalidasi", odpStats.unvalidated, `/data-management/odp-quality?issue=odp-pending-validation${regionSuffix}`, "medium"),
            qualityItem("Evidence kurang", data.evidenceMissing.length, `/data-management/odp-quality?issue=odp-evidence-missing${regionSuffix}`, "high"),
            qualityItem("Port down/maintenance", portStats.downMaintenance, `/data-management/odp-quality?issue=odp-down-maintenance${regionSuffix}`, "medium"),
          ].filter(Boolean) as DashboardQueueItem[]}
          emptyLabel="Tidak ada issue field utama dari data yang tersedia."
          icon={AlertTriangle}
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ValidationProgressCard odpStats={odpStats} loading={loading} />
        <DashboardActivityFeed
          title="Validator Activity"
          description="Submission dan resubmission terbaru yang perlu dipantau."
          items={requestActivityItems([...data.adminregionRequests, ...data.rejectedAdminregion])}
          emptyLabel="Belum ada aktivitas validator yang aktif."
          loading={loading}
        />
      </div>
    </>
  );
}

function ValidatorDashboard({ data, loading, singleRegionScope }: { data: DashboardData; loading: boolean; singleRegionScope: string }) {
  const odpStats = getOdpStatsFromSummary(data.summary);
  const regionSuffix = singleRegionScope ? `&region_id=${encodeURIComponent(singleRegionScope)}` : "";
  const rejected = requestItems(data.rejectedAdminregion, "rejected_adminregion");
  const openOdpItems = data.odpDevices
    .filter((item) => !isValidated(item))
    .slice(0, 6)
    .map((item) => ({
      id: item.id,
      title: item.device_name || item.device_id || "ODP",
      description: `${item.device_id || "Inventory belum tersedia"} belum memiliki validasi final.`,
      href: `/data-management/list/odp/${item.id}`,
      badge: item.validation_status || "unvalidated",
      tone: "amber" as const,
    }));

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardMetricCard label="Tugas Validasi" value={odpStats.unvalidated} caption="ODP dalam scope region yang belum valid final." badge="Queue" tone="blue" icon={RadioTower} loading={loading} />
        <DashboardMetricCard label="Rejected" value={data.rejectedAdminregion.length} caption="Perlu perbaikan berdasarkan catatan admin region." badge="Fix" tone="red" icon={AlertTriangle} loading={loading} />
        <DashboardMetricCard label="Submitted" value={data.adminregionRequests.length} caption="Menunggu review admin region." badge="Review" tone="amber" icon={Timer} loading={loading} />
        <DashboardMetricCard label="Validated" value={odpStats.validated} caption="ODP sudah lulus approval final." badge="Done" tone="green" icon={CheckCircle2} loading={loading} />
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="p-3 pb-2">
          <CardTitle className="text-base">Mobile Field Command</CardTitle>
          <CardDescription>Mulai dari queue yang butuh aksi lapangan, lalu lanjut ke section validasi.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 p-3 pt-0">
          <Button asChild>
            <Link href={`/data-management/list/odp${singleRegionScope ? `?region_id=${encodeURIComponent(singleRegionScope)}` : ""}`}>Open ODP Queue</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/data-management/odp-quality?issue=odp-pending-validation${regionSuffix}`}>ODP Belum Valid</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/data-management/odp-quality?issue=odp-rejected-adminregion${regionSuffix}`}>Rejected Validation</Link>
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <DashboardWorkQueue
          title="Tugas Hari Ini"
          description="ODP yang paling siap dibuka untuk validasi lapangan."
          items={[...rejected, ...openOdpItems]}
          emptyLabel="Tidak ada tugas validasi aktif dari data yang tersedia."
          icon={MapPinned}
          loading={loading}
        />
        <DashboardWorkQueue
          title="Status Submit"
          description="Request validasi yang sedang berada di review chain."
          items={requestItems(data.adminregionRequests, "pending_adminregion")}
          emptyLabel="Belum ada submission aktif menunggu review."
          icon={ClipboardCheck}
          loading={loading}
        />
      </div>
    </>
  );
}

function RegionHealthCard({ data, loading }: { data: DashboardData; loading: boolean }) {
  const odpStats = getOdpStatsFromSummary(data.summary);
  const portStats = getPortStatsFromSummary(data.summary);
  const rows = [
    { label: "ODP total", value: odpStats.total },
    { label: "Validated", value: odpStats.validated },
    { label: "Unvalidated", value: odpStats.unvalidated },
    { label: "Port issue", value: portStats.problem },
  ];
  return (
    <Card>
      <CardHeader className="p-3 pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="size-4" />
          Region Health
        </CardTitle>
        <CardDescription>Ringkasan health ODP dari scope dashboard.</CardDescription>
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
  const percent = odpStats.total ? Math.round((odpStats.validated / odpStats.total) * 100) : 0;
  return (
    <Card>
      <CardHeader className="p-3 pb-2">
        <CardTitle className="text-base">ODP Validation Progress</CardTitle>
        <CardDescription>Progress validasi final pada scope region aktif.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 p-3 pt-0">
        {loading ? <Skeleton className="h-16 w-full" /> : (
          <>
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-3xl font-semibold">{percent}%</p>
                <p className="text-xs text-muted-foreground">{odpStats.validated} dari {odpStats.total} ODP validated</p>
              </div>
              <Badge variant={percent >= 80 ? "secondary" : "outline"}>{percent >= 80 ? "healthy" : "needs work"}</Badge>
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

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds}d yang lalu`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m yang lalu`;
  return `${Math.floor(minutes / 60)}j yang lalu`;
}

function formatRegionScope(regions: RegionItem[]) {
  if (!regions.length) return "Region mengikuti scope akun validator.";
  if (regions.length === 1) return getRegionLabel({ relation: regions[0], fallback: "1 region aktif" });
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

function toChartFromSummary(rows?: Array<{ label?: string; value?: number; href?: string }> | null): DashboardChartDatum[] {
  const items = (rows || [])
    .filter((x) => x?.value && x?.value > 0)
    .map((x) => ({ label: x.label || "Lainnya", value: Number(x.value) || 0, href: x.href }));

  if (items.length <= CHART_MAX_ITEMS) return items;

  const top = items.slice(0, CHART_MAX_ITEMS - 1);
  const rest = items.slice(CHART_MAX_ITEMS - 1);
  const restValue = rest.reduce((sum, item) => sum + item.value, 0);
  return [
    ...top,
    { label: "Lainnya", value: restValue, color: "var(--chart-3)", href: "/data-management/list/devices" },
  ];
}

function odpValidationFromSummary(s?: DashboardSummaryResponse["data"] | null, data?: DashboardData): DashboardChartDatum[] {
  const odp = s?.odp;
  const items: DashboardChartDatum[] = [];
  if (!odp) return items;
  if (odp.validated) items.push({ label: "Validated", value: odp.validated, color: "#16a34a", href: "/data-management/list/odp?status=validated" });
  if (odp.unvalidated) items.push({ label: "Unvalidated", value: odp.unvalidated, color: "#f59e0b", href: "/data-management/list/odp?status=unvalidated" });
  if (data?.adminregionRequests?.length) items.push({ label: "Pending Admin Region", value: data.adminregionRequests.length, color: "#2563eb", href: "/requests" });
  if (data?.superadminRequests?.length) items.push({ label: "Pending Superadmin", value: data.superadminRequests.length, color: "#7c3aed", href: "/requests" });
  const rejected = (data?.rejectedAdminregion?.length || 0) + (data?.rejectedSuperadmin?.length || 0);
  if (rejected) items.push({ label: "Rejected", value: rejected, color: "#dc2626", href: "/requests" });
  return items;
}

function popWithoutDeviceFromSummary(s?: DashboardSummaryResponse["data"] | null): DashboardQueueItem[] {
  return (s?.pops?.withoutDevice || []).slice(0, 6).map((pop) => ({
    id: `pop-wd:${pop.pop_id}`,
    title: pop.pop_name || pop.pop_code || "POP",
    description: `${pop.pop_code || "POP"} belum memiliki device pada scope data dashboard.`,
    href: "/data-management",
    badge: "No Device",
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
  onFastAction?: {
    approve: (id: string) => Promise<void>;
    reject: (id: string) => Promise<void>;
    loadingId: string;
  },
): DashboardQueueItem[] {
  const canAct = kind === "pending_adminregion" || kind === "pending_superadmin";
  return items.slice(0, 8).map((item) => ({
    id: `${kind}:${item.id}`,
    title: getRequestTitle(item),
    description: getRequestDescription(item),
    href: kind === "pending_adminregion" || kind === "pending_superadmin" || kind === "rejected_superadmin" ? "/requests" : `/data-management/list/odp/${item.entity_id || ""}`,
    badge: statusLabel(item.current_status || kind),
    tone: kind.includes("rejected") ? "red" : "blue",
    onApprove: canAct && onFastAction ? () => onFastAction.approve(item.id) : undefined,
    onReject: canAct && onFastAction ? () => onFastAction.reject(item.id) : undefined,
    actionLoading: onFastAction?.loadingId === item.id,
  }));
}

function requestActivityItems(items: ValidationRequestItem[]): DashboardActivityItem[] {
  return items.slice(0, 6).map((item) => ({
    id: item.id,
    title: getRequestTitle(item),
    description: getRequestDescription(item),
    timestamp: item.updated_at,
    href: "/requests",
  }));
}

function auditItems(items: AuditLogItem[]): DashboardActivityItem[] {
  return items.map((item) => ({
    id: item.id,
    title: formatAction(item.action_name),
    description: `${item.entity_type || "Entity"} ${item.entity_id || ""}`.trim(),
    timestamp: item.created_at,
    href: item.entity_type && item.entity_id ? `/audit-trail?entity_type=${encodeURIComponent(item.entity_type)}&entity_id=${encodeURIComponent(item.entity_id)}` : "/audit-trail",
  }));
}

function buildRiskItems(data: DashboardData) {
  const odpStats = getOdpStatsFromSummary(data.summary);
  const portStats = getPortStatsFromSummary(data.summary);
  return [
    qualityItem("ODP belum tervalidasi", odpStats.unvalidated, "/data-management/odp-quality?issue=odp-pending-validation", "medium"),
    qualityItem("Evidence kurang", data.evidenceMissing.length, "/data-management/odp-quality?issue=odp-evidence-missing", "high"),
    qualityItem("Port issue", portStats.problem, "/data-management/odp-quality?issue=odp-down-maintenance", "high"),
    qualityItem("Rejected workflow", data.rejectedAdminregion.length + data.rejectedSuperadmin.length, "/requests", "high"),
  ].filter(Boolean) as DashboardQueueItem[];
}

function qualityItem(title: string, value: number, href: string, severity: "high" | "medium"): DashboardQueueItem | null {
  if (!value) return null;
  return {
    id: `${title}:${href}`,
    title,
    description: `${value} item perlu ditindaklanjuti.`,
    href,
    badge: severity,
    tone: severity === "high" ? "red" : "amber",
  };
}

function getRequestTitle(item: ValidationRequestItem) {
  return (
    item.payload_snapshot?.field_validation?.new_device_name ||
    item.payload_snapshot?.field_validation?.old_device_name ||
    item.payload_snapshot?.device?.device_name ||
    item.payload_snapshot?.resource_name ||
    item.request_id ||
    "Validation Request"
  );
}

function getRequestDescription(item: ValidationRequestItem) {
  const operation = item.payload_snapshot?.operation || item.payload_snapshot?.source || "request";
  const note = item.adminregion_review_note || item.superadmin_review_note;
  return note ? `${operation}: ${note}` : `${operation} - ${item.request_id || "request terkait"}`;
}

function statusLabel(value: string) {
  if (value === "ongoing_validated" || value === "pending_adminregion") return "Pending Admin Region";
  if (value === "pending_async" || value === "pending_superadmin") return "Pending Superadmin";
  if (value === "rejected_by_adminregion" || value === "rejected_adminregion") return "Rejected Admin Region";
  if (value === "rejected_by_superadmin" || value === "rejected_superadmin") return "Rejected Superadmin";
  return value.replaceAll("_", " ");
}

function formatAction(value?: string | null) {
  if (!value) return "Audit activity";
  return value.replaceAll("_", " ");
}

function normalizeRole(role: string): RoleKey {
  if (role === "admin") return "superadmin";
  if (role === "user_all_region") return "adminregion";
  return "validator";
}

function getRoleCopy(role: RoleKey) {
  if (role === "superadmin") {
    return {
      badge: "Superadmin Inventory Console",
      title: "Network Asset Dashboard",
      description: "Ringkasan Region, POP, Device, dan KPI operasional untuk menjaga inventory tetap terkendali.",
      primaryAction: "Open Asset Overview",
      primaryHref: "/data-management",
    };
  }
  if (role === "adminregion") {
    return {
      badge: "Admin Region Inventory",
      title: "Regional Asset Dashboard",
      description: "Konteks region, POP, device, dan health ODP sebelum masuk ke queue review validator.",
      primaryAction: "Open ODP List",
      primaryHref: "/data-management/list/odp",
    };
  }
  return {
    badge: "Validator Field Inventory",
    title: "ODP Field Dashboard",
    description: "Konteks region, POP, dan ODP dalam scope validator sebelum memulai validasi lapangan.",
    primaryAction: "Open ODP Queue",
    primaryHref: "/data-management/list/odp",
  };
}
