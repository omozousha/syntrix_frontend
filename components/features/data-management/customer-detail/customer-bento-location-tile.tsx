"use client";

import { useState } from "react";
import { Check, Compass, Copy, MapPin, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslate } from "@/lib/use-locale";

type CustomerBentoLocationTileProps = {
  address?: string | null;
  city?: string | null;
  province?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  onOpenNavigation?: () => void;
};

export function CustomerBentoLocationTile({
  address,
  city,
  province,
  latitude,
  longitude,
  onOpenNavigation,
}: CustomerBentoLocationTileProps) {
  const { t } = useTranslate();
  const [copiedCoords, setCopiedCoords] = useState(false);

  const numLat = Number(latitude);
  const numLng = Number(longitude);
  const hasCoords = Number.isFinite(numLat) && Number.isFinite(numLng) && numLat !== 0 && numLng !== 0;

  function handleCopyCoords() {
    if (!hasCoords) return;
    navigator.clipboard.writeText(`${numLat},${numLng}`);
    setCopiedCoords(true);
    setTimeout(() => setCopiedCoords(false), 2000);
  }

  function handleOpenGoogleMaps() {
    if (!hasCoords) return;
    window.open(`https://www.google.com/maps/search/?api=1&query=${numLat},${numLng}`, "_blank");
  }

  return (
    <Card className="flex h-full flex-col justify-between rounded-2xl border-border/60 shadow-xs glass-inset transition-all duration-300">
      <CardContent className="p-5 sm:p-6 space-y-4 flex flex-col justify-between h-full">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/40 pb-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <Compass className="size-4 text-sky-500" />
              <span>{t("detailPage.customer.locationTitle")}</span>
            </div>
            <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">WGS84</span>
          </div>

          {/* Address Box */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] font-mono uppercase tracking-wider">
              <MapPin className="size-3 text-red-500" />
              <span>{t("detailPage.customerTile.installAddress")}</span>
            </div>
            <p className="text-xs text-foreground font-medium leading-relaxed">
              {address || t("detailPage.customerTile.addressEmpty")}
            </p>
            {(city || province) && (
              <p className="text-[11px] text-muted-foreground">
                {[city, province].filter(Boolean).join(", ")}
              </p>
            )}
          </div>

          {/* Coordinates Box (Double-Bezel) */}
          <div className="flex flex-col justify-between rounded-xl border border-border/40 bg-muted/10 p-2.5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                {t("detailPage.customerTile.gpsCoords")}
              </span>
              {hasCoords && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyCoords}
                  className="h-5 px-1.5 text-[10px] font-mono text-muted-foreground hover:text-foreground"
                >
                  {copiedCoords ? (
                    <>
                      <Check className="mr-1 size-2.5 text-emerald-500" />
                      {t("detailPage.customerTile.copied")}
                    </>
                  ) : (
                    <>
                      <Copy className="mr-1 size-2.5" />
                      {t("detailPage.customerTile.copy")}
                    </>
                  )}
                </Button>
              )}
            </div>

            <div className="mt-1 font-mono text-xs font-medium text-foreground tabular-nums">
              {hasCoords ? `${numLat.toFixed(6)}, ${numLng.toFixed(6)}` : t("detailPage.customerTile.notGeotagged")}
            </div>
          </div>
        </div>

        {/* Navigation Action */}
        {hasCoords && (
          <div className={`${onOpenNavigation ? "grid grid-cols-1 gap-2 sm:grid-cols-2" : "flex"} pt-2 border-t border-border/30`}>
            {onOpenNavigation ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onOpenNavigation}
                className="w-full min-w-0 h-8 rounded-full font-mono text-[10px] uppercase tracking-wider transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
              >
                <Navigation className="mr-1.5 size-3.5 text-primary" />
                <span className="truncate">{t("detailPage.ui.routeNavigation")}</span>
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleOpenGoogleMaps}
              className="w-full min-w-0 h-8 rounded-full font-mono text-[10px] uppercase tracking-wider transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
            >
              <MapPin className="mr-1.5 size-3.5 text-primary" />
              <span className="truncate">{t("detailPage.customerTile.googleMaps")}</span>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
