"use client";

import { useState } from "react";
import Image from "next/image";
import { Download, QrCode, Copy, Check, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

type DeviceBentoQrTileProps = {
  qrDataUrl: string;
  deviceTypeLabel?: string;
  onDownloadQrLabel?: () => void;
  publicUrl?: string;
};

export function DeviceBentoQrTile({
  qrDataUrl,
  deviceTypeLabel = "Device",
  onDownloadQrLabel,
  publicUrl,
}: DeviceBentoQrTileProps) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    const url = publicUrl || window.location.href;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col items-center justify-between rounded-2xl border border-border/60 bg-card p-5 sm:p-6 shadow-xs glass-inset text-center">
      <div className="w-full space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <QrCode className="size-4 text-primary" />
            <span>QR Label Asset</span>
          </div>
          <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">ISO/IEC 18004</span>
        </div>

        {/* QR Code Canvas with Double-Bezel effect */}
        <div className="mx-auto flex size-40 items-center justify-center rounded-2xl border border-border/40 bg-muted/15 p-2 shadow-2xs">
          <div className="relative flex size-full items-center justify-center rounded-xl bg-white p-2 shadow-xs">
            {qrDataUrl ? (
              <Image
                src={qrDataUrl}
                alt="QR Code Device"
                width={140}
                height={140}
                className="size-full object-contain"
                unoptimized
              />
            ) : (
              <div className="flex flex-col items-center justify-center gap-1 text-slate-400">
                <QrCode className="size-8 animate-pulse" />
                <span className="font-mono text-[9px]">Generating...</span>
              </div>
            )}
          </div>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">
          Pindai untuk verifikasi fisik di lapangan atau unduh label stiker standar.
        </p>
      </div>

      {/* Buttons */}
      <div className="mt-4 flex w-full flex-col gap-2 pt-3 border-t border-border/40">
        {onDownloadQrLabel ? (
          <Button
            type="button"
            className="w-full h-10 rounded-xl bg-primary text-primary-foreground text-xs font-semibold shadow-xs transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98] hover:bg-primary/90"
            onClick={onDownloadQrLabel}
          >
            <Download className="mr-2 size-4" />
            <span>Unduh Label QR (PNG)</span>
          </Button>
        ) : null}

        <Button
          type="button"
          variant="outline"
          className="w-full h-9 rounded-xl border-border/60 bg-muted/20 text-xs font-medium hover:bg-muted/40 active:scale-[0.98]"
          onClick={handleCopy}
        >
          {copied ? (
            <>
              <Check className="mr-2 size-3.5 text-emerald-500" />
              <span className="text-emerald-600 dark:text-emerald-400">Tautan Disalin!</span>
            </>
          ) : (
            <>
              <Copy className="mr-2 size-3.5 text-muted-foreground" />
              <span>Salin Tautan QR</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
