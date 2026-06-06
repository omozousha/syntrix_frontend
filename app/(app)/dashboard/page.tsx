"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, CheckCircle2, ClipboardCheck, Database, MapPinned, RadioTower, ShieldCheck, Timer, Users } from "lucide-react";
import { DashboardActivityFeed, type DashboardActivityItem } from "@/components/dashboard/dashboard-activity-feed";
import { DashboardBarChartCard, DashboardDonutChartCard, type DashboardChartDatum } from "@/components/dashboard/dashboard-chart-card";
import { DashboardMetricCard } from "@/components/dashboard/dashboard-metric-card";
import { DashboardWorkQueue, type DashboardQueueItem } from "@/components/dashboard/dashboard-work-queue";
import { AppLoading } from "@/components/app-loading-new";
import { useSession } from "@/components/session-context";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
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

  const scopeRegionIds = useMemo(() => me.app_user.user_region_scopes?.map((scope) => scope.region_id).filter(Boolean) || [], [me.app_user.user_region_scopes]);
  const singleRegionScope = scopeRegionIds.length === 1 ? scopeRegionIds[0] : "";

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError("");
      try {
        const next = await loadDashboardData(token, role, singleRegionScope);
        if (!cancelled) setData(next);
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
  }, [role, singleRegionScope, token]);

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
        <DashboardHeader role={role} regionCount={scopeRegionIds.length} />

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

function DashboardHeader({ role, regionCount }: { role: RoleKey; regionCount: number }) {
  const copy = getRoleCopy(role);
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
      <Button asChild size="sm" className="w-full md:w-auto">
        <Link href={copy.primaryHref}>{copy.primaryAction}</Link>
      </Button>
    </div>
  );
}

function AssetOverviewDashboard({ data, loading }: { data: DashboardData; loading: boolean }) {
  const odpStats = getOdpStats(data.odpDevices);
  const portStats = getPortStats(data.ports);
  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <DashboardMetricCard label="Regions" value={data.regions.length} caption="Region aktif sesuai scope user." badge="Scope" icon={MapPinned} loading={loading} />
        <DashboardMetricCard label="POPs" value={data.pops.length} caption="POP yang menjadi titik agregasi jaringan." badge="POP" tone="blue" icon={Database} loading={loading} />
        <DashboardMetricCard label="Devices" value={data.devices.length} caption="Total perangkat dalam scope dashboard." badge="Inventory" tone="green" icon={RadioTower} loading={loading} />
        <DashboardMetricCard label="ODP" value={data.odpDevices.length} caption={`${odpStats.validated} validated, ${odpStats.unvalidated} belum valid.`} badge="Field" tone="amber" icon={ClipboardCheck} loading={loading} />
        <DashboardMetricCard label="Ports" value={data.ports.length} caption={`${portStats.problem} port perlu perhatian.`} badge="Capacity" tone={portStats.problem ? "amber" : "green"} icon={Activity} loading={loading} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <DashboardDonutChartCard
          title="Device Type Composition"
          description="Komposisi perangkat aktif pada scope dashboard."
          data={deviceTypeChart(data.devices)}
          emptyLabel="Belum ada data device untuk chart komposisi."
          loading={loading}
        />
        <DashboardBarChartCard
          title="POP Distribution"
          description="Sebaran device per POP teratas."
          data={popDeviceDistributionChart(data.pops, data.devices)}
          emptyLabel="Belum ada relasi device ke POP untuk ditampilkan."
          loading={loading}
        />
        <DashboardDonutChartCard
          title="ODP Validation"
          description="Distribusi status validasi ODP pada scope dashboard."
          data={odpValidationChart(data.odpDevices, data)}
          emptyLabel="Belum ada data ODP untuk validasi."
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
  const odpStats = getOdpStats(data.odpDevices);
  const regionSuffix = singleRegionScope ? `&region_id=${encodeURIComponent(singleRegionScope)}` : "";
  const rejected = requestItems(data.rejectedAdminregion, "rejected_adminregion");
  const pendingOdp = data.odpDevices
    .filter((item) => !isValidated(item))
    .slice(0, 6)
    .map((item) => ({
      id: `pending:${item.id}`,
      title: item.device_name || item.device_id || "ODP",
      description: `${item.device_id || item.id} belum memiliki validasi final.`,
      href: `/data-management/list/odp/${item.id}`,
      badge: item.validation_status || "unvalidated",
      tone: "amber" as const,
    }));

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardMetricCard label="Region Scope" value={data.regions.length || 1} caption={formatRegionScope(data.regions)} badge="Scope" tone="blue" icon={MapPinned} loading={loading} />
        <DashboardMetricCard label="POP Coverage" value={data.pops.length} caption="POP yang menjadi konteks area validasi." badge="POP" icon={Database} loading={loading} />
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

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <DashboardDonutChartCard
          title="ODP Validation"
          description="Status validasi ODP pada scope validator."
          data={odpValidationChart(data.odpDevices, data)}
          emptyLabel="Belum ada ODP dalam scope validator."
          loading={loading}
        />
        <DashboardBarChartCard
          title="POP by ODP"
          description="POP dengan ODP terbanyak dalam area kerja validator."
          data={popDeviceDistributionChart(data.pops, data.odpDevices)}
          emptyLabel="Belum ada ODP yang terhubung ke POP."
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
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
          items={popWithoutDeviceItems(data.pops, data.devices)}
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
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1fr]">
      <DashboardBarChartCard
        title="Device Per Region"
        description="Distribusi perangkat berdasarkan region."
        data={regionDistributionChart(data.regions, data.devices)}
        emptyLabel="Belum ada data region/device untuk ditampilkan."
        loading={loading}
      />
      <DashboardBarChartCard
        title="POP Per Region"
        description="Distribusi POP berdasarkan region."
        data={regionPopDistributionChart(data.regions, data.pops)}
        emptyLabel="Belum ada data POP per region."
        loading={loading}
      />
      <RegionHealthCard data={data} loading={loading} />
      <DashboardBarChartCard
        title="ODP Per Region"
        description="Sebaran ODP untuk membaca coverage field node."
        data={regionDistributionChart(data.regions, data.odpDevices)}
        emptyLabel="Belum ada data ODP per region."
        loading={loading}
      />
    </div>
  );
}

