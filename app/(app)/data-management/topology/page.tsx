"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AppLoading } from "@/components/app-loading-new";
import { useSession } from "@/components/session-context";
import { TopologyTracePanel } from "@/components/topology-trace-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
      start?: {
        type?: string | null;
        device_id?: string | null;
        port_id?: string | null;
        customer_id?: string | null;
      };
      end?: {
        type?: string | null;
        device_id?: string | null;
        port_id?: string | null;
        customer_id?: string | null;
      } | null;
      start_device_id?: string;
      end_device_id?: string | null;
      direction?: string | null;
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
        core_start?: number | null;
        core_end?: number | null;
        fiber_count?: number | null;
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
      warnings?: string[];
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
  customer_id?: string | null;
  customer_name?: string | null;
  customer_number?: string | null;
  ont_device_id?: string | null;
};

type FiberCoreItem = {
  id: string;
  core_no?: number | null;
  status?: string | null;
  color_name?: string | null;
  color_hex?: string | null;
  tube_no?: number | null;
  tube_color_name?: string | null;
  tube_color_hex?: string | null;
  last_loss_db?: number | null;
  connection_id?: string | null;
};

type ExistingPortConnection = {
  id: string;
  connection_id?: string | null;
  region_id?: string | null;
  from_port_id?: string | null;
  to_port_id?: string | null;
  connection_type?: string | null;
  status?: string | null;
  route_id?: string | null;
  cable_device_id?: string | null;
  core_start?: number | null;
  core_end?: number | null;
  fiber_count?: number | null;
  notes?: string | null;
  updated_at?: string | null;
  from_port?: (DevicePortItem & { device_id?: string | null }) | null;
  to_port?: (DevicePortItem & { device_id?: string | null }) | null;
  from_device?: DeviceLookupItem | null;
  to_device?: DeviceLookupItem | null;
  cable_device?: DeviceLookupItem | null;
  route?: RouteLookupItem | null;
  labels?: {
    title?: string | null;
    from?: string | null;
    to?: string | null;
    cable?: string | null;
    route?: string | null;
    core_range?: string | null;
  };
};

