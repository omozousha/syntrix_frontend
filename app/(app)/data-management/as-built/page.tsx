"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Download, Printer } from "lucide-react";
import { AppLoading } from "@/components/app-loading-new";
import { useSession } from "@/components/session-context";
import { TopologyTracePanel } from "@/components/topology-trace-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiFetch } from "@/lib/api";

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
        from_device_id: string;
        to_device_id: string;
        connection_type?: string | null;
        status?: string | null;
        from_port_label?: string | null;
        to_port_label?: string | null;
        core_start?: number | null;
        core_end?: number | null;
        fiber_count?: number | null;
        route_id?: string | null;
        cable_device_id?: string | null;
        route?: {
          route_id?: string | null;
          route_code?: string | null;
          route_name?: string | null;
        } | null;
        cable_device?: {
          device_id?: string | null;
          device_name?: string | null;
          device_type_key?: string | null;
        } | null;
        labels?: {
          title?: string | null;
          route?: string | null;
          cable?: string | null;
          core_range?: string | null;
        } | null;
        fiber_cores?: {
          total?: number;
          used?: number;
          statuses?: Record<string, number>;
          colors?: Record<string, number>;
        };
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
};

type UploadAttachmentResponse = {
  data: {
    id: string;
  };
};

type CreateAsBuiltDocumentResponse = {
  data: {
    id: string;
    document_id?: string | null;
  };
};

type AsBuiltDocumentListItem = {
  id: string;
  document_id?: string | null;
  title?: string | null;
  revision_code?: string | null;
  status?: string | null;
  generated_at?: string | null;
};

