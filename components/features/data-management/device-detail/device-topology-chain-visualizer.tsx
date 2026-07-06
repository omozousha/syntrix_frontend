"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Cable, AlertTriangle, RefreshCw, Cpu, Server, Network } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";

type NodeData = {
  id: string;
  device_id: string;
  device_name: string | null;
  device_type_key: string;
  status: string;
  used_core?: number | null;
  capacity_core?: number | null;
};

type EdgeData = {
  id: string;
  from_device_id: string;
  to_device_id: string;
  connection_type: string;
  cable_device_id: string | null;
  core_start: number | null;
  core_end: number | null;
  fiber_count: number | null;
  labels?: {
    cable?: string | null;
    core_range?: string | null;
  } | null;
};

type TraceResponse = {
  graph: {
    nodes: NodeData[];
    edges: EdgeData[];
  };
};

type DeviceTopologyChainVisualizerProps = {
  deviceId: string;
  token: string | null;
};

export function DeviceTopologyChainVisualizer({ deviceId, token }: DeviceTopologyChainVisualizerProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [graph, setGraph] = useState<{ nodes: NodeData[]; edges: EdgeData[] }>({ nodes: [], edges: [] });

  async function loadTraceData() {
    if (!token || !deviceId) return;
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch<TraceResponse>(
        `/topology/trace?device_id=${encodeURIComponent(deviceId)}&direction=both&max_depth=6`,
        { token }
      );
      if (res && res.graph) {
        setGraph(res.graph);
      } else {
        throw new Error("Format respons trace tidak valid.");
      }
    } catch (err) {
      setError((err as Error).message || "Gagal memuat visualisasi rantai koneksi.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadTraceData();
  }, [deviceId, token]);

  const otbNodes = graph.nodes.filter((n) => n.device_type_key === "OTB");
  const odcNodes = graph.nodes.filter((n) => n.device_type_key === "ODC");
  const odpNodes = graph.nodes.filter((n) => n.device_type_key === "ODP");

  const totalConnected = graph.nodes.length;

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader className="px-4 py-4">
          <Skeleton className="h-6 w-48 mb-2" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0">
          <div className="grid grid-cols-3 gap-4 h-48 items-center">
            <Skeleton className="h-24 rounded-lg" />
            <Skeleton className="h-24 rounded-lg" />
            <Skeleton className="h-24 rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full border-destructive/20 bg-destructive/5">
        <CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-3">
          <AlertTriangle className="size-10 text-destructive" />
          <div>
            <h4 className="text-sm font-semibold text-destructive">Gagal Memuat Rantai Koneksi</h4>
            <p className="text-xs text-muted-foreground mt-1 max-w-md">{error}</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => void loadTraceData()}>
            <RefreshCw className="mr-2 size-3" /> Coba Lagi
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (totalConnected <= 1) {
    return (
      <Card className="w-full border-dashed">
        <CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-2">
          <Network className="size-8 text-muted-foreground/60" />
          <h4 className="text-sm font-medium">Visualisasi Rantai Tidak Tersedia</h4>
          <p className="text-xs text-muted-foreground max-w-sm">
            Perangkat ini belum terhubung ke perangkat hulu (OTB) atau hilir (ODP) dalam topologi jaringan aktif.
          </p>
          <Button size="sm" variant="outline" onClick={() => void loadTraceData()}>
            <RefreshCw className="mr-2 size-3" /> Refresh
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full overflow-hidden shadow-sm">
      <CardHeader className="px-4 py-3 flex flex-row items-center justify-between border-b bg-muted/20">
        <div>
          <CardTitle className="text-sm flex items-center gap-2">
            <Network className="size-4 text-primary" />
            Visualisasi Rantai Koneksi (OTB → ODC → ODP)
          </CardTitle>
          <CardDescription className="text-xs">
            Representasi skematik relasi kabel feeder & kabel distribusi aktif.
          </CardDescription>
        </div>
        <Button size="xs" variant="ghost" onClick={() => void loadTraceData()} disabled={loading}>
          <RefreshCw className="size-3" />
        </Button>
      </CardHeader>
      <CardContent className="p-4 bg-gradient-to-br from-background to-muted/10">
        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          
          {/* COLUMN 1: OTB (Uplink / Source) */}
          <div className="space-y-3 flex flex-col justify-center border rounded-lg p-3 bg-card/60 backdrop-blur-xs min-h-[150px]">
            <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase flex items-center gap-1.5 mb-1">
              <Cpu className="size-3 text-emerald-500" /> Feeder Source (OTB)
            </span>
            {otbNodes.length === 0 ? (
              <div className="text-xs text-muted-foreground italic text-center p-4">Tidak ada OTB terhubung</div>
            ) : (
              otbNodes.map((node) => (
                <div key={node.id} className="group relative">
                  <Link href={`/data-management/list/devices/${node.id}`}>
                    <div className="p-2.5 rounded-lg border bg-background hover:border-primary hover:shadow-xs transition duration-200 cursor-pointer">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-xs font-semibold truncate group-hover:text-primary transition">
                          {node.device_name || node.device_id}
                        </span>
                        <Badge variant="outline" className="text-[9px] px-1 bg-emerald-50 text-emerald-700 border-emerald-200">OTB</Badge>
                      </div>
                      <div className="text-[10px] text-muted-foreground flex justify-between">
                        <span>Core: {node.used_core ?? 0}/{node.capacity_core ?? 0}</span>
                        <span className="capitalize">{node.status}</span>
                      </div>
                    </div>
                  </Link>
                </div>
              ))
            )}
          </div>

          {/* COLUMN 2: ODC (Transit / Mid) */}
          <div className="space-y-3 flex flex-col justify-center border rounded-lg p-3 bg-card/60 backdrop-blur-xs min-h-[150px] relative">
            
            {/* Cable Info Left -> Middle (OTB -> ODC) */}
            {graph.edges.some((e) => e.connection_type === "feeder" || e.connection_type === "uplink") && (
              <div className="hidden md:flex absolute -left-[14px] top-1/2 -translate-y-1/2 z-10 bg-primary/10 border border-primary/20 rounded-full p-1.5 shadow-xs text-primary">
                <Cable className="size-3.5" />
              </div>
            )}

            <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase flex items-center gap-1.5 mb-1">
              <Server className="size-3 text-amber-500" /> Splitting Point (ODC)
            </span>
            {odcNodes.length === 0 ? (
              <div className="text-xs text-muted-foreground italic text-center p-4">Tidak ada ODC terhubung</div>
            ) : (
              odcNodes.map((node) => {
                // Find matching feeder edge to show on connection line
                const edge = graph.edges.find((e) => e.to_device_id === node.id);
                return (
                  <div key={node.id} className="group space-y-2">
                    {edge && (
                      <div className="block md:hidden border-l-2 border-dashed border-primary/30 pl-3 py-1 my-1">
                        <div className="text-[9px] text-muted-foreground flex items-center gap-1 font-medium">
                          <Cable className="size-3 text-primary" />
                          <span>{edge.labels?.cable || "Feeder Cable"}</span>
                          {edge.labels?.core_range && <span className="bg-primary/5 px-1 rounded text-primary">Core {edge.labels.core_range}</span>}
                        </div>
                      </div>
                    )}
                    <Link href={`/data-management/list/devices/${node.id}`}>
                      <div className={`p-2.5 rounded-lg border bg-background hover:border-primary hover:shadow-xs transition duration-200 cursor-pointer ${node.id === deviceId ? "ring-2 ring-primary/20 border-primary bg-primary/5" : ""}`}>
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="text-xs font-semibold truncate group-hover:text-primary transition">
                            {node.device_name || node.device_id}
                          </span>
                          <Badge variant="outline" className="text-[9px] px-1 bg-amber-50 text-amber-700 border-amber-200">ODC</Badge>
                        </div>
                        <div className="text-[10px] text-muted-foreground flex justify-between">
                          <span>Core: {node.used_core ?? 0}/{node.capacity_core ?? 0}</span>
                          <span className="capitalize">{node.status}</span>
                        </div>
                      </div>
                    </Link>
                  </div>
                );
              })
            )}
          </div>

          {/* COLUMN 3: ODP (Distribution / Downlink) */}
          <div className="space-y-3 flex flex-col justify-center border rounded-lg p-3 bg-card/60 backdrop-blur-xs min-h-[150px] relative">
            
            {/* Cable Info Middle -> Right (ODC -> ODP) */}
            {graph.edges.some((e) => e.connection_type === "distribution" || e.connection_type === "downstream") && (
              <div className="hidden md:flex absolute -left-[14px] top-1/2 -translate-y-1/2 z-10 bg-primary/10 border border-primary/20 rounded-full p-1.5 shadow-xs text-primary">
                <Cable className="size-3.5" />
              </div>
            )}

            <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase flex items-center gap-1.5 mb-1">
              <Network className="size-3 text-blue-500" /> End Distribution (ODP)
            </span>
            {odpNodes.length === 0 ? (
              <div className="text-xs text-muted-foreground italic text-center p-4">Tidak ada ODP terhubung</div>
            ) : (
              <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1">
                {odpNodes.map((node) => {
                  const edge = graph.edges.find((e) => e.to_device_id === node.id);
                  return (
                    <div key={node.id} className="group space-y-1">
                      {edge && (
                        <div className="block md:hidden border-l-2 border-dashed border-primary/30 pl-3 py-1 my-1">
                          <div className="text-[9px] text-muted-foreground flex items-center gap-1 font-medium">
                            <Cable className="size-3 text-primary" />
                            <span>{edge.labels?.cable || "Distribution Cable"}</span>
                            {edge.labels?.core_range && <span className="bg-primary/5 px-1 rounded text-primary">Core {edge.labels.core_range}</span>}
                          </div>
                        </div>
                      )}
                      <Link href={`/data-management/list/devices/${node.id}`}>
                        <div className={`p-2.5 rounded-lg border bg-background hover:border-primary hover:shadow-xs transition duration-200 cursor-pointer ${node.id === deviceId ? "ring-2 ring-primary/20 border-primary bg-primary/5" : ""}`}>
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="text-xs font-semibold truncate group-hover:text-primary transition">
                              {node.device_name || node.device_id}
                            </span>
                            <Badge variant="outline" className="text-[9px] px-1 bg-blue-50 text-blue-700 border-blue-200">ODP</Badge>
                          </div>
                          <div className="text-[10px] text-muted-foreground flex justify-between">
                            <span>Type: {node.status}</span>
                            <span className="truncate max-w-[80px] text-right">{node.device_id}</span>
                          </div>
                        </div>
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Desktop connection info overlay labels footer */}
        <div className="hidden md:grid grid-cols-2 gap-4 mt-4 pt-3 border-t text-[11px] text-muted-foreground">
          <div className="flex items-center gap-2 justify-center bg-muted/40 p-2 rounded-lg">
            <ArrowRight className="size-3 text-primary shrink-0" />
            <span className="font-semibold text-foreground">OTB ➜ ODC:</span>
            {graph.edges
              .filter((e) => e.connection_type === "feeder" || e.connection_type === "uplink")
              .map((edge) => (
                <span key={edge.id} className="bg-background px-2 py-0.5 rounded border">
                  {edge.labels?.cable || "Feeder"} (Core {edge.labels?.core_range || "?"})
                </span>
              ))}
          </div>
          <div className="flex items-center gap-2 justify-center bg-muted/40 p-2 rounded-lg">
            <ArrowRight className="size-3 text-primary shrink-0" />
            <span className="font-semibold text-foreground">ODC ➜ ODP:</span>
            <div className="flex flex-wrap gap-1">
              {graph.edges
                .filter((e) => e.connection_type === "distribution" || e.connection_type === "downstream")
                .slice(0, 3)
                .map((edge) => (
                  <span key={edge.id} className="bg-background px-1.5 py-0.5 rounded border text-[10px]">
                    {edge.labels?.core_range || "?"} ({edge.labels?.cable?.split("-").slice(-1)[0] || "Dist"})
                  </span>
                ))}
              {graph.edges.filter((e) => e.connection_type === "distribution" || e.connection_type === "downstream").length > 3 && (
                <span className="px-1 text-[10px] self-center">...</span>
              )}
            </div>
          </div>
        </div>

      </CardContent>
    </Card>
  );
}