type DeviceTopologySummaryResponse = {
  data: {
    connections?: {
      items?: ExistingPortConnection[];
    };
  };
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
  const initialDirection = ["upstream", "downstream", "both"].includes(String(searchParams.get("direction") || "").toLowerCase())
    ? String(searchParams.get("direction")).toLowerCase()
    : "both";
  const initialTool = String(searchParams.get("tool") || "").toLowerCase();
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
  const [traceDirection, setTraceDirection] = useState(initialDirection);
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
  const [existingConnections, setExistingConnections] = useState<ExistingPortConnection[]>([]);
  const [loadingExistingConnections, setLoadingExistingConnections] = useState(false);
  const [editingConnectionId, setEditingConnectionId] = useState("");
  const [tracing, setTracing] = useState(false);
  const [traceResult, setTraceResult] = useState<TopologyTraceResponse | null>(null);
  const [traceError, setTraceError] = useState("");
  const [showAdvancedTools, setShowAdvancedTools] = useState(initialTool === "connection" || initialTool === "advanced");
  const topologyRole = normalizeTopologyRole(me.role);
  const canMutateTopology = topologyRole === "superadmin" || topologyRole === "adminregion";
  const isApprovalMutationRole = topologyRole === "adminregion";
  const fromPortStatusCounts = useMemo(() => countByStatus(fromPortRows), [fromPortRows]);
  const toPortStatusCounts = useMemo(() => countByStatus(toPortRows), [toPortRows]);
  const cableCoreStatusCounts = useMemo(() => countByStatus(cableCoreRows), [cableCoreRows]);
  const selectedCableLabel = useMemo(
    () => cableOptions.find((option) => option.value === linkCableDeviceId)?.label || "",
    [cableOptions, linkCableDeviceId],
  );
  const cableCoreWarningTotal = useMemo(
    () => cableCoreRows.filter((core) => Number(core.last_loss_db || 0) > 0.2).length,
    [cableCoreRows],
  );
  const selectedRouteLabel = useMemo(
    () => routeOptions.find((option) => option.value === linkRouteId)?.label || "",
    [linkRouteId, routeOptions],
  );
  const editingConnection = useMemo(
    () => existingConnections.find((connection) => connection.id === editingConnectionId) || null,
    [editingConnectionId, existingConnections],
  );
  const linkSelectedRegionId = useMemo(
    () =>
      regionId !== "all"
        ? regionId
        : traceDeviceMap[linkFromDeviceId.trim()]?.region_id || traceDeviceMap[linkToDeviceId.trim()]?.region_id || "",
    [linkFromDeviceId, linkToDeviceId, regionId, traceDeviceMap],
  );
  const selectedFromDevice = traceDeviceMap[linkFromDeviceId.trim()] || null;
  const selectedToDevice = traceDeviceMap[linkToDeviceId.trim()] || null;
  const selectedFromPort = useMemo(
    () => fromPortRows.find((port) => port.id === linkFromPortId) || null,
    [fromPortRows, linkFromPortId],
  );
  const selectedToPort = useMemo(
    () => toPortRows.find((port) => port.id === linkToPortId) || null,
    [toPortRows, linkToPortId],
  );
  const connectionValidation = useMemo(
    () =>
      buildConnectionValidation({
        fromDeviceId: linkFromDeviceId,
        toDeviceId: linkToDeviceId,
        fromPortId: linkFromPortId,
        toPortId: linkToPortId,
        fromPort: selectedFromPort,
        toPort: selectedToPort,
        regionId: linkSelectedRegionId,
        cableDeviceId: linkCableDeviceId,
        coreStart: linkCoreStart,
        coreEnd: linkCoreEnd,
        fiberCount: linkFiberCount,
      }),
    [
      linkCableDeviceId,
      linkCoreEnd,
      linkCoreStart,
      linkFiberCount,
      linkFromDeviceId,
      linkFromPortId,
      linkSelectedRegionId,
      linkToDeviceId,
      linkToPortId,
      selectedFromPort,
      selectedToPort,
    ],
  );
  const hasConnectionBlockingIssues = connectionValidation.some((item) => item.kind === "error");
  const connectionActionLabel = getConnectionActionLabel({
    creating: creatingLink,
    editing: Boolean(editingConnectionId),
    approval: isApprovalMutationRole,
    allowed: canMutateTopology,
  });
  const provisionActionLabel = provisioning
    ? "Processing..."
    : isApprovalMutationRole
      ? "Submit Provision Request"
      : "Provision";

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
    if (traceDirection !== "both") params.set("direction", traceDirection);
    const depth = Number(traceMaxDepth);
    if (Number.isFinite(depth) && depth > 0 && depth !== 12) params.set("max_depth", String(depth));
    const query = params.toString();
    return `/data-management/as-built${query ? `?${query}` : ""}`;
  }, [regionId, traceStartDeviceId, traceEndDeviceId, traceMaxDepth, traceDirection]);

  const runTraceRequest = useCallback(async (input: { startDeviceId: string; endDeviceId?: string; maxDepth: string; regionId: string; direction: string }) => {
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
      if (input.direction && input.direction !== "both") params.set("direction", input.direction);
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

  const loadExistingConnections = useCallback(async (deviceUuid: string) => {
    if (!deviceUuid.trim()) return [] as ExistingPortConnection[];
    const payload = await apiFetch<DeviceTopologySummaryResponse>(
      `/topology/devices/${encodeURIComponent(deviceUuid.trim())}/summary?limit=200`,
      { token },
    );
    return payload.data?.connections?.items || [];
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
      direction: traceDirection,
    });
  }, [isPersonalDeviceMode, traceStartDeviceId, traceEndDeviceId, traceMaxDepth, regionId, traceDirection, runTraceRequest]);

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
      if (!linkFromDeviceId.trim()) {
        setExistingConnections([]);
        setEditingConnectionId("");
        return;
      }
      setLoadingExistingConnections(true);
      try {
        const rows = await loadExistingConnections(linkFromDeviceId);
        if (cancelled) return;
        setExistingConnections(rows);
        setEditingConnectionId((prev) => (rows.some((row) => row.id === prev) ? prev : ""));
      } catch {
        if (!cancelled) {
          setExistingConnections([]);
          setEditingConnectionId("");
        }
      } finally {
        if (!cancelled) setLoadingExistingConnections(false);
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [linkFromDeviceId, loadExistingConnections]);

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
    if (!canMutateTopology) {
      setProvisionError("Role ini hanya bisa membaca topology. Provisioning dilakukan oleh Admin Region atau Superadmin.");
      return;
    }
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
      direction: traceDirection,
    });
  }

  async function refreshExistingConnectionList() {
    if (!linkFromDeviceId.trim()) return;
    try {
      const rows = await loadExistingConnections(linkFromDeviceId);
      setExistingConnections(rows);
    } catch (err) {
      setLinkError((prev) => prev || (err as Error).message || "Connection tersimpan, tetapi daftar connection gagal dimuat ulang.");
    }
  }

  async function handleSaveConnection() {
    if (!canMutateTopology) {
      setLinkError("Role ini hanya bisa membaca topology. Mutasi connection dilakukan oleh Admin Region atau Superadmin.");
      return;
    }
    const blockingIssue = connectionValidation.find((item) => item.kind === "error");
    if (blockingIssue) {
      setLinkError(blockingIssue.message);
      return;
    }
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

    if (!linkSelectedRegionId) {
      setLinkError("Region tidak ditemukan. Pilih region dulu agar link bisa dibuat.");
      return;
    }

    setCreatingLink(true);
    setLinkError("");
    setLinkMessage("");
    try {
      const hasCoreRange = linkCoreStart.trim() !== "" && linkCoreEnd.trim() !== "";
      const parsedFiberCount = Number(linkFiberCount);
      const payload = {
        region_id: linkSelectedRegionId,
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
      };
      const endpoint = editingConnectionId ? `/portConnections/${encodeURIComponent(editingConnectionId)}` : "/portConnections";
      const result = await apiFetch<{ message?: string }>(endpoint, {
        method: editingConnectionId ? "PATCH" : "POST",
        token,
        body: JSON.stringify(payload),
      });
      setLinkMessage(result.message || getConnectionSuccessMessage(Boolean(editingConnectionId), isApprovalMutationRole));
      setTraceStartDeviceId(linkFromDeviceId.trim());
      setDeviceId(linkFromDeviceId.trim());
      setEditingConnectionId("");
      await refreshExistingConnectionList();
    } catch (err) {
      setLinkError((err as Error).message || "Gagal menyimpan connection.");
    } finally {
      setCreatingLink(false);
    }
  }

  function handleEditConnection(connection: ExistingPortConnection) {
    const fromDeviceId = connection.from_port?.device_id || connection.from_device?.id || "";
    const toDeviceId = connection.to_port?.device_id || connection.to_device?.id || "";
    setEditingConnectionId(connection.id);
    setLinkFromDeviceId(fromDeviceId);
    setLinkToDeviceId(toDeviceId);
    setTraceStartDeviceId(fromDeviceId);
    setTraceEndDeviceId(toDeviceId);
    setLinkFromPortId(connection.from_port_id || "");
    setLinkToPortId(connection.to_port_id || "");
    setLinkType(connection.connection_type || "fiber");
    setLinkStatus(connection.status || "active");
    setLinkRouteId(connection.route_id || "__none__");
    setLinkCableDeviceId(connection.cable_device_id || "__none__");
    setLinkCoreStart(connection.core_start == null ? "" : String(connection.core_start));
    setLinkCoreEnd(connection.core_end == null ? "" : String(connection.core_end));
    setLinkFiberCount(connection.fiber_count == null ? "1" : String(connection.fiber_count));
    setLinkNotes(connection.notes || "");
    setLinkError("");
    setLinkMessage("");
  }

  function handleCancelEditConnection() {
    setEditingConnectionId("");
    setLinkMessage("");
    setLinkError("");
  }

  async function handleArchiveConnection(connection: ExistingPortConnection) {
    if (!canMutateTopology) {
      setLinkError("Role ini hanya bisa membaca topology. Archive/delete connection dilakukan oleh Admin Region atau Superadmin.");
      return;
    }
    const label = connection.labels?.title || connection.connection_id || connection.id;
    if (!window.confirm(`Archive/delete connection ${label}?`)) return;
    setCreatingLink(true);
    setLinkError("");
    setLinkMessage("");
    try {
      const result = await apiFetch<{ message?: string }>(`/portConnections/${encodeURIComponent(connection.id)}`, {
        method: "DELETE",
        token,
      });
      setLinkMessage(result.message || (isApprovalMutationRole ? "Connection archive/delete request dikirim ke approval Superadmin." : "Connection archive/delete berhasil diproses."));
      if (editingConnectionId === connection.id) setEditingConnectionId("");
      await refreshExistingConnectionList();
    } catch (err) {
      setLinkError((err as Error).message || "Gagal archive/delete connection.");
    } finally {
      setCreatingLink(false);
    }
  }

  return (
    <ScrollArea className="h-full min-h-0 w-full">
      <div className="min-w-0 space-y-4 pr-0 sm:pr-3">
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
            <div className="grid grid-cols-1 gap-2 lg:grid-cols-12">
              <div className="lg:col-span-4">
                <Combobox
                  value={traceStartDeviceId}
                  onValueChange={(nextValue) => {
                    setTraceStartDeviceId(nextValue || "");
                    setDeviceId(nextValue || "");
                  }}
                  options={withSelectedOptionFallback(traceDeviceOptions, traceStartDeviceId, "Start device")}
                  placeholder={loadingTraceDeviceOptions ? "Memuat device..." : "Start Device"}
                  searchPlaceholder="Cari start device..."
                />
              </div>
              <div className="lg:col-span-4">
                <Combobox
                  value={traceEndDeviceId}
                  onValueChange={(nextValue) => setTraceEndDeviceId(nextValue || "")}
                  options={[{ value: "", label: "Tanpa end device" }, ...withSelectedOptionFallback(traceDeviceOptions, traceEndDeviceId, "End device")]}
                  placeholder={loadingTraceDeviceOptions ? "Memuat device..." : "End Device (opsional)"}
                  searchPlaceholder="Cari end device..."
                />
              </div>
              <div className="lg:col-span-2">
                <Input value={traceMaxDepth} onChange={(event) => setTraceMaxDepth(event.target.value)} placeholder="Max depth" />
              </div>
              <div className="lg:col-span-2">
                <Combobox
                  value={traceDirection}
                  onValueChange={(nextValue) => setTraceDirection(nextValue || "both")}
                  options={[
                    { value: "both", label: "Both" },
                    { value: "upstream", label: "Upstream" },
                    { value: "downstream", label: "Downstream" },
                  ]}
                  placeholder="Direction"
                  searchPlaceholder="Cari direction..."
                />
              </div>
            </div>
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <TechnicalIdStrip startDeviceId={traceStartDeviceId} endDeviceId={traceEndDeviceId} />
              <div className="lg:w-40">
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
                <TraceImpactSummary data={traceResult.data} />
                <TopologyTracePanel data={traceResult.data} />
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
          <Tabs defaultValue="connection" className="min-w-0">
            <TabsList className="grid h-auto w-full grid-cols-1 sm:grid-cols-3">
              <TabsTrigger value="connection" className="min-w-0 whitespace-normal text-xs sm:text-sm">Connection</TabsTrigger>
              <TabsTrigger value="occupancy" className="min-w-0 whitespace-normal text-xs sm:text-sm">Occupancy</TabsTrigger>
              <TabsTrigger value="provisioning" className="min-w-0 whitespace-normal text-xs sm:text-sm">Provisioning</TabsTrigger>
            </TabsList>
            <TabsContent value="connection" className="mt-2">
        <Card>
          <CardHeader className="px-4 py-3">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-base">Connection Wizard (Actual Topology)</CardTitle>
              {initialTool === "connection" ? <Badge variant="secondary">Opened from device detail</Badge> : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-3 px-4 pb-4 pt-0">
            <p className="text-sm text-muted-foreground">
              Buat relasi port-to-port dari device terpilih ke device tujuan. Perubahan tetap divalidasi backend dan mengikuti approval policy sesuai role.
            </p>
            <TopologyRoleNotice role={topologyRole} />
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
                  onClick={() => void handleSaveConnection()}
                  disabled={
                    creatingLink ||
                    !canMutateTopology ||
                    hasConnectionBlockingIssues
                  }
                >
                  {connectionActionLabel}
                </Button>
              </div>
            </div>
            {editingConnection ? (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
                <p className="text-sm text-amber-800">
                  Editing: {editingConnection.labels?.title || editingConnection.connection_id || editingConnection.id}
                </p>
                <Button type="button" variant="outline" size="sm" onClick={handleCancelEditConnection}>
                  Cancel Edit
                </Button>
              </div>
            ) : null}
            <ConnectionPreview
              fromDevice={selectedFromDevice}
              toDevice={selectedToDevice}
              fromPort={selectedFromPort}
              toPort={selectedToPort}
              routeLabel={routeOptions.find((option) => option.value === linkRouteId)?.label || ""}
              cableLabel={selectedCableLabel}
              connectionType={linkType}
              status={linkStatus}
              coreStart={linkCoreStart}
              coreEnd={linkCoreEnd}
              fiberCount={linkFiberCount}
              regionId={linkSelectedRegionId}
              validation={connectionValidation}
            />
            <ExistingConnectionsPanel
              connections={existingConnections}
              loading={loadingExistingConnections}
              editingConnectionId={editingConnectionId}
              busy={creatingLink}
              canMutate={canMutateTopology}
              onEdit={handleEditConnection}
              onArchive={(connection) => void handleArchiveConnection(connection)}
            />
            <TopologyRelationOverview
              fromDevice={selectedFromDevice}
              toDevice={selectedToDevice}
              fromPorts={fromPortRows}
              toPorts={toPortRows}
              connections={existingConnections}
              routeLabel={selectedRouteLabel}
              cableLabel={selectedCableLabel}
              cableCores={cableCoreRows}
              cableCoreStatusCounts={cableCoreStatusCounts}
              cableCoreWarningTotal={cableCoreWarningTotal}
            />
            <DeviceTypeOccupancyPanel
              fromDevice={selectedFromDevice}
              toDevice={selectedToDevice}
              fromPorts={fromPortRows}
              toPorts={toPortRows}
            />
            <SpliceMatrixPanel connections={existingConnections} cableCores={cableCoreRows} selectedCableLabel={selectedCableLabel} />
            {linkError ? <p className="text-sm text-destructive">{linkError}</p> : null}
            {linkMessage ? <p className="text-sm text-emerald-600">{linkMessage}</p> : null}
          </CardContent>
        </Card>
            </TabsContent>

            <TabsContent value="occupancy" className="mt-2">
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
                <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Endpoint Port Occupancy</p>
                  <div className="flex flex-wrap gap-1">
                    <StatusCountBadge label="From used" value={fromPortStatusCounts.used || 0} tone="used" />
                    <StatusCountBadge label="To used" value={toPortStatusCounts.used || 0} tone="used" />
                    <StatusCountBadge label="Idle" value={(fromPortStatusCounts.idle || 0) + (toPortStatusCounts.idle || 0)} />
                  </div>
                </div>
                {loadingFromPorts ? (
                  <p className="text-sm text-muted-foreground">Memuat port...</p>
                ) : !fromPortRows.length ? (
                  <p className="text-sm text-muted-foreground">Belum ada port pada device ini.</p>
                ) : (
                  <PortOccupancyGrid title="From Device" ports={fromPortRows} selectedPortId={linkFromPortId} />
                )}
                {toPortRows.length ? (
                  <div className="mt-3 border-t pt-3">
                    <PortOccupancyGrid title="To Device" ports={toPortRows} selectedPortId={linkToPortId} />
                  </div>
                ) : null}
              </div>
              <div className="rounded-md border bg-muted/20 p-3">
                <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cable Core Matrix</p>
                    <p className="truncate text-xs text-muted-foreground">{selectedCableLabel || "Pilih cable device untuk matrix core."}</p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <StatusCountBadge label="Available" value={cableCoreStatusCounts.available || 0} />
                    <StatusCountBadge label="Used" value={cableCoreStatusCounts.used || 0} tone="used" />
                    <StatusCountBadge label="Reserved" value={cableCoreStatusCounts.reserved || 0} tone="reserved" />
                    <StatusCountBadge label="Warning" value={cableCoreWarningTotal} tone="warning" />
                  </div>
                </div>
                {linkCableDeviceId === "__none__" ? (
                  <p className="text-sm text-muted-foreground">Pilih cable device untuk melihat core occupancy.</p>
                ) : loadingCableCores ? (
                  <p className="text-sm text-muted-foreground">Memuat cores...</p>
                ) : !cableCoreRows.length ? (
                  <p className="text-sm text-muted-foreground">Belum ada core pada cable ini.</p>
                ) : (
                  <CableCoreMatrix cores={cableCoreRows} />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
            </TabsContent>

            <TabsContent value="provisioning" className="mt-2">
        <Card>
          <CardHeader className="px-4 py-3">
            <CardTitle className="text-base">Device Port Provisioning (MVP)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-4 pb-4 pt-0">
            <TopologyRoleNotice role={topologyRole} compact />
            <div className="grid grid-cols-1 gap-2 md:grid-cols-12">
              <div className="md:col-span-5">
                <Combobox
                  value={deviceId}
                  onValueChange={(nextValue) => setDeviceId(nextValue || "")}
                  options={withSelectedOptionFallback(traceDeviceOptions, deviceId, "Device")}
                  placeholder={loadingTraceDeviceOptions ? "Memuat device..." : "Pilih device"}
                  searchPlaceholder="Cari device..."
                />
              </div>
              <div className="md:col-span-3">
                <Input value={profileName} onChange={(event) => setProfileName(event.target.value)} placeholder="Profile name (default)" />
              </div>
              <div className="flex flex-col gap-2 sm:flex-row md:col-span-4 md:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto md:min-w-28"
                  disabled={provisioning || !canMutateTopology || !deviceId.trim()}
                  onClick={() => void handleProvision(true)}
                >
                  Dry Run
                </Button>
                <Button
                  type="button"
                  className="w-full sm:w-auto md:min-w-28"
                  disabled={provisioning || !canMutateTopology || !deviceId.trim()}
                  onClick={() => void handleProvision(false)}
                >
                  {provisionActionLabel}
                </Button>
              </div>
            </div>

            {provisionError ? <p className="text-sm text-destructive">{provisionError}</p> : null}
            {provisionResult ? (
              <ProvisionResultSummary
                result={provisionResult}
                device={traceDeviceMap[deviceId] || null}
              />
            ) : null}
          </CardContent>
        </Card>
            </TabsContent>
          </Tabs>
        ) : null}

      </div>
    </ScrollArea>
  );
}

