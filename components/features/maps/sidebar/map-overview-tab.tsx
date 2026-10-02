"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Server,
  Route as RouteIcon,
  Cable,
  ChevronRight,
  ExternalLink,
  MapPinOff,
  Search,
  Check,
  Radio,
  SlidersHorizontal,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { MapDevice, MapRoute } from "../topology-map-canvas";
import { cn } from "@/lib/utils";
import { useTranslate } from "@/lib/use-locale";

type FilterQueue = "all" | "no_coords" | "unvalidated" | "routes";

export interface MapOverviewTabProps {
  devices: MapDevice[];
  routesCount?: number;
  connectionsCount?: number;
  devicesWithoutCoords: MapDevice[];
  routesWithoutGeometry?: MapRoute[];
  connectionsWithoutGeometry?: unknown[];
  onSelectDevice?: (device: MapDevice) => void;
  pops?: Array<{ id?: string | null; pop_name?: string | null; pop_code?: string | null }>;
  regions?: Array<{ id?: string | null; region_name?: string | null; region_code?: string | null }>;
}

export function MapOverviewTab({
  devices,
  routesCount = 0,
  connectionsCount = 0,
  devicesWithoutCoords,
  routesWithoutGeometry = [],
  connectionsWithoutGeometry = [],
  onSelectDevice,
  pops = [],
  regions = [],
}: MapOverviewTabProps) {
  const { t } = useTranslate();
  const [filterMode, setFilterMode] = React.useState<FilterQueue>("all");
  const [searchQuery, setSearchQuery] = React.useState("");

  const validCoordsCount = Math.max(0, devices.length - devicesWithoutCoords.length);
  const coordsRate = devices.length > 0 ? Math.round((validCoordsCount / devices.length) * 100) : 100;

  const unvalidatedDevices = React.useMemo(() => {
    return devices.filter((d) => d.marker_status !== "validated");
  }, [devices]);

  const totalIssues =
    devicesWithoutCoords.length +
    unvalidatedDevices.length +
    routesWithoutGeometry.length +
    connectionsWithoutGeometry.length;

  const getPopName = (popId?: string | null) => {
    if (!popId) return "-";
    const found = pops.find((p) => String(p.id) === String(popId));
    return found?.pop_name || found?.pop_code || popId;
  };

  // Filtered issues
  const filteredDevices = React.useMemo(() => {
    let list: Array<{ device: MapDevice; reason: "no_coords" | "unvalidated" }> = [];

    if (filterMode === "all" || filterMode === "no_coords") {
      devicesWithoutCoords.forEach((d) => {
        list.push({ device: d, reason: "no_coords" });
      });
    }

    if (filterMode === "all" || filterMode === "unvalidated") {
      unvalidatedDevices.forEach((d) => {
        // avoid duplicating if already in no_coords
        if (!list.some((item) => item.device.id === d.id)) {
          list.push({ device: d, reason: "unvalidated" });
        }
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (item) =>
          (item.device.device_name || "").toLowerCase().includes(q) ||
          (item.device.device_id || "").toLowerCase().includes(q) ||
          (item.device.device_type_key || "").toLowerCase().includes(q),
      );
    }

    return list;
  }, [filterMode, devicesWithoutCoords, unvalidatedDevices, searchQuery]);

  return (
    <div className="space-y-3 text-xs">
      {/* 1. Network Asset Telemetry Bento */}
      <div className="space-y-1.5">
        <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground block">
          {t("mapOverview.activeAssets")}
        </span>
        <div className="grid grid-cols-3 gap-1.5 font-mono tabular-nums">
          <div className="rounded-xl border border-border/60 bg-muted/20 p-2 text-center shadow-2xs glass-inset">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-0.5">
              <Server className="size-3" />
              <span className="text-[8px] uppercase tracking-wider">Device</span>
            </div>
            <span className="text-sm font-bold text-foreground">{devices.length}</span>
          </div>

          <div className="rounded-xl border border-border/60 bg-muted/20 p-2 text-center shadow-2xs glass-inset">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-0.5">
              <RouteIcon className="size-3" />
              <span className="text-[8px] uppercase tracking-wider">{t("mapOverview.route")}</span>
            </div>
            <span className="text-sm font-bold text-primary">{routesCount}</span>
          </div>

          <div className="rounded-xl border border-border/60 bg-muted/20 p-2 text-center shadow-2xs glass-inset">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-0.5">
              <Cable className="size-3" />
              <span className="text-[8px] uppercase tracking-wider">{t("mapOverview.connection")}</span>
            </div>
            <span className="text-sm font-bold text-foreground">{connectionsCount}</span>
          </div>
        </div>
      </div>

      {/* 2. Spatial Health Progress Gauge */}
      <div className="rounded-xl border border-border/60 bg-card p-2.5 shadow-2xs glass-inset space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground font-semibold">
            {t("mapOverview.geoHealth")}
          </span>
          <Badge
            variant="outline"
            className={cn(
              "h-4 rounded-full px-1.5 font-mono text-[8px] uppercase tracking-wider font-bold",
              coordsRate >= 95
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : coordsRate >= 80
                  ? "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  : "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400",
            )}
          >
            {t("mapOverview.mappedPct", { rate: coordsRate })}
          </Badge>
        </div>

        <div className="space-y-1">
          <div className="h-1.5 w-full rounded-full bg-muted/40 overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                coordsRate >= 95
                  ? "bg-emerald-500"
                  : coordsRate >= 80
                    ? "bg-amber-500"
                    : "bg-red-500",
              )}
              style={{ width: `${coordsRate}%` }}
            />
          </div>
          <div className="flex items-center justify-between font-mono text-[9px] tabular-nums text-muted-foreground">
            <span>{t("mapOverview.validCoords", { count: validCoordsCount })}</span>
            <span>{t("mapOverview.noGpsCount", { count: devicesWithoutCoords.length })}</span>
          </div>
        </div>
      </div>

      {/* 3. Quick Audit Queue */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="size-3.5 text-amber-500" />
            <span className="font-mono text-[9px] uppercase tracking-[0.15em] font-bold text-foreground">
              {t("mapOverview.auditQueue", { count: totalIssues })}
            </span>
          </div>
        </div>

        {/* Filter Segmented Pill Buttons */}
        <div className="flex items-center gap-1 overflow-x-auto thin-scrollbar pb-0.5" role="group">
          <button
            type="button"
            onClick={() => setFilterMode("all")}
            className={cn(
              "rounded-full px-2 py-0.5 font-mono text-[8px] uppercase tracking-wider transition-all whitespace-nowrap",
              filterMode === "all"
                ? "bg-primary text-primary-foreground font-bold"
                : "border border-border/60 bg-muted/20 text-muted-foreground hover:text-foreground",
            )}
          >
            {t("mapOverview.all", { count: devicesWithoutCoords.length + unvalidatedDevices.length })}
          </button>
          <button
            type="button"
            onClick={() => setFilterMode("no_coords")}
            className={cn(
              "rounded-full px-2 py-0.5 font-mono text-[8px] uppercase tracking-wider transition-all whitespace-nowrap",
              filterMode === "no_coords"
                ? "bg-rose-500 text-white font-bold"
                : "border border-border/60 bg-muted/20 text-muted-foreground hover:text-foreground",
            )}
          >
            {t("mapOverview.noGps", { count: devicesWithoutCoords.length })}
          </button>
          <button
            type="button"
            onClick={() => setFilterMode("unvalidated")}
            className={cn(
              "rounded-full px-2 py-0.5 font-mono text-[8px] uppercase tracking-wider transition-all whitespace-nowrap",
              filterMode === "unvalidated"
                ? "bg-amber-500 text-white font-bold"
                : "border border-border/60 bg-muted/20 text-muted-foreground hover:text-foreground",
            )}
          >
            {t("mapOverview.notValid", { count: unvalidatedDevices.length })}
          </button>
          {routesWithoutGeometry.length > 0 && (
            <button
              type="button"
              onClick={() => setFilterMode("routes")}
              className={cn(
                "rounded-full px-2 py-0.5 font-mono text-[8px] uppercase tracking-wider transition-all whitespace-nowrap",
                filterMode === "routes"
                  ? "bg-primary text-primary-foreground font-bold"
                  : "border border-border/60 bg-muted/20 text-muted-foreground hover:text-foreground",
              )}
            >
              {t("mapOverview.brokenRoutes", { count: routesWithoutGeometry.length })}
            </button>
          )}
        </div>

        {/* Search inside queue */}
        {filterMode !== "routes" && (
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("mapOverview.searchQueue")}
              className="w-full rounded-lg border border-border/60 bg-card/80 pl-7 pr-2.5 py-1 font-mono text-[9px] text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
            />
          </div>
        )}

        {/* Queue Items List */}
        {filterMode === "routes" ? (
          <div className="max-h-[320px] overflow-y-auto space-y-1.5 thin-scrollbar pr-0.5">
            {routesWithoutGeometry.map((route) => (
              <div
                key={route.id}
                className="rounded-xl border border-border/60 bg-muted/15 p-2 space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-foreground truncate">
                    {route.route_name || route.route_code || t("mapOverview.routeFallback")}
                  </span>
                  <span className="font-mono text-[7px] font-bold text-rose-500 uppercase">
                    {t("mapOverview.noGeometry")}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[8px] font-mono text-muted-foreground">
                  <span>{t("mapOverview.code")}: {route.route_code || "-"}</span>
                  <Link
                    href={`/data-management/list/routes/${route.id}`}
                    className="text-primary hover:underline"
                  >
                    {t("mapOverview.editRoute")} ↗
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="max-h-[320px] overflow-y-auto space-y-1.5 thin-scrollbar pr-0.5">
            {filteredDevices.slice(0, 30).map(({ device, reason }) => {
              const detailHref = `/data-management/list/${(device.device_type_key || "devices").toLowerCase()}/${device.id}`;
              const popName = getPopName(device.pop_id);

              return (
                <div
                  key={device.id}
                  className="rounded-xl border border-border/60 bg-card/80 p-2 space-y-1.5 hover:border-primary/50 transition-all shadow-2xs glass-inset"
                >
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-mono text-[8px] font-bold text-muted-foreground bg-muted px-1.5 py-0.2 rounded">
                        {device.device_type_key || "DEV"}
                      </span>
                      <h4
                        className="font-semibold text-xs text-foreground truncate cursor-pointer hover:text-primary"
                        onClick={() => onSelectDevice?.(device)}
                        title={device.device_name || device.device_id || "Device"}
                      >
                        {device.device_name || device.device_id || "Device"}
                      </h4>
                    </div>

                    <span
                      className={cn(
                        "inline-flex items-center rounded-full border px-1.5 py-0.2 font-mono text-[7px] font-bold uppercase tracking-wider shrink-0",
                        reason === "no_coords"
                          ? "border-rose-500/30 bg-rose-500/10 text-rose-500"
                          : "border-amber-500/30 bg-amber-500/10 text-amber-500",
                      )}
                    >
                      {reason === "no_coords" ? t("mapOverview.noGpsBadge") : "Unvalidated"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[9px] font-mono text-muted-foreground">
                    <span className="truncate">POP: <strong className="text-foreground">{popName}</strong></span>
                    {device.splitter_ratio && (
                      <span>Splitter: <strong className="text-foreground">{device.splitter_ratio}</strong></span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 pt-1 border-t border-border/40">
                    <button
                      type="button"
                      onClick={() => onSelectDevice?.(device)}
                      className="flex-1 flex items-center justify-center gap-1 rounded-md border border-primary/40 bg-primary/10 py-1 font-mono text-[8px] font-bold uppercase tracking-wider text-primary hover:bg-primary/20 transition-all active:scale-[0.98]"
                    >
                      <span>{t("mapOverview.inspectDock")}</span>
                      <ChevronRight className="size-2.5" />
                    </button>

                    <Link
                      href={detailHref}
                      className="flex items-center justify-center gap-1 rounded-md border border-border/60 bg-muted/30 px-2 py-1 font-mono text-[8px] font-bold uppercase tracking-wider text-foreground hover:bg-muted/60 transition-all"
                    >
                      <span>{t("mapOverview.editForm")}</span>
                      <ExternalLink className="size-2 text-muted-foreground" />
                    </Link>
                  </div>
                </div>
              );
            })}

            {filteredDevices.length > 30 && (
              <p className="font-mono text-[8px] text-muted-foreground text-center py-1">
                {t("mapOverview.showing30", { count: filteredDevices.length })}
              </p>
            )}

            {filteredDevices.length === 0 && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-center text-emerald-700 dark:text-emerald-400 font-mono text-[10px] space-y-1">
                <CheckCircle2 className="size-4 mx-auto" />
                <p className="font-bold">{t("mapOverview.noIssues")}</p>
                <p className="text-[9px] opacity-80">{t("mapOverview.noIssuesDesc")}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ponytail: quick audit queue with direct bottom dock inspection & form link.
