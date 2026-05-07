"use client";

import { ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type TraceNode = {
  id: string;
  device_id?: string | null;
  device_name?: string | null;
  device_type_key?: string | null;
};

type TraceEdge = {
  id: string;
  from_device_id: string;
  to_device_id: string;
  connection_type?: string | null;
  status?: string | null;
  from_port_label?: string | null;
  to_port_label?: string | null;
  core_start?: number | null;
  core_end?: number | null;
  fiber_count?: number | null;
  fiber_cores?: {
    total?: number;
    used?: number;
    statuses?: Record<string, number>;
    colors?: Record<string, number>;
  };
};

type TopologyTraceData = {
  trace: {
    found: boolean;
    hop_count: number;
    path: TraceNode[];
  };
  graph: {
    nodes: TraceNode[];
    edges: TraceEdge[];
  };
};

export function TopologyTracePanel({
  data,
  maxRows = 8,
  showRawJson = false,
  schematicTitle = "Path Diagram",
}: {
  data: TopologyTraceData;
  maxRows?: number;
  showRawJson?: boolean;
  schematicTitle?: string;
}) {
  const path = data.trace.path || [];
  const nodes = data.graph.nodes || [];
  const edges = data.graph.edges || [];
  const pathEdges = buildPathEdges(path, edges);
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const branching = buildBranchingView(nodes, edges, path[0]?.id || nodes[0]?.id || "");

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Badge variant={data.trace.found ? "secondary" : "outline"}>
          {data.trace.found ? "Path Found" : "Path Not Found"}
        </Badge>
        <Badge variant="outline">Hop: {data.trace.hop_count}</Badge>
        <Badge variant="outline">Nodes: {nodes.length}</Badge>
        <Badge variant="outline">Edges: {edges.length}</Badge>
      </div>

      <Card>
        <CardHeader className="px-3 py-2">
          <CardTitle className="text-sm">Path Sequence</CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3 pt-0">
          {path.length ? (
            <ScrollArea className="w-full whitespace-nowrap">
              <div className="inline-flex items-center gap-2 pb-1">
                {path.map((node, index) => {
                  const label = node.device_name || node.device_id || node.id;
                  return (
                    <div key={`${node.id}-${index}`} className="inline-flex items-center gap-2">
                      <div className="rounded-md border bg-muted/30 px-2 py-1.5 text-xs">
                        <p className="font-medium">{label}</p>
                        <p className="text-[10px] text-muted-foreground">{node.device_type_key || "-"}</p>
                      </div>
                      {index < path.length - 1 ? <ChevronRight className="size-4 text-muted-foreground" /> : null}
                    </div>
                  );
                })}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          ) : (
            <p className="text-sm text-muted-foreground">Belum ada path yang bisa ditampilkan.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="px-3 py-2">
          <CardTitle className="text-sm">{schematicTitle}</CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3 pt-0">
          {path.length ? (
            <div className="space-y-2">
              {path.map((node, index) => {
                const edge = pathEdges[index];
                const nodeLabel = node.device_name || node.device_id || node.id;
                const step = index + 1;
                return (
                  <div key={`${node.id}-${index}`} className="rounded-md border bg-muted/20 p-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold">Step {step}: {nodeLabel}</p>
                        <p className="text-[11px] text-muted-foreground">{node.device_type_key || "-"}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px]">{node.device_id || node.id}</Badge>
                    </div>
                    {edge ? (
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                        <span>Next Link:</span>
                        <Badge variant="secondary" className="text-[10px]">
                          {edge.connection_type || edge.status || "link"}
                        </Badge>
                        <span>{edge.from_device_id}</span>
                        <ChevronRight className="size-3" />
                        <span>{edge.to_device_id}</span>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Belum ada jalur diagram untuk ditampilkan.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="px-3 py-2">
          <CardTitle className="text-sm">Branching Topology View</CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3 pt-0">
          {!branching.columns.length ? (
            <p className="text-sm text-muted-foreground">Belum ada relasi topology untuk divisualisasikan.</p>
          ) : (
            <ScrollArea className="w-full whitespace-nowrap">
              <div className="inline-flex min-w-full gap-3 pb-1 align-top">
                {branching.columns.map((column, depth) => (
                  <div key={`col-${depth}`} className="min-w-[220px] max-w-[260px] space-y-2 rounded-md border bg-muted/20 p-2 align-top">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Level {depth}</p>
                    {column.map((nodeId) => {
                      const node = nodeMap.get(nodeId);
                      const label = node?.device_name || node?.device_id || nodeId;
                      const type = node?.device_type_key || "-";
                      const outgoing = edges.filter((edge) => edge.from_device_id === nodeId);
                      const incoming = edges.filter((edge) => edge.to_device_id === nodeId);
                      const isSplitterNode = ["ODC", "ODP", "OTB"].includes(String(type).toUpperCase());

                      return (
                        <div key={nodeId} className="space-y-1 rounded-md border bg-background p-2">
                          <p className="truncate text-xs font-semibold">{label}</p>
                          <div className="flex flex-wrap items-center gap-1">
                            <Badge variant="outline" className="text-[10px]">{type}</Badge>
                            {isSplitterNode ? <Badge variant="secondary" className="text-[10px]">Splitter Node</Badge> : null}
                            {incoming.length ? <Badge variant="outline" className="text-[10px]">In: {incoming.length}</Badge> : null}
                            {outgoing.length ? <Badge variant="outline" className="text-[10px]">Out: {outgoing.length}</Badge> : null}
                          </div>
                          {outgoing.slice(0, 3).map((edge) => {
                            const target = nodeMap.get(edge.to_device_id);
                            const targetLabel = target?.device_name || target?.device_id || edge.to_device_id;
                            const coreRange = edge.core_start && edge.core_end ? `${edge.core_start}-${edge.core_end}` : "-";
                            const colorSummary = summarizeCoreColors(edge.fiber_cores?.colors || {});
                            return (
                              <div key={edge.id} className="rounded border bg-muted/20 px-1.5 py-1 text-[10px] text-muted-foreground">
                                <p className="truncate">
                                  {edge.connection_type || "-"}{" -> "}{targetLabel}
                                </p>
                                <p>
                                  Core: {coreRange} | Fiber: {edge.fiber_count || edge.fiber_cores?.total || 0}
                                </p>
                                {colorSummary ? <p className="truncate">Colors: {colorSummary}</p> : null}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader className="px-3 py-2">
            <CardTitle className="text-sm">Node Detail</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 pt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Device</TableHead>
                  <TableHead>Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {nodes.slice(0, maxRows).map((node) => (
                  <TableRow key={node.id}>
                    <TableCell>{node.device_name || node.device_id || node.id}</TableCell>
                    <TableCell>{node.device_type_key || "-"}</TableCell>
                  </TableRow>
                ))}
                {!nodes.length ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-muted-foreground">
                      Tidak ada node.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="px-3 py-2">
            <CardTitle className="text-sm">Edge Detail</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 pt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {edges.slice(0, maxRows).map((edge) => (
                  <TableRow key={edge.id}>
                    <TableCell>{edge.from_device_id}</TableCell>
                    <TableCell>{edge.to_device_id}</TableCell>
                    <TableCell>{edge.status || edge.connection_type || "-"}</TableCell>
                  </TableRow>
                ))}
                {!edges.length ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-muted-foreground">
                      Tidak ada edge.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {showRawJson ? (
        <details className="rounded-md border bg-muted/20 p-2">
          <summary className="cursor-pointer text-sm font-medium">Show Raw JSON</summary>
          <pre className="mt-2 overflow-auto text-xs text-muted-foreground">{JSON.stringify(data, null, 2)}</pre>
        </details>
      ) : null}
    </div>
  );
}

function buildPathEdges(path: TraceNode[], edges: TraceEdge[]) {
  if (path.length < 2 || !edges.length) return [] as Array<TraceEdge | null>;
  return path.map((node, index) => {
    if (index >= path.length - 1) return null;
    const next = path[index + 1];
    const fromCandidates = [node.device_id, node.id].filter(Boolean) as string[];
    const toCandidates = [next.device_id, next.id].filter(Boolean) as string[];

    return (
      edges.find((edge) => fromCandidates.includes(edge.from_device_id) && toCandidates.includes(edge.to_device_id)) ||
      edges.find((edge) => fromCandidates.includes(edge.to_device_id) && toCandidates.includes(edge.from_device_id)) ||
      null
    );
  });
}

function buildBranchingView(nodes: TraceNode[], edges: TraceEdge[], startNodeId: string) {
  if (!nodes.length || !edges.length || !startNodeId) return { columns: [] as string[][] };
  const adjacency = new Map<string, string[]>();
  nodes.forEach((node) => adjacency.set(node.id, []));
  edges.forEach((edge) => {
    if (!adjacency.has(edge.from_device_id)) adjacency.set(edge.from_device_id, []);
    adjacency.get(edge.from_device_id)?.push(edge.to_device_id);
  });

  const depthMap = new Map<string, number>();
  const queue: Array<{ id: string; depth: number }> = [{ id: startNodeId, depth: 0 }];
  depthMap.set(startNodeId, 0);

  while (queue.length) {
    const current = queue.shift();
    if (!current) break;
    const nextNodes = adjacency.get(current.id) || [];
    nextNodes.forEach((nextId) => {
      if (depthMap.has(nextId)) return;
      depthMap.set(nextId, current.depth + 1);
      queue.push({ id: nextId, depth: current.depth + 1 });
    });
  }

  nodes.forEach((node) => {
    if (!depthMap.has(node.id)) depthMap.set(node.id, 0);
  });

  const maxDepth = Math.max(...Array.from(depthMap.values()));
  const columns = Array.from({ length: maxDepth + 1 }, () => [] as string[]);
  depthMap.forEach((depth, nodeId) => {
    columns[depth].push(nodeId);
  });
  return { columns };
}

function summarizeCoreColors(colors: Record<string, number>) {
  const entries = Object.entries(colors || {});
  if (!entries.length) return "";
  return entries
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name, count]) => `${name}:${count}`)
    .join(", ");
}
