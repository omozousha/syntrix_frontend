"use client";

import { useState } from "react";
import { Navigation, MapPin, ExternalLink, Copy, Check, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

type DeviceBentoLocationTileProps = {
  latitude?: number | string | null;
  longitude?: number | string | null;
  address?: string | null;
  popName?: string | null;
  cityName?: string | null;
  provinceName?: string | null;
  onOpenMapModal?: () => void;
};

export function DeviceBentoLocationTile({
  latitude,
  longitude,
  address,
  popName,
  cityName,
  provinceName,
  onOpenMapModal,
}: DeviceBentoLocationTileProps) {
  const [copied, setCopied] = useState(false);

  const numLat = Number(latitude);
  const numLng = Number(longitude);
  const hasCoords = Number.isFinite(numLat) && Number.isFinite(numLng) && numLat !== 0 && numLng !== 0;

  const coordString = hasCoords ? `${numLat.toFixed(6)}, ${numLng.toFixed(6)}` : "-";

  function copyCoordinates() {
    if (!hasCoords) return;
    navigator.clipboard.writeText(`${numLat},${numLng}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col justify-between rounded-2xl border border-border/60 bg-card p-5 sm:p-6 shadow-xs glass-inset transition-all duration-300">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
            <Compass className="size-4 text-sky-500" />
            <span>Lokasi &amp; Geotagging</span>
          </div>
          <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">WGS84</span>
        </div>

        {/* Address / Regional description */}
        <div className="space-y-1.5">
          <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Alamat / Titik Pasang</p>
          <p className="text-sm font-medium text-foreground leading-relaxed">
            {address || (popName ? `Wilayah POP ${popName}` : "Alamat fisik belum didaftarkan.")}
          </p>
          {(cityName || provinceName) ? (
            <p className="text-xs text-muted-foreground">
              {[cityName, provinceName].filter(Boolean).join(", ")}
            </p>
          ) : null}
        </div>

        {/* Coordinates Box */}
        <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Koordinat GPS</p>
              <p className="font-mono tabular-nums text-sm font-semibold text-foreground mt-0.5">
                {coordString}
              </p>
            </div>
            {hasCoords ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7 rounded-lg hover:bg-muted"
                onClick={copyCoordinates}
                title="Salin Koordinat"
              >
                {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5 text-muted-foreground" />}
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {/* Navigation Actions */}
      <div className="mt-5 pt-3 border-t border-border/40">
        {hasCoords ? (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${numLat},${numLng}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border/60 bg-muted/20 px-3 text-xs font-mono font-medium text-foreground transition-all duration-200 hover:border-primary/50 hover:bg-primary/5 active:scale-[0.98]"
            >
              <MapPin className="size-3.5 text-primary" />
              <span>Titik Google Maps</span>
            </a>
            <a
              href={`https://waze.com/ul?ll=${numLat},${numLng}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border/60 bg-muted/20 px-3 text-xs font-mono font-medium text-foreground transition-all duration-200 hover:border-sky-500/50 hover:bg-sky-500/5 active:scale-[0.98]"
            >
              <Navigation className="size-3.5 text-sky-500" />
              <span>Titik Waze</span>
            </a>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border/60 bg-muted/10 p-2.5 text-center text-xs text-muted-foreground">
            Koordinat GPS belum diatur pada aset ini.
          </div>
        )}
      </div>
    </div>
  );
}
