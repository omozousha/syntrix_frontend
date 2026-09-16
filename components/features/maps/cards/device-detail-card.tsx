"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Copy, ExternalLink, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { OptimizedImage } from "@/components/ui/optimized-image";
import type { MapDevice } from "@/components/features/maps/topology-map-canvas";

export type MapFilterOptionRow = Record<string, unknown> & {
  id?: string | null;
  region_id?: string | null;
};

interface DeviceDetailCardProps {
  device: MapDevice | null;
  index?: number;
  total?: number;
  onClose: (id: string) => void;
  regions: MapFilterOptionRow[];
  pops: MapFilterOptionRow[];
}

function textValue(value: unknown): string {
  if (value == null) return "";
  const text = String(value).trim();
  return text && text !== "-" ? text : "";
}

function findReferenceLabel(
  rows: MapFilterOptionRow[],
  id: unknown,
  fields: string[],
  _fallback: string,
): string {
  if (id == null) return "-";
  const target = String(id);
  const match = rows.find((row) => String(row.id) === target);
  if (!match) return target;
  const values = fields.map((field) => textValue(match[field])).filter(Boolean);
  if (!values.length) return target;
  return values[0];
}

export function DeviceDetailCard({
  device,
  index = 0,
  total = 1,
  onClose,
  regions,
  pops,
}: DeviceDetailCardProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!device) return null;

  const lat = device.latitude != null ? Number(device.latitude) : NaN;
  const lng = device.longitude != null ? Number(device.longitude) : NaN;
  const latText = Number.isFinite(lat) ? lat.toFixed(6) : "-";
  const lngText = Number.isFinite(lng) ? lng.toFixed(6) : "-";

  const regionLabel = findReferenceLabel(
    regions,
    device.region_id,
    ["region_name", "region_code", "name"],
    "Region",
  );
  const popLabel = findReferenceLabel(
    pops,
    device.pop_id,
    ["pop_name", "pop_code", "pop_id"],
    "POP",
  );

  const handleCopy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1500);
    } catch {
      // Clipboard not available
    }
  };

  const fieldRows: Array<
    Array<{ key: string; label: string; value: string }>
  > = [
    [
      { key: "type", label: "Tipe", value: device.device_type_key || "-" },
      { key: "region", label: "Region", value: regionLabel },
    ],
    [
      { key: "pop", label: "POP", value: popLabel },
    ],
    [
      { key: "lat", label: "Latitude", value: latText },
      { key: "lng", label: "Longitude", value: lngText },
    ],
  ];

  const detailHref = `/data-management/list/${(device.device_type_key || "devices").toLowerCase()}/${device.id}`;
  const imageAttachments = ((device as unknown) as {
    image_attachments?: Array<{ url?: string; thumbUrl?: string; blurDataUrl?: string }>;
  })?.image_attachments;

  return (
    <div
      role="dialog"
      aria-label={`Detail Perangkat ${device.device_name || device.device_id || ""}`}
      className="w-[min(285px,calc(100vw-1.5rem))] max-sm:w-full rounded-2xl border border-border/40 bg-card/95 p-2 shadow-lg backdrop-blur-md glass-inset transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] animate-in fade-in slide-in-from-right-4"
    >
      {/* Inner bezel */}
      <div className="rounded-[calc(1rem-0.25rem)] border border-border/60 bg-card/80 p-2.5">
        {/* Header: Device name + Close */}
        <div className="flex items-start justify-between gap-1.5 mb-2.5">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 mb-0.5">
              <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">
                Detail Device
              </p>
              {total > 1 && (
                <span className="rounded-full bg-primary/10 border border-primary/30 px-1.5 py-0.2 font-mono text-[8px] font-semibold text-primary">
                  {index + 1}/{total}
                </span>
              )}
            </div>
            <p className="truncate font-semibold text-xs leading-tight text-foreground">
              {device.device_name || device.device_id || "Device"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onClose(device.id)}
            aria-label="Tutup detail device"
            className="shrink-0 size-5 flex items-center justify-center rounded-full border border-border/60 text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors active:scale-95"
          >
            <X className="size-3" />
          </button>
        </div>

        {/* Compact 2-column grid */}
        <div className="space-y-2 mb-3">
          {/* Optional device image thumbnail */}
          {imageAttachments?.[0] && (
            <div className="mb-2">
              <OptimizedImage
                src={imageAttachments[0]?.url}
                thumbUrl={imageAttachments[0]?.thumbUrl}
                blurDataUrl={imageAttachments[0]?.blurDataUrl}
                alt={device.device_name || "Device image"}
                aspectRatio="square"
                size="thumb"
                className="h-24 w-full"
              />
            </div>
          )}

          {fieldRows.map((row, rowIdx) => (
            <div
              key={rowIdx}
              className={cn("grid gap-2", row.length === 1 ? "grid-cols-1" : "grid-cols-2")}
            >
              {row.map((field) => {
                const isCopied = copiedKey === field.key;
                return (
                  <button
                    key={field.key}
                    type="button"
                    onClick={() => handleCopy(field.key, field.value)}
                    className="group flex flex-col rounded-xl border border-border/50 bg-muted/10 px-2 py-1.5 text-left transition-colors hover:bg-muted/30 active:scale-[0.98]"
                    title={`Salin ${field.label}`}
                    aria-label={`Salin ${field.label}: ${field.value}`}
                  >
                    <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-muted-foreground leading-none mb-1">
                      {field.label}
                    </span>
                    <span className="flex items-center justify-between gap-1 min-w-0">
                      <span className="truncate font-mono text-[11px] font-medium tabular-nums text-foreground leading-none">
                        {field.value}
                      </span>
                      {isCopied ? (
                        <Check className="size-3 shrink-0 text-emerald-500" />
                      ) : (
                        <Copy className="size-3 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-60 transition-opacity" />
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer Action: Direct Detail Device Link (bottom right) */}
        <div className="flex justify-end pt-1 border-t border-border/40">
          <Link
            href={detailHref}
            className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 font-mono text-[9px] uppercase tracking-[0.12em] font-medium text-primary hover:bg-primary/20 active:scale-95 transition-all"
          >
            <span>Detail Device</span>
            <ExternalLink className="size-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