function normalizeTopologyRole(role: string) {
  if (role === "admin") return "superadmin";
  if (role === "user_all_region") return "adminregion";
  if (role === "user_region") return "validator";
  return role;
}

function getConnectionActionLabel({
  creating,
  editing,
  approval,
  allowed,
}: {
  creating: boolean;
  editing: boolean;
  approval: boolean;
  allowed: boolean;
}) {
  if (!allowed) return "Read Only";
  if (creating) return approval ? "Submitting..." : "Saving...";
  if (editing) return approval ? "Submit Update Request" : "Update Connection";
  return approval ? "Submit Create Request" : "Create Connection";
}

function getConnectionSuccessMessage(editing: boolean, approval: boolean) {
  if (approval) {
    return editing
      ? "Connection update request dikirim ke approval Superadmin."
      : "Connection create request dikirim ke approval Superadmin.";
  }
  return editing ? "Connection update berhasil diproses." : "Connection create berhasil diproses.";
}

function TopologyRoleNotice({ role, compact = false }: { role: string; compact?: boolean }) {
  const copy =
    role === "superadmin"
      ? {
          title: "Superadmin action",
          description: "Perubahan topology diterapkan langsung ke inventory final.",
        }
      : role === "adminregion"
        ? {
            title: "Admin Region request",
            description: "Create, update, dan archive topology dikirim ke approval Superadmin.",
          }
        : {
            title: "Read-only access",
            description: "Role ini hanya bisa melihat trace, connection, dan summary topology.",
          };

  return (
    <div className={`rounded-md border bg-muted/20 ${compact ? "px-3 py-2" : "px-3 py-3"}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{copy.title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{copy.description}</p>
    </div>
  );
}

function TraceImpactSummary({ data }: { data: TopologyTraceResponse["data"] }) {
  const nodes = data.graph.nodes || [];
  const edges = data.graph.edges || [];
  const typeCounts = nodes.reduce<Record<string, number>>((acc, node) => {
    const key = String(node.device_type_key || "UNKNOWN").toUpperCase();
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const edgesWithCore = edges.filter((edge) => edge.core_start != null || edge.core_end != null);
  const totalFiber = edges.reduce((sum, edge) => sum + Number(edge.fiber_count || edge.fiber_cores?.total || 0), 0);
  const usedFiber = edges.reduce((sum, edge) => sum + Number(edge.fiber_cores?.used || 0), 0);
  const lossWarnings = edges.reduce((sum, edge) => sum + Number((edge.fiber_cores as { loss_warnings?: number } | undefined)?.loss_warnings || 0), 0);
  const likelyCustomerFacing = (typeCounts.ODP || 0) + (typeCounts.ONT || 0);
  const warnings = data.trace.warnings || [];
  const direction = data.request.direction || "both";

  return (
    <Card>
      <CardHeader className="px-3 py-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-sm">Impact Summary</CardTitle>
          <Badge variant="outline">Direction: {direction}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 px-3 pb-3 pt-0">
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          <ImpactMetric label="Affected Devices" value={nodes.length} />
          <ImpactMetric label="Affected ODP/ONT" value={likelyCustomerFacing} />
          <ImpactMetric label="Connections" value={edges.length} />
          <ImpactMetric label="Core Links" value={edgesWithCore.length} />
          <ImpactMetric label="Fiber Total" value={totalFiber} />
          <ImpactMetric label="Fiber Used" value={usedFiber} />
          <ImpactMetric label="Loss Warning" value={lossWarnings} danger />
          <ImpactMetric label="Hop" value={data.trace.hop_count || 0} />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(typeCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([type, count]) => (
              <Badge key={type} variant="secondary">
                {type}: {count}
              </Badge>
            ))}
          {!Object.keys(typeCounts).length ? <Badge variant="outline">No device reached</Badge> : null}
        </div>
        {warnings.length ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {warnings.slice(0, 3).map((warning, index) => (
              <p key={`${warning}-${index}`}>{warning}</p>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ProvisionResultSummary({
  result,
  device,
}: {
  result: ProvisionResponse;
  device: DeviceLookupItem | null;
}) {
  const isDryRun = result.data.created_count == null;
  const changedPortTotal = isDryRun
    ? Number(result.data.create_count || 0)
    : Number(result.data.created_count || 0);
  const missingPortIndexes = result.data.missing_port_indexes || [];

  return (
    <div className="min-w-0 rounded-md border bg-muted/30 p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold">{formatDeviceLabel(device)}</p>
          <p className="mt-1 text-sm text-muted-foreground">{result.message}</p>
        </div>
        <Badge variant={isDryRun ? "outline" : "secondary"}>{isDryRun ? "Dry Run" : "Applied"}</Badge>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
        <ProvisionMetric label="Existing Ports" value={Number(result.data.existing_port_count || 0)} />
        <ProvisionMetric label={isDryRun ? "Ports To Create" : "Ports Created"} value={changedPortTotal} />
        <ProvisionMetric label="Missing Ports" value={missingPortIndexes.length} />
        <div className="min-w-0 rounded-md border bg-background p-2">
          <p className="text-[10px] font-medium uppercase text-muted-foreground">Profile</p>
          <p className="mt-1 truncate text-sm font-semibold">{result.data.profile_name || "default"}</p>
        </div>
      </div>
      {missingPortIndexes.length ? (
        <div className="mt-3 flex min-w-0 flex-wrap gap-1.5">
          {missingPortIndexes.slice(0, 24).map((portIndex) => (
            <Badge key={portIndex} variant="outline">Port {portIndex}</Badge>
          ))}
          {missingPortIndexes.length > 24 ? (
            <Badge variant="secondary">+{missingPortIndexes.length - 24} lainnya</Badge>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ProvisionMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border bg-background p-2">
      <p className="text-[10px] font-medium uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold leading-none">{Number.isFinite(value) ? value : 0}</p>
    </div>
  );
}

function TechnicalIdStrip({ startDeviceId, endDeviceId }: { startDeviceId: string; endDeviceId: string }) {
  if (!startDeviceId.trim() && !endDeviceId.trim()) return null;
  return (
    <div className="flex min-w-0 flex-wrap gap-1.5 text-xs text-muted-foreground">
      {startDeviceId.trim() ? <Badge variant="outline">Start ID {shortId(startDeviceId)}</Badge> : null}
      {endDeviceId.trim() ? <Badge variant="outline">End ID {shortId(endDeviceId)}</Badge> : null}
    </div>
  );
}

function ImpactMetric({ label, value, danger = false }: { label: string; value: number; danger?: boolean }) {
  return (
    <div className="rounded-md border bg-background p-2">
      <p className="truncate text-[10px] font-medium uppercase text-muted-foreground">{label}</p>
      <p className={`mt-1 text-lg font-semibold leading-none ${danger && value > 0 ? "text-destructive" : ""}`}>
        {Number.isFinite(value) ? value : 0}
      </p>
    </div>
  );
}

function ConnectionPreview({
  fromDevice,
  toDevice,
  fromPort,
  toPort,
  routeLabel,
  cableLabel,
  connectionType,
  status,
  coreStart,
  coreEnd,
  fiberCount,
  regionId,
  validation,
}: {
  fromDevice: DeviceLookupItem | null;
  toDevice: DeviceLookupItem | null;
  fromPort: DevicePortItem | null;
  toPort: DevicePortItem | null;
  routeLabel: string;
  cableLabel: string;
  connectionType: string;
  status: string;
  coreStart: string;
  coreEnd: string;
  fiberCount: string;
  regionId: string;
  validation: Array<{ kind: "error" | "warning"; message: string }>;
}) {
  const errors = validation.filter((item) => item.kind === "error");
  const warnings = validation.filter((item) => item.kind === "warning");

  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold">Connection Preview</p>
          <p className="text-xs text-muted-foreground">Review relasi port-to-port sebelum masuk topology inventory.</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant={errors.length ? "destructive" : "secondary"}>{errors.length ? "Perlu diperbaiki" : "Siap dibuat"}</Badge>
          {warnings.length ? <Badge variant="outline">{warnings.length} warning</Badge> : null}
        </div>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
        <PreviewCell
          label="From"
          value={formatDeviceLabel(fromDevice)}
          detail={formatPortLabel(fromPort)}
        />
        <PreviewCell
          label="To"
          value={formatDeviceLabel(toDevice)}
          detail={formatPortLabel(toPort)}
        />
        <PreviewCell
          label="Connection"
          value={`${connectionType || "fiber"} / ${status || "active"}`}
          detail={`Region: ${regionId || "-"}`}
        />
        <PreviewCell
          label="Cable & Core"
          value={cableLabel || "Tanpa cable device"}
          detail={`Core ${coreStart || "-"}-${coreEnd || "-"} | Fiber ${fiberCount || "-"}`}
        />
        <PreviewCell
          label="Route"
          value={routeLabel || "Tanpa route"}
          detail="Route opsional untuk konteks jalur"
        />
      </div>
      {validation.length ? (
        <div className="mt-3 space-y-1.5">
          {validation.map((item, index) => (
            <p
              key={`${item.kind}-${index}-${item.message}`}
              className={`rounded-md border px-2 py-1.5 text-xs ${
                item.kind === "error"
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-amber-200 bg-amber-50 text-amber-800"
              }`}
            >
              {item.message}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function PreviewCell({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="min-w-0 rounded-md border bg-background px-3 py-2">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold">{value || "-"}</p>
      <p className="mt-1 truncate text-xs text-muted-foreground">{detail || "-"}</p>
    </div>
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

function PortOccupancyGrid({
  title,
  ports,
  selectedPortId,
}: {
  title: string;
  ports: DevicePortItem[];
  selectedPortId: string;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-medium">{title}</p>
        <Badge variant="outline">{ports.length} port</Badge>
      </div>
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 md:grid-cols-4">
        {ports.slice(0, 24).map((port) => {
          const selected = port.id === selectedPortId;
          return (
            <div
              key={port.id}
              className={`min-w-0 rounded-md border bg-background px-2 py-1.5 text-xs ${
                selected ? "border-primary ring-1 ring-primary/30" : ""
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-medium">{port.port_label || `Port ${port.port_index || "-"}`}</span>
                <PortStatusDot status={port.status} />
              </div>
              <p className="mt-1 truncate text-[11px] text-muted-foreground">{port.status || "idle"}</p>
            </div>
          );
        })}
      </div>
      {ports.length > 24 ? (
        <p className="mt-2 text-xs text-muted-foreground">Menampilkan 24 dari {ports.length} port.</p>
      ) : null}
    </div>
  );
}

