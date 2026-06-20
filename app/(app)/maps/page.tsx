"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Cable, MapPinned, RefreshCw } from "lucide-react";
import type { MapConnection, MapDevice, MapRoute } from "@/components/features/maps/topology-map-canvas";
import { AppLoading } from "@/components/app-loading-new";
import { useSession } from "@/components/session-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiFetch, getReferenceData } from "@/lib/api";

const TopologyMapCanvas = dynamic(
  () => import("@/components/features/maps/topology-map-canvas").then((module) => module.TopologyMapCanvas),
  { ssr: false, loading: () => <AppLoading label="Menyiapkan peta..." /> },
);

type MapConnectionItem = MapConnection & {
  cable_device_id?: string | null;
  cable_device?: MapDevice | null;
  route?: MapRoute | null;
};

type FiberCutImpact = {
  active: boolean;
  summary: {
    cut_connections: number;
    affected_devices: number;
    affected_connections: number;
    affected_routes: number;
    affected_customers: number;
    affected_onts: number;
  };
  devices: MapDevice[];
  connections: MapConnectionItem[];
  warnings?: string[];
};

type TopologyMapsResponse = {
  data: {
    scope?: {
      role?: string | null;
      requested_region_id?: string | null;
      effective_region_ids?: string[] | null;
    };
    layers: {
      devices: { items: MapDevice[]; summary: { total: number; with_coordinates: number; without_coordinates: number } };
      routes: { items: MapRoute[]; summary: { total: number; with_geometry: number; without_geometry: number } };
      connections: { items: MapConnectionItem[]; summary: { total: number; with_geometry_context: number } };
      fiber_cut_impact: FiberCutImpact;
    };
    issues: {
      devices_without_coordinates: MapDevice[];
      routes_without_geometry: MapRoute[];
      connections_without_geometry_context: MapConnectionItem[];
    };
    meta: { generated_at?: string | null };
  };
};

type MapFilterOptionRow = Record<string, unknown> & {
  id?: string | null;
  region_id?: string | null;
};

type MapFilterOptions = {
  regions: MapFilterOptionRow[];
  projects: MapFilterOptionRow[];
  pops: MapFilterOptionRow[];
  tenants: MapFilterOptionRow[];
};

