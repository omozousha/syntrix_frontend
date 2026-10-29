"use client";

import { useMemo, useState } from "react";
import { Cable, Download, Eye, FileDown, Loader2, QrCode } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  buildCustomerQrHref,
  buildPatchCordLabelPngDataUrl,
  drawPatchCordLabelPdf,
  type PatchCordLabelPayload,
} from "@/lib/qr-label";
import { toast } from "sonner";
import QRCodeLib from "qrcode";

export type CustomerPortItem = {
  id: string;
  port_index: number;
  port_label?: string | null;
  customer_id?: string | null;
  customer_name?: string | null;
  customer_code?: string | null;
  customer_number?: string | null;
  ont_device_id?: string | null;
  status?: string | null;
};

type PatchCordLabelsSectionProps = {
  odpName: string;
  odpCode?: string;
  popName: string;
  ports: CustomerPortItem[];
  defaultTemplateStyle?: "plain" | "qr";
  loading?: boolean;
};

export function PatchCordLabelsSection({
  odpName,
  odpCode,
  popName,
  ports,
  defaultTemplateStyle = "plain",
  loading = false,
}: PatchCordLabelsSectionProps) {
  const [downloadingBulk, setDownloadingBulk] = useState(false);
  const [downloadingPortId, setDownloadingPortId] = useState<string | null>(null);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [previewPort, setPreviewPort] = useState<CustomerPortItem | null>(null);
  const [generatingPreview, setGeneratingPreview] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<"plain" | "qr">(defaultTemplateStyle);

  // Filter ports that have customer assignment
  const customerPorts = useMemo(() => {
    return (ports || [])
      .filter((p) => Boolean(p.customer_id || p.customer_name || p.customer_code))
      .sort((a, b) => Number(a.port_index) - Number(b.port_index));
  }, [ports]);

  const cleanPopName = useMemo(() => {
    return (popName || "POP").trim().toUpperCase();
  }, [popName]);

  async function resolveQrDataUrl(customerId?: string | null): Promise<string | undefined> {
    if (!customerId) return undefined;
    try {
      const href = buildCustomerQrHref({ customerId });
      return await QRCodeLib.toDataURL(href, {
        margin: 0,
        width: 140,
        errorCorrectionLevel: "M",
        color: { dark: "#020617", light: "#FFFFFF" },
      });
    } catch {
      return undefined;
    }
  }

  function getPayloadForPort(port: CustomerPortItem, variant: "plain" | "qr", qrDataUrl?: string): PatchCordLabelPayload {
    const rawCode = port.customer_code || port.customer_number || port.customer_id || "CSC-XXXX";
    const cleanCid = rawCode.replace(/^CID:\s*/i, "").trim().toUpperCase();

    return {
      popName: cleanPopName,
      customerCode: cleanCid,
      customerId: port.customer_id || undefined,
      customerName: port.customer_name || undefined,
      portLabel: port.port_label || `Port ${port.port_index}`,
      odpName: odpName || "ODP",
      qrDataUrl,
      variant,
    };
  }

  async function handleDownloadSingle(port: CustomerPortItem) {
    setDownloadingPortId(port.id);
    try {
      let qrDataUrl: string | undefined;
      if (selectedVariant === "qr") {
        qrDataUrl = await resolveQrDataUrl(port.customer_id);
      }
      const payload = getPayloadForPort(port, selectedVariant, qrDataUrl);
      const dataUrl = await buildPatchCordLabelPngDataUrl(payload);

      const link = document.createElement("a");
      link.href = dataUrl;
      const portSlug = (port.port_label || `port-${port.port_index}`).toLowerCase().replace(/[^a-z0-9_-]/g, "-");
      const cidSlug = payload.customerCode.toLowerCase().replace(/[^a-z0-9_-]/g, "-");
      link.download = `patch-cord-${portSlug}-${cidSlug}-${selectedVariant}.png`;
      link.click();
      toast.success(`Label patch cord ${port.port_label || `Port ${port.port_index}`} berhasil diunduh`);
    } catch (err) {
      toast.error((err as Error).message || "Gagal mengunduh label patch cord");
    } finally {
      setDownloadingPortId(null);
    }
  }

  async function handlePreview(port: CustomerPortItem) {
    setGeneratingPreview(true);
    setPreviewPort(port);
    try {
      let qrDataUrl: string | undefined;
      if (selectedVariant === "qr") {
        qrDataUrl = await resolveQrDataUrl(port.customer_id);
      }
      const payload = getPayloadForPort(port, selectedVariant, qrDataUrl);
      const dataUrl = await buildPatchCordLabelPngDataUrl(payload);
      setPreviewDataUrl(dataUrl);
    } catch (err) {
      toast.error((err as Error).message || "Gagal generate preview label");
    } finally {
      setGeneratingPreview(false);
    }
  }

  async function handleDownloadBulkPdf() {
    if (!customerPorts.length) return;
    setDownloadingBulk(true);
    try {
      const items: PatchCordLabelPayload[] = [];
      for (const port of customerPorts) {
        let qrDataUrl: string | undefined;
        if (selectedVariant === "qr") {
          qrDataUrl = await resolveQrDataUrl(port.customer_id);
        }
        items.push(getPayloadForPort(port, selectedVariant, qrDataUrl));
      }

      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      await drawPatchCordLabelPdf(doc, items);
      const odpSlug = (odpCode || odpName || "odp").toLowerCase().replace(/[^a-z0-9_-]/g, "-");
      doc.save(`patch-cord-labels-${odpSlug}-${selectedVariant}.pdf`);
      toast.success(`${items.length} label patch cord siap dicetak (PDF)`);
    } catch (err) {
      toast.error((err as Error).message || "Gagal export bulk PDF patch cord");
    } finally {
      setDownloadingBulk(false);
    }
  }

  return (
    <>
      <Card className="rounded-2xl border border-border/60 bg-card/60 p-0 shadow-xs backdrop-blur-xs">
        <CardHeader className="p-4 sm:p-5 pb-3 sm:pb-4 border-b border-border/40">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Cable className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base font-semibold tracking-tight text-foreground">
                      Label Patch Cord Customer
                    </CardTitle>
                    <Badge variant="outline" className="font-mono text-[9px] uppercase tracking-wider">
                      {customerPorts.length} Terhubung
                    </Badge>
                  </div>
                  <CardDescription className="text-xs text-muted-foreground">
                    Label fisik 2 panel untuk kabel drop/patch cord pelanggan di dalam ODP
                  </CardDescription>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Variant switcher */}
              <div className="inline-flex items-center rounded-lg border border-border/60 bg-muted/30 p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setSelectedVariant("plain")}
                  className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition-colors ${
                    selectedVariant === "plain"
                      ? "bg-background text-foreground shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Plain (2-Panel)
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedVariant("qr")}
                  className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition-colors ${
                    selectedVariant === "qr"
                      ? "bg-background text-foreground shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <QrCode className="h-3.5 w-3.5" />
                  QR Code
                </button>
              </div>

              {/* Bulk PDF export button */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadBulkPdf}
                disabled={loading || downloadingBulk || customerPorts.length === 0}
                className="h-8 gap-1.5 text-xs font-medium"
              >
                {downloadingBulk ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <FileDown className="h-3.5 w-3.5 text-primary" />
                )}
                <span>Download Semua (PDF)</span>
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-5">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground text-xs gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span>Memuat data port dan customer...</span>
            </div>
          ) : customerPorts.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 py-8 px-4 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted/60 text-muted-foreground mb-2">
                <Cable className="h-5 w-5" />
              </div>
              <p className="text-xs font-medium text-foreground">Belum ada pelanggan terhubung ke port ODP ini</p>
              <p className="text-[11px] text-muted-foreground max-w-sm mt-0.5">
                Label patch cord otomatis tersedia ketika port ODP di-assign ke data customer atau perangkat ONT.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {customerPorts.map((port) => {
                const portLabel = port.port_label || `PORT ${String(port.port_index).padStart(2, "0")}`;
                const cid = (port.customer_code || port.customer_number || port.customer_id || "CSC-XXXX")
                  .replace(/^CID:\s*/i, "")
                  .trim()
                  .toUpperCase();
                const isDownloading = downloadingPortId === port.id;

                return (
                  <div
                    key={port.id}
                    className="flex flex-col justify-between rounded-xl border border-border/50 bg-background/50 p-3 hover:border-border/80 transition-all shadow-2xs"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant="secondary" className="font-mono text-[10px] tracking-tight tabular-nums">
                          {portLabel}
                        </Badge>
                        <span className="font-mono text-[10px] text-muted-foreground uppercase">{cleanPopName}</span>
                      </div>

                      <div className="space-y-0.5">
                        <p className="font-mono text-xs font-bold tracking-tight text-foreground">
                          CID: {cid}
                        </p>
                        {port.customer_name && (
                          <p className="text-[11px] text-muted-foreground truncate" title={port.customer_name}>
                            {port.customer_name}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-1.5 mt-3 pt-2 border-t border-border/30">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePreview(port)}
                        className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" />
                        Preview
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadSingle(port)}
                        disabled={isDownloading}
                        className="h-7 px-2.5 text-[11px]"
                      >
                        {isDownloading ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                        ) : (
                          <Download className="h-3.5 w-3.5 mr-1 text-primary" />
                        )}
                        Download PNG
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={Boolean(previewDataUrl)} onOpenChange={(open) => !open && setPreviewDataUrl(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">
              Preview Label Patch Cord — {previewPort?.port_label || `Port ${previewPort?.port_index ?? ""}`}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Ukuran 720×220px dengan garis potong putus-putus di tengah untuk melilit kabel.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center justify-center p-3 rounded-xl border border-border/40 bg-muted/20">
            {generatingPreview ? (
              <div className="flex items-center gap-2 py-8 text-xs text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span>Membuat preview...</span>
              </div>
            ) : previewDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewDataUrl}
                alt="Patch cord label preview"
                className="w-full h-auto rounded-lg shadow-sm border border-border/50"
              />
            ) : null}
          </div>

          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" size="sm" onClick={() => setPreviewDataUrl(null)}>
              Tutup
            </Button>
            {previewPort && (
              <Button
                size="sm"
                onClick={() => {
                  handleDownloadSingle(previewPort);
                  setPreviewDataUrl(null);
                }}
              >
                <Download className="h-3.5 w-3.5 mr-1" />
                Download PNG
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