function CableCoreMatrix({ cores }: { cores: FiberCoreItem[] }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {cores.slice(0, 96).map((core) => {
          const lossWarning = Number(core.last_loss_db || 0) > 0.2;
          return (
            <div key={core.id} className="min-w-0 rounded-md border bg-background p-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-semibold">Core {core.core_no || "-"}</span>
                <CoreStatusBadge status={core.status} warning={lossWarning} />
              </div>
              <div className="mt-2 flex items-center gap-2">
                <ColorSwatch color={core.tube_color_hex || "#CBD5E1"} />
                <span className="truncate text-[11px] text-muted-foreground">
                  Tube {core.tube_no || "-"} {core.tube_color_name || ""}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <ColorSwatch color={core.color_hex || "#94A3B8"} />
                <span className="truncate text-[11px] text-muted-foreground">{core.color_name || "Core color"}</span>
              </div>
              {core.last_loss_db != null ? (
                <p className={`mt-1 truncate text-[11px] ${lossWarning ? "text-amber-700" : "text-muted-foreground"}`}>
                  Loss {core.last_loss_db} dB
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
      {cores.length > 96 ? (
        <p className="text-xs text-muted-foreground">Menampilkan 96 dari {cores.length} core. Filter tube/detail akan dilanjutkan di Core Management.</p>
      ) : null}
    </div>
  );
}

function TopologyRelationOverview({
  fromDevice,
  toDevice,
  fromPorts,
  toPorts,
  connections,
  routeLabel,
  cableLabel,
  cableCores,
  cableCoreStatusCounts,
  cableCoreWarningTotal,
}: {
  fromDevice: DeviceLookupItem | null;
  toDevice: DeviceLookupItem | null;
  fromPorts: DevicePortItem[];
  toPorts: DevicePortItem[];
  connections: ExistingPortConnection[];
  routeLabel: string;
  cableLabel: string;
  cableCores: FiberCoreItem[];
  cableCoreStatusCounts: Record<string, number>;
  cableCoreWarningTotal: number;
}) {
  const assignmentRows = [...fromPorts, ...toPorts].filter((port) => port.customer_id || port.customer_name || port.customer_number || port.ont_device_id);

  return (
    <div className="rounded-lg border bg-muted/10 p-3">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold">Topology Relation Overview</p>
          <p className="text-xs text-muted-foreground">Ringkasan device, port, core, route, dan customer/ONT assignment dari context connection saat ini.</p>
        </div>
        <Badge variant="outline">{connections.length} connection</Badge>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <DeviceOccupancyCard title="From Device" device={fromDevice} ports={fromPorts} />
        <DeviceOccupancyCard title="To Device" device={toDevice} ports={toPorts} />
        <div className="rounded-md border bg-background p-3">
          <p className="text-[10px] font-medium uppercase text-muted-foreground">Route & Cable</p>
          <div className="mt-2 space-y-2 text-sm">
            <RelationLine label="Route" value={routeLabel || "-"} />
            <RelationLine label="Cable" value={cableLabel || "-"} />
            <RelationLine label="Core total" value={String(cableCores.length)} />
            <div className="flex flex-wrap gap-1 pt-1">
              <StatusCountBadge label="Available" value={cableCoreStatusCounts.available || 0} />
              <StatusCountBadge label="Used" value={cableCoreStatusCounts.used || 0} tone="used" />
              <StatusCountBadge label="Reserved" value={cableCoreStatusCounts.reserved || 0} tone="reserved" />
              <StatusCountBadge label="Warning" value={cableCoreWarningTotal} tone="warning" />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-md border bg-background p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[10px] font-medium uppercase text-muted-foreground">Customer / ONT Assignment</p>
          <Badge variant={assignmentRows.length ? "secondary" : "outline"}>{assignmentRows.length} assignment</Badge>
        </div>
        {assignmentRows.length ? (
          <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
            {assignmentRows.slice(0, 9).map((port) => (
              <div key={port.id} className="min-w-0 rounded-md border bg-muted/10 p-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium">{port.port_label || `Port ${port.port_index || "-"}`}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{customerAssignmentLabel(port)}</p>
                  </div>
                  <Badge variant="outline" className="shrink-0 text-[10px]">
                    {port.status || "idle"}
                  </Badge>
                </div>
                <p className="mt-1 truncate text-[11px] text-muted-foreground">ONT: {port.ont_device_id ? "Assigned" : "-"}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">Belum ada assignment customer/ONT pada endpoint yang dipilih.</p>
        )}
        {assignmentRows.length > 9 ? (
          <p className="mt-2 text-xs text-muted-foreground">Menampilkan 9 dari {assignmentRows.length} assignment.</p>
        ) : null}
      </div>
    </div>
  );
}

function DeviceTypeOccupancyPanel({
  fromDevice,
  toDevice,
  fromPorts,
  toPorts,
}: {
  fromDevice: DeviceLookupItem | null;
  toDevice: DeviceLookupItem | null;
  fromPorts: DevicePortItem[];
  toPorts: DevicePortItem[];
}) {
  const entries = [
    { role: "From", device: fromDevice, ports: fromPorts },
    { role: "To", device: toDevice, ports: toPorts },
  ];
  const targetTypes = ["ODP", "ODC", "OLT"];

  return (
    <div className="rounded-lg border bg-background p-3">
      <div className="mb-3 flex flex-col gap-1">
        <p className="text-sm font-semibold">ODP / ODC / OLT Occupancy</p>
        <p className="text-xs text-muted-foreground">Occupancy dibaca dari endpoint device yang sedang dipilih di Connection Wizard.</p>
      </div>
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-3">
        {targetTypes.map((deviceType) => {
          const matched = entries.filter((entry) => String(entry.device?.device_type_key || "").toUpperCase() === deviceType);
          return (
            <div key={deviceType} className="rounded-md border bg-muted/10 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold">{deviceType}</p>
                <Badge variant={matched.length ? "secondary" : "outline"}>{matched.length} device</Badge>
              </div>
              {matched.length ? (
                <div className="mt-2 space-y-2">
                  {matched.map((entry) => (
                    <DeviceTypeOccupancyRow
                      key={`${entry.role}-${entry.device?.id || deviceType}`}
                      role={entry.role}
                      device={entry.device}
                      ports={entry.ports}
                    />
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">Belum ada {deviceType} pada endpoint yang dipilih.</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SpliceMatrixPanel({
  connections,
  cableCores,
  selectedCableLabel,
}: {
  connections: ExistingPortConnection[];
  cableCores: FiberCoreItem[];
  selectedCableLabel: string;
}) {
  const mappedConnections = connections.filter((connection) => connection.core_start != null || connection.core_end != null);
  const coreByNumber = new Map(cableCores.map((core) => [core.core_no, core]));

  return (
    <div className="rounded-lg border bg-background p-3">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold">Splice Matrix</p>
          <p className="text-xs text-muted-foreground">Read-only matrix dari core range connection ke endpoint port/splitter.</p>
        </div>
        <Badge variant={mappedConnections.length ? "secondary" : "outline"}>{mappedConnections.length} mapped connection</Badge>
      </div>

      {mappedConnections.length ? (
        <div className="space-y-2">
          {mappedConnections.slice(0, 8).map((connection) => (
            <SpliceMatrixConnectionRow
              key={connection.id}
              connection={connection}
              coreByNumber={coreByNumber}
              selectedCableLabel={selectedCableLabel}
            />
          ))}
          {mappedConnections.length > 8 ? (
            <p className="text-xs text-muted-foreground">Menampilkan 8 dari {mappedConnections.length} mapped connection.</p>
          ) : null}
        </div>
      ) : (
        <p className="rounded-md border border-dashed bg-muted/10 px-3 py-2 text-sm text-muted-foreground">
          Belum ada connection dengan core range. Pilih cable dan isi core start/end saat membuat connection untuk menampilkan matrix.
        </p>
      )}
    </div>
  );
}

function SpliceMatrixConnectionRow({
  connection,
  coreByNumber,
  selectedCableLabel,
}: {
  connection: ExistingPortConnection;
  coreByNumber: Map<number | null | undefined, FiberCoreItem>;
  selectedCableLabel: string;
}) {
  const coreStart = connection.core_start ?? connection.core_end ?? null;
  const coreEnd = connection.core_end ?? connection.core_start ?? null;
  const cores =
    coreStart != null && coreEnd != null && coreEnd >= coreStart
      ? Array.from({ length: Math.min(coreEnd - coreStart + 1, 12) }, (_, index) => coreStart + index)
      : [];
  const fromLabel = connection.labels?.from || formatDeviceLabel(connection.from_device || null);
  const toLabel = connection.labels?.to || formatDeviceLabel(connection.to_device || null);
  const cableLabel = connection.labels?.cable || selectedCableLabel || formatDeviceLabel(connection.cable_device || null);

  return (
    <div className="rounded-md border bg-muted/10 p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{connection.labels?.title || connection.connection_id || connection.id}</p>
          <p className="truncate text-xs text-muted-foreground">{cableLabel}</p>
        </div>
        <div className="flex flex-wrap gap-1">
          <Badge variant="outline">Core {formatConnectionCoreRange(connection)}</Badge>
          <Badge variant="secondary">{connection.status || "active"}</Badge>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-[1fr_auto_1fr] lg:items-stretch">
        <SpliceEndpointBox title="Input / From" primary={fromLabel} secondary={formatPortLabel(connection.from_port || null)} />
        <div className="grid grid-cols-2 gap-1 rounded-md border bg-background p-2 sm:grid-cols-4 lg:w-56">
          {cores.length ? (
            cores.map((coreNo) => {
              const core = coreByNumber.get(coreNo);
              return (
                <div key={coreNo} className="rounded border bg-muted/10 px-2 py-1 text-center">
                  <div className="mx-auto mb-1 size-3 rounded-full border" style={{ backgroundColor: core?.color_hex || "#CBD5E1" }} />
                  <p className="text-[10px] font-medium">Core {coreNo}</p>
                  <p className="truncate text-[10px] text-muted-foreground">{core?.color_name || "n/a"}</p>
                </div>
              );
            })
          ) : (
            <p className="col-span-2 text-xs text-muted-foreground sm:col-span-4">Core range belum lengkap.</p>
          )}
        </div>
        <SpliceEndpointBox title="Output / To" primary={toLabel} secondary={formatPortLabel(connection.to_port || null)} />
      </div>
    </div>
  );
}

function SpliceEndpointBox({ title, primary, secondary }: { title: string; primary: string; secondary: string }) {
  return (
    <div className="rounded-md border bg-background p-3">
      <p className="text-[10px] font-medium uppercase text-muted-foreground">{title}</p>
      <p className="mt-1 truncate text-sm font-semibold">{primary}</p>
      <p className="truncate text-xs text-muted-foreground">{secondary}</p>
    </div>
  );
}

function DeviceTypeOccupancyRow({
  role,
  device,
  ports,
}: {
  role: string;
  device: DeviceLookupItem | null;
  ports: DevicePortItem[];
}) {
  const statusCounts = countByStatus(ports);
  const assigned = ports.filter(hasPortAssignment).length;
  const occupied = ports.filter((port) => {
    const status = String(port.status || "idle").toLowerCase();
    return status === "used" || status === "reserved" || hasPortAssignment(port);
  }).length;
  const percent = ports.length ? Math.round((occupied / ports.length) * 100) : 0;

  return (
    <div className="rounded-md border bg-background p-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium">{formatDeviceLabel(device)}</p>
          <p className="text-[11px] text-muted-foreground">{role} endpoint</p>
        </div>
        <Badge variant="outline">{percent}%</Badge>
      </div>
      <div className="mt-2 grid grid-cols-4 gap-1 text-center">
        <MiniOccupancyMetric label="Port" value={ports.length} />
        <MiniOccupancyMetric label="Used" value={statusCounts.used || 0} />
        <MiniOccupancyMetric label="Idle" value={statusCounts.idle || 0} />
        <MiniOccupancyMetric label="Assign" value={assigned} />
      </div>
    </div>
  );
}

function MiniOccupancyMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border bg-muted/10 px-1 py-1">
      <p className="text-[10px] leading-none text-muted-foreground">{label}</p>
      <p className="mt-1 text-xs font-semibold">{value}</p>
    </div>
  );
}

function DeviceOccupancyCard({
  title,
  device,
  ports,
}: {
  title: string;
  device: DeviceLookupItem | null;
  ports: DevicePortItem[];
}) {
  const statusCounts = countByStatus(ports);
  const assignedTotal = ports.filter(hasPortAssignment).length;
  const usedTotal = statusCounts.used || 0;
  const occupiedTotal = ports.filter((port) => {
    const status = String(port.status || "idle").toLowerCase();
    return status === "used" || hasPortAssignment(port);
  }).length;
  const occupancyPercent = ports.length ? Math.round((occupiedTotal / ports.length) * 100) : 0;

  return (
    <div className="rounded-md border bg-background p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase text-muted-foreground">{title}</p>
          <p className="truncate text-sm font-semibold">{formatDeviceLabel(device)}</p>
          <p className="text-xs text-muted-foreground">{String(device?.device_type_key || "DEVICE").toUpperCase()}</p>
        </div>
        <Badge variant={ports.length ? "secondary" : "outline"}>{occupancyPercent}%</Badge>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <RelationMetric label="Ports" value={ports.length} />
        <RelationMetric label="Used" value={usedTotal} />
        <RelationMetric label="Idle" value={statusCounts.idle || 0} />
        <RelationMetric label="Assigned" value={assignedTotal} />
      </div>
    </div>
  );
}

function RelationMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border bg-muted/10 px-2 py-1.5">
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}

function RelationLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="shrink-0 text-xs text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate text-right text-xs font-medium">{value}</span>
    </div>
  );
}

function ExistingConnectionsPanel({
  connections,
  loading,
  editingConnectionId,
  busy,
  canMutate,
  onEdit,
  onArchive,
}: {
  connections: ExistingPortConnection[];
  loading: boolean;
  editingConnectionId: string;
  busy: boolean;
  canMutate: boolean;
  onEdit: (connection: ExistingPortConnection) => void;
  onArchive: (connection: ExistingPortConnection) => void;
}) {
  return (
    <div className="rounded-lg border bg-background p-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">Existing Connections</p>
          <p className="text-xs text-muted-foreground">Connection aktif dari device awal bisa diedit atau dibatalkan dari sini.</p>
        </div>
        <Badge variant={connections.length ? "secondary" : "outline"}>{connections.length} connection</Badge>
      </div>
      {loading ? (
        <p className="text-sm text-muted-foreground">Memuat connection...</p>
      ) : connections.length === 0 ? (
        <p className="rounded-md border border-dashed bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
          Belum ada connection untuk device awal ini.
        </p>
      ) : (
        <div className="space-y-2">
          {connections.slice(0, 10).map((connection) => {
            const isEditing = connection.id === editingConnectionId;
            const title = connection.labels?.title || connection.connection_id || connection.id;
            const fromLabel = connection.labels?.from || formatDeviceLabel(connection.from_device || null);
            const toLabel = connection.labels?.to || formatDeviceLabel(connection.to_device || null);
            const cableLabel = connection.labels?.cable || formatDeviceLabel(connection.cable_device || null);
            const coreRange = connection.labels?.core_range || formatConnectionCoreRange(connection);

            return (
              <div
                key={connection.id}
                className={`rounded-md border px-3 py-2 ${
                  isEditing ? "border-amber-300 bg-amber-50/70" : "bg-muted/10"
                }`}
              >
                <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold">{title}</p>
                      <Badge variant="outline">{connection.status || "active"}</Badge>
                      <Badge variant="secondary">{connection.connection_type || "fiber"}</Badge>
                      {isEditing ? <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">editing</Badge> : null}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {fromLabel} &rarr; {toLabel}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Cable {cableLabel} {coreRange !== "-" ? `| Core ${coreRange}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => onEdit(connection)} disabled={busy || !canMutate}>
                      Edit
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => onArchive(connection)} disabled={busy || !canMutate}>
                      Archive/Delete
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
          {connections.length > 10 ? (
            <p className="text-xs text-muted-foreground">Menampilkan 10 dari {connections.length} connection.</p>
          ) : null}
        </div>
      )}
    </div>
  );
}

function StatusCountBadge({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "used" | "reserved" | "warning";
}) {
  const className =
    tone === "used"
      ? "border-blue-200 bg-blue-50 text-blue-700"
      : tone === "reserved"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : tone === "warning"
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-emerald-200 bg-emerald-50 text-emerald-700";

  return (
    <Badge variant="outline" className={className}>
      {label}: {value}
    </Badge>
  );
}

function CoreStatusBadge({ status, warning }: { status?: string | null; warning: boolean }) {
  if (warning) {
    return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">loss</Badge>;
  }
  const normalized = String(status || "available").toLowerCase();
  const className =
    normalized === "used"
      ? "bg-blue-100 text-blue-800 hover:bg-blue-100"
      : normalized === "reserved"
        ? "bg-amber-100 text-amber-800 hover:bg-amber-100"
        : normalized === "damaged"
          ? "bg-red-100 text-red-800 hover:bg-red-100"
          : normalized === "inactive"
            ? "bg-slate-100 text-slate-700 hover:bg-slate-100"
            : "bg-emerald-100 text-emerald-800 hover:bg-emerald-100";

  return <Badge className={className}>{normalized}</Badge>;
}

function PortStatusDot({ status }: { status?: string | null }) {
  const normalized = String(status || "idle").toLowerCase();
  const className =
    normalized === "used"
      ? "bg-blue-500"
      : normalized === "reserved"
        ? "bg-amber-500"
        : normalized === "down" || normalized === "maintenance"
          ? "bg-red-500"
          : "bg-emerald-500";

  return <span className={`size-2.5 shrink-0 rounded-full ${className}`} />;
}

function ColorSwatch({ color }: { color: string }) {
  return <span className="size-3 shrink-0 rounded-full border" style={{ backgroundColor: color }} />;
}

function hasPortAssignment(port: DevicePortItem) {
  const { customer_id: assignedCustomerId, ont_device_id: assignedOntDeviceId } = port;
  return Boolean(assignedCustomerId || assignedOntDeviceId || port.customer_name || port.customer_number);
}

function customerAssignmentLabel(port: DevicePortItem) {
  const { customer_id: assignedCustomerId } = port;
  return port.customer_name || port.customer_number || (assignedCustomerId ? "Customer assigned" : "Customer belum ada");
}

function countByStatus<T extends { status?: string | null }>(items: T[]) {
  return items.reduce<Record<string, number>>((acc, item) => {
    const key = String(item.status || "idle").toLowerCase();
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function buildConnectionValidation({
  fromDeviceId,
  toDeviceId,
  fromPortId,
  toPortId,
  fromPort,
  toPort,
  regionId,
  cableDeviceId,
  coreStart,
  coreEnd,
  fiberCount,
}: {
  fromDeviceId: string;
  toDeviceId: string;
  fromPortId: string;
  toPortId: string;
  fromPort: DevicePortItem | null;
  toPort: DevicePortItem | null;
  regionId: string;
  cableDeviceId: string;
  coreStart: string;
  coreEnd: string;
  fiberCount: string;
}) {
  const issues: Array<{ kind: "error" | "warning"; message: string }> = [];
  const hasCoreStart = coreStart.trim() !== "";
  const hasCoreEnd = coreEnd.trim() !== "";
  const parsedCoreStart = Number(coreStart);
  const parsedCoreEnd = Number(coreEnd);
  const parsedFiberCount = Number(fiberCount);

  if (!fromDeviceId.trim()) issues.push({ kind: "error", message: "From device wajib dipilih." });
  if (!toDeviceId.trim()) issues.push({ kind: "error", message: "To device wajib dipilih." });
  if (fromDeviceId.trim() && toDeviceId.trim() && fromDeviceId.trim() === toDeviceId.trim()) {
    issues.push({ kind: "error", message: "From device dan To device tidak boleh sama." });
  }
  if (!fromPortId.trim()) issues.push({ kind: "error", message: "From port wajib dipilih." });
  if (!toPortId.trim()) issues.push({ kind: "error", message: "To port wajib dipilih." });
  if (fromPortId.trim() && toPortId.trim() && fromPortId.trim() === toPortId.trim()) {
    issues.push({ kind: "error", message: "From port dan To port tidak boleh sama." });
  }
  if (!regionId) issues.push({ kind: "error", message: "Region tidak ditemukan. Pilih region atau device dengan region yang jelas." });
  if (hasCoreStart !== hasCoreEnd) {
    issues.push({ kind: "error", message: "Core start dan Core end harus diisi berpasangan." });
  }
  if ((hasCoreStart || hasCoreEnd) && cableDeviceId === "__none__") {
    issues.push({ kind: "error", message: "Core range membutuhkan Cable Device." });
  }
  if (hasCoreStart && (!Number.isInteger(parsedCoreStart) || parsedCoreStart <= 0)) {
    issues.push({ kind: "error", message: "Core start harus angka bulat positif." });
  }
  if (hasCoreEnd && (!Number.isInteger(parsedCoreEnd) || parsedCoreEnd <= 0)) {
    issues.push({ kind: "error", message: "Core end harus angka bulat positif." });
  }
  if (hasCoreStart && hasCoreEnd && Number.isFinite(parsedCoreStart) && Number.isFinite(parsedCoreEnd) && parsedCoreStart > parsedCoreEnd) {
    issues.push({ kind: "error", message: "Core start tidak boleh lebih besar dari Core end." });
  }
  if (fiberCount.trim() && (!Number.isInteger(parsedFiberCount) || parsedFiberCount <= 0)) {
    issues.push({ kind: "error", message: "Fiber count harus angka bulat positif." });
  }
  if (fromPort && !["idle", "reserved"].includes(String(fromPort.status || "idle").toLowerCase())) {
    issues.push({ kind: "warning", message: `From port saat ini berstatus ${fromPort.status}. Backend tetap akan memvalidasi policy koneksi.` });
  }
  if (toPort && !["idle", "reserved"].includes(String(toPort.status || "idle").toLowerCase())) {
    issues.push({ kind: "warning", message: `To port saat ini berstatus ${toPort.status}. Backend tetap akan memvalidasi policy koneksi.` });
  }

  return issues;
}

function formatDeviceLabel(device: DeviceLookupItem | null) {
  if (!device) return "-";
  return device.device_name || device.device_id || device.id || "-";
}

function formatPortLabel(port: DevicePortItem | null) {
  if (!port) return "-";
  return `${port.port_label || `Port ${port.port_index || "-"}`} (${port.status || "idle"})`;
}

function withSelectedOptionFallback(options: Array<{ value: string; label: string }>, value: string, label: string) {
  if (!value.trim() || options.some((option) => option.value === value)) return options;
  return [{ value, label: `${label} terpilih (${shortId(value)})` }, ...options];
}

function shortId(value: string) {
  const normalized = value.trim();
  if (!normalized) return "-";
  return normalized.length > 8 ? normalized.slice(0, 8) : normalized;
}

function formatConnectionCoreRange(connection: ExistingPortConnection) {
  if (connection.core_start == null && connection.core_end == null) return "-";
  if (connection.core_start == null) return `-${connection.core_end}`;
  if (connection.core_end == null || connection.core_start === connection.core_end) return String(connection.core_start);
  return `${connection.core_start}-${connection.core_end}`;
}
