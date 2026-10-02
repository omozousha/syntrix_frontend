"use client";

import * as React from "react";
import { PieChart, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Combobox } from "@/components/ui/combobox";
import type {
  HomepassedCalculationConfig,
  HomepassedCalculationResult,
} from "@/lib/gis/homepassed-calculator";
import { useTranslate } from "@/lib/use-locale";

type Option = { value: string; label: string };

interface MapCoverageTabProps {
  homepassedEnabled?: boolean;
  onToggleHomepassedEnabled?: (v: boolean) => void;
  homepassedConfig?: HomepassedCalculationConfig;
  onHomepassedConfigChange?: (config: HomepassedCalculationConfig) => void;
  homepassedResult?: HomepassedCalculationResult | null;
  regionOptions: Option[];
}

export function MapCoverageTab({
  homepassedEnabled = false,
  onToggleHomepassedEnabled,
  homepassedConfig,
  onHomepassedConfigChange,
  homepassedResult,
  regionOptions,
}: MapCoverageTabProps) {
  const { t } = useTranslate();
  if (!homepassedConfig) return null;

  const handleDownloadGeoJson = () => {
    if (!homepassedResult?.mergedPolygonFeature) return;
    const dateStr = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(homepassedResult.mergedPolygonFeature, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `syntrix-homepassed-coverage-${dateStr}.geojson`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-3 text-xs">
      <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <PieChart className="size-3.5 text-cyan-500" />
            <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-foreground font-semibold">
              {t("mapCoverage.title")}
            </span>
          </div>
          <Switch
            checked={homepassedEnabled}
            onCheckedChange={onToggleHomepassedEnabled}
            aria-label={t("mapStudio.toggleSpatial")}
          />
        </div>

        <div className="space-y-1">
          <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground block">
            {t("mapStudio.spatialScope")}
          </span>
          <Combobox
            value={homepassedConfig.targetRegionId || "__all__"}
            onValueChange={(val) =>
              onHomepassedConfigChange?.({ ...homepassedConfig, targetRegionId: val || "__all__" })
            }
            options={[
              { value: "__all__", label: t("mapStudio.allRegionsGlobal") },
              ...regionOptions.filter((r) => r.value !== "__all__"),
            ]}
            placeholder={t("mapStudio.selectScopeRegion")}
          />
        </div>
      </div>

      {homepassedEnabled && (
        <div className="space-y-2.5">
          {/* Sliders Box */}
          <div className="rounded-xl border border-border/60 bg-card p-3 space-y-2.5">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="font-mono text-[9px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={homepassedConfig.includeOdp}
                    onChange={(e) =>
                      onHomepassedConfigChange?.({
                        ...homepassedConfig,
                        includeOdp: e.target.checked,
                      })
                    }
                    className="rounded border-border/60 text-primary focus:ring-primary/20"
                  />
                  <span>{t("mapStudio.odpRadius")}</span>
                </label>
                <span className="font-mono tabular-nums text-xs font-bold text-primary">
                  {homepassedConfig.odpRadiusMeters}m
                </span>
              </div>
              <input
                type="range"
                min={50}
                max={500}
                step={25}
                disabled={!homepassedConfig.includeOdp}
                value={homepassedConfig.odpRadiusMeters}
                onChange={(e) =>
                  onHomepassedConfigChange?.({
                    ...homepassedConfig,
                    odpRadiusMeters: Number(e.target.value),
                  })
                }
                className="w-full accent-primary h-1.5 bg-muted rounded-lg cursor-pointer disabled:opacity-40"
              />
            </div>

            <div className="space-y-1 pt-1 border-t border-border/40">
              <div className="flex items-center justify-between">
                <label className="font-mono text-[9px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={homepassedConfig.includeCables}
                    onChange={(e) =>
                      onHomepassedConfigChange?.({
                        ...homepassedConfig,
                        includeCables: e.target.checked,
                      })
                    }
                    className="rounded border-border/60 text-primary focus:ring-primary/20"
                  />
                  <span>{t("mapStudio.cableCorridor")}</span>
                </label>
                <span className="font-mono tabular-nums text-xs font-bold text-primary">
                  {homepassedConfig.cableRadiusMeters}m
                </span>
              </div>
              <input
                type="range"
                min={50}
                max={500}
                step={25}
                disabled={!homepassedConfig.includeCables}
                value={homepassedConfig.cableRadiusMeters}
                onChange={(e) =>
                  onHomepassedConfigChange?.({
                    ...homepassedConfig,
                    cableRadiusMeters: Number(e.target.value),
                  })
                }
                className="w-full accent-primary h-1.5 bg-muted rounded-lg cursor-pointer disabled:opacity-40"
              />
            </div>
          </div>

          {/* Results Card */}
          {homepassedResult && (
            <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-cyan-500">
                  {t("mapStudio.spatialSummary")}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-6 rounded-full px-2 font-mono text-[9px] uppercase tracking-[0.1em]"
                  disabled={!homepassedResult.mergedPolygonFeature}
                  onClick={handleDownloadGeoJson}
                >
                  <Download className="mr-1 size-3 text-cyan-500" />
                  GeoJSON
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-2 font-mono tabular-nums text-xs">
                <div className="rounded-lg border border-border/40 bg-card p-2">
                  <span className="text-[8px] uppercase tracking-wider text-muted-foreground block">
                    {t("mapStudio.coverageAreaLabel")}
                  </span>
                  <span className="font-bold text-foreground">
                    {homepassedResult.totalCoverageAreaKm2} km²
                  </span>
                </div>
                <div className="rounded-lg border border-border/40 bg-card p-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[8px] uppercase tracking-wider text-muted-foreground">
                      {homepassedResult.exactHomepassedCount > 0 ? "Homepassed" : "Est. Homepassed"}
                    </span>
                    <span
                      className={`rounded px-1 font-mono text-[7px] font-bold uppercase ${
                        homepassedResult.exactHomepassedCount > 0
                          ? "border border-emerald-500/30 bg-emerald-500/15 text-emerald-500"
                          : "border border-border/40 bg-muted/40 text-muted-foreground"
                      }`}
                    >
                      {homepassedResult.exactHomepassedCount > 0 ? "POI" : "Density"}
                    </span>
                  </div>
                  <span className="font-bold text-cyan-500 block mt-0.5">
                    {(homepassedResult.exactHomepassedCount > 0
                      ? homepassedResult.exactHomepassedCount
                      : homepassedResult.estimatedHomepassedCount
                    ).toLocaleString("id-ID")}{" "}
                    Unit
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px] font-mono border-t border-cyan-500/20 pt-1.5">
                <span className="text-muted-foreground">{t("mapStudio.overlapEfficiency")}</span>
                <span className="font-bold text-emerald-500">
                  +{homepassedResult.overlapSavingsPercentage}% {t("mapStudio.dedupFree")}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