function PopDashboardTab({ data, loading }: { data: DashboardData; loading: boolean }) {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1fr]">
      <DashboardDonutChartCard
        title="POP Status"
        description="Komposisi status POP pada scope dashboard."
        data={popStatusChart(data.pops)}
        emptyLabel="Belum ada status POP untuk ditampilkan."
        loading={loading}
      />
      <DashboardBarChartCard
        title="Top POP by Device"
        description="POP dengan jumlah device terbanyak."
        data={popDeviceDistributionChart(data.pops, data.devices)}
        emptyLabel="Belum ada device yang terhubung ke POP."
        loading={loading}
      />
      <DashboardBarChartCard
        title="Top POP by ODP"
        description="POP dengan jumlah ODP terbanyak."
        data={popDeviceDistributionChart(data.pops, data.odpDevices)}
        emptyLabel="Belum ada ODP yang terhubung ke POP."
        loading={loading}
      />
      <DashboardWorkQueue
        title="POP Coverage Attention"
        description="POP yang belum memiliki device pada data scope saat ini."
        items={popWithoutDeviceItems(data.pops, data.devices)}
        emptyLabel="Semua POP dalam scope memiliki relasi device."
        icon={Database}
        loading={loading}
      />
    </div>
  );
}

function DeviceDashboardTab({ data, loading }: { data: DashboardData; loading: boolean }) {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1fr]">
      <DashboardDonutChartCard
        title="Device Type"
        description="Komposisi jenis perangkat inventory."
        data={deviceTypeChart(data.devices)}
        emptyLabel="Belum ada data device."
        loading={loading}
      />
      <DashboardBarChartCard
        title="Device Status"
        description="Status perangkat yang tercatat pada inventory."
        data={deviceStatusChart(data.devices)}
        emptyLabel="Belum ada status device."
        loading={loading}
      />
      <DashboardDonutChartCard
        title="ODP Validation"
        description="Validasi ODP berdasarkan status workflow terbaru."
        data={odpValidationChart(data.odpDevices, data)}
        emptyLabel="Belum ada ODP dalam scope."
        loading={loading}
      />
      <DashboardBarChartCard
        title="Port Utilization"
        description="Distribusi status port pada scope dashboard."
        data={portUtilizationChart(data.ports)}
        emptyLabel="Belum ada data port."
        loading={loading}
      />
    </div>
  );
}