export default function MapsPage() {
  const { token } = useSession();
  const [data, setData] = useState<TopologyMapsResponse["data"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterOptions, setFilterOptions] = useState<MapFilterOptions>({ regions: [], projects: [], pops: [], tenants: [] });
  const [regionFilter, setRegionFilter] = useState("__all__");
  const [projectFilter, setProjectFilter] = useState("__all__");
  const [popFilter, setPopFilter] = useState("__all__");
  const [tenantFilter, setTenantFilter] = useState("__all__");
  const [deviceType, setDeviceType] = useState("all");
  const [cutMode, setCutMode] = useState<"none" | "connection" | "cable">("none");
  const [cutTarget, setCutTarget] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    async function loadFilters() {
      try {
        const response = await getReferenceData(token, { groups: ["regions", "projects", "pops", "tenants"], limit: 500 });
        if (cancelled) return;
        setFilterOptions({
          regions: (response.data.regions || []) as MapFilterOptionRow[],
          projects: (response.data.projects || []) as MapFilterOptionRow[],
          pops: (response.data.pops || []) as MapFilterOptionRow[],
          tenants: (response.data.tenants || []) as MapFilterOptionRow[],
        });
      } catch {
        if (!cancelled) setFilterOptions({ regions: [], projects: [], pops: [], tenants: [] });
      }
    }
    void loadFilters();
    return () => { cancelled = true; };
  }, [token]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    async function loadMap() {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams();
        if (regionFilter !== "__all__") params.set("region_id", regionFilter);
        if (projectFilter !== "__all__") params.set("project_id", projectFilter);
        if (popFilter !== "__all__") params.set("pop_id", popFilter);
        if (tenantFilter !== "__all__") params.set("tenant_id", tenantFilter);
        if (deviceType !== "all") params.set("device_type_key", deviceType);
        if (cutMode === "connection" && cutTarget) params.set("cut_connection_id", cutTarget);
        if (cutMode === "cable" && cutTarget) params.set("cut_cable_device_id", cutTarget);
        const response = await apiFetch<TopologyMapsResponse>(`/topology/maps?${params.toString()}`, { token });
        if (!cancelled) setData(response.data);
      } catch (err) {
        if (!cancelled) setError((err as Error).message || "Gagal memuat topology map.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadMap();
    return () => { cancelled = true; };
  }, [cutMode, cutTarget, deviceType, popFilter, projectFilter, refreshKey, regionFilter, tenantFilter, token]);

  useEffect(() => {
    setProjectFilter("__all__");
    setPopFilter("__all__");
  }, [regionFilter]);

  const devices = useMemo(() => data?.layers.devices.items || [], [data]);
  const routes = useMemo(() => data?.layers.routes.items || [], [data]);
  const connections = useMemo(() => data?.layers.connections.items || [], [data]);
  const impact = data?.layers.fiber_cut_impact;
  const regionOptions = useMemo(
    () => [
      { value: "__all__", label: "Semua region dalam scope" },
      ...filterOptions.regions.map((item) => ({ value: String(item.id || ""), label: formatMapFilterLabel(item, ["region_name", "region_code", "name"], "Region") })).filter((item) => item.value),
    ],
    [filterOptions.regions],
  );
  const projectOptions = useMemo(() => {
    const rows = filterOptions.projects.filter((item) => regionFilter === "__all__" || item.region_id === regionFilter);
    return [
      { value: "__all__", label: "Semua project" },
      ...rows.map((item) => ({ value: String(item.id || ""), label: formatMapFilterLabel(item, ["project_name", "project_code", "project_id"], "Project") })).filter((item) => item.value),
    ];
  }, [filterOptions.projects, regionFilter]);
  const popOptions = useMemo(() => {
    const rows = filterOptions.pops.filter((item) => regionFilter === "__all__" || item.region_id === regionFilter);
    return [
      { value: "__all__", label: "Semua POP" },
      ...rows.map((item) => ({ value: String(item.id || ""), label: formatMapFilterLabel(item, ["pop_name", "pop_code", "pop_id"], "POP") })).filter((item) => item.value),
    ];
  }, [filterOptions.pops, regionFilter]);
  const tenantOptions = useMemo(
    () => [
      { value: "__all__", label: "Semua tenant" },
      ...filterOptions.tenants.map((item) => ({ value: String(item.id || ""), label: formatMapFilterLabel(item, ["tenant_name", "tenant_code", "name"], "Tenant") })).filter((item) => item.value),
    ],
    [filterOptions.tenants],
  );
  const deviceTypeOptions = useMemo(() => {
    const values = Array.from(new Set(devices.map((item) => String(item.device_type_key || "").toUpperCase()).filter(Boolean))).sort();
    return [{ value: "all", label: "Semua tipe device" }, ...values.map((value) => ({ value, label: value }))];
  }, [devices]);
  const cutTargetOptions = useMemo(() => {
    if (cutMode === "connection") {
      return connections.map((item) => ({
        value: item.id,
        label: `${deviceLabel(item.from_device)} -> ${deviceLabel(item.to_device)}`,
      }));
    }
    if (cutMode === "cable") {
      const rows = new Map<string, string>();
      connections.forEach((item) => {
        if (!item.cable_device_id) return;
        rows.set(item.cable_device_id, deviceLabel(item.cable_device));
      });
      return Array.from(rows, ([value, label]) => ({ value, label }));
    }
    return [];
  }, [connections, cutMode]);

  const selectCutMode = (value: string) => {
    setCutMode(value as "none" | "connection" | "cable");
    setCutTarget("");
  };

  return (
    <ScrollArea className="h-full min-h-0 w-full">
      <div className="min-w-0 space-y-3 pr-0 sm:pr-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <MapPinned className="size-5 text-primary" />
              <h1 className="text-lg font-semibold">Operational Maps</h1>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">Device, route, connection, dan simulasi dampak fiber cut dari inventory approved.</p>
            {data?.scope ? (
              <div className="mt-2 flex min-w-0 flex-wrap gap-1.5">
                <Badge variant="secondary" className="max-w-full truncate">{formatMapRole(data.scope.role)}</Badge>
                <Badge variant="outline" className="max-w-full truncate">{formatMapRegionScope(data.scope)}</Badge>
              </div>
            ) : null}
          </div>
          <Button type="button" variant="outline" size="sm" className="w-full sm:w-auto" onClick={() => setRefreshKey((value) => value + 1)} disabled={loading}>
            <RefreshCw className={loading ? "animate-spin" : ""} />
            Refresh
          </Button>
        </div>

        <Tabs defaultValue="filters" className="min-w-0">
          <TabsList className="grid h-auto w-full grid-cols-2">
            <TabsTrigger value="filters" className="min-w-0 whitespace-normal text-xs sm:text-sm">Filters</TabsTrigger>
            <TabsTrigger value="fiber-cut" className="min-w-0 whitespace-normal text-xs sm:text-sm">Fiber Cut</TabsTrigger>
          </TabsList>
          <TabsContent value="filters" className="mt-2">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-5">
              <Combobox value={regionFilter} onValueChange={(value) => setRegionFilter(value || "__all__")} options={regionOptions} placeholder="Region" searchPlaceholder="Cari region..." />
              <Combobox value={projectFilter} onValueChange={(value) => setProjectFilter(value || "__all__")} options={projectOptions} placeholder="Project" searchPlaceholder="Cari project..." />
              <Combobox value={popFilter} onValueChange={(value) => setPopFilter(value || "__all__")} options={popOptions} placeholder="POP" searchPlaceholder="Cari POP..." />
              <Combobox value={tenantFilter} onValueChange={(value) => setTenantFilter(value || "__all__")} options={tenantOptions} placeholder="Tenant" searchPlaceholder="Cari tenant..." />
              <Combobox value={deviceType} onValueChange={(value) => setDeviceType(value || "all")} options={deviceTypeOptions} placeholder="Tipe device" />
            </div>
          </TabsContent>
          <TabsContent value="fiber-cut" className="mt-2">
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              <Combobox
                value={cutMode}
                onValueChange={selectCutMode}
                options={[
                  { value: "none", label: "Tanpa simulasi fiber cut" },
                  { value: "connection", label: "Simulasi berdasarkan connection" },
                  { value: "cable", label: "Simulasi berdasarkan cable" },
                ]}
                placeholder="Mode simulasi"
              />
              <Combobox
                value={cutTarget}
                onValueChange={(value) => setCutTarget(value || "")}
                options={cutTargetOptions}
                placeholder={cutMode === "none" ? "Pilih mode simulasi" : cutMode === "cable" ? "Pilih cable" : "Pilih connection"}
                disabled={cutMode === "none"}
              />
            </div>
          </TabsContent>
        </Tabs>

        {error ? <AppLoading label={error} variant="error" /> : null}
        {loading && !data ? <AppLoading label="Memuat topology map..." /> : null}

        {data ? (
          <>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <MapMetric label="Device" value={data.layers.devices.summary.total} detail={`${data.layers.devices.summary.with_coordinates} punya koordinat`} />
              <MapMetric label="Route" value={data.layers.routes.summary.total} detail={`${data.layers.routes.summary.with_geometry} punya geometry`} />
              <MapMetric label="Connection" value={data.layers.connections.summary.total} detail={`${data.layers.connections.summary.with_geometry_context} siap dipetakan`} />
              <MapMetric label="Affected Customer" value={impact?.summary.affected_customers || 0} detail={`${impact?.summary.affected_onts || 0} ONT terdampak`} danger={Boolean(impact?.active)} />
            </div>

            <Card className="min-w-0 overflow-hidden">
              <CardHeader className="border-b px-4 py-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <CardTitle className="text-base">Topology Layer</CardTitle>
                  <div className="flex flex-wrap gap-1.5">
                    <LegendBadge label="Healthy" color="bg-green-600" />
                    <LegendBadge label="Warning" color="bg-amber-600" />
                    <LegendBadge label="Impacted" color="bg-red-600" />
                    <LegendBadge label="Route" color="bg-blue-600" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="h-[52vh] min-h-[320px] p-0 md:h-[58vh] md:min-h-[420px]">
                <TopologyMapCanvas
                  devices={devices}
                  routes={routes}
                  connections={connections}
                  impactedDeviceIds={(impact?.devices || []).map((item) => item.id)}
                  impactedConnectionIds={(impact?.connections || []).map((item) => item.id)}
                />
              </CardContent>
            </Card>

            {impact?.active ? <ImpactSummary impact={impact} /> : null}
            <MapIssues data={data} />
          </>
        ) : null}
      </div>
    </ScrollArea>
  );
}

