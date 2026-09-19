"use client";

import * as React from "react";
import Link from "next/link";
import {
  X,
  Copy,
  Check,
  ExternalLink,
  Navigation,
  MapPin,
  Radio,
  Scale,
  Minus,
  Maximize2,
  Route,
  Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { MapDevice } from "@/components/features/maps/topology-map-canvas";

export type MapFilterOptionRow = Record<string, unknown> & {
  id?: string | null;
  region_id?: string | null;
};

export type MapDeviceInspectorDrawerProps = {
  isOpen: boolean;
  devices: MapDevice[];
  onClose: () => void;
  onRemoveDevice: (id: string) => void;
  regions: MapFilterOptionRow[];
  pops: MapFilterOptionRow[];
  onSetNavigationDestination?: (device: MapDevice) => void;
  onConnectDevicesRoute?: (origin: MapDevice, destination: MapDevice) => void;
  isSidebarOpen?: boolean;
};

function textValue(value: unknown): string {
  if (value == null) return "";
  const text = String(value).trim();
  return text && text !== "-" ? text : "";
}

function findReferenceLabel(
  rows: MapFilterOptionRow[],
  id: unknown,
  fields: string[],
  fallback: string,
): string {
  if (id == null) return "-";
  const target = String(id);
  const match = rows.find((row) => String(row.id) === target);
  if (!match) return target || fallback;
  const values = fields.map((field) => textValue(match[field])).filter(Boolean);
  if (!values.length) return target || fallback;
  return values[0];
}

function getGoogleMapsUrl(lat?: number | string | null, lng?: number | string | null): string | null {
  const nLat = Number(lat);
  const nLng = Number(lng);
  if (!Number.isFinite(nLat) || !Number.isFinite(nLng)) return null;
  return `https://www.google.com/maps/search/?api=1&query=${nLat.toFixed(6)},${nLng.toFixed(6)}`;
}

function renderPortUtilization(
  totalPorts?: number | null,
  usedPorts?: number | null,
  splitterRatio?: string | null,
) {
  const total = Number(totalPorts);
  const used = Number(usedPorts);
  const hasTotal = Number.isFinite(total) && total > 0;
  const hasUsed = Number.isFinite(used) && used >= 0;

  if (!hasTotal) {
    return (
      <div className="flex items-center justify-between text-[9px] font-mono">
        <span className="text-muted-foreground">Splitter:</span>
        <strong className="text-foreground">{splitterRatio || "-"}</strong>
      </div>
    );
  }

  const effectiveUsed = hasUsed ? Math.min(used, total) : 0;
  const percent = Math.round((effectiveUsed / total) * 100);
  const available = total - effectiveUsed;

  const barColor =
    percent >= 90
      ? "bg-rose-500"
      : percent >= 70
        ? "bg-amber-500"
        : "bg-emerald-500";

  return (
    <div className="space-y-1 w-full">
      <div className="flex items-center justify-between text-[9px] font-mono">
        <span className="text-muted-foreground">
          {hasUsed ? `${effectiveUsed}/${total} Port (${percent}%)` : `${total} Port`}
        </span>
        <span className={cn("font-bold", available === 0 ? "text-rose-500" : "text-emerald-500")}>
          {hasUsed ? `${available} Kosong` : splitterRatio || ""}
        </span>
      </div>
      {hasUsed && (
        <div className="h-1.5 w-full rounded-full bg-muted/60 overflow-hidden border border-border/40">
          <div
            className={cn("h-full rounded-full transition-all duration-300", barColor)}
            style={{ width: `${percent}%` }}
          />
        </div>
      )}
    </div>
  );
}

export function MapDeviceInspectorDrawer({
  isOpen,
  devices,
  onClose,
  onRemoveDevice,
  regions,
  pops,
  onSetNavigationDestination,
  onConnectDevicesRoute,
  isSidebarOpen = false,
}: MapDeviceInspectorDrawerProps) {
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null);
  const [isMinimized, setIsMinimized] = React.useState(false);

  const handleCopy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1500);
    } catch {
      // Clipboard unavailable
    }
  };

  if (!isOpen || devices.length === 0) {
    return null;
  }

  const isCompareMode = devices.length > 1;

  const getStatusColor = (status?: string | null) => {
    if (status === "validated") return "text-emerald-500 border-emerald-500/30 bg-emerald-500/10";
    if (status === "impacted") return "text-rose-500 border-rose-500/30 bg-rose-500/10";
    return "text-amber-500 border-amber-500/30 bg-amber-500/10";
  };

  // Minimized floating pill bar (bottom, avoiding open sidebar)
  if (isMinimized) {
    return (
      <div
        className={cn(
          "absolute bottom-4 z-30 pointer-events-auto transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
          isSidebarOpen ? "hidden sm:flex sm:left-[362px]" : "left-1/2 -translate-x-1/2",
        )}
      >
        <div className="rounded-full border border-border/40 bg-background/90 p-1 shadow-xl backdrop-blur-xl glass-inset">
          <div className="flex items-center gap-2 rounded-full border border-border/60 bg-card/95 px-3 py-1.5 shadow-xs">
            {isCompareMode ? (
              <Scale className="size-3.5 text-primary" />
            ) : (
              <Radio className="size-3.5 text-primary animate-pulse" />
            )}
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-foreground">
              {isCompareMode ? `Komparasi (${devices.length})` : devices[0].device_name || "Inspector"}
            </span>

            <div className="h-3 w-px bg-border/60 mx-1" />

            <button
              type="button"
              onClick={() => setIsMinimized(false)}
              title="Buka panel inspector"
              className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider text-primary hover:underline"
            >
              <Maximize2 className="size-3" />
              <span>Buka</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              title="Tutup inspector"
              className="size-5 flex items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <X className="size-3" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ponytail: dock width fixed to h-[350px] bottom dock; multi-device card carousel scrolls horizontally up to 4 devices.
  const dev1 = devices[0];
  const dev2 = devices[1];

  const isSamePop = dev2 && dev1.pop_id && dev1.pop_id === dev2.pop_id;
  const isSameRegion = dev2 && dev1.region_id && dev1.region_id === dev2.region_id;

  return (
    <aside
      role="complementary"
      aria-label={isCompareMode ? "Komparasi Perangkat" : "Inspector Perangkat"}
      className={cn(
        "absolute bottom-3 right-3 z-30 flex flex-col h-[350px] max-h-[46vh] pointer-events-auto transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
        isSidebarOpen ? "hidden sm:flex sm:left-[362px]" : "flex left-3",
        "animate-in fade-in slide-in-from-bottom-8",
      )}
    >
      <div className="flex flex-col h-full w-full rounded-2xl border border-border/40 bg-card/95 p-1.5 shadow-2xl backdrop-blur-xl glass-inset">
        <div className="flex flex-col h-full w-full rounded-[calc(1rem-0.15rem)] border border-border/60 bg-card/85 p-3 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2 mb-2 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex size-7 items-center justify-center rounded-lg border border-primary/40 bg-primary/10 text-primary shrink-0">
                {isCompareMode ? <Scale className="size-3.5" /> : <Radio className="size-3.5" />}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground block truncate">
                    {isCompareMode ? "Komparasi" : "Inspector Perangkat"}
                  </span>
                  <Badge variant="outline" className="h-4 rounded-full px-1.5 font-mono text-[8px] font-bold border-primary/30 bg-primary/10 text-primary">
                    {devices.length} Perangkat
                  </Badge>
                </div>
                <p className="font-semibold text-xs text-foreground truncate">
                  {isCompareMode
                    ? "Perbandingan Spesifikasi Multi-Select"
                    : dev1?.device_name || dev1?.device_id || "Detail Perangkat"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setIsMinimized(true)}
                title="Kecilkan ke floating pill di bawah peta"
                className="size-7 flex items-center justify-center rounded-full border border-border/60 text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-all active:scale-95"
              >
                <Minus className="size-3.5" />
              </button>

              <button
                type="button"
                onClick={onClose}
                title="Tutup inspector"
                className="size-7 flex items-center justify-center rounded-full border border-border/60 text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-all active:scale-95"
              >
                <X className="size-3.5" />
              </button>
            </div>
          </div>

          {/* Bottom Dock Body */}
          <div className="flex-1 min-h-0 flex flex-row gap-3 overflow-hidden">
            {/* Left Spatial Relations & Quick Route Panel */}
            <div className="w-[210px] shrink-0 flex flex-col justify-between rounded-xl border border-primary/30 bg-primary/5 p-3 space-y-2">
              {isCompareMode ? (
                <>
                  <div className="space-y-2.5">
                    <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground block">
                      Relasi Spasial:
                    </span>

                    <div className="space-y-1 text-xs">
                      <div className="flex items-center justify-between text-[10px] font-mono">
                        <span className="text-muted-foreground">POP Induk:</span>
                        <span className="font-semibold text-foreground">
                          {isSamePop ? "✓ Sama" : "Berbeda"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[10px] font-mono">
                        <span className="text-muted-foreground">Wilayah:</span>
                        <span className="font-semibold text-foreground">
                          {isSameRegion ? "✓ Sama" : "Berbeda"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {onConnectDevicesRoute && dev1 && dev2 && (
                      <button
                        type="button"
                        onClick={() => onConnectDevicesRoute(dev1, dev2)}
                        className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-primary/40 bg-primary/20 py-2 font-mono text-[10px] font-bold uppercase tracking-wider text-primary hover:bg-primary/30 active:scale-[0.98] transition-all shadow-xs"
                        title="Hitung rute jalan OSRM antar kedua perangkat"
                      >
                        <Route className="size-3.5" />
                        <span>Rute (#1 ➔ #2)</span>
                      </button>
                    )}

                    <p className="font-mono text-[8px] text-muted-foreground text-center">
                      Shift + Klik untuk tambah perangkat
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2.5">
                    <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground block">
                      Info Seleksi:
                    </span>

                    <div className="rounded-lg border border-primary/20 bg-background/50 p-2 space-y-1">
                      <span className="font-mono text-[8px] uppercase tracking-wider text-muted-foreground block font-bold">
                        Multi-Select
                      </span>
                      <p className="text-[10px] text-muted-foreground leading-snug">
                        Tahan <kbd className="px-1 py-0.5 rounded border border-border/60 bg-muted/80 text-[8px] font-mono font-bold text-foreground">Shift</kbd> + klik perangkat lain pada peta untuk komparasi langsung.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {onSetNavigationDestination && dev1 && (
                      <button
                        type="button"
                        onClick={() => onSetNavigationDestination(dev1)}
                        className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-primary/40 bg-primary/20 py-2 font-mono text-[10px] font-bold uppercase tracking-wider text-primary hover:bg-primary/30 active:scale-[0.98] transition-all shadow-xs"
                        title="Navigasi rute jalan ke perangkat ini"
                      >
                        <Navigation className="size-3.5" />
                        <span>Rute ke Sini</span>
                      </button>
                    )}

                    <p className="font-mono text-[8px] text-muted-foreground text-center">
                      1 perangkat aktif di dock
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Right Scrollable Device Cards Row */}
            <div className="flex-1 min-w-0 flex flex-row gap-3 overflow-x-auto thin-scrollbar pb-1 items-stretch">
              {devices.map((device, idx) => {
                const lat = device.latitude != null ? Number(device.latitude) : NaN;
                const lng = device.longitude != null ? Number(device.longitude) : NaN;
                const coordString = Number.isFinite(lat) && Number.isFinite(lng) ? `${lat.toFixed(6)}, ${lng.toFixed(6)}` : "-";
                const gmapsUrl = getGoogleMapsUrl(lat, lng);
                const popLabel = findReferenceLabel(pops, device.pop_id, ["pop_name", "pop_code", "pop_id"], "POP");
                const regionLabel = findReferenceLabel(regions, device.region_id, ["region_name", "region_code", "name"], "Region");
                const detailHref = `/data-management/list/${(device.device_type_key || "devices").toLowerCase()}/${device.id}`;

                return (
                  <div
                    key={device.id}
                    className="w-[300px] sm:w-[310px] shrink-0 flex flex-col justify-between rounded-xl border border-border/60 bg-muted/15 p-3 shadow-2xs glass-inset transition-all"
                  >
                    {/* Card Header */}
                    <div className="space-y-1.5 border-b border-border/40 pb-2">
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground font-mono text-[9px] font-bold shrink-0">
                            {idx + 1}
                          </span>
                          <span className="font-mono text-[8px] uppercase tracking-wider font-bold text-muted-foreground">
                            {device.device_type_key || "DEV"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={cn("inline-flex items-center rounded-full border px-1.5 py-0.2 font-mono text-[7px] font-bold uppercase", getStatusColor(device.marker_status))}>
                            {device.marker_status || "Unvalidated"}
                          </span>
                          <button
                            type="button"
                            onClick={() => onRemoveDevice(device.id)}
                            title="Hapus perangkat ini"
                            className="size-5 flex items-center justify-center rounded-full text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <X className="size-3" />
                          </button>
                        </div>
                      </div>
                      <h4 className="font-semibold text-xs text-foreground truncate" title={device.device_name || device.device_id || "Device"}>
                        {device.device_name || device.device_id || "Device"}
                      </h4>
                    </div>

                    {/* Attributes Grid */}
                    <div className="grid grid-cols-2 gap-1.5 text-[10px] py-1.5">
                      <div className="rounded-lg border border-border/40 bg-card/60 p-1.5">
                        <span className="font-mono text-[7px] uppercase tracking-wider text-muted-foreground block mb-0.5">POP Induk</span>
                        <span className="font-semibold text-foreground block truncate" title={popLabel}>{popLabel}</span>
                      </div>
                      <div className="rounded-lg border border-border/40 bg-card/60 p-1.5">
                        <span className="font-mono text-[7px] uppercase tracking-wider text-muted-foreground block mb-0.5">Region</span>
                        <span className="font-semibold text-foreground block truncate" title={regionLabel}>{regionLabel}</span>
                      </div>
                      <div className="col-span-2 rounded-lg border border-border/40 bg-card/60 p-1.5">
                        <span className="font-mono text-[7px] uppercase tracking-wider text-muted-foreground block mb-0.5">Utilisasi Port</span>
                        {renderPortUtilization(device.total_ports, device.used_ports, device.splitter_ratio)}
                      </div>
                      <div className="col-span-2 rounded-lg border border-border/40 bg-card/60 p-1.5">
                        <div className="flex items-center justify-between font-mono text-[8px]">
                          <span className="text-muted-foreground">{coordString}</span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleCopy(`h-coord-${device.id}`, coordString)}
                              className="text-primary hover:underline font-sans"
                            >
                              {copiedKey === `h-coord-${device.id}` ? "✓" : "Salin"}
                            </button>
                            {gmapsUrl && (
                              <a
                                href={gmapsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-muted-foreground hover:text-primary inline-flex items-center gap-0.5"
                                title="Buka di Google Maps eksternal"
                              >
                                <Globe className="size-2.5" />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-1.5 border-t border-border/40 flex items-center gap-1.5">
                      <Link
                        href={detailHref}
                        className="flex-1 flex items-center justify-center gap-1 rounded-lg border border-border/60 bg-muted/30 py-1.5 font-mono text-[9px] font-bold uppercase tracking-wider text-foreground hover:bg-muted/60 transition-all active:scale-[0.98]"
                      >
                        <span>Detail</span>
                        <ExternalLink className="size-2.5 text-muted-foreground" />
                      </Link>
                      {onSetNavigationDestination && (
                        <button
                          type="button"
                          onClick={() => onSetNavigationDestination(device)}
                          title="Navigasi ke perangkat ini"
                          className="size-7 flex items-center justify-center rounded-lg border border-border/60 bg-muted/20 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all active:scale-95 shrink-0"
                        >
                          <Navigation className="size-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

// ponytail: single view card aligns with multi-view card size (~310-340px). Dock offsets when sidebar opens (sm:left-[362px], hidden on mobile when sidebar active). Upgrade when multi-dock docking manager introduced.
