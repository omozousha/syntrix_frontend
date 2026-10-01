"use client";

import Image from "next/image";
import { BellRing, QrCode } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { buildQrPreviewPngDataUrl } from "@/lib/qr-label";
import { useTranslate } from "@/lib/use-locale";

type DeviceQrActionPanelProps = {
  qrDataUrl: string;
  logoDataUrl?: string;
  logoReady: boolean;
  deviceTypeLabel?: string;
  showReminder?: boolean;
  reminderDisabled: boolean;
  onOpenReminder: () => void;
  onDownloadQrLabel: () => void;
};

export function DeviceQrActionPanel({
  qrDataUrl,
  logoDataUrl,
  logoReady,
  deviceTypeLabel,
  showReminder = true,
  reminderDisabled,
  onOpenReminder,
  onDownloadQrLabel,
}: DeviceQrActionPanelProps) {
  const { t } = useTranslate();
  const [previewQr, setPreviewQr] = useState<{ key: string; dataUrl: string }>({ key: "", dataUrl: "" });
  const previewKey = `${qrDataUrl}::${logoDataUrl || ""}`;
  const previewQrDataUrl = previewQr.key === previewKey ? previewQr.dataUrl : "";
  const label = deviceTypeLabel ? t("qrPanel.labelWithType", { deviceType: deviceTypeLabel }) : t("qrPanel.labelDevice");

  useEffect(() => {
    if (!qrDataUrl || !logoReady) return;

    let cancelled = false;
    buildQrPreviewPngDataUrl(qrDataUrl, logoDataUrl)
      .then((url) => {
        if (!cancelled) setPreviewQr({ key: previewKey, dataUrl: url });
      })
      .catch(() => {
        if (!cancelled) setPreviewQr({ key: previewKey, dataUrl: "" });
      });

    return () => {
      cancelled = true;
    };
  }, [logoDataUrl, logoReady, previewKey, qrDataUrl]);

  return (
    <div className="space-y-2 rounded-md border p-3">
      <div className="flex items-center gap-2">
        <QrCode className="size-4 text-muted-foreground" />
        <p className="text-sm font-medium">{label}</p>
      </div>
      <div className="flex items-center justify-center rounded-md border bg-background p-3">
        {qrDataUrl && logoReady && previewQrDataUrl ? (
          <Image src={previewQrDataUrl} alt={label} width={180} height={180} unoptimized className="size-40" />
        ) : qrDataUrl ? (
          <div className="flex size-40 items-center justify-center rounded-md bg-muted/30 text-center text-xs text-muted-foreground">
            {t("qrPanel.loadingLogo")}
          </div>
        ) : (
          <div className="flex size-40 items-center justify-center text-xs text-muted-foreground">
            {t("qrPanel.unavailable")}
          </div>
        )}
      </div>
      <div className={showReminder ? "grid grid-cols-2 gap-2" : "grid grid-cols-1"}>
        {showReminder ? (
          <Button type="button" variant="outline" size="sm" onClick={onOpenReminder} disabled={reminderDisabled}>
            <BellRing className="mr-1.5 size-3.5" />
            {t("qrPanel.reminder")}
          </Button>
        ) : null}
        <Button type="button" variant="outline" size="sm" onClick={onDownloadQrLabel} disabled={!qrDataUrl || !logoReady}>
          {t("qrPanel.download")}
        </Button>
      </div>
    </div>
  );
}
