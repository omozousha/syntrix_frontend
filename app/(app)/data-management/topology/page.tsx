"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AppLoading } from "@/components/app-loading-new";
import { useSession } from "@/components/session-context";
import { TopologyTracePanel } from "@/components/topology-trace-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiFetch, type PaginatedResponse, type RegionsListResponse } from "@/lib/api";

type TopologyQualityResponse = {
  data: {
    scope: {
      role: string;
      requested_region_id?: string | null;
      effective_region_filter: Record<string, unknown>;
    };
    metrics: {
      total_ports: number;
      idle_ports: number;
      total_connections: number;
      total_fiber_cores: number;
      used_fiber_cores: number;
      orphan_fiber_cores: number;
      inconsistent_fiber_cores: number;
    };
  };
};

type ProvisionResponse = {
  data: {
    device_id: string;
    template_id: string;
    profile_name: string;
    existing_port_count: number;
    created_count?: number;
    create_count?: number;
    missing_port_indexes?: number[];
  };
  message: string;
};

type TopologyTraceResponse = {
  data: {
    request: {
      start_device_id: string;
      end_device_id?: string | null;
      region_id?: string | null;
      max_depth: number;
    };
    graph: {
      nodes: Array<{
        id: string;
        device_id?: string | null;
        device_name?: string | null;
        device_type_key?: string | null;
        region_id?: string | null;
      }>;
      edges: Array<{
        id: string;
        connection_id?: string | null;
        from_device_id: string;
        to_device_id: string;
        connection_type?: string | null;
        status?: string | null;
        fiber_cores?: { total: number; used: number; statuses: Record<string, number> };
      }>;
    };
    trace: {
      found: boolean;
      hop_count: number;
      path: Array<{
        id: string;
        device_id?: string | null;
        device_name?: string | null;
        device_type_key?: string | null;
      }>;
    };
  };
  message: string;
};

type DeviceLookupItem = {
  id: string;
  device_id?: string | null;
  device_name?: string | null;
  device_type_key?: string | null;
  region_id?: string | null;
};

type RouteLookupItem = {
  id: string;
  route_name?: string | null;
  route_id?: string | null;
  region_id?: string | null;
};

type DevicePortItem = {
  id: string;
  port_index?: number | null;
  port_label?: string | null;
  port_type?: string | null;
  status?: string | null;
  direction?: string | null;
  core_capacity?: number | null;
  core_used?: number | null;
};

type FiberCoreItem = {
  id: string;
  core_no?: number | null;
  status?: string | null;
  color_name?: string | null;
  color_hex?: string | null;
  connection_id?: string | null;
};