export default function AsBuiltWorkspacePage() {
  const searchParams = useSearchParams();
  const { token, me } = useSession();
  const startDeviceId = searchParams.get("start_device_id") || "";
  const endDeviceId = searchParams.get("end_device_id") || "";
  const regionId = searchParams.get("region_id") || "";
  const routeId = searchParams.get("route_id") || "";
  const projectId = searchParams.get("project_id") || "";
  const maxDepth = searchParams.get("max_depth") || "12";
  const isPersonalDeviceMode = Boolean(startDeviceId.trim());
  const hasProjectRouteContext = Boolean(projectId.trim() || routeId.trim());

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [traceResult, setTraceResult] = useState<TopologyTraceResponse["data"] | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishMessage, setPublishMessage] = useState("");
  const [publishError, setPublishError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState("");
  const [exportingSvg, setExportingSvg] = useState(false);
  const [exportingPng, setExportingPng] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingJson, setExportingJson] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [drawingTitle, setDrawingTitle] = useState("As-Built Network Trace");
  const [revisionCode, setRevisionCode] = useState("v1");
  const [preparedBy, setPreparedBy] = useState(me.app_user.full_name || me.app_user.email || "");
  const [checkedBy, setCheckedBy] = useState("");
  const [approvedBy, setApprovedBy] = useState("");
  const [revisionContext, setRevisionContext] = useState<AsBuiltDocumentListItem[]>([]);
  const [loadingRevisionContext, setLoadingRevisionContext] = useState(false);
  const generatedAt = useMemo(() => new Date(), []);
  const resolvedRegionId = useMemo(() => {
    if (regionId.trim()) return regionId.trim();
    if (traceResult?.request?.region_id) return String(traceResult.request.region_id);
    const startNode = (traceResult?.graph?.nodes || []).find(
      (node) => node.device_id === startDeviceId.trim() || node.id === startDeviceId.trim(),
    );
    if (startNode?.region_id) return String(startNode.region_id);
    return "";
  }, [regionId, traceResult, startDeviceId]);

  useEffect(() => {
    if (!startDeviceId.trim()) {
      setTraceResult(null);
      setError("");
      return;
    }

    let cancelled = false;

    async function run() {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams();
        params.set("start_device_id", startDeviceId.trim());
        if (endDeviceId.trim()) params.set("end_device_id", endDeviceId.trim());
        if (regionId.trim()) params.set("region_id", regionId.trim());
        const depth = Number(maxDepth);
        if (Number.isFinite(depth) && depth > 0) params.set("max_depth", String(depth));

        const payload = await apiFetch<TopologyTraceResponse>(`/topology/trace?${params.toString()}`, { token });
        if (cancelled) return;
        setTraceResult(payload.data);
      } catch (err) {
        if (cancelled) return;
        setError((err as Error).message || "Gagal memuat trace untuk as-built.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [token, startDeviceId, endDeviceId, regionId, maxDepth]);

  const topologyHref = useMemo(() => {
    const params = new URLSearchParams();
    if (startDeviceId.trim()) params.set("start_device_id", startDeviceId.trim());
    if (endDeviceId.trim()) params.set("end_device_id", endDeviceId.trim());
    if (regionId.trim()) params.set("region_id", regionId.trim());
    if (projectId.trim()) params.set("project_id", projectId.trim());
    if (routeId.trim()) params.set("route_id", routeId.trim());
    if (maxDepth.trim()) params.set("max_depth", maxDepth.trim());
    const query = params.toString();
    return `/data-management/topology${query ? `?${query}` : ""}`;
  }, [endDeviceId, maxDepth, projectId, regionId, routeId, startDeviceId]);

  const generatedAtLabel = useMemo(() => formatDateTime(generatedAt), [generatedAt]);
  const startNode = useMemo(() => {
    if (!traceResult || !startDeviceId.trim()) return null;
    return (
      traceResult.graph.nodes.find((node) => node.device_id === startDeviceId.trim()) ||
      traceResult.graph.nodes.find((node) => node.id === startDeviceId.trim()) ||
      null
    );
  }, [traceResult, startDeviceId]);
  const endNode = useMemo(() => {
    if (!traceResult || !endDeviceId.trim()) return null;
    return (
      traceResult.graph.nodes.find((node) => node.device_id === endDeviceId.trim()) ||
      traceResult.graph.nodes.find((node) => node.id === endDeviceId.trim()) ||
      null
    );
  }, [traceResult, endDeviceId]);
  const startDeviceLabel = startNode?.device_name || startNode?.device_id || startDeviceId || "-";
  const endDeviceLabel = endNode?.device_name || endNode?.device_id || endDeviceId || "-";
  const traceNodeLabelMap = useMemo(() => {
    const map = new Map<string, string>();
    (traceResult?.graph?.nodes || []).forEach((node) => {
      map.set(node.id, node.device_name || node.device_id || node.id);
    });
    return map;
  }, [traceResult]);
  const traceFiberSummary = useMemo(() => {
    const edges = traceResult?.graph?.edges || [];
    let totalFiber = 0;
    let usedFiber = 0;
    let edgesWithCoreRange = 0;
    const colorDist: Record<string, number> = {};

    edges.forEach((edge) => {
      totalFiber += Number(edge.fiber_cores?.total || edge.fiber_count || 0);
      usedFiber += Number(edge.fiber_cores?.used || 0);
      if (edge.core_start != null && edge.core_end != null) edgesWithCoreRange += 1;
      Object.entries(edge.fiber_cores?.colors || {}).forEach(([name, count]) => {
        colorDist[name] = (colorDist[name] || 0) + Number(count || 0);
      });
    });

    return { totalFiber, usedFiber, edgesWithCoreRange, colorDist };
  }, [traceResult]);
  const relevantTopologySummary = useMemo(() => buildRelevantTopologySummary(traceResult), [traceResult]);
  const canExportAsBuilt = Boolean(traceResult?.trace.found);
  const asBuiltDocumentsHref = useMemo(() => {
    const params = new URLSearchParams();
    if (resolvedRegionId) params.set("region_id", resolvedRegionId);
    if (projectId.trim()) params.set("project_id", projectId.trim());
    if (routeId.trim()) params.set("route_id", routeId.trim());
    if (startDeviceId.trim()) params.set("start_device_id", startDeviceId.trim());
    if (endDeviceId.trim()) params.set("end_device_id", endDeviceId.trim());
    const query = params.toString();
    return `/data-management/as-built-documents${query ? `?${query}` : ""}`;
  }, [endDeviceId, projectId, resolvedRegionId, routeId, startDeviceId]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!startDeviceId.trim()) {
        setRevisionContext([]);
        return;
      }
      setLoadingRevisionContext(true);
      try {
        const payload = await apiFetch<{ data: AsBuiltDocumentListItem[] }>(
          `/asBuiltDocuments?page=1&limit=10&start_device_id=${encodeURIComponent(startDeviceId.trim())}`,
          { token },
        );
        if (cancelled) return;
        const rows = (payload.data || []).sort(
          (a, b) => new Date(b.generated_at || 0).getTime() - new Date(a.generated_at || 0).getTime(),
        );
        setRevisionContext(rows);
        const latest = rows[0];
        if (latest?.revision_code) {
          const match = String(latest.revision_code).match(/^v(\d+)$/i);
          if (match) {
            const next = Number(match[1]) + 1;
            setRevisionCode(`v${next}`);
          }
        }
      } catch {
        if (!cancelled) setRevisionContext([]);
      } finally {
        if (!cancelled) setLoadingRevisionContext(false);
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [token, startDeviceId]);

  async function handlePublishRevision() {
    if (!traceResult || !startDeviceId.trim()) return;
    if (!canExportAsBuilt) {
      setPublishError("Trace belum menemukan approved path. Jalankan trace topology yang valid sebelum publish As-Built.");
      return;
    }
    setPublishing(true);
    setPublishMessage("");
    setPublishError("");
    try {
      await apiFetch("/validations", {
        method: "POST",
        token,
        body: JSON.stringify({
          entity_type: "devices",
          entity_id: startDeviceId.trim(),
          validation_type: "as_built_revision",
          status: "valid",
          validated_at: new Date().toISOString(),
          validator_user_id: me.app_user.id,
          findings: `As-built revision ${revisionCode || "v1"} published from topology trace context.`,
          payload: {
            revision: revisionCode || "v1",
            request: traceResult.request,
            graph: {
              node_count: traceResult.graph.nodes.length,
              edge_count: traceResult.graph.edges.length,
            },
            trace: traceResult.trace,
          },
          tags: ["as-built", `revision-${revisionCode || "v1"}`],
        }),
      });
      setPublishMessage(`As-Built Revision ${revisionCode || "v1"} berhasil dipublish.`);
    } catch (err) {
      setPublishError((err as Error).message || "Gagal publish revision.");
    } finally {
      setPublishing(false);
    }
  }

  async function saveAsBuiltDocument(options: {
    format: "svg" | "png" | "pdf" | "json";
    fileBlob: Blob;
    fileName: string;
  }) {
    if (!traceResult || !startDeviceId.trim()) return;
    if (!canExportAsBuilt) {
      setSaveError("Dokumen belum bisa disimpan karena trace tidak menemukan approved path.");
      return;
    }

    setSaveMessage("");
    setSaveError("");
    try {
      const formData = new FormData();
      formData.append("file", options.fileBlob, options.fileName);
      formData.append("file_category", "document");
      formData.append("entity_type", "devices");
      formData.append("entity_id", startDeviceId.trim());

      const upload = await apiFetch<UploadAttachmentResponse>("/attachments/upload", {
        method: "POST",
        token,
        body: formData,
      });

      const response = await apiFetch<CreateAsBuiltDocumentResponse>("/asBuiltDocuments", {
        method: "POST",
        token,
        body: {
          region_id: resolvedRegionId || null,
          project_id: projectId || null,
          route_id: routeId || null,
          start_device_id: startDeviceId.trim(),
          end_device_id: endDeviceId.trim() || null,
          title: drawingTitle || "As-Built Network Trace",
          revision_code: revisionCode || "v1",
          status: "draft",
          primary_format: options.format,
          generated_at: new Date().toISOString(),
          prepared_by_name: preparedBy || null,
          checked_by_name: checkedBy || null,
          approved_by_name: approvedBy || null,
          created_by_user_id: me.app_user.id,
          attachment_id: upload.data.id,
          trace_request: traceResult.request,
          trace_summary: {
            path_found: traceResult.trace.found,
            hop_count: traceResult.trace.hop_count,
            node_count: traceResult.graph.nodes.length,
            edge_count: traceResult.graph.edges.length,
            resolved_region_id: resolvedRegionId || null,
            total_fiber_cores: traceFiberSummary.totalFiber,
            used_fiber_cores: traceFiberSummary.usedFiber,
            edges_with_core_range: traceFiberSummary.edgesWithCoreRange,
            color_distribution: traceFiberSummary.colorDist,
          },
          export_metadata: {
            source: "as-built-workspace",
            file_name: options.fileName,
            mime_type: options.fileBlob.type,
            file_size_bytes: options.fileBlob.size,
            exported_at: new Date().toISOString(),
            drawing_title: drawingTitle || "As-Built Network Trace",
            revision_code: revisionCode || "v1",
            prepared_by_name: preparedBy || null,
            checked_by_name: checkedBy || null,
            approved_by_name: approvedBy || null,
          },
          tags: ["as-built", `format:${options.format}`],
        },
      });

      setSaveMessage(`Dokumen tersimpan (${response.data.document_id || response.data.id}).`);
    } catch (err) {
      setSaveError((err as Error).message || "Dokumen gagal disimpan ke backend.");
    }
  }

  async function handleExportSvg() {
    if (!traceResult || !canExportAsBuilt) return;
    setExportingSvg(true);
    try {
      const svgDoc = buildAsBuiltSvg({
        data: traceResult,
        generatedAtLabel,
        context: {
          startDeviceId: startDeviceLabel,
          endDeviceId: endDeviceLabel,
          regionId: regionId || "all",
          maxDepth: maxDepth || "12",
        },
        document: {
          drawingTitle,
          revisionCode,
          preparedBy,
          checkedBy,
          approvedBy,
        },
      });

      const blob = new Blob([svgDoc.content], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      const ts = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `as-built-${regionId || "all"}-${ts}.svg`;
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      await saveAsBuiltDocument({ format: "svg", fileBlob: blob, fileName: filename });
    } finally {
      setExportingSvg(false);
    }
  }

  async function handleExportPng() {
    if (!traceResult || !canExportAsBuilt) return;
    setExportingPng(true);
    try {
      const svgDoc = buildAsBuiltSvg({
        data: traceResult,
        generatedAtLabel,
        context: {
          startDeviceId: startDeviceLabel,
          endDeviceId: endDeviceLabel,
          regionId: regionId || "all",
          maxDepth: maxDepth || "12",
        },
        document: {
          drawingTitle,
          revisionCode,
          preparedBy,
          checkedBy,
          approvedBy,
        },
      });

      const pngDataUrl = await renderSvgToPngDataUrl(svgDoc.content, svgDoc.width, svgDoc.height);
      const anchor = document.createElement("a");
      const ts = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `as-built-${regionId || "all"}-${ts}.png`;
      anchor.href = pngDataUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      const pngBlob = dataUrlToBlob(pngDataUrl);
      await saveAsBuiltDocument({ format: "png", fileBlob: pngBlob, fileName: filename });
    } finally {
      setExportingPng(false);
    }
  }

  async function handleExportPdf() {
    if (!traceResult || !canExportAsBuilt) return;
    setExportingPdf(true);
    try {
      const svgDoc = buildAsBuiltSvg({
        data: traceResult,
        generatedAtLabel,
        context: {
          startDeviceId: startDeviceLabel,
          endDeviceId: endDeviceLabel,
          regionId: regionId || "all",
          maxDepth: maxDepth || "12",
        },
        document: {
          drawingTitle,
          revisionCode,
          preparedBy,
          checkedBy,
          approvedBy,
        },
      });

      const pngDataUrl = await renderSvgToPngDataUrl(svgDoc.content, svgDoc.width, svgDoc.height);
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a3" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const scale = Math.min(pageWidth / svgDoc.width, pageHeight / svgDoc.height);
      const drawWidth = svgDoc.width * scale;
      const drawHeight = svgDoc.height * scale;
      const offsetX = (pageWidth - drawWidth) / 2;
      const offsetY = (pageHeight - drawHeight) / 2;
      pdf.addImage(pngDataUrl, "PNG", offsetX, offsetY, drawWidth, drawHeight, undefined, "FAST");
      const ts = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `as-built-${regionId || "all"}-${ts}.pdf`;
      const pdfBlob = pdf.output("blob");
      pdf.save(filename);
      await saveAsBuiltDocument({ format: "pdf", fileBlob: pdfBlob, fileName: filename });
    } finally {
      setExportingPdf(false);
    }
  }

  async function handleExportJson() {
    if (!traceResult || !canExportAsBuilt) return;
    setExportingJson(true);
    try {
      const snapshot = buildAsBuiltJsonSnapshot({
        data: traceResult,
        generatedAtLabel,
        context: {
          startDeviceId: startDeviceLabel,
          endDeviceId: endDeviceLabel,
          regionId: regionId || "all",
          maxDepth: maxDepth || "12",
          projectId: projectId || null,
          routeId: routeId || null,
        },
        document: {
          drawingTitle,
          revisionCode,
          preparedBy,
          checkedBy,
          approvedBy,
        },
      });
      const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json;charset=utf-8" });
      const ts = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `as-built-${regionId || "all"}-${ts}.json`;
      downloadBlob(blob, filename);
      await saveAsBuiltDocument({ format: "json", fileBlob: blob, fileName: filename });
    } finally {
      setExportingJson(false);
    }
  }

  function handleExportCsv() {
    if (!traceResult || !canExportAsBuilt) return;
    setExportingCsv(true);
    try {
      const csv = buildAsBuiltCorePathCsv(traceResult, traceNodeLabelMap);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const ts = new Date().toISOString().replace(/[:.]/g, "-");
      downloadBlob(blob, `as-built-core-path-${regionId || "all"}-${ts}.csv`);
    } finally {
      setExportingCsv(false);
    }
  }

  return (
    <ScrollArea className="h-full min-h-0 w-full">
      <div className="space-y-4 pr-3">
        <section className="no-print space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight">As-Built Workspace</h2>
          <p className="text-sm text-muted-foreground">
            {isPersonalDeviceMode
              ? "Mode personal device aktif. Dokumen as-built dibuat dari hasil trace device terpilih."
              : "Buka halaman ini dari Device Trace agar konteks perangkat terisi otomatis."}
          </p>
        </section>

        <Card>
          <CardHeader className="px-4 py-3">
            <CardTitle className="text-base">Device Context</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-4 pb-4 pt-0">
            {isPersonalDeviceMode ? (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-5">
                <InfoTile label="Start Device" value={startDeviceLabel} />
                <InfoTile label="Device Type" value={startNode?.device_type_key || "-"} />
                <InfoTile label="Region" value={resolvedRegionId || regionId || "all"} />
                <InfoTile label="Path Found" value={traceResult?.trace.found ? "Yes" : traceResult ? "No" : "-"} />
                <InfoTile label="Hop Count" value={traceResult ? String(traceResult.trace.hop_count) : "-"} />
              </div>
            ) : (
              <div className="rounded-md border bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
                Start device belum ada. Gunakan menu konteks di list device: <span className="font-medium text-foreground">Trace Device</span>,
                lalu lanjut ke As-Built dari hasil trace.
              </div>
            )}
          </CardContent>
        </Card>

        {hasProjectRouteContext ? (
          <Card>
            <CardHeader className="px-4 py-3">
              <CardTitle className="text-base">Project / Route Context</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 px-4 pb-4 pt-0">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <InfoTile label="Project Context" value={projectId || "-"} />
                <InfoTile label="Route Context" value={routeId || "-"} />
                <InfoTile label="Region Context" value={resolvedRegionId || regionId || "all"} />
              </div>
              {!isPersonalDeviceMode ? (
                <div className="rounded-md border bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
                  Pilih start/end device di Topology Workspace untuk menghasilkan path As-Built dari konteks project atau route ini.
                </div>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        {traceResult && hasProjectRouteContext ? (
          <AsBuiltRelevantTopologySummary summary={relevantTopologySummary} />
        ) : null}

        {!isPersonalDeviceMode ? (
          <Card>
            <CardHeader className="px-4 py-3">
              <CardTitle className="text-base">Mode Device-Centric</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 px-4 pb-4 pt-0">
              <p className="text-sm text-muted-foreground">
                Workspace as-built membutuhkan start device. Gunakan Topology Workspace untuk memilih path dari device, project, atau route context.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Button asChild type="button" variant="outline" size="sm">
                  <Link href={topologyHref}>Open Topology Workspace</Link>
                </Button>
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
            <CardTitle className="text-base">Document Metadata</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-2 px-4 pb-4 pt-0 md:grid-cols-5">
            <Input value={drawingTitle} onChange={(event) => setDrawingTitle(event.target.value)} placeholder="Drawing title" />
            <Input value={revisionCode} onChange={(event) => setRevisionCode(event.target.value)} placeholder="Revision" />
            <Input value={preparedBy} onChange={(event) => setPreparedBy(event.target.value)} placeholder="Prepared by" />
            <Input value={checkedBy} onChange={(event) => setCheckedBy(event.target.value)} placeholder="Checked by" />
            <Input value={approvedBy} onChange={(event) => setApprovedBy(event.target.value)} placeholder="Approved by" />
          </CardContent>
        </Card>
        ) : null}

        <Card>
          <CardHeader className="px-4 py-3">
            <CardTitle className="text-base">Revision Context</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 px-4 pb-4 pt-0">
            <div className="rounded-md border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
              Suggested revision: <span className="font-semibold text-foreground">{revisionCode || "-"}</span>
            </div>
            {loadingRevisionContext ? (
              <p className="text-sm text-muted-foreground">Memuat riwayat dokumen...</p>
            ) : !revisionContext.length ? (
              <p className="text-sm text-muted-foreground">Belum ada riwayat as-built untuk start device ini.</p>
            ) : (
              <div className="space-y-1.5">
                {revisionContext.slice(0, 5).map((doc) => (
                  <div key={doc.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-background px-3 py-2 text-xs">
                    <span className="font-medium">{doc.title || doc.document_id || "Dokumen tidak tersedia"}</span>
                    <div className="flex items-center gap-1">
                      <Badge variant="outline">{doc.revision_code || "-"}</Badge>
                      <Badge variant="secondary">{doc.status || "-"}</Badge>
                      <Badge variant="outline">{doc.generated_at ? formatDateTimeString(doc.generated_at) : "-"}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-base">Trace Context</CardTitle>
              <div className="no-print flex items-center gap-2">
                <Button asChild type="button" variant="outline" size="sm">
                  <Link href={asBuiltDocumentsHref}>Open Documents</Link>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!canExportAsBuilt || exportingSvg}
                  onClick={() => void handleExportSvg()}
                >
                  <Download className="mr-1 size-4" />
                  {exportingSvg ? "Exporting..." : "Export SVG"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!canExportAsBuilt || exportingPng}
                  onClick={() => void handleExportPng()}
                >
                  <Download className="mr-1 size-4" />
                  {exportingPng ? "Exporting..." : "Export PNG"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!canExportAsBuilt || exportingPdf}
                  onClick={() => void handleExportPdf()}
                >
                  <Download className="mr-1 size-4" />
                  {exportingPdf ? "Exporting..." : "Export PDF"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!canExportAsBuilt || exportingJson}
                  onClick={() => void handleExportJson()}
                >
                  <Download className="mr-1 size-4" />
                  {exportingJson ? "Exporting..." : "Export JSON"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!canExportAsBuilt || exportingCsv}
                  onClick={handleExportCsv}
                >
                  <Download className="mr-1 size-4" />
                  {exportingCsv ? "Exporting..." : "Export CSV"}
                </Button>
                <Button type="button" variant="secondary" size="sm" onClick={() => window.print()}>
                  <Printer className="mr-1 size-4" />
                  Print
                </Button>
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  disabled={!canExportAsBuilt || publishing}
                  onClick={() => void handlePublishRevision()}
                >
                  {publishing ? "Publishing..." : `Publish Revision ${revisionCode || "v1"}`}
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href={topologyHref}>Back to Trace</Link>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 px-4 pb-4 pt-0">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline">Start: {startDeviceLabel}</Badge>
              <Badge variant="outline">End: {endDeviceLabel}</Badge>
              <Badge variant="outline">Region: {regionId || "all"}</Badge>
              {projectId ? <Badge variant="outline">Project Context</Badge> : null}
              {routeId ? <Badge variant="outline">Route Context</Badge> : null}
              {!regionId && resolvedRegionId ? <Badge variant="outline">Resolved Region: {resolvedRegionId}</Badge> : null}
              <Badge variant="outline">Depth: {maxDepth || "12"}</Badge>
              <Badge variant="outline">Generated: {generatedAtLabel}</Badge>
              <Badge variant="outline">Fiber: {traceFiberSummary.totalFiber}</Badge>
              <Badge variant="outline">Used Fiber: {traceFiberSummary.usedFiber}</Badge>
            </div>
            {traceResult && !canExportAsBuilt ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Trace belum menemukan approved path. Export, save, dan publish As-Built dikunci sampai topology trace valid.
              </div>
            ) : null}

            {!startDeviceId.trim() ? (
              <AppLoading label="Belum ada start device. Buka dari list device lalu jalankan Trace Device agar konteks terbawa otomatis." />
            ) : null}
            {loading ? <AppLoading label="Menyiapkan data trace untuk as-built..." /> : null}
            {!loading && error ? <AppLoading label={error} variant="error" /> : null}
            {publishMessage ? <p className="text-sm text-emerald-600">{publishMessage}</p> : null}
            {publishError ? <p className="text-sm text-destructive">{publishError}</p> : null}
            {saveMessage ? <p className="text-sm text-emerald-600">{saveMessage}</p> : null}
            {saveError ? <p className="text-sm text-destructive">{saveError}</p> : null}

            {!loading && !error && traceResult ? (
              <div className="space-y-3 rounded-md border bg-muted/30 px-3 py-2">
                <TopologyTracePanel data={traceResult} schematicTitle="As-Built Diagram (Lite)" />
                <AsBuiltCorePathSummary data={traceResult} nodeLabelMap={traceNodeLabelMap} />
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }

          html,
          body {
            background: #fff !important;
          }

          [data-slot="scroll-area-viewport"] {
            overflow: visible !important;
            height: auto !important;
          }

          [data-slot="card"] {
            box-shadow: none !important;
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>
    </ScrollArea>
  );
}

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function formatDateTimeString(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-muted/20 px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="truncate text-sm font-medium">{value || "-"}</p>
    </div>
  );
}

type RelevantTopologySummary = {
  deviceTotal: number;
  deviceTypeEntries: Array<[string, number]>;
  routeEntries: Array<{ id: string; label: string }>;
  cableEntries: Array<{ id: string; label: string }>;
  connectionEntries: Array<{
    id: string;
    label: string;
    route: string;
    cable: string;
    coreRange: string;
    status: string;
  }>;
};

function buildRelevantTopologySummary(data: TopologyTraceResponse["data"] | null): RelevantTopologySummary {
  if (!data) {
    return {
      deviceTotal: 0,
      deviceTypeEntries: [],
      routeEntries: [],
      cableEntries: [],
      connectionEntries: [],
    };
  }

  const deviceTypeMap = new Map<string, number>();
  data.graph.nodes.forEach((node) => {
    const key = node.device_type_key || "Unknown";
    deviceTypeMap.set(key, (deviceTypeMap.get(key) || 0) + 1);
  });

  const routeMap = new Map<string, string>();
  const cableMap = new Map<string, string>();
  const connectionEntries = data.graph.edges.map((edge) => {
    const routeId = edge.route?.route_id || edge.route_id || "";
    const routeLabel = edge.labels?.route || edge.route?.route_name || edge.route?.route_code || edge.route?.route_id || routeId || "-";
    if (routeId) routeMap.set(routeId, routeLabel);

    const cableId = edge.cable_device?.device_id || edge.cable_device_id || "";
    const cableLabel = edge.labels?.cable || edge.cable_device?.device_name || edge.cable_device?.device_id || cableId || "-";
    if (cableId) cableMap.set(cableId, cableLabel);

    return {
      id: edge.id,
      label: edge.labels?.title || `${edge.from_port_label || "From port"} -> ${edge.to_port_label || "To port"}`,
      route: routeLabel,
      cable: cableLabel,
      coreRange: edge.labels?.core_range || formatCoreRange(edge.core_start, edge.core_end),
      status: edge.status || "active",
    };
  });

  return {
    deviceTotal: data.graph.nodes.length,
    deviceTypeEntries: Array.from(deviceTypeMap.entries()).sort(([a], [b]) => a.localeCompare(b)),
    routeEntries: Array.from(routeMap.entries()).map(([id, label]) => ({ id, label })),
    cableEntries: Array.from(cableMap.entries()).map(([id, label]) => ({ id, label })),
    connectionEntries,
  };
}

function AsBuiltRelevantTopologySummary({ summary }: { summary: RelevantTopologySummary }) {
  return (
    <Card>
      <CardHeader className="px-4 py-3">
        <CardTitle className="text-base">Relevant Topology</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 px-4 pb-4 pt-0">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <InfoTile label="Relevant Devices" value={String(summary.deviceTotal)} />
          <InfoTile label="Relevant Connections" value={String(summary.connectionEntries.length)} />
          <InfoTile label="Relevant Routes" value={String(summary.routeEntries.length)} />
          <InfoTile label="Relevant Cables" value={String(summary.cableEntries.length)} />
        </div>

        {summary.deviceTypeEntries.length ? (
          <div className="flex flex-wrap gap-1.5">
            {summary.deviceTypeEntries.map(([type, count]) => (
              <Badge key={type} variant="outline">
                {type}: {count}
              </Badge>
            ))}
          </div>
        ) : null}

        {!summary.connectionEntries.length ? (
          <p className="rounded-md border border-dashed bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
            Belum ada connection relevan pada context ini. Pilih start/end device di Topology Workspace untuk membentuk path approved.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-2 xl:grid-cols-2">
            {summary.connectionEntries.slice(0, 6).map((connection) => (
              <div key={connection.id} className="rounded-md border bg-muted/10 px-3 py-2">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                  <p className="min-w-0 truncate text-sm font-semibold">{connection.label}</p>
                  <Badge variant="secondary">{connection.status}</Badge>
                </div>
                <div className="mt-2 grid grid-cols-1 gap-2 text-xs sm:grid-cols-3">
                  <SummaryField label="Route" value={connection.route} />
                  <SummaryField label="Cable" value={connection.cable} />
                  <SummaryField label="Core" value={connection.coreRange} />
                </div>
              </div>
            ))}
          </div>
        )}

        {summary.connectionEntries.length > 6 ? (
          <p className="text-xs text-muted-foreground">
            Menampilkan 6 dari {summary.connectionEntries.length} connection relevan. Export JSON menyimpan seluruh graph trace.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function AsBuiltCorePathSummary({
  data,
  nodeLabelMap,
}: {
  data: TopologyTraceResponse["data"];
  nodeLabelMap: Map<string, string>;
}) {
  const edges = data.graph.edges || [];
  const edgesWithCore = edges.filter((edge) => edge.core_start != null || edge.core_end != null || edge.fiber_cores?.total);
  const colorEntries = Object.entries(
    edges.reduce<Record<string, number>>((acc, edge) => {
      Object.entries(edge.fiber_cores?.colors || {}).forEach(([name, count]) => {
        acc[name] = (acc[name] || 0) + Number(count || 0);
      });
      return acc;
    }, {}),
  ).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="rounded-md border bg-background p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold">Core Path & Splice Summary</p>
          <p className="text-xs text-muted-foreground">
            Read-only path dari topology approved untuk referensi As-Built. Edit relasi tetap dilakukan di Topology Workspace.
          </p>
        </div>
        <Badge variant="outline">{edgesWithCore.length} core segment</Badge>
      </div>

      {colorEntries.length ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {colorEntries.map(([name, count]) => (
            <Badge key={name} variant="outline" className="gap-1.5">
              <ColorDot color={getFiberColorHex(name)} />
              {name}: {count}
            </Badge>
          ))}
        </div>
      ) : null}

      {!edgesWithCore.length ? (
        <p className="mt-3 rounded-md border border-dashed bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
          Belum ada core range atau color distribution pada trace ini.
        </p>
      ) : (
        <div className="mt-3 grid grid-cols-1 gap-2 xl:grid-cols-2">
          {edgesWithCore.map((edge) => {
            const fromLabel = nodeLabelMap.get(edge.from_device_id) || edge.from_device_id;
            const toLabel = nodeLabelMap.get(edge.to_device_id) || edge.to_device_id;
            const coreRange = formatCoreRange(edge.core_start, edge.core_end);
            const colorNames = Object.keys(edge.fiber_cores?.colors || {});

            return (
              <div key={edge.id} className="rounded-md border bg-muted/10 px-3 py-2">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {fromLabel} &rarr; {toLabel}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {edge.from_port_label || "From port -"} &rarr; {edge.to_port_label || "To port -"}
                    </p>
                  </div>
                  <Badge variant="secondary">{edge.status || "active"}</Badge>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  <SummaryField label="Type" value={edge.connection_type || "-"} />
                  <SummaryField label="Core" value={coreRange} />
                  <SummaryField label="Fiber" value={String(edge.fiber_count || edge.fiber_cores?.total || 0)} />
                  <SummaryField label="Used" value={String(edge.fiber_cores?.used || 0)} />
                </div>
                {colorNames.length ? (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {colorNames.map((name) => (
                      <Badge key={name} variant="outline" className="gap-1">
                        <ColorDot color={getFiberColorHex(name)} />
                        {name}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SummaryField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-background px-2 py-1.5">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="truncate font-medium">{value || "-"}</p>
    </div>
  );
}

function ColorDot({ color }: { color: string }) {
  return <span className="size-2.5 shrink-0 rounded-full border" style={{ backgroundColor: color }} />;
}

function formatCoreRange(start?: number | null, end?: number | null) {
  if (start == null && end == null) return "-";
  if (start == null) return `-${end}`;
  if (end == null || start === end) return String(start);
  return `${start}-${end}`;
}

function getFiberColorHex(name: string) {
  const normalized = name.toLowerCase();
  const colorMap: Record<string, string> = {
    biru: "#2563eb",
    blue: "#2563eb",
    orange: "#f97316",
    oranye: "#f97316",
    hijau: "#16a34a",
    green: "#16a34a",
    cokelat: "#92400e",
    brown: "#92400e",
    abu: "#94a3b8",
    grey: "#94a3b8",
    gray: "#94a3b8",
    putih: "#f8fafc",
    white: "#f8fafc",
    merah: "#dc2626",
    red: "#dc2626",
    hitam: "#111827",
    black: "#111827",
    kuning: "#facc15",
    yellow: "#facc15",
    ungu: "#7c3aed",
    violet: "#7c3aed",
    purple: "#7c3aed",
    pink: "#ec4899",
    rose: "#ec4899",
    toska: "#14b8a6",
    aqua: "#14b8a6",
    cyan: "#14b8a6",
  };
  const match = Object.entries(colorMap).find(([key]) => normalized.includes(key));
  return match?.[1] || "#64748b";
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function buildAsBuiltSvg({
  data,
  generatedAtLabel,
  context,
  document,
}: {
  data: TopologyTraceResponse["data"];
  generatedAtLabel: string;
  context: {
    startDeviceId: string;
    endDeviceId: string;
    regionId: string;
    maxDepth: string;
  };
  document: {
    drawingTitle: string;
    revisionCode: string;
    preparedBy: string;
    checkedBy: string;
    approvedBy: string;
  };
}) {
  const path = data.trace.path || [];
  const padding = 24;
  const titleBlockHeight = 130;
  const cardWidth = 220;
  const cardHeight = 84;
  const gap = 56;
  const minWidth = 1200;
  const contentWidth = path.length > 0 ? path.length * cardWidth + Math.max(0, path.length - 1) * gap : cardWidth;
  const width = Math.max(minWidth, padding * 2 + contentWidth);
  const height = 360;

  const nodesSvg = path
    .map((node, index) => {
      const x = padding + index * (cardWidth + gap);
      const y = titleBlockHeight + 36;
      const name = escapeXml(node.device_name || node.device_id || "Node tidak tersedia");
      const type = escapeXml(node.device_type_key || "-");
      const idLabel = escapeXml(node.device_id || "-");

      const edge = index < path.length - 1 ? `<line x1="${x + cardWidth}" y1="${y + cardHeight / 2}" x2="${x + cardWidth + gap}" y2="${y + cardHeight / 2}" stroke="#64748b" stroke-width="2" marker-end="url(#arrow)" />` : "";

      return `
        <g>
          <rect x="${x}" y="${y}" width="${cardWidth}" height="${cardHeight}" rx="10" fill="#f8fafc" stroke="#cbd5e1" />
          <text x="${x + 12}" y="${y + 24}" font-size="14" font-family="Arial, sans-serif" font-weight="700" fill="#0f172a">${name}</text>
          <text x="${x + 12}" y="${y + 44}" font-size="12" font-family="Arial, sans-serif" fill="#334155">Type: ${type}</text>
          <text x="${x + 12}" y="${y + 62}" font-size="11" font-family="Arial, sans-serif" fill="#64748b">${idLabel}</text>
        </g>
        ${edge}
      `;
    })
    .join("");

  const headline = escapeXml(document.drawingTitle || "As-Built Network Trace");
  const metaLine1 = escapeXml(`Generated: ${generatedAtLabel}`);
  const metaLine2 = escapeXml(
    `Region: ${context.regionId} | Start: ${context.startDeviceId} | End: ${context.endDeviceId} | Depth: ${context.maxDepth}`,
  );
  const metaLine3 = escapeXml(
    `Revision: ${document.revisionCode || "-"} | Prepared: ${document.preparedBy || "-"} | Checked: ${document.checkedBy || "-"} | Approved: ${document.approvedBy || "-"}`,
  );
  const metaLine4 = escapeXml(
    `Path Found: ${data.trace.found ? "Yes" : "No"} | Hop Count: ${data.trace.hop_count} | Graph Nodes: ${data.graph.nodes.length} | Graph Edges: ${data.graph.edges.length}`,
  );

  const content = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <marker id="arrow" markerWidth="10" markerHeight="10" refX="7" refY="3" orient="auto" markerUnits="strokeWidth">
      <path d="M0,0 L0,6 L8,3 z" fill="#64748b" />
    </marker>
  </defs>
  <rect x="0" y="0" width="${width}" height="${height}" fill="#ffffff" />
  <text x="${padding}" y="34" font-size="22" font-family="Arial, sans-serif" font-weight="700" fill="#0f172a">${headline}</text>
  <text x="${padding}" y="58" font-size="12" font-family="Arial, sans-serif" fill="#334155">${metaLine1}</text>
  <text x="${padding}" y="76" font-size="12" font-family="Arial, sans-serif" fill="#334155">${metaLine2}</text>
  <text x="${padding}" y="94" font-size="12" font-family="Arial, sans-serif" fill="#334155">${metaLine3}</text>
  <text x="${padding}" y="112" font-size="12" font-family="Arial, sans-serif" fill="#334155">${metaLine4}</text>
  ${nodesSvg || `<text x="${padding}" y="${titleBlockHeight + 56}" font-size="14" font-family="Arial, sans-serif" fill="#64748b">No trace path available.</text>`}
</svg>`;

  return { content, width, height };
}

function buildAsBuiltJsonSnapshot({
  data,
  generatedAtLabel,
  context,
  document,
}: {
  data: TopologyTraceResponse["data"];
  generatedAtLabel: string;
  context: {
    startDeviceId: string;
    endDeviceId: string;
    regionId: string;
    maxDepth: string;
    projectId: string | null;
    routeId: string | null;
  };
  document: {
    drawingTitle: string;
    revisionCode: string;
    preparedBy: string;
    checkedBy: string;
    approvedBy: string;
  };
}) {
  return {
    document: {
      title: document.drawingTitle || "As-Built Network Trace",
      revision_code: document.revisionCode || "v1",
      prepared_by_name: document.preparedBy || null,
      checked_by_name: document.checkedBy || null,
      approved_by_name: document.approvedBy || null,
      generated_at_label: generatedAtLabel,
      exported_at: new Date().toISOString(),
    },
    context,
    trace_request: data.request,
    trace_summary: {
      path_found: data.trace.found,
      hop_count: data.trace.hop_count,
      node_count: data.graph.nodes.length,
      edge_count: data.graph.edges.length,
    },
    path: data.trace.path,
    nodes: data.graph.nodes,
    connections: data.graph.edges,
  };
}

function buildAsBuiltCorePathCsv(data: TopologyTraceResponse["data"], nodeLabelMap: Map<string, string>) {
  const rows = [
    [
      "from_device",
      "to_device",
      "from_port",
      "to_port",
      "connection_type",
      "status",
      "core_range",
      "fiber_count",
      "used_core",
      "core_colors",
    ],
    ...data.graph.edges.map((edge) => [
      nodeLabelMap.get(edge.from_device_id) || edge.from_device_id,
      nodeLabelMap.get(edge.to_device_id) || edge.to_device_id,
      edge.from_port_label || "",
      edge.to_port_label || "",
      edge.connection_type || "",
      edge.status || "",
      formatCoreRange(edge.core_start, edge.core_end),
      String(edge.fiber_count || edge.fiber_cores?.total || 0),
      String(edge.fiber_cores?.used || 0),
      Object.keys(edge.fiber_cores?.colors || {}).join("; "),
    ]),
  ];

  return rows.map((row) => row.map(escapeCsvCell).join(",")).join("\r\n");
}

function escapeCsvCell(value: string) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

async function renderSvgToPngDataUrl(svgContent: string, width: number, height: number) {
  const svgBlob = new Blob([svgContent], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Gagal merender SVG ke PNG."));
      img.src = url;
    });

    const qualityScale = 2;
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * qualityScale));
    canvas.height = Math.max(1, Math.round(height * qualityScale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas context tidak tersedia.");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(url);
  }
}

function dataUrlToBlob(dataUrl: string) {
  const [header, data] = dataUrl.split(",");
  const mimeMatch = header.match(/data:(.*?);base64/);
  const mimeType = mimeMatch?.[1] || "application/octet-stream";
  const binary = atob(data);
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    array[i] = binary.charCodeAt(i);
  }
  return new Blob([array], { type: mimeType });
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