function SuperadminDashboard({ data, loading }: { data: DashboardData; loading: boolean }) {
  const odpStats = getOdpStats(data.odpDevices);
  const portStats = getPortStats(data.ports);
  const riskItems = buildRiskItems(data);
  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <DashboardMetricCard label="Final Approval" value={data.superadminRequests.length} caption="Request menunggu keputusan superadmin." badge="Queue" tone="blue" icon={ShieldCheck} loading={loading} />
        <DashboardMetricCard label="Rejected" value={data.rejectedAdminregion.length + data.rejectedSuperadmin.length} caption="Request yang perlu tindak lanjut role terkait." badge="Risk" tone="red" icon={AlertTriangle} loading={loading} />
        <DashboardMetricCard label="ODP Validated" value={odpStats.validated} caption={`${odpStats.unvalidated} ODP belum valid final.`} badge="ODP" tone="green" icon={CheckCircle2} loading={loading} />
        <DashboardMetricCard label="Port Issue" value={portStats.problem} caption="Port down, maintenance, atau assignment tidak konsisten." badge="Quality" tone={portStats.problem ? "amber" : "green"} icon={RadioTower} loading={loading} />
        <DashboardMetricCard label="Audit Events" value={data.auditLogs.length} caption="Aktivitas terbaru yang tersedia untuk governance." badge="Recent" icon={Activity} loading={loading} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.15fr_0.85fr]">
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

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[0.9fr_1.1fr]">
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
  const odpStats = getOdpStats(data.odpDevices);
  const portStats = getPortStats(data.ports);
  const regionSuffix = singleRegionScope ? `&region_id=${encodeURIComponent(singleRegionScope)}` : "";
  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <DashboardMetricCard label="Need Review" value={data.adminregionRequests.length} caption="Submission validator menunggu review region." badge="Today" tone="blue" icon={ClipboardCheck} loading={loading} />
        <DashboardMetricCard label="Rejected Superadmin" value={data.rejectedSuperadmin.length} caption="Perlu review ulang sebelum resubmit final." badge="Follow up" tone="red" icon={AlertTriangle} loading={loading} />
        <DashboardMetricCard label="Validated ODP" value={odpStats.validated} caption={`${odpStats.unvalidated} ODP masih perlu validasi.`} badge="Progress" tone="green" icon={CheckCircle2} loading={loading} />
        <DashboardMetricCard label="Evidence Issue" value={data.evidenceMissing.length} caption="Request aktif dengan evidence kurang." badge="Quality" tone={data.evidenceMissing.length ? "amber" : "green"} icon={Database} loading={loading} />
        <DashboardMetricCard label="Port Issue" value={portStats.problem} caption="Port down/maintenance atau mismatch assignment." badge="Ops" tone={portStats.problem ? "amber" : "green"} icon={RadioTower} loading={loading} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
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

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[0.9fr_1.1fr]">
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
  const odpStats = getOdpStats(data.odpDevices);
  const regionSuffix = singleRegionScope ? `&region_id=${encodeURIComponent(singleRegionScope)}` : "";
  const rejected = requestItems(data.rejectedAdminregion, "rejected_adminregion");
  const openOdpItems = data.odpDevices
    .filter((item) => !isValidated(item))
    .slice(0, 6)
    .map((item) => ({
      id: item.id,
      title: item.device_name || item.device_id || "ODP",
      description: `${item.device_id || item.id} belum memiliki validasi final.`,
      href: `/data-management/list/odp/${item.id}`,
      badge: item.validation_status || "unvalidated",
      tone: "amber" as const,
    }));

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
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

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
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
  const odpStats = getOdpStats(data.odpDevices);
  const portStats = getPortStats(data.ports);
  const rows = [
    { label: "ODP total", value: data.odpDevices.length },
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

function ValidationProgressCard({ odpStats, loading }: { odpStats: ReturnType<typeof getOdpStats>; loading: boolean }) {
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

async function loadDashboardData(token: string, role: RoleKey, regionId: string): Promise<DashboardData> {
  const suffix = regionId ? `&region_id=${encodeURIComponent(regionId)}` : "";
  const [summary, regions, pops, devices, odpDevices, ports, adminregionRequests, superadminRequests, rejectedAdminregion, rejectedSuperadmin, evidenceMissing, auditLogs] = await Promise.all([
    safeFetch<DashboardSummaryResponse>("/dashboard/summary", token),
    fetchAllPaginated<RegionItem>("/regions?page=1&limit=100", token),
    fetchAllPaginated<PopItem>(`/pops?page=1&limit=100${suffix}`, token),
    fetchAllPaginated<DeviceItem>(`/devices?page=1&limit=100${suffix}`, token),
    fetchAllPaginated<DeviceItem>(`/devices?page=1&limit=100&device_type_key=ODP${suffix}`, token),
    fetchAllPaginated<DevicePortItem>(`/devicePorts?page=1&limit=100${suffix}`, token),
    role === "superadmin" || role === "adminregion" || role === "validator" ? safeFetch<{ data: ValidationRequestItem[] }>("/validation-requests?queue=adminregion", token) : Promise.resolve(null),
    role === "superadmin" || role === "adminregion" ? safeFetch<{ data: ValidationRequestItem[] }>("/validation-requests?queue=superadmin", token) : Promise.resolve(null),
    safeFetch<{ data: ValidationRequestItem[] }>(`/validation-requests/quality-queue?queue=rejected_adminregion${suffix}`, token),
    safeFetch<{ data: ValidationRequestItem[] }>(`/validation-requests/quality-queue?queue=rejected_superadmin${suffix}`, token),
    safeFetch<{ data: ValidationRequestItem[] }>(`/validation-requests/quality-queue?queue=evidence_missing${suffix}`, token),
    role === "superadmin" ? safeFetch<PaginatedResponse<AuditLogItem>>("/auditLogs?page=1&limit=8", token) : Promise.resolve(null),
  ]);

  return {
    summary: summary?.data || null,
    regions: regionId ? regions.filter((item) => item.id === regionId) : regions,
    pops,
    devices,
    odpDevices,
    ports,
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

async function fetchAllPaginated<T>(pathWithPage: string, token: string, limit = 100) {
  const rows: T[] = [];
  let page = 1;

  while (true) {
    const path = pathWithPage.replace(/page=\d+/i, `page=${page}`).replace(/limit=\d+/i, `limit=${limit}`);
    const payload = await safeFetch<PaginatedResponse<T>>(path, token);
    const pageRows = payload?.data || [];
    rows.push(...pageRows);

    const total = payload?.meta?.total ?? 0;
    if (!pageRows.length) break;
    if (total && rows.length >= total) break;
    if (!total && pageRows.length < limit) break;
    page += 1;
  }

  return rows;
}

function deviceTypeChart(items: DeviceItem[]): DashboardChartDatum[] {
  return countBy(items, (item) => valueText(item.device_type_key, "Unknown")).map((item) => ({
    ...item,
    color: deviceTypeColor(item.label),
  }));
}

function deviceStatusChart(items: DeviceItem[]): DashboardChartDatum[] {
  return countBy(items, (item) => valueText(item.status, "unknown")).map((item) => ({
    ...item,
    color: statusColor(item.label),
  }));
}

function popStatusChart(items: PopItem[]): DashboardChartDatum[] {
  return countBy(items, (item) => valueText(item.status_pop, "unknown")).map((item) => ({
    ...item,
    color: statusColor(item.label),
  }));
}

function regionDistributionChart(regions: RegionItem[], devices: DeviceItem[]): DashboardChartDatum[] {
  const regionMap = new Map(regions.map((region) => [region.id, getRegionLabel({ relation: region })]));
  return countBy(devices, (item) => regionMap.get(String(item.region_id || "")) || getRegionLabel({ fallback: item.region_id, optional: true }));
}

function regionPopDistributionChart(regions: RegionItem[], pops: PopItem[]): DashboardChartDatum[] {
  const regionMap = new Map(regions.map((region) => [region.id, getRegionLabel({ relation: region })]));
  return countBy(pops, (item) => regionMap.get(String(item.region_id || "")) || getRegionLabel({ fallback: item.region_id, optional: true }));
}

function popDeviceDistributionChart(pops: PopItem[], devices: DeviceItem[]): DashboardChartDatum[] {
  const popMap = new Map(pops.map((pop) => [pop.id, getPopLabel({ relation: pop, fallback: pop.pop_code || pop.pop_id, optional: true })]));
  return countBy(devices, (item) => popMap.get(String(item.pop_id || "")) || "No POP").slice(0, 8);
}

function odpValidationChart(items: DeviceItem[], data: DashboardData): DashboardChartDatum[] {
  const odpStats = getOdpStats(items);
  return [
    { label: "Validated", value: odpStats.validated, color: "#16a34a" },
    { label: "Unvalidated", value: odpStats.unvalidated, color: "#f59e0b" },
    { label: "Pending Admin Region", value: data.adminregionRequests.length, color: "#2563eb" },
    { label: "Pending Superadmin", value: data.superadminRequests.length, color: "#7c3aed" },
    { label: "Rejected", value: data.rejectedAdminregion.length + data.rejectedSuperadmin.length, color: "#dc2626" },
  ];
}

function portUtilizationChart(items: DevicePortItem[]): DashboardChartDatum[] {
  return countBy(items, (item) => valueText(item.status, "unknown")).map((item) => ({
    ...item,
    color: statusColor(item.label),
  }));
}

function popWithoutDeviceItems(pops: PopItem[], devices: DeviceItem[]): DashboardQueueItem[] {
  const deviceCounts = new Map<string, number>();
  devices.forEach((device) => {
    const popId = String(device.pop_id || "");
    if (!popId) return;
    deviceCounts.set(popId, (deviceCounts.get(popId) || 0) + 1);
  });

  return pops
    .filter((pop) => !deviceCounts.get(pop.id))
    .slice(0, 6)
    .map((pop) => ({
      id: pop.id,
      title: getPopLabel({ relation: pop, fallback: pop.pop_code || pop.pop_id, optional: true }) || "POP",
      description: `${pop.pop_id || pop.id} belum memiliki device pada scope data dashboard.`,
      href: "/data-management",
      badge: "No Device",
      tone: "amber" as const,
    }));
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

function countBy<T>(items: T[], getKey: (item: T) => string): DashboardChartDatum[] {
  const counts = new Map<string, number>();
  items.forEach((item) => {
    const key = getKey(item);
    counts.set(key, (counts.get(key) || 0) + 1);
  });

  return [...counts.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
}

function getOdpStats(items: DeviceItem[]) {
  const validated = items.filter(isValidated).length;
  return {
    total: items.length,
    validated,
    unvalidated: Math.max(items.length - validated, 0),
  };
}

function valueText(value: unknown, fallback: string) {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function deviceTypeColor(label: string) {
  const key = label.toUpperCase();
  if (key === "ODP") return "#2563eb";
  if (key === "OLT") return "#16a34a";
  if (key === "ONT") return "#0891b2";
  if (key === "ODC") return "#7c3aed";
  if (key === "OTB") return "#f59e0b";
  if (key === "CABLE") return "#64748b";
  return "#94a3b8";
}

function statusColor(label: string) {
  const key = label.toLowerCase();
  if (["active", "used", "validated", "valid", "ok"].includes(key)) return "#16a34a";
  if (["idle", "draft", "pending", "reserved"].includes(key)) return "#f59e0b";
  if (["down", "maintenance", "rejected", "archived", "inactive"].includes(key)) return "#dc2626";
  return "#64748b";
}

function getPortStats(items: DevicePortItem[]) {
  const downMaintenance = items.filter((item) => item.status === "down" || item.status === "maintenance").length;
  const assignmentMismatch = items.filter((item) => (item.customer_id || item.ont_device_id) && item.status !== "used").length;
  return {
    total: items.length,
    downMaintenance,
    assignmentMismatch,
    problem: downMaintenance + assignmentMismatch,
  };
}

function isValidated(item: DeviceItem) {
  return Boolean(item.validation_date || item.last_validation_at);
}

function requestItems(items: ValidationRequestItem[], kind: "pending_adminregion" | "pending_superadmin" | "rejected_adminregion" | "rejected_superadmin"): DashboardQueueItem[] {
  return items.slice(0, 8).map((item) => ({
    id: `${kind}:${item.id}`,
    title: getRequestTitle(item),
    description: getRequestDescription(item),
    href: kind === "pending_adminregion" || kind === "pending_superadmin" || kind === "rejected_superadmin" ? "/requests" : `/data-management/list/odp/${item.entity_id || ""}`,
    badge: statusLabel(item.current_status || kind),
    tone: kind.includes("rejected") ? "red" : "blue",
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
  const odpStats = getOdpStats(data.odpDevices);
  const portStats = getPortStats(data.ports);
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
  return note ? `${operation}: ${note}` : `${operation} - ${item.request_id || item.id}`;
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