export default function TopologyWorkspacePage() {
  const searchParams = useSearchParams();
  const { token, me } = useSession();
  const scopedRegionIds = useMemo(
    () =>
      me.role === "user_all_region" || me.role === "user_region"
        ? (me.app_user.user_region_scopes || [])
            .map((scope) => String(scope.region_id || "").trim())
            .filter(Boolean)
        : [],
    [me.app_user.user_region_scopes, me.role],
  );
  const isScopedRegionRole = me.role === "user_all_region" || me.role === "user_region";
  const requestedRegionId = searchParams.get("region_id") || "all";
  const initialRegionId = isScopedRegionRole
    ? (scopedRegionIds.includes(requestedRegionId) ? requestedRegionId : scopedRegionIds[0] || "all")
    : requestedRegionId;
  const initialStartDeviceId = searchParams.get("start_device_id") || "";
  const initialEndDeviceId = searchParams.get("end_device_id") || "";
  const initialMaxDepth = searchParams.get("max_depth") || "12";
  const isPersonalDeviceMode = Boolean(initialStartDeviceId.trim());
  const autoTraceTriggeredRef = useRef(false);
  const [regions, setRegions] = useState<RegionsListResponse["data"]>([]);
  const [regionId, setRegionId] = useState(initialRegionId);
  const [quality, setQuality] = useState<TopologyQualityResponse["data"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [deviceId, setDeviceId] = useState(initialStartDeviceId);
  const [profileName, setProfileName] = useState("default");
  const [provisioning, setProvisioning] = useState(false);
  const [provisionResult, setProvisionResult] = useState<ProvisionResponse | null>(null);
  const [provisionError, setProvisionError] = useState("");
  const [traceStartDeviceId, setTraceStartDeviceId] = useState(initialStartDeviceId);
  const [traceEndDeviceId, setTraceEndDeviceId] = useState(initialEndDeviceId);
  const [traceMaxDepth, setTraceMaxDepth] = useState(initialMaxDepth);
  const [traceDeviceOptions, setTraceDeviceOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [traceDeviceMap, setTraceDeviceMap] = useState<Record<string, DeviceLookupItem>>({});
  const [loadingTraceDeviceOptions, setLoadingTraceDeviceOptions] = useState(false);
  const [routeOptions, setRouteOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [cableOptions, setCableOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [linkFromDeviceId, setLinkFromDeviceId] = useState(initialStartDeviceId);
  const [linkToDeviceId, setLinkToDeviceId] = useState(initialEndDeviceId);
  const [linkType, setLinkType] = useState("fiber");
  const [linkStatus, setLinkStatus] = useState("active");
  const [linkRouteId, setLinkRouteId] = useState("__none__");
  const [linkCableDeviceId, setLinkCableDeviceId] = useState("__none__");
  const [linkFiberCount, setLinkFiberCount] = useState("1");
  const [linkCoreStart, setLinkCoreStart] = useState("");
  const [linkCoreEnd, setLinkCoreEnd] = useState("");
  const [linkNotes, setLinkNotes] = useState("");
  const [linkFromPortId, setLinkFromPortId] = useState("");
  const [linkToPortId, setLinkToPortId] = useState("");
  const [fromPortOptions, setFromPortOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [toPortOptions, setToPortOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [fromPortRows, setFromPortRows] = useState<DevicePortItem[]>([]);
  const [toPortRows, setToPortRows] = useState<DevicePortItem[]>([]);
  const [loadingFromPorts, setLoadingFromPorts] = useState(false);
  const [loadingToPorts, setLoadingToPorts] = useState(false);
  const [cableCoreRows, setCableCoreRows] = useState<FiberCoreItem[]>([]);
  const [loadingCableCores, setLoadingCableCores] = useState(false);
  const [creatingLink, setCreatingLink] = useState(false);
  const [linkMessage, setLinkMessage] = useState("");
  const [linkError, setLinkError] = useState("");
  const [tracing, setTracing] = useState(false);
  const [traceResult, setTraceResult] = useState<TopologyTraceResponse | null>(null);
  const [traceError, setTraceError] = useState("");
  const [showAdvancedTools, setShowAdvancedTools] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        const payload = await apiFetch<RegionsListResponse>("/regions?page=1&limit=200", { token });
        if (cancelled) return;
        setRegions(payload.data || []);
      } catch {
        if (!cancelled) setRegions([]);
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (!isScopedRegionRole) return;
    if (!scopedRegionIds.length) return;
    if (!scopedRegionIds.includes(regionId)) {
      setRegionId(scopedRegionIds[0]);
    }
  }, [isScopedRegionRole, regionId, scopedRegionIds]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError("");
      try {
        const suffix = regionId !== "all" ? `?region_id=${encodeURIComponent(regionId)}` : "";
        const payload = await apiFetch<TopologyQualityResponse>(`/topology/quality${suffix}`, { token });
        if (cancelled) return;
        setQuality(payload.data);
      } catch (err) {
        if (cancelled) return;
        setError((err as Error).message || "Gagal memuat topology quality.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [regionId, token]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoadingTraceDeviceOptions(true);
      try {
        const suffix = regionId !== "all" ? `&region_id=${encodeURIComponent(regionId)}` : "";
        const payload = await apiFetch<PaginatedResponse<DeviceLookupItem>>(`/devices?page=1&limit=300${suffix}`, { token });
        if (cancelled) return;
        const nextMap: Record<string, DeviceLookupItem> = {};
        (payload.data || []).forEach((item) => {
          nextMap[item.id] = item;
        });
        const options = (payload.data || []).map((item) => ({
          value: item.id,
          label: `${item.device_name || item.device_id || "Device tidak tersedia"} (${item.device_type_key || "-"})`,
        }));
        const cables = (payload.data || [])
          .filter((item) => String(item.device_type_key || "").toUpperCase() === "CABLE")
          .map((item) => ({
            value: item.id,
            label: `${item.device_name || item.device_id || "Cable device tidak tersedia"} (CABLE)`,
          }));
        setTraceDeviceMap(nextMap);
        setTraceDeviceOptions(options);
        setCableOptions(cables);
      } catch {
        if (!cancelled) {
          setTraceDeviceMap({});
          setTraceDeviceOptions([]);
          setCableOptions([]);
        }
      } finally {
        if (!cancelled) setLoadingTraceDeviceOptions(false);
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [regionId, token]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        const suffix = regionId !== "all" ? `&region_id=${encodeURIComponent(regionId)}` : "";
        const payload = await apiFetch<PaginatedResponse<RouteLookupItem>>(`/routes?page=1&limit=300${suffix}`, { token });
        if (cancelled) return;
        const options = (payload.data || []).map((item) => ({
          value: item.id,
          label: `${item.route_name || item.route_id || "Route tidak tersedia"}`,
        }));
        setRouteOptions(options);
      } catch {
        if (!cancelled) setRouteOptions([]);
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [regionId, token]);

  const regionOptions = useMemo(
    () => {
      const options = regions
        .filter((region) => !isScopedRegionRole || scopedRegionIds.includes(region.id))
        .map((region) => ({ value: region.id, label: `${region.region_name} (${region.region_id})` }));
      return isScopedRegionRole ? options : [{ value: "all", label: "Semua Region" }, ...options];
    },
    [isScopedRegionRole, regions, scopedRegionIds],
  );
  const selectedRegionLabel = regionOptions.find((option) => option.value === regionId)?.label || "-";
  const asBuiltHref = useMemo(() => {
    const params = new URLSearchParams();
    if (regionId !== "all") params.set("region_id", regionId);
    if (traceStartDeviceId.trim()) params.set("start_device_id", traceStartDeviceId.trim());
    if (traceEndDeviceId.trim()) params.set("end_device_id", traceEndDeviceId.trim());
    const depth = Number(traceMaxDepth);
    if (Number.isFinite(depth) && depth > 0 && depth !== 12) params.set("max_depth", String(depth));
    const query = params.toString();
    return `/data-management/as-built${query ? `?${query}` : ""}`;
  }, [regionId, traceStartDeviceId, traceEndDeviceId, traceMaxDepth]);

  const runTraceRequest = useCallback(async (input: { startDeviceId: string; endDeviceId?: string; maxDepth: string; regionId: string }) => {
    const start = input.startDeviceId.trim();
    if (!start) return;

    setTracing(true);
    setTraceError("");
    setTraceResult(null);
    try {
      const params = new URLSearchParams();
      params.set("start_device_id", start);
      if (input.endDeviceId?.trim()) params.set("end_device_id", input.endDeviceId.trim());
      if (input.regionId !== "all") params.set("region_id", input.regionId);
      const depth = Number(input.maxDepth);
      if (Number.isFinite(depth) && depth > 0) params.set("max_depth", String(depth));

      const payload = await apiFetch<TopologyTraceResponse>(`/topology/trace?${params.toString()}`, { token });
      setTraceResult(payload);
    } catch (err) {
      setTraceError((err as Error).message || "Gagal menjalankan trace topology.");
    } finally {
      setTracing(false);
    }
  }, [token]);

  const loadDevicePorts = useCallback(async (deviceUuid: string) => {
    if (!deviceUuid.trim()) return [] as DevicePortItem[];
    const payload = await apiFetch<PaginatedResponse<DevicePortItem>>(
      `/devicePorts?page=1&limit=300&device_id=${encodeURIComponent(deviceUuid.trim())}`,
      { token },
    );
    return (payload.data || []).sort((a, b) => Number(a.port_index || 0) - Number(b.port_index || 0));
  }, [token]);

  useEffect(() => {
    if (!isPersonalDeviceMode) return;
    if (autoTraceTriggeredRef.current) return;
    if (!traceStartDeviceId.trim()) return;
    autoTraceTriggeredRef.current = true;
    void runTraceRequest({
      startDeviceId: traceStartDeviceId,
      endDeviceId: traceEndDeviceId,
      maxDepth: traceMaxDepth,
      regionId,
    });
  }, [isPersonalDeviceMode, traceStartDeviceId, traceEndDeviceId, traceMaxDepth, regionId, runTraceRequest]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!linkFromDeviceId.trim()) {
        setFromPortRows([]);
        setFromPortOptions([]);
        setLinkFromPortId("");
        return;
      }
      setLoadingFromPorts(true);
      try {
        const rows = await loadDevicePorts(linkFromDeviceId);
        if (cancelled) return;
        setFromPortRows(rows);
        setFromPortOptions(
          rows.map((row) => ({
            value: row.id,
            label: `${row.port_label || `Port ${row.port_index || "-"}`} (${row.port_type || "-"} | ${row.status || "-"})`,
          })),
        );
        setLinkFromPortId((prev) => (rows.some((row) => row.id === prev) ? prev : ""));
      } catch {
        if (!cancelled) {
          setFromPortRows([]);
          setFromPortOptions([]);
          setLinkFromPortId("");
        }
      } finally {
        if (!cancelled) setLoadingFromPorts(false);
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [linkFromDeviceId, loadDevicePorts]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!linkToDeviceId.trim()) {
        setToPortRows([]);
        setToPortOptions([]);
        setLinkToPortId("");
        return;
      }
      setLoadingToPorts(true);
      try {
        const rows = await loadDevicePorts(linkToDeviceId);
        if (cancelled) return;
        setToPortRows(rows);
        setToPortOptions(
          rows.map((row) => ({
            value: row.id,
            label: `${row.port_label || `Port ${row.port_index || "-"}`} (${row.port_type || "-"} | ${row.status || "-"})`,
          })),
        );
        setLinkToPortId((prev) => (rows.some((row) => row.id === prev) ? prev : ""));
      } catch {
        if (!cancelled) {
          setToPortRows([]);
          setToPortOptions([]);
          setLinkToPortId("");
        }
      } finally {
        if (!cancelled) setLoadingToPorts(false);
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [linkToDeviceId, loadDevicePorts]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!linkCableDeviceId || linkCableDeviceId === "__none__") {
        setCableCoreRows([]);
        return;
      }
      setLoadingCableCores(true);
      try {
        const payload = await apiFetch<PaginatedResponse<FiberCoreItem>>(
          `/fiberCores?page=1&limit=500&cable_device_id=${encodeURIComponent(linkCableDeviceId)}`,
          { token },
        );
        if (cancelled) return;
        const rows = (payload.data || []).sort((a, b) => Number(a.core_no || 0) - Number(b.core_no || 0));
        setCableCoreRows(rows);
      } catch {
        if (!cancelled) setCableCoreRows([]);
      } finally {
        if (!cancelled) setLoadingCableCores(false);
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [linkCableDeviceId, token]);

  async function handleProvision(dryRun: boolean) {
    if (!deviceId.trim()) return;
    setProvisioning(true);
    setProvisionError("");
    setProvisionResult(null);
    try {
      const payload = await apiFetch<ProvisionResponse>(`/devices/${encodeURIComponent(deviceId.trim())}/provision-ports`, {
        method: "POST",
        body: JSON.stringify({
          profile_name: profileName.trim() || "default",
          dry_run: dryRun ? "true" : "false",
        }),
        token,
      });
      setProvisionResult(payload);
    } catch (err) {
      setProvisionError((err as Error).message || "Gagal menjalankan provisioning.");
    } finally {
      setProvisioning(false);
    }
  }

  async function handleTrace() {
    await runTraceRequest({
      startDeviceId: traceStartDeviceId,
      endDeviceId: traceEndDeviceId,
      maxDepth: traceMaxDepth,
      regionId,
    });
  }

  async function handleCreateLink() {
    if (!linkFromDeviceId.trim() || !linkToDeviceId.trim()) {
      setLinkError("From device dan To device wajib diisi.");
      return;
    }
    if (linkFromDeviceId.trim() === linkToDeviceId.trim()) {
      setLinkError("From device dan To device tidak boleh sama.");
      return;
    }
    if (!linkFromPortId.trim() || !linkToPortId.trim()) {
      setLinkError("From port dan To port wajib diisi.");
      return;
    }
    if (linkFromPortId.trim() === linkToPortId.trim()) {
      setLinkError("From port dan To port tidak boleh sama.");
      return;
    }

    const selectedRegionId =
      regionId !== "all"
        ? regionId
        : traceDeviceMap[linkFromDeviceId.trim()]?.region_id || traceDeviceMap[linkToDeviceId.trim()]?.region_id || "";

    if (!selectedRegionId) {
      setLinkError("Region tidak ditemukan. Pilih region dulu agar link bisa dibuat.");
      return;
    }

    setCreatingLink(true);
    setLinkError("");
    setLinkMessage("");
    try {
      const hasCoreRange = linkCoreStart.trim() !== "" && linkCoreEnd.trim() !== "";
      const parsedFiberCount = Number(linkFiberCount);
      await apiFetch("/portConnections", {
        method: "POST",
        token,
        body: JSON.stringify({
          region_id: selectedRegionId,
          from_port_id: linkFromPortId.trim(),
          to_port_id: linkToPortId.trim(),
          connection_type: linkType || "fiber",
          status: linkStatus || "active",
          route_id: linkRouteId === "__none__" ? null : linkRouteId,
          cable_device_id: linkCableDeviceId === "__none__" ? null : linkCableDeviceId,
          core_start: hasCoreRange ? Number(linkCoreStart) : null,
          core_end: hasCoreRange ? Number(linkCoreEnd) : null,
          fiber_count: Number.isFinite(parsedFiberCount) ? parsedFiberCount : null,
          notes: linkNotes.trim() || null,
        }),
      });
      setLinkMessage("Koneksi aktual port berhasil dibuat. Jalankan trace untuk melihat jalur terbaru.");
      setTraceStartDeviceId(linkFromDeviceId.trim());
      setDeviceId(linkFromDeviceId.trim());
    } catch (err) {
      setLinkError((err as Error).message || "Gagal membuat koneksi aktual port.");
    } finally {
      setCreatingLink(false);
    }
  }

  return (
    <ScrollArea className="h-full min-h-0 w-full">
      <div className="space-y-4 pr-3">
        <section className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight">Device Trace Workspace</h2>
          <p className="text-sm text-muted-foreground">
            {isPersonalDeviceMode
              ? "Mode personal device: hasil trace langsung ditampilkan berdasarkan device yang dipilih dari list."
              : "Halaman ini diprioritaskan untuk trace dari list/detail device."}
          </p>
        </section>

        {!isPersonalDeviceMode ? (
          <Card>
            <CardHeader className="px-4 py-3">
              <CardTitle className="text-base">Mulai dari Device</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 px-4 pb-4 pt-0">
              <p className="text-sm text-muted-foreground">
                Untuk alur operasional, buka trace langsung dari list/detail device agar konteks region dan rantai koneksi otomatis terisi.
              </p>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_auto]">
                <Combobox
                  value={traceStartDeviceId}
                  onValueChange={(nextValue) => {
                    setTraceStartDeviceId(nextValue || "");
                    setDeviceId(nextValue || "");
                  }}
                  options={traceDeviceOptions}
                  placeholder={loadingTraceDeviceOptions ? "Memuat device..." : "Pilih start device"}
                  searchPlaceholder="Cari device..."
                />
                <Button type="button" onClick={() => void handleTrace()} disabled={tracing || !traceStartDeviceId.trim()}>
                  Trace Device
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {!isPersonalDeviceMode ? (
          <Card>
            <CardHeader className="px-4 py-3">
              <CardTitle className="text-base">Mode Device-Centric</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 px-4 pb-4 pt-0">
              <p className="text-sm text-muted-foreground">
                Halaman ini dioptimalkan untuk dibuka dari list/detail device. Pilih start device di atas lalu jalankan trace.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Button asChild type="button" variant="outline" size="sm">
                  <Link href="/data-management">Open Data Management</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {isPersonalDeviceMode ? (
        <Card>
          <CardHeader className="px-4 py-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-base">Topology Quality</CardTitle>
              <div className="w-full sm:w-80">
                {isScopedRegionRole ? (
                  <Input value={selectedRegionLabel} disabled aria-label="Region scope" />
                ) : (
                  <Combobox
                    value={regionId}
                    onValueChange={(nextValue) => {
                      setRegionId(nextValue || "all");
                    }}
                    options={regionOptions}
                  />
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            {loading ? (
              <AppLoading label="Memuat topology quality..." />
            ) : error ? (
              <AppLoading label={error} variant="error" />
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard label="Total Ports" value={quality?.metrics.total_ports ?? 0} />
                <MetricCard label="Idle Ports" value={quality?.metrics.idle_ports ?? 0} />
                <MetricCard label="Connections" value={quality?.metrics.total_connections ?? 0} />
                <MetricCard label="Fiber Cores" value={quality?.metrics.total_fiber_cores ?? 0} />
                <MetricCard label="Used Fiber Cores" value={quality?.metrics.used_fiber_cores ?? 0} />
                <MetricCard label="Orphan Fiber Cores" value={quality?.metrics.orphan_fiber_cores ?? 0} danger />
                <MetricCard label="Inconsistent Fiber Cores" value={quality?.metrics.inconsistent_fiber_cores ?? 0} danger />
              </div>
            )}
          </CardContent>
        </Card>
        ) : null}

        {isPersonalDeviceMode ? (
        <Card>
          <CardHeader className="px-4 py-3">
            <CardTitle className="text-base">Topology Trace (Beta)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-4 pb-4 pt-0">
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              <div>
                <Combobox
                  value={traceStartDeviceId}
                  onValueChange={(nextValue) => {
                    setTraceStartDeviceId(nextValue || "");
                    setDeviceId(nextValue || "");
                  }}
                  options={traceDeviceOptions}
                  placeholder={loadingTraceDeviceOptions ? "Memuat device..." : "Quick Select Start Device"}
                  searchPlaceholder="Cari device..."
                />
              </div>
              <div>
                <Combobox
                  value={traceEndDeviceId}
                  onValueChange={(nextValue) => setTraceEndDeviceId(nextValue || "")}
                  options={traceDeviceOptions}
                  placeholder={loadingTraceDeviceOptions ? "Memuat device..." : "Quick Select End Device (opsional)"}
                  searchPlaceholder="Cari end device..."
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-12">
              <div className="md:col-span-4">
                <Input value={traceStartDeviceId} onChange={(event) => setTraceStartDeviceId(event.target.value)} placeholder="Start Device UUID" />
              </div>
              <div className="md:col-span-4">
                <Input value={traceEndDeviceId} onChange={(event) => setTraceEndDeviceId(event.target.value)} placeholder="End Device UUID (optional)" />
              </div>
              <div className="md:col-span-2">
                <Input value={traceMaxDepth} onChange={(event) => setTraceMaxDepth(event.target.value)} placeholder="Max depth" />
              </div>
              <div className="md:col-span-2">
                <Button type="button" className="w-full" onClick={() => void handleTrace()} disabled={tracing || !traceStartDeviceId.trim()}>
                  Trace
                </Button>
              </div>
            </div>

            {traceError ? <p className="text-sm text-destructive">{traceError}</p> : null}
            {traceResult ? (
              <div className="space-y-2 rounded-md border bg-muted/30 px-3 py-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Button asChild type="button" variant="outline" size="sm">
                    <Link href={asBuiltHref}>Open As-Built From Trace</Link>
                  </Button>
                </div>
                <TopologyTracePanel data={traceResult.data} showRawJson />
              </div>
            ) : null}
          </CardContent>
        </Card>
        ) : null}

        {isPersonalDeviceMode ? (
          <div className="flex justify-end">
            <Button type="button" variant="outline" size="sm" onClick={() => setShowAdvancedTools((prev) => !prev)}>
              {showAdvancedTools ? "Hide Advanced Tools" : "Show Advanced Tools"}
            </Button>
          </div>
        ) : null}

        {showAdvancedTools ? (
          <>
        <Card>
          <CardHeader className="px-4 py-3">
            <CardTitle className="text-base">Connection Wizard (Actual Topology)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-4 pb-4 pt-0">
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              <Combobox
                value={linkFromDeviceId}
                onValueChange={(nextValue) => {
                  const value = nextValue || "";
                  setLinkFromDeviceId(value);
                  setTraceStartDeviceId(value);
                }}
                options={traceDeviceOptions}
                placeholder={loadingTraceDeviceOptions ? "Memuat device..." : "From Device"}
                searchPlaceholder="Cari from device..."
              />
              <Combobox
                value={linkToDeviceId}
                onValueChange={(nextValue) => {
                  const value = nextValue || "";
                  setLinkToDeviceId(value);
                  setTraceEndDeviceId(value);
                }}
                options={traceDeviceOptions}
                placeholder={loadingTraceDeviceOptions ? "Memuat device..." : "To Device"}
                searchPlaceholder="Cari to device..."
              />
            </div>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              <Combobox
                value={linkFromPortId}
                onValueChange={(nextValue) => setLinkFromPortId(nextValue || "")}
                options={fromPortOptions}
                placeholder={loadingFromPorts ? "Memuat from ports..." : "From Port"}
                searchPlaceholder="Cari from port..."
              />
              <Combobox
                value={linkToPortId}
                onValueChange={(nextValue) => setLinkToPortId(nextValue || "")}
                options={toPortOptions}
                placeholder={loadingToPorts ? "Memuat to ports..." : "To Port"}
                searchPlaceholder="Cari to port..."
              />
            </div>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
              <Combobox
                value={linkType}
                onValueChange={(nextValue) => setLinkType(nextValue || "fiber")}
                options={[
                  { value: "fiber", label: "fiber" },
                  { value: "patch", label: "patch" },
                  { value: "uplink", label: "uplink" },
                  { value: "crossconnect", label: "crossconnect" },
                  { value: "other", label: "other" },
                ]}
                placeholder="Connection type"
                searchPlaceholder="Cari connection type..."
              />
              <Combobox
                value={linkStatus}
                onValueChange={(nextValue) => setLinkStatus(nextValue || "active")}
                options={[
                  { value: "active", label: "active" },
                  { value: "planned", label: "planned" },
                  { value: "inactive", label: "inactive" },
                  { value: "cutover", label: "cutover" },
                ]}
                placeholder="Status"
                searchPlaceholder="Cari status..."
              />
              <Combobox
                value={linkRouteId}
                onValueChange={(nextValue) => setLinkRouteId(nextValue || "__none__")}
                options={[{ value: "__none__", label: "Tanpa Route" }, ...routeOptions]}
                placeholder="Route (opsional)"
                searchPlaceholder="Cari route..."
              />
              <Combobox
                value={linkCableDeviceId}
                onValueChange={(nextValue) => setLinkCableDeviceId(nextValue || "__none__")}
                options={[{ value: "__none__", label: "Tanpa Cable Device" }, ...cableOptions]}
                placeholder="Cable Device (opsional)"
                searchPlaceholder="Cari cable..."
              />
            </div>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-12">
              <div className="md:col-span-2">
                <Input value={linkCoreStart} onChange={(event) => setLinkCoreStart(event.target.value)} placeholder="Core start" />
              </div>
              <div className="md:col-span-2">
                <Input value={linkCoreEnd} onChange={(event) => setLinkCoreEnd(event.target.value)} placeholder="Core end" />
              </div>
              <div className="md:col-span-2">
                <Input value={linkFiberCount} onChange={(event) => setLinkFiberCount(event.target.value)} placeholder="Fiber count" />
              </div>
              <div className="md:col-span-4">
                <Input value={linkNotes} onChange={(event) => setLinkNotes(event.target.value)} placeholder="Catatan link (opsional)" />
              </div>
              <div className="md:col-span-2">
                <Button
                  type="button"
                  className="w-full"
                  onClick={() => void handleCreateLink()}
                  disabled={
                    creatingLink ||
                    !linkFromDeviceId.trim() ||
                    !linkToDeviceId.trim() ||
                    !linkFromPortId.trim() ||
                    !linkToPortId.trim()
                  }
                >
                  {creatingLink ? "Creating..." : "Create Connection"}
                </Button>
              </div>
            </div>
            {linkError ? <p className="text-sm text-destructive">{linkError}</p> : null}
            {linkMessage ? <p className="text-sm text-emerald-600">{linkMessage}</p> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="px-4 py-3">
            <CardTitle className="text-base">Port & Core Occupancy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-4 pb-4 pt-0">
            <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
              <MetricCard
                label="From Device Ports"
                value={fromPortRows.length}
              />
              <MetricCard
                label="To Device Ports"
                value={toPortRows.length}
              />
              <MetricCard
                label="Cable Cores"
                value={cableCoreRows.length}
              />
            </div>
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
              <div className="rounded-md border bg-muted/20 p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">From Device Port Status</p>
                {loadingFromPorts ? (
                  <p className="text-sm text-muted-foreground">Memuat port...</p>
                ) : !fromPortRows.length ? (
                  <p className="text-sm text-muted-foreground">Belum ada port pada device ini.</p>
                ) : (
                  <div className="space-y-1.5">
                    {fromPortRows.slice(0, 12).map((port) => (
                      <div key={port.id} className="flex items-center justify-between rounded border bg-background px-2 py-1 text-xs">
                        <span>{port.port_label || `Port ${port.port_index || "-"}`}</span>
                        <span className="text-muted-foreground">{port.status || "-"}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="rounded-md border bg-muted/20 p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cable Core Status</p>
                {linkCableDeviceId === "__none__" ? (
                  <p className="text-sm text-muted-foreground">Pilih cable device untuk melihat core occupancy.</p>
                ) : loadingCableCores ? (
                  <p className="text-sm text-muted-foreground">Memuat cores...</p>
                ) : !cableCoreRows.length ? (
                  <p className="text-sm text-muted-foreground">Belum ada core pada cable ini.</p>
                ) : (
                  <div className="space-y-1.5">
                    {cableCoreRows.slice(0, 12).map((core) => (
                      <div key={core.id} className="flex items-center justify-between rounded border bg-background px-2 py-1 text-xs">
                        <span className="inline-flex items-center gap-2">
                          <span
                            className="inline-block size-2.5 rounded-full border"
                            style={{ backgroundColor: core.color_hex || "#94A3B8" }}
                          />
                          Core {core.core_no || "-"} {core.color_name ? `(${core.color_name})` : ""}
                        </span>
                        <span className="text-muted-foreground">{core.status || "-"}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="px-4 py-3">
            <CardTitle className="text-base">Device Port Provisioning (MVP)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-4 pb-4 pt-0">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-12">
            <div className="md:col-span-5">
              <Input value={deviceId} onChange={(event) => setDeviceId(event.target.value)} placeholder="Device UUID" />
            </div>
            <div className="md:col-span-3">
              <Input value={profileName} onChange={(event) => setProfileName(event.target.value)} placeholder="Profile name (default)" />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row md:col-span-4 md:justify-end">
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto md:min-w-28"
                disabled={provisioning || !deviceId.trim()}
                onClick={() => void handleProvision(true)}
              >
                Dry Run
              </Button>
              <Button
                type="button"
                className="w-full sm:w-auto md:min-w-28"
                disabled={provisioning || !deviceId.trim()}
                onClick={() => void handleProvision(false)}
              >
                Provision
              </Button>
            </div>
          </div>

            {provisionError ? <p className="text-sm text-destructive">{provisionError}</p> : null}
            {provisionResult ? (
              <div className="rounded-md border bg-muted/30 px-3 py-2">
                <p className="text-sm font-medium">{provisionResult.message}</p>
                <pre className="mt-2 overflow-auto text-xs text-muted-foreground">{JSON.stringify(provisionResult.data, null, 2)}</pre>
              </div>
            ) : null}
          </CardContent>
        </Card>
          </>
        ) : null}

      </div>
    </ScrollArea>
  );
}

function MetricCard({ label, value, danger = false }: { label: string; value: number; danger?: boolean }) {
  return (
    <Card>
      <CardHeader className="px-3 py-2">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3 pt-0">
        <p className={`text-2xl font-bold leading-none ${danger && value > 0 ? "text-destructive" : ""}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
