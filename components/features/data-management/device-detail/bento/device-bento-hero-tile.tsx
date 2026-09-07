"use client";

import { useState } from "react";
import { Copy, Check, Building2, MapPin, Briefcase, FolderKanban, ShieldCheck, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { mapValidationStatus } from "@/lib/validation-status";

type DeviceBentoHeroTileProps = {
  deviceName: string;
  deviceId?: string | null;
  deviceCode?: string | null;
  inventoryId?: string | null;
  deviceTypeKey?: string | null;
  deviceTypeLabel?: string | null;
  operationalStatus?: string | null;
  validationStatus: string;
  popName?: string | null;
  regionName?: string | null;
  tenantName?: string | null;
  projectName?: string | null;
  installationDate?: string | null;
  updatedAt?: string | null;
  notes?: string | null;
  tags?: string[] | null;
};

export function DeviceBentoHeroTile({
  deviceName,
  deviceId,
  deviceCode,
  inventoryId,
  deviceTypeKey = "DEVICE",
  deviceTypeLabel,
  operationalStatus = "active",
  validationStatus,
  popName,
  regionName,
  tenantName,
  projectName,
  installationDate,
  updatedAt,
  notes,
  tags,
}: DeviceBentoHeroTileProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  function copyText(text: string, key: string) {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  }

  function formatDate(value?: string | null) {
    if (!value) return "-";
    try {
      const d = new Date(value);
      return d.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return value;
    }
  }

  const valUi = mapValidationStatus(validationStatus);
  const statusLower = (operationalStatus || "active").toLowerCase();
  const statusColorClass =
    statusLower === "active"
      ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:text-emerald-400"
      : statusLower === "maintenance"
      ? "bg-amber-500/10 text-amber-600 border-amber-500/30 dark:text-amber-400"
      : statusLower === "installed"
      ? "bg-sky-500/10 text-sky-600 border-sky-500/30 dark:text-sky-400"
      : "bg-muted text-muted-foreground border-border/60";

  return (
    <div className="flex flex-col justify-between rounded-2xl border border-border/60 bg-card p-5 sm:p-6 shadow-xs glass-inset transition-all duration-300">
      <div className="space-y-4">
        {/* Top Badges */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className="rounded-full px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-wider border-primary/40 bg-primary/10 text-primary"
            >
              {deviceTypeLabel || deviceTypeKey}
            </Badge>
            <Badge
              variant="outline"
              className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wide border ${statusColorClass}`}
            >
              <span
                className={`mr-1.5 size-1.5 rounded-full ${
                  statusLower === "active"
                    ? "bg-emerald-500 animate-pulse"
                    : statusLower === "maintenance"
                    ? "bg-amber-500"
                    : "bg-slate-400"
                }`}
              />
              {operationalStatus || "Active"}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            {updatedAt ? (
              <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
                Update: {formatDate(updatedAt)}
              </span>
            ) : null}
            <Badge variant="outline" className={`rounded-full font-mono text-[10px] uppercase tracking-wider ${valUi.className}`}>
              <ShieldCheck className="mr-1 size-3" />
              {valUi.label}
            </Badge>
          </div>
        </div>

        {/* Title / Name */}
        <div className="space-y-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Device Name</p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground break-words">
            {deviceName || "Unnamed Device"}
          </h1>
        </div>

        {/* Technical IDs (Inventory ID & Code) & Install Date */}
        <div className="flex flex-wrap items-center gap-2">
          {inventoryId ? (
            <div className="flex items-center gap-1.5 rounded-xl border border-border/60 bg-muted/20 px-2.5 py-1 text-xs">
              <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">INV:</span>
              <span className="font-mono tabular-nums font-semibold text-foreground">{inventoryId}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-5 rounded-md hover:bg-muted"
                onClick={() => copyText(inventoryId, "inv")}
                title="Salin Inventory ID"
              >
                {copiedKey === "inv" ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3 text-muted-foreground" />}
              </Button>
            </div>
          ) : null}

          {deviceCode ? (
            <div className="flex items-center gap-1.5 rounded-xl border border-border/60 bg-muted/20 px-2.5 py-1 text-xs">
              <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Code:</span>
              <span className="font-mono tabular-nums font-semibold text-foreground">{deviceCode}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-5 rounded-md hover:bg-muted"
                onClick={() => copyText(deviceCode, "code")}
                title="Salin Device Code"
              >
                {copiedKey === "code" ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3 text-muted-foreground" />}
              </Button>
            </div>
          ) : deviceId ? (
            <div className="flex items-center gap-1.5 rounded-xl border border-border/60 bg-muted/20 px-2.5 py-1 text-xs">
              <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">ID:</span>
              <span className="font-mono tabular-nums font-semibold text-foreground">{deviceId}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-5 rounded-md hover:bg-muted"
                onClick={() => copyText(deviceId, "id")}
                title="Salin Device ID"
              >
                {copiedKey === "id" ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3 text-muted-foreground" />}
              </Button>
            </div>
          ) : null}

          {installationDate ? (
            <div className="flex items-center gap-1.5 rounded-xl border border-border/60 bg-muted/20 px-2.5 py-1 text-xs">
              <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Pasang:</span>
              <span className="font-mono tabular-nums font-medium text-foreground">{formatDate(installationDate)}</span>
            </div>
          ) : null}
        </div>

        {/* Device Notes if present */}
        {notes ? (
          <div className="rounded-xl border border-border/40 bg-muted/15 p-2.5 text-xs text-muted-foreground">
            <span className="font-mono text-[9px] uppercase tracking-widest text-foreground font-semibold mr-1.5">Catatan:</span>
            <span className="italic">{notes}</span>
          </div>
        ) : null}

        {/* Tags if present */}
        {tags && tags.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1 pt-0.5">
            <Tag className="size-3 text-muted-foreground mr-1" />
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded-md border border-border/50 bg-muted/30 px-2 py-0.5 font-mono text-[10px] text-muted-foreground"
              >
                #{tag}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      {/* Meta Chips Footer */}
      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4 border-t border-border/40 pt-4 text-xs">
        <div className="flex items-center gap-2 rounded-xl bg-muted/15 p-2.5">
          <Building2 className="size-4 shrink-0 text-primary" />
          <div className="min-w-0">
            <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">POP</p>
            <p className="truncate font-semibold text-foreground" title={popName || "-"}>{popName || "-"}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-xl bg-muted/15 p-2.5">
          <MapPin className="size-4 shrink-0 text-sky-500" />
          <div className="min-w-0">
            <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Region</p>
            <p className="truncate font-semibold text-foreground" title={regionName || "-"}>{regionName || "-"}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-xl bg-muted/15 p-2.5">
          <Briefcase className="size-4 shrink-0 text-amber-500" />
          <div className="min-w-0">
            <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Tenant</p>
            <p className="truncate font-semibold text-foreground" title={tenantName || "-"}>{tenantName || "-"}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-xl bg-muted/15 p-2.5">
          <FolderKanban className="size-4 shrink-0 text-violet-500" />
          <div className="min-w-0">
            <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Project</p>
            <p className="truncate font-semibold text-foreground" title={projectName || "-"}>{projectName || "-"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