function MapMetric({ label, value, detail, danger = false }: { label: string; value: number; detail: string; danger?: boolean }) {
  return (
    <div className="min-w-0 rounded-md border bg-background p-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${danger && value > 0 ? "text-destructive" : ""}`}>{value}</p>
      <p className="mt-1 truncate text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

function LegendBadge({ label, color }: { label: string; color: string }) {
  return <Badge variant="outline"><span className={`size-2 rounded-full ${color}`} />{label}</Badge>;
}

function ImpactSummary({ impact }: { impact: FiberCutImpact }) {
  return (
    <div className="rounded-md border border-red-200 bg-red-50/60 p-3">
      <div className="flex items-center gap-2 text-red-800">
        <Cable className="size-4" />
        <p className="text-sm font-semibold">Fiber Cut Impact</p>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
        <MapMetric label="Cut connection" value={impact.summary.cut_connections} detail="Titik simulasi" />
        <MapMetric label="Device" value={impact.summary.affected_devices} detail="Downstream" danger />
        <MapMetric label="Connection" value={impact.summary.affected_connections} detail="Downstream" danger />
        <MapMetric label="Route" value={impact.summary.affected_routes} detail="Jalur terdampak" danger />
        <MapMetric label="Customer" value={impact.summary.affected_customers} detail="Assignment terdampak" danger />
        <MapMetric label="ONT" value={impact.summary.affected_onts} detail="Endpoint terdampak" danger />
      </div>
      {impact.warnings?.length ? <p className="mt-2 text-xs text-red-800">{impact.warnings.join(" ")}</p> : null}
    </div>
  );
}

function MapIssues({ data }: { data: TopologyMapsResponse["data"] }) {
  const deviceIssues = data.issues.devices_without_coordinates;
  const routeIssues = data.issues.routes_without_geometry;
  const connectionIssues = data.issues.connections_without_geometry_context;
  if (!deviceIssues.length && !routeIssues.length && !connectionIssues.length) return null;
  return (
    <div className="rounded-md border bg-muted/20 p-3">
      <div className="flex items-center gap-2">
        <AlertTriangle className="size-4 text-amber-600" />
        <p className="text-sm font-semibold">Map Data Issues</p>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
        <IssueList title="Device tanpa koordinat" items={deviceIssues.map(deviceLabel)} />
        <IssueList title="Route tanpa geometry" items={routeIssues.map((item) => item.route_name || item.route_code || "Route")} />
        <IssueList title="Connection tanpa geometry" items={connectionIssues.map((item) => `${deviceLabel(item.from_device)} -> ${deviceLabel(item.to_device)}`)} />
      </div>
    </div>
  );
}

function IssueList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="min-w-0 rounded-md border bg-background p-2.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium">{title}</p>
        <Badge variant="secondary">{items.length}</Badge>
      </div>
      <div className="mt-2 space-y-1">
        {items.slice(0, 5).map((item, index) => <p key={`${item}-${index}`} className="truncate text-xs text-muted-foreground">{item}</p>)}
        {items.length > 5 ? <p className="text-xs text-muted-foreground">+{items.length - 5} lainnya</p> : null}
      </div>
    </div>
  );
}

function deviceLabel(device?: MapDevice | null) {
  if (!device) return "Device belum tersedia";
  return device.device_name || device.device_id || device.device_type_key || "Device";
}

function formatMapFilterLabel(item: MapFilterOptionRow, fields: string[], fallback: string) {
  const values = fields.map((field) => textValue(item[field])).filter(Boolean);
  if (!values.length) return fallback;
  if (values.length === 1) return values[0];
  return `${values[0]} (${values[1]})`;
}

function textValue(value: unknown) {
  if (value == null) return "";
  const text = String(value).trim();
  return text && text !== "-" ? text : "";
}

function formatMapRole(role?: string | null) {
  if (role === "admin") return "Superadmin";
  if (role === "user_all_region") return "Admin Region";
  if (role === "user_region") return "Validator";
  return role || "User";
}

function formatMapRegionScope(scope: NonNullable<TopologyMapsResponse["data"]["scope"]>) {
  if (scope.requested_region_id) return "Region terfilter";
  const total = scope.effective_region_ids?.length || 0;
  if (total > 1) return `${total} region scope`;
  if (total === 1) return "1 region scope";
  return "All regions";
}
