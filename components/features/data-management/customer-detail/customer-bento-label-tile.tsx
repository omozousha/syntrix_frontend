"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Download, FileDown, Loader2, QrCode } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  buildCustomerQrHref,
  buildPatchCordLabelPngDataUrl,
  drawPatchCordLabelPdf,
  type PatchCordLabelPayload,
} from "@/lib/qr-label";
import { toast } from "sonner";
import QRCodeLib from "qrcode";

type CustomerBentoLabelTileProps = {
  customerId: string;
  customerCode: string;
  customerName?: string;
  popName?: string;
  portLabel?: string;
  odpName?: string;
  defaultTemplateStyle?: "plain" | "qr";
  publicUrl?: string;
};

export function CustomerBentoLabelTile({
  customerId,
  customerCode,
  customerName,
  popName,
  portLabel,
  odpName,
  defaultTemplateStyle = "plain",
  publicUrl,
}: CustomerBentoLabelTileProps) {
  const [selectedVariant, setSelectedVariant] = useState<"plain" | "qr">(defaultTemplateStyle);
  const [previewDataUrl, setPreviewDataUrl] = useState<string>("");
  const [generating, setGenerating] = useState(false);
  const [downloadingPng, setDownloadingPng] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    setSelectedVariant(defaultTemplateStyle);
  }, [defaultTemplateStyle]);

  const cleanPopName = useMemo(() => {
    return (popName || "POP").trim().toUpperCase();
  }, [popName]);

  const cleanCid = useMemo(() => {
    return (customerCode || "CSC-XXXX").replace(/^CID:\s*/i, "").trim().toUpperCase();
  }, [customerCode]);

  useEffect(() => {
    let cancelled = false;

    async function generatePreview() {
      setGenerating(true);
      try {
        let qrDataUrl: string | undefined;
        if (selectedVariant === "qr") {
          const href = publicUrl || buildCustomerQrHref({ customerId });
          qrDataUrl = await QRCodeLib.toDataURL(href, {
            margin: 0,
            width: 140,
            errorCorrectionLevel: "M",
            color: { dark: "#020617", light: "#FFFFFF" },
          });
        }

        const payload: PatchCordLabelPayload = {
          popName: cleanPopName,
          customerCode: cleanCid,
          customerId,
          customerName: customerName || undefined,
          portLabel: portLabel || undefined,
          odpName: odpName || "ODP",
          qrDataUrl,
          variant: selectedVariant,
        };

        const dataUrl = await buildPatchCordLabelPngDataUrl(payload);
        if (!cancelled) setPreviewDataUrl(dataUrl);
      } catch {
        if (!cancelled) setPreviewDataUrl("");
      } finally {
        if (!cancelled) setGenerating(false);
      }
    }

    void generatePreview();
    return () => {
      cancelled = true;
    };
  }, [customerId, cleanCid, cleanPopName, customerName, portLabel, odpName, selectedVariant, publicUrl]);

  async function handleDownloadPng() {
    if (!previewDataUrl) return;
    setDownloadingPng(true);
    try {
      const link = document.createElement("a");
      link.href = previewDataUrl;
      const cidSlug = cleanCid.toLowerCase().replace(/[^a-z0-9_-]/g, "-");
      link.download = `label-patchcord-${cidSlug}-${selectedVariant}.png`;
      link.click();
      toast.success("Label patch cord customer berhasil diunduh (PNG)");
    } catch (err) {
      toast.error((err as Error).message || "Gagal mengunduh label");
    } finally {
      setDownloadingPng(false);
    }
  }

  async function handleDownloadPdf() {
    setDownloadingPdf(true);
    try {
      let qrDataUrl: string | undefined;
      if (selectedVariant === "qr") {
        const href = publicUrl || buildCustomerQrHref({ customerId });
        qrDataUrl = await QRCodeLib.toDataURL(href, {
          margin: 0,
          width: 140,
          errorCorrectionLevel: "M",
          color: { dark: "#020617", light: "#FFFFFF" },
        });
      }

      const payload: PatchCordLabelPayload = {
        popName: cleanPopName,
        customerCode: cleanCid,
        customerId,
        customerName: customerName || undefined,
        portLabel: portLabel || undefined,
        odpName: odpName || "ODP",
        qrDataUrl,
        variant: selectedVariant,
      };

      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      await drawPatchCordLabelPdf(doc, [payload]);
      const cidSlug = cleanCid.toLowerCase().replace(/[^a-z0-9_-]/g, "-");
      doc.save(`label-patchcord-${cidSlug}-${selectedVariant}.pdf`);
      toast.success("Lembar label cetak siap (PDF)");
    } catch (err) {
      toast.error((err as Error).message || "Gagal generate PDF label");
    } finally {
      setDownloadingPdf(false);
    }
  }

  function handleCopyLink() {
    const url = publicUrl || (typeof window !== "undefined" ? window.location.href : "");
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    toast.success("Tautan profil customer disalin ke clipboard");
    setTimeout(() => setCopiedLink(false), 2000);
  }

  return (
    <Card className="flex flex-col justify-between rounded-2xl border-border/60 shadow-xs glass-inset transition-all duration-300">
      <CardContent className="p-5 sm:p-6 space-y-4 flex flex-col justify-between h-full">
        {/* Header & Variant Switcher */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-border/40 pb-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <QrCode className="size-4 text-primary" />
              <span>Label Patch Cord Customer</span>
            </div>
            <Badge variant="outline" className="font-mono text-[9px] uppercase tracking-wider">
              2-Panel 720×220
            </Badge>
          </div>

          {/* Switcher Variant */}
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Varian Label
            </span>
            <div className="inline-flex items-center rounded-lg border border-border/60 bg-muted/30 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setSelectedVariant("plain")}
                className={`inline-flex items-center gap-1 rounded-md px-2 py-1 font-mono text-[10px] uppercase transition-colors ${
                  selectedVariant === "plain"
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Plain
              </button>
              <button
                type="button"
                onClick={() => setSelectedVariant("qr")}
                className={`inline-flex items-center gap-1 rounded-md px-2 py-1 font-mono text-[10px] uppercase transition-colors ${
                  selectedVariant === "qr"
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <QrCode className="size-3" />
                QR Code
              </button>
            </div>
          </div>

          {/* Preview Container Double-Bezel */}
          <div className="relative flex min-h-[110px] w-full items-center justify-center rounded-xl border border-border/50 bg-muted/15 p-2 shadow-2xs">
            {generating ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground py-6">
                <Loader2 className="size-4 animate-spin text-primary" />
                <span>Membuat preview...</span>
              </div>
            ) : previewDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewDataUrl}
                alt="Customer Patch Cord Label Preview"
                className="w-full h-auto rounded-lg border border-border/60 shadow-xs object-contain"
              />
            ) : (
              <span className="text-xs text-muted-foreground py-6">Preview tidak tersedia</span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-2 border-t border-border/30">
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadPng}
              disabled={generating || downloadingPng || !previewDataUrl}
              className="h-8 rounded-full font-mono text-[10px] uppercase tracking-wider transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
            >
              {downloadingPng ? (
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              ) : (
                <Download className="mr-1.5 size-3.5 text-primary" />
              )}
              PNG
            </Button>

            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handleDownloadPdf}
              disabled={generating || downloadingPdf}
              className="h-8 rounded-full font-mono text-[10px] uppercase tracking-wider transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
            >
              {downloadingPdf ? (
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              ) : (
                <FileDown className="mr-1.5 size-3.5" />
              )}
              PDF Cetak
            </Button>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleCopyLink}
            className="w-full h-7 rounded-full font-mono text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
          >
            {copiedLink ? (
              <>
                <Check className="mr-1.5 size-3 text-emerald-500" />
                Tautan Disalin
              </>
            ) : (
              <>
                <Copy className="mr-1.5 size-3" />
                Salin Tautan Profil
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
