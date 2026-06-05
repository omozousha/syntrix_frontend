"use client";

import Image from "next/image";
import { BellRing, QrCode } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { buildQrPreviewPngDataUrl } from "@/lib/qr-label";

type OdpQrActionPanelProps = {
  qrDataUrl: string;
  logoDataUrl?: string;
  reminderDisabled: boolean;
  onOpenReminder: () => void;
  onDownloadQrLabel: () => void;
};

export function OdpQrActionPanel({
  qrDataUrl,
  logoDataUrl,
  reminderDisabled,
  onOpenReminder,
  onDownloadQrLabel,
}: OdpQrActionPanelProps) {
  const [previewQrDataUrl, setPreviewQrDataUrl] = useState("");

  useEffect(() => {
    if (!qrDataUrl) return;

    let cancelled = false;
    buildQrPreviewPngDataUrl(qrDataUrl, logoDataUrl)
      .then((url) => {
        if (!cancelled) setPreviewQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setPreviewQrDataUrl(qrDataUrl);
      });

    return () => {
      cancelled = true;
    };
  }, [logoDataUrl, qrDataUrl]);

  return (
    <div className="space-y-2 rounded-md border p-3">
      <div className="flex items-center gap-2">
        <QrCode className="size-4 text-muted-foreground" />
        <p className="text-sm font-medium">QR Label ODP</p>
      </div>
      <div className="flex items-center justify-center rounded-md border bg-background p-3">
        {qrDataUrl ? (
          <Image src={previewQrDataUrl || qrDataUrl} alt="QR ODP" width={180} height={180} unoptimized className="size-40" />
        ) : (
          <div className="flex size-40 items-center justify-center text-xs text-muted-foreground">
            QR belum tersedia
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onOpenReminder} disabled={reminderDisabled}>
          <BellRing className="mr-1.5 size-3.5" />
          Reminder
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onDownloadQrLabel} disabled={!qrDataUrl}>
          Download
        </Button>
      </div>
    </div>
  );
}
